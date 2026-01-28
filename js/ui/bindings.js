// Attach DOM event listeners and translate them into state actions
// and scheduler operations.

import { elements } from "./dom.js";
import { actions, getState } from "../state.js";
import { clamp } from "../utils/clamp.js";

function computeTapTempoBpm(timestamps) {
  if (timestamps.length < 4) return null;
  const intervals = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }
  if (intervals.length < 3) return null;

  const sorted = [...intervals].sort((a, b) => a - b);
  const trimmed =
    sorted.length > 4 ? sorted.slice(1, sorted.length - 1) : sorted;
  const avgMs =
    trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length || 0;
  if (avgMs <= 0) return null;

  const bpm = 60_000 / avgMs;
  return clamp(Math.round(bpm), 40, 240);
}

function isTypingContext(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (!tag) return false;
  const name = tag.toLowerCase();
  return (
    name === "input" ||
    name === "textarea" ||
    name === "select" ||
    target.isContentEditable
  );
}

export function bindUI({ scheduler }) {
  /* Start / Stop */

  if (elements.startStopBtn) {
    elements.startStopBtn.addEventListener("click", async () => {
      await scheduler.ensureAudioReady();
      scheduler.toggle();
    });
  }

  // Spacebar toggles, unless focused in an input-like element.
  window.addEventListener("keydown", async (event) => {
    if (event.code !== "Space") return;
    if (isTypingContext(document.activeElement)) return;
    event.preventDefault();
    await scheduler.ensureAudioReady();
    scheduler.toggle();
  });

  /* BPM controls */

  if (elements.bpmSlider) {
    elements.bpmSlider.addEventListener("input", (e) => {
      actions.setBpm(Number(e.target.value));
    });
  }

  if (elements.bpmInput) {
    elements.bpmInput.addEventListener("change", (e) => {
      actions.setBpm(Number(e.target.value));
    });
    elements.bpmInput.addEventListener("blur", (e) => {
      actions.setBpm(Number(e.target.value));
    });
  }

  if (elements.bpmStepButtons.length) {
    elements.bpmStepButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = Number(btn.getAttribute("data-step"));
        actions.stepBpm(delta);
      });
    });
  }

  /* Time signature & subdivisions */

  if (elements.timeSignatureSelect) {
    elements.timeSignatureSelect.addEventListener("change", (e) => {
      actions.setTimeSignature(e.target.value);
    });
  }

  if (elements.subdivisionButtons.length) {
    elements.subdivisionButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-subdivision");
        if (!value) return;
        actions.setSubdivision(value);
      });
    });
  }

  if (elements.accentToggle) {
    elements.accentToggle.addEventListener("change", (e) => {
      actions.setAccentEnabled(e.target.checked);
    });
  }

  /* Tap tempo */

  if (elements.tapTempoBtn) {
    elements.tapTempoBtn.addEventListener("click", () => {
      const now = performance.now();
      const current = getState().tapTempo.timestamps;
      if (current.length > 0) {
        const last = current[current.length - 1];
        if (now - last > 2000) {
          actions.clearTaps();
        }
      }
      actions.recordTap(now);
      const stateAfter = getState();
      const bpm = computeTapTempoBpm(stateAfter.tapTempo.timestamps);
      if (bpm != null) {
        actions.setBpm(bpm);
      }
    });
  }

  /* Practice timer */

  if (elements.timerPresetSelect) {
    elements.timerPresetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (value === "custom") {
        const minutes = Number(elements.timerCustomMinutes?.value || "5") || 5;
        actions.setPracticeTimerCustom(minutes);
      } else {
        const seconds = Number(value);
        actions.setPracticeTimerPreset(seconds);
      }
    });
  }

  if (elements.timerCustomMinutes) {
    elements.timerCustomMinutes.addEventListener("change", (e) => {
      const minutes = clamp(Number(e.target.value) || 0, 1, 120);
      e.target.value = String(minutes);
      actions.setPracticeTimerCustom(minutes);
    });
  }

  /* Progressive overload */

  if (elements.overloadToggle) {
    elements.overloadToggle.addEventListener("change", (e) => {
      const enabled = e.target.checked;
      const snapshot = getState();
      scheduler.configureOverloadEnabled(enabled, snapshot);
      actions.configureOverload({ enabled });
    });
  }

  if (elements.overloadStepInput) {
    elements.overloadStepInput.addEventListener("change", (e) => {
      const step = clamp(Number(e.target.value) || 1, 1, 10);
      e.target.value = String(step);
      actions.configureOverload({ stepBpm: step });
    });
  }

  if (elements.overloadIntervalInput) {
    elements.overloadIntervalInput.addEventListener("change", (e) => {
      const interval = clamp(Number(e.target.value) || 30, 10, 300);
      e.target.value = String(interval);
      actions.configureOverload({ intervalSec: interval });
      scheduler.resetOverloadTimer();
    });
  }

  if (elements.overloadMaxBpmInput) {
    elements.overloadMaxBpmInput.addEventListener("change", (e) => {
      const max = clamp(Number(e.target.value) || 160, 40, 240);
      e.target.value = String(max);
      actions.configureOverload({ maxBpm: max });
    });
  }
}

