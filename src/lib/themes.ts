export interface Theme {
  id: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  accentRgb: string;
  tileText: string;
  background: string;
  backgroundOverlay: string;
}

export const THEMES: Record<string, Theme> = {
  orange: {
    id: "orange",
    accent: "#F97316",
    accentDark: "#C2410C",
    accentLight: "#FDBA74",
    accentRgb: "249,115,22",
    tileText: "#FFFFFF",
    background: `
      radial-gradient(ellipse 120% 40% at 50% 55%, rgba(255,255,255,0.15) 0%, transparent 100%),
      linear-gradient(180deg,
        #7EC8E3 0%,
        #58B4D1 12%,
        #3AA7C9 22%,
        #1E9BBF 32%,
        #0891B2 42%,
        #0E7490 52%,
        #0C6980 60%,
        #0A5E73 70%,
        #085C6E 80%,
        #065A68 100%
      )
    `,
    backgroundOverlay: "rgba(14, 116, 144, 0.1)",
  },
  pink: {
    id: "pink",
    accent: "#EC4899",
    accentDark: "#BE185D",
    accentLight: "#F9A8D4",
    accentRgb: "236,72,153",
    tileText: "#FFFFFF",
    background: `
      radial-gradient(ellipse 140% 30% at 50% 45%, rgba(255,200,100,0.2) 0%, transparent 100%),
      linear-gradient(180deg,
        #FCD34D 0%,
        #F59E0B 10%,
        #F97316 22%,
        #EA580C 34%,
        #DC4E1A 44%,
        #C2410C 54%,
        #92400E 66%,
        #78350F 78%,
        #5C2D0E 90%,
        #451A03 100%
      )
    `,
    backgroundOverlay: "rgba(120, 53, 15, 0.1)",
  },
  blue: {
    id: "blue",
    accent: "#6366F1",
    accentDark: "#4338CA",
    accentLight: "#A5B4FC",
    accentRgb: "99,102,241",
    tileText: "#FFFFFF",
    background: `
      radial-gradient(ellipse 120% 35% at 50% 50%, rgba(255,150,200,0.15) 0%, transparent 100%),
      linear-gradient(180deg,
        #FCA5A5 0%,
        #E879A0 10%,
        #C084B4 22%,
        #9980C8 34%,
        #7C7CDB 44%,
        #5B6AD0 54%,
        #3B52B0 66%,
        #2D3F94 78%,
        #1E2E78 90%,
        #172464 100%
      )
    `,
    backgroundOverlay: "rgba(59, 82, 176, 0.1)",
  },
  purple: {
    id: "purple",
    accent: "#A855F7",
    accentDark: "#7E22CE",
    accentLight: "#D8B4FE",
    accentRgb: "168,85,247",
    tileText: "#FFFFFF",
    background: `
      radial-gradient(ellipse 100% 40% at 50% 48%, rgba(200,180,255,0.15) 0%, transparent 100%),
      linear-gradient(180deg,
        #93C5FD 0%,
        #7BB3F0 10%,
        #7BA1E8 22%,
        #8B8FE0 34%,
        #9B7DD8 44%,
        #A96BD0 54%,
        #B55EC0 62%,
        #C050B0 70%,
        #A845A0 80%,
        #8B3A90 100%
      )
    `,
    backgroundOverlay: "rgba(139, 58, 144, 0.1)",
  },
  green: {
    id: "green",
    accent: "#22C55E",
    accentDark: "#15803D",
    accentLight: "#86EFAC",
    accentRgb: "34,197,94",
    tileText: "#FFFFFF",
    background: `
      radial-gradient(ellipse 130% 35% at 50% 52%, rgba(255,180,100,0.2) 0%, transparent 100%),
      linear-gradient(180deg,
        #FDA4AF 0%,
        #F0829A 10%,
        #D87090 20%,
        #B06088 30%,
        #8B5080 40%,
        #6B4580 50%,
        #4A3A78 60%,
        #2E3070 70%,
        #1E2860 82%,
        #142050 100%
      )
    `,
    backgroundOverlay: "rgba(30, 40, 96, 0.1)",
  },
};

export function getTheme(id: string): Theme {
  return THEMES[id] ?? THEMES.orange;
}

export const LETTER_SCORES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 10, L: 1, M: 2, N: 1, O: 1, P: 3, Q: 8, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 10, X: 10, Y: 10, Z: 10,
};
