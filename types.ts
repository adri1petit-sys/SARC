export interface User {
    id: string;
    email: string;
    name: string;
}

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

export interface FormData {
    gender: Gender;
    age: number;
    weight: number;
    height: number;
    level: Level;
    runningHistory: RunningHistory;
    currentVolume: CurrentVolume;
    pb5k: string;
    pb10k: string;
    pbSemi: string;
    pbMarathon: string;
    currentPaceEF: string;
    objective: Objective;
    ultraDetails?: UltraDetails;
    targetTime: string;
    targetDate: string; // YYYY-MM-DD
    availabilityDays: string[];
    duration: number; // Durée de la prépa spécifique
    terrain: Terrain;
    lifeStress: LifeStress;
    notes: string;
}

export interface DetailedSession {
    jour: string; // Lundi, Mardi...
    date: string; // YYYY-MM-DD
    type: string;
    contenu: string; // Texte structuré complet (Échauffement, Bloc, Retour au calme)
    objectif: string;
    volume: number;
    allure: string;
    frequenceCardiaque: string;
    rpe: string;
    // Nouveaux champs pour structure détaillée
    warmup?: string;
    mainBlock?: string;
    cooldown?: string;
}

export interface DetailedTrainingPlan {
    startDate: string;
    endDate: string;
    raceDate: string;
    maintenanceWeeks: number;
    plan: {
        semaine: number;
        phase: string; // "Maintien", "Développement", "Spécifique", "Affûtage", "Compétition"
        startDate: string;
        endDate: string;
        jours: DetailedSession[];
        volumeTotal: number;
        repartition: {
            ef: number;
            intensite: number;
        };
        resume: string;
    }[];
    alluresReference: {
        ef: string;
        seuil: string;
        as10: string;
        as21: string;
        as42: string;
        vma: string;
    };
    coachNotes?: string;
}

export interface SessionFeedback {
    completed: boolean;
    rpe?: number;
    notes?: string;
}

export interface CompletionStatus {
    [key: string]: SessionFeedback;
}

export interface SavedPlan {
    id: string;
    userId: string;
    plan: DetailedTrainingPlan;
    userProfile: FormData;
    createdAt: string;
    isActive: boolean;
    completionStatus: CompletionStatus;
}

export interface OptimizationSuggestion {
    title: string;
    suggestion: string;
    reasoning: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface ChatMessagePart {
    text: string;
}

export interface ChatMessage {
    role: "user" | "model";
    parts: ChatMessagePart[];
    sources?: GroundingSource[];
    isLoading?: boolean;
}