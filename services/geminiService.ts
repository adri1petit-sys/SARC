import { GoogleGenAI, Type } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const MAX_RETRIES = 2;

const formatFeedbackForAI = (plan: SavedPlan): string => {
  const feedbackLines: string[] = [];
  plan.plan.plan.forEach((week, weekIndex) => {
    week.jours.forEach((session, sessionIndex) => {
      const key = `${weekIndex}_${sessionIndex}`;
      const feedback = plan.completionStatus[key];
      if (feedback && feedback.completed) {
        let line = `- Semaine ${week.semaine}, ${session.jour} (${session.type}): Complétée.`;
        if (feedback.rpe) {
          line += ` RPE ${feedback.rpe}/10.`;
        }
        if (feedback.notes) {
          line += ` Notes: "${feedback.notes}"`;
        }
        feedbackLines.push(line);
      }
    });
  });
  return feedbackLines.length > 0 ? feedbackLines.join('\n') : "Aucune séance complétée avec retour pour le moment.";
};


export async function generateDetailedTrainingPlan(formData: FormData): Promise<DetailedTrainingPlan> {
  const prompt = `
    You are an expert French running coach ("entraîneur diplômé FFA") for the Saint-Avertin Run Club. Your mission is to create a professional, progressive, and scientifically sound training plan.

    **CRITICAL INSTRUCTION:** Your absolute top priority is to return a valid JSON object that strictly follows the provided schema. Do not include any text, notes, or markdown formatting (like \`\`\`json) before or after the JSON object. The response must be ONLY the JSON.

    **User Profile:**
    - Gender: ${formData.gender}, Age: ${formData.age}, Weight: ${formData.weight} kg, Height: ${formData.height} cm
    - Running History: ${formData.runningHistory}
    - Current Level: ${formData.level}
    - Personal Bests: 5k: ${formData.pb5k || 'N/A'}, 10k: ${formData.pb10k || 'N/A'}, Half-Marathon: ${formData.pbSemi || 'N/A'}, Marathon: ${formData.pbMarathon || 'N/A'}
    - Current Easy Pace (EF): ${formData.currentPaceEF}
    - Objective: ${formData.objective}
    - Target Time: ${formData.targetTime}
    - Available days: ${formData.availabilityDays.join(', ')}
    - Plan Duration: ${formData.duration} weeks
    - Primary Terrain: ${formData.terrain}
    - User Notes/Injuries: ${formData.notes || 'None'}

    **MANDATORY COACHING RULES:**

    1.  **Fixed Club Sessions (Non-Negotiable):**
        *   **Wednesday:** Integrate a **fixed surprise interval session**. The content for this session must be decided by the club coaches on the day, so do NOT detail the intervals.
            *   Set the \`type\` to "Fractionné Run Club – séance surprise".
            *   Set the \`contenu\` to a standard text like "Séance de fractionné surprise avec le Saint-Avertin Run Club (~50 min). Elle sera détaillée par les coachs le jour J."
            *   This core session lasts 50 minutes and represents about 10km of volume. It is ALWAYS counted as a high-intensity workout for the 80/20 calculation.
            *   **Adaptation:** If the plan's total weekly volume requires more distance on Wednesday, you MUST add extra Endurance Fondamentale (EF) *before and/or after* the core 50-minute session. Update the \`contenu\` and total \`volume\` for the day accordingly. For example, for a 70km week, the \`contenu\` might become "+ 3km EF avant + Séance surprise (~50 min) + 2km EF après" and the \`volume\` would be ~15km.
        *   **Sunday:** Integrate an "EF Run Club" session. This is a 10 km endurance run at a comfortable 6:00/km pace. The type must contain "Run Club".
        *   **Adaptation:** If the user's plan requires more volume on these days, add extra Endurance Fondamentale (EF) running *before* or *after* the core club session. For example, if the Sunday long run needs to be 15km, the session content should be \`2.5km EF + (10km EF Run Club @ 6:00/km) + 2.5km EF\`.

    2.  **The 80/20 Principle:**
        *   Strictly structure each week's total volume to be approximately 80% low-intensity (Endurance Fondamentale - EF) and 20% high-intensity (Fractionné, Seuil, VMA).
        *   Calculate and return these percentages in the \`repartition\` object for each week.

    3.  **Progressive Volume & Periodization:**
        *   Calculate a logical starting weekly volume (in km) based on the user's level (e.g., Beginner: 25-40km, Intermediate: 40-60km, Confirmed: 60-80km, Expert: 80-100km).
        *   Increase the weekly volume by about 5-10% each week.
        *   Implement a **regeneration week every 4th week**, reducing total volume by 25-30% and lowering intensity.
        *   The final 1-2 weeks before the objective must be a taper with significantly reduced volume.

    4.  **Workout Structure & Safety:**
        *   Schedule a maximum of two high-intensity sessions per week.
        *   **Never schedule two high-intensity sessions on consecutive days.**
        *   Use the user's available days to distribute the remaining sessions (mostly EF runs) to complete the weekly volume.
        *   All non-rest days must have a session. Fill unused available days with "Repos" or very light active recovery.

    5.  **Pace Calculation & Personalization (Crucial):**
        *   Use the provided PBs and current easy pace (EF) to calculate realistic \`alluresReference\`. The reference paces (EF, threshold, race paces) MUST be consistent with the user's provided times. For example, a runner with a 50-minute 10k PB cannot have an EF pace of 5:00/km.
        *   Adapt the plan's volume and intensity progression based on the user's \`runningHistory\`. A runner with less than a year of experience requires a much slower and more careful progression.
        *   If any injury information is provided in the notes, prioritize safety. Suggest alternative activities or lower-impact sessions if appropriate, and keep the volume progression conservative.
        *   If the user's data seems contradictory (e.g., beginner level with expert PBs), prioritize safety and their stated level. Build a conservative plan and calculate reference paces that are a logical progression from their current easy pace (EF). Make a sensible coaching decision.
        
    **JSON Output Instructions (Strictly follow this schema):**
    - The root object must contain 'plan' and 'alluresReference'.
    - Each 'week' object must have 'semaine', 'jours', 'volumeTotal', 'resume', and 'repartition'.
    - The 'repartition' object must have 'ef' and 'intensite' as numbers.
  `;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  plan: {
                      type: Type.ARRAY,
                      description: "Array of weekly plans.",
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              semaine: { type: Type.INTEGER },
                              jours: {
                                  type: Type.ARRAY,
                                  items: {
                                      type: Type.OBJECT,
                                      properties: {
                                          jour: { type: Type.STRING },
                                          type: { type: Type.STRING },
                                          contenu: { type: Type.STRING },
                                          objectif: { type: Type.STRING },
                                          volume: { type: Type.NUMBER },
                                          allure: { type: Type.STRING },
                                          frequenceCardiaque: { type: Type.STRING },
                                          rpe: { type: Type.STRING },
                                      },
                                      required: ["jour", "type", "contenu", "objectif", "volume"],
                                  },
                              },
                              volumeTotal: { type: Type.NUMBER },
                              repartition: {
                                  type: Type.OBJECT,
                                  properties: {
                                      ef: { type: Type.NUMBER },
                                      intensite: { type: Type.NUMBER }
                                  },
                                  required: ["ef", "intensite"]
                              },
                              resume: { type: Type.STRING },
                          },
                          required: ["semaine", "jours", "volumeTotal", "resume", "repartition"],
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
                  }
              },
              required: ["plan", "alluresReference"],
          },
        },
      });

      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new Error("L'IA a renvoyé une réponse vide. Veuillez simplifier votre demande ou réessayer.");
      }
      const parsedPlan = JSON.parse(jsonText);
      
      if (parsedPlan && Array.isArray(parsedPlan.plan) && parsedPlan.plan.length > 0 && parsedPlan.alluresReference) {
        return parsedPlan as DetailedTrainingPlan;
      } else {
        throw new Error("La structure du plan reçu de l'IA est invalide. Réessayer peut résoudre le problème.");
      }
    } catch (error) {
        console.error(`Erreur lors de la génération (Tentative ${attempt}/${MAX_RETRIES}):`, error);
        if (attempt === MAX_RETRIES) {
            if (error instanceof Error && (error.message.includes("vide") || error.message.includes("invalide"))) {
                throw error;
            }
            throw new Error("La génération du plan a échoué, même après plusieurs tentatives. L'IA a peut-être du mal à créer un plan cohérent pour ce profil. Essayez de vérifier la cohérence de vos informations (niveau, chronos, allure EF) et simplifiez la demande si possible.");
        }
    }
  }

  // Fallback error, should not be reached if MAX_RETRIES > 0
  throw new Error("La génération du plan a échoué.");
}

export async function getPlanOptimizationSuggestions(plan: SavedPlan): Promise<OptimizationSuggestion[]> {
  const formattedFeedback = formatFeedbackForAI(plan);
  const prompt = `
    You are an elite-level French running coach reviewing a runner's progress mid-plan. Your task is to analyze their profile, their assigned plan, and their feedback on completed sessions to provide concrete, actionable suggestions for optimizing the *remainder* of their plan.

    **CRITICAL INSTRUCTION:** Your response MUST be a valid JSON array of objects, strictly following the provided schema. Do not add any extra text or markdown.

    **1. User Profile:**
    - Level: ${plan.userProfile.level}
    - Objective: ${plan.userProfile.objective} at ${plan.userProfile.targetTime}
    - History: ${plan.userProfile.runningHistory}
    - PBs: 5k: ${plan.userProfile.pb5k || 'N/A'}, 10k: ${plan.userProfile.pb10k || 'N/A'}, Half: ${plan.userProfile.pbSemi || 'N/A'}, Marathon: ${plan.userProfile.pbMarathon || 'N/A'}

    **2. Assigned Training Plan Summary:**
    - Total Duration: ${plan.plan.plan.length} weeks
    - Objective: ${plan.userProfile.objective}

    **3. Runner's Log & Feedback (Completed Sessions):**
    ${formattedFeedback}

    **4. Your Task:**
    Based on all this data, provide 2-3 specific suggestions. Focus on:
    - **Pace Adjustments:** Are their EF or interval paces too easy/hard based on RPE?
    - **Volume Changes:** Should they slightly increase or decrease weekly volume?
    - **Recovery:** Are they showing signs of fatigue (e.g. high RPE on easy days)? Suggest adding a rest day or converting an EF run to cross-training.
    - **Mental Strategy:** Offer encouragement based on their notes.
    - **Consistency:** If they are missing sessions, emphasize the importance of consistency.

    For each suggestion, provide a clear title, the suggestion itself, and the reasoning behind it based on the data provided. Be encouraging but realistic, like a real coach. Your response must be an array of objects.
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

      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new Error("L'IA n'a pas pu générer de suggestions pour le moment.");
      }
      
      const suggestions = JSON.parse(jsonText);

      if (Array.isArray(suggestions)) {
          return suggestions as OptimizationSuggestion[];
      } else {
          throw new Error("La réponse de l'IA n'était pas dans le format attendu.");
      }
  } catch(error) {
    console.error("Erreur lors de l'optimisation du plan:", error);
    throw new Error("Désolé, une erreur est survenue lors de l'analyse de votre plan. Veuillez réessayer.");
  }
}