/**
 * Lightweight Sensor Pattern Machine Learning (CreateAI / Teachable Style)
 * Uses Distance-Weighted k-Nearest Neighbors (k-NN) or Adaptive-K
 */

class SensorPatternML {
  constructor() {
    this.classes = ['안정 상태 (Normal)', '전방 기울임 (Tilt Front)', '충격/넘어짐 (Impact)'];
    this.dataset = []; // Array of { className, features: [...] }
    this.k = 3;
    this.isTrained = false;
  }

  extractFeatures(sampleWindow) {
    if (!sampleWindow || sampleWindow.length === 0) {
      return [0, 0, 0, 0, 0, 0];
    }

    let sumPitch = 0, sumRoll = 0, maxAbsPitch = 0, maxAbsRoll = 0;
    for (const s of sampleWindow) {
      sumPitch += s.pitch || 0;
      sumRoll += s.roll || 0;
      maxAbsPitch = Math.max(maxAbsPitch, Math.abs(s.pitch || 0));
      maxAbsRoll = Math.max(maxAbsRoll, Math.abs(s.roll || 0));
    }

    const avgPitch = sumPitch / sampleWindow.length;
    const avgRoll = sumRoll / sampleWindow.length;

    let varPitch = 0, varRoll = 0;
    for (const s of sampleWindow) {
      varPitch += Math.pow((s.pitch || 0) - avgPitch, 2);
      varRoll += Math.pow((s.roll || 0) - avgRoll, 2);
    }
    varPitch /= sampleWindow.length;
    varRoll /= sampleWindow.length;

    return [avgPitch, avgRoll, maxAbsPitch, maxAbsRoll, Math.sqrt(varPitch), Math.sqrt(varRoll)];
  }

  _updateTrainedStatus() {
    const uniqueClasses = new Set(this.dataset.map(d => d.className));
    this.isTrained = uniqueClasses.size >= 2;
  }

  addExample(className, features) {
    this.dataset.push({ className, features: Array.from(features) });
    this._updateTrainedStatus();
  }

  clearClass(className) {
    this.dataset = this.dataset.filter(d => d.className !== className);
    this._updateTrainedStatus();
  }

  clearAll() {
    this.dataset = [];
    this.isTrained = false;
  }

  getExampleCount(className) {
    return this.dataset.filter(d => d.className === className).length;
  }

  // Feature weighting to prevent higher-range features from overwhelming smaller ones
  // [avgPitch(1.0), avgRoll(1.0), maxPitch(0.5), maxRoll(0.5), stdPitch(2.0), stdRoll(2.0)]
  _distance(a, b) {
    const weights = [1.0, 1.0, 0.5, 0.5, 2.0, 2.0];
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const w = weights[i] || 1.0;
      sum += w * Math.pow((a[i] || 0) - (b[i] || 0), 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Distance-Weighted Prediction: Closer neighbors contribute exponentially more weight
   */
  predict(features) {
    if (!this.isTrained || this.dataset.length === 0) {
      return { className: '학습 필요', confidence: 0 };
    }

    const distances = this.dataset.map(item => ({
      className: item.className,
      dist: this._distance(features, item.features)
    }));

    distances.sort((a, b) => a.dist - b.dist);

    // If exact match or very close, return directly
    if (distances[0].dist < 0.0001) {
      return { className: distances[0].className, confidence: 100 };
    }

    // Use top-K (adaptive up to k=3 or dataset size)
    const activeK = Math.min(this.k, distances.length);
    const kNearest = distances.slice(0, activeK);

    // Distance-weighted voting: weight = 1 / (dist + epsilon)
    const weights = {};
    let totalWeight = 0;

    for (const item of kNearest) {
      const w = 1.0 / (item.dist + 0.001);
      weights[item.className] = (weights[item.className] || 0) + w;
      totalWeight += w;
    }

    let topClass = null;
    let maxWeight = -1;
    for (const [cls, w] of Object.entries(weights)) {
      if (w > maxWeight) {
        maxWeight = w;
        topClass = cls;
      }
    }

    const confidence = totalWeight > 0 ? Math.round((maxWeight / totalWeight) * 100) : 100;
    return { className: topClass, confidence };
  }
}

if (typeof window !== 'undefined') {
  window.SensorPatternML = SensorPatternML;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SensorPatternML;
}
