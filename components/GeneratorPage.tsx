import React, { useState, useEffect } from 'react';
import { Objective, Level, Gender, Terrain, RunningHistory } from '../types';
import type { FormData, DetailedTrainingPlan } from '../types';
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
        // Step 3
        pb5k: '', pb10k: '', pbSemi: '', pbMarathon: '',
        currentPaceEF: '6:00/km',
        // Step 4
        objective: Objective.TEN_K,
        // Step 5
        targetTime: "45 minutes",
        // Step 6
        availabilityDays: ["Mardi", "Jeudi", "Samedi"],
        duration: 8,
        // Step 7
        terrain: Terrain.ROAD,
        notes: ""
    });
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("Analyse de votre profil...");

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setProgress(0);
        setLoadingMessage("Analyse de votre profil...");
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
            const duration = useThinkingMode ? 600 : 300;
            const interval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + (100 - prev) * 0.05;
                    if (newProgress > 99) {
                        clearInterval(interval);
                        return 99;
                    }
                    if (newProgress < 25) setLoadingMessage("Analyse de votre profil...");
                    else if (newProgress < 50) setLoadingMessage("Calcul de vos allures...");
                    else if (newProgress < 75) setLoadingMessage(useThinkingMode ? "Réflexion approfondie..." : "Construction du plan...");
                    else setLoadingMessage("Finalisation...");
                    return newProgress;
                });
            }, duration);
            return () => clearInterval(interval);
        }
    }, [isGenerating, useThinkingMode]);

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

    const totalSteps = 7;
    const renderStep = () => {
         switch (step) {
            case 1: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">👤 Votre Profil</h2>
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
                    <label className="block mb-2 text-base text-gray-300">Depuis combien de temps courez-vous régulièrement ?</label>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.values(RunningHistory).map(rh => <OptionCard key={rh} label={rh} isSelected={formData.runningHistory === rh} onClick={() => setFormData(f => ({ ...f, runningHistory: rh }))} />)}
                    </div>
                    <label className="block mb-2 text-base text-gray-300">Quel est votre niveau actuel ?</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.values(Level).map(lvl => <OptionCard key={lvl} label={lvl} isSelected={formData.level === lvl} onClick={() => setFormData(f => ({ ...f, level: lvl }))} />)}
                    </div>
                </div>
            )
             case 3: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">⏱️ Quelles sont vos références ?</h2>
                    <p className="text-center text-base text-gray-400 mb-6">Optionnel, mais essentiel pour personnaliser vos allures.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block mb-2 text-base text-gray-300">Allure en Endurance Fondamentale (EF)</label>
                            <input type="text" value={formData.currentPaceEF} onChange={e => setFormData(f => ({...f, currentPaceEF: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 6:15/km"/>
                        </div>
                        <div />
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Meilleur temps 5 km</label>
                            <input type="text" value={formData.pb5k} onChange={e => setFormData(f => ({...f, pb5k: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 24:30"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Meilleur temps 10 km</label>
                            <input type="text" value={formData.pb10k} onChange={e => setFormData(f => ({...f, pb10k: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 50:00"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Meilleur temps Semi-Marathon</label>
                            <input type="text" value={formData.pbSemi} onChange={e => setFormData(f => ({...f, pbSemi: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 1:55:00"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Meilleur temps Marathon</label>
                            <input type="text" value={formData.pbMarathon} onChange={e => setFormData(f => ({...f, pbMarathon: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 4:15:00"/>
                        </div>
                    </div>
                </div>
            )
            case 4: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🎯 Votre Objectif Principal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(Objective).map(obj => <OptionCard key={obj} label={obj} isSelected={formData.objective === obj} onClick={() => setFormData(f => ({ ...f, objective: obj }))} />)}
                    </div>
                </div>
            )
            case 5: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🏆 Quel est votre temps visé ?</h2>
                    <p className="text-center text-base text-gray-400 mb-6">Ex: "45 min", "Sub 4h", "Finir confortablement"</p>
                    <input type="text" value={formData.targetTime} onChange={e => setFormData(f => ({...f, targetTime: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-lg outline-none focus:ring-2 focus:ring-[#00AFED] text-center"/>
                </div>
            )
            case 6: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🗓️ Votre Planification</h2>
                     <label className="block mb-2 text-base text-gray-300">Vos jours de disponibilité pour courir ?</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
                        {DAYS_OF_WEEK.map(day => {
                            const isSelected = formData.availabilityDays.includes(day);
                            return <OptionCard key={day} size="small" label={day} isSelected={isSelected} onClick={() => {
                                const newDays = isSelected ? formData.availabilityDays.filter(d => d !== day) : [...formData.availabilityDays, day];
                                setFormData(f => ({ ...f, availabilityDays: newDays }));
                            }}/>
                        })}
                    </div>
                     <label className="block mb-2 text-base text-gray-300">Durée du plan (en semaines) ?</label>
                    <div className="flex justify-center items-center space-x-4"><span className="text-2xl font-bold text-[#00AFED]">{formData.duration} semaines</span></div>
                    <input type="range" min="4" max="24" value={formData.duration} onChange={e => setFormData(f => ({ ...f, duration: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"/>
                    <div className="flex justify-between text-sm text-gray-400 px-1 mt-2"><span>4</span><span>24</span></div>
                </div>
            )
            case 7: return (
                 <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">💬 Préférences & Infos Complémentaires</h2>
                    <label className="block mb-2 text-base text-gray-300">Sur quel terrain courez-vous principalement ?</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {Object.values(Terrain).map(t => <OptionCard key={t} label={t} isSelected={formData.terrain === t} onClick={() => setFormData(f => ({ ...f, terrain: t }))} />)}
                    </div>
                    <label className="block mb-2 text-base text-gray-300">Avez-vous des blessures récentes ou des points de vigilance à nous communiquer ?</label>
                    <textarea value={formData.notes} onChange={e => setFormData(f => ({...f, notes: e.target.value}))} className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: Gêne au genou droit, préférence pour 3 sorties/semaine, etc. (Facultatif)"></textarea>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-black/20">
                            <div>
                                <label htmlFor="thinking-mode" className="font-semibold text-white">🧠 Mode Réflexion Avancée</label>
                                <p className="text-sm text-gray-400">Analyse plus poussée pour un plan ultra-personnalisé (plus lent).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="thinking-mode" checked={useThinkingMode} onChange={e => setUseThinkingMode(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00AFED]"></div>
                            </label>
                        </div>
                    </div>
                 </div>
            )
        }
    }


    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-2">Créez votre Plan d'Entraînement</h1>
            <p className="text-xl text-center text-gray-300 mb-12">Un programme sur-mesure, conçu par IA, pour atteindre vos objectifs.</p>

            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl">
                <ProgressIndicator currentStep={step} totalSteps={totalSteps} />
                
                {renderStep()}

                <div className="flex justify-between items-center mt-12">
                     <button 
                        onClick={() => step === 1 ? onCancel() : setStep(s => s - 1)} 
                        className="px-6 py-2 text-base text-gray-300 rounded-full hover:bg-white/10 transition-colors"
                    >
                        {step === 1 ? 'Annuler' : 'Précédent'}
                    </button>
                    {step < totalSteps ? (
                        <GlowButton onClick={() => setStep(s => s + 1)}>Suivant</GlowButton>
                    ) : (
                        <GlowButton onClick={handleGenerate}>Générer mon plan</GlowButton>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratorPage;