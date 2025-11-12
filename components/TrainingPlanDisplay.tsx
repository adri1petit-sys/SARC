import React, { useState } from 'react';
import type { DetailedTrainingPlan, DetailedSession, FormData, SavedPlan, CompletionStatus, SessionFeedback, OptimizationSuggestion } from '../types';
import FeedbackModal from './FeedbackModal';

const getIntensityColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('fondamentale') || lowerType.includes('ef')) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (lowerType.includes('seuil') || lowerType.includes('tempo')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (lowerType.includes('vma') || lowerType.includes('fractionné')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (lowerType.includes('longue')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (lowerType.includes('renforcement') || lowerType.includes('côtes')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (lowerType.includes('repos')) return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    return 'bg-gray-700/50 text-gray-400 border-gray-600/50';
};

const FeedbackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
);

const LightbulbIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
);


const SessionCard: React.FC<{ session: DetailedSession, feedback: SessionFeedback | undefined, onToggle: () => void, onInfoClick: () => void }> = ({ session, feedback, onToggle, onInfoClick }) => {
    const isCompleted = feedback?.completed || false;
    const hasNotes = !!feedback?.notes || !!feedback?.rpe;
    const colorClasses = getIntensityColor(session.type);
    const isClubSession = session.type.toLowerCase().includes('run club');
    const isSurpriseSession = session.type.toLowerCase().includes('surprise');

    if (session.type.toLowerCase() === 'repos') {
        return (
            <div className={`p-5 rounded-lg border flex flex-col h-full justify-center items-center ${colorClasses} print-bg-white print-text-black print-border`}>
                <h4 className="font-bold text-xl">Repos</h4>
                <p className="text-base text-center">Récupération et assimilation</p>
            </div>
        );
    }
    return (
        <div className={`p-5 rounded-lg border flex flex-col h-full transition-all duration-300 ${isCompleted ? 'bg-gray-800/50 border-gray-700' : colorClasses} print-bg-white print-text-black print-border`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className={`font-bold text-xl transition-colors ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>{session.jour}</h4>
                     <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isClubSession && !isCompleted ? 'bg-[#00AFED] text-white' : isCompleted ? 'bg-gray-600 text-gray-400' : ''}`}>
                        {session.type}
                    </span>
                </div>
                 <input type="checkbox" checked={isCompleted} onChange={onToggle} className="form-checkbox h-6 w-6 rounded-md bg-white/10 border-white/20 text-[#00AFED] focus:ring-0 focus:ring-offset-0 cursor-pointer"/>
            </div>
            {isSurpriseSession && !isCompleted && (
                <p className="text-xs text-[#00AFED] italic mb-2">🌀 Séance planifiée par le coach</p>
            )}
            <p onClick={onInfoClick} className={`text-base flex-grow line-clamp-3 cursor-pointer hover:text-white transition-colors ${isCompleted ? 'text-gray-500' : 'text-gray-300'}`}>{session.contenu}</p>
            <div className="flex justify-between items-center mt-2">
                {isCompleted && hasNotes ? <FeedbackIcon /> : <div/>}
                <p className={`text-right font-semibold text-base transition-colors ${isCompleted ? 'text-gray-500' : 'text-white'}`}>{session.volume} km</p>
            </div>
        </div>
    );
};

const PDFExportTemplate: React.FC<{ plan: DetailedTrainingPlan, userProfile: FormData }> = ({ plan, userProfile }) => (
    <div id="pdf-content" className="p-8 bg-white text-gray-800" style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="flex items-center justify-between mb-8 pb-4 border-b">
            <div>
                <h1 className="text-3xl font-bold text-[#183C89]">Plan d'Entraînement</h1>
                <h2 className="text-xl text-[#00AFED]">Saint-Avertin Run Club</h2>
            </div>
             <img src="https://i.postimg.cc/vHTLCvyW/Untitled-4.png" alt="SARC Logo" className="h-16 w-16"/>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
            <div className="bg-gray-100 p-3 rounded"><strong>Objectif:</strong> {userProfile.objective}</div>
            <div className="bg-gray-100 p-3 rounded"><strong>Niveau:</strong> {userProfile.level}</div>
            <div className="bg-gray-100 p-3 rounded"><strong>Durée:</strong> {userProfile.duration} semaines</div>
        </div>
        <div className="space-y-6">
            {plan.plan.map((week) => (
                <div key={week.semaine} className="break-inside-avoid">
                    <h3 className="text-xl font-bold mb-2 text-[#183C89] border-b-2 border-[#00AFED] pb-1">Semaine {week.semaine}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {week.jours.filter(s => s.type.toLowerCase() !== 'repos').map((session, index) => (
                            <div key={index} className="p-2 border rounded-md">
                                <p className="font-bold">{session.jour} - {session.type} ({session.volume} km)</p>
                                <p className="text-xs">{session.contenu}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

interface TrainingPlanDisplayProps {
    savedPlan: SavedPlan;
    onUpdateCompletion: (planId: string, newStatus: CompletionStatus) => void;
    onNewPlanRequest: () => void;
    onOptimizeRequest: () => void;
    isOptimizing: boolean;
    optimizationSuggestions: OptimizationSuggestion[] | null;
    optimizationError: string | null;
}

const TrainingPlanDisplay: React.FC<TrainingPlanDisplayProps> = ({ 
    savedPlan, onUpdateCompletion, onNewPlanRequest,
    onOptimizeRequest, isOptimizing, optimizationSuggestions, optimizationError
}) => {
    const [selectedSession, setSelectedSession] = useState<{session: DetailedSession, feedback: SessionFeedback | undefined} | null>(null);
    const [feedbackTarget, setFeedbackTarget] = useState<{ weekIndex: number, sessionIndex: number, session: DetailedSession } | null>(null);

    const [showCopied, setShowCopied] = useState(false);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set(savedPlan.plan.plan.map(w => w.semaine)));

    const { plan, userProfile, completionStatus, id: planId } = savedPlan;
    const hasCompletedSessions = Object.values(completionStatus).some(s => s.completed);


    const toggleWeek = (weekNumber: number) => {
        setExpandedWeeks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(weekNumber)) {
                newSet.delete(weekNumber);
            } else {
                newSet.add(weekNumber);
            }
            return newSet;
        });
    };

    const handleToggleSession = (weekIndex: number, sessionIndex: number, session: DetailedSession) => {
        const key = `${weekIndex}_${sessionIndex}`;
        const isCurrentlyCompleted = completionStatus[key]?.completed || false;

        if (!isCurrentlyCompleted) {
            // If marking as complete, open feedback modal
            setFeedbackTarget({ weekIndex, sessionIndex, session });
        } else {
            // If un-marking, just update the status
            const newStatus = { ...completionStatus, [key]: { completed: false } };
            onUpdateCompletion(planId, newStatus);
        }
    };

    const handleFeedbackSubmit = (feedback: { rpe?: number, notes?: string }) => {
        if (!feedbackTarget) return;

        const { weekIndex, sessionIndex } = feedbackTarget;
        const key = `${weekIndex}_${sessionIndex}`;
        
        const newFeedback: SessionFeedback = {
            completed: true,
            rpe: feedback.rpe,
            notes: feedback.notes
        };

        const newStatus = { ...completionStatus, [key]: newFeedback };
        onUpdateCompletion(planId, newStatus);
        setFeedbackTarget(null);
    };

    const handlePrint = () => {
        const element = document.getElementById('pdf-content');
        if (!element) {
            console.error("L'élément de contenu PDF est introuvable.");
            return;
        }

        const html2pdfLib = (window as any).html2pdf;
        if (!html2pdfLib) {
            alert("La fonctionnalité PDF n'est pas encore prête, veuillez patienter un instant.");
            console.error("html2pdf.js library not found on window object.");
            return;
        }

        const options = {
            margin: [10, 10, 10, 10],
            filename: `plan-sarc-${userProfile.objective.toLowerCase().replace(/[\s/]/g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdfLib().from(element).set(options).save();
    };

    const handleShare = () => {
        const url = `${window.location.origin}${window.location.pathname}?planId=${planId}`;
        navigator.clipboard.writeText(url);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    return (
        <div className="animate-fade-in">
            {/* This div positions the PDF content off-screen so html2pdf can render it */}
            <div style={{ position: 'absolute', left: '-9999px', top: 'auto' }}>
                <PDFExportTemplate plan={plan} userProfile={userProfile} />
            </div>
            
            <div className="text-center no-print">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Votre Plan Actif</h1>
                <p className="text-xl text-gray-300 mb-4">
                    Objectif <span className="text-[#00AFED] font-semibold">{userProfile.objective}</span> en {userProfile.duration} semaines.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <button onClick={onOptimizeRequest} disabled={!hasCompletedSessions || isOptimizing} className="px-6 py-2 text-base bg-yellow-500/80 border border-yellow-400/30 text-white font-semibold rounded-full hover:bg-yellow-500/90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:border-gray-500 disabled:text-gray-400">
                        {isOptimizing ? 'Analyse en cours...' : '🤖 Analyser & Optimiser'}
                    </button>
                    <button onClick={handlePrint} className="px-6 py-2 text-base bg-white/10 border border-white/20 text-white rounded-full hover:bg-white/20 transition-colors">🖨️ Imprimer / PDF</button>
                    <button onClick={onNewPlanRequest} className="px-6 py-2 text-base bg-[#00AFED] text-white font-semibold rounded-full glow-shadow-hover transition-all">🚀 Créer un nouveau plan</button>
                </div>
            </div>
            
             {/* Optimization Suggestions Display */}
            <div className="no-print mb-8">
                {optimizationError && <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-center">{optimizationError}</div>}
                {optimizationSuggestions && (
                    <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-2xl p-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">💡 Suggestions d'Optimisation</h2>
                        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
                            {optimizationSuggestions.map((s, i) => (
                                <div key={i} className="bg-black/20 p-5 rounded-lg border border-white/10">
                                    <h3 className="font-semibold text-lg text-white mb-1">{s.title}</h3>
                                    <p className="text-yellow-200 mb-2">{s.suggestion}</p>
                                    <p className="text-sm text-gray-400 italic"><strong>Raison :</strong> {s.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4 no-print">
                {plan.plan.map((week, weekIndex) => {
                    const isExpanded = expandedWeeks.has(week.semaine);
                    const totalSessions = week.jours.filter(s => s.type.toLowerCase() !== 'repos').length;
                    const completedSessions = week.jours.reduce((acc, _, sessionIndex) => {
                        return completionStatus[`${weekIndex}_${sessionIndex}`]?.completed ? acc + 1 : acc;
                    }, 0);
                    const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

                    return (
                        <div key={week.semaine} className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 print-bg-white print-border transition-all duration-300">
                             <div 
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => toggleWeek(week.semaine)}
                                role="button" aria-expanded={isExpanded}
                            >
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white print-text-black">Semaine {week.semaine}</h2>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                                <div className="text-right">
                                   <p className="text-lg md:text-xl font-semibold text-[#00AFED]">{week.volumeTotal} km</p>
                                    {week.repartition && (<p className="text-xs text-gray-400">{week.repartition.ef}% EF / {week.repartition.intensite}% Intensité</p>)}
                                </div>
                            </div>
                            
                            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] mt-6' : 'max-h-0'}`}>
                                <div className="w-full bg-gray-700/50 rounded-full h-2 mb-4">
                                    <div className="bg-[#00AFED] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {week.jours.map((session, sessionIndex) => {
                                        const key = `${weekIndex}_${sessionIndex}`;
                                        const feedback = completionStatus[key];
                                        return (
                                            <SessionCard 
                                                key={sessionIndex} 
                                                session={session} 
                                                feedback={feedback}
                                                onToggle={() => handleToggleSession(weekIndex, sessionIndex, session)}
                                                onInfoClick={() => setSelectedSession({session, feedback})}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {feedbackTarget && (
                <FeedbackModal 
                    session={feedbackTarget.session}
                    onClose={() => setFeedbackTarget(null)}
                    onSubmit={handleFeedbackSubmit}
                />
            )}
            
            {selectedSession && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
                    onClick={() => setSelectedSession(null)}
                >
                    <div 
                        className="bg-gradient-to-br from-[#183C89] to-[#0a1024] border border-white/20 rounded-2xl p-8 max-w-lg w-11/12 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-white">{selectedSession.session.jour} - <span className="text-[#00AFED]">{selectedSession.session.type}</span></h3>
                                <p className="text-lg text-gray-300 font-semibold">{selectedSession.session.volume} km</p>
                            </div>
                            <button onClick={() => setSelectedSession(null)} className="text-3xl text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <div className="space-y-4 text-gray-300">
                            <div>
                                <h4 className="font-semibold text-white">Contenu de la séance :</h4>
                                <p>{selectedSession.session.contenu}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Objectif :</h4>
                                <p>{selectedSession.session.objectif}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                {selectedSession.session.allure && <div><p className="font-semibold text-white">Allure</p><p>{selectedSession.session.allure}</p></div>}
                                {selectedSession.session.frequenceCardiaque && <div><p className="font-semibold text-white">Fréquence Cardiaque</p><p>{selectedSession.session.frequenceCardiaque}</p></div>}
                                {selectedSession.session.rpe && <div><p className="font-semibold text-white">RPE</p><p>{selectedSession.session.rpe}</p></div>}
                            </div>

                             {selectedSession.feedback && (selectedSession.feedback.rpe || selectedSession.feedback.notes) && (
                                <div className="pt-4 border-t border-white/10 space-y-3">
                                    <h4 className="font-semibold text-white">Votre Retour :</h4>
                                    {selectedSession.feedback.rpe && (
                                         <div>
                                            <p className="font-semibold text-sm text-gray-400">Ressenti (RPE)</p>
                                            <p>{selectedSession.feedback.rpe}/10</p>
                                        </div>
                                    )}
                                    {selectedSession.feedback.notes && (
                                        <div>
                                            <p className="font-semibold text-sm text-gray-400">Notes</p>
                                            <p className="whitespace-pre-wrap">{selectedSession.feedback.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingPlanDisplay;