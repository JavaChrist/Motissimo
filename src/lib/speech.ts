let frenchVoice: SpeechSynthesisVoice | null = null;
let primed = false;

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

function appleTouch() {
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function rememberVoices() {
  const synth = synthesis();
  if (!synth) return;
  const voices = synth.getVoices();
  frenchVoice =
    voices.find((voice) => voice.lang.toLowerCase().startsWith("fr")) ?? null;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  rememberVoices();
  window.speechSynthesis.addEventListener("voiceschanged", rememberVoices);
}

function utterance(word: string, volume = 1) {
  const phrase = new SpeechSynthesisUtterance(word.toLowerCase());
  phrase.lang = frenchVoice?.lang ?? "fr-FR";
  phrase.rate = 0.92;
  phrase.volume = volume;
  if (frenchVoice) phrase.voice = frenchVoice;
  return phrase;
}

/** À appeler pendant un toucher : sinon le téléphone refuse de parler ensuite. */
export function primeSpeech() {
  const synth = synthesis();
  if (!synth || primed) return;
  primed = true;
  rememberVoices();
  synth.resume();
  const warm = utterance("a", 0);
  warm.rate = 2;
  synth.speak(warm);
}

export function speakWord(word: string) {
  const synth = synthesis();
  if (!synth || word.length === 0) return;
  rememberVoices();
  const phrase = utterance(word);
  synth.resume();

  if (appleTouch()) {
    synth.speak(phrase);
    return;
  }

  const mobile = /Android|Mobile/i.test(navigator.userAgent);
  synth.cancel();
  if (!mobile) {
    synth.speak(phrase);
    return;
  }
  window.setTimeout(() => {
    synth.resume();
    synth.speak(phrase);
  }, 60);
}
