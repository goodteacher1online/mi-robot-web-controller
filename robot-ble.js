/**
 * Mi Robot Builder (Xiaomi) Web Bluetooth NUS Driver
 * Protocol: Nordic UART Service (NUS)
 * Reverse engineered from official Xiaomi APK (classes.dex & libcocos2dcpp.so)
 */

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write without response
const NUS_TX_UUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify

class MiRobotBLE extends EventTarget {
  constructor() {
    super();
    this.device = null;
    this.server = null;
    this.rxChar = null;
    this.txChar = null;
    this.isConnected = false;

    // Movement axes & motors (0..255, Neutral = 128)
    this.axisX = 128;
    this.axisY = 128;
    this.axisLeft = 128;
    this.axisRight = 128;
    this.invertX = false;
    this.invertY = false;
    this.invertLeft = false;
    this.invertRight = false;
    this.isSelfBalancing = true;

    // Speaker volume (0..15)
    this.volume = 10;

    // Live Telemetry & IMU Sensor Data
    this.telemetry = {
      battery: null,
      pitch: 0,       // Tilt angle forward/backward (degrees)
      roll: 0,        // Tilt angle left/right (degrees)
      yaw: 0,         // Heading angle
      leftEncoder: 0, // Left motor pulse/speed
      rightEncoder: 0,// Right motor pulse/speed
      lastUpdated: null
    };

    // PID Parameters for 2-wheel Self-Balancing
    this.pid = {
      angleP: 50,
      angleD: 30,
      speedP: 40,
      speedI: 20
    };

    // Serialized GATT write queue with bounded buffer
    this._writeQueue = Promise.resolve();
    this._queueDepth = 0;
    this.heartbeatTimer = null;
    this.isEmergencyStopped = false;
  }

  log(msg, level = 'info') {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [BLE ${level.toUpperCase()}] ${msg}`);
    this.dispatchEvent(new CustomEvent('log', { detail: { message: msg, level, time } }));
  }

  computeChecksum(bytes) {
    let xor = 0;
    for (let i = 0; i < 18; i++) {
      xor ^= bytes[i];
    }
    return xor;
  }

  buildPacket(payload18) {
    const full = new Uint8Array(20);
    full.set(payload18.subarray(0, 18), 0);
    full[18] = this.computeChecksum(full);
    full[19] = 0xAA;
    return full;
  }

  buildConnectPacket() {
    const p = new Uint8Array(18);
    p[0] = 0x55; p[1] = 0x01; p[2] = 0x01; p[3] = 0x00;
    p[16] = 0x55; p[17] = 0x55;
    return this.buildPacket(p);
  }

  buildRockerPacket(left, right) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x02; // Movement group
    p[2] = 0x02;
    p[3] = 0x00;

    let finalL = Math.max(0, Math.min(255, Math.round(left)));
    let finalR = Math.max(0, Math.min(255, Math.round(right)));

    if (this.invertLeft) finalL = (256 - finalL) & 0xff;
    if (this.invertRight) finalR = (256 - finalR) & 0xff;

    // Xiaomi Protocol Rocker & Direct Motor Port Encoding:
    // Byte 4: Left Motor (Port A, 0~255, Neutral=128)
    // Byte 5: 0x00
    // Byte 6: Right Motor (Port B, 0~255, Neutral=128)
    // Byte 7: 0x00
    p[4] = finalL & 0xff;
    p[5] = 0x00;
    p[6] = finalR & 0xff;
    p[7] = 0x00;

    return this.buildPacket(p);
  }

  buildCalibrationPacket(calibKind = 1, calibVal = 0) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x06; // Calibration group
    p[2] = 0x00;
    p[3] = 0x00;
    p[4] = calibKind & 0xff;
    p[5] = calibVal & 0xff;
    return this.buildPacket(p);
  }

  buildGetPIDPacket() {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03; // PID group
    p[2] = 0x00;
    p[3] = 0x01; // Read command
    return this.buildPacket(p);
  }

  buildSetAnglePIDPacket(pGain, dGain) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03;
    p[2] = 0x00;
    p[3] = 0x03; // Set Angle PID
    p[4] = Math.max(0, Math.min(255, Math.round(pGain))) & 0xff;
    p[5] = Math.max(0, Math.min(255, Math.round(dGain))) & 0xff;
    return this.buildPacket(p);
  }

  buildSetSpeedPIDPacket(pGain, iGain) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03;
    p[2] = 0x00;
    p[3] = 0x05; // Set Speed PID
    p[4] = Math.max(0, Math.min(255, Math.round(pGain))) & 0xff;
    p[5] = Math.max(0, Math.min(255, Math.round(iGain))) & 0xff;
    return this.buildPacket(p);
  }

  buildSavePIDPacket() {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03;
    p[2] = 0x00;
    p[3] = 0x07; // Save PID to Flash
    return this.buildPacket(p);
  }

  buildSoundPacket(soundId = 1) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x02; // Sound effect
    p[2] = 0x02;
    p[3] = 0x02;
    p[4] = Math.max(1, Math.min(36, Math.round(soundId))) & 0xff;
    return this.buildPacket(p);
  }

  buildVolumePacket(vol) {
    const p = new Uint8Array(18);
    p[0] = 0x55; p[1] = 0x02; p[2] = 0x03; p[3] = 0x00;
    p[4] = Math.max(0, Math.min(15, Math.round(vol))) & 0xff;
    return this.buildPacket(p);
  }

  /**
   * Connect via Web Bluetooth
   */
  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해 주세요.');
    }

    // Clean up previous dead session if any
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try { this.device.gatt.disconnect(); } catch (e) {}
    }
    this.isConnected = false;
    this.server = null;
    this.rxChar = null;
    this.txChar = null;
    this._writeQueue = Promise.resolve();
    this._queueDepth = 0;

    this.log('로봇 블루투스 검색 중... 로봇 전원을 켜주세요.', 'info');

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Mi' },
          { namePrefix: 'Robot' },
          { namePrefix: 'Mitu' },
          { namePrefix: 'JM' },
          { services: [NUS_SERVICE_UUID] }
        ],
        optionalServices: [NUS_SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', () => this.handleDisconnected());

      this.log(`기기 발견: "${this.device.name || 'Mi Robot'}" 연결 중...`, 'info');
      this.server = await this.device.gatt.connect();

      this.log('Nordic UART 서비스 연동...', 'info');
      const service = await this.server.getPrimaryService(NUS_SERVICE_UUID);

      this.rxChar = await service.getCharacteristic(NUS_RX_UUID);
      this.txChar = await service.getCharacteristic(NUS_TX_UUID);

      // Listen for telemetry responses
      await this.txChar.startNotifications();
      this.txChar.addEventListener('characteristicvaluechanged', (e) => this._parseTelemetry(e));

      this.isConnected = true;
      this.log('✅ 로봇 연결 성공! 조종 준비 완료.', 'success');

      // Handshake & Initial Setup
      await this.writeRaw(this.buildConnectPacket(), true);
      await this.setVolume(this.volume);

      this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: true, deviceName: this.device.name } }));
      this.startHeartbeat();

    } catch (err) {
      this.log(`연결 실패: ${err.message}`, 'error');
      await this.disconnect();
      throw err;
    }
  }

  /**
   * Parse incoming telemetry packets from robot
   */
  _parseTelemetry(e) {
    const val = new Uint8Array(e.target.value.buffer);
    if (val.length >= 6 && val[0] === 0x55) {
      this.telemetry.lastUpdated = new Date();

      // Battery / Status packet
      if (val[1] === 0x01 && val[2] === 0x02) {
        this.telemetry.battery = val[4];
        this.dispatchEvent(new CustomEvent('telemetry', { detail: this.telemetry }));
      }

      // Gyro / IMU Balance packet (Group 0x03 or 0x06)
      if (val[1] === 0x03 || val[1] === 0x06) {
        // Raw signed 16-bit pitch angle
        let rawPitch = (val[4] << 8) | val[5];
        if (rawPitch > 32767) rawPitch -= 65536;
        this.telemetry.pitch = rawPitch / 10.0;

        let rawRoll = (val[6] << 8) | val[7];
        if (rawRoll > 32767) rawRoll -= 65536;
        this.telemetry.roll = rawRoll / 10.0;

        this.dispatchEvent(new CustomEvent('telemetry', { detail: this.telemetry }));
      }

      // Sensor telemetry (Group 0x04 or 0x05)
      // Port: A=0, B=1, C=2, D=3 | SensorType: 0x01=Motor, 0x02=Color, 0x03=Grayscale/Line
      if (val[1] === 0x04 || val[1] === 0x05) {
        const portIdx = val[2];
        const portName = ['A', 'B', 'C', 'D'][portIdx] || 'C';
        const sensorType = val[3];
        const colorId = val[4];
        const grayscale = val[5];
        this.dispatchEvent(new CustomEvent('sensordata', {
          detail: { port: portName, sensorType, colorId, grayscale, raw: val }
        }));
      }
    }
  }

  async calibrateBalance() {
    this.log('⚖️ 수평 0점 캘리브레이션 전송 중...', 'info');
    if (!this.isConnected) return;
    await this.writeRaw(this.buildCalibrationPacket(1, 0), true);
    this.log('✅ 캘리브레이션 명령 전송 완료.', 'success');
  }

  async readPIDGains() {
    if (!this.isConnected) return;
    this.log('⚙️ PID 설정 조회 중...', 'info');
    await this.writeRaw(this.buildGetPIDPacket(), true);
  }

  async setBalancePID(angleP, angleD, speedP, speedI) {
    if (!this.isConnected) return;
    this.pid = { angleP, angleD, speedP, speedI };
    this.log(`⚙️ PID 게인 설정 전송 (P:${angleP}, D:${angleD}, SpdP:${speedP}, SpdI:${speedI})`, 'info');
    await this.writeRaw(this.buildSetAnglePIDPacket(angleP, angleD), true);
    await this.writeRaw(this.buildSetSpeedPIDPacket(speedP, speedI), true);
    await this.writeRaw(this.buildSavePIDPacket(), true);
    this.log('✅ PID 파라미터가 로봇에 플래시 저장되었습니다.', 'success');
  }

  /**
   * Adaptive Heartbeat:
   * Keeps the connection rock-solid without causing GATT_CONGESTED disconnections
   */
  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    let lastSentL = 128, lastSentR = 128;
    let lastSendTime = 0;

    this.heartbeatTimer = setInterval(async () => {
      if (!this.isConnected || !this.rxChar) return;
      const now = Date.now();
      const isMoving = (this.axisLeft !== 128 || this.axisRight !== 128);
      const changed = (this.axisLeft !== lastSentL || this.axisRight !== lastSentR);

      // If moving: send at 60ms intervals or on change
      // If idle (128, 128): send keepalive ping only every 350ms to prevent BLE buffer congestion
      const interval = isMoving ? 60 : 350;

      if (changed || (now - lastSendTime >= interval)) {
        lastSentL = this.axisLeft;
        lastSentR = this.axisRight;
        lastSendTime = now;
        const pkt = this.buildRockerPacket(this.axisLeft, this.axisRight);
        await this.writeRaw(pkt);
      }
    }, 35);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  setDrive(x, y) {
    if (this.isEmergencyStopped && (x !== 128 || y !== 128)) {
      return;
    }
    this.axisX = Math.max(0, Math.min(255, Math.round(x)));
    this.axisY = Math.max(0, Math.min(255, Math.round(y)));

    let finalX = this.axisX;
    let finalY = this.axisY;
    if (this.invertX) finalX = (256 - finalX) & 0xff;
    if (this.invertY) finalY = (256 - finalY) & 0xff;

    // Convert Joystick Throttle (Y) and Steering (X) to Left and Right motor speeds
    const normY = (finalY - 128) / 127.0; // [-1.0 .. +1.0] Forward is positive
    const normX = (finalX - 128) / 127.0; // [-1.0 .. +1.0] Right is positive

    let leftNorm = normY + normX;
    let rightNorm = normY - normX;
    const maxMag = Math.max(1.0, Math.abs(leftNorm), Math.abs(rightNorm));
    leftNorm /= maxMag;
    rightNorm /= maxMag;

    this.axisLeft = Math.max(0, Math.min(255, Math.round(128 + leftNorm * 127)));
    this.axisRight = Math.max(0, Math.min(255, Math.round(128 + rightNorm * 127)));

    this.dispatchEvent(new CustomEvent('drive', {
      detail: { x: this.axisX, y: this.axisY, left: this.axisLeft, right: this.axisRight }
    }));
  }

  /**
   * Dual Individual Motor Speed Control (-100% to +100%)
   * Directly drives Left Motor (Port A) and Right Motor (Port B) independently
   */
  setMotors(leftPct, rightPct) {
    if (this.isEmergencyStopped && (leftPct !== 0 || rightPct !== 0)) {
      return;
    }
    const left = Math.max(-100, Math.min(100, Number(leftPct) || 0));
    const right = Math.max(-100, Math.min(100, Number(rightPct) || 0));

    // Direct mapping to motor byte values (Port A = Byte 4, Port B = Byte 6)
    this.axisLeft = Math.max(0, Math.min(255, Math.round(128 + (left / 100) * 127)));
    this.axisRight = Math.max(0, Math.min(255, Math.round(128 + (right / 100) * 127)));

    // Derive approximate X/Y for HUD telemetry display
    const avgThrottle = (left + right) / 2.0;
    const diffSteer = (left - right) / 2.0;
    this.axisY = Math.round(128 + avgThrottle * 1.27);
    this.axisX = Math.round(128 + diffSteer * 1.27);

    this.dispatchEvent(new CustomEvent('motorchange', {
      detail: { left, right, axisLeft: this.axisLeft, axisRight: this.axisRight, x: this.axisX, y: this.axisY }
    }));
  }

  stop() {
    this.axisX = 128;
    this.axisY = 128;
    this.axisLeft = 128;
    this.axisRight = 128;
    this.dispatchEvent(new CustomEvent('drive', {
      detail: { x: 128, y: 128, left: 128, right: 128 }
    }));
  }

  async writeDirect(bytes) {
    if (!this.rxChar || !this.isConnected) return;
    try {
      if (typeof this.rxChar.writeValueWithoutResponse === 'function') {
        await this.rxChar.writeValueWithoutResponse(bytes);
      } else {
        await this.rxChar.writeValue(bytes);
      }
    } catch (e) {
      try {
        await this.rxChar.writeValue(bytes);
      } catch (err2) {
        console.warn('BLE direct write error:', err2);
      }
    }
  }

  async sendStop() {
    this.stop();
    // Flush any backlogged non-stop writes in queue
    this._writeQueue = Promise.resolve();
    this._queueDepth = 0;

    if (!this.isConnected || !this.rxChar) return;

    const stopPkt = this.buildRockerPacket(128, 128);
    try {
      await this.writeDirect(stopPkt);
      await new Promise(r => setTimeout(r, 20));
      await this.writeDirect(stopPkt);
    } catch (e) {
      console.warn('Stop packet error:', e);
    }
  }

  async emergencyHalt() {
    this.isEmergencyStopped = true;
    setTimeout(() => { this.isEmergencyStopped = false; }, 600);
    this.stop();
    this.log('🛑 [비상 정지] 3중 셧다운 패킷 즉각 방출', 'warn');

    if (!this.isConnected || !this.rxChar) return;
    const stopPkt = this.buildRockerPacket(128, 128);
    try {
      await this.writeDirect(stopPkt);
      await new Promise(r => setTimeout(r, 20));
      await this.writeDirect(stopPkt);
      await new Promise(r => setTimeout(r, 20));
      await this.writeDirect(stopPkt);
    } catch (e) {
      console.warn('Emergency stop burst error:', e);
    }
  }

  async setBalanceActive(enabled) {
    this.isSelfBalancing = !!enabled;
    if (this.isSelfBalancing) {
      await this.setBalancePID(this.pid.angleP || 50, this.pid.angleD || 30, this.pid.speedP || 40, this.pid.speedI || 20);
      this.log('⚖️ 자가 밸런싱 모드 활성화 (2륜 자립 균형)', 'info');
    } else {
      await this.setBalancePID(0, 0, 0, 0);
      this.log('🚜 자가 밸런싱 모드 해제 (3륜/4륜/탱크 모드)', 'info');
    }
    this.dispatchEvent(new CustomEvent('balanceactivechange', { detail: { active: this.isSelfBalancing } }));
    return this.isSelfBalancing;
  }

  async playSound(soundId = 1) {
    if (!this.isConnected) return;
    this.log(`🔊 사운드(#${soundId}) 전송`, 'info');
    return this.writeRaw(this.buildSoundPacket(soundId), true);
  }

  // Alias for compatibility with piano engine
  async playTone(noteId) {
    return this.playSound(noteId);
  }

  async setVolume(vol) {
    this.volume = vol;
    if (!this.isConnected) return;
    return this.writeRaw(this.buildVolumePacket(vol), true);
  }

  writeRaw(bytes, isPriority = false) {
    if (!this.rxChar || !this.isConnected) return Promise.resolve();

    // Bounded write queue: drop non-priority intermediate packets if queue is backlogged (>4)
    if (!isPriority && this._queueDepth > 4) {
      return Promise.resolve();
    }

    this._queueDepth++;
    this._writeQueue = this._writeQueue
      .then(async () => {
        if (!this.isConnected || !this.rxChar) return;
        try {
          if (typeof this.rxChar.writeValueWithoutResponse === 'function') {
            await this.rxChar.writeValueWithoutResponse(bytes);
          } else {
            await this.rxChar.writeValue(bytes);
          }
        } catch (e) {
          try {
            await this.rxChar.writeValue(bytes);
          } catch (err2) {
            console.warn('BLE write error:', err2);
          }
        }
      })
      .catch((err) => {
        console.warn('Write queue error:', err);
      })
      .finally(() => {
        this._queueDepth = Math.max(0, this._queueDepth - 1);
      });

    return this._writeQueue;
  }

  handleDisconnected() {
    this.log('로봇과의 블루투스 연결이 해제되었습니다.', 'warn');
    this.isConnected = false;
    this.stopHeartbeat();
    this.axisX = 128;
    this.axisY = 128;

    if (this.device && this.device.gatt) {
      try { this.device.gatt.disconnect(); } catch (e) {}
    }
    this.server = null;
    this.rxChar = null;
    this.txChar = null;
    this._writeQueue = Promise.resolve();
    this._queueDepth = 0;

    this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: false } }));
  }

  async disconnect() {
    this.stop();
    this.stopHeartbeat();

    if (this.rxChar && this.isConnected) {
      try {
        await this.writeRaw(this.buildRockerPacket(128, 128), true);
      } catch (e) {}
    }

    if (this.device && this.device.gatt) {
      try {
        this.device.gatt.disconnect();
      } catch (e) {}
    }

    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.rxChar = null;
    this.txChar = null;
    this._writeQueue = Promise.resolve();
    this._queueDepth = 0;
    this.axisX = 128;
    this.axisY = 128;

    this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: false } }));
  }
}

/**
 * Multi-Robot Fleet Manager
 * Supports simultaneous fleet control ("all") and individual robot targeting
 */
class MiRobotFleet extends EventTarget {
  constructor() {
    super();
    this.robots = [];
    this.activeTarget = 'all';
    this.isEmergencyStopped = false;
  }

  get isConnected() {
    return this.robots.some(r => r.isConnected);
  }

  get connectedCount() {
    return this.robots.filter(r => r.isConnected).length;
  }

  get device() {
    const target = this.getTargetRobot();
    return target ? target.device : null;
  }

  get telemetry() {
    const target = this.getTargetRobot();
    return target ? target.telemetry : { pitch: 0, roll: 0, yaw: 0, speed: 0, leftSpeed: 0, rightSpeed: 0 };
  }

  getTargetRobot() {
    if (this.robots.length === 0) return null;
    if (this.activeTarget === 'all') return this.robots[0];
    return this.robots.find(r => r.device && r.device.id === this.activeTarget) || this.robots[0];
  }

  async connectNew() {
    const r = new MiRobotBLE();
    await r.connect();
    this.robots.push(r);

    r.addEventListener('telemetry', (e) => {
      if (this.activeTarget === 'all' || (r.device && r.device.id === this.activeTarget)) {
        this.dispatchEvent(new CustomEvent('telemetry', { detail: e.detail }));
      }
    });

    r.addEventListener('sensordata', (e) => {
      this.dispatchEvent(new CustomEvent('sensordata', { detail: e.detail }));
    });

    r.addEventListener('connectionchange', (e) => {
      this.dispatchEvent(new CustomEvent('fleetchange', { detail: { count: this.connectedCount, robots: this.getRobotList() } }));
      this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: this.isConnected, deviceName: r.device?.name || 'Mi Robot' } }));
    });

    this.dispatchEvent(new CustomEvent('fleetchange', { detail: { count: this.connectedCount, robots: this.getRobotList() } }));
    return r;
  }

  async connect() {
    return this.connectNew();
  }

  async disconnect() {
    for (const r of this.robots) {
      await r.disconnect();
    }
    this.robots = [];
    this.dispatchEvent(new CustomEvent('fleetchange', { detail: { count: 0, robots: [] } }));
    this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: false } }));
  }

  setActiveTarget(val) {
    this.activeTarget = val;
  }

  getRobotList() {
    return this.robots.map((r, i) => ({
      id: r.device?.id || `robot_${i}`,
      name: r.device?.name || `로봇 ${i + 1}`,
      connected: r.isConnected
    }));
  }

  setDrive(x, y) {
    if (this.isEmergencyStopped && (x !== 128 || y !== 128)) {
      return;
    }
    if (this.activeTarget === 'all') {
      this.robots.forEach(r => r.setDrive(x, y));
    } else {
      const target = this.getTargetRobot();
      if (target) target.setDrive(x, y);
    }
  }

  setMotors(left, right) {
    if (this.isEmergencyStopped && (left !== 0 || right !== 0)) {
      return;
    }
    if (this.activeTarget === 'all') {
      this.robots.forEach(r => r.setMotors(left, right));
    } else {
      const target = this.getTargetRobot();
      if (target) target.setMotors(left, right);
    }
  }

  stop() {
    this.robots.forEach(r => {
      try { r.stop(); } catch (e) {}
    });
  }

  async sendStop() {
    this.stop();
    return Promise.allSettled(this.robots.map(r => r.sendStop()));
  }

  async emergencyHalt() {
    this.isEmergencyStopped = true;
    setTimeout(() => { this.isEmergencyStopped = false; }, 600);
    this.stop();
    return Promise.allSettled(this.robots.map(r => r.emergencyHalt ? r.emergencyHalt() : r.sendStop()));
  }

  async setBalanceActive(enabled) {
    this.isSelfBalancing = !!enabled;
    return Promise.allSettled(this.robots.map(r => r.setBalanceActive ? r.setBalanceActive(enabled) : Promise.resolve()));
  }

  playTone(noteId) {
    if (this.activeTarget === 'all') {
      this.robots.forEach(r => r.playTone(noteId));
    } else {
      const target = this.getTargetRobot();
      if (target) target.playTone(noteId);
    }
  }

  playSound(soundId) {
    if (this.activeTarget === 'all') {
      this.robots.forEach(r => r.playSound(soundId));
    } else {
      const target = this.getTargetRobot();
      if (target) target.playSound(soundId);
    }
  }

  calibrateBalance() {
    if (this.activeTarget === 'all') {
      this.robots.forEach(r => r.calibrateBalance());
    } else {
      const target = this.getTargetRobot();
      if (target) target.calibrateBalance();
    }
  }

  setBalancePID(angleP, angleD, speedP, speedI) {
    if (this.activeTarget === 'all') {
      return Promise.allSettled(this.robots.map(r => r.setBalancePID(angleP, angleD, speedP, speedI)));
    } else {
      const target = this.getTargetRobot();
      if (target) return target.setBalancePID(angleP, angleD, speedP, speedI);
    }
  }

  readPIDGains() {
    const target = this.getTargetRobot();
    if (target) return target.readPIDGains();
  }

  simulateSensorData(port = 'C', data = {}) {
    this.dispatchEvent(new CustomEvent('sensordata', {
      detail: { port, ...data }
    }));
  }
}

if (typeof window !== 'undefined') {
  window.MiRobotBLE = MiRobotBLE;
  window.MiRobotFleet = MiRobotFleet;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MiRobotBLE, MiRobotFleet };
}
