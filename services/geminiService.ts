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

// --- Scientific Contexts (Ultra-Condensed for Speed) ---
const SCIENTIFIC_SUMMARIES: Record<string, string> = {
    [Objective.FIVE_K]: "VMA focus. Cycles: Base -> Spec (Short/Long Intervals). High intensity density.",
    [Objective.TEN_K]: "Threshold/AS10 focus. Cycles: Base -> Threshold -> Spec AS10 (90% VMA).",
    [Objective.HALF_MARATHON]: "Endurance & LT2 Threshold. Cycles: Vol -> Tempo -> AS21. Fatigue resistance.",
    [Objective.MARATHON]: "Glycogen & Durability. Cycles: Vol -> Long Blocks AS42 -> Taper (2wks).",
    [Objective.TRAIL_SHORT]: "Eccentric force & D+/h. Cycles: Hill VMA -> Terrain Spec. Proprioception.",
    [Objective.ULTRA_DISTANCE]: "FatMax & Mental. Cycles: Vol -> Back-to-back long runs -> Long Taper.",
    [Objective.MAINTENANCE]: "Fun & Health. Moderate vol, mixed intensities, no pressure."
};

export async function generateDetailedTrainingPlan(formData: FormData, useThinkingMode: boolean): Promise<DetailedTrainingPlan> {
  const ai = getAiClient();
  
  // 1. DATES & TIMING
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
  
  // 2. CONTEXT & PROMPT CONSTRUCTION
  const summary = SCIENTIFIC_SUMMARIES[formData.objective] || "Balanced mix.";
  
  const specificContext = formData.objective === Objective.ULTRA_DISTANCE && formData.ultraDetails
    ? `Ultra ${formData.ultraDetails.distance}, D+${formData.ultraDetails.elevationGain}`
    : formData.objective === Objective.TRAIL_SHORT && formData.trailShortDetails
      ? `Trail ${formData.trailShortDetails.distance}, D+${formData.trailShortDetails.elevationGain}`
      : `Obj ${formData.targetTime}`;

  // TELEGRAPHIC PROMPT FOR SPEED (<15s target)
  const prompt = `
    ROLE: SARC Coach. Generate JSON plan. SPEED IS CRITICAL.
    CTX: ${totalWeeksAvailable} wks (${planStartDate.toISOString().split('T')[0]} to ${formData.targetDate}).
    ATHLETE: ${formData.level}, ${formData.currentVolume}, ${formData.age}yo. Goal: ${formData.objective} (${specificContext}).
    AVAILABILITY: ${formData.availabilityDays.join(', ')}.

    STRUCTURE:
    - Wk 1-${maintenanceWeeks}: Maintenance (if >0).
    - Wk ${maintenanceWeeks + 1}-${totalWeeksAvailable}: Specific Prep.

    RULES (STRICT):
    1. DAYS: Matches availability exactly.
    2. WEDNESDAY (if avail): "Fractionné Surprise". MainBlock: "Surprise – contenu communiqué quelques minutes avant sur le groupe WhatsApp du club." (NO DETAILS). Struct: 20' EF + Surprise + 10' EF.
    3. SUNDAY (if avail): "Run Club - Bois des Hâtes". 10km @ 6:00/km. If Vol > 10k, add EF before/after.
    4. INTENSITY: Warmup/Cooldown ALWAYS "Endurance Fondamentale" (EF). No walking blocks.
    5. PROGRESSION: Follows physiological science for ${formData.objective}.
    
    SCIENCE: ${summary}

    OUTPUT: JSON ONLY. Short precise descriptions (2 sentences max).
  `;

  // Force Flash for speed unless Thinking is explicitly requested
  const model = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
  
  const config: any = {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 8192, // Cap to prevent runaways, sufficient for full plan
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
      config.thinkingConfig = { thinkingBudget: 4096 };
  }

  // Single attempt optimization: Flash is reliable enough.
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
    throw new Error("Échec de la génération du plan. Veuillez réessayer.");
  }
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
  const prompt = `TASK: Optimize plan. User Level: ${plan.userProfile.level}. Feedback: ${formattedFeedback}. OUTPUT: JSON Array (title, suggestion, reasoning).`;
  
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
        config: { ...config, systemInstruction: `Coach SARC. Court et précis.` }
    });
}

export async function getSessionSuggestion(session: DetailedSession, userQuery: string): Promise<string> {
  const ai = getAiClient();
  const prompt = `Ctx: Session ${session.type} on ${session.date}. Query: "${userQuery}". Answer in French, concise.`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return response.text;
}