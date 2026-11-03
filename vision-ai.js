/**
 * Vision AI Motion Controller for Mi Robot
 * Supports:
 * 1) Hand Gesture Mode (✋ Palm / Fist Centroid Tracking)
 * 2) Body Pose Mode (🧍 Upper-Body Posture / Head & Shoulder Tilt Tracking)
 */

class VisionHandController extends EventTarget {
  constructor() {
    super();
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.isRunning = false;
    this.mode = 'hand'; // 'hand' or 'pose'
    this.lastCommand = '정지';
  }

  setMode(mode) {
    if (mode === 'hand' || mode === 'pose') {
      this.mode = mode;
    }
  }

  async init(videoEl, canvasEl) {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.canvasCtx = canvasEl.getContext('2d');

    // High-performance downscaled analysis canvas (160x120) with willReadFrequently
    this._analysisCanvas = document.createElement('canvas');
    this._analysisCanvas.width = 160;
    this._analysisCanvas.height = 120;
    this._analysisCtx = this._analysisCanvas.getContext('2d', { willReadFrequently: true });
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('카메라 접근 권한이 없거나 지원되지 않는 환경입니다.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' }
    });
    this.videoElement.srcObject = stream;
    await this.videoElement.play();
    this.isRunning = true;
    this._processLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.videoElement && this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(t => t.stop());
      this.videoElement.srcObject = null;
    }
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  _processLoop() {
    if (!this.isRunning) return;

    if (this.videoElement.readyState >= 2) {
      const vw = this.videoElement.videoWidth;
      const vh = this.videoElement.videoHeight;
      if (this.canvasElement.width !== vw || this.canvasElement.height !== vh) {
        this.canvasElement.width = vw;
        this.canvasElement.height = vh;
      }
      this.canvasCtx.drawImage(this.videoElement, 0, 0);

      this._analyzeFrame();
    }

    requestAnimationFrame(() => this._processLoop());
  }

  _analyzeFrame() {
    const dispW = this.canvasElement.width;
    const dispH = this.canvasElement.height;
    if (dispW === 0 || dispH === 0) return;

    const aW = this._analysisCanvas.width;
    const aH = this._analysisCanvas.height;
    this._analysisCtx.drawImage(this.videoElement, 0, 0, aW, aH);

    const frame = this._analysisCtx.getImageData(0, 0, aW, aH);
    const d = frame.data;

    if (this.mode === 'pose') {
      this._analyzePose(d, aW, aH, dispW, dispH);
    } else {
      this._analyzeHand(d, aW, aH, dispW, dispH);
    }
  }

  /**
   * 1) Hand Gesture Tracker
   */
  _analyzeHand(d, aW, aH, dispW, dispH) {
    let totalX = 0, totalY = 0, count = 0;
    for (let i = 0; i < d.length; i += 8) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (r > 100 && g > 70 && b < 170 && (r - g) > 10) {
        const pixelIdx = i / 4;
        totalX += pixelIdx % aW;
        totalY += Math.floor(pixelIdx / aW);
        count++;
      }
    }

    if (count > 50) {
      const aCenterX = totalX / count;
      const aCenterY = totalY / count;
      const centerX = (aCenterX / aW) * dispW;
      const centerY = (aCenterY / aH) * dispH;

      // Draw tracked hand cursor
      this.canvasCtx.strokeStyle = '#2563eb';
      this.canvasCtx.lineWidth = 3;
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(centerX, centerY, 22, 0, Math.PI * 2);
      this.canvasCtx.stroke();

      this.canvasCtx.fillStyle = 'rgba(37, 99, 235, 0.2)';
      this.canvasCtx.fill();

      const normX = (centerX - dispW / 2) / (dispW / 2);
      const normY = -(centerY - dispH / 2) / (dispH / 2);

      let cmd = '정지';
      let driveX = 128, driveY = 128;

      if (normY > 0.3) {
        cmd = '전진';
        driveY = 210;
      } else if (normY < -0.3) {
        cmd = '후진';
        driveY = 50;
      }

      if (normX > 0.35) {
        cmd = '우회전';
        driveX = 210;
      } else if (normX < -0.35) {
        cmd = '좌회전';
        driveX = 50;
      }

      this.lastCommand = cmd;
      this.dispatchEvent(new CustomEvent('gesture', { detail: { mode: 'hand', command: cmd, driveX, driveY, count } }));
    } else {
      this.lastCommand = '감지 대기';
      this.dispatchEvent(new CustomEvent('gesture', { detail: { mode: 'hand', command: '정지', driveX: 128, driveY: 128, count: 0 } }));
    }
  }

  /**
   * 2) Body Pose & Posture Tracker (Upper-Body Lean & Stance)
   */
  _analyzePose(d, aW, aH, dispW, dispH) {
    let topHalfX = 0, topHalfY = 0, topCount = 0;
    let bottomHalfX = 0, bottomHalfY = 0, bottomCount = 0;

    for (let i = 0; i < d.length; i += 8) {
      const r = d[i], g = d[i+1], b = d[i+2];
      const brightness = (r + g + b) / 3;
      // Motion & person silhouette detection
      if (brightness > 60 && brightness < 220) {
        const pixelIdx = i / 4;
        const px = pixelIdx % aW;
        const py = Math.floor(pixelIdx / aW);

        if (py < aH * 0.5) {
          topHalfX += px;
          topHalfY += py;
          topCount++;
        } else {
          bottomHalfX += px;
          bottomHalfY += py;
          bottomCount++;
        }
      }
    }

    if (topCount > 80 && bottomCount > 80) {
      const headX = (topHalfX / topCount / aW) * dispW;
      const headY = (topHalfY / topCount / aH) * dispH;
      const torsoX = (bottomHalfX / bottomCount / aW) * dispW;
      const torsoY = (bottomHalfY / bottomCount / aH) * dispH;

      // Draw Sleek Skeletal Visual Overlay
      this.canvasCtx.lineWidth = 3;
      this.canvasCtx.strokeStyle = '#10b981';

      // Head circle
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(headX, headY, 26, 0, Math.PI * 2);
      this.canvasCtx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      this.canvasCtx.fill();
      this.canvasCtx.stroke();

      // Shoulder horizontal bar
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(headX - 45, headY + 30);
      this.canvasCtx.lineTo(headX + 45, headY + 30);
      this.canvasCtx.stroke();

      // Spine line connecting head to torso
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(headX, headY + 26);
      this.canvasCtx.lineTo(torsoX, torsoY);
      this.canvasCtx.strokeStyle = '#2563eb';
      this.canvasCtx.stroke();

      // Torso base circle
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(torsoX, torsoY, 18, 0, Math.PI * 2);
      this.canvasCtx.stroke();

      // Posture Angle Calculation (Lean left/right, duck/tall)
      const dx = headX - torsoX;
      const dy = headY - (dispH * 0.25); // deviation from normal standing height

      let cmd = '정지';
      let driveX = 128, driveY = 128;

      if (dx < -25) {
        cmd = '좌측 기울임 (좌회전)';
        driveX = 60;
      } else if (dx > 25) {
        cmd = '우측 기울임 (우회전)';
        driveX = 196;
      }

      if (dy > 30) {
        cmd = '상체 숙임 (후진)';
        driveY = 60;
      } else if (dy < -25) {
        cmd = '상체 세움 (전진)';
        driveY = 196;
      }

      this.lastCommand = cmd;
      this.dispatchEvent(new CustomEvent('gesture', {
        detail: { mode: 'pose', command: cmd, driveX, driveY, leanX: dx, heightY: dy }
      }));
    } else {
      this.lastCommand = '포즈 대기';
      this.dispatchEvent(new CustomEvent('gesture', {
        detail: { mode: 'pose', command: '정지', driveX: 128, driveY: 128 }
      }));
    }
  }
}

if (typeof window !== 'undefined') {
  window.VisionHandController = VisionHandController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisionHandController;
}
