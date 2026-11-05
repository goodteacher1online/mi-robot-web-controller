/**
 * Interactive 36-Key Multi-Octave Grand Piano & Rhythmic Audio Engine
 * Pure concert-pitch acoustic synthesis + rhythmic note sequencing
 */

class MiPianoEngine {
  constructor() {
    this.AudioCtx = (typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null);
    this.ctx = null;
    this.isUnlocked = false;
    this.sustain = false;
    this._stopMelodyFlag = false;
    this.isPlaying = false;

    // 36 Note Map (3 Octaves: C3 to B5, exact chromatic concert pitch)
    this.notes = [
      // Octave 3 (낮은 음역)
      { id: 1,  name: 'C3',  kor: '낮은 도', freq: 130.81, isSharp: false },
      { id: 2,  name: 'C#3', kor: '낮은 도#',freq: 138.59, isSharp: true },
      { id: 3,  name: 'D3',  kor: '낮은 레', freq: 146.83, isSharp: false },
      { id: 4,  name: 'D#3', kor: '낮은 레#',freq: 154.34, isSharp: true },
      { id: 5,  name: 'E3',  kor: '낮은 미', freq: 164.81, isSharp: false },
      { id: 6,  name: 'F3',  kor: '낮은 파', freq: 174.61, isSharp: false },
      { id: 7,  name: 'F#3', kor: '낮은 파#',freq: 185.00, isSharp: true },
      { id: 8,  name: 'G3',  kor: '낮은 솔', freq: 196.00, isSharp: false },
      { id: 9,  name: 'G#3', kor: '낮은 솔#',freq: 207.65, isSharp: true },
      { id: 10, name: 'A3',  kor: '낮은 라', freq: 220.00, isSharp: false },
      { id: 11, name: 'A#3', kor: '낮은 라#',freq: 233.08, isSharp: true },
      { id: 12, name: 'B3',  kor: '낮은 시', freq: 246.94, isSharp: false },

      // Octave 4 (가온 음역)
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

      // Octave 5 (높은 음역)
      { id: 25, name: 'C5',  kor: '높은 도', freq: 523.25, isSharp: false, key: 'k' },
      { id: 26, name: 'C#5', kor: '높은 도#',freq: 554.37, isSharp: true,  key: 'o' },
      { id: 27, name: 'D5',  kor: '높은 레', freq: 587.33, isSharp: false, key: 'l' },
      { id: 28, name: 'D#5', kor: '높은 레#',freq: 622.25, isSharp: true,  key: 'p' },
      { id: 29, name: 'E5',  kor: '높은 미', freq: 659.25, isSharp: false, key: ';' },
      { id: 30, name: 'F5',  kor: '높은 파', freq: 698.46, isSharp: false },
      { id: 31, name: 'F#5', kor: '높은 파#',freq: 739.99, isSharp: true },
      { id: 32, name: 'G5',  kor: '높은 솔', freq: 783.99, isSharp: false },
      { id: 33, name: 'G#5', kor: '높은 솔#',freq: 830.61, isSharp: true },
      { id: 34, name: 'A5',  kor: '높은 라', freq: 880.00, isSharp: false },
      { id: 35, name: 'A#5', kor: '높은 라#',freq: 932.33, isSharp: true },
      { id: 36, name: 'B5',  kor: '높은 시', freq: 987.77, isSharp: false }
    ];

    // Masterpieces / Children's Song Presets with Real Rhythmic Beats
    this.songs = {
      school: {
        title: '학교종이 땡땡땡',
        tempo: 280,
        score: [
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 22, beats: 1 }, { note: 22, beats: 1 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 17, beats: 2 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 1 },
          { note: 15, beats: 3 }, { note: 0, beats: 1 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 22, beats: 1 }, { note: 22, beats: 1 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 17, beats: 2 },
          { note: 20, beats: 1 }, { note: 17, beats: 1 }, { note: 15, beats: 1 }, { note: 17, beats: 1 },
          { note: 13, beats: 3 }
        ]
      },
      airplane: {
        title: '비행기',
        tempo: 260,
        score: [
          { note: 17, beats: 1 }, { note: 15, beats: 1 }, { note: 13, beats: 1 }, { note: 15, beats: 1 },
          { note: 17, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 2 },
          { note: 15, beats: 1 }, { note: 15, beats: 1 }, { note: 15, beats: 2 },
          { note: 17, beats: 1 }, { note: 20, beats: 1 }, { note: 20, beats: 2 },
          { note: 17, beats: 1 }, { note: 15, beats: 1 }, { note: 13, beats: 1 }, { note: 15, beats: 1 },
          { note: 17, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 2 },
          { note: 15, beats: 1 }, { note: 15, beats: 1 }, { note: 17, beats: 1 }, { note: 15, beats: 1 },
          { note: 13, beats: 3 }
        ]
      },
      butterfly: {
        title: '나비야',
        tempo: 280,
        score: [
          { note: 20, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 2 },
          { note: 18, beats: 1 }, { note: 15, beats: 1 }, { note: 15, beats: 2 },
          { note: 13, beats: 1 }, { note: 15, beats: 1 }, { note: 17, beats: 1 }, { note: 18, beats: 1 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 20, beats: 2 },
          { note: 20, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 1 },
          { note: 18, beats: 1 }, { note: 15, beats: 1 }, { note: 15, beats: 1 }, { note: 15, beats: 1 },
          { note: 13, beats: 1 }, { note: 17, beats: 1 }, { note: 20, beats: 1 }, { note: 20, beats: 1 },
          { note: 17, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 2 }
        ]
      },
      star: {
        title: '작은 별',
        tempo: 280,
        score: [
          { note: 13, beats: 1 }, { note: 13, beats: 1 }, { note: 20, beats: 1 }, { note: 20, beats: 1 },
          { note: 22, beats: 1 }, { note: 22, beats: 1 }, { note: 20, beats: 2 },
          { note: 18, beats: 1 }, { note: 18, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 1 },
          { note: 15, beats: 1 }, { note: 15, beats: 1 }, { note: 13, beats: 2 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 18, beats: 1 }, { note: 18, beats: 1 },
          { note: 17, beats: 1 }, { note: 17, beats: 1 }, { note: 15, beats: 2 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 18, beats: 1 }, { note: 18, beats: 1 },
          { note: 17, beats: 1 }, { note: 17, beats: 1 }, { note: 15, beats: 2 },
          { note: 13, beats: 1 }, { note: 13, beats: 1 }, { note: 20, beats: 1 }, { note: 20, beats: 1 },
          { note: 22, beats: 1 }, { note: 22, beats: 1 }, { note: 20, beats: 2 },
          { note: 18, beats: 1 }, { note: 18, beats: 1 }, { note: 17, beats: 1 }, { note: 17, beats: 1 },
          { note: 15, beats: 1 }, { note: 15, beats: 1 }, { note: 13, beats: 3 }
        ]
      },
      bears: {
        title: '곰 세 마리',
        tempo: 260,
        score: [
          { note: 13, beats: 1 }, { note: 13, beats: 1 }, { note: 13, beats: 1 }, { note: 13, beats: 1 }, { note: 13, beats: 2 },
          { note: 17, beats: 1 }, { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 17, beats: 1 }, { note: 13, beats: 2 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 17, beats: 1 },
          { note: 20, beats: 1 }, { note: 20, beats: 1 }, { note: 17, beats: 1 },
          { note: 13, beats: 1 }, { note: 13, beats: 1 }, { note: 13, beats: 3 }
        ]
      }
    };

    // Keep backwards compatible flat notes list for each song
    for (const [k, s] of Object.entries(this.songs)) {
      s.notes = s.score.map(item => item.note).filter(n => n > 0);
    }
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

  setSustain(enabled) {
    this.sustain = !!enabled;
  }

  /**
   * Play Note by 1-based ID (1..36)
   */
  playNote(id, beats = 1) {
    this.unlockAudio();
    const note = this.notes.find(n => n.id === id);
    if (!note) return;
    this.playSynth(note.freq, beats);
  }

  /**
   * High-Fidelity Polyphonic Grand Piano Acoustic Synthesizer
   * Harmonic overtone stack + dynamic lowpass hammer-strike envelope + ADSR release
   */
  playSynth(freq, beats = 1) {
    this.unlockAudio();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = this.sustain ? 2.5 : Math.max(0.7, beats * 0.55);

      // 1. Fundamental Oscillator (Triangle)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      // 2. Overtone 1: Second harmonic (Sine, 2x)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      // 3. Overtone 2: Third harmonic (Sine, 3x)
      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3, now);

      // Gain Envelopes
      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(0.65, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + (duration * 0.7));

      const gain3 = this.ctx.createGain();
      gain3.gain.setValueAtTime(0.0001, now);
      gain3.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + (duration * 0.45));

      // Warm Acoustic Piano Hammer Lowpass Filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(freq * 6.5, 7500), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.4, 250), now + duration);

      osc1.connect(gain1);
      osc2.connect(gain2);
      osc3.connect(gain3);

      gain1.connect(filter);
      gain2.connect(filter);
      gain3.connect(filter);

      filter.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      osc1.stop(now + duration);
      osc2.stop(now + duration);
      osc3.stop(now + duration);
    } catch (e) {
      console.warn('Piano synth error:', e);
    }
  }

  stopSong() {
    this._songSessionId = (this._songSessionId || 0) + 1;
    this._stopMelodyFlag = true;
    this.isPlaying = false;
  }

  stopMelody() {
    this.stopSong();
  }

  /**
   * Play Song with authentic rhythmic note timings and key highlight events
   * Immediately stops any currently playing song before starting
   */
  async playSong(songKey, onNotePlayed = null) {
    this.stopSong(); // Stop any active song immediately!
    const currentSession = this._songSessionId;

    const song = this.songs[songKey];
    if (!song) return;

    this.unlockAudio();
    this._stopMelodyFlag = false;
    this.isPlaying = true;

    for (const item of song.score) {
      if (this._songSessionId !== currentSession || this._stopMelodyFlag) break;
      const noteId = item.note;
      const beats = item.beats || 1;
      const noteDuration = beats * song.tempo;

      if (noteId > 0) {
        this.playNote(noteId, beats);
        if (typeof onNotePlayed === 'function') {
          onNotePlayed(noteId, noteDuration);
        }
      }
      await new Promise(r => setTimeout(r, noteDuration));
      if (this._songSessionId !== currentSession || this._stopMelodyFlag) break;
    }

    if (this._songSessionId === currentSession) {
      this.isPlaying = false;
    }
  }

  /**
   * Backwards-compatible playMelody
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
