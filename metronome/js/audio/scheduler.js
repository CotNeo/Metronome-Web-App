// High-precision metronome scheduler built on top of the Web Audio clock.
// Uses a short lookahead timer to schedule clicks slightly ahead of time,
// avoiding the drift and jitter of a naive setInterval-based implementation.

const LOOKAHEAD_MS = 25; // How often we check for new notes to schedule
const SCHEDULE_AHEAD_SEC = 0.1; // How far ahead we schedule into the AudioContext timeline

function getSignatureConfig(signature) {
  switch (signature) {
    case "2/4":
      return { beatsPerBar: 2, dottedBeat: false };
    case "3/4":
      return { beatsPerBar: 3, dottedBeat: false };
    case "4/4":
      return { beatsPerBar: 4, dottedBeat: false };
    case "6/8":
      // In 6/8 we treat the "beat" as a dotted quarter (two beats per bar).
      return { beatsPerBar: 2, dottedBeat: true };
    default:
      return { beatsPerBar: 4, dottedBeat: false };
  }
}

function getSubdivisionFactor(subdivision) {
  switch (subdivision) {
    case "eighth":
      return 2;
    case "sixteenth":
      return 4;
    case "quarter":
    default:
      return 1;
  }
}

export class MetronomeScheduler {
  constructor({ audioContext, clickSynth, getState, onTick, onStart, onStop }) {
    this.audioContext = audioContext;
    this.clickSynth = clickSynth;
    this.getState = getState;
    this.onTick = onTick || (() => {});
    this.onStart = onStart || (() => {});
    this.onStop = onStop || (() => {});

    this.isRunning = false;
    this._timerId = null;
    this._nextNoteTime = 0;
    this._currentTickInBar = 0;
  }

  _computeTiming() {
    const state = this.getState();
    const bpm = state.bpm;
    const { beatsPerBar, dottedBeat } = getSignatureConfig(state.timeSignature);
    const subdivisionFactor = getSubdivisionFactor(state.subdivision);

    // Duration of one "beat" in seconds
    let secondsPerBeat = 60 / bpm;
    if (dottedBeat) {
      secondsPerBeat *= 1.5; // dotted quarter is 1.5x a quarter
    }

    // Subdivisions per beat: 1 = quarters (or dotted quarters for 6/8),
    // 2 = eighths, 4 = sixteenths.
    const secondsPerSubdivision = secondsPerBeat / subdivisionFactor;

    const ticksPerBar = beatsPerBar * subdivisionFactor;

    return {
      secondsPerSubdivision,
      beatsPerBar,
      ticksPerBar,
      subdivisionFactor
    };
  }

  _scheduleTick(time, timing) {
    const state = this.getState();
    const { ticksPerBar, subdivisionFactor, beatsPerBar } = timing;

    const tickIndex = this._currentTickInBar;
    const tickInBar = tickIndex % ticksPerBar;
    const beatIndex = Math.floor(tickInBar / subdivisionFactor); // 0-based
    const isSubdivisionPrimary = tickInBar % subdivisionFactor === 0;
    const isFirstBeat = beatIndex === 0 && isSubdivisionPrimary;

    const accentEnabled = state.accentEnabled;
    const isAccent = accentEnabled && isFirstBeat;

    this.clickSynth.scheduleClick(time, isAccent);

    const publicBeatIndex = beatIndex + 1; // 1-based
    this.onTick({
      barBeatIndex: publicBeatIndex,
      beatCountInBar: beatsPerBar,
      tickInBar,
      ticksPerBar,
      isAccent,
      isPrimarySubdivision: isSubdivisionPrimary
    });

    this._currentTickInBar = (this._currentTickInBar + 1) % ticksPerBar;
  }

  _schedulerLoop = () => {
    if (!this.isRunning) return;

    const ctxTime = this.audioContext.currentTime;
    const timing = this._computeTiming();

    while (this._nextNoteTime < ctxTime + SCHEDULE_AHEAD_SEC) {
      this._scheduleTick(this._nextNoteTime, timing);
      this._nextNoteTime += timing.secondsPerSubdivision;
    }
  };

  start() {
    if (this.isRunning) return;

    const ctxTime = this.audioContext.currentTime;
    const timing = this._computeTiming();

    this.isRunning = true;
    this._nextNoteTime = ctxTime + 0.1;
    this._currentTickInBar = 0;

    this.onStart();

    this._timerId = setInterval(() => {
      this._schedulerLoop();
    }, LOOKAHEAD_MS);

    // Schedule first batch right away
    this._schedulerLoop();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this.onStop();
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  isPlaying() {
    return this.isRunning;
  }
}

