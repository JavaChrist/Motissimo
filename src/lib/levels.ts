export interface Level {
  id: number;
  title: string;
  words: string[];
  grid: string[][];
  theme: string;
  difficulty: 1 | 2 | 3;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    title: "Premiers Pas",
    grid: [
      ["M", "O", "T"],
      ["E", "I", "S"],
    ],
    words: ["MOI", "MOT", "SOI", "EMOI", "MOIS", "MOTS"],
    theme: "orange",
    difficulty: 1,
  },
  {
    id: 2,
    title: "Au Quotidien",
    grid: [
      ["C", "H", "I"],
      ["A", "N", "E"],
    ],
    words: ["ANE", "HEIN", "ACNE", "CHINE", "CHIEN"],
    theme: "orange",
    difficulty: 1,
  },
  {
    id: 3,
    title: "En Route",
    grid: [
      ["R", "U", "E"],
      ["S", "O", "T"],
    ],
    words: ["RUE", "SOU", "ROUE", "EURO", "TOUR", "OURS", "TOURS"],
    theme: "orange",
    difficulty: 1,
  },
  {
    id: 4,
    title: "Les Couleurs",
    grid: [
      ["B", "L", "E", "U"],
      ["A", "N", "C", "S"],
    ],
    words: ["ANE", "ELAN", "BLEU", "CLAN", "BLANC", "LANCE"],
    theme: "pink",
    difficulty: 1,
  },
  {
    id: 5,
    title: "À Table",
    grid: [
      ["P", "A", "I", "N"],
      ["L", "E", "S", "T"],
    ],
    words: ["PAS", "LES", "PAIN", "PALE", "LEST", "PALES", "PLEIN"],
    theme: "pink",
    difficulty: 1,
  },
  {
    id: 6,
    title: "Au Jardin",
    grid: [
      ["F", "L", "E"],
      ["I", "O", "U"],
      ["S", "N", "R"],
    ],
    words: ["FIL", "SON", "LION", "FLOU", "FOUR", "FLEUR", "FILON"],
    theme: "pink",
    difficulty: 2,
  },
  {
    id: 7,
    title: "Paysages",
    grid: [
      ["P", "I", "E"],
      ["O", "N", "R"],
      ["T", "S", "A"],
    ],
    words: ["PIN", "PIE", "REIN", "NOIR", "NIER", "PION", "POIRE", "POINT"],
    theme: "blue",
    difficulty: 2,
  },
  {
    id: 8,
    title: "Au Bureau",
    grid: [
      ["S", "T", "Y"],
      ["I", "L", "O"],
      ["N", "E", "R"],
    ],
    words: ["LIT", "ILOT", "REIN", "LOTI", "STYLO", "STYLE", "LINER"],
    theme: "blue",
    difficulty: 2,
  },
  {
    id: 9,
    title: "En Ville",
    grid: [
      ["M", "A", "R"],
      ["I", "N", "E"],
      ["S", "O", "U"],
    ],
    words: ["ANE", "UNE", "SON", "SOIN", "ANIS", "NOUE", "MINE", "AMINE"],
    theme: "blue",
    difficulty: 2,
  },
  {
    id: 10,
    title: "Exploration",
    grid: [
      ["A", "R", "B", "E"],
      ["I", "S", "O", "L"],
      ["N", "E", "T", "A"],
    ],
    words: ["SOL", "LOT", "NET", "SOLE", "RISE", "BRISE", "ISOLE", "TORSE"],
    theme: "purple",
    difficulty: 2,
  },
  {
    id: 11,
    title: "Musique",
    grid: [
      ["N", "O", "T", "E"],
      ["I", "R", "A", "S"],
      ["C", "H", "E", "L"],
    ],
    words: ["NOTE", "CHER", "TSAR", "TARE", "SALE", "RICHE", "ARCHE"],
    theme: "purple",
    difficulty: 3,
  },
  {
    id: 12,
    title: "Aventure",
    grid: [
      ["V", "O", "Y", "A"],
      ["E", "N", "T", "G"],
      ["R", "I", "S", "E"],
    ],
    words: ["VENT", "SIRE", "REIN", "VENTS", "STAGE", "VOYAGE"],
    theme: "purple",
    difficulty: 3,
  },
  {
    id: 13,
    title: "Le Savoir",
    grid: [
      ["C", "E", "R", "V"],
      ["A", "M", "E", "S"],
      ["R", "S", "T", "O"],
    ],
    words: ["CAS", "AMER", "ARME", "CASE", "RACE", "ARMES", "CASTE"],
    theme: "green",
    difficulty: 3,
  },
  {
    id: 14,
    title: "Défi Expert",
    grid: [
      ["V", "I", "E", "R"],
      ["L", "A", "S", "M"],
      ["T", "O", "N", "E"],
    ],
    words: ["VIE", "LIE", "TON", "AVIS", "VISA", "VISE", "SALON", "TALON", "LASER"],
    theme: "green",
    difficulty: 3,
  },
  {
    id: 15,
    title: "Grand Maître",
    grid: [
      ["E", "S", "V", "O"],
      ["F", "P", "R", "A"],
      ["N", "I", "T", "E"],
    ],
    words: ["FIN", "RAT", "RITE", "TIRE", "TARE", "PRIT", "ESPRIT"],
    theme: "green",
    difficulty: 3,
  },
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
