/**
 * Mi Robot Builder (Xiaomi Mitu Block Robot) Web Bluetooth Protocol
 * Reverse engineered with REA & Binary Disassembly
 * Step 2: Added Self-Balancing (Gyro Calibration, PID Tuning, Sensor Telemetry)
 */

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Phone -> Robot (Write)
const NUS_TX_UUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Robot -> Phone (Notify)

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

  log(msg, type = 'info') {
    this.dispatchEvent(new CustomEvent('log', { detail: { msg, type, timestamp: new Date() } }));
    console.log(`[MiRobot] ${msg}`);
  }

  /**
   * 20-byte packet with XOR checksum
   */
  buildPacket(payload18) {
    const packet = new Uint8Array(20);
    let xor = 0;
    for (let i = 0; i < 18; i++) {
      const b = (payload18 && payload18[i] !== undefined) ? payload18[i] : 0;
      packet[i] = b;
      xor ^= b;
    }
    packet[18] = xor & 0xff;
    packet[19] = 0xaa; // Trailer
    return packet;
  }

  buildConnectPacket() {
    const p = new Uint8Array(18);
    p[0] = 0x55; p[1] = 0x01; p[2] = 0x01; p[3] = 0x00;
    return this.buildPacket(p);
  }

  buildRockerPacket(x, y) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x02; // Movement
    p[2] = 0x02;
    p[3] = 0x00;

    let finalX = Math.max(0, Math.min(255, Math.round(x)));
    let finalY = Math.max(0, Math.min(255, Math.round(y)));

    if (this.invertX) finalX = (256 - finalX) & 0xff;
    if (this.invertY) finalY = (256 - finalY) & 0xff;

    // Xiaomi Protocol Rocker Encoding:
    // Byte 4: X axis (0~255, center=128), Byte 5: 0x00 (padding/high)
    // Byte 6: Y axis (0~255, center=128), Byte 7: 0x00 (padding/high)
    p[4] = finalX & 0xff;
    p[5] = 0x00;
    p[6] = finalY & 0xff;
    p[7] = 0x00;

    return this.buildPacket(p);
  }

  /**
   * MICailbrationMessageCommand (0x55 0x06 0x00 0x00 [kind] [value]...)
   * Zero-point gyro & balance offset reset
   */
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

  /**
   * MIGetPIDCommand: Requests current PID gain settings stored in robot
   */
  buildGetPIDPacket() {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03; // PID group
    p[2] = 0x00;
    p[3] = 0x01; // Get PID
    return this.buildPacket(p);
  }

  /**
   * MISavePIDCommand: Saves current PID tuning to flash memory
   */
  buildSavePIDPacket() {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03;
    p[2] = 0x00;
    p[3] = 0x07; // Save PID
    return this.buildPacket(p);
  }

  /**
   * MISetAnglePCommand & MISetAngleDCommand
   */
  buildSetAnglePIDPacket(angleP, angleD) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03;
    p[2] = 0x00;
    p[3] = 0x03; // Angle PID
    p[4] = angleP & 0xff;
    p[5] = angleD & 0xff;
    p[6] = 0x00;
    return this.buildPacket(p);
  }

  /**
   * MISetSpeedPCommand & MISetSpeedICommand
   */
  buildSetSpeedPIDPacket(speedP, speedI) {
    const p = new Uint8Array(18);
    p[0] = 0x55;
    p[1] = 0x03;
    p[2] = 0x00;
    p[3] = 0x05; // Speed PID
    p[4] = speedP & 0xff;
    p[5] = speedI & 0xff;
    p[6] = 0x00;
    return this.buildPacket(p);
  }

  buildSoundPacket(soundId = 1) {
    const p = new Uint8Array(18);
    p[0] = 0x55; p[1] = 0x02; p[2] = 0x02; p[3] = 0x02;
    p[4] = soundId & 0xff;
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
      await this.writeRaw(this.buildConnectPacket());
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
      if (val[1] === 0x03) {
        this.telemetry.battery = val[4];
      }

      // Gyro / Tilt packet (Pitch & Roll)
      // Reverse-engineered format: 0x55 0x06 (Gyro report) or sensor packet
      if (val[1] === 0x06 || val[1] === 0x04) {
        // signed 16-bit pitch / roll
        const view = new DataView(val.buffer);
        if (val.length >= 10) {
          this.telemetry.pitch = view.getInt16(4, true) / 10.0;
          this.telemetry.roll = view.getInt16(6, true) / 10.0;
        }
      }

      this.dispatchEvent(new CustomEvent('telemetry', { detail: { ...this.telemetry, raw: val } }));
    }
  }

  /**
   * Send 0-point balance calibration command
   */
  async calibrateBalance() {
    if (!this.isConnected) return;
    this.log('⚖️ 수평 0점 캘리브레이션 명령 전송 중... 로봇을 반듯하게 세워주세요.', 'info');
    await this.writeRaw(this.buildCalibrationPacket(1, 0));
    this.log('✅ 캘리브레이션 패킷 전송 완료.', 'success');
  }

  /**
   * Apply & save new PID balance parameters
   */
  async setBalancePID(angleP, angleD, speedP, speedI) {
    if (!this.isConnected) return;
    this.pid = { angleP, angleD, speedP, speedI };
    this.log(`⚙️ PID 게인 설정 전송 (P:${angleP}, D:${angleD}, SpdP:${speedP}, SpdI:${speedI})`, 'info');
    await this.writeRaw(this.buildSetAnglePIDPacket(angleP, angleD));
    await this.writeRaw(this.buildSetSpeedPIDPacket(speedP, speedI));
    await this.writeRaw(this.buildSavePIDPacket());
    this.log('✅ PID 파라미터가 로봇에 플래시 저장되었습니다.', 'success');
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected || !this.rxChar) return;
      const packet = this.buildRockerPacket(this.axisX, this.axisY);
      this.writeRaw(packet);
    }, 60);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  setDrive(x, y) {
    this.axisX = x;
    this.axisY = y;
    this.dispatchEvent(new CustomEvent('drive', { detail: { x, y } }));
  }

  stop() {
    this.axisX = 128;
    this.axisY = 128;
    this.dispatchEvent(new CustomEvent('drive', { detail: { x: 128, y: 128 } }));
  }

  async sendStop() {
    this.stop();
    return this.writeRaw(this.buildRockerPacket(128, 128));
  }

  async playSound(soundId = 1) {
    if (!this.isConnected) return;
    this.log(`🔊 사운드/경적 효과음(#${soundId}) 전송`, 'info');
    return this.writeRaw(this.buildSoundPacket(soundId));
  }

  async setVolume(vol) {
    this.volume = vol;
    if (!this.isConnected) return;
    return this.writeRaw(this.buildVolumePacket(vol));
  }

  writeRaw(bytes, isPriority = false) {
    if (!this.rxChar) return Promise.resolve();

    // Bounded write queue: drop non-priority intermediate packets if queue is backlogged (>5)
    if (!isPriority && this._queueDepth > 5) {
      return Promise.resolve();
    }

    this._queueDepth++;
    this._writeQueue = this._writeQueue
      .then(async () => {
        if (!this.isConnected || !this.rxChar) return;
        try {
          await this.rxChar.writeValueWithoutResponse(bytes);
        } catch (e) {
          await this.rxChar.writeValue(bytes);
        }
      })
      .catch((err) => {
        console.warn('BLE write error:', err);
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
    this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: false } }));
  }

  async disconnect() {
    this.stop();
    this.stopHeartbeat();

    if (this.rxChar && this.isConnected) {
      try {
        await this.writeRaw(this.buildRockerPacket(128, 128));
      } catch (e) {}
    }

    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }

    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.rxChar = null;
    this.txChar = null;
    this.axisX = 128;
    this.axisY = 128;

    this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected: false } }));
  }
}

window.MiRobotBLE = MiRobotBLE;
