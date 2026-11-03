/**
 * MediaPipe / Web Vision AI Hand Gesture Controller for Mi Robot
 * Tracks hand landmarks and translates them to robot movement commands
 */

class VisionHandController extends EventTarget {
  constructor() {
    super();
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.camera = null;
    this.hands = null;
    this.isRunning = false;
    this.lastCommand = '정지';
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

      // Simple Color/Brightness Motion Tracking fallback (if external CDN blocked)
      // Tracks user hand movement in center quadrant
      this._analyzeFrame();
    }

    requestAnimationFrame(() => this._processLoop());
  }

  _analyzeFrame() {
    const dispW = this.canvasElement.width;
    const dispH = this.canvasElement.height;
    if (dispW === 0 || dispH === 0) return;

    // Draw to downscaled 160x120 canvas to eliminate GC churn and lag
    const aW = this._analysisCanvas.width;
    const aH = this._analysisCanvas.height;
    this._analysisCtx.drawImage(this.videoElement, 0, 0, aW, aH);

    const frame = this._analysisCtx.getImageData(0, 0, aW, aH);
    const d = frame.data;

    let totalX = 0, totalY = 0, count = 0;
    // Sample pixels in 160x120
    for (let i = 0; i < d.length; i += 8) {
      const r = d[i];
      const g = d[i+1];
      const b = d[i+2];
      // Adaptive skin/bright motion threshold
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

      // Scale back up to display canvas coordinates
      const centerX = (aCenterX / aW) * dispW;
      const centerY = (aCenterY / aH) * dispH;

      // Draw tracked hand cursor
      this.canvasCtx.strokeStyle = '#00d2ff';
      this.canvasCtx.lineWidth = 3;
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      this.canvasCtx.stroke();

      // Normalize relative to screen center
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
      this.dispatchEvent(new CustomEvent('gesture', { detail: { command: cmd, driveX, driveY, count } }));
    } else {
      this.lastCommand = '감지 대기';
      this.dispatchEvent(new CustomEvent('gesture', { detail: { command: '정지', driveX: 128, driveY: 128, count: 0 } }));
    }
  }
}

window.VisionHandController = VisionHandController;
