import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';
import { Objective } from '../types';

export const getApiKey = (): string | undefined => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.API_KEY) return import.meta.env.API_KEY;
        
        // Check process.env carefully to avoid browser crashes
        if (typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) { 
        console.warn("Failed to retrieve API key", e);
    }
    return undefined;
};

const getAiClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("La clé API n'est pas configurée.");
    }
    return new GoogleGenAI({ apiKey });
};

// --- Date Utils ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const getMonday = (d: Date) => {
  const dCopy = new Date(d);
  const day = dCopy.getDay();
  const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dCopy.setDate(diff));
};

export async function generateDetailedTrainingPlan(formData: FormData, useThinkingMode: boolean): Promise<DetailedTrainingPlan> {
  const ai = getAiClient();
  
  // 1. CALCUL DES DATES ET DES SEMAINES (Calendrier Réel)
  const targetDateObj = new Date(formData.targetDate);
  const today = new Date();
  const planStartDate = getMonday(today);
  
  const totalDurationMs = targetDateObj.getTime() - planStartDate.getTime();
  const totalWeeksAvailable = Math.ceil(totalDurationMs / (7 * MS_PER_DAY));
  
  // Si la date est passée ou trop proche (< 1 semaine), on gère une exception ou on commence maintenant
  if (totalWeeksAvailable < 1) {
      throw new Error("La date d'objectif est trop proche. Veuillez choisir une date future.");
  }

  const prepDuration = formData.duration;
  let maintenanceWeeks = 0;
  
  if (totalWeeksAvailable > prepDuration) {
      maintenanceWeeks = totalWeeksAvailable - prepDuration;
  }
  
  const ultraContext = formData.ultraDetails 
    ? `ULTRA DETAILS: Type=${formData.ultraDetails.type}, Dist=${formData.ultraDetails.distance}, D+=${formData.ultraDetails.elevationGain}, Terrain=${formData.ultraDetails.terrainType}.`
    : `Objectif: ${formData.objective}`;

  const trailContext = formData.trailShortDetails
    ? `TRAIL COURT DETAILS: Dist=${formData.trailShortDetails.distance}, D+=${formData.trailShortDetails.elevationGain}, Terrain=${formData.trailShortDetails.terrainType}, TempsCible=${formData.trailShortDetails.targetTime || 'Non précisé'}.`
    : '';

  // 2. SÉLECTION DU CONTEXTE SCIENTIFIQUE SELON L'OBJECTIF
  let scientificContext = "";

  if (formData.objective === Objective.FIVE_K) {
      scientificContext = `
      --- BIBLE 5000M ---
      Focus: VMA (vVO2max), Économie de course.
      Architecture: Base -> Construction -> Spécifique.
      `;
  } else if (formData.objective === Objective.TEN_K) {
      scientificContext = `
      --- BIBLE 10 KM ---
      Focus: Endurance-Vitesse (90-95% VMA).
      Architecture: Base -> Spécifique (VTS 4-8 km).
      `;
  } else if (formData.objective === Objective.HALF_MARATHON) {
      scientificContext = `
      --- BIBLE SEMI-MARATHON ---
      Focus: Seuil Anaérobie LT2.
      Architecture: Volume -> Seuil/Tempo -> Spécifique AS21.
      `;
  } else if (formData.objective === Objective.MARATHON) {
      scientificContext = `
      --- BIBLE MARATHON ---
      Focus: Durabilité, Glycogène.
      Architecture: Base -> Spécifique (AS42) -> Affûtage 2-3 sem.
      `;
  } else if (formData.objective === Objective.TRAIL_SHORT) {
      scientificContext = `
      --- BIBLE TRAIL COURT ---
      Focus: Ratio D+/Heure, Force Excentrique.
      Architecture: Base -> Spécifique D+ -> Affûtage Mécanique.
      `;
  } else if (formData.objective === Objective.ULTRA_DISTANCE) {
      scientificContext = `
      --- BIBLE ULTRA-TRAIL ---
      Focus: FatMax, Gestion Fatigue (Weekend Choc).
      Architecture: Polarisation -> Weekend Choc -> Affûtage long.
      `;
  }

  // 3. CONSTRUCTION DU PROMPT AVEC CONTRAINTES STRICTES
  const prompt = `
    ROLE: Coach Expert SARC (Saint-Avertin Run Club).
    MISSION: Générer un plan d'entraînement structuré sur ${totalWeeksAvailable} semaines, du ${planStartDate.toISOString().split('T')[0]} au ${formData.targetDate}.

    CONTEXTE UTILISATEUR :
    - Profil : ${formData.gender}, ${formData.age} ans, Niveau ${formData.level}.
    - Objectif : ${
      formData.objective === Objective.ULTRA_DISTANCE
        ? ultraContext
        : formData.objective === Objective.TRAIL_SHORT
          ? trailContext
          : `Objectif ${formData.objective} en ${formData.targetTime}`
    }.
    - Dispo Jours : ${formData.availabilityDays.join(', ')}.
    - Note : Le volume de la prépa doit être calibré pour réussir l'OBJECTIF, indépendamment du volume historique (augmentation progressive sécurisée).

    CALENDRIER :
    - Semaines 1 à ${maintenanceWeeks} : PHASE DE MAINTIEN / SOCLE (Si ${maintenanceWeeks} > 0).
    - Semaines ${maintenanceWeeks + 1} à ${totalWeeksAvailable} : PRÉPARATION SPÉCIFIQUE (${prepDuration} semaines).
    - Date de course : ${formData.targetDate}.

    RÈGLES IMPÉRATIVES DE GÉNÉRATION (CONTRAINTES SARC) :
    1. JOURS : Générer EXACTEMENT ${formData.availabilityDays.length} séances/semaine correspondant aux jours de dispo (${formData.availabilityDays.join(', ')}).
    
    2. RÈGLE DU MERCREDI (Si Mercredi est dans les dispos) :
       - OBLIGATOIRE : Séance "Fractionné Surprise".
       - STRUCTURE : "15' EF - 20' Fractionné Surprise (ex: 30/30, Pyramide, Côtes...) - 15' EF".
       
    3. RÈGLE DU DIMANCHE (Si Dimanche est dans les dispos) :
       - OBLIGATOIRE : "Run Club - Bois des Hâtes".
       - BASE : 10 km à 6:00/km (allure sociale).
       - ADAPTATION : Si la Sortie Longue (SL) exigée par le plan > 10km, ajouter le volume en "EF avant" ou "EF après" la sortie club.
    
    4. FORMAT JSON STRICT :
       - Les dates doivent être réelles (YYYY-MM-DD).
       - Le champ 'contenu' des séances qualité doit être détaillé.

    ${scientificContext}

    OUTPUT : JSON uniquement selon le schéma fourni.
  `;

  const model = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
  
  const config: any = {
      responseMimeType: "application/json",
      responseSchema: {
          type: Type.OBJECT,
          properties: {
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              raceDate: { type: Type.STRING },
              maintenanceWeeks: { type: Type.NUMBER },
              plan: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          semaine: { type: Type.INTEGER },
                          phase: { type: Type.STRING },
                          startDate: { type: Type.STRING },
                          endDate: { type: Type.STRING },
                          jours: {
                              type: Type.ARRAY,
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      jour: { type: Type.STRING },
                                      date: { type: Type.STRING },
                                      type: { type: Type.STRING },
                                      contenu: { type: Type.STRING },
                                      warmup: { type: Type.STRING },
                                      mainBlock: { type: Type.STRING },
                                      cooldown: { type: Type.STRING },
                                      objectif: { type: Type.STRING },
                                      volume: { type: Type.NUMBER },
                                      allure: { type: Type.STRING },
                                      frequenceCardiaque: { type: Type.STRING },
                                      rpe: { type: Type.STRING },
                                  },
                                  required: ["jour", "date", "type", "contenu", "objectif", "volume"],
                              },
                          },
                          volumeTotal: { type: Type.NUMBER },
                          repartition: {
                              type: Type.OBJECT,
                              properties: { ef: { type: Type.NUMBER }, intensite: { type: Type.NUMBER } },
                              required: ["ef", "intensite"]
                          },
                          resume: { type: Type.STRING },
                      },
                      required: ["semaine", "phase", "startDate", "endDate", "jours", "volumeTotal", "resume", "repartition"],
                  },
              },
              alluresReference: {
                type: Type.OBJECT,
                properties: {
                  ef: { type: Type.STRING },
                  seuil: { type: Type.STRING },
                  as10: { type: Type.STRING },
                  as21: { type: Type.STRING },
                  as42: { type: Type.STRING },
                  vma: { type: Type.STRING },
                },
                required: ["ef", "seuil", "as10", "as21", "as42", "vma"]
              },
              coachNotes: { type: Type.STRING }
          },
          required: ["plan", "alluresReference", "startDate", "endDate", "raceDate"],
      },
  };

  if (useThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 16384 };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config,
      });

      const jsonText = response.text.trim();
      if (!jsonText) throw new Error("Réponse vide");
      return JSON.parse(jsonText) as DetailedTrainingPlan;
    } catch (error) {
        console.error("Erreur génération:", error);
        if (attempt === MAX_RETRIES) throw error;
    }
  }
  throw new Error("Échec génération");
}

const MAX_RETRIES = 2;

const formatFeedbackForAI = (plan: SavedPlan): string => {
  const feedbackLines: string[] = [];
  plan.plan.plan.forEach((week, weekIndex) => {
    week.jours.forEach((session, sessionIndex) => {
      const key = `${weekIndex}_${sessionIndex}`;
      const feedback = plan.completionStatus[key];
      if (feedback && feedback.completed) {
        feedbackLines.push(`- ${session.date}: ${session.type}, RPE ${feedback.rpe || '-'}/10.`);
      }
    });
  });
  return feedbackLines.length > 0 ? feedbackLines.join('\n') : "Aucun retour.";
};

export async function getPlanOptimizationSuggestions(plan: SavedPlan): Promise<OptimizationSuggestion[]> {
  const ai = getAiClient();
  const formattedFeedback = formatFeedbackForAI(plan);
  const prompt = `
    TASK: Optimize plan.
    User: ${plan.userProfile.level}, Obj: ${plan.userProfile.objective}.
    Feedback: ${formattedFeedback}
    OUTPUT: JSON Array of suggestions.
  `;
  try {
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                reasoning: { type: Type.STRING },
              },
              required: ["title", "suggestion", "reasoning"],
            },
          },
        },
      });
      return JSON.parse(response.text.trim()) as OptimizationSuggestion[];
  } catch(error) {
    throw new Error("Optimisation impossible");
  }
}

export async function generateChatResponse(history: ChatMessage[], newMessage: string, useGoogleSearch: boolean): Promise<GenerateContentResponse> {
    const ai = getAiClient();
    const config: any = {};
    if (useGoogleSearch) config.tools = [{googleSearch: {}}];
    const contents = [...history, { role: 'user', parts: [{ text: newMessage }] }];
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { ...config, systemInstruction: `Coach SARC. Réponds en français.` }
    });
}

export async function getSessionSuggestion(session: DetailedSession, userQuery: string): Promise<string> {
  const ai = getAiClient();
  const prompt = `Context: Change session ${session.type} on ${session.date}. Query: "${userQuery}". Answer in French.`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return response.text;
}