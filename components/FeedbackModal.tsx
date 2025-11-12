import React, { useState } from 'react';
import type { DetailedSession } from '../types';

interface FeedbackModalProps {
    session: DetailedSession;
    onClose: () => void;
    onSubmit: (feedback: { rpe?: number, notes?: string }) => void;
}

const RPE_DESCRIPTIONS: { [key: number]: { label: string; color: string } } = {
    1: { label: "Très facile", color: "bg-blue-500" },
    2: { label: "Facile", color: "bg-cyan-500" },
    3: { label: "Modéré", color: "bg-green-500" },
    4: { label: "Assez facile", color: "bg-lime-500" },
    5: { label: "Soutenu", color: "bg-yellow-500" },
    6: { label: "Assez difficile", color: "bg-amber-500" },
    7: { label: "Difficile", color: "bg-orange-500" },
    8: { label: "Très difficile", color: "bg-red-500" },
    9: { label: "Extrêmement dur", color: "bg-rose-600" },
    10: { label: "Maximal", color: "bg-fuchsia-700" },
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({ session, onClose, onSubmit }) => {
    const [rpe, setRpe] = useState<number | undefined>(undefined);
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        onSubmit({ rpe, notes });
    };
    
    const handleSkip = () => {
        onSubmit({}); // Submit with no feedback
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-[#183C89] to-[#0a1024] border border-white/20 rounded-2xl p-8 max-w-lg w-11/12 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white">Bravo pour cette séance !</h3>
                        <p className="text-gray-300">Comment vous êtes-vous senti ? (Optionnel)</p>
                    </div>
                    <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block mb-3 text-base font-semibold text-gray-200">Ressenti de l'effort (RPE)</label>
                        <div className="w-full flex justify-between items-center px-1 mb-2">
                           {rpe ? (
                             <span className={`px-2 py-0.5 text-xs font-bold rounded-full text-white ${RPE_DESCRIPTIONS[rpe]?.color ?? 'bg-gray-500'}`}>{RPE_DESCRIPTIONS[rpe]?.label}</span>
                           ) : <span className="text-xs text-gray-400">Sur une échelle de 1 à 10</span>}
                            <span className="text-2xl font-bold text-white">{rpe ?? '-'} <span className="text-base text-gray-400">/ 10</span></span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={rpe || ''}
                            onChange={(e) => setRpe(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                         <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
                            <span>Facile</span>
                            <span>Moyen</span>
                            <span>Maximal</span>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="notes" className="block mb-2 text-base font-semibold text-gray-200">Notes sur la séance</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-base outline-none focus:ring-2 focus:ring-[#FF38B1]"
                            placeholder="Ex: Super sensations, un peu fatigué au début, etc."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={handleSkip} className="px-6 py-2 text-base text-gray-300 rounded-full hover:bg-white/10 transition-colors">
                        Ignorer
                    </button>
                    <button onClick={handleSubmit} className="px-8 py-2 text-base font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 glow-shadow-hover">
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
