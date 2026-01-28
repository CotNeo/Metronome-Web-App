// Pure-ish render module: reads current state and updates the DOM.
// No direct event listener wiring or side-effectful logic other than DOM manipulation.

import { elements } from "./dom.js";

let swingLeft = false;

function formatTimer(seconds) {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function render(state) {
  renderTempo(state);
  renderMeter(state);
  renderTimer(state);
  renderOverload(state);
  renderBeatPills(state);
}

function renderTempo(state) {
  const { bpm } = state;
  if (elements.bpmDisplay) {
    elements.bpmDisplay.textContent = String(bpm);
  }
  if (elements.bpmSlider) {
    elements.bpmSlider.value = String(bpm);
  }
  if (elements.bpmInput && document.activeElement !== elements.bpmInput) {
    elements.bpmInput.value = String(bpm);
  }

  if (elements.bpmAriaLive) {
    elements.bpmAriaLive.textContent = `Tempo ${bpm} beats per minute.`;
  }

  if (elements.startStopBtn) {
    elements.startStopBtn.textContent = state.isPlaying ? "Stop" : "Start";
    elements.startStopBtn.setAttribute("aria-pressed", state.isPlaying ? "true" : "false");
  }
}

function renderMeter(state) {
  if (elements.timeSignatureSelect) {
    elements.timeSignatureSelect.value = state.timeSignature;
  }

  if (elements.accentToggle) {
    elements.accentToggle.checked = state.accentEnabled;
    elements.accentToggle.setAttribute(
      "aria-checked",
      state.accentEnabled ? "true" : "false"
    );
  }

  if (elements.subdivisionButtons.length) {
    elements.subdivisionButtons.forEach((btn) => {
      const value = btn.getAttribute("data-subdivision");
      const isActive = value === state.subdivision;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", isActive ? "true" : "false");
    });
  }
}

function renderTimer(state) {
  const timer = state.practiceTimer;
  if (!timer) return;

  if (elements.timerPresetSelect) {
    if (timer.mode === "preset") {
      elements.timerPresetSelect.value = String(timer.totalSeconds);
    } else if (timer.mode === "off") {
      elements.timerPresetSelect.value = "0";
    } else {
      elements.timerPresetSelect.value = "custom";
    }
  }

  if (elements.timerCustomMinutes) {
    if (timer.mode === "custom") {
      const minutes = Math.round(timer.totalSeconds / 60);
      elements.timerCustomMinutes.value = String(minutes);
    } else if (timer.mode === "off") {
      elements.timerCustomMinutes.value = "";
    }
  }

  if (elements.timerDisplay) {
    elements.timerDisplay.textContent = formatTimer(timer.remainingSeconds);
  }
}

function renderOverload(state) {
  const o = state.overload;
  if (!o) return;

  if (elements.overloadToggle) {
    elements.overloadToggle.checked = o.enabled;
    elements.overloadToggle.setAttribute("aria-checked", o.enabled ? "true" : "false");
  }

  if (elements.overloadStepInput && document.activeElement !== elements.overloadStepInput) {
    elements.overloadStepInput.value = String(o.stepBpm);
  }

  if (
    elements.overloadIntervalInput &&
    document.activeElement !== elements.overloadIntervalInput
  ) {
    elements.overloadIntervalInput.value = String(o.intervalSec);
  }

  if (
    elements.overloadMaxBpmInput &&
    document.activeElement !== elements.overloadMaxBpmInput
  ) {
    elements.overloadMaxBpmInput.value = String(o.maxBpm);
  }

  if (elements.overloadTargetDisplay) {
    elements.overloadTargetDisplay.textContent = String(o.targetBpm);
  }
}

function getBeatsPerBar(signature) {
  switch (signature) {
    case "2/4":
      return 2;
    case "3/4":
      return 3;
    case "6/8":
      // Visually show 2 beats for 6/8 (dotted quarters).
      return 2;
    case "4/4":
    default:
      return 4;
  }
}

function renderBeatPills(state) {
  const beatsPerBar = getBeatsPerBar(state.timeSignature);
  if (!elements.beatPills.length) return;

  elements.beatPills.forEach((pill, index) => {
    const beatIndex = index + 1;
    if (beatIndex <= beatsPerBar) {
      pill.style.display = "";
    } else {
      pill.style.display = "none";
    }
    pill.textContent = String(beatIndex);
    pill.classList.toggle("is-active", beatIndex === state.currentBeat);
  });
}

/**
 * Called by main when a tick occurs, to animate visual elements.
 */
export function renderTickVisual({ barBeatIndex, isAccent, isPrimarySubdivision }) {
  if (elements.metronomeFigure && isPrimarySubdivision) {
    // Toggle direction each primary beat for a natural swinging motion.
    swingLeft = !swingLeft;
    elements.metronomeFigure.classList.toggle("is-swing-left", swingLeft);
    elements.metronomeFigure.classList.toggle("is-swing-right", !swingLeft);
  }

  if (elements.beatPills.length && isPrimarySubdivision) {
    elements.beatPills.forEach((pill) => pill.classList.remove("is-active"));
    const target = elements.beatPills.find(
      (pill) => Number(pill.getAttribute("data-beat-index")) === barBeatIndex
    );
    if (target) {
      target.classList.add("is-active");
    }
  }
}

