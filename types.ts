// Fix: Define all necessary types for the application.

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

export enum Objective {
    FIVE_K = "5 km",
    TEN_K = "10 km",
    HALF_MARATHON = "Semi-Marathon",
    MARATHON = "Marathon",
    TRAIL_SHORT = "Trail Court (<42km)",
    TRAIL_LONG = "Trail Long (>42km)",
    MAINTENANCE = "Entretien / Plaisir",
}

export enum Terrain {
    ROAD = "Route",
    TRAIL = "Trail",
    TRACK = "Piste",
    MIXED = "Mixte",
}

export interface FormData {
    gender: Gender;
    age: number;
    weight: number;
    height: number;
    level: Level;
    runningHistory: RunningHistory;
    pb5k: string;
    pb10k: string;
    pbSemi: string;
    pbMarathon: string;
    currentPaceEF: string;
    objective: Objective;
    targetTime: string;
    availabilityDays: string[];
    duration: number;
    terrain: Terrain;
    notes: string;
}

export interface DetailedSession {
    jour: string;
    type: string;
    contenu: string;
    objectif: string;
    volume: number;
    allure: string;
    frequenceCardiaque: string;
    rpe: string;
}

export interface DetailedTrainingPlan {
    plan: {
        semaine: number;
        jours: DetailedSession[];
        volumeTotal: number;
        resume: string;
        repartition: {
            ef: number;
            intensite: number;
        };
    }[];
    alluresReference: {
        ef: string;
        seuil: string;
        as10: string;
        as21: string;
        as42: string;
        vma: string;
    };
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