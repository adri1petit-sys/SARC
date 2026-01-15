
export enum Gender {
    MALE = "Homme",
    FEMALE = "Femme",
    OTHER = "Autre",
}

export enum Level {
    BEGINNER = "Débutant",
    INTERMEDIATE = "Intermédiaire",
    CONFIRMED = "Confirmé",
    EXPERT = "Expert",
}

export enum RunningHistory {
    LESS_THAN_A_YEAR = "Moins d'un an",
    ONE_TO_THREE_YEARS = "1 à 3 ans",
    THREE_TO_FIVE_YEARS = "3 à 5 ans",
    MORE_THAN_FIVE_YEARS = "Plus de 5 ans",
}

export enum CurrentVolume {
    LESS_THAN_20 = "< 20 km",
    TWENTY_TO_FORTY = "20–40 km",
    FORTY_TO_SIXTY = "40–60 km",
    SIXTY_TO_EIGHTY = "60–80 km",
    EIGHTY_TO_HUNDRED = "80–100 km",
    MORE_THAN_HUNDRED = "> 100 km",
}

export enum Objective {
    FIVE_K = "5 km",
    TEN_K = "10 km",
    HALF_MARATHON = "Semi-Marathon",
    MARATHON = "Marathon",
    TRAIL_SHORT = "Trail Court (<42km)",
    ULTRA_DISTANCE = "Ultra-distance",
    MAINTENANCE = "Entretien / Plaisir",
}

export enum Terrain {
    ROAD = "Route",
    TRAIL = "Trail",
    TRACK = "Piste",
    MIXED = "Mixte",
}

export enum LifeStress {
    LOW = "Faible (Reposé, temps dispo)",
    MEDIUM = "Moyen (Vie active standard)",
    HIGH = "Élevé (Travail intense, peu de sommeil)",
}

export interface UltraDetails {
    type: "Marathon route" | "Trail" | "Ultra-trail";
    distance: string;
    targetTime: string;
    elevationGain: string;
    terrainType: "Peu technique" | "Mixte" | "Très technique";
}

export interface TrailShortDetails {
    distance: string;
    elevationGain: string;
    terrainType: "Peu technique" | "Mixte" | "Très technique";
    targetTime?: string;
}

export interface FormData {
    // Identité (Nouvelle étape finale)
    firstName: string;
    lastName: string;
    email: string;
    phone: string;

    // Physio
    gender: Gender;
    age: number | "";
    weight: number | "";
    height: number | "";
    
    // Profil
    level: Level;
    runningHistory: RunningHistory;
    currentVolume: CurrentVolume;
    pb5k: string;
    pb10k: string;
    pbSemi: string;
    pbMarathon: string;
    currentPaceEF: string;
    
    // Objectif
    objective: Objective;
    ultraDetails?: UltraDetails;
    trailShortDetails?: TrailShortDetails;
    targetTime: string;
    targetDate: string; // YYYY-MM-DD
    availabilityDays: string[];
    duration: number; // Durée de la prépa spécifique
    
    // Contexte
    terrain: Terrain;
    lifeStress: LifeStress;
    notes: string;
}
