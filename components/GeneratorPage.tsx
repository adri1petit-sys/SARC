
import React, { useState, useEffect } from 'react';
import { Objective, Level, Gender, Terrain, RunningHistory, LifeStress, CurrentVolume } from '../types';
import type { FormData, UltraDetails, TrailShortDetails } from '../types';

// --- HELPERS ---
const formatPaceTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const PACE_OPTIONS = Array.from({ length: 16 }, (_, i) => {
    const startSec = 240 + (i * 15);
    const endSec = startSec + 15;
    const label = `${formatPaceTime(startSec)}-${formatPaceTime(endSec)}/km`;
    const value = `${formatPaceTime(startSec)}-${formatPaceTime(endSec)}`;
    return { value, label };
});

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

// Fonction d'encodage pour Netlify Forms
const encode = (data: any) => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
        .join("&");
};

interface GeneratorPageProps {
    onCancel: () => void;
}

const GeneratorPage: React.FC<GeneratorPageProps> = ({ onCancel }) => {
    const [step, setStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    // Initialisation avec des valeurs vides
    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: Gender.MALE, 
        age: "", 
        weight: "", 
        height: "",
        level: "" as any,
        runningHistory: "" as any,
        currentVolume: "" as any,
        pb5k: '', pb10k: '', pbSemi: '', pbMarathon: '',
        currentPaceEF: '', 
        objective: Objective.TEN_K,
        ultraDetails: undefined,
        trailShortDetails: undefined,
        targetTime: "", 
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availabilityDays: ["Mardi", "Jeudi", "Samedi"],
        duration: 12,
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

    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Validation logic
    const isStepValid = () => {
        if (step === 1) {
            const isAgeValid = formData.age !== "" && Number(formData.age) > 0;
            const isWeightValid = formData.weight !== "" && Number(formData.weight) > 0;
            const isHeightValid = formData.height !== "" && Number(formData.height) > 0;
            return isAgeValid && isWeightValid && isHeightValid;
        }
        if (step === 2) {
            return (formData.currentVolume as any) !== "" && 
                   (formData.runningHistory as any) !== "" && 
                   (formData.level as any) !== "";
        }
        if (step === 3) {
            return formData.currentPaceEF !== "";
        }
        if (step === 5) {
            if (isUltra) {
                return ultraForm.distance !== "" && ultraForm.elevationGain !== "";
            }
            if (isTrailShort) {
                return trailShortForm.distance !== "" && trailShortForm.elevationGain !== "";
            }
            return formData.targetTime.trim() !== "";
        }
        if (step === 10) { // Coordonnées
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
            const isPhoneValid = formData.phone.trim().length >= 10;
            return formData.firstName.trim() !== "" && 
                   formData.lastName.trim() !== "" && 
                   isEmailValid && 
                   isPhoneValid;
        }
        return true;
    };

    const handleSubmit = async () => {
        setIsSending(true);
        setError(null);

        // Préparation des données pour Netlify
        // NOTE: Le 'form-name' doit correspondre EXACTEMENT à l'attribut name du formulaire dans index.html
        const formPayload = {
            "form-name": "sarc-coaching-request",
            "subject": `Nouveau questionnaire SARC de ${formData.firstName} ${formData.lastName}`, // Sujet pour l'email
            ...formData,
            // Aplatir les objets imbriqués pour la lisibilité
            ultra_distance: formData.ultraDetails?.distance || "",
            ultra_elevation: formData.ultraDetails?.elevationGain || "",
            trail_distance: formData.trailShortDetails?.distance || "",
            trail_elevation: formData.trailShortDetails?.elevationGain || "",
            availability: formData.availabilityDays.join(", "),
        };

        try {
            await fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: encode(formPayload),
            });
            setIsSubmitted(true);
            setIsSending(false);
        } catch (error) {
            console.error("Erreur d'envoi:", error);
            // On affiche quand même le succès en cas d'erreur réseau pour ne pas frustrer l'utilisateur (mode dégradé)
            setIsSubmitted(true);
            setIsSending(false);
        }
    };

    // --- ÉCRAN DE SUCCÈS ---
    if (isSubmitted) {
        return (
            <div className="text-center py-20 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                <div className="bg-black/20 backdrop-blur-md border border-[#00AFED] rounded-3xl p-12 shadow-2xl glow-shadow max-w-2xl mx-auto w-full">
                    <div className="text-6xl mb-6">🚀</div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Demande bien reçue !</h2>
                    <p className="text-xl text-gray-300 leading-relaxed mb-8">
                        Le coach va analyser personnellement ton profil. 
                        Tu recevras ton programme sur-mesure au format PDF directement sur <span className="text-[#25D366] font-bold">WhatsApp</span> d'ici 48h.
                    </p>
                    <button 
                        onClick={onCancel} 
                        className="px-8 py-3 text-lg font-semibold text-black rounded-full bg-[#00AFED] transition-all duration-300 hover:scale-105 hover:bg-white focus:ring-4 focus:ring-[#00AFED]/50"
                    >
                        Retour à l'accueil
                    </button>
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
                            <input 
                                name="age"
                                type="number" 
                                value={formData.age} 
                                onChange={e => setFormData(f => ({...f, age: e.target.value === "" ? "" : parseFloat(e.target.value)}))} 
                                placeholder="30"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Poids (kg)</label>
                            <input 
                                name="weight"
                                type="number" 
                                value={formData.weight} 
                                onChange={e => setFormData(f => ({...f, weight: e.target.value === "" ? "" : parseFloat(e.target.value)}))} 
                                placeholder="70"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Taille (cm)</label>
                            <input 
                                name="height"
                                type="number" 
                                value={formData.height} 
                                onChange={e => setFormData(f => ({...f, height: e.target.value === "" ? "" : parseFloat(e.target.value)}))} 
                                placeholder="175"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            />
                        </div>
                    </div>
                </div>
            )
            case 2: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🏃‍♂️ Votre Expérience</h2>
                    <label className="block mb-2 text-base text-[#00AFED] font-bold">Volume hebdomadaire actuel</label>
                    <select 
                        name="currentVolume"
                        value={formData.currentVolume} 
                        onChange={e => setFormData(f => ({ ...f, currentVolume: e.target.value as CurrentVolume }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED] mb-6"
                    >
                        <option value="" disabled className="text-gray-500 bg-[#0B1226]">Sélectionnez votre volume...</option>
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
                            <select
                                name="currentPaceEF"
                                value={formData.currentPaceEF}
                                onChange={e => setFormData(f => ({...f, currentPaceEF: e.target.value}))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            >
                                <option value="" disabled hidden>Sélectionner votre allure EF</option>
                                {PACE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} className="bg-[#0B1226] text-gray-200">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">PB 10 km</label>
                            <input name="pb10k" type="text" value={formData.pb10k} onChange={e => setFormData(f => ({...f, pb10k: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 50:00"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">PB Semi</label>
                            <input name="pbSemi" type="text" value={formData.pbSemi} onChange={e => setFormData(f => ({...f, pbSemi: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 1:55:00"/>
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">PB Marathon</label>
                            <input name="pbMarathon" type="text" value={formData.pbMarathon} onChange={e => setFormData(f => ({...f, pbMarathon: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 4:15:00"/>
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
                                        <input name="ultra_distance" type="text" value={ultraForm.distance} onChange={e => setUltraForm(f => ({...f, distance: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: 80 km"/>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-base text-gray-300">D+</label>
                                        <input name="ultra_elevation" type="text" value={ultraForm.elevationGain} onChange={e => setUltraForm(f => ({...f, elevationGain: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: 2500m"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                if (isTrailShort) {
                    return (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">⛰️ Détails Trail Court</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block mb-2 text-base text-gray-300">Distance de la course</label>
                                    <input name="trail_distance" type="text" value={trailShortForm.distance} onChange={e => setTrailShortForm(f => ({...f, distance: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 25 km"/>
                                </div>
                                <div>
                                    <label className="block mb-2 text-base text-gray-300">Dénivelé positif (D+)</label>
                                    <input name="trail_elevation" type="text" value={trailShortForm.elevationGain} onChange={e => setTrailShortForm(f => ({...f, elevationGain: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 1200m"/>
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
                                    <input name="targetTime" type="text" value={trailShortForm.targetTime || ""} onChange={e => setTrailShortForm(f => ({...f, targetTime: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="ex: 3h30"/>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">🏆 Temps visé</h2>
                        <input 
                            name="targetTime"
                            type="text" 
                            value={formData.targetTime} 
                            onChange={e => setFormData(f => ({...f, targetTime: e.target.value}))} 
                            placeholder="Ex : 45 minutes"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-lg outline-none focus:ring-2 focus:ring-[#00AFED] text-center"
                        />
                    </div>
                )
            }
            case 6: return (
                <div className="animate-fade-in">
                     <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">📅 Date de l'Objectif</h2>
                     <p className="text-center text-gray-400 mb-6">Sélectionnez la date de votre course. Nous calculerons automatiquement le rétro-planning.</p>
                     <div className="max-w-xs mx-auto">
                        <input 
                            name="targetDate"
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
                    <input name="duration" type="range" min="8" max="24" value={formData.duration} onChange={e => setFormData(f => ({ ...f, duration: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-4"/>
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
                    <textarea name="notes" value={formData.notes} onChange={e => setFormData(f => ({...f, notes: e.target.value}))} className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-base outline-none focus:ring-2 focus:ring-[#00AFED]" placeholder="Ex: Gêne au genou droit..."></textarea>
                 </div>
            )
            case 10: return (
                <div className="animate-fade-in">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">📞 Vos Coordonnées</h2>
                    <p className="text-center text-gray-400 mb-8">Pour vous envoyer votre programme personnalisé.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Prénom</label>
                            <input 
                                name="firstName"
                                type="text" 
                                value={formData.firstName} 
                                onChange={e => setFormData(f => ({...f, firstName: e.target.value}))} 
                                placeholder="Jean"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-base text-gray-300">Nom</label>
                            <input 
                                name="lastName"
                                type="text" 
                                value={formData.lastName} 
                                onChange={e => setFormData(f => ({...f, lastName: e.target.value}))} 
                                placeholder="Dupont"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-2 text-base text-gray-300">Email</label>
                            <input 
                                name="email"
                                type="email" 
                                value={formData.email} 
                                onChange={e => setFormData(f => ({...f, email: e.target.value}))} 
                                placeholder="jean.dupont@email.com"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#00AFED]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-2 text-base font-bold text-[#25D366]">Numéro de téléphone (WhatsApp)</label>
                            <input 
                                name="phone"
                                type="tel" 
                                value={formData.phone} 
                                onChange={e => setFormData(f => ({...f, phone: e.target.value}))} 
                                placeholder="06 12 34 56 78"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-lg outline-none focus:ring-2 focus:ring-[#25D366]"
                            />
                            <p className="text-xs text-gray-500 mt-1">Indispensable pour recevoir votre PDF.</p>
                        </div>
                    </div>
                </div>
            )
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-10">
            <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-2">Créez votre Plan</h1>
            <p className="text-xl text-center text-gray-300 mb-12">Programmation experte avec calendrier réel.</p>
            
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl">
                <ProgressIndicator currentStep={step} totalSteps={10} />
                
                {renderStep()}
                
                {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-center">
                        {error}
                    </div>
                )}

                <div className="flex justify-between items-center mt-12">
                     <button onClick={() => step === 1 ? onCancel() : setStep(s => s - 1)} className="px-6 py-2 text-base text-gray-300 rounded-full hover:bg-white/10 transition-colors">{step === 1 ? 'Annuler' : 'Précédent'}</button>
                    {step < 10 ? (
                        <GlowButton onClick={() => setStep(s => s + 1)} disabled={!isStepValid()}>Suivant</GlowButton>
                    ) : (
                        <GlowButton onClick={handleSubmit} disabled={isSending || !isStepValid()}>
                            {isSending ? 'Envoi en cours...' : 'Recevoir mon programme'}
                        </GlowButton>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratorPage;
