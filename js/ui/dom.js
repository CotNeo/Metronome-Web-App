// Central place to query and cache DOM elements used throughout the app.

export const elements = {
  startStopBtn: document.getElementById("startStopBtn"),
  tapTempoBtn: document.getElementById("tapTempoBtn"),

  bpmSlider: document.getElementById("bpmSlider"),
  bpmInput: document.getElementById("bpmInput"),
  bpmDisplay: document.getElementById("bpmDisplay"),

  timeSignatureSelect: document.getElementById("timeSignatureSelect"),
  subdivisionButtons: Array.from(
    document.querySelectorAll(".segmented-option[data-subdivision]")
  ),
  accentToggle: document.getElementById("accentToggle"),

  timerPresetSelect: document.getElementById("timerPresetSelect"),
  timerCustomMinutes: document.getElementById("timerCustomMinutes"),
  timerDisplay: document.getElementById("timerDisplay"),

  overloadToggle: document.getElementById("overloadToggle"),
  overloadStepInput: document.getElementById("overloadStepInput"),
  overloadIntervalInput: document.getElementById("overloadIntervalInput"),
  overloadMaxBpmInput: document.getElementById("overloadMaxBpmInput"),
  overloadTargetDisplay: document.getElementById("overloadTargetDisplay"),

  bpmStepButtons: Array.from(document.querySelectorAll(".bpm-step")),

  metronomeFigure: document.querySelector(".metronome-figure"),
  beatPills: Array.from(document.querySelectorAll(".beat-pill")),

  bpmAriaLive: document.getElementById("bpmAriaLive")
};

