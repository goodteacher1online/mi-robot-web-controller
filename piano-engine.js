/**
 * Interactive 36-Key Piano & Audio Engine
 * Uses extracted WAV files from APK with Web Audio Synthesizer fallback
 */

class MiPianoEngine {
  constructor() {
    this.AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = null;
    this.audioPool = {};
    this.isUnlocked = false;
    this.sustain = false;
    this._stopMelodyFlag = false;
    this.isPlaying = false;

    // Song Presets
    this.songs = {
      school: {
        title: '학교종이 땡땡땡',
        tempo: 300,
        notes: [20, 20, 22, 22, 20, 20, 17, 20, 20, 17, 17, 15]
      },
      airplane: {
        title: '비행기',
        tempo: 280,
        notes: [17, 15, 13, 15, 17, 17, 17, 15, 15, 15, 17, 20, 20, 17, 15, 13, 15, 17, 17, 17, 15, 15, 17, 15, 13]
      },
      butterfly: {
        title: '나비야',
        tempo: 320,
        notes: [20, 17, 17, 18, 15, 15, 13, 15, 17, 18, 20, 20, 20, 20, 17, 17, 18, 15, 15, 13, 17, 20, 20, 17]
      },
      star: {
        title: '작은 별',
        tempo: 340,
        notes: [13, 13, 20, 20, 22, 22, 20, 18, 18, 17, 17, 15, 15, 13]
      }
    };

    // 36 Note Map (3 Octaves: C3 to B5)
    this.notes = [
      { id: 1,  name: 'C3',  kor: '낮은 도', freq: 130.81, isSharp: false },
      { id: 2,  name: 'C#3', kor: '도#',    freq: 138.59, isSharp: true },
      { id: 3,  name: 'D3',  kor: '낮은 레', freq: 146.83, isSharp: false },
      { id: 4,  name: 'D#3', kor: '레#',    freq: 154.34, isSharp: true },
      { id: 5,  name: 'E3',  kor: '낮은 미', freq: 164.81, isSharp: false },
      { id: 6,  name: 'F3',  kor: '낮은 파', freq: 174.61, isSharp: false },
      { id: 7,  name: 'F#3', kor: '파#',    freq: 185.00, isSharp: true },
      { id: 8,  name: 'G3',  kor: '낮은 솔', freq: 196.00, isSharp: false },
      { id: 9,  name: 'G#3', kor: '솔#',    freq: 207.65, isSharp: true },
      { id: 10, name: 'A3',  kor: '낮은 라', freq: 220.00, isSharp: false },
      { id: 11, name: 'A#3', kor: '라#',    freq: 233.08, isSharp: true },
      { id: 12, name: 'B3',  kor: '낮은 시', freq: 246.94, isSharp: false },

      { id: 13, name: 'C4',  kor: '도',     freq: 261.63, isSharp: false, key: 'a' },
      { id: 14, name: 'C#4', kor: '도#',    freq: 277.18, isSharp: true,  key: 'w' },
      { id: 15, name: 'D4',  kor: '레',     freq: 293.66, isSharp: false, key: 's' },
      { id: 16, name: 'D#4', kor: '레#',    freq: 311.13, isSharp: true,  key: 'e' },
      { id: 17, name: 'E4',  kor: '미',     freq: 329.63, isSharp: false, key: 'd' },
      { id: 18, name: 'F4',  kor: '파',     freq: 349.23, isSharp: false, key: 'f' },
      { id: 19, name: 'F#4', kor: '파#',    freq: 369.99, isSharp: true,  key: 't' },
      { id: 20, name: 'G4',  kor: '솔',     freq: 392.00, isSharp: false, key: 'g' },
      { id: 21, name: 'G#4', kor: '솔#',    freq: 415.30, isSharp: true,  key: 'y' },
      { id: 22, name: 'A4',  kor: '라',     freq: 440.00, isSharp: false, key: 'h' },
      { id: 23, name: 'A#4', kor: '라#',    freq: 466.16, isSharp: true,  key: 'u' },
      { id: 24, name: 'B4',  kor: '시',     freq: 493.88, isSharp: false, key: 'j' },

      { id: 25, name: 'C5',  kor: '높은 도', freq: 523.25, isSharp: false, key: 'k' },
      { id: 26, name: 'C#5', kor: '도#',    freq: 554.37, isSharp: true,  key: 'o' },
      { id: 27, name: 'D5',  kor: '높은 레', freq: 587.33, isSharp: false, key: 'l' },
      { id: 28, name: 'D#5', kor: '레#',    freq: 622.25, isSharp: true,  key: 'p' },
      { id: 29, name: 'E5',  kor: '높은 미', freq: 659.25, isSharp: false, key: ';' },
      { id: 30, name: 'F5',  kor: '높은 파', freq: 698.46, isSharp: false },
      { id: 31, name: 'F#5', kor: '파#',    freq: 739.99, isSharp: true },
      { id: 32, name: 'G5',  kor: '높은 솔', freq: 783.99, isSharp: false },
      { id: 33, name: 'G#5', kor: '솔#',    freq: 830.61, isSharp: true },
      { id: 34, name: 'A5',  kor: '높은 라', freq: 880.00, isSharp: false },
      { id: 35, name: 'A#5', kor: '라#',    freq: 932.33, isSharp: true },
      { id: 36, name: 'B5',  kor: '높은 시', freq: 987.77, isSharp: false }
    ];
  }

  unlockAudio() {
    if (this.isUnlocked) return;
    if (!this.ctx && this.AudioCtx) {
      this.ctx = new this.AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isUnlocked = true;
  }

  /**
   * Play Note by 1-based ID (1..36)
   */
  playNote(id) {
    this.unlockAudio();

    const note = this.notes.find(n => n.id === id);
    if (!note) return;

    try {
      const audio = new Audio(`./audio/piano${id}.wav`);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.playSynth(note.freq);
        });
      }
    } catch (e) {
      this.playSynth(note.freq);
    }
  }

  setSustain(enabled) {
    this.sustain = !!enabled;
  }

  playSynth(freq) {
    this.unlockAudio();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const duration = this.sustain ? 2.2 : 1.2;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.7, this.ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Synth error:', e);
    }
  }

  stopMelody() {
    this._stopMelodyFlag = true;
    this.isPlaying = false;
  }

  /**
   * Auto melody sequencer (Demo songs)
   */
  async playMelody(notesArr, intervalMs = 280, onNotePlayed = null) {
    this.unlockAudio();
    this._stopMelodyFlag = false;
    this.isPlaying = true;

    for (const noteId of notesArr) {
      if (this._stopMelodyFlag) break;
      this.playNote(noteId);
      if (typeof onNotePlayed === 'function') {
        onNotePlayed(noteId);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }

    this.isPlaying = false;
  }
}

// Export under both names to guarantee compatibility
if (typeof window !== 'undefined') {
  window.PianoEngine = MiPianoEngine;
  window.MiPianoEngine = MiPianoEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MiPianoEngine;
}
