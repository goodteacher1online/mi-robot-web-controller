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
    this.lineThreshold = 25; // Reflectance threshold % for line detection
    this.reactionTimer = null;

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

    // User-configurable Color Reaction Rules
    this.customRules = {
      5: { key: 'red', name: '빨간색 (Red)', action: 'stop', speed: 0, duration: 0, tone: 25 },
      3: { key: 'green', name: '초록색 (Green)', action: 'forward', speed: 50, duration: 0, tone: 0 },
      4: { key: 'yellow', name: '노란색 (Yellow)', action: 'slow', speed: 25, duration: 0, tone: 15 },
      2: { key: 'blue', name: '파란색 (Blue)', action: 'turn_right', speed: 50, duration: 600, tone: 0 },
      6: { key: 'white', name: '흰색 (White)', action: 'none', speed: 0, duration: 0, tone: 0 },
      1: { key: 'black', name: '검은색 라인 (Line)', action: 'line_trace', speed: 45, duration: 0, tone: 0 }
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
    if (!this.autoReaction && this.reactionTimer) {
      clearTimeout(this.reactionTimer);
      this.reactionTimer = null;
      if (this.robot) this.robot.stop();
    }
    this.dispatchEvent(new CustomEvent('autoreactionchange', { detail: { enabled: this.autoReaction } }));
  }

  setLineThreshold(val) {
    this.lineThreshold = Math.max(5, Math.min(60, Math.round(val)));
    this.updateState(this.currentState.colorId, this.currentState.grayscale, this.currentState.isSimulated);
  }

  setReactionSpeed(speed) {
    this.reactionSpeed = Math.max(10, Math.min(100, Math.round(speed)));
  }

  updateState(colorId, grayscale, isSimulated = false) {
    const info = this.COLOR_MAP[colorId] || this.COLOR_MAP[0];
    const gray = Math.max(0, Math.min(100, Math.round(grayscale)));
    const isLine = gray <= this.lineThreshold;

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

  setCustomRule(colorId, action, speed = 50, duration = 0, tone = 0) {
    const id = Number(colorId);
    if (!this.customRules[id]) {
      this.customRules[id] = { action: 'none', speed: 50, duration: 0, tone: 0 };
    }
    this.customRules[id].action = action;
    this.customRules[id].speed = Number(speed) || 50;
    this.customRules[id].duration = Number(duration) || 0;
    this.customRules[id].tone = Number(tone) || 0;
    this.dispatchEvent(new CustomEvent('ruleschange', { detail: this.customRules }));
  }

  getCustomRule(colorId) {
    return this.customRules[Number(colorId)] || null;
  }

  /**
   * Automatic Robot Reaction Loop (Configurable by user)
   */
  async executeAutoReaction(state) {
    if (!this.robot) return;

    // Check if line detected first if in line trace mode
    let targetRule = null;
    if (state.isLineDetected && this.customRules[1]) {
      targetRule = this.customRules[1];
    } else if (this.customRules[state.colorId]) {
      targetRule = this.customRules[state.colorId];
    }

    if (!targetRule || targetRule.action === 'none') {
      return;
    }

    const { action, speed = 50, duration = 0, tone = 0 } = targetRule;
    const finalSpeed = speed || this.reactionSpeed;

    try {
      if (action === 'stop') {
        console.log(`[Color Reaction] 🔴 ${state.koreanName} 감지 -> 즉시 정지`);
        await this.robot.sendStop();
        if (tone && typeof this.robot.playTone === 'function') {
          this.robot.playTone(tone);
        }
      } else if (action === 'forward') {
        console.log(`[Color Reaction] 🟢 ${state.koreanName} 감지 -> 전진 주행 (${finalSpeed}%)`);
        const throttleY = 128 + Math.round((finalSpeed / 100) * 127);
        this.robot.setDrive(128, throttleY);
        if (tone && typeof this.robot.playTone === 'function') {
          this.robot.playTone(tone);
        }
      } else if (action === 'backward') {
        console.log(`[Color Reaction] 🔙 ${state.koreanName} 감지 -> 후진 주행 (${finalSpeed}%)`);
        const throttleY = 128 - Math.round((finalSpeed / 100) * 127);
        this.robot.setDrive(128, throttleY);
        if (tone && typeof this.robot.playTone === 'function') {
          this.robot.playTone(tone);
        }
      } else if (action === 'slow') {
        console.log(`[Color Reaction] 🟡 ${state.koreanName} 감지 -> 서행 주행 (${finalSpeed}%)`);
        const slowThrottleY = 128 + Math.round((finalSpeed / 100) * 127);
        this.robot.setDrive(128, slowThrottleY);
        if (tone && typeof this.robot.playTone === 'function') {
          this.robot.playTone(tone);
        }
      } else if (action === 'turn_left') {
        console.log(`[Color Reaction] ↩️ ${state.koreanName} 감지 -> 좌회전`);
        if (this.reactionTimer) clearTimeout(this.reactionTimer);
        this.robot.setMotors(-finalSpeed, finalSpeed);
        if (duration > 0) {
          this.reactionTimer = setTimeout(() => {
            if (this.autoReaction) this.robot.stop();
            this.reactionTimer = null;
          }, duration);
        }
      } else if (action === 'turn_right') {
        console.log(`[Color Reaction] ↪️ ${state.koreanName} 감지 -> 우회전`);
        if (this.reactionTimer) clearTimeout(this.reactionTimer);
        this.robot.setMotors(finalSpeed, -finalSpeed);
        if (duration > 0) {
          this.reactionTimer = setTimeout(() => {
            if (this.autoReaction) this.robot.stop();
            this.reactionTimer = null;
          }, duration);
        }
      } else if (action === 'tone') {
        console.log(`[Color Reaction] 🎵 ${state.koreanName} 감지 -> 음계(#${tone}) 재생`);
        if (typeof this.robot.playTone === 'function') {
          this.robot.playTone(tone || 13);
        }
      } else if (action === 'line_trace') {
        console.log(`[Color Reaction] 〰️ 검은색 라인 감지 -> 선 추적 조향 (${finalSpeed}%)`);
        this.robot.setMotors(Math.round(finalSpeed * 0.4), finalSpeed);
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
