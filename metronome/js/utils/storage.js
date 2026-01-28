// Small, defensive wrapper around localStorage access.
// All methods fail silently if storage is unavailable (e.g., in private mode).

const STORAGE_KEY = "metronome-settings-v1";

export function loadSettings() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const serialized = JSON.stringify(settings);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Intentionally swallow storage errors; app should keep working.
  }
}

