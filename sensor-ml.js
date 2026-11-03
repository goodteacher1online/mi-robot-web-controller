/**
 * Sensor Pattern Machine Learning Engine (MakeCode / Teachable Machine Style)
 * Supports dynamic user classes, data collection, model training & robot action triggers
 */

class SensorPatternML {
  constructor() {
    // Default initial classes
    this.classes = [
      { id: 'c1', name: '평지 안정 (Normal)', action: 'none' },
      { id: 'c2', name: '앞으로 기울임 (Tilt Front)', action: 'calibrate' },
      { id: 'c3', name: '충격 / 넘어짐 (Impact)', action: 'horn' }
    ];
    this.dataset = []; // Array of { classId, className, features: [...] }
    this.k = 3;
    this.isTrained = false;
    this.modelInfo = null;
  }

  // Add custom user class
  addClass(name, action = 'none') {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newClass = { id, name: trimmed, action };
    this.classes.push(newClass);
    return newClass;
  }

  // Remove class and its recorded samples
  removeClass(idOrName) {
    this.classes = this.classes.filter(c => c.id !== idOrName && c.name !== idOrName);
    this.dataset = this.dataset.filter(d => d.classId !== idOrName && d.className !== idOrName);
    this._recheckTrainedState();
  }

  // Rename a class
  renameClass(id, newName) {
    const target = this.classes.find(c => c.id === id);
    if (target) {
      target.name = newName;
      this.dataset.forEach(d => {
        if (d.classId === id) d.className = newName;
      });
    }
  }

  // Set mapped action (e.g. 'none', 'stop', 'horn', 'melody', 'calibrate', 'forward', 'backward')
  setAction(id, action) {
    const target = this.classes.find(c => c.id === id);
    if (target) target.action = action;
  }

  getAction(className) {
    const target = this.classes.find(c => c.name === className);
    return target ? target.action : 'none';
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

  addExample(classNameOrId, features) {
    let cls = this.classes.find(c => c.id === classNameOrId || c.name === classNameOrId);
    if (!cls) {
      cls = this.addClass(classNameOrId);
    }
    this.dataset.push({
      classId: cls.id,
      className: cls.name,
      features: Array.from(features)
    });
  }

  getExampleCount(idOrName) {
    return this.dataset.filter(d => d.classId === idOrName || d.className === idOrName).length;
  }

  clearClass(idOrName) {
    this.dataset = this.dataset.filter(d => d.classId !== idOrName && d.className !== idOrName);
    this._recheckTrainedState();
  }

  clearAll() {
    this.dataset = [];
    this.isTrained = false;
    this.modelInfo = null;
  }

  _recheckTrainedState() {
    const classesWithData = new Set(this.dataset.map(d => d.classId));
    if (classesWithData.size < 2) {
      this.isTrained = false;
      this.modelInfo = null;
    }
  }

  /**
   * Explicit Training Step (Compile Model)
   */
  train() {
    const classesWithData = new Set(this.dataset.map(d => d.classId));
    if (classesWithData.size < 2) {
      throw new Error('학습을 위해 서로 다른 클래스 2개 이상에 각각 샘플을 1개 이상 수집해 주세요.');
    }

    this.isTrained = true;
    this.modelInfo = {
      trainedAt: new Date().toLocaleTimeString(),
      sampleCount: this.dataset.length,
      classCount: classesWithData.size
    };
    return this.modelInfo;
  }

  // Feature weighting
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
   * Distance-Weighted k-NN Prediction
   */
  predict(features) {
    if (!this.isTrained || this.dataset.length === 0) {
      return { className: '학습 필요', confidence: 0, action: 'none' };
    }

    const distances = this.dataset.map(item => ({
      classId: item.classId,
      className: item.className,
      dist: this._distance(features, item.features)
    }));

    distances.sort((a, b) => a.dist - b.dist);

    if (distances[0].dist < 0.0001) {
      const act = this.getAction(distances[0].className);
      return { className: distances[0].className, confidence: 100, action: act };
    }

    const activeK = Math.min(this.k, distances.length);
    const kNearest = distances.slice(0, activeK);

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
    const action = this.getAction(topClass);
    return { className: topClass, confidence, action };
  }
}

if (typeof window !== 'undefined') {
  window.SensorPatternML = SensorPatternML;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SensorPatternML;
}
