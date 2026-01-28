// Singleton-style audio context creator.
// On iOS Safari, AudioContext must be created / resumed in response to a user gesture.

let audioContext = null;

export function getAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      throw new Error("Web Audio API is not supported in this browser.");
    }
    audioContext = new Ctor();
  }
  return audioContext;
}

export async function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Ignore; user will try again.
    }
  }
  return ctx;
}

