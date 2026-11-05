/**
 * Mi Robot Web Controller - Color & Grayscale Sensor Manager
 * Supports Xiaomi Mi Robot Builder Ports A, B, C, D hardware mapping,
 * ColorSensorType1 (Color ID) & ColorSensorType2 (Grayscale/Line Tracer),
 * virtual palette simulation, and automatic reaction control loops.
 */

class MiRobotColorSensor extends EventTarget {
  constructor(robotInstance) {
    super();
    this.robot = robotInstance;
    this.activePort = 'C'; // Default hardware port for color sensor
    this.autoReaction = false;
    this.reactionSpeed = 50;

    // Standard Xiaomi Color Definitions
    this.COLOR_MAP = {
      0: { name: 'None', ko: '감지 안 됨', hex: '#94a3b8', textColor: '#475569' },
      1: { name: 'Black', ko: '검정색 (Black)', hex: '#1e293b', textColor: '#ffffff' },
      2: { name: 'Blue', ko: '파란색 (Blue)', hex: '#2563eb', textColor: '#ffffff' },
      3: { name: 'Green', ko: '초록색 (Green)', hex: '#16a34a', textColor: '#ffffff' },
      4: { name: 'Yellow', ko: '노란색 (Yellow)', hex: '#eab308', textColor: '#000000' },
      5: { name: 'Red', ko: '빨간색 (Red)', hex: '#dc2626', textColor: '#ffffff' },
      6: { name: 'White', ko: '흰색 (White)', hex: '#f8fafc', textColor: '#0f172a' }
    };

    // Current State
    this.currentState = {
      port: 'C',
      colorId: 0,
      colorName: 'None',
      colorHex: '#94a3b8',
      koreanName: '감지 안 됨',
      grayscale: 80, // Reflectance 0~100% (High = White floor, Low = Black line)
      isLineDetected: false, // true if grayscale <= 25%
      lastUpdated: null
    };

    this.bindRobotEvents();
  }

  bindRobotEvents() {
    if (!this.robot) return;
    this.robot.addEventListener('sensordata', (e) => {
      const d = e.detail;
      if (!d) return;
      if (d.port && d.port !== this.activePort) return;

      const colorId = (typeof d.colorId === 'number') ? d.colorId : this.currentState.colorId;
      const grayscale = (typeof d.grayscale === 'number') ? d.grayscale : this.currentState.grayscale;
      this.updateState(colorId, grayscale, false);
    });
  }

  setPort(port) {
    if (['A', 'B', 'C', 'D'].includes(port)) {
      this.activePort = port;
      this.currentState.port = port;
      this.dispatchEvent(new CustomEvent('sensorupdate', { detail: this.currentState }));
    }
  }

  setAutoReaction(enabled) {
    this.autoReaction = !!enabled;
    this.dispatchEvent(new CustomEvent('autoreactionchange', { detail: { enabled: this.autoReaction } }));
  }

  setReactionSpeed(speed) {
    this.reactionSpeed = Math.max(10, Math.min(100, Math.round(speed)));
  }

  updateState(colorId, grayscale, isSimulated = false) {
    const info = this.COLOR_MAP[colorId] || this.COLOR_MAP[0];
    const gray = Math.max(0, Math.min(100, Math.round(grayscale)));
    const isLine = gray <= 25;

    this.currentState = {
      port: this.activePort,
      colorId,
      colorName: info.name,
      colorHex: info.hex,
      textColor: info.textColor,
      koreanName: info.ko,
      grayscale: gray,
      isLineDetected: isLine,
      isSimulated,
      lastUpdated: new Date()
    };

    this.dispatchEvent(new CustomEvent('sensorupdate', { detail: this.currentState }));

    // Run auto-reaction logic if activated
    if (this.autoReaction && this.robot) {
      this.executeAutoReaction(this.currentState);
    }
  }

  /**
   * Virtual Palette / Test simulation trigger
   */
  simulate(colorId, grayscale = null) {
    let gray = grayscale;
    if (gray === null) {
      if (colorId === 1) gray = 10; // Black / Line
      else if (colorId === 6) gray = 95; // White
      else if (colorId === 5) gray = 45; // Red
      else if (colorId === 3) gray = 50; // Green
      else if (colorId === 2) gray = 40; // Blue
      else if (colorId === 4) gray = 70; // Yellow
      else gray = 80;
    }

    this.updateState(colorId, gray, true);

    // Also notify fleet robot if possible
    if (this.robot && typeof this.robot.simulateSensorData === 'function') {
      this.robot.simulateSensorData(this.activePort, {
        colorId,
        grayscale: gray
      });
    }
  }

  /**
   * Automatic Robot Reaction Loop
   */
  async executeAutoReaction(state) {
    if (!this.robot) return;

    try {
      if (state.colorId === 5) {
        // Red: Emergency Stop + Buzzer Alert
        console.log('[Color Reaction] 🔴 빨간색 감지 -> 비상 정지');
        await this.robot.sendStop();
        if (typeof this.robot.playTone === 'function') {
          this.robot.playTone(25); // Alert tone
        }
      } else if (state.colorId === 3) {
        // Green: Forward drive at configured reaction speed
        console.log('[Color Reaction] 🟢 초록색 감지 -> 전진 주행');
        const throttleY = 128 + Math.round((this.reactionSpeed / 100) * 127);
        this.robot.setDrive(128, throttleY);
      } else if (state.colorId === 4) {
        // Yellow: Slow speed + short beep
        console.log('[Color Reaction] 🟡 노란색 감지 -> 서행');
        const slowThrottleY = 128 + Math.round(25 * 1.27);
        this.robot.setDrive(128, slowThrottleY);
        if (typeof this.robot.playTone === 'function') {
          this.robot.playTone(15);
        }
      } else if (state.colorId === 2) {
        // Blue: Spin right 90 degrees
        console.log('[Color Reaction] 🔵 파란색 감지 -> 우회전');
        this.robot.setMotors(40, -40);
        setTimeout(() => {
          if (this.autoReaction && this.currentState.colorId === 2) {
            this.robot.stop();
          }
        }, 600);
      } else if (state.isLineDetected) {
        // Black Line Tracker: steer correction
        console.log('[Color Reaction] 〰️ 검은색 라인 감지 -> 선 추적 조향');
        this.robot.setMotors(20, 45); // Adjust right
      }
    } catch (e) {
      console.warn('Auto reaction error:', e);
    }
  }
}

if (typeof window !== 'undefined') {
  window.MiRobotColorSensor = MiRobotColorSensor;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MiRobotColorSensor };
}
