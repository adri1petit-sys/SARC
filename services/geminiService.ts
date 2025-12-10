import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Objective } from "../types";
import type {
  FormData,
  DetailedTrainingPlan,
  SavedPlan,
  OptimizationSuggestion,
  DetailedSession,
  ChatMessage,
} from "../types";

/*
 * This module provides a single entry point for interacting with the
 * Gemini API to build, optimise and chat about training plans.  It
 * encapsulates all of the domain knowledge defined in
 * training_knowledge.json and exposes a small set of functions to
 * generate and refine programmes.  The implementation has been
 * designed to be easy to read and maintain: logic is broken down
 * into clear sections (knowledge import, rules definition, prompt
 * construction, API invocation and response handling).
 */

/*
 * ---------------------------------------------------------------
 *  Training Knowledge (Inlined)
 * ---------------------------------------------------------------
 *
 * The training knowledge encapsulates the distilled scientific
 * information for each supported discipline. It is inlined here
 * to avoid module resolution issues in browser environments.
 */
const trainingKnowledge = {
  "philosophy": "SARC Training Methodology: Scientific, Progressive, Personalized.",
  "intensity_zones": {
    "EF": "Endurance Fondamentale (Zone 1-2): 60-75% FCM. Conversation facile. Base aérobie.",
    "Seuil": "Seuil Anaérobie (Zone 4): 85-90% FCM. Essoufflement marqué mais stable.",
    "VMA": "Vitesse Maximale Aérobie (Zone 5): 95-100% FCM. Effort très intense.",
    "AS42": "Allure Marathon: 80-85% FCM. Rythme tenue sur 42km.",
    "AS21": "Allure Semi: 85-88% FCM. Rythme soutenu mais contrôlé.",
    "AS10": "Allure 10km: 90-92% FCM. Rythme rapide."
  },
  "weekly_structure": {
    "microcycle": "3 semaines de développement + 1 semaine d'assimilation (-30% volume).",
    "progression": "Augmentation volume max 10% par semaine."
  },
  "sessions_types": {
    "mercredi": "Fractionné Surprise: 15' EF + 20' Bloc Surprise + 15' EF. Le bloc est inconnu à l'avance.",
    "dimanche": "Sortie Longue: Base EF. Intègre souvent le Run Club (10km @ 6:00/km) + extra."
  },
  "rules": {
      "warmup": "Toujours en Endurance Fondamentale (EF).",
      "cooldown": "Toujours en Endurance Fondamentale (EF)."
  }
};

/*
 * ---------------------------------------------------------------
 *  System Rules
 * ---------------------------------------------------------------
 *
 * The systemRules string below governs how the generative model
 * constructs training plans.  It combines strict structural
 * constraints (warm‑up, main block, cool‑down), progressive
 * overload guidance, session scheduling restrictions, and
 * personalisation rules based on level and current training volume.
 *
 * The placeholder %%TRAINING_KNOWLEDGE%% is replaced at runtime
 * with the JSON representation of the training knowledge so that
 * the model always has access to the latest science.
 */
const SYSTEM_RULES_TEMPLATE = `
Tu es COACH SARC, entraîneur expert en planification d’endurance.
Tu dois produire des plans 100 % personnalisés, cohérents avec la science
et STRICTEMENT conformes à la Bible d’entraînement suivante :
%%TRAINING_KNOWLEDGE%%

====================================================================
0) PERSONNALISATION OBLIGATOIRE
====================================================================
Le plan DOIT être entièrement modulé selon :

• Niveau de l’athlète
  - Débutant (VMA < 13 / AS10 > 55')
  - Intermédiaire (VMA 13–17 / AS10 40–55')
  - Avancé (VMA 17–20 / AS10 33–40')
  - Élites (VMA > 20 / AS10 < 33')

• Volume d’entraînement actuel hors prépa
• Volume souhaité pendant la prépa
• Disponibilités (jours d’entraînement possibles)
• Tolérance à la charge (stress de vie, fatigue, sommeil, âge)
• Objectif précis (distance et temps visé)

Chaque plan doit s’adapter parfaitement et ne jamais appliquer
un volume ou une intensité identique à tous les athlètes.

====================================================================
1) STRUCTURE HEBDOMADAIRE IMMUTABLE
====================================================================

1.1 Nombre de séances selon le niveau
Débutants : 3–4 séances
Intermédiaires : 4–5 séances
Avancés : 5–6 séances
Élites : 6–8 séances

Jamais plus, jamais moins.

1.2 Rythme des charges
• Progression hebdomadaire max : +8 % (débutants) / +10 % (intermédiaires) / +12 % (avancés & élites)
• Microcycle obligatoire : 3 semaines de charge + 1 semaine d’assimilation (réduction de 20–30 %)
• Les élites conservent une séance dure même en assimilation.
• Les débutants réduisent l’intensité en assimilation (volume bas + intensité réduite).

1.3 Contenu obligatoire d’une séance
Chaque séance doit impérativement inclure :
  - WARM‑UP : Endurance Fondamentale (EF) 5 à 20 min selon le niveau
  - MAINBLOCK : Contenu principal (conforme à la Bible et adapté au niveau)
  - COOLDOWN : EF 5 à 15 min
  Aucune séance ne peut déroger à cette structure.

====================================================================
2) LOGIQUE DU MERCREDI — RUN CLUB (IMMUTABLE)
====================================================================
Le mercredi est réservé à la séance collective du Run Club.
Règles absolues :
• Type de séance : toujours FRACTIONNÉ Surprise
• Structure obligatoire :
  WARM‑UP : 15 min EF
  MAINBLOCK : 20 min « Fractionné Surprise » (contenu révélé sur WhatsApp – interdit de détailler ou d’inventer)
  COOLDOWN : 15 min EF
• Interdictions : aucune autre forme de séance (AS10, AS21, AS42, seuil, trail, VMA longue) ne peut se substituer au mercredi.

====================================================================
3) SORTIE LONGUE DU DIMANCHE — PERSONNALISÉE AU NIVEAU
====================================================================
Le dimanche est TOUJOURS basé sur la sortie Run Club (10 km @ 6:00/km, Bois des Hâtes, 10h).
Règles absolues :
• Si la Sortie Longue (SL) prévue > 10 km : Ajouter de l'EF avant et/ou après le Run Club pour atteindre le volume cible.
• Si SL <= 10 km : Run Club standard (ou adapté si débutant).
• Allure Run Club : 6:00/km (fixe).
• Structure : Warm-up (EF) + Run Club (10km @ 6:00/km) + Cool-down (EF) si nécessaire.

Interdictions :
• Jamais > 3h10 pour la route (sauf ultra)
• Jamais d’intensité élevée à moins de 14 jours de la course cible

====================================================================
4) RÈGLES PAR OBJECTIF ET PAR NIVEAU
====================================================================

OBJECTIF 5 km :
  Débutants : 1 séance VMA courte (30/30, 45/30), 1 séance seuil léger (8–12 min cumulées), SL 8–12 km.
  Intermédiaires : 1 séance VMA 400–500 m, 1 séance seuil 15–20 min, SL 12–16 km.
  Avancés & Élites : 1 VMA dure + 1 seuil + 1 AS5, SL 14–20 km.

OBJECTIF 10 km :
  Débutants : 1 seuil (10–15 min cumulées), 1 VMA courte (max 8×400 m), SL 10–14 km.
  Intermédiaires : 1 AS10 (6×1000 m ou 3×2000 m), 1 VMA ou seuil, SL 12–18 km.
  Avancés & Élites : 1 AS10 longue (8–10 km cumulés), 1 seuil long, SL 16–22 km.

OBJECTIF SEMI-MARATHON :
  Débutants : 1 seuil (10–15 min), 1 tempo doux, SL 14–20 km.
  Intermédiaires : 1 AS21 (intervalle ou continu), 1 seuil ou tempo, SL 18–24 km.
  Avancés & Élites : 1 AS21 longue (10–14 km cumulés), 1 seuil long ou tempo soutenu, SL 22–28 km.

OBJECTIF MARATHON :
  Débutants : Volume cible 40–55 km, SL 1h30–2h, 1 séance intense par semaine, AS42 très progressif.
  Intermédiaires : Volume cible 55–75 km, SL 1h45–2h15, 1 AS42 + 1 seuil/tempo par semaine.
  Avancés : Volume cible 75–95 km, SL 2h–2h45, 1 AS42 longue (10–15 km cumulés) + 1 seuil long.
  Élites : Volume 90–130 km, SL jusqu’à 3h15, 2 séances spécifiques hebdo, affûtage précis.

OBJECTIF TRAIL COURT (<42 km) :
  Débutants : 1 séance côtes (10×30" ou 8×45"), 1 EF vallonné, SL 1h30–2h.
  Intermédiaires & Avancés : 1 séance seuil en côte, 1 séance puissance montée, SL 2h–3h.
  Élites : Travail excentrique & technique descente, SL 3h avec blocs tempo montée.

OBJECTIF ULTRA :
  Durée en heures, pas en kilomètres. 1 sortie très longue/semaine, 1 week‑end choc toutes les 3 semaines, 1 séance seuil ou AS rando‑course.  Gestion de la fatigue prioritaire.

====================================================================
5) RÈGLES ANTI‑ERREUR (OBLIGATOIRES)
====================================================================
Invalides si :
• Progression hebdomadaire >12 %
• Mercredi ≠ EXACTEMENT « Fractionné Surprise » avec 15' EF + 20' bloc + 15' EF
• Dimanche ≠ Run Club (adapté ou complet)
• Intensités incompatibles avec le niveau
• Volume quotidien anormal (débutant >1h15 ; élite <40 min, sauf récupération)
• Deux séances dures consécutives pour débutants/intermédiaires
• Séance non conforme à la Bible
• Mauvaise place pour AS42/AS21/AS10
• Warm-up manquant (<5 min) ou cooldown manquant (<5 min)

====================================================================
6) RÈGLE ABSOLUE
====================================================================
Toute donnée manquante ou non décrite dans la Bible = "Non applicable selon Bible".  Aucune improvisation n’est permise en dehors du cadre défini.
`;

/*
 * ---------------------------------------------------------------
 *  Utility Functions
 * ---------------------------------------------------------------
 */

/**
 * Retrieve the API key from environment variables.  This function
 * supports both Vite-style import.meta.env, direct process.env,
 * and fallback to undefined.  If no key can be found an error
 * is thrown.
 */
export function getApiKey(): string | undefined {
  try {
    // Vite env (browser)
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_KEY) {
      return (import.meta as any).env.VITE_API_KEY;
    }
    // Vite env (server)
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.API_KEY) {
      return (import.meta as any).env.API_KEY;
    }
    // Node process env
    if (typeof process !== "undefined" && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Failed to retrieve API key", e);
  }
  return undefined;
}

/**
 * Initialise a GoogleGenAI client with the retrieved API key.
 */
function getAiClient() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("La clé API n'est pas configurée.");
  return new GoogleGenAI({ apiKey });
}

/**
 * Given a date, return the Monday of that week.  Used to align
 * training plans to weeks starting on Monday.
 */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // Sunday (0) should map to previous Monday (day 1).
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

/**
 * Safely parse a JSON string.  If parsing fails due to trailing
 * characters or extra text, attempt to isolate the first valid JSON
 * object.  If still failing, propagate the error.
 */
function safeJsonParse<T>(jsonString: string): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (_) {
    // Attempt to extract the first {...} block
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = jsonString.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced) as T;
    }
    throw _;
  }
}

/*
 * ---------------------------------------------------------------
 *  Prompt Builder
 * ---------------------------------------------------------------
 *
 * Build the user prompt given the form data and computed dates.
 * This function does not include the system rules or the training
 * knowledge; those are passed via the systemInstruction to the
 * Gemini API.  Keeping the prompt builder separate makes it easy
 * to adjust the phrasing without touching the core logic.
 */
function buildPrompt(formData: FormData, planStart: Date, totalWeeks: number, maintenanceWeeks: number, specificContext: string): string {
  const startDateIso = planStart.toISOString().split("T")[0];
  return `
Génère un plan complet de ${totalWeeks} semaines.
La préparation commence le ${startDateIso}. Tu DOIS calculer les dates réelles (YYYY-MM-DD) pour chaque séance en suivant ce calendrier.

Profil : ${formData.level}.
Volume actuel : ${formData.currentVolume}.
Volume cible : Selon Bible SARC pour niveau ${formData.level}.
Objectif : ${formData.objective} (${specificContext}).
Disponibilités : ${formData.availabilityDays.join(", ")}.

Structure :
- S1 → S${maintenanceWeeks} : Phase maintien (si applicable)
- S${maintenanceWeeks + 1} → S${totalWeeks} : Préparation spécifique

Respect strict du schéma JSON.
Respect strict des dates du calendrier.
Respect strict de la Bible.
  `;
}

/*
 * ---------------------------------------------------------------
 *  Gemini Interaction Functions
 * ---------------------------------------------------------------
 */

/**
 * Generate a detailed training plan.  This function handles date
 * computation, prompt construction, repeated attempts and safe
 * JSON parsing.  It respects the useThinkingMode flag to choose
 * between the pro and flash models.
 */
export async function generateDetailedTrainingPlan(
  formData: FormData,
  useThinkingMode: boolean
): Promise<DetailedTrainingPlan> {
  const ai = getAiClient();

  // Date calculations
  const today = new Date();
  const targetDate = new Date(formData.targetDate);
  const planStartDate = getMonday(today);
  const totalWeeks = Math.ceil((targetDate.getTime() - planStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (totalWeeks < 1) throw new Error("La date d'objectif est trop proche.");

  // Determine maintenance weeks before the specific block
  const maintenanceWeeks = Math.max(0, totalWeeks - formData.duration);

  // Determine specific context string
  const specificContext = formData.objective === Objective.TRAIL_SHORT && formData.trailShortDetails
    ? `Trail court ${formData.trailShortDetails.distance}km D+${formData.trailShortDetails.elevationGain}`
    : formData.objective === Objective.ULTRA_DISTANCE && formData.ultraDetails
    ? `Ultra ${formData.ultraDetails.distance}km D+${formData.ultraDetails.elevationGain}`
    : `Objectif ${formData.targetTime}`;

  // Build the user prompt
  const userPrompt = buildPrompt(formData, planStartDate, totalWeeks, maintenanceWeeks, specificContext);

  // Prepare the system instructions by injecting the training knowledge
  const systemRules = SYSTEM_RULES_TEMPLATE.replace(
    "%%TRAINING_KNOWLEDGE%%",
    JSON.stringify(trainingKnowledge, null, 2)
  );

  // Choose model
  const modelName = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";

  // Configuration for the request
  const config: any = {
    temperature: 0.7,
    responseMimeType: "application/json",
    systemInstruction: systemRules,
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
                properties: {
                  ef: { type: Type.NUMBER },
                  intensite: { type: Type.NUMBER },
                },
                required: ["ef", "intensite"],
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
          required: ["ef", "seuil", "as10", "as21", "as42", "vma"],
        },
        coachNotes: { type: Type.STRING },
      },
      required: ["plan", "alluresReference", "startDate", "endDate", "raceDate"],
    },
  };

  if (useThinkingMode) {
    config.thinkingConfig = { thinkingBudget: 4096 };
  }

  // Attempt to generate the plan twice if necessary
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [ { text: userPrompt } ],
          },
        ],
        config,
      });
      const jsonText = response.text?.trim() ?? "";
      if (!jsonText) throw new Error("Réponse vide");
      return safeJsonParse<DetailedTrainingPlan>(jsonText);
    } catch (err) {
      console.error("Erreur génération:", err);
      if (attempt === 2) throw err;
    }
  }
  throw new Error("Échec génération");
}

/**
 * Given a saved plan and feedback on completed sessions, ask Gemini
 * to suggest optimisations.  The suggestions returned are parsed
 * directly from JSON.
 */
export async function getPlanOptimizationSuggestions(plan: SavedPlan): Promise<OptimizationSuggestion[]> {
  const ai = getAiClient();

  // Format feedback for the model: list completed sessions with RPE
  const feedbackLines: string[] = [];
  plan.plan.plan.forEach((week, weekIndex) => {
    week.jours.forEach((session, sessionIndex) => {
      const key = `${weekIndex}_${sessionIndex}`;
      const fb = plan.completionStatus[key];
      if (fb?.completed) {
        feedbackLines.push(`- ${session.date}: ${session.type}, RPE ${fb.rpe ?? '-'} / 10.`);
      }
    });
  });
  const formattedFeedback = feedbackLines.length > 0 ? feedbackLines.join("\n") : "Aucun retour.";

  // Construct prompt
  const prompt = `
Optimise ce plan d'entraînement en te basant sur le niveau ${plan.userProfile.level}.
Commentaires de l'athlète :
${formattedFeedback}

Ton objectif est de proposer des améliorations concrètes (sans changer l'objectif de course) au format JSON strict :
[
  {"title": "Titre court", "suggestion": "Proposition détaillée", "reasoning": "Justification scientifique"},
  ...
]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [ { role: "user", parts: [ { text: prompt } ] } ],
      config: {
        systemInstruction: "Coach SARC. Réponds en français.",
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
    const jsonText = response.text?.trim() ?? "";
    return safeJsonParse<OptimizationSuggestion[]>(jsonText);
  } catch (error) {
    throw new Error("Optimisation impossible");
  }
}

/**
 * Generate a chat response.  This function simply forwards the
 * chat history and new message to Gemini with a minimal system
 * instruction instructing it to answer in French as Coach SARC.
 */
export async function generateChatResponse(
  history: ChatMessage[],
  newMessage: string,
  useGoogleSearch: boolean
): Promise<GenerateContentResponse> {
  const ai = getAiClient();
  const config: any = {};
  if (useGoogleSearch) {
    config.tools = [ { googleSearch: {} } ];
  }
  return await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      ...history,
      { role: "user", parts: [ { text: newMessage } ] },
    ],
    config: { ...config, systemInstruction: "Coach SARC. Réponds en français." },
  });
}

/**
 * Suggest a modification for a given session based on a natural
 * language query.  The answer is returned as plain text.
 */
export async function getSessionSuggestion(
  session: DetailedSession,
  userQuery: string
): Promise<string> {
  const ai = getAiClient();
  const prompt = `Context: Change session ${session.type} on ${session.date}. Query: "${userQuery}". Answer in French.`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [ { role: "user", parts: [ { text: prompt } ] } ],
  });
  return response.text ?? "";
}