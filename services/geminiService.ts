import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';
import { Objective } from '../types';

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
  
  const ultraContext = formData.ultraDetails 
    ? `ULTRA DETAILS: Type=${formData.ultraDetails.type}, Dist=${formData.ultraDetails.distance}, D+=${formData.ultraDetails.elevationGain}, Terrain=${formData.ultraDetails.terrainType}.`
    : `Objectif: ${formData.objective}`;

  const trailContext = formData.trailShortDetails
    ? `TRAIL COURT DETAILS: Dist=${formData.trailShortDetails.distance}, D+=${formData.trailShortDetails.elevationGain}, Terrain=${formData.trailShortDetails.terrainType}, TempsCible=${formData.trailShortDetails.targetTime || 'Non précisé'}.`
    : '';

  // 2. SÉLECTION DU CONTEXTE SCIENTIFIQUE SELON L'OBJECTIF (LES BIBLES)
  let scientificContext = "";

  if (formData.objective === Objective.FIVE_K) {
      scientificContext = `
      --- BIBLE 5000M (SCIENCE & PERFORMANCE) ---
      1. PHYSIOLOGIE : Effort supra-critique (> Seuil Anaérobie LT2). Facteurs clés : VMA (vVO2max), Économie de course (RE), Tolérance lactique.
      2. ARCHITECTURE : Base (EF + Vitesse pure) -> Construction (VMA + Seuil) -> Spécifique (Allure 5k). Affûtage 7-10 jours (baisse vol 40-60%).
      3. SÉANCES CLÉS : VMA Courte (30/30, 400m), Seuil (Tempo 20'), Neuromusculaire (Force/Plyo).
      4. PROFILS :
         - Débutant : 2-3 séances/sem, Focus Durée.
         - Avancé : 5-7 séances/sem, Polarisation.
      `;
  } else if (formData.objective === Objective.TEN_K) {
      scientificContext = `
      --- BIBLE 10 KM (MATRICE PERFORMANCE) ---
      1. PHYSIOLOGIE : Endurance-Vitesse (90-95% VMA). Facteurs : Fractional Utilization (Seuil), VO2max, Économie.
      2. ARCHITECTURE : Base (EF dominante) -> Spécifique (Progression VTS de 4 à 8 km/séance). Affûtage 1 semaine (-50% vol).
      3. SÉANCES CLÉS : AS10 (6x1000m, Pyramide), Seuil (Tempo 20'), SL avec blocs.
      4. PROFILS :
         - Débutant (Finir) : 2-3 séances, Focus durée.
         - Élite (<35') : 6-8 séances, AS10 longue (3x2000m).
      `;
  } else if (formData.objective === Objective.HALF_MARATHON) {
      scientificContext = `
      --- BIBLE SEMI-MARATHON (MATRICE PERFORMANCE) ---
      1. PHYSIOLOGIE : Effort Aérobie soutenu (~85-90% VO2max, Seuil Anaérobie LT2).
      2. ARCHITECTURE : Base (Volume, EF) -> Spécifique (Seuil/Tempo prédominant, AS21, SL structurée). Affûtage 10-14 jours.
      3. SÉANCES CLÉS : Seuil/Tempo (20-40' continu ou 3x10'), AS21 (3x3000m), SL (1h30-2h00 avec blocs finaux).
      4. PROFILS :
         - Débutant : 2-3 séances, SL progressive.
         - Élite : 7+ séances, Spécial blocks Canova.
      `;
  } else if (formData.objective === Objective.MARATHON) {
      scientificContext = `
      --- BIBLE MARATHON EXPERT ---
      1. PHYSIOLOGIE : Durabilité, Glycogène, Résistance musculaire. Invariants : 80-90% EF, SL obligatoire.
      2. ARCHITECTURE : Base (Volume + Force) -> Spécifique (Intégration AS42 progressive) -> Affûtage (2-3 semaines, baisse exp.).
      3. SÉANCES CLÉS : SL Spécifique (jusqu'à 2h30-3h00 avec blocs AS42), Seuil long, AS42 (3x5km).
      4. PROFILS :
         - Débutant : Pic 40-60km, SL max 2h30 EF.
         - Élite : Pic >110km, SL complexe.
      `;
  } else if (formData.objective === Objective.TRAIL_SHORT) {
      scientificContext = `
      --- BIBLE TRAIL COURT (0-44 KM-EFFORT) ---
      1. PHYSIOLOGIE : Kilomètre-Effort. Ratio D+/Heure, Puissance Aérobie Ascensionnelle, Résistance Excentrique (D-).
      2. ARCHITECTURE : Générale (Base aérobie + VMA plat) -> Spécifique (Intégration D+, Côtes, D-). Affûtage Mécanique (2 sem, réduction D-).
      3. SÉANCES CLÉS : VMA Côte, Seuil Côte, Rando-Course (pentes >15%), Excentrique.
      4. PROFILS :
         - Débutant : 3-4h/sem, D+ 300-600m.
         - Élite : 6-10h/sem, D+ >1300m, VMA côte.
      `;
  } else if (formData.objective === Objective.ULTRA_DISTANCE) {
      scientificContext = `
      --- BIBLE ULTRA-TRAIL (42KM - 160KM+) ---
      1. PHYSIOLOGIE : Intensité 45-60% VO2max. FatMax, Glycogen sparing, Fatigue Centrale (sommeil), Fatigue Périphérique (casse).
      2. ARCHITECTURE : Polarisation 80/20. Weekend Choc (Accumulation fatigue 2 jours). Affûtage long (2-3 sem).
      3. SÉANCES CLÉS : Rando-Course, Weekend Choc, Renforcement Excentrique.
      4. PROFILS :
         - Débutant (50-80k) : 6-10h/sem.
         - Élite : 15-25h/sem, Weekend Choc lourd.
      `;
  } else {
      scientificContext = `
      --- CADRE GÉNÉRAL ENDURANCE ---
      - Polarisation 80/20.
      - Progressivité +10%/semaine.
      - Spécificité croissante.
      `;
  }

  // 3. CONSTRUCTION DU PROMPT
  const prompt = `
    ROLE: Coach Expert Endurance & Physiologie (Haut Niveau), SPÉCIALISTE ${formData.objective}.
    MISSION: Générer un plan d'entraînement 100% personnalisé, respectant STRICTEMENT la BIBLE SCIENTIFIQUE ci-dessous.

    ${scientificContext}

    CONTEXTE UTILISATEUR :
    - Profil : ${formData.gender}, ${formData.age} ans, Niveau ${formData.level}.
    - Volume actuel : ${formData.currentVolume}. Historique : ${formData.runningHistory}.
    - Objectif : ${
      formData.objective === Objective.ULTRA_DISTANCE
        ? ultraContext
        : formData.objective === Objective.TRAIL_SHORT
          ? trailContext
          : `Objectif ${formData.objective} en ${formData.targetTime}`
    }.
    - Dispo Jours : ${formData.availabilityDays.join(', ')}. (${formData.availabilityDays.length} jours/semaine).
    - Stress Vie : ${formData.lifeStress}.
    - Terrain : ${formData.terrain}.

    CONTEXTE CALENDRIER :
    - Date départ plan : ${planStartDate.toISOString().split('T')[0]}
    - Date course : ${formData.targetDate}
    - Total semaines : ${totalWeeksAvailable}
    - Maintien : Semaines 1 à ${maintenanceWeeks}.
    - Prépa : ${prepDuration} semaines.

    RÈGLES IMPÉRATIVES DE GÉNÉRATION :
    1. NOMBRE DE SÉANCES : Tu DOIS générer EXACTEMENT ${formData.availabilityDays.length} séances par semaine pour chaque semaine du plan. (Sauf affûtage extrême si nécessaire, mais rester proche). Si l'utilisateur a 5 jours de dispo, il doit y avoir 5 séances.
    2. SÉANCES FIXES (SARC) :
       - Mercredi : "Fractionné Surprise" (15' EF + 20' Surprise + 15' EF).
       - Dimanche : "Sortie Longue / Run Club" (Base 10km, ajustée selon objectif/bible).
    3. FORMAT SÉANCES :
       - 100% EF : Contenu = 1 ligne (ex: "1h00 EF"). Champs détails vides.
       - Qualité : Contenu structuré (Warmup, MainBlock, Cooldown). Champs détails remplis.
    4. PERSONNALISATION : Adapte le volume et l'intensité au profil (Débutant vs Élite) selon la BIBLE.

    OUTPUT : JSON uniquement.
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