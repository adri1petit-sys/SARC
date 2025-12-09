import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';
import { Objective } from '../types';

// --- Configuration & Helpers ---

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const getMonday = (d: Date) => {
  const dCopy = new Date(d);
  const day = dCopy.getDay();
  const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dCopy.setDate(diff));
};

const formatDateISO = (d: Date) => d.toISOString().split('T')[0];

const cleanJsonOutput = (text: string): string => {
    let clean = text.trim();
    // Remove markdown code blocks if present
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean;
};

// --- Scientific Bibles (Condensed) ---

const SCIENTIFIC_SUMMARIES: Record<string, string> = {
    [Objective.FIVE_K]: "Focus: VMA (VO2max) & Seuil. Structure: 80% EF, 15% Seuil, 5% VMA. Cycle: Foncier -> VMA courte -> VMA longue -> Affûtage. Séance clé: 10x400m, 5x1000m.",
    [Objective.TEN_K]: "Focus: Soutien VMA & Seuil Anaérobie. Structure: Volume progressif. Séance clé: 6x1000m AS10, 3x2000m Seuil. Maintien VMA court hebdomadaire.",
    [Objective.HALF_MARATHON]: "Focus: Endurance de force & Seuil (LT2). Structure: Sorties longues (1h30-1h45) avec blocs AS21. Fatigue cumulée. Séance clé: 3x3000m AS21, 15km progressif.",
    [Objective.MARATHON]: "Focus: Durabilité, Glycogène, Économie. Structure: Gros volume, Sortie Longue (max 2h30-3h) avec blocs AS42. Taper strict 2 semaines. Séance clé: SL avec 2x30' AS42.",
    [Objective.TRAIL_SHORT]: "Focus: VMA Ascensionnelle, Proprioception, Force excentrique. Structure: D+ intégré aux SL. Fartlek nature. Séance clé: Côtes courtes, Rando-course.",
    [Objective.ULTRA_DISTANCE]: "Focus: FatMax, Endurance mentale, Weekend Choc. Structure: Rando-course, SL très longues, Gestion nutrition. Pas de VMA pure nécessaire. Séance clé: 4h rando-course.",
    [Objective.MAINTENANCE]: "Focus: Plaisir, Santé, Régularité. Structure: 100% plaisir, EF majoritaire, quelques variations d'allure au feeling. Pas de contrainte forte."
};

// --- Main Generation Function ---

export async function generateDetailedTrainingPlan(formData: FormData, useThinkingMode: boolean): Promise<DetailedTrainingPlan> {
  // 1. DATES & TIMING CALCULATION
  const targetDateObj = new Date(formData.targetDate);
  const today = new Date();
  const planStartDate = getMonday(today);
  
  const totalDurationMs = targetDateObj.getTime() - planStartDate.getTime();
  const totalWeeksAvailable = Math.ceil(totalDurationMs / (7 * MS_PER_DAY));
  
  // Basic validation
  if (totalWeeksAvailable < 1) {
      // Fallback to a default 12 weeks if date is weird, or throw but let's try to fix
      console.warn("Date trop proche, ajustement à 8 semaines par défaut.");
  }
  
  const prepDuration = formData.duration || 12;
  const maintenanceWeeks = Math.max(0, totalWeeksAvailable - prepDuration);
  
  // 2. AI GENERATION ATTEMPT
  try {
      const ai = getAiClient();
      const scientificCtx = SCIENTIFIC_SUMMARIES[formData.objective] || SCIENTIFIC_SUMMARIES[Objective.MAINTENANCE];
      
      const prompt = `
        ROLE: Expert Running Coach (SARC).
        TASK: Generate a ${totalWeeksAvailable}-week training plan JSON.
        SPEED: CRITICAL (<15s). NO MARKDOWN. JSON ONLY.

        CONTEXT:
        - Athlete: ${formData.level}, ${formData.age}yo, ${formData.currentVolume}.
        - Goal: ${formData.objective} (${formData.targetTime}).
        - Schedule: ${formData.availabilityDays.join(', ')}.
        - Dates: Start ${formatDateISO(planStartDate)}, Race ${formatDateISO(targetDateObj)}.
        - Scientific Basis: ${scientificCtx}

        PERIODIZATION:
        - Weeks 1-${maintenanceWeeks}: Maintenance (EF + easy strides).
        - Weeks ${maintenanceWeeks + 1}-${totalWeeksAvailable}: Specific Prep (Progressive load -> Taper last 2 wks).

        SARC RULES (IMMUTABLE):
        1. Wednesday (if available): "Fractionné Surprise". MainBlock text MUST be: "Surprise – contenu communiqué quelques minutes avant sur le groupe WhatsApp du club." (Do NOT invent intervals).
        2. Sunday (if available): "Sortie Longue - Run Club". Location: "Bois des Hâtes". Pace: "6:00/km".
        3. Warmup/Cooldown: ALWAYS "Endurance Fondamentale". NO walking/stretching blocks.
        4. Descriptions: Concise (French).

        OUTPUT SCHEMA (JSON):
        {
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "raceDate": "YYYY-MM-DD",
          "maintenanceWeeks": number,
          "alluresReference": { "ef": "", "seuil": "", "as10": "", "as21": "", "as42": "", "vma": "" },
          "plan": [
            {
              "semaine": number,
              "phase": "string",
              "startDate": "YYYY-MM-DD",
              "endDate": "YYYY-MM-DD",
              "volumeTotal": number,
              "repartition": { "ef": number, "intensite": number },
              "resume": "string",
              "jours": [
                {
                  "jour": "Lundi" | "Mardi" | ... ,
                  "date": "YYYY-MM-DD",
                  "type": "string",
                  "contenu": "string",
                  "warmup": "string",
                  "mainBlock": "string",
                  "cooldown": "string",
                  "objectif": "string",
                  "volume": number,
                  "allure": "string",
                  "frequenceCardiaque": "string",
                  "rpe": "string"
                }
              ]
            }
          ],
          "coachNotes": "string"
        }
      `;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Always Flash for speed reliability
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              temperature: 0.5, // Lower temp for structural stability
              candidateCount: 1,
              maxOutputTokens: 8192,
          },
      });

      const jsonText = cleanJsonOutput(response.text);
      if (!jsonText) throw new Error("Empty AI response");
      
      const parsedPlan = JSON.parse(jsonText) as DetailedTrainingPlan;
      
      // Basic validation of the parsed plan
      if (!parsedPlan.plan || !Array.isArray(parsedPlan.plan) || parsedPlan.plan.length === 0) {
          throw new Error("Invalid plan structure");
      }

      return parsedPlan;

  } catch (error) {
      console.error("AI Generation Failed, switching to Fallback Mode:", error);
      // 3. FALLBACK GENERATION (Safety Net)
      // If AI fails, we generate a procedural plan so the user always gets a result.
      return generateFallbackPlan(formData, planStartDate, targetDateObj, totalWeeksAvailable, maintenanceWeeks);
  }
}

// --- Fallback Generator (Procedural) ---

function generateFallbackPlan(
    formData: FormData, 
    startDate: Date, 
    raceDate: Date, 
    totalWeeks: number, 
    maintenanceWeeks: number
): DetailedTrainingPlan {
    
    const plan: DetailedTrainingPlan['plan'] = [];
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Determine number of sessions per week
    const daysAvailable = formData.availabilityDays;
    const daysCount = daysAvailable.length;
    
    // Sort days to ensure chronological order (Lundi = 0 in our logic roughly, or use mapping)
    const weekOrder = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const sortedDays = [...daysAvailable].sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b));

    for (let w = 1; w <= totalWeeks; w++) {
        const weekStart = new Date(startDate.getTime() + (w - 1) * 7 * oneDay);
        const weekEnd = new Date(weekStart.getTime() + 6 * oneDay);
        
        // Phases
        let phase = "Spécifique";
        if (w <= maintenanceWeeks) phase = "Maintien";
        if (w > totalWeeks - 2) phase = "Affûtage";
        if (w === totalWeeks) phase = "Compétition";

        const sessions: DetailedSession[] = [];
        let weekVolume = 0;

        // Base volume curve logic (simplified)
        const baseVol = 20; // km
        const peakVol = 40; // km (would depend on formData.currentVolume in a real engine)
        const progress = Math.min(1, (w - maintenanceWeeks) / (totalWeeks - maintenanceWeeks - 2));
        const currentTargetVol = phase === "Maintien" ? baseVol : (phase === "Affûtage" ? baseVol : baseVol + (peakVol - baseVol) * progress);

        sortedDays.forEach(dayName => {
            const dayIndex = weekOrder.indexOf(dayName); // 0=Lundi, 6=Dimanche
            // Calculate date of the session
            // weekStart is Monday. 
            const sessionDate = new Date(weekStart.getTime() + dayIndex * oneDay);
            const isRaceDay = sessionDate.toISOString().split('T')[0] === raceDate.toISOString().split('T')[0];
            
            let type = "Endurance Fondamentale";
            let contenu = "Footing en aisance respiratoire.";
            let warmup = "";
            let mainBlock = "";
            let cooldown = "";
            let volume = Math.round(currentTargetVol / daysCount);
            
            // SARC Rules application
            if (isRaceDay) {
                type = "COURSE OBJECTIF";
                contenu = `Jour J : ${formData.objective}. Échauffement léger puis course.`;
                volume = formData.objective === Objective.MARATHON ? 42 : 10; // Approx
            } else if (dayName === "Mercredi") {
                type = "Fractionné Surprise";
                warmup = "20' EF progressive";
                mainBlock = "Surprise – contenu communiqué quelques minutes avant sur le groupe WhatsApp du club.";
                cooldown = "10' EF retour au calme";
                contenu = `${warmup}\n${mainBlock}\n${cooldown}`;
                volume = 8;
            } else if (dayName === "Dimanche") {
                type = "Sortie Longue Club";
                contenu = "Sortie au Bois des Hâtes avec le club.";
                volume = Math.round(volume * 1.5);
                if (phase === "Maintien") volume = 10;
                warmup = "EF";
                mainBlock = "10km à 6:00/km (ou allure adaptée)";
                cooldown = "EF si besoin";
            } else if (daysCount > 2 && (dayName === "Mardi" || dayName === "Jeudi")) {
                // Should contain some intensity if specific phase
                if (phase === "Spécifique") {
                    type = "Intensité / Seuil";
                    warmup = "15' EF + Gammes";
                    mainBlock = "3 x 8' au Seuil (R: 2')";
                    cooldown = "10' EF";
                    contenu = `${warmup}\n${mainBlock}\n${cooldown}`;
                }
            }

            sessions.push({
                jour: dayName,
                date: formatDateISO(sessionDate),
                type,
                contenu,
                warmup: warmup || undefined,
                mainBlock: mainBlock || undefined,
                cooldown: cooldown || undefined,
                objectif: type,
                volume,
                allure: type.includes("EF") ? "EF" : "Variable",
                frequenceCardiaque: "Variable",
                rpe: type.includes("EF") ? "3-4" : "7-8"
            });
            
            if (!isRaceDay) weekVolume += volume;
        });

        plan.push({
            semaine: w,
            phase,
            startDate: formatDateISO(weekStart),
            endDate: formatDateISO(weekEnd),
            volumeTotal: weekVolume,
            repartition: { ef: 80, intensite: 20 },
            resume: `Semaine de ${phase} axée sur le volume et la régularité.`,
            jours: sessions
        });
    }

    return {
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(raceDate),
        raceDate: formatDateISO(raceDate),
        maintenanceWeeks,
        plan,
        alluresReference: {
            ef: "6:00-6:30/km",
            seuil: "5:00/km",
            as10: "4:30/km",
            as21: "4:45/km",
            as42: "5:15/km",
            vma: "4:00/km"
        },
        coachNotes: "Plan généré automatiquement (Mode Secours) suite à une indisponibilité temporaire de l'IA. Ce plan respecte néanmoins la structure SARC."
    };
}

// --- Utils & Other Exports ---

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
      return JSON.parse(cleanJsonOutput(response.text)) as OptimizationSuggestion[];
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
