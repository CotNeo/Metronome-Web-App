// Application entrypoint. Wires together state, audio scheduler, UI bindings, and render loop.

import { getAudioContext, resumeAudioContext } from "./audio/audioContext.js";
import { ClickSynth } from "./audio/clickSynth.js";
import { MetronomeScheduler } from "./audio/scheduler.js";
import { actions, subscribe, getState } from "./state.js";
import { bindUI } from "./ui/bindings.js";
import { render, renderTickVisual } from "./ui/render.js";
import { rafThrottle } from "./utils/rafThrottle.js";

class AppSchedulerController {
  constructor() {
    this.audioContext = null;
    this.clickSynth = null;
    this.scheduler = null;

    this._overloadTimerId = null;
    this._lastTimerTickAt = performance.now();
  }

  async ensureAudioReady() {
    if (!this.audioContext) {
      this.audioContext = await resumeAudioContext();
      this.clickSynth = new ClickSynth(this.audioContext);
      this.scheduler = new MetronomeScheduler({
        audioContext: this.audioContext,
        clickSynth: this.clickSynth,
        getState,
        onTick: (tickInfo) => {
          this.handleTick(tickInfo);
        },
        onStart: () => {
          actions.setPlaying(true);
          this._startTimerLoop();
          this._setupOverloadTimer();
        },
        onStop: () => {
          actions.setPlaying(false);
          this._clearOverloadTimer();
        }
      });
    }
    await resumeAudioContext();
  }

  toggle() {
    if (!this.scheduler) {
      return;
    }
    this.scheduler.toggle();
  }

  handleTick(tickInfo) {
    const beat = tickInfo.barBeatIndex;
    actions.setCurrentBeat(beat);
    renderTickVisual(tickInfo);
  }

  /* Practice timer + overload are driven by a lightweight rAF + Date loop */

  _startTimerLoop() {
    this._lastTimerTickAt = performance.now();
    const loop = () => {
      const now = performance.now();
      const deltaSec = (now - this._lastTimerTickAt) / 1000;
      this._lastTimerTickAt = now;

      const state = getState();

      if (state.practiceTimer.isRunning) {
        actions.tickPracticeTimer(deltaSec);
        const updated = getState();
        if (!updated.practiceTimer.isRunning && updated.isPlaying) {
          // Timer expired; stop the metronome.
          this.scheduler.stop();
        }
      }

      if (this.scheduler && this.scheduler.isPlaying()) {
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(loop);
  }

  _setupOverloadTimer() {
    this._clearOverloadTimer();
    const state = getState();
    if (!state.overload.enabled) return;

    const tick = () => {
      const s = getState();
      if (!s.isPlaying || !s.overload.enabled) {
        this._clearOverloadTimer();
        return;
      }

      const nextTarget = Math.min(
        s.overload.maxBpm,
        s.overload.targetBpm + s.overload.stepBpm
      );
      if (nextTarget <= s.bpm) {
        // Ensure target always at or above actual BPM.
        actions.updateOverloadTarget(s.bpm);
      } else {
        actions.updateOverloadTarget(nextTarget);
        actions.setBpm(nextTarget);
      }

      const snapshot = getState();
      if (snapshot.bpm >= snapshot.overload.maxBpm) {
        this._clearOverloadTimer();
        return;
      }

      const intervalMs = snapshot.overload.intervalSec * 1000;
      this._overloadTimerId = window.setTimeout(tick, intervalMs);
    };

    const intervalMs = state.overload.intervalSec * 1000;
    this._overloadTimerId = window.setTimeout(tick, intervalMs);
  }

  _clearOverloadTimer() {
    if (this._overloadTimerId != null) {
      clearTimeout(this._overloadTimerId);
      this._overloadTimerId = null;
    }
  }

  configureOverloadEnabled(enabled, snapshot) {
    if (enabled && snapshot.isPlaying) {
      this._setupOverloadTimer();
    } else {
      this._clearOverloadTimer();
    }
  }

  resetOverloadTimer() {
    const snapshot = getState();
    if (snapshot.overload.enabled && snapshot.isPlaying) {
      this._setupOverloadTimer();
    }
  }
}

/* Bootstrapping */

const appScheduler = new AppSchedulerController();

// Render on state changes, throttled to next animation frame to avoid layout thrash.
const throttledRender = rafThrottle((state) => {
  render(state);
});

subscribe(throttledRender);
bindUI({ scheduler: appScheduler });

// Expose a tiny, explicit debug handle.
window.__app = {
  getState,
  actions,
  scheduler: appScheduler,
  audio: () => getAudioContext()
};

