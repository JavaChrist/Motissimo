export interface Level {
  id: number;
  category: string;
  hint: string;
  words: string[];
  cols: number;
  difficulty: 1 | 2 | 3;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    category: "Fruits",
    hint: "Des fruits que l'on trouve au marché",
    words: ["POMME", "POIRE", "KIWI"],
    cols: 4,
    difficulty: 1,
  },
  {
    id: 2,
    category: "Animaux",
    hint: "Nos amis les bêtes",
    words: ["CHAT", "CHIEN", "LION"],
    cols: 4,
    difficulty: 1,
  },
  {
    id: 3,
    category: "Couleurs",
    hint: "L'arc-en-ciel",
    words: ["BLEU", "VERT", "ROSE", "GRIS"],
    cols: 4,
    difficulty: 1,
  },
  {
    id: 4,
    category: "Famille",
    hint: "Les liens du sang",
    words: ["PERE", "MERE", "FILS", "SOEUR"],
    cols: 4,
    difficulty: 1,
  },
  {
    id: 5,
    category: "Corps",
    hint: "Parties du corps humain",
    words: ["MAIN", "PIED", "BRAS", "TETE"],
    cols: 4,
    difficulty: 1,
  },
  {
    id: 6,
    category: "Maison",
    hint: "On les trouve dans une maison",
    words: ["PORTE", "TABLE", "LAMPE", "SALON"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 7,
    category: "Nature",
    hint: "Ce que l'on voit dehors",
    words: ["ARBRE", "FLEUR", "HERBE", "NUAGE"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 8,
    category: "Cuisine",
    hint: "On les mange ou on cuisine avec",
    words: ["PAIN", "SOUPE", "SAUCE", "HUILE"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 9,
    category: "Vêtements",
    hint: "Ce que l'on porte",
    words: ["ROBE", "JUPE", "GILET", "VESTE"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 10,
    category: "Voyage",
    hint: "Partir en voyage",
    words: ["AVION", "TRAIN", "HOTEL", "CARTE", "VALISE"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 11,
    category: "Musique",
    hint: "Le monde musical",
    words: ["PIANO", "CHANT", "RYTHME", "NOTES"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 12,
    category: "Sport",
    hint: "Disciplines sportives",
    words: ["COURSE", "TENNIS", "BOXE", "RUGBY"],
    cols: 5,
    difficulty: 2,
  },
  {
    id: 13,
    category: "Mer",
    hint: "Au bord de l'océan",
    words: ["VAGUE", "SABLE", "BATEAU", "PHARE", "ANCRE"],
    cols: 6,
    difficulty: 3,
  },
  {
    id: 14,
    category: "Espace",
    hint: "Parmi les étoiles",
    words: ["LUNE", "ETOILE", "SOLEIL", "COMETE", "ORBITE"],
    cols: 6,
    difficulty: 3,
  },
  {
    id: 15,
    category: "Métiers",
    hint: "Des professions",
    words: ["AVOCAT", "PILOTE", "ARTISTE", "DENTISTE"],
    cols: 6,
    difficulty: 3,
  },
  {
    id: 16,
    category: "École",
    hint: "La vie scolaire",
    words: ["CRAYON", "CAHIER", "STYLO", "GOMME", "CLASSE"],
    cols: 6,
    difficulty: 3,
  },
  {
    id: 17,
    category: "Jardin",
    hint: "Au potager et au jardin",
    words: ["TOMATE", "CAROTTE", "SALADE", "RADIS", "PERSIL"],
    cols: 6,
    difficulty: 3,
  },
  {
    id: 18,
    category: "Météo",
    hint: "Quel temps fait-il ?",
    words: ["ORAGE", "PLUIE", "NEIGE", "BRUME", "ECLAIR", "GIVRE"],
    cols: 6,
    difficulty: 3,
  },
  {
    id: 19,
    category: "Géographie",
    hint: "Reliefs et paysages",
    words: ["MONTAGNE", "RIVIERE", "DESERT", "FORET", "PLAINE"],
    cols: 7,
    difficulty: 3,
  },
  {
    id: 20,
    category: "Fête",
    hint: "Jours de célébration",
    words: ["GATEAU", "BOUGIE", "CADEAU", "BALLON", "RUBAN", "CONFETTI"],
    cols: 7,
    difficulty: 3,
  },
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
