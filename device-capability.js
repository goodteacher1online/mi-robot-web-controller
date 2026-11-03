/**
 * Device & Browser Capability Detector for Mi Robot Web Studio
 * Probes hardware APIs and provides reactive status
 */

class DeviceCapabilityDetector {
  constructor() {
    this.capabilities = {
      bluetooth: false,
      camera: false,
      webAudio: false,
      gamepad: false,
      vibrate: false,
      wakeLock: false,
      touch: false,
      webgl: false
    };
    this.reasons = {};
    this.probe();
  }

  probe() {
    // 1. Web Bluetooth
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      this.capabilities.bluetooth = true;
    } else {
      this.capabilities.bluetooth = false;
      this.reasons.bluetooth = 'Chrome, Edge 또는 블루투스 지원 브라우저가 필요합니다 (iOS Safari 미지원)';
    }

    // 2. Camera (MediaDevices)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      this.capabilities.camera = true;
    } else {
      this.capabilities.camera = false;
      this.reasons.camera = '카메라 접근 권한 또는 HTTPS 환경이 필요합니다';
    }

    // 3. Web Audio API
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.capabilities.webAudio = true;
    } else {
      this.capabilities.webAudio = false;
      this.reasons.webAudio = 'Web Audio API를 지원하지 않는 구형 브라우저입니다';
    }

    // 4. Gamepad API
    if (typeof navigator !== 'undefined' && 'getGamepads' in navigator) {
      this.capabilities.gamepad = true;
    } else {
      this.capabilities.gamepad = false;
      this.reasons.gamepad = 'Gamepad API를 지원하지 않는 브라우저입니다';
    }

    // 5. Vibration (Haptics)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      this.capabilities.vibrate = true;
    } else {
      this.capabilities.vibrate = false;
      this.reasons.vibrate = '진동 모터가 없거나 지원되지 않는 기기입니다 (PC 등)';
    }

    // 6. Screen Wake Lock
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      this.capabilities.wakeLock = true;
    } else {
      this.capabilities.wakeLock = false;
      this.reasons.wakeLock = '화면 꺼짐 방지(Wake Lock)를 지원하지 않는 브라우저입니다';
    }

    // 7. Touch screen
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      this.capabilities.touch = true;
    } else {
      this.capabilities.touch = false;
      this.reasons.touch = '터치 스크린이 없는 일반 마우스 환경입니다';
    }

    // 8. WebGL (for 3D and MediaPipe/TensorFlow acceleration)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.capabilities.webgl = !!gl;
    } catch (e) {
      this.capabilities.webgl = false;
      this.reasons.webgl = 'WebGL 하드웨어 가속이 꺼져있거나 지원되지 않습니다';
    }
  }

  isSupported(feature) {
    return !!this.capabilities[feature];
  }

  getReason(feature) {
    return this.reasons[feature] || '정상 지원됨';
  }
}

window.DeviceCapabilityDetector = DeviceCapabilityDetector;
