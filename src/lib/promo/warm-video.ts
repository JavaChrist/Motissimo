/**
 * Vidéo de promotion préparée pendant la partie. Safari (iPhone) n'autorise le son d'une vidéo que si
 * l'élément a été lancé au moins une fois par un toucher de l'utilisateur : au premier toucher du jeu,
 * on lance donc l'élément en muet puis on le met en pause. La promo réutilise ensuite ce même élément
 * et démarre avec le son, sans aucune action de l'utilisateur.
 */
let video: HTMLVideoElement | null = null;
let primed = false;

function prime() {
  if (!video || primed) return;
  primed = true;
  const target = video;
  target.muted = true;
  target.play().then(
    () => {
      target.pause();
      target.currentTime = 0;
    },
    () => {
      primed = false;
    }
  );
}

if (typeof document !== "undefined") {
  for (const type of ["touchend", "click"] as const) {
    document.addEventListener(type, prime, { capture: true, passive: true });
  }
}

export function prepareVideo(url: string) {
  if (typeof document === "undefined") return;
  const element = document.createElement("video");
  element.preload = "auto";
  element.playsInline = true;
  element.src = url;
  video = element;
  primed = false;
}

export function takeVideo(url: string): HTMLVideoElement | null {
  const element = video;
  video = null;
  primed = false;
  return element && element.src === new URL(url, document.baseURI).href ? element : null;
}
