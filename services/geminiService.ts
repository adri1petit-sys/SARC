import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { FormData, DetailedTrainingPlan, SavedPlan, OptimizationSuggestion, DetailedSession, ChatMessage } from '../types';
import { Objective } from '../types';

/* ===========================================================
   🔥 BIBLE SCIENTIFIQUE SARC — INLINE
=========================================================== */
const trainingKnowledge =
{
  "trail_court": {
    "invariants": [
      "Le trail court est défini par la notion de kilomètre‑effort (0–44 km‑effort). L'IA doit quantifier la charge en tenant compte du dénivelé positif (D+) pour chaque séance, car le D+ transforme la dépense énergétique même sur des distances courtes.",
      "La distribution des intensités est polarisée ou pyramidale : 75–80 % du volume total doit se faire en zone 1 ou zone 2 (endurance fondamentale) pour construire la base aérobie ; les zones supérieures (Z3‑Z5) ne représentent que ~20 % et sont réservées au travail de seuil et de VMA.",
      "Les séances doivent se dérouler sur terrain vallonné et intégrer des tests de VO2max sur plan incliné pour refléter la réalité de la discipline.",
      "Un cycle de préparation s’étend sur 8 à 20 semaines selon l’expérience ; la micro‑périodisation suit un schéma 3 semaines de charge / 1 semaine allégée (réduction de volume).",
      "Le renforcement musculaire (quadriceps, ischios, tronc) et la proprioception sont indispensables (1 à 2 séances hebdomadaires) pour prévenir les blessures dues aux descentes et aux impacts répétitifs."
    ],
    "zones_intensite": {
      "Z1": {
        "nom": "Endurance récupération",
        "%VMA": "<60%",
        "%FCM": "50–70%",
        "objectif": "vascularisation et récupération",
        "durée": "variable"
      },
      "Z2": {
        "nom": "Endurance fondamentale (EF)",
        "%VMA": "60–80%",
        "%FCM": "70–85%",
        "objectif": "développement de la capacité aérobie et de l'économie de course",
        "durée": "≥60 min"
      },
      "Z3": {
        "nom": "Seuil/Tempo",
        "%VMA": "80–90%",
        "%FCM": "85–95%",
        "objectif": "tolérance au lactate et endurance de seuil",
        "durée": "20 à 60 min (répétitions longues)"
      },
      "Z4": {
        "nom": "Résistance/VMA longue",
        "%VMA": "90–97%",
        "%FCM": ">95%",
        "objectif": "développement de la puissance aérobie (VO2max)",
        "durée": "2 à 6 min (répétitions)"
      },
      "Z5": {
        "nom": "VMA courte / puissance",
        "%VMA": "97–105%",
        "%FCM": ">97%",
        "objectif": "vitesse et puissance maximale",
        "durée": "30 s à 2 min (répétitions)"
      }
    },
    "structure_hebdo_par_niveau": {
      "debutant": {
        "seances_par_semaine": "3–4",
        "volume": "basé sur la durée, généralement 3–5 h",
        "contenu": [
          "Deux footings en endurance fondamentale (Z1/Z2)",
          "Une séance de VMA courte (30 s à 1 min) sur plat ou faible côte pour entretenir la VMA",
          "Une séance de renforcement général (gainage, squats, proprioception)",
          "Sortie longue ≤1 h30 sur terrain vallonné pour s'habituer au dénivelé"
        ]
      },
      "intermediaire": {
        "seances_par_semaine": "4–5",
        "volume": "4–6 h",
        "contenu": [
          "Footings en EF majoritaires (Z1/Z2)",
          "Séance de seuil/tempo en côte (3–5 min répétitions) pour développer l'endurance de force",
          "Sortie longue 2–3 heures intégrant rando‑course sur les portions raides",
          "Séance de renforcement spécifique (exercices unipodaux) et proprioception",
          "Cross‑training (vélo/natation) pour ajouter du volume sans impact"
        ]
      },
      "avance": {
        "seances_par_semaine": "5–8",
        "volume": "6 h et plus",
        "contenu": [
          "Deux séances de qualité : VMA en côte (10×30 s ou 20×15 s) et travail excentrique lourd ou pliométrie",
          "Sorties longues ≥3 h, véritables simulations de course avec gestion du matériel et test nutritionnel",
          "Footings et rando‑course pour accumuler le volume en endurance",
          "Renforcement musculaire ciblé (quadriceps, ischios, tronc) 1–2 fois/semaine"
        ]
      }
    },
    "periodisation": {
      "macrocycle": "8 à 20 semaines selon l'expérience (plus long pour les novices)",
      "phases": {
        "generale": "40–50 % du plan : accumulation de volume en EF et développement/entretien de la VMA sur terrain plat ou légèrement vallonné, renforcement général",
        "specifique": "40–50 % du plan : charge maximale incluant travail excentrique, puissance en côte et sorties longues simulant la course avec D+ important",
        "taper": "10–15 jours de réduction du volume (réduction progressive) tout en maintenant l'intensité via de courtes fractions pour arriver frais le jour J"
      },
      "microcycle": "Schéma 3 semaines de charge croissante suivies d’une semaine allégée (20–30 % de réduction)"
    },
    "seances_cles": {
      "VMA_cote": [
        "10×30 s montée / 40 s descente",
        "20×15 s montée / 15 s récupération"
      ],
      "tempo_monte": [
        "3–6 répétitions de 3–5 min à Z3/Z4 avec récupération active"
      ],
      "excentrique": [
        "Musculation excentrique pour quadriceps (presse en descente contrôlée)",
        "Fentes avant avec descente lente et contrôle",
        "Mollets : montée à deux pieds, descente lente sur un pied"
      ],
      "plyometrie": [
        "Sauts avant/arrière",
        "Cloche‑pied et sauts en longueur",
        "Exercices proprioceptifs sur terrain instable"
      ],
      "taper": "Réduire le volume de 40–80 % sur 2–3 semaines tout en conservant la fréquence et quelques rappels d’intensité (courtes fractions Z4/Z5)"
    }
  },
  "5km": {
    "invariants": [
      "La performance sur 5 km est majoritairement aérobie (~90–95 %), avec des contributions anaérobies lors du départ et du sprint final.",
      "L’entraînement suit une distribution 80/20 : environ 80 % du volume en endurance facile (zones E/M) et 20 % en intensité (Seuil, VO2max, répétitions).",
      "Le volume hebdomadaire et la progression doivent suivre la règle des 10 % (ne pas augmenter de plus de 10 % par semaine) et inclure une semaine d’assimilation (réduction de 20–30 %) toutes les 3–4 semaines.",
      "La préparation s’organise en 3 phases : développement général (base), développement spécifique et phase de spécificité/affûtage, sur un cycle total de 8–12 semaines."
    ],
    "zones_intensite": {
      "E": {
        "nom": "Endurance (Easy)",
        "%VMA": "<75%",
        "objectif": "développement de la base aérobie et récupération"
      },
      "M": {
        "nom": "Marathon pace",
        "%VMA": "75–80%",
        "objectif": "endurance soutenue, base aérobie"
      },
      "T": {
        "nom": "Threshold (Tempo)",
        "%VMA": "80–90%",
        "objectif": "amélioration du seuil lactique, capacité à soutenir l’effort"
      },
      "I": {
        "nom": "Interval VO2max",
        "%VMA": "95–100%",
        "objectif": "développement de la puissance aérobie"
      },
      "R": {
        "nom": "Répétition (Anaérobie)",
        "%VMA": ">100%",
        "objectif": "vitesse pure, recrutement neuromusculaire"
      }
    },
    "structure_hebdo_par_niveau": {
      "debutant": {
        "seances_par_semaine": "2–3",
        "volume": "10–25 km (1h30–2h30)",
        "contenu": [
          "Alternance marche/course pour atteindre progressivement 30 min de course continue",
          "Footings en aisance respiratoire",
          "Fartlek très léger (jeux de vitesse aux sensations)",
          "Pas de VMA formelle à ce stade"
        ]
      },
      "intermediaire": {
        "seances_par_semaine": "4–5",
        "volume": "30–50 km",
        "contenu": [
          "Introduction d’une séance VMA (ex : 12×400 m)",
          "Séance tempo de 20 min au seuil",
          "Sortie longue hebdomadaire (~1h15)",
          "Footings en endurance et récupération"
        ]
      },
      "avance": {
        "seances_par_semaine": "5–7",
        "volume": "50–80 km",
        "contenu": [
          "Deux séances de qualité par semaine (VMA et Seuil)",
          "Sortie longue 16–20 km à allure soutenue",
          "Possibilité de doubles séances occasionnelles pour augmenter le volume",
          "Reste des séances en endurance active ou récupération"
        ]
      },
      "elite": {
        "seances_par_semaine": "9–13",
        "volume": "110–160+ km",
        "contenu": [
          "Modèle norvégien : double seuil 2× par semaine",
          "Séances spécifiques en côte et pentes",
          "Sortie longue très active (22–28 km)",
          "Gestion précise de la récupération (p. ex. doubles quasi quotidiens)"
        ]
      }
    },
    "periodisation": {
      "macrocycle": "8–12 semaines",
      "phases": {
        "phase1": "Semaines 1 à 4 : développement général – volume en endurance, strides, hill sprints, fartlek non structuré",
        "phase2": "Semaines 5 à 9 : développement spécifique – introduction des séances VMA courtes/moyennes, travail au seuil, augmentation du volume de la sortie longue",
        "phase3": "Semaines 10 à 12 : spécificité et affûtage – séances à allure 5 km (5×1000 m, pyramides), réduction du volume global, maintien de l’intensité"
      },
      "microcycle": "2 séances de qualité par semaine séparées par des jours de récupération ; assimilation toutes les 3–4 semaines avec réduction de volume"
    },
    "seances_cles": {
      "vma": [
        "Billat 30/30 (10×30 s à 100% VMA / 30 s récup)",
        "12×400 m à 105 % VMA (récup 1' à 1'30)",
        "5–6×800 m à I‑pace (récup 2 min)"
      ],
      "tempo": [
        "20–30 min continu à T‑pace",
        "Cruise intervals : 4×1600 m à T‑pace avec récup 1–2 min"
      ],
      "specific_5k": [
        "5×1000 m à allure 5 km avec récup 2 min",
        "Pyramide 400–800–1000–800–400 m",
        "Double seuil norvégien : 2 séances de 6×6 min au seuil à 8 h d'intervalle"
      ],
      "force_et_ppg": [
        "Musculation lourde (>80 % 1RM) pour membres inférieurs",
        "Plyométrie (sauts, bounds, box jumps)",
        "Renforcement du tronc et des hanches (monster walks, ponts unipodaux)"
      ],
      "taper": "Réduction du volume de 30–40 % durant les 10 derniers jours ; maintien de 1–2 séances d’intensité (ex : 3×400 m à allure 5k) et de strides"
    }
  },
  "10km": {
    "invariants": [
      "Le 10 km se court à une intensité très élevée (90–95 % VMA) pendant 30 à 60 min ; la VO2max, le seuil lactique et l’économie de course sont les trois déterminants majeurs de la performance.",
      "Le modèle 80/20 s’applique : environ 80 % du volume en Endurance Fondamentale (EF) et 20 % en intensité (Seuil, AS10, VMA).",
      "Il faut éviter la zone modérée (75–80 % FCM) qui génère de la fatigue sans adaptation ; l’entraînement doit alterner des intensités basses et très hautes.",
      "Les plans s’organisent en micro‑cycles (semaine type) avec deux séances de qualité par semaine séparées par des jours d’EF et en méso‑cycles de 3 semaines de charge + 1 semaine de récupération réduite de 20–30 %."
    ],
    "structure_hebdo_par_niveau": {
      "debutant": {
        "seances_par_semaine": "2–3",
        "volume": "10–25 km",
        "contenu": [
          "Majorité en EF (85–90 %)",
          "Séances de marche-course ou fractionné très léger (ex : 2×15 min EF avec 10 min marche)",
          "Séance courte avec de brèves accélérations (2×1 min rapide/1 min lent)",
          "Sortie longue 5–8 km en progression"
        ]
      },
      "intermediaire": {
        "seances_par_semaine": "3–4",
        "volume": "25–45 km",
        "contenu": [
          "Introduction d’une séance VMA (ex : 6×400 m)",
          "Séance AS10 modérée (ex : 4×4 min à allure 10 km, récup 1 min)",
          "Sortie longue 7–9 km incluant un bloc à allure spécifique (2 km à AS10)",
          "Volume d’EF représentant 75–85 % du total"
        ]
      },
      "avance": {
        "seances_par_semaine": "5–6",
        "volume": "45–80 km",
        "contenu": [
          "Séance emblématique AS10 : 6–8×1000 m à allure 10 km (récup 1–2 min)",
          "Séances métaboliques combinant Seuil et AS10 (ex : 15 min au seuil + 3–4×1000 m AS10)",
          "Sortie longue 10–14 km incluant des blocs spécifiques longs",
          "Travail de seuil prolongé et variations d’allure"
        ]
      },
      "elite": {
        "seances_par_semaine": "6–8 (souvent doubles)",
        "volume": "80–140+ km",
        "contenu": [
          "AS10 longue : 3–4×2000 m à allure 10 km",
          "Séances pyramidales complexes (400–800–1200–1600–1600–1200–800–400 m)",
          "Double séances pour accumuler du volume en EF tout en maintenant des blocs de haute intensité",
          "Gestion précise des récupérations (1/3 du temps d’effort)"
        ]
      }
    },
    "periodisation": {
      "macrocycle": "8–12 semaines",
      "phases": {
        "generale": "Construction de la base (volume EF élevé) et développement de la VMA",
        "specifique": "Consolidation du seuil lactique et travail à l’allure 10 km",
        "taper": "2 semaines de réduction de volume (20–30 % la première semaine, 30–40 % la seconde) tout en gardant de courtes séances d’intensité"
      },
      "microcycle": "2 séances de qualité par semaine (VMA/AS10) avec des jours d’EF entre ; méso‑cycle de 3 semaines de charge + 1 semaine de récupération"
    },
    "seances_cles": {
      "AS10_emblematique": "6–8×1000 m à allure 10 km avec 1–2 min de récupération active (1/3 du temps d’effort)",
      "intervalles_courts": "15–20×400 m à allure 10 km ±5–10 s/km, récup 200 m trot",
      "pyramide_ultra": "Structure complexe 400–800–1200–1600–1600–1200–800–400 m pour travailler le VO2max et la résistance mentale",
      "seuil_metabolique": "Séances combinant seuil et AS10 (ex : 15 min au seuil + 3–4×1000 m AS10)",
      "sortie_longue_mixte": "10–14 km avec segments à allure spécifique insérés (ex : 2 × 2 km AS10 ou finish accéléré)"
    }
  },
  "semi_marathon": {
    "invariants": [
      "Le semi‑marathon est quasi entièrement aérobie (~97–98 %) et couru à ~85–90 % VO2max (proche du seuil lactique).",
      "La répartition de l’intensité suit une logique ~70–80 % Endurance Fondamentale et ~20 % séance de qualité (Seuil, VO2max, Allure semi).",
      "La progression doit être graduelle, particulièrement pour les débutants, avec des cycles de 8–16 semaines incluant des phases générale, spécifique et d’affûtage.",
      "L’intégration du renforcement musculaire, de la récupération active et des semaines allégées est indispensable pour prévenir les blessures et optimiser l’adaptation."
    ],
    "structure_hebdo_par_niveau": {
      "debutant": {
        "seances_par_semaine": "3 (éventuellement 4 en fin de plan)",
        "volume": "15–45 km/sem",
        "contenu": [
          "Endurance fondamentale quasi omniprésente (2×45 min ou plus)",
          "Séance de fractionné très léger (ex : 8×1 min rapide/1 min lent ou 5×400 m à allure 5 km)",
          "Sortie longue hebdomadaire 1h30–1h45 en progressant de 60 min au début",
          "Renforcement musculaire général (20–30 min de PPG, éducatifs et gainage)",
          "Possibilité d’alterner course et marche pour atteindre la durée cible"
        ]
      },
      "intermediaire": {
        "seances_par_semaine": "4–5",
        "volume": "40–70+ km",
        "contenu": [
          "Volume d’EF représentant 75–85 % du total, avec variations (endurance active, progressif)",
          "Séance hebdomadaire VO2max : 5×1000 m à allure 5 km (récup 400 m) ou 12×400 m",
          "Séance hebdomadaire tempo/seuil : 20–30 min à allure seuil ou blocs (3×10 min) ; intégration de portions à allure semi (2×4 km AS21)",
          "Sortie longue 1h30–1h45 (18–22 km) intégrant parfois 30 min à allure marathon ou semi",
          "Cross‑training léger (vélo, natation) en récupération active"
        ]
      },
      "avance": {
        "seances_par_semaine": "6",
        "volume": "60–80+ km",
        "contenu": [
          "Fractionnés VO2max avancés : 6×1000 m ou 5×1200 m à allure 5 km, récup active",
          "Tempo prolongé : 40 min consécutives au seuil ou 2×20 min, combiné parfois avec blocs à allure semi",
          "Séances spécifiques allure semi : 3×3000 m ou 2×5000 m à AS21, voire 4×4 km à 100–102 % AS21 pour athlètes très aguerris",
          "Sorties longues étendues jusqu’à 20–25 km incluant des segments à allure semi ou marathon",
          "Musculation ciblée et cross‑training optionnel pour ajouter du volume sans surcharger l’appareil locomoteur"
        ]
      },
      "elite": {
        "seances_par_semaine": "6–7 (souvent doubles)",
        "volume": "100–150+ km",
        "contenu": [
          "Double séances avec cumuls importants de km à haute intensité (plusieurs blocs AS21 et VO2max)",
          "Séances très longues à 95 % AS21 (ex : 15 km en continu à 95 % AS21)",
          "Entraînement croisé et musculation en soutien",
          "Gestion précise de l’affûtage et du carb‑loading",
          "Affûtage sur 2 semaines : réduction de 30 % puis 20–30 % du volume tout en conservant l’intensité"
        ]
      }
    },
    "periodisation": {
      "macrocycle": "8–16 semaines (16 semaines pour les débutants, 10–12 semaines pour les expérimentés)",
      "phases": {
        "generale": "Phase de base axée sur l’endurance fondamentale, le renforcement musculaire et quelques rappels de VMA",
        "intermediaire": "Phase de construction – introduction de fractionnés VO2max et allongement de la sortie longue",
        "specifique": "Phase spécifique orientée allure semi : intensification des séances au seuil et à AS21, affinement de l’économie de course",
        "taper": "Affûtage sur 2 semaines : réduire le volume de 30 % puis 20–30 %, maintenir 1–2 séances rapides (par ex 6×400 m à allure 5 km à J‑10 et 3×1000 m à allure semi à J‑5)"
      },
      "microcycle": "2 séances de qualité par semaine (VO2max + seuil/semi) séparées par EF ; intégration d’une sortie longue ; semaines allégées toutes les 3–4 semaines"
    },
    "seances_cles": {
      "vo2max": "5×1000 m à allure 5 km (récup 400 m) ou 12×400 m à allure 3 km (récup 1 min)",
      "tempo": "20–30 min à allure seuil ou 2×15 min ; variantes incluant 2×4 km à allure semi",
      "specific_semi": "3×3000 m, 2×5000 m ou 4×4 km à 100–102 % AS21 avec récupérations courtes",
      "long_run": "Sorties longues 18–25 km, souvent progressives ou avec segments à allure marathon/semi",
      "taper": "Réduction du volume de 30 % à J‑14 puis encore 20–30 % à J‑7 ; conserver 1–2 séances d’intensité pour maintenir le tonus"
    }
  },
  "marathon": {
    "invariants": [
      "La performance marathon dépend de la capacité à soutenir une haute fraction de VO2max tout en préservant les réserves énergétiques. L'entraînement doit privilégier 80–90 % de volume en endurance fondamentale (Zones 1/2).",
      "La sortie longue est le stimulus central pour développer la puissance lipidique et l'endurance neuromusculaire.",
      "La distribution d’intensité doit éviter la zone modérée ; un modèle polarisé/pyramidal est recommandé.",
      "La préparation se termine par un affûtage de 2–3 semaines durant lequel la charge diminue progressivement mais l’intensité est maintenue."
    ],
    "structure_hebdo_par_niveau": {
      "debutant": {
        "seances_par_semaine": "3–4",
        "volume": "progressif (40–60 km environ)",
        "contenu": [
          "Footings en endurance fondamentale et cross‑training (1–2 séances)",
          "Une séance rythme : 3×8 min à allure semi‑marathon avec récup 2 min",
          "Sortie longue 1h45–2h15 en aisance totale, tester nutrition et hydratation",
          "Renforcement musculaire et gammes pour prévenir les blessures"
        ]
      },
      "intermediaire": {
        "seances_par_semaine": "4–5",
        "volume": "60–80 km",
        "contenu": [
          "Footings EF avec quelques blocs à allure marathon (AS42)",
          "Séances tempo/seuil (ex : 3×2000–3000 m) pour repousser le SV2",
          "Sorties longues atteignant 2h30–2h45 en incluant 20 min à allure marathon en fin de séance",
          "Cross‑training en récupération active si nécessaire"
        ]
      },
      "avance": {
        "seances_par_semaine": "6 (parfois plus)",
        "volume": "70–100+ km",
        "contenu": [
          "Séance Seuil : 4×3000 m à allure seuil/semi avec récup 2 min",
          "Footing endurance 1h15–1h30",
          "Séance AS42 sur fatigue : 1h10 dont 40 min à allure marathon",
          "Sortie longue spécifique 2h30–3h (32–35 km) avec structure 1h15 EF + 2×20 min AS42 + finish accéléré",
          "Renforcement musculaire et gammes"
        ]
      },
      "elite": {
        "seances_par_semaine": "10–14 (bi‑quotidien)",
        "volume": ">160 km",
        "contenu": [
          "Spécial blocks à allure marathon et légèrement au‑dessus (ex : 10–15 km à 95–105 % AS42)",
          "Grandes variations d’intensité : jours très faciles vs jours très durs",
          "Long runs 30–40 km souvent avec blocs rapides et variations continues",
          "Cross‑training utilisé de manière stratégique si nécessaire"
        ]
      }
    },
    "periodisation": {
      "macrocycle": "12–16 semaines",
      "phases": {
        "phase1": "Semaines 1 à 6 : développement général – augmentation du volume, renforcement musculo‑tendineux, VMA et seuil aérobie",
        "phase2": "Semaines 7 à 12 : développement spécifique – sorties longues maximales, séances au seuil lactique qui s’allongent (ex : 3×5000 m), travail d’allure marathon (AS42)",
        "taper": "Affûtage de 2–3 semaines : réduction progressive du volume (20–25 % puis 40 % puis 60 %) tout en maintenant des blocs à allure marathon ou seuil"
      },
      "microcycle": "2–3 séances de qualité par semaine (Seuil, AS42, VMA) ; semaines d’assimilation avec réduction de volume toutes les 3–4 semaines"
    },
    "seances_cles": {
      "progressive_long_run": "Sortie longue progressive : commencer en zone 1 et finir les derniers 3–5 km à allure marathon ou légèrement plus vite",
      "bloc_AS42": "10–18 km à allure marathon (peut être réalisé en un bloc continu ou en fractions 2×5–8 km)",
      "cruise_intervals": "Intervalles longs au seuil : 2–3×2000 m à 5000 m (ou 3×5000 m) avec récup 2–3 min",
      "yasso_800": "10×800 m à allure 800 m (R=1:1), indicateur empirique de la forme marathon",
      "dress_rehearsal": "Sortie longue 20–25 km 3–4 semaines avant la course reproduisant exactement les conditions du jour J"
    }
  },
  "ultra_trail": {
    "invariants": [
      "L’ultra‑trail se caractérise par un effort à intensité modérée (45–60 % VO2max) favorisant l’oxydation des lipides ; l’entraînement doit privilégier le temps passé (heures) et l’accumulation de dénivelé positif (D+) plutôt que la distance.",
      "La distribution d’intensité suit un modèle pyramidal : 80–85 % du temps à basse intensité (Zones 1/2) et <10 % à haute intensité (Z4/5).",
      "Le cross‑training (vélo, ski de fond, natation) est recommandé pour augmenter le volume hebdomadaire sans accroître le stress mécanique.",
      "Un cycle de préparation s’étale sur 16–32 semaines avec des micro‑cycles de 3 semaines de charge suivies d’une semaine de récupération (réduction de 50 %).",
      "Le renforcement musculaire, l’entraînement excentrique pour les descentes, la nutrition/gut training et la résilience mentale sont des composantes essentielles."
    ],
    "structure_hebdo_par_niveau": {
      "debutant": {
        "seances_par_semaine": "3–4",
        "volume": "6–10 heures",
        "contenu": [
          "2 sorties en endurance fondamentale sur terrain vallonné",
          "1 sortie longue 3–5 heures (25–40 km‑effort) avec 1500–3000 m D+",
          "1 séance de renforcement ou cross‑training (vélo) pour réduire l’impact"
        ]
      },
      "intermediaire": {
        "seances_par_semaine": "4–5",
        "volume": "10–14 heures",
        "contenu": [
          "3 sorties course (EF + travail tempo en montée)",
          "Sortie longue 5–7 heures (3000–5000 m D+)",
          "Weekend choc léger (enchaînement de 2 longues sorties) toutes les 2–4 semaines",
          "Séance de renforcement ciblé et/ou cross‑training"
        ]
      },
      "avance": {
        "seances_par_semaine": "5–6",
        "volume": "14–18 heures",
        "contenu": [
          "3 sorties spécifiques en course, dont une séance de puissance/VMA en côte et une séance de travail excentrique et de force/pliométrie",
          "Sorties longues 7–9 heures ou weekends chocs lourds",
          "Volume D+ 5000–7000 m",
          "Renforcement ciblé (quadriceps, ischios, tronc) et proprioception"
        ]
      },
      "elite": {
        "seances_par_semaine": "6–7",
        "volume": "18–25+ heures",
        "contenu": [
          "Volume d’endurance élevé avec mix de course et cross‑training",
          "Longues sorties jusqu’à 10 heures souvent sous forme de weekend choc",
          "D+ 7000–10000+ m",
          "Intégration de séances à haute intensité (Z4/Z5) très brèves pour maintenir la VMA",
          "Renforcement intensif et nutrition/gut training avancés"
        ]
      }
    },
    "periodisation": {
      "macrocycle": "16–32 semaines",
      "phases": {
        "generale": "Développement de la base aérobie en EF, accumulation progressive de volume horaire et de D+ ; intégration de cross‑training",
        "specifique": "Augmentation du volume long (weekends chocs) et intégration de séances de puissance/VMA en côte et d’entraînement excentrique ; travail nutritionnel (ravitaillements en course)",
        "taper": "2–3 semaines de réduction du volume de 40–80 % ; maintien de la fréquence des séances et d’efforts courts en Z4/Z5 pour conserver la VMA"
      },
      "microcycle": "3 semaines de charge progressive suivies d’une semaine de récupération avec réduction de 50 % du volume"
    },
    "seances_cles": {
      "long_runs": "Sorties longues de 3–10 heures selon le niveau, avec focus sur l’accumulation de D+ et la simulation de course (gestion de l’alimentation, du matériel et du rythme)",
      "weekend_choc": "Enchaînement de deux longues sorties (ex : 5 h + 3 h) pour tester la tolérance digestive et renforcer la résilience mentale",
      "vma_cote": "Séances courtes et intenses en côte (ex : 10×30 s / 40 s de récup, 20×15 s / 15 s)",
      "tempo_cote": "Répétitions de 3–5 min en montée à Z3/Z4 avec récup active",
      "excentrique": "Musculation excentrique et pliométrie ciblées pour préparer les quadriceps et les mollets aux descentes",
      "gut_training": "Simulation de l’apport glucidique en course : consommation de 70–90 g/h de glucides en sortie longue, test des boissons et aliments (purées, bouillons)"
    }
  }
};

/* ===========================================================
   API KEY
=========================================================== */
export const getApiKey = (): string | undefined => {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_KEY)
      return (import.meta as any).env.VITE_API_KEY;

    if (typeof import.meta !== "undefined" && (import.meta as any).env?.API_KEY)
      return (import.meta as any).env.API_KEY;

    if (typeof process !== "undefined" && process.env?.API_KEY)
      return process.env.API_KEY;
  } catch (e) {
    console.warn("Failed to retrieve API key", e);
  }
  return undefined;
};

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("La clé API n'est pas configurée.");
  return new GoogleGenAI({ apiKey });
};

/* ===========================================================
   DATE UTILS
=========================================================== */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getMonday = (d: Date) => {
  const c = new Date(d);
  const day = c.getDay();
  const diff = c.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(c.setDate(diff));
};

/* ===========================================================
   RÉSUMÉS SCIENTIFIQUES (Décision rapide)
=========================================================== */
const SCIENTIFIC_SUMMARIES: Record<string, string> = {
  [Objective.FIVE_K]: "Focus : VMA + économie. Structure : Base > Spécifique > Affûtage.",
  [Objective.TEN_K]: "Focus : Endurance-vitesse. Structure : Base > Seuil > AS10.",
  [Objective.HALF_MARATHON]: "Focus : LT2 + endurance. Structure : Volume > Tempo > AS21.",
  [Objective.MARATHON]: "Focus : durabilité. Structure : EF > AS42 > Long runs.",
  [Objective.TRAIL_SHORT]: "Focus : D+, force excentrique, VMA côte.",
  [Objective.ULTRA_DISTANCE]: "Focus : volume horaire + D+, FatMax.",
  [Objective.MAINTENANCE]: "Focus : santé,EF, continuité."
};

/* ===========================================================
   GÉNÉRATION DU PLAN
=========================================================== */
export async function generateDetailedTrainingPlan(
  formData: FormData,
  useThinkingMode: boolean
): Promise<DetailedTrainingPlan> {
  const ai = getAiClient();

  const today = new Date();
  const target = new Date(formData.targetDate);
  const planStart = getMonday(today);

  const totalWeeks = Math.ceil((target.getTime() - planStart.getTime()) / (7 * MS_PER_DAY));
  if (totalWeeks < 1) throw new Error("La date d'objectif est trop proche.");

  const maintenanceWeeks = Math.max(0, totalWeeks - formData.duration);

  const specificContext =
    formData.objective === Objective.TRAIL_SHORT && formData.trailShortDetails
      ? `Trail court ${formData.trailShortDetails.distance}km D+${formData.trailShortDetails.elevationGain}`
      : formData.objective === Objective.ULTRA_DISTANCE && formData.ultraDetails
      ? `Ultra ${formData.ultraDetails.distance}km D+${formData.ultraDetails.elevationGain}`
      : `Objectif ${formData.targetTime}`;

  /* SYSTEM INSTRUCTION */
  const systemInstruction = `
Tu es COACH SARC, entraîneur expert en planification d’endurance.  
Tu dois produire des plans 100 % personnalisés, cohérents avec la science et  
STRICTEMENT conformes à la Bible d’entraînement suivante :  
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
• Disponibilités (séances possibles / impossibles)  
• Tolérance à la charge (fatigue, récup, âge, antécédents)  
• Objectif précis (temps visé + date)  

Tout plan doit s’adapter parfaitement et ne jamais appliquer  
un volume ou une intensité identique pour tous.

====================================================================
1) STRUCTURE HEBDOMADAIRE IMMUTABLE
====================================================================

1.1 Nombre de séances selon le NIVEAU  
Débutants : 3–4 séances  
Intermédiaires : 4–5 séances  
Avancés : 5–6 séances  
Élites : 6–8 séances  

Jamais plus, jamais moins.

1.2 Rythme des charges  
• Progression hebdo max : +8 % (débutants) / +10 % (inter) / +12 % (avancés & élite)  
• Microcycle obligatoire : 3 charges + 1 assimilation (-20 à -30 %)  
• Les élites conservent une séance dure même en assimilation.  
• Les débutants réduisent l’intensité en assimilation (volume bas + intensité réduite).  

1.3 Contenu obligatoire d’une séance  
Chaque séance doit impérativement inclure :  
- **warmup** EF (5 à 20 min selon niveau)  
- **mainBlock** (structure conforme Bible + niveau)  
- **cooldown** EF (5 à 15 min)  

Aucune séance ne peut déroger à cette structure.

====================================================================
2) LOGIQUE DU MERCREDI — RUN CLUB (IMMUTABLE)
====================================================================
Le mercredi = séance collective Run Club.  
C’est TOUJOURS un **fractionné surprise**.

Structure obligatoire :
- warmup : 15 min EF  
- mainBlock : 20 min « Fractionné Surprise (contenu révélé sur WhatsApp) »  
- cooldown : 15 min EF  

INTERDICTIONS :
- Ne JAMAIS décrire, préciser ou inventer le contenu du fractionné.  
- Ne JAMAIS transformer le mercredi en séance AS10 / AS21 / AS42.  
- Ne JAMAIS modifier durées warmup / bloc / cooldown.

====================================================================
3) SORTIE LONGUE DU DIMANCHE — PERSONNALISÉE AU NIVEAU
====================================================================

Débutants : 60 à 90 minutes  
Intermédiaires : 90 à 120 minutes  
Avancés : 1h45 à 2h30  
Élites : 2h15 à 3h10 (marathon) / jusqu’à 5h (ultra)

Règles absolues :
- Toujours EF + un bloc spécifique selon l’objectif  
- Run Club du dimanche : 10 km @ 6:00/km intégrés si applicable  
- Jamais d’intensité élevée à moins de 14 jours d’une course cible  
- JAMAIS de sortie longue > 3h10 pour route (élites exceptées selon Bible)

====================================================================
4) RÈGLES PAR OBJECTIF & PAR NIVEAU
====================================================================

====================================================================
OBJECTIF 5 KM — personnalisé selon niveau
====================================================================

Débutants :
- 1 séance VMA courte (30/30, 45/30, 15×30/30)  
- 1 séance seuil léger (8–12 min totaux)  
- SL 8–12 km tranquille  
- Pas d’intensité 2 jours de suite  

Intermédiaires :
- 1 séance VMA (400–500 m, pyramides courtes)  
- 1 séance seuil 15–20 min cumulés  
- SL 12–16 km  

Avancés/Élites :
- 1 VMA dure + 1 seuil + 1 AS5  
- SL 14–20 km  
- Travail neuromusculaire autorisé (minisprints inscrits dans EF)

====================================================================
OBJECTIF 10 KM — personnalisé selon niveau
====================================================================

Débutants :
- 1 seuil (10–15 min cumulés)  
- 1 VMA (8×400 m max)  
- SL 10–14 km  

Intermédiaires :
- 1 AS10 (6×1000, 3×2000)  
- 1 VMA ou seuil  
- SL 12–18 km  

Avancés/Élites :
- 1 AS10 (8–10 km cumulés)  
- 1 seuil long  
- SL 16–22 km  

Mercredi = Fractionné Surprise obligatoire.

====================================================================
OBJECTIF SEMI-MARATHON — personnalisé selon niveau
====================================================================

Débutants :
- 1 seuil (10–15 min cumulés)  
- 1 séance tempo douce  
- SL 14–20 km  

Intermédiaires :
- 1 AS21 (interval vs continuous selon fatigue)  
- 1 seuil ou tempo  
- SL 18–24 km  

Avancés/Élites :
- 1 AS21 longue (10–14 km cumulés / 2×5 km / 3×4 km)  
- 1 seuil long ou tempo soutenu  
- SL 22–28 km  

====================================================================
OBJECTIF MARATHON — PERSONNALISÉ SELON NIVEAU
====================================================================

Débutants :
- Volume cible : 40–55 km  
- Sortie longue 1h30–2h  
- 1 séance intensité max par semaine  
- AS42 très progressif  

Intermédiaires :
- Volume cible : 55–75 km  
- SL 1h45–2h15  
- 1 AS42 + 1 seuil ou tempo  
- Assimilations fréquentes  

Avancés :
- Volume cible : 75–95 km  
- SL 2h–2h45  
- 1 AS42 longue (10–15 km cumulés)  
- 1 seuil long  

Élites :
- Volume 90–130 km  
- SL jusqu’à 3h15 (jamais plus sauf ultra)  
- 2 séances spécifiques / semaine  
- S-3/S-2/S-1 respect strict de la Bible  
- AS42 12–20 km cumulés  

====================================================================
OBJECTIF TRAIL COURT < 42 KM
====================================================================
Débutants :
- 1 séance côtes (10×30", 8×45")  
- 1 EF vallonné  
- SL 1h30–2h  

Intermédiaires / Avancés :
- 1 séance seuil en côte  
- 1 séance puissance / montée rapide  
- SL 2h–3h  

Élites :
- Travail excentrique & technique descente  
- SL 3h avec blocs tempo montée  

====================================================================
OBJECTIF ULTRA
====================================================================
Toujours raisonné en heures, pas en km.  
Structure :  
- 1 sortie très longue / semaine  
- 1 week-end choc toutes les 3 semaines  
- 1 séance seuil ou AS rando-course  
- Gestion fatigue prioritaire  
- Volumes ➝ adaptés strictement au niveau + historique de charge  

====================================================================
5) RÈGLES ANTI-ERREUR (OBLIGATOIRES)
====================================================================
Le plan est INVALIDÉ automatiquement et doit être reconstruit si :

• + de 12 % de progression / semaine  
• Mercredi ≠ EXACTEMENT Fractionné Surprise  
• Dimanche ≠ Sortie Longue  
• Intensités incompatibles avec le niveau  
• Volume quotidien anormal (débutant > 1h15 ; élite < 40 min hors régénération)  
• Deux séances dures collées (interdit pour débutants et intermédiaires)  
• Séance non autorisée par la Bible  
• AS42 / AS21 / AS10 placée un jour inadapté  
• Cooldown manquant  
• Warmup < 10 min pour une séance intense (sauf débutants = 5–10 min)

====================================================================
6) RÈGLE ABSOLUE
====================================================================
Toute donnée manquante = « Non applicable selon Bible ».  
Aucune improvisation n’est permise en dehors du cadre défini.

  `;

  /* USER PROMPT */
  const prompt = `
Génère un plan complet de ${totalWeeks} semaines.
La préparation commence le ${planStart.toISOString().split('T')[0]}. Tu DOIS calculer les dates réelles (YYYY-MM-DD) pour chaque séance en suivant ce calendrier.

Profil : ${formData.level}.
Volume actuel : ${formData.currentVolume}.
Volume cible : Selon Bible SARC pour niveau ${formData.level}.
Objectif : ${formData.objective} (${specificContext}).
Disponibilités : ${formData.availabilityDays.join(", ")}.

Structure :
- S1 → S${maintenanceWeeks} : Phase maintien (Si applicable)
- S${maintenanceWeeks + 1} → S${totalWeeks} : Préparation spécifique

Respect strict du schéma JSON.
Respect strict des dates du calendrier.
Respect strict de la Bible.
  `;

  const model = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";

  const config: any = {
    temperature: 0.7,
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

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  systemInstruction.replace(
                    "%%TRAINING_KNOWLEDGE%%",
                    JSON.stringify(trainingKnowledge, null, 2)
                  ) +
                  "\n\n" +
                  prompt
              }
            ]
          }
        ],
        config
      });

      const txt = res.text.trim();
      return JSON.parse(txt) as DetailedTrainingPlan;

    } catch (e) {
      console.error("Erreur génération", e);
      if (attempt === 2) throw e;
    }
  }

  throw new Error("Échec de génération après plusieurs tentatives.");
}

/* ===========================================================
   OPTIMISATION
=========================================================== */
export async function getPlanOptimizationSuggestions(plan: SavedPlan): Promise<OptimizationSuggestion[]> {
  const ai = getAiClient();

  const feedback = Object.entries(plan.completionStatus)
    .map(([k, fb]) => (fb?.completed ? `Session ${k}: RPE ${fb.rpe}` : null))
    .filter(Boolean)
    .join("\n") || "Aucun retour.";

  const prompt = `
Optimize training plan based on athlete feedback.
Feedback:
${feedback}
Format: JSON array of { title, suggestion, reasoning }.
  `;

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(res.text.trim());
}

/* ===========================================================
   CHAT
=========================================================== */
export async function generateChatResponse(
  history: ChatMessage[],
  newMsg: string,
  useGoogleSearch: boolean
): Promise<GenerateContentResponse> {
  const ai = getAiClient();
  const config: any = {};
  if (useGoogleSearch) config.tools = [{ googleSearch: {} }];

  return await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [...history, { role: "user", parts: [{ text: newMsg }] }],
    config: { ...config, systemInstruction: "Coach SARC. Réponds en français." }
  });
}

/* ===========================================================
   SESSION SUGGESTION
=========================================================== */
export async function getSessionSuggestion(session: DetailedSession, query: string): Promise<string> {
  const ai = getAiClient();

  const prompt = `Modify session ${session.type} on ${session.date}. Query: "${query}".`;

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });

  return res.text;
}
