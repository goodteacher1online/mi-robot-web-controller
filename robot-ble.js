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

    // Movement axes (0..255, Neutral = 128)
    this.axisX = 128;
    this.axisY = 128;
    this.invertX = false;
    this.invertY = false;

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

  buildRockerPacket(x, y) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x02; // Movement group
    p[2] = 0x02;
    p[3] = 0x00;

    let finalX = Math.max(0, Math.min(255, Math.round(x)));
    let finalY = Math.max(0, Math.min(255, Math.round(y)));

    if (this.invertX) finalX = (256 - finalX) & 0xff;
    if (this.invertY) finalY = (256 - finalY) & 0xff;

    // Xiaomi Protocol Rocker Encoding:
    // Byte 4: X axis (0~255, center=128), Byte 5: 0x00
    // Byte 6: Y axis (0~255, center=128), Byte 7: 0x00
    p[4] = finalX & 0xff;
    p[5] = 0x00;
    p[6] = finalY & 0xff;
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

    let lastSentX = 128, lastSentY = 128;
    let lastSendTime = 0;

    this.heartbeatTimer = setInterval(async () => {
      if (!this.isConnected || !this.rxChar) return;
      const now = Date.now();
      const isMoving = (this.axisX !== 128 || this.axisY !== 128);
      const changed = (this.axisX !== lastSentX || this.axisY !== lastSentY);

      // If moving: send at 60ms intervals or on change
      // If idle (128, 128): send keepalive ping only every 350ms to prevent BLE buffer congestion
      const interval = isMoving ? 60 : 350;

      if (changed || (now - lastSendTime >= interval)) {
        lastSentX = this.axisX;
        lastSentY = this.axisY;
        lastSendTime = now;
        const pkt = this.buildRockerPacket(this.axisX, this.axisY);
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
    this.axisX = Math.max(0, Math.min(255, Math.round(x)));
    this.axisY = Math.max(0, Math.min(255, Math.round(y)));
    this.dispatchEvent(new CustomEvent('drive', { detail: { x: this.axisX, y: this.axisY } }));
  }

  stop() {
    this.axisX = 128;
    this.axisY = 128;
    this.dispatchEvent(new CustomEvent('drive', { detail: { x: 128, y: 128 } }));
  }

  async sendStop() {
    this.stop();
    return this.writeRaw(this.buildRockerPacket(128, 128), true);
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

if (typeof window !== 'undefined') {
  window.MiRobotBLE = MiRobotBLE;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MiRobotBLE;
}
