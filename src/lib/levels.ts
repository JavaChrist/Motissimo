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
    words: ["PAS", "AIE", "PAIN", "PALE", "PALES", "PLEIN", "NAPPES"],
    theme: "pink",
    difficulty: 1,
  },
  {
    id: 6,
    title: "Au Jardin",
    grid: [
      ["F", "L", "E"],
      ["I", "U", "R"],
      ["S", "O", "N"],
    ],
    words: ["FIL", "LUE", "SON", "FLOU", "LEUR", "FLEUR", "FILON"],
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
    words: ["SIL", "OLE", "STYL", "LINER", "LYRE", "STYLE", "TOILE", "OIENT"],
    theme: "blue",
    difficulty: 2,
  },
  {
    id: 9,
    title: "En Ville",
    grid: [
      ["R", "U", "E"],
      ["M", "A", "I"],
      ["S", "O", "N"],
    ],
    words: ["RUE", "MAI", "AMI", "SON", "MAISON", "MARE", "RAME", "MINE"],
    theme: "blue",
    difficulty: 2,
  },
  {
    id: 10,
    title: "La Nature",
    grid: [
      ["A", "R", "B", "E"],
      ["I", "S", "O", "L"],
      ["N", "E", "T", "A"],
    ],
    words: ["AIR", "SOL", "ARBRE", "ISOLE", "BOLET", "SOL", "SIROP", "TOILE"],
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
    words: ["NOTE", "CHER", "RICHE", "ORACLE", "TSAR", "HASTE", "CHORALE"],
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
    words: ["VON", "VOIE", "VENT", "GITE", "SAGE", "VOYAGE", "ENVIE", "STAGE"],
    theme: "purple",
    difficulty: 3,
  },
  {
    id: 13,
    title: "Le Savoir",
    grid: [
      ["C", "E", "R", "V"],
      ["A", "S", "E", "M"],
      ["R", "S", "T", "O"],
    ],
    words: ["CAS", "AMER", "CASE", "MOTS", "RACE", "CASTE", "CERVEAU"],
    theme: "green",
    difficulty: 3,
  },
  {
    id: 14,
    title: "Défi Expert",
    grid: [
      ["L", "I", "V", "R"],
      ["E", "A", "S", "M"],
      ["T", "O", "N", "E"],
    ],
    words: ["VIE", "LIE", "AVIS", "LAVE", "VRAI", "LIVRE", "MAISON", "LEVIER"],
    theme: "green",
    difficulty: 3,
  },
  {
    id: 15,
    title: "Grand Maître",
    grid: [
      ["E", "S", "P", "R"],
      ["T", "E", "I", "F"],
      ["F", "I", "V", "T"],
    ],
    words: ["VIE", "FIN", "PISTE", "VIPER", "ESPRIT", "FESTIF", "PIEUSE"],
    theme: "green",
    difficulty: 3,
  },
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
