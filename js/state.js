// Simple centralized state store with subscribe/notify.
// State is plain data; side-effects happen in other modules.

import { clamp } from "./utils/clamp.js";
import { loadSettings, saveSettings } from "./utils/storage.js";

const DEFAULT_STATE = {
  bpm: 120,
  timeSignature: "4/4",
  subdivision: "quarter", // 'quarter' | 'eighth' | 'sixteenth'
  accentEnabled: true,
  isPlaying: false,
  currentBeat: 1,

  practiceTimer: {
    mode: "off", // 'off' | 'preset' | 'custom'
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false
  },

  overload: {
    enabled: false,
    stepBpm: 1,
    intervalSec: 30,
    maxBpm: 160,
    targetBpm: 120,
    lastIncrementAt: null
  },

  tapTempo: {
    timestamps: [] // ms
  }
};

let state = createInitialState();
const listeners = new Set();

function createInitialState() {
  const stored = loadSettings();
  if (!stored) return structuredClone(DEFAULT_STATE);

  // Merge stored settings into defaults to be resilient to schema changes.
  const merged = structuredClone(DEFAULT_STATE);
  try {
    Object.assign(merged, {
      bpm: clamp(Number(stored.bpm) || DEFAULT_STATE.bpm, 40, 240),
      timeSignature: stored.timeSignature || DEFAULT_STATE.timeSignature,
      subdivision: stored.subdivision || DEFAULT_STATE.subdivision,
      accentEnabled:
        typeof stored.accentEnabled === "boolean"
          ? stored.accentEnabled
          : DEFAULT_STATE.accentEnabled,
      overload: {
        ...merged.overload,
        ...(stored.overload || {})
      }
    });
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
  merged.overload.targetBpm = merged.bpm;
  return merged;
}

function persistSettings(current) {
  const snapshot = {
    bpm: current.bpm,
    timeSignature: current.timeSignature,
    subdivision: current.subdivision,
    accentEnabled: current.accentEnabled,
    overload: {
      enabled: current.overload.enabled,
      stepBpm: current.overload.stepBpm,
      intervalSec: current.overload.intervalSec,
      maxBpm: current.overload.maxBpm,
      targetBpm: current.overload.targetBpm
    }
  };
  saveSettings(snapshot);
}

function notify() {
  const snapshot = getState();
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(getState());
  return () => listeners.delete(fn);
}

export function getState() {
  return structuredClone(state);
}

function setState(mutator) {
  const next = getState();
  mutator(next);
  state = next;
  persistSettings(state);
  notify();
}

/* Public state operations */

export const actions = {
  setBpm(newBpm) {
    setState((draft) => {
      const bpm = clamp(Number(newBpm) || DEFAULT_STATE.bpm, 40, 240);
      draft.bpm = bpm;
      draft.overload.targetBpm = Math.min(
        draft.overload.maxBpm,
        Math.max(bpm, draft.overload.targetBpm || bpm)
      );
    });
  },

  stepBpm(delta) {
    const { bpm } = getState();
    this.setBpm(bpm + Number(delta));
  },

  setTimeSignature(sig) {
    setState((draft) => {
      draft.timeSignature = sig;
      draft.currentBeat = 1;
    });
  },

  setSubdivision(subdiv) {
    setState((draft) => {
      draft.subdivision = subdiv;
    });
  },

  setAccentEnabled(enabled) {
    setState((draft) => {
      draft.accentEnabled = !!enabled;
    });
  },

  setPlaying(isPlaying) {
    setState((draft) => {
      draft.isPlaying = !!isPlaying;
      if (!draft.isPlaying && draft.practiceTimer) {
        draft.practiceTimer.isRunning = false;
      } else if (draft.isPlaying && draft.practiceTimer.totalSeconds > 0) {
        draft.practiceTimer.isRunning = true;
      }
    });
  },

  setCurrentBeat(beatIndex) {
    setState((draft) => {
      draft.currentBeat = beatIndex;
    });
  },

  setPracticeTimerPreset(seconds) {
    setState((draft) => {
      const s = draft.practiceTimer;
      if (seconds <= 0) {
        s.mode = "off";
        s.totalSeconds = 0;
        s.remainingSeconds = 0;
        s.isRunning = false;
      } else {
        s.mode = "preset";
        s.totalSeconds = seconds;
        s.remainingSeconds = seconds;
        s.isRunning = draft.isPlaying;
      }
    });
  },

  setPracticeTimerCustom(minutes) {
    const secs = Math.max(0, Math.round(minutes * 60));
    setState((draft) => {
      const s = draft.practiceTimer;
      if (secs <= 0) {
        s.mode = "off";
        s.totalSeconds = 0;
        s.remainingSeconds = 0;
        s.isRunning = false;
      } else {
        s.mode = "custom";
        s.totalSeconds = secs;
        s.remainingSeconds = secs;
        s.isRunning = draft.isPlaying;
      }
    });
  },

  tickPracticeTimer(deltaSec) {
    setState((draft) => {
      const t = draft.practiceTimer;
      if (!t.isRunning || t.totalSeconds <= 0) return;
      t.remainingSeconds = Math.max(0, t.remainingSeconds - deltaSec);
      if (t.remainingSeconds <= 0) {
        t.isRunning = false;
        draft.isPlaying = false;
      }
    });
  },

  configureOverload({ enabled, stepBpm, intervalSec, maxBpm }) {
    setState((draft) => {
      if (typeof enabled === "boolean") {
        draft.overload.enabled = enabled;
      }
      if (typeof stepBpm === "number" && stepBpm > 0) {
        draft.overload.stepBpm = stepBpm;
      }
      if (typeof intervalSec === "number" && intervalSec > 0) {
        draft.overload.intervalSec = intervalSec;
      }
      if (typeof maxBpm === "number") {
        draft.overload.maxBpm = clamp(maxBpm, 40, 240);
      }
      // Keep targetBpm coherent.
      draft.overload.targetBpm = clamp(
        draft.overload.targetBpm || draft.bpm,
        draft.bpm,
        draft.overload.maxBpm
      );
    });
  },

  updateOverloadTarget(targetBpm) {
    setState((draft) => {
      draft.overload.targetBpm = clamp(targetBpm, 40, draft.overload.maxBpm);
    });
  },

  recordTap(timestampMs) {
    setState((draft) => {
      const taps = draft.tapTempo.timestamps;
      taps.push(timestampMs);
      while (taps.length > 12) taps.shift();
    });
  },

  clearTaps() {
    setState((draft) => {
      draft.tapTempo.timestamps = [];
    });
  }
};

