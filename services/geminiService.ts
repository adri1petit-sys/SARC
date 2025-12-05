
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';

// Helper to safely get the API key from various environment sources
export const getApiKey = (): string | undefined => {
    // 1. Check process.env (Standard Node/Bundler/AI Studio)
    try {
        if (typeof process !== 'undefined' && process.env?.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) { /* ignore reference errors */ }

    // 2. Check import.meta.env (Vite/ESM - Standard for Vercel/Netlify deployments)
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.API_KEY) {
             // @ts-ignore
            return import.meta.env.API_KEY;
        }
    } catch (e) { /* ignore */ }
    
    return undefined;
};

const getAiClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("La clé API n'est pas configurée. Si vous êtes sur un site déployé (Vercel, Netlify...), assurez-vous de définir la variable d'environnement 'VITE_API_KEY' (ou 'API_KEY').");
    }
    return new GoogleGenAI({ apiKey });
};

// ---------------------------------------------------------------------------
//  KNOWLEDGE BASE: SYSTEMIC OPTIMIZATION STUDY
// ---------------------------------------------------------------------------
const TRAINING_PHILOSOPHY_CONTEXT = `
CONTEXTE ET REFERENCE SCIENTIFIQUE (ETUDE "OPTIMISATION SYSTEMIQUE"):
Vous êtes l'IA Coach Expert du Saint-Avertin Run Club. Vous basez strictement vos plans sur les principes suivants :

1. MODELE DE CHARGE & SECURITE (ACWR) :
   - Le risque de blessure augmente exponentiellement si le Ratio de Charge Aiguë/Chronique (ACWR) dépasse 1.5.
   - Zone optimale : 0.8 à 1.3.
   - Adaptation à la "Charge Mentale/Stress de Vie" (LifeStress) :
     * STRESS ELEVÉ : ACWR conservateur (0.8 - 1.0), progression volume faible (+5%/semaine max), semaines de décharge fréquentes (toutes les 3 semaines).
     * STRESS FAIBLE : ACWR agressif (1.1 - 1.3), progression standard (+10%/semaine).

2. DISTRIBUTION INTENSITE (POLARISÉ vs PYRAMIDAL) :
   - Débutant / Intermédiaire / Marathonien : MODELE PYRAMIDAL. Base EF (Zone 1) + Beaucoup de Seuil/Tempo (Zone 2, 15-25%) + Peu de VMA (Zone 3). Consolidation de l'endurance spécifique.
   - Expert / 10km / Ultra-Traileur : MODELE POLARISÉ (80/20). 80% EF stricte + 20% Haute Intensité (Zone 3). On évite la "zone grise" intermédiaire pour maximiser le stimulus.

3. ARCHITECTURE PAR DISTANCE (SCIENTIFIQUE) :
   - 10 km : Focus Puissance Aérobie & Tolérance Lactate. Séances clés : Répétitions longues (ex: 3x2000m) à allure cible. Récupération "flottante" (active) pour recycler le lactate.
   - Semi : Endurance de vitesse. Séances : Blocs seuil (ex: 3x3km). Sortie longue max 18-22km (légère surdistance possible en EF).
   - Marathon : Gestion glycogène & Résilience. REGLE D'OR : Sortie longue PLAFONNÉE à 2h30 ou 30km (au-delà, risque de casse > bénéfice). Focus sur "Fatigue cumulée" (séances la veille). Tapering strict 2-3 semaines.
   - Ultra-Trail : Durée & D+/D-. Volume en heures. "Week-end Choc" (Back-to-Back : Samedi + Dimanche). Travail excentrique (descente) et Rando-course.

4. REGLES IMMUABLES DES SEANCES CLUB (SARC) - PRIORITÉ ABSOLUE :
   A. MERCREDI "SEANCE SURPRISE" (Structure OBLIGATOIRE) :
      - Base : 15' EF (Échauffement) + 20' Corps de séance (Fractionné/VMA/Seuil/Côtes) + 15' EF (Retour au calme). Total 50'.
      - Adaptation volume : Si le plan exige plus de volume, ajouter de l'EF *AVANT* ou *APRES* ce bloc de 50', sans JAMAIS modifier le cœur (15+20+15).
   B. DIMANCHE "SORTIE LONGUE" (Structure OBLIGATOIRE) :
      - Base : 10h00 Bois des Hâtes. ~10km à ~6:00/km (Allure conviviale/Sociale).
      - Adaptation volume : Si le plan exige une sortie longue > 10km (ex: Marathon 2h30 ou Ultra), ajouter le volume manquant en EF *AVANT* (pré-fatigue) ou *APRES* la sortie club.

5. GESTION DES IMPREVUS (Liquidité) :
   - Si une séance clé est manquée, ne pas la rattraper au détriment de la récupération. Lisser la charge sur 10-14 jours.
`;

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


export async function generateDetailedTrainingPlan(formData: FormData, useThinkingMode: boolean): Promise<DetailedTrainingPlan> {
  const ai = getAiClient();
  const prompt = `
    ${TRAINING_PHILOSOPHY_CONTEXT}

    **MISSION** :
    Create a highly personalized, scientifically optimized training plan for the following runner.
    Return ONLY a valid JSON object matching the schema. No markdown, no intro text.

    **USER PROFILE (PHYSIOLOGICAL INPUTS)** :
    - Gender: ${formData.gender}, Age: ${formData.age}
    - Level: ${formData.level}
    - Experience: ${formData.runningHistory}
    - Life Stress Load: ${formData.lifeStress} (CRITICAL: Adjust ACWR and recovery weeks based on this. High stress = Lower volume progression, more deload).
    - Current EF Pace: ${formData.currentPaceEF}
    - PBs: 5k=${formData.pb5k || 'N/A'}, 10k=${formData.pb10k || 'N/A'}, Half=${formData.pbSemi || 'N/A'}, Marathon=${formData.pbMarathon || 'N/A'}.
    - Objective: ${formData.objective} aiming for ${formData.targetTime}.
    - Duration: ${formData.duration} weeks.
    - Availability: ${formData.availabilityDays.join(', ')}.
    - Terrain: ${formData.terrain}.
    - Notes/Injuries: ${formData.notes || 'None'} (If injuries mentioned, switch to safe mode: slower progression).

    **DECISION MATRIX (APPLY STRICTLY)**:
    1. **INTENSITY DISTRIBUTION**:
       - IF Objective = "10 km" OR "Trail Court" OR "Trail Long" OR Level = "Expert" -> USE POLARIZED MODEL (80% Easy / 20% Hard, minimal Zone 2).
       - IF Objective = "Marathon" OR "Semi-Marathon" OR Level = "Débutant" -> USE PYRAMIDAL MODEL (Solid Zone 1 base, significant Zone 2 Tempo/Threshold work).

    2. **SARC SESSION RULES (IMMUTABLE)**:
       - **WEDNESDAY**: MUST be "Séance Surprise Run Club". Structure: 15' Warmup + 20' Interval Block + 15' Cooldown.
         * Content of 20' block: Choose varied intensities (VMA 30/30, Threshold 3x6', Hills) adapted to the weekly goal.
         * Volume Adjustment: If user needs more volume, ADD EF BEFORE or AFTER the session in the description.
       - **SUNDAY**: MUST be "Sortie Longue Run Club". Base: 10km @ ~6:00/km (Bois des Hâtes).
         * Volume Adjustment: IF Long Run needs to be longer (e.g. 20km for Marathon), instruction MUST BE "Courir X km AVANT la séance club" or "Prolonger APRES".
    
    3. **PERIODIZATION**:
       - Calculate Starting Volume safely based on history.
       - Cycles: 3 weeks PROGRESSION, 1 week RECOVERY (-30% volume).
       - Tapering: 2 weeks before race.

    **OUTPUT JSON SCHEMA**:
    {
      "plan": [ ... array of weeks ... ],
      "alluresReference": { ... calculated paces ... },
      "coachNotes": "String explaining the strategy (e.g., 'Given your High Life Stress, we chose a conservative Pyramidal approach. Note the extra volume added BEFORE the Sunday club run to hit your marathon endurance target.')"
    }
  `;

  const model = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
  const config: any = {
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
              },
              coachNotes: { type: Type.STRING }
          },
          required: ["plan", "alluresReference"],
      },
  };

  if (useThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config,
      });

      const jsonText = response.text.trim();
      if (!jsonText) {
        throw new Error("L'IA a renvoyé une réponse vide.");
      }
      const parsedPlan = JSON.parse(jsonText);
      
      if (parsedPlan && Array.isArray(parsedPlan.plan)) {
        return parsedPlan as DetailedTrainingPlan;
      } else {
        throw new Error("Structure JSON invalide.");
      }
    } catch (error) {
        console.error(`Tentative ${attempt} échouée:`, error);
        if (attempt === MAX_RETRIES) throw error;
    }
  }
  throw new Error("Échec de la génération.");
}

export async function getPlanOptimizationSuggestions(plan: SavedPlan): Promise<OptimizationSuggestion[]> {
  const ai = getAiClient();
  const formattedFeedback = formatFeedbackForAI(plan);
  const prompt = `
    ${TRAINING_PHILOSOPHY_CONTEXT}

    **TASK**: Act as the Expert SARC Coach. Analyze the runner's log to optimize the REST of the plan.
    
    **CONTEXT**:
    - User Profile: ${plan.userProfile.level}, Obj: ${plan.userProfile.objective}.
    - Life Stress: ${plan.userProfile.lifeStress} (Important for fatigue analysis).
    - Feedback Log:
    ${formattedFeedback}

    **ANALYSIS LOGIC (LIQUID PLANNING)**:
    1. **ACWR Check**: If the user missed big sessions, do NOT suggest squeezing them into next week (Risk of spike). Suggest a "Smooth Re-entry" (Liquidity).
    2. **Fatigue Detection**: Look for keywords like "lourd", "dur", "sommeil", "stress" in notes. If present, suggest a "Deload" or "Recovery Week" immediately, even if not scheduled.
    3. **Pace Adjustment**: If RPE is low on hard sessions, suggest recalibrating VMA/Threshold up.

    **OUTPUT**: JSON Array of suggestions.
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
    console.error("Optimization error", error);
    throw new Error("Impossible d'optimiser le plan pour le moment.");
  }
}

export async function generateChatResponse(history: ChatMessage[], newMessage: string, useGoogleSearch: boolean): Promise<GenerateContentResponse> {
    const ai = getAiClient();
    const config: any = {};
    if (useGoogleSearch) config.tools = [{googleSearch: {}}];
    
    const contents = [...history, { role: 'user', parts: [{ text: newMessage }] }];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            ...config,
            systemInstruction: `
                ${TRAINING_PHILOSOPHY_CONTEXT}
                You are the SARC AI Coach. You help runners understand their plan using the scientific principles above.
                - Explain "Why" (Why slow running makes you fast? Mitochondria/Lipolysis).
                - Explain "Pyramidal vs Polarized" if relevant to the user's plan.
                - Be encouraging but scientific.
                - Always answer in French.
            `,
        }
    });

    return response;
}

export async function getSessionSuggestion(session: DetailedSession, userQuery: string): Promise<string> {
  const ai = getAiClient();
  const prompt = `
    ${TRAINING_PHILOSOPHY_CONTEXT}
    **Context**: User wants to change this session: ${session.type} (${session.volume}km).
    **Query**: "${userQuery}"
    **Rule**: Proposed alternative must keep the same physiological stimulus (e.g. if VMA session -> propose Interval on Bike or Treadmill, not just easy jog).
    Answer in French, Markdown.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return response.text;
}
