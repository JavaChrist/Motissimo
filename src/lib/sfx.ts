let audio: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function tone(frequency: number, duration: number, type: OscillatorType, volume: number) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playTap() {
  tone(640, 0.05, "triangle", 0.07);
}

export function playSuccess() {
  tone(523, 0.09, "sine", 0.09);
  window.setTimeout(() => tone(784, 0.14, "sine", 0.09), 80);
}

export function playBonus() {
  tone(698, 0.08, "sine", 0.08);
  window.setTimeout(() => tone(880, 0.12, "sine", 0.08), 70);
}

export function playWrong() {
  tone(196, 0.16, "triangle", 0.05);
}

export function buzz(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}
