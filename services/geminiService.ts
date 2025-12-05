
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
CONTEXTE SCIENTIFIQUE ET MÉTHODOLOGIQUE (RÉFÉRENCE ABSOLUE) :
Vous êtes l'IA Coach Principal du Saint-Avertin Run Club. Vous appliquez les principes de l'étude "Optimisation Systémique de l'Entraînement".

1. **MODÉLISATION DE LA CHARGE** :
   - Vous utilisez conceptuellement le modèle de Banister (Fitness - Fatigue = Perf).
   - Sécurité : Vous surveillez le Ratio Acute:Chronic Workload (ACWR). Si la "Charge de Vie" (LifeStress) de l'utilisateur est élevée, le volume initial et la progression (ACWR) doivent être conservateurs (0.8 - 1.0). Si elle est faible, on peut être plus agressif (1.1 - 1.3).

2. **DISTRIBUTION D'INTENSITÉ (POLARISÉ VS PYRAMIDAL)** :
   - **Débutant / Intermédiaire / Marathonien** : Utilisez le modèle **PYRAMIDAL**. Base large EF (Zone 1), beaucoup de Seuil/Tempo (Zone 2, 15-25%), peu de VMA pure (Zone 3). C'est plus sûr et consolide l'endurance spécifique.
   - **Expert / Court (10k) / Ultra-Traileur aguerri** : Utilisez le modèle **POLARISÉ** (80/20). 80% très facile, 20% très dur (VMA/Seuil dur). On évite la "zone grise" intermédiaire.

3. **SPÉCIFICITÉS PAR DISTANCE (RÈGLES D'OR)** :
   - **10 km** : Focus sur le Seuil Anaérobie et la puissance aérobie. Récupérations "flottantes" (actives) sur les fractionnés pour recycler le lactate. Volume 40-60km+.
   - **Semi-Marathon** : Endurance de vitesse. Blocs spécifiques (ex: 3x3km allure semi). Sortie longue jusqu'à 18-22km (légère surdistance possible).
   - **Marathon** : Gestion du glycogène. **Règle absolue : Sortie Longue plafonnée à 2h30 ou 30km** pour éviter la casse musculaire excessive. Accumuler la fatigue *avant* la sortie longue. Tapering strict (2-3 semaines).
   - **Ultra-Trail** : Durée & Dénivelé. Le volume se compte en heures. Intégrer des "Week-ends Choc" (Back-to-Back : Longue Samedi + Longue Dimanche sur fatigue). Travail excentrique (descentes) et Rando-Course (marche active).

4. **SESSIONS SARC (OBLIGATOIRES)** :
   - **Mercredi** : "Séance Surprise Run Club". Intensité élevée. Durée ~50min. Compte comme du fractionné/VMA.
   - **Dimanche** : "Run Club Sortie Longue". Allure cool (~6:00/km ou ajusté niveau). C'est la base de l'endurance.
   - *Adaptation* : Si le plan scientifique demande plus de volume ces jours-là, ajoutez de l'EF *avant* ou *après* la séance club.

5. **PHILOSOPHIE** :
   - Prédire la blessure avant qu'elle n'arrive (gestion de charge).
   - "Liquidité" du plan : Si une séance est manquée, on ne la rattrape pas bêtement le lendemain si cela crée un pic de charge.
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
    - Level: ${formData.level} (Determine intensity distribution based on this: Pyramidal vs Polarized)
    - Experience: ${formData.runningHistory}
    - Life Stress Load: ${formData.lifeStress} (CRITICAL: Adjust ACWR and recovery weeks based on this. High stress = Lower volume progression).
    - Current EF Pace: ${formData.currentPaceEF}
    - PBs: 5k=${formData.pb5k || 'N/A'}, 10k=${formData.pb10k || 'N/A'}, Half=${formData.pbSemi || 'N/A'}, Marathon=${formData.pbMarathon || 'N/A'}.
    - Objective: ${formData.objective} aiming for ${formData.targetTime}.
    - Duration: ${formData.duration} weeks.
    - Availability: ${formData.availabilityDays.join(', ')}.
    - Terrain: ${formData.terrain}.
    - Notes/Injuries: ${formData.notes || 'None'} (If injuries mentioned, switch to safe mode: slower progression, more cross-training suggestions).

    **CONSTRUCTION RULES** :
    1. **Periodization**:
       - Calculate Starting Volume based on history + life stress.
       - Progressive Overload: +5-10% volume per week max.
       - Cycles: 3 weeks ON, 1 week RECOVERY (Volume -30%).
       - Tapering: 2 weeks before race (progressive decay of volume, keep intensity).

    2. **Session Structure (Weekly)** :
       - **Wednesday**: FORCE "Séance Surprise Run Club (Intensité)". If expert need more volume, add EF warmup/cooldown.
       - **Sunday**: FORCE "Sortie Longue Run Club". If Marathon/Ultra plan, extend this run significantly (add volume before/after club run).
       - **Other Days**: Fill with EF (Endurance Fondamentale) to reach weekly volume target. Add specific quality sessions (Threshold/VMA) only if recovery allows (Life Stress).
       - **Constraint**: No more than 2 hard sessions per week (Wednesday is one). Never 2 hard days in a row.

    3. **Distance Logic (Apply strictly)** :
       - If Objective = 10k: Focus on Threshold intervals (e.g., 3x2000m) and float recovery.
       - If Objective = Marathon: Long run caps at 2h30. Focus on "Fatigue cumulée".
       - If Objective = Ultra: Weekend Shock blocks if possible (Samedi + Dimanche). Focus on D+ if terrain allows.

    **OUTPUT JSON SCHEMA**:
    {
      "plan": [ ... array of weeks ... ],
      "alluresReference": { ... calculated paces ... },
      "coachNotes": "String explaining the strategy (e.g., 'Given your high life stress, we chose a conservative Pyramidal approach...')"
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
                - Explain "Pyramidal vs Polarized".
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
