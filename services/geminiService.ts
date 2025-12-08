import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';

export const getApiKey = (): string | undefined => {
    try {
        if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
    } catch (e) { }
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.API_KEY) return import.meta.env.API_KEY;
    } catch (e) { }
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
  
  const prepDuration = formData.duration;
  let maintenanceWeeks = 0;
  
  if (totalWeeksAvailable > prepDuration) {
      maintenanceWeeks = totalWeeksAvailable - prepDuration;
  }
  
  // 2. CONSTRUCTION DU PROMPT EXPERT
  const ultraContext = formData.ultraDetails 
    ? `ULTRA: ${formData.ultraDetails.type}, ${formData.ultraDetails.distance}, D+${formData.ultraDetails.elevationGain}.`
    : `Objectif: ${formData.objective}`;

  const prompt = `
    ROLE: Coach Expert Endurance & Physiologie (Haut Niveau), SPÉCIALISTE MARATHON.
    MISSION: Générer un plan d'entraînement MARATHON structuré, lisible et physiologiquement optimal, basé sur le cadre méthodologique Marathon du SARC.

    CONTEXTE CALENDRIER :
    - Date départ plan : ${planStartDate.toISOString().split('T')[0]}
    - Date course : ${formData.targetDate}
    - Semaines totales : ${totalWeeksAvailable}
    - Semaines maintien : ${maintenanceWeeks} (Volume ≈ ${formData.currentVolume}).
    - Semaines prépa : ${prepDuration} (Progression +10%/semaine max).

    --- CADRE MÉTHODOLOGIQUE MARATHON ---
    1. PROFILS COUREURS & VOLUME CIBLE :
       - Débutant (Objectif finir, >4h15) : 3-4 séances/sem, Pic 40-60 km/sem. SL max 2h30.
       - Intermédiaire (3h30-4h15) : 4-5 séances/sem, Pic 60-90 km/sem. SL max 30-32 km.
       - Avancé (2h45-3h30) : 5-7 séances/sem, Pic 90-110 km/sem. SL spécifique avec blocs AS42.
       - Élite (<2h40) : 7+ séances/sem, Pic >110 km/sem. Méthodes avancées (Canova).

    2. INVARIANTS PHYSIOLOGIQUES :
       - 80-90% du volume en Endurance Fondamentale (EF).
       - Sortie Longue (SL) : 1x/semaine OBLIGATOIRE (sauf affûtage). Max 30-35% du volume hebdo.
       - Phase Spécifique : Intégration progressive de l'allure AS42.
       - Affûtage (Taper) : 2-3 dernières semaines, baisse volume (20->40->60%), maintien intensité.

    RÈGLES DE FORMAT DES SÉANCES (STRICTES - SARC) :
    
    FORMAT 1 : SÉANCE 100% EF (FOOTING SIMPLE)
    - Si la séance est "Endurance Fondamentale" uniquement.
    - NE PAS CRÉER DE BLOCS échauffement/corps/retour.
    - Contenu : "10 km en endurance fondamentale (EF), allure confortable." (1 seule ligne).
    - Champs 'warmup', 'mainBlock', 'cooldown' DOIVENT être vides.

    FORMAT 2 : SÉANCE QUALITATIVE (VMA, SEUIL, ASxx, CÔTES)
    - Structure OBLIGATOIRE :
      - Warmup: (ex: "20' EF + 3 x 80m accélérations")
      - Main Block: (ex: "3 x 10' AS42, R=2' trot")
      - Cooldown: (ex: "10' EF")
      - Contenu : Concaténation lisible ("20' EF + 3 x 10' AS42 (R=2') + 10' EF")

    FORMAT 3 : SORTIE LONGUE STRUCTURÉE (DIMANCHE)
    - Base : "10 km EF @ 6:00/km avec le Run Club (Bois des Hâtes)".
    - Si SL > 10km : Ajouter EF avant/après (répartition 50/50).
    - Warmup: (ex: "5 km EF en solo")
    - Main Block: "10 km EF @ 6:00/km avec le Run Club"
    - Cooldown: (ex: "5 km EF en solo")
    - Contenu: "5 km EF + 10 km Run Club + 5 km EF"

    RÈGLE SPÉCIALE MERCREDI (FIXE) :
    - Type : "Fractionné Surprise"
    - Warmup: "15' EF"
    - Main Block: "20' fractionné surprise (séance décidée par les coachs)"
    - Cooldown: "15' EF"
    - Contenu: "15' EF + 20' Fractionné surprise + 15' EF"

    PROFIL ATHLÈTE :
    - ${formData.gender}, ${formData.age} ans, Niveau ${formData.level}.
    - Volume actuel : ${formData.currentVolume}.
    - Objectif : ${ultraContext} en ${formData.targetTime}.
    - Dispo : ${formData.availabilityDays.join(', ')}.

    OUTPUT : JSON uniquement respectant le schéma.
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
                                      contenu: { type: Type.STRING }, // Texte complet concaténé
                                      warmup: { type: Type.STRING }, // Champ spécifique
                                      mainBlock: { type: Type.STRING }, // Champ spécifique
                                      cooldown: { type: Type.STRING }, // Champ spécifique
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