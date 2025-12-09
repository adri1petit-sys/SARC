import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';
import { Objective } from '../types';

export const getApiKey = (): string | undefined => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.API_KEY) return import.meta.env.API_KEY;
        
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

// --- Scientific Contexts (Condensed) ---
const SCIENTIFIC_SUMMARIES: Record<string, string> = {
    [Objective.FIVE_K]: "Focus: VMA, Économie. Cycle: Base -> Spécifique (VMA courte/longue).",
    [Objective.TEN_K]: "Focus: Endurance-Vitesse (90-95% VMA). Cycle: Base -> Seuil -> Spécifique AS10.",
    [Objective.HALF_MARATHON]: "Focus: Seuil LT2, Endurance. Cycle: Volume -> Tempo/Seuil -> AS21.",
    [Objective.MARATHON]: "Focus: Durabilité, Glycogène. Cycle: Endurance -> AS42 (blocs longs) -> Affûtage 2 sem.",
    [Objective.TRAIL_SHORT]: "Focus: Force excentrique, D+/Heure. Cycle: VMA côte -> Spécifique terrain.",
    [Objective.ULTRA_DISTANCE]: "Focus: FatMax, Endurance mentale. Cycle: Volume -> Weekend Choc -> Affûtage long.",
    [Objective.MAINTENANCE]: "Focus: Plaisir, Santé. Volume modéré, mix EF et variations ludiques."
};

export async function generateDetailedTrainingPlan(formData: FormData, useThinkingMode: boolean): Promise<DetailedTrainingPlan> {
  const ai = getAiClient();
  
  // 1. CALCUL DES DATES
  const targetDateObj = new Date(formData.targetDate);
  const today = new Date();
  const planStartDate = getMonday(today);
  
  const totalDurationMs = targetDateObj.getTime() - planStartDate.getTime();
  const totalWeeksAvailable = Math.ceil(totalDurationMs / (7 * MS_PER_DAY));
  
  if (totalWeeksAvailable < 1) {
      throw new Error("La date d'objectif est trop proche.");
  }

  const prepDuration = formData.duration;
  let maintenanceWeeks = 0;
  if (totalWeeksAvailable > prepDuration) {
      maintenanceWeeks = totalWeeksAvailable - prepDuration;
  }
  
  // 2. CONTEXTE CONDENSÉ
  const summary = SCIENTIFIC_SUMMARIES[formData.objective] || "Entraînement équilibré.";
  
  const specificContext = formData.objective === Objective.ULTRA_DISTANCE && formData.ultraDetails
    ? `Ultra ${formData.ultraDetails.distance}, D+${formData.ultraDetails.elevationGain}`
    : formData.objective === Objective.TRAIL_SHORT && formData.trailShortDetails
      ? `Trail ${formData.trailShortDetails.distance}, D+${formData.trailShortDetails.elevationGain}`
      : `Objectif ${formData.targetTime}`;

  // 3. PROMPT DIRECTIF
  const prompt = `
    ROLE: Coach Expert SARC. Génère un plan de ${totalWeeksAvailable} semaines (${planStartDate.toISOString().split('T')[0]} au ${formData.targetDate}).
    PROFIL: ${formData.level}, ${formData.currentVolume}. OBJ: ${formData.objective} (${specificContext}).
    DISPO: ${formData.availabilityDays.join(', ')}.

    STRUCTURE:
    - Sem 1-${maintenanceWeeks}: Maintien (si applicable).
    - Sem ${maintenanceWeeks + 1}-${totalWeeksAvailable}: Prépa Spécifique.

    RÈGLES STRICTES SARC (A RESPECTER IMPERATIVEMENT) :
    1. JOURS: Exactement ${formData.availabilityDays.length} séances/semaine correspondant aux jours : ${formData.availabilityDays.join(', ')}.
    
    2. MERCREDI (si dispo): C'est "Fractionné Surprise".
       - TYPE: "Fractionné Surprise".
       - CONTENU BLOC PRINCIPAL: "Surprise – contenu communiqué quelques minutes avant sur le groupe WhatsApp du club." (NE JAMAIS INVENTER de 30/30 ou autre détail).
       - STRUCTURE: 20' EF + Bloc Surprise + 10' EF.
       
    3. DIMANCHE (si dispo): "Run Club - Bois des Hâtes".
       - BASE: 10km @ 6:00/km. Si SL > 10km, ajouter le reste en EF avant/après.
    
    4. INTENSITÉ & BLOCS:
       - Échauffement (warmup) et Retour au calme (cooldown) DOIVENT TOUJOURS être "Endurance Fondamentale" (EF). Pas de marche, pas d'étirements dans ces blocs.
       - Le volume doit être progressif et adapté à l'objectif.

    CONTEXTE SCIENCE: ${summary}

    OUTPUT: JSON Strict selon schema. Dates format YYYY-MM-DD.
  `;

  // Utilisation de Flash par défaut pour la vitesse, sauf si Thinking demandé explicitement
  // Le prompt est suffisamment guidé pour que Flash performe bien en <15s
  const model = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
  
  const config: any = {
      responseMimeType: "application/json",
      temperature: 0.7, // Équilibre créativité/structure
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
                                  required: ["jour", "date", "type", "contenu", "objectif", "volume", "warmup", "mainBlock", "cooldown"],
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
      config.thinkingConfig = { thinkingBudget: 4096 }; // Budget réduit pour rester rapide si activé
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
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
        if (attempt === 2) throw error;
    }
  }
  throw new Error("Échec génération");
}

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
    TASK: Optimize plan. User: ${plan.userProfile.level}. Feedback: ${formattedFeedback}.
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