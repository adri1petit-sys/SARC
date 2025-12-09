import React, { useState, useEffect } from 'react';
import { Objective, Level, Gender, Terrain, RunningHistory, LifeStress, CurrentVolume } from '../types';
import type { FormData, DetailedTrainingPlan, UltraDetails, TrailShortDetails } from '../types';
import { generateDetailedTrainingPlan } from '../services/geminiService';

const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
    <div className="w-full bg-gray-700/50 rounded-full h-2.5 mb-8 relative overflow-hidden">
        <div className="bg-[#00AFED] h-2.5 rounded-full transition-all duration-500" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
    </div>
);

const GlowButton: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean; className?: string }> = ({ onClick, children, disabled = false, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-8 py-3 text-lg font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none glow-shadow-hover ${className}`}
    >
        {children}
    </button>
);

const OptionCard: React.FC<{ label: string; isSelected: boolean; onClick: () => void, size?: 'small' | 'normal' }> = ({ label, isSelected, onClick, size='normal' }) => (
    <div
        onClick={onClick}
        className={`cursor-pointer border rounded-2xl transition-all duration-300 text-center ${size === 'normal' ? 'p-6 text-lg' : 'p-3 text-base'} ${
            isSelected ? 'bg-[#00AFED]/20 border-[#00AFED] glow-shadow' : 'bg-white/5 border-white/10 hover:border-white/30'
        }`}
    >
        {label}
    </div>
);

const DAYS_OF_WEEK = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface GeneratorPageProps {
    onPlanGenerated: (plan: DetailedTrainingPlan, formData: FormData) => void;
    onCancel: () => void;
}

const GeneratorPage: React.FC<GeneratorPageProps> = ({ onPlanGenerated, onCancel }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        // Step 1
        gender: Gender.MALE, age: 30, weight: 75, height: 180,
        // Step 2
        level: Level.INTERMEDIATE,
        runningHistory: RunningHistory.ONE_TO_THREE_YEARS,
        currentVolume: CurrentVolume.TWENTY_TO_FORTY, // Default
        // Step 3
        pb5k: '', pb10k: '', pbSemi: '', pbMarathon: '',
        currentPaceEF: '6:00/km',
        // Step 4
        objective: Objective.TEN_K,
        ultraDetails: undefined,
        trailShortDetails: undefined,
        // Step 5
        targetTime: "45 minutes",
        // Step 6: Date
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 3 months out
        // Step 7
        availabilityDays: ["Mardi", "Jeudi", "Samedi"],
        duration: 12, // Default duration
        // Step 8
        terrain: Terrain.ROAD,
        lifeStress: LifeStress.MEDIUM, 
        notes: ""
    });
    
    const [ultraForm, setUltraForm] = useState<UltraDetails>({
        type: "Trail",
        distance: "50 km",
        targetTime: "8h00",
        elevationGain: "1500m",
        terrainType: "Mixte"
    });

    const [trailShortForm, setTrailShortForm] = useState<TrailShortDetails>({
        distance: "25 km",
        elevationGain: "1000m",
        terrainType: "Mixte",
        targetTime: "3h30",
    });

    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("Analyse de votre profil...");

    const isUltra = formData.objective === Objective.ULTRA_DISTANCE;
    const isTrailShort = formData.objective === Objective.TRAIL_SHORT;

    useEffect(() => {
        if (isUltra) {
            setFormData(prev => ({ ...prev, ultraDetails: ultraForm, trailShortDetails: undefined }));
        } else if (isTrailShort) {
            setFormData(prev => ({ ...prev, trailShortDetails: trailShortForm, ultraDetails: undefined }));
        } else {
            setFormData(prev => ({ ...prev, ultraDetails: undefined, trailShortDetails: undefined }));
        }
    }, [isUltra, isTrailShort, ultraForm, trailShortForm]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setProgress(0);
        
        // Message initial dépendant de l'objectif
        if (formData.objective === Objective.FIVE_K) {
            setLoadingMessage("Calcul de la VMA et des allures spécifiques...");
        } else if (formData.objective === Objective.TEN_K) {
            setLoadingMessage("Analyse AS10 et Seuil Lactique...");
        } else if (formData.objective === Objective.HALF_MARATHON) {
            setLoadingMessage("Calibration Seuil Anaérobie et Économie de course...");
        } else if (formData.objective === Objective.MARATHON) {
            setLoadingMessage("Modélisation de la durabilité et du glycogène...");
        } else if (formData.objective === Objective.TRAIL_SHORT) {
            setLoadingMessage("Analyse du Ratio D+/Heure et charge excentrique...");
        } else if (formData.objective === Objective.ULTRA_DISTANCE) {
            setLoadingMessage("Planification FatMax et Weekend Choc...");
        } else {
            setLoadingMessage("Initialisation du plan...");
        }

        try {
            const generatedPlan = await generateDetailedTrainingPlan(formData, useThinkingMode);
            setProgress(100);
            onPlanGenerated(generatedPlan, formData);
        } catch (err) {
            setError((err as Error).message || 'An unknown error occurred.');
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (isGenerating) {
            const duration = useThinkingMode ? 8000 : 4000; 
            const intervalTime = 100;
            const steps = duration / intervalTime;
            let currentStep = 0;

            const interval = setInterval(() => {
                currentStep++;
                const newProgress = (currentStep / steps) * 100;
                setProgress(Math.min(newProgress, 99));

                // Messages dynamiques selon l'objectif
                const is5k = formData.objective === Objective.FIVE_K;
                const is10k = formData.objective === Objective.TEN_K;
                const isSemi = formData.objective === Objective.HALF_MARATHON;
                const isMarathon = formData.objective === Objective.MARATHON;
                const isTrailShort = formData.objective === Objective.TRAIL_SHORT;
                const isUltra = formData.objective === Objective.ULTRA_DISTANCE;

                if (newProgress < 30) {
                    setLoadingMessage("Synchronisation du calendrier réel...");
                } else if (newProgress < 60) {
                    if (is5k) setLoadingMessage("Structuration des blocs VMA & Seuil...");
                    else if (is10k) setLoadingMessage("Calibration du volume AS10...");
                    else if (isSemi) setLoadingMessage("Planification des blocs au Seuil et AS21...");
                    else if (isMarathon) setLoadingMessage("Planification des sorties longues...");
                    else if (isTrailShort) setLoadingMessage("Intégration du travail en côte...");
                    else if (isUltra) setLoadingMessage("Calcul des volumes horaires et D+...");
                    else setLoadingMessage("Génération des semaines d'entraînement...");
                } else if (newProgress < 85) {
                    if (is5k) setLoadingMessage("Intégration du travail neuromusculaire...");
                    else if (is10k) setLoadingMessage("Optimisation de la fraction de VO2max...");
                    else if (isSemi) setLoadingMessage("Ajustement de la récupération...");
                    else if (isMarathon) setLoadingMessage("Vérification des ratios de charge...");
                    else if (isTrailShort) setLoadingMessage("Calcul de l'affûtage mécanique...");
                    else if (isUltra) setLoadingMessage("Optimisation de la gestion du sommeil et nutrition...");
                    else setLoadingMessage("Finalisation des séances...");
                } else {
                    setLoadingMessage("Derniers ajustements...");
                }

                if (currentStep >= steps) clearInterval(interval);
            }, intervalTime);
            return () => clearInterval(interval);
        }
    }, [isGenerating, useThinkingMode, formData.objective]);

    if (isGenerating) {
         return (
            <div className="text-center py-20 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                <div className="w-full max-w-md">
                     <h2 className="text-4xl font-bold mt-8 text-white mb-4">{loadingMessage}</h2>
                    <div className="w-full bg-gray-700/50 rounded-full h-4 mb-2 relative overflow-hidden border border-white/10">
                        <div className="bg-[#00AFED] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xl text-gray-300 mt-2 font-mono">{progress.toFixed(0)}%</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10">
                <div className="bg-black/20 backdrop-blur-md border border-[#FF38B1] rounded-3xl p-12 shadow-2xl glow-shadow-pink max-w-3xl mx-auto animate-fade-in">
                    <h2 className="text-4xl font-bold text-[#FF38B1]">Une erreur est survenue</h2>
                    <p className="text-xl text-gray-300 mt-4 max-w-2xl mx-auto">{error}</p>
                    <div className="flex justify-center gap-4 mt-8">
                        <button onClick={onCancel} className="px-6 py-2 text-base text-gray-300 rounded-full hover:bg-white/10 transition-colors">Annuler</button>
                        <GlowButton onClick={() => setError(null)}>Réessayer</GlowButton>
                    </div>
                </div>
            </div>
        );
    }

    const renderStep = () => {
         switch (step) {
            case 1: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">👤 Votre Profil Physiologique</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Sexe</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.values(Gender).map(g => <OptionCard key={g} label={g} size="small" isSelected={formData.gender === g} onClick={() => setFormData(f => ({ ...f, gender: g }))} />)}
                            </div>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Âge</label>
                            <input type="number" value={formData.age} onChange={e => setFormData(f => ({...f, age: +e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Poids (kg)</label>
                            <input type="number" value={formData.weight} onChange={e => setFormData(f => ({...f, weight: +e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Taille (cm)</label>
                            <input type="number" value={formData.height} onChange={e => setFormData(f => ({...f, height: +e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"/>
                        </div>
                    </div>
                </div>
            )
            case 2: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🏃‍♂️ Votre Expérience de Course</h2>
                    <label className="block mb-2 text-base text-[#00AFED] font-bold">Volume hebdomadaire actuel (hors préparation)</label>
                    <select 
                        value={formData.currentVolume} 
                        onChange={e => setFormData(f => ({ ...f, currentVolume: e.target.value as CurrentVolume }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED] mb-6"
                    >
                        {Object.values(CurrentVolume).map(vol => (
                            <option key={vol} value={vol} className="bg-[#0B1226]">{vol}</option>
                        ))}
                    </select>
                    <label className="block mb-2 text-base text-gray-300">Ancienneté</label>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.values(RunningHistory).map(rh => <OptionCard key={rh} label={rh} isSelected={formData.runningHistory === rh} onClick={() => setFormData(f => ({ ...f, runningHistory: rh }))} />)}
                    </div>
                    <label className="block mb-2 text-base text-gray-300">Niveau</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.values(Level).map(lvl => <OptionCard key={lvl} label={lvl} isSelected={formData.level === lvl} onClick={() => setFormData(f => ({ ...f, level: lvl }))} />)}
                    </div>
                </div>
            )
             case 3: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">⏱️ Vos Références</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block mb-2 text-base text-gray-300">Allure EF actuelle</label>
                            <input type="text" value={formData.currentPaceEF} onChange={e => setFormData(f => ({...f, currentPaceEF: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 6:15/km"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">PB 10 km</label>
                            <input type="text" value={formData.pb10k} onChange={e => setFormData(f => ({...f, pb10k: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 50:00"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">PB Semi</label>
                            <input type="text" value={formData.pbSemi} onChange={e => setFormData(f => ({...f, pbSemi: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 1:55:00"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">PB Marathon</label>
                            <input type="text" value={formData.pbMarathon} onChange={e => setFormData(f => ({...f, pbMarathon: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 4:15:00"/>
                        </div>
                    </div>
                </div>
            )
            case 4: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🎯 Objectif Principal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(Objective).map(obj => <OptionCard key={obj} label={obj} isSelected={formData.objective === obj} onClick={() => setFormData(f => ({ ...f, objective: obj }))} />)}
                    </div>
                </div>
            )
            case 5: {
                if (isUltra) {
                    return (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">⛰️ Détails Ultra</h2>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block mb-2 text-base text-gray-300">Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {["Marathon route", "Trail", "Ultra-trail"].map(t => (
                                            <OptionCard key={t} label={t} size="small" isSelected={ultraForm.type === t} onClick={() => setUltraForm(f => ({ ...f, type: t as any }))} />
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block mb-2 text-base text-gray-300">Distance</label>
                                        <input type="text" value={ultraForm.distance} onChange={e => setUltraForm(f => ({...f, distance: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: 80 km"/>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-base text-gray-300">D+</label>
                                        <input type="text" value={ultraForm.elevationGain} onChange={e => setUltraForm(f => ({...f, elevationGain: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: 2500m"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                if (isTrailShort) {
                    return (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">⛰️ Détails Trail Court (&lt;42km)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block mb-2 text-base text-gray-300">Distance de la course</label>
                                    <input type="text" value={trailShortForm.distance} onChange={e => setTrailShortForm(f => ({...f, distance: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 25 km"/>
                                </div>
                                <div>
                                    <label className="block mb-2 text-base text-gray-300">Dénivelé positif (D+)</label>
                                    <input type="text" value={trailShortForm.elevationGain} onChange={e => setTrailShortForm(f => ({...f, elevationGain: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 1200m"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block mb-2 text-base text-gray-300">Type de terrain</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {["Peu technique", "Mixte", "Très technique"].map(t => (
                                            <OptionCard key={t} label={t} size="small" isSelected={trailShortForm.terrainType === t} onClick={() => setTrailShortForm(f => ({ ...f, terrainType: t as any }))} />
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block mb-2 text-base text-gray-300">Temps visé (optionnel)</label>
                                    <input type="text" value={trailShortForm.targetTime || ""} onChange={e => setTrailShortForm(f => ({...f, targetTime: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 3h30"/>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🏆 Temps visé</h2>
                        <input type="text" value={formData.targetTime} onChange={e => setFormData(f => ({...f, targetTime: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-lg outline-none focus:ring-2 focus:ring-[#00AFED] text-center"/>
                    </div>
                )
            }
            case 6: return (
                <div className="animate-fade-in">
                     <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">📅 Date de l'Objectif</h2>
                     <p className="text-center text-gray-400 mb-6">Sélectionnez la date de votre course. Nous calculerons automatiquement le rétro-planning.</p>
                     <div className="max-w-xs mx-auto">
                        <input 
                            type="date" 
                            value={formData.targetDate} 
                            onChange={e => setFormData(f => ({...f, targetDate: e.target.value}))} 
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-xl text-center outline-none focus:ring-2 focus:ring-[#00AFED] calendar-picker-indicator-invert"
                        />
                     </div>
                </div>
            )
            case 7: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🗓️ Planification</h2>
                     <label className="block mb-2 text-base text-gray-300">Jours de disponibilité</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
                        {DAYS_OF_WEEK.map(day => {
                            const isSelected = formData.availabilityDays.includes(day);
                            return <OptionCard key={day} size="small" label={day} isSelected={isSelected} onClick={() => {
                                const newDays = isSelected ? formData.availabilityDays.filter(d => d !== day) : [...formData.availabilityDays, day];
                                setFormData(f => ({ ...f, availabilityDays: newDays }));
                            }}/>
                        })}
                    </div>
                     <label className="block mb-2 text-base text-gray-300">Durée de la préparation spécifique (semaines)</label>
                    <div className="flex justify-center items-center space-x-4"><span className="text-2xl font-bold text-[#00AFED]">{formData.duration} semaines</span></div>
                    <input type="range" min="8" max="24" value={formData.duration} onChange={e => setFormData(f => ({ ...f, duration: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"/>
                    <p className="text-xs text-center text-gray-500 mt-2">Si la course est plus lointaine, des semaines de maintien seront ajoutées automatiquement avant.</p>
                </div>
            )
            case 8: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🔋 Charge & Préférences</h2>
                    <label className="block mb-2 text-base text-gray-300">Charge mentale / Stress</label>
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {Object.values(LifeStress).map(stress => (
                            <OptionCard key={stress} label={stress} isSelected={formData.lifeStress === stress} onClick={() => setFormData(f => ({ ...f, lifeStress: stress }))} />
                        ))}
                    </div>
                     <label className="block mb-2 text-base text-gray-300">Terrain principal</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.values(Terrain).map(t => <OptionCard key={t} label={t} isSelected={formData.terrain === t} onClick={() => setFormData(f => ({ ...f, terrain: t }))} />)}
                    </div>
                </div>
            )
            case 9: return (
                 <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">📝 Derniers détails</h2>
                    <label className="block mb-2 text-base text-gray-300">Blessures ou remarques ?</label>
                    <textarea value={formData.notes} onChange={e => setFormData(f => ({...f, notes: e.target.value}))} className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: Gêne au genou droit..."></textarea>
                    
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-black/20">
                            <div><label className="font-semibold text-white">🧠 Mode Réflexion Avancée</label><p className="text-sm text-gray-400">Plus lent, meilleure optimisation systémique.</p></div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={useThinkingMode} onChange={e => setUseThinkingMode(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-[#00AFED] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                    </div>
                 </div>
            )
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-2">Créez votre Plan</h1>
            <p className="text-xl text-center text-gray-300 mb-12">Programmation experte avec calendrier réel.</p>
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl">
                <ProgressIndicator currentStep={step} totalSteps={9} />
                {renderStep()}
                <div className="flex justify-between items-center mt-12">
                     <button onClick={() => step === 1 ? onCancel() : setStep(s => s - 1)} className="px-6 py-2 text-base text-gray-300 rounded-full hover:bg-white/10 transition-colors">{step === 1 ? 'Annuler' : 'Précédent'}</button>
                    {step < 9 ? (
                        <GlowButton onClick={() => setStep(s => s + 1)}>Suivant</GlowButton>
                    ) : (
                        <GlowButton onClick={handleGenerate}>Générer mon plan expert</GlowButton>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratorPage;