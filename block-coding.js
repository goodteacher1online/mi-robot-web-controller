/**
 * Mi Robot Web Controller - Visual Block Coding Studio Engine
 * Scratch / Blockly style visual block sequencing, educational presets,
 * async runtime interpreter with live visual highlight & robot BLE execution.
 */

class BlockCodingStudio extends EventTarget {
  constructor(robotInstance, colorSensorInstance, pianoInstance) {
    super();
    this.robot = robotInstance;
    this.sensor = colorSensorInstance;
    this.piano = pianoInstance;

    this.blocks = [];
    this.isRunning = false;
    this.abortController = null;
    this.currentStep = -1;

    // Available Block Definitions
    this.definitions = {
      // 1. Motion & Drive
      'drive_forward': {
        category: 'motion',
        name: '앞으로 주행',
        badge: '주행',
        color: '#2563eb',
        bg: '#eff6ff',
        defaultParams: { duration: 1.0, speed: 70 },
        description: '지정한 시간과 속도로 앞으로 전진합니다.'
      },
      'drive_backward': {
        category: 'motion',
        name: '뒤로 주행',
        badge: '주행',
        color: '#2563eb',
        bg: '#eff6ff',
        defaultParams: { duration: 1.0, speed: 70 },
        description: '지정한 시간과 속도로 뒤로 후진합니다.'
      },
      'turn_left': {
        category: 'motion',
        name: '좌회전',
        badge: '회전',
        color: '#0284c7',
        bg: '#f0f9ff',
        defaultParams: { duration: 0.5, speed: 60 },
        description: '왼쪽으로 제자리 회전합니다.'
      },
      'turn_right': {
        category: 'motion',
        name: '우회전',
        badge: '회전',
        color: '#0284c7',
        bg: '#f0f9ff',
        defaultParams: { duration: 0.5, speed: 60 },
        description: '오른쪽으로 제자리 회전합니다.'
      },
      'motor_dual': {
        category: 'motion',
        name: '개별 모터 구동',
        badge: '모터',
        color: '#0d9488',
        bg: '#f0fdfa',
        defaultParams: { left: 50, right: 50, duration: 1.0 },
        description: '좌/우 모터 파워를 독립적으로 지정하여 구동합니다.'
      },
      'stop': {
        category: 'motion',
        name: '모터 정지',
        badge: '정지',
        color: '#dc2626',
        bg: '#fef2f2',
        defaultParams: { duration: 0.5 },
        description: '모터를 즉시 정지하고 지정한 시간만큼 대기합니다.'
      },

      // 2. Control & Flow
      'wait': {
        category: 'control',
        name: '기다리기',
        badge: '제어',
        color: '#d97706',
        bg: '#fffbeb',
        defaultParams: { duration: 1.0 },
        description: '지정한 시간(초) 동안 대기합니다.'
      },
      'repeat_loop': {
        category: 'control',
        name: 'N회 반복 루프',
        badge: '반복',
        color: '#b45309',
        bg: '#fffbeb',
        defaultParams: { count: 4, innerAction: 'square_step' },
        description: '지정한 횟수만큼 동작 세트를 반복 실행합니다.'
      },

      // 3. Sensor & Events
      'wait_color': {
        category: 'sensor',
        name: '컬러 센서 색상 대기',
        badge: '센서',
        color: '#059669',
        bg: '#ecfdf5',
        defaultParams: { color: 'Green', timeout: 5.0 },
        description: '포트 C 컬러 센서에 해당 색상이 감지될 때까지 대기합니다.'
      },
      'line_trace_step': {
        category: 'sensor',
        name: '라인트레이서 1보 추적',
        badge: '센서',
        color: '#16a34a',
        bg: '#f0fdf4',
        defaultParams: { speed: 40 },
        description: '바닥의 검은색 선 반사율을 감지하여 자동 조향 전진합니다.'
      },

      // 4. Sound & Melodies
      'play_note': {
        category: 'sound',
        name: '피아노 음계 연주',
        badge: '사운드',
        color: '#7c3aed',
        bg: '#f5f3ff',
        defaultParams: { note: 13, duration: 0.4 }, // note 13 = C4 (도)
        description: '로봇 스피커 또는 피아노 엔진으로 지정한 음계를 연주합니다.'
      },
      'play_fanfare': {
        category: 'sound',
        name: '승리 팡파르 연주',
        badge: '사운드',
        color: '#9333ea',
        bg: '#faf5ff',
        defaultParams: {},
        description: '미션 성공 팡파르 멜로디를 연주합니다.'
      },
      'play_beep': {
        category: 'sound',
        name: '경고 비프음',
        badge: '사운드',
        color: '#c026d3',
        bg: '#fdf4ff',
        defaultParams: { count: 2 },
        description: '경고 비프음을 지정한 횟수만큼 재생합니다.'
      }
    };

    // Load initial default blocks
    this.loadPreset('square');
  }

  addBlock(type, params = null) {
    const def = this.definitions[type];
    if (!def) return;
    const blockData = {
      id: 'blk_' + Math.random().toString(36).substring(2, 9),
      type,
      params: params ? { ...params } : { ...def.defaultParams }
    };
    this.blocks.push(blockData);
    this.emitChange();
  }

  removeBlock(index) {
    if (index >= 0 && index < this.blocks.length) {
      this.blocks.splice(index, 1);
      this.emitChange();
    }
  }

  moveBlock(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= this.blocks.length) return;
    const item = this.blocks.splice(index, 1)[0];
    this.blocks.splice(target, 0, item);
    this.emitChange();
  }

  updateParam(index, key, val) {
    if (this.blocks[index] && this.blocks[index].params) {
      this.blocks[index].params[key] = val;
      this.emitChange();
    }
  }

  clear() {
    this.blocks = [];
    this.emitChange();
  }

  emitChange() {
    this.dispatchEvent(new CustomEvent('blockschange', { detail: { blocks: this.blocks } }));
  }

  /**
   * Educational Preset Templates
   */
  loadPreset(presetName) {
    this.clear();
    if (presetName === 'square') {
      // 사각 경로 순찰 주행 (4회 사각 주행)
      for (let i = 0; i < 4; i++) {
        this.addBlock('drive_forward', { duration: 1.0, speed: 70 });
        this.addBlock('turn_right', { duration: 0.5, speed: 60 });
      }
      this.addBlock('stop', { duration: 0.2 });
      this.addBlock('play_fanfare', {});
    } else if (presetName === 'traffic_light') {
      // 신호등 컬러 감지 주행: 초록색 감지 시 전진 -> 빨간색 감지 시 비상정지 및 경고음
      this.addBlock('wait_color', { color: 'Green', timeout: 6.0 });
      this.addBlock('drive_forward', { duration: 2.0, speed: 60 });
      this.addBlock('wait_color', { color: 'Red', timeout: 6.0 });
      this.addBlock('stop', { duration: 0.2 });
      this.addBlock('play_beep', { count: 3 });
    } else if (presetName === 'line_tracer') {
      // 라인트레이서 선 추적: 8회 라인 추적 스텝 후 팡파르
      for (let i = 0; i < 8; i++) {
        this.addBlock('line_trace_step', { speed: 45 });
      }
      this.addBlock('stop', { duration: 0.2 });
      this.addBlock('play_fanfare', {});
    } else if (presetName === 'melody_march') {
      // 도레미파솔 멜로디 행진
      const scale = [13, 15, 17, 18, 20]; // C4, D4, E4, F4, G4
      scale.forEach(note => {
        this.addBlock('play_note', { note, duration: 0.35 });
      });
      this.addBlock('drive_forward', { duration: 1.5, speed: 60 });
      this.addBlock('turn_right', { duration: 1.0, speed: 60 }); // 180도 회전
      this.addBlock('stop', { duration: 0.2 });
    } else if (presetName === 'spin_dance') {
      // 회전 댄스 팡파르
      this.addBlock('turn_left', { duration: 0.4, speed: 70 });
      this.addBlock('turn_right', { duration: 0.4, speed: 70 });
      this.addBlock('turn_left', { duration: 0.4, speed: 70 });
      this.addBlock('turn_right', { duration: 0.8, speed: 85 });
      this.addBlock('stop', { duration: 0.2 });
      this.addBlock('play_fanfare', {});
    }
  }

  sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    });
  }

  /**
   * Asynchronous Execution Engine with Live Highlight
   */
  async run() {
    if (this.isRunning) return;
    if (this.blocks.length === 0) {
      alert('실행할 블록이 없습니다. 블록을 추가해 주세요.');
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.dispatchEvent(new CustomEvent('executionstart', {}));

    try {
      for (let i = 0; i < this.blocks.length; i++) {
        if (signal.aborted) break;

        this.currentStep = i;
        const block = this.blocks[i];
        this.dispatchEvent(new CustomEvent('stepchange', { detail: { index: i, block } }));

        await this.executeBlock(block, signal);
      }

      this.currentStep = -1;
      this.dispatchEvent(new CustomEvent('stepchange', { detail: { index: -1 } }));
      this.dispatchEvent(new CustomEvent('executioncomplete', {}));
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[BlockCoding] 프로그램 실행이 사용자에 의해 중지되었습니다.');
      } else {
        console.error('[BlockCoding] 실행 오류:', err);
      }
    } finally {
      this.isRunning = false;
      this.currentStep = -1;
      this.dispatchEvent(new CustomEvent('stepchange', { detail: { index: -1 } }));
      this.dispatchEvent(new CustomEvent('executionstop', {}));

      // Always ensure motors are safely stopped
      if (this.robot) {
        try { await this.robot.sendStop(); } catch (e) {}
      }
    }
  }

  async stop() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
    this.currentStep = -1;
    if (this.robot) {
      try { await this.robot.sendStop(); } catch (e) {}
    }
    this.dispatchEvent(new CustomEvent('stepchange', { detail: { index: -1 } }));
    this.dispatchEvent(new CustomEvent('executionstop', {}));
  }

  async executeBlock(block, signal) {
    const { type, params } = block;

    if (type === 'drive_forward') {
      const dur = Math.max(0.1, Number(params.duration) || 1.0);
      const spd = Math.max(10, Math.min(100, Number(params.speed) || 70));
      const y = 128 + Math.round((spd / 100) * 127);
      if (this.robot) this.robot.setDrive(128, y);
      await this.sleep(dur * 1000, signal);
      if (this.robot) this.robot.stop();
    }

    else if (type === 'drive_backward') {
      const dur = Math.max(0.1, Number(params.duration) || 1.0);
      const spd = Math.max(10, Math.min(100, Number(params.speed) || 70));
      const y = 128 - Math.round((spd / 100) * 127);
      if (this.robot) this.robot.setDrive(128, y);
      await this.sleep(dur * 1000, signal);
      if (this.robot) this.robot.stop();
    }

    else if (type === 'turn_left') {
      const dur = Math.max(0.1, Number(params.duration) || 0.5);
      const spd = Math.max(10, Math.min(100, Number(params.speed) || 60));
      const x = 128 - Math.round((spd / 100) * 127);
      if (this.robot) this.robot.setDrive(x, 128);
      await this.sleep(dur * 1000, signal);
      if (this.robot) this.robot.stop();
    }

    else if (type === 'turn_right') {
      const dur = Math.max(0.1, Number(params.duration) || 0.5);
      const spd = Math.max(10, Math.min(100, Number(params.speed) || 60));
      const x = 128 + Math.round((spd / 100) * 127);
      if (this.robot) this.robot.setDrive(x, 128);
      await this.sleep(dur * 1000, signal);
      if (this.robot) this.robot.stop();
    }

    else if (type === 'motor_dual') {
      const left = Math.max(-100, Math.min(100, Number(params.left) || 0));
      const right = Math.max(-100, Math.min(100, Number(params.right) || 0));
      const dur = Math.max(0.1, Number(params.duration) || 1.0);
      if (this.robot) this.robot.setMotors(left, right);
      await this.sleep(dur * 1000, signal);
      if (this.robot) this.robot.stop();
    }

    else if (type === 'stop') {
      const dur = Math.max(0.05, Number(params.duration) || 0.2);
      if (this.robot) await this.robot.sendStop();
      await this.sleep(dur * 1000, signal);
    }

    else if (type === 'wait') {
      const dur = Math.max(0.1, Number(params.duration) || 1.0);
      await this.sleep(dur * 1000, signal);
    }

    else if (type === 'wait_color') {
      const targetColor = String(params.color || 'Green').toLowerCase();
      const timeoutSec = Math.max(0.5, Number(params.timeout) || 5.0);
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutSec * 1000) {
        if (signal.aborted) return;
        const currentColor = (this.sensor && this.sensor.currentState)
          ? String(this.sensor.currentState.colorName).toLowerCase()
          : '';
        if (currentColor === targetColor) {
          break;
        }
        await this.sleep(80, signal);
      }
    }

    else if (type === 'line_trace_step') {
      const spd = Math.max(10, Math.min(80, Number(params.speed) || 40));
      // Detect reflection: if line detected, steer right, else forward
      const isLine = this.sensor ? this.sensor.currentState.isLineDetected : false;
      if (isLine) {
        if (this.robot) this.robot.setMotors(Math.round(spd * 0.4), spd);
      } else {
        if (this.robot) this.robot.setMotors(spd, Math.round(spd * 0.4));
      }
      await this.sleep(200, signal);
      if (this.robot) this.robot.stop();
    }

    else if (type === 'play_note') {
      const note = Number(params.note) || 13;
      const dur = Math.max(0.1, Number(params.duration) || 0.4);
      if (this.piano && typeof this.piano.playNote === 'function') {
        this.piano.playNote(note);
      } else if (this.robot && typeof this.robot.playTone === 'function') {
        this.robot.playTone(note);
      }
      await this.sleep(dur * 1000, signal);
    }

    else if (type === 'play_fanfare') {
      const notes = [13, 17, 20, 25]; // C4, E4, G4, C5
      for (const n of notes) {
        if (signal.aborted) break;
        if (this.piano && typeof this.piano.playNote === 'function') {
          this.piano.playNote(n);
        } else if (this.robot && typeof this.robot.playTone === 'function') {
          this.robot.playTone(n);
        }
        await this.sleep(180, signal);
      }
    }

    else if (type === 'play_beep') {
      const count = Math.max(1, Math.min(5, Number(params.count) || 2));
      for (let c = 0; c < count; c++) {
        if (signal.aborted) break;
        if (this.robot && typeof this.robot.playTone === 'function') {
          this.robot.playTone(20);
        }
        await this.sleep(150, signal);
      }
    }
  }

  exportJSON() {
    return JSON.stringify(this.blocks, null, 2);
  }

  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data)) {
        this.blocks = data;
        this.emitChange();
        return true;
      }
    } catch (e) {
      console.warn('Invalid JSON for block coding:', e);
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.BlockCodingStudio = BlockCodingStudio;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BlockCodingStudio };
}
