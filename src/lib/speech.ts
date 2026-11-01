export function speakWord(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis || word.length === 0) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
  utterance.lang = "fr-FR";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}
