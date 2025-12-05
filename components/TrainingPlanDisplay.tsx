import React, { useState, useEffect, useRef } from 'react';
import type { DetailedTrainingPlan, DetailedSession, FormData, SavedPlan, CompletionStatus, SessionFeedback, OptimizationSuggestion } from '../types';
import { getSessionSuggestion } from '../services/geminiService';
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

const getPhaseColor = (phase: string) => {
    const p = phase.toLowerCase();
    if (p.includes('maintien')) return 'bg-gray-600 text-gray-200';
    if (p.includes('développement')) return 'bg-blue-600 text-white';
    if (p.includes('spécifique')) return 'bg-purple-600 text-white';
    if (p.includes('affûtage')) return 'bg-green-600 text-white';
    if (p.includes('compétition')) return 'bg-red-600 text-white animate-pulse';
    return 'bg-gray-700 text-gray-300';
};

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

const isDateInWeek = (dateStr: string, weekStartStr: string, weekEndStr: string) => {
    const target = new Date(dateStr).getTime();
    const start = new Date(weekStartStr).getTime();
    const end = new Date(weekEndStr).getTime();
    return target >= start && target <= end;
};

// ... FeedbackIcon, SessionSuggestionModal components stay same ...
const FeedbackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
);

const SessionSuggestionModal: React.FC<{ session: DetailedSession, onClose: () => void }> = ({ session, onClose }) => {
    const [query, setQuery] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateSuggestion = async () => {
        if (!query) return;
        setIsLoading(true);
        setError('');
        setSuggestion('');
        try {
            const result = await getSessionSuggestion(session, query);
            setSuggestion(result);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-[#183C89] to-[#0a1024] border border-white/20 rounded-2xl p-8 max-w-lg w-11/12 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white">Ajuster la séance</h3>
                    <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="mb-4 bg-black/20 p-3 rounded-lg border border-white/10">
                    <p className="font-semibold text-base text-gray-300">{session.jour} {formatDate(session.date)}</p>
                    <p className="text-sm text-gray-400">{session.type}</p>
                </div>
                <textarea 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ex: Il pleut, que faire à la place ?"
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-4 text-base outline-none focus:ring-2 focus:ring-[#FF38B1]"
                />
                <button 
                    onClick={handleGenerateSuggestion} 
                    disabled={isLoading || !query}
                    className="w-full mt-4 px-8 py-3 text-lg font-semibold text-white rounded-full bg-[#FF38B1] transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#FF38B1]/50 disabled:bg-gray-600 disabled:cursor-not-allowed glow-shadow-pink-hover"
                >
                    {isLoading ? 'Génération...' : '🤖 Suggestion'}
                </button>
                {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
                {suggestion && (
                    <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                        <h4 className="font-semibold text-white">Suggestion IA :</h4>
                        <div className="prose prose-invert prose-sm text-gray-300" dangerouslySetInnerHTML={{ __html: suggestion.replace(/\n/g, '<br />') }} />
                    </div>
                )}
            </div>
        </div>
    );
};

const SessionCard: React.FC<{ session: DetailedSession, feedback: SessionFeedback | undefined, onToggle: () => void, onInfoClick: () => void }> = ({ session, feedback, onToggle, onInfoClick }) => {
    const isCompleted = feedback?.completed || false;
    const hasNotes = !!feedback?.notes || !!feedback?.rpe;
    const colorClasses = getIntensityColor(session.type);
    const isSurprise = session.type.toLowerCase().includes('surprise');

    if (session.type.toLowerCase() === 'repos') {
        return (
            <div className={`p-4 rounded-lg border flex flex-col h-full justify-center items-center ${colorClasses} opacity-60`}>
                <h4 className="font-bold text-lg">{session.jour} <span className="text-sm font-normal opacity-75">{formatDate(session.date)}</span></h4>
                <span className="text-sm font-bold mt-1">REPOS</span>
            </div>
        );
    }
    return (
        <div className={`p-5 rounded-lg border flex flex-col h-full transition-all duration-300 ${isCompleted ? 'bg-gray-800/50 border-gray-700' : colorClasses}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className={`font-bold text-lg transition-colors ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {session.jour} <span className="text-sm font-normal opacity-75 ml-1">{formatDate(session.date)}</span>
                    </h4>
                </div>
                 <input type="checkbox" checked={isCompleted} onChange={onToggle} className="form-checkbox h-5 w-5 rounded bg-white/10 border-white/20 text-[#00AFED] cursor-pointer"/>
            </div>
            {isSurprise && !isCompleted && <p className="text-xs text-[#00AFED] italic mb-1">🌀 Surprise Coachs</p>}
            <p onClick={onInfoClick} className={`text-sm md:text-base flex-grow line-clamp-3 cursor-pointer hover:text-white transition-colors ${isCompleted ? 'text-gray-500' : 'text-gray-300'}`}>{session.contenu}</p>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
                {isCompleted && hasNotes ? <FeedbackIcon /> : <div/>}
                <span className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-white'}`}>{session.type} • {session.volume} km</span>
            </div>
        </div>
    );
};

// ... PDFExportTemplate stays same but use session.date ...
const PDFExportTemplate: React.FC<{ plan: DetailedTrainingPlan, userProfile: FormData }> = ({ plan, userProfile }) => (
    <div id="pdf-content" className="p-8 bg-white text-gray-800" style={{ width: '210mm', minHeight: '297mm' }}>
        <h1 className="text-3xl font-bold text-[#183C89] mb-4">Plan SARC - {userProfile.objective}</h1>
        <p className="mb-8">Objectif: {formatDate(plan.raceDate)}</p>
        <div className="space-y-6">
            {plan.plan.map((week) => (
                <div key={week.semaine} className="break-inside-avoid">
                    <h3 className="text-xl font-bold mb-2 text-[#183C89] border-b border-[#00AFED]">Semaine {week.semaine} - {week.phase}</h3>
                    <div className="grid grid-cols-1 gap-1">
                        {week.jours.map((session, index) => (
                            <div key={index} className="p-1 border-b text-sm">
                                <span className="font-bold">{session.jour} {formatDate(session.date)}</span>: {session.type} ({session.volume} km)
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
    const [suggestionTarget, setSuggestionTarget] = useState<DetailedSession | null>(null);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
    const weekRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const { plan, userProfile, completionStatus, id: planId } = savedPlan;
    const hasCompletedSessions = Object.values(completionStatus).some(s => (s as SessionFeedback).completed);

    // Auto-scroll to current week on mount
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        let currentWeekIndex = -1;

        // Find current week based on date
        plan.plan.forEach((week) => {
             if (isDateInWeek(today, week.startDate, week.endDate)) {
                 currentWeekIndex = week.semaine;
             }
        });

        // If not found (plan hasn't started), default to week 1. If ended, last week.
        if (currentWeekIndex === -1) {
            const firstWeekStart = plan.plan[0].startDate;
            if (new Date(today) < new Date(firstWeekStart)) currentWeekIndex = 1;
            else currentWeekIndex = plan.plan[plan.plan.length - 1].semaine;
        }

        // Expand current and next week
        setExpandedWeeks(new Set([currentWeekIndex, currentWeekIndex + 1]));

        // Scroll
        setTimeout(() => {
            const el = weekRefs.current[currentWeekIndex];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
    }, [plan.plan]);


    const toggleWeek = (weekNumber: number) => {
        setExpandedWeeks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(weekNumber)) newSet.delete(weekNumber);
            else newSet.add(weekNumber);
            return newSet;
        });
    };

    const handleToggleSession = (weekIndex: number, sessionIndex: number, session: DetailedSession) => {
        const key = `${weekIndex}_${sessionIndex}`;
        const isCurrentlyCompleted = completionStatus[key]?.completed || false;
        if (!isCurrentlyCompleted) {
            setFeedbackTarget({ weekIndex, sessionIndex, session });
        } else {
            const newStatus = { ...completionStatus, [key]: { completed: false } };
            onUpdateCompletion(planId, newStatus);
        }
    };

    const handleFeedbackSubmit = (feedback: { rpe?: number, notes?: string }) => {
        if (!feedbackTarget) return;
        const { weekIndex, sessionIndex } = feedbackTarget;
        const key = `${weekIndex}_${sessionIndex}`;
        const newFeedback: SessionFeedback = { completed: true, rpe: feedback.rpe, notes: feedback.notes };
        onUpdateCompletion(planId, { ...completionStatus, [key]: newFeedback });
        setFeedbackTarget(null);
    };

    const handlePrint = () => {
        const element = document.getElementById('pdf-content');
        if (!element || !(window as any).html2pdf) return;
        const opt = { margin: 10, filename: `plan-sarc.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        (window as any).html2pdf().from(element).set(opt).save();
    };

    return (
        <div className="animate-fade-in relative">
             <div style={{ position: 'absolute', left: '-9999px', top: 'auto' }}>
                <PDFExportTemplate plan={plan} userProfile={userProfile} />
            </div>

            <div className="text-center mb-8 no-print">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Calendrier Réel</h1>
                <p className="text-xl text-gray-300">Objectif : <span className="text-[#00AFED] font-bold">{formatDate(plan.raceDate)}</span></p>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <button onClick={onOptimizeRequest} disabled={!hasCompletedSessions || isOptimizing} className="px-5 py-2 text-sm bg-yellow-600/80 text-white rounded-full hover:bg-yellow-500 disabled:opacity-50">⚡ Optimiser</button>
                    <button onClick={handlePrint} className="px-5 py-2 text-sm bg-white/10 text-white rounded-full hover:bg-white/20">🖨️ PDF</button>
                    <button onClick={onNewPlanRequest} className="px-5 py-2 text-sm bg-[#00AFED] text-white rounded-full hover:bg-[#0095c7]">Nouveau Plan</button>
                </div>
            </div>

            {/* Suggestions Block */}
            {optimizationSuggestions && (
                 <div className="mb-8 bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6 no-print">
                    <h2 className="text-xl font-bold text-yellow-300 mb-4">💡 Suggestions</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {optimizationSuggestions.map((s, i) => (
                            <div key={i} className="bg-black/20 p-4 rounded-lg">
                                <h3 className="font-bold text-white">{s.title}</h3>
                                <p className="text-sm text-yellow-100">{s.suggestion}</p>
                            </div>
                        ))}
                    </div>
                 </div>
            )}

            <div className="space-y-6 pb-20 no-print">
                {plan.plan.map((week, weekIndex) => {
                    const isExpanded = expandedWeeks.has(week.semaine);
                    const today = new Date().toISOString().split('T')[0];
                    const isCurrent = isDateInWeek(today, week.startDate, week.endDate);
                    
                    return (
                        <div 
                            key={week.semaine} 
                            ref={el => weekRefs.current[week.semaine] = el}
                            className={`rounded-2xl border transition-all duration-300 ${isCurrent ? 'bg-[#183C89]/30 border-[#00AFED] shadow-lg shadow-[#00AFED]/20 transform scale-[1.01]' : 'bg-black/20 border-white/10 opacity-90'}`}
                        >
                             <div 
                                className="p-4 md:p-6 cursor-pointer flex justify-between items-center"
                                onClick={() => toggleWeek(week.semaine)}
                            >
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className={`text-2xl font-bold ${isCurrent ? 'text-[#00AFED]' : 'text-white'}`}>Semaine {week.semaine}</h2>
                                        <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider ${getPhaseColor(week.phase)}`}>{week.phase}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">Du {formatDate(week.startDate)} au {formatDate(week.endDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-white">{week.volumeTotal} km</p>
                                    <p className="text-xs text-gray-500">Volume Hebdo</p>
                                </div>
                            </div>

                            <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px] border-t border-white/5' : 'max-h-0'}`}>
                                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {week.jours.map((session, sessionIndex) => (
                                        <SessionCard 
                                            key={sessionIndex} 
                                            session={session} 
                                            feedback={completionStatus[`${weekIndex}_${sessionIndex}`]}
                                            onToggle={() => handleToggleSession(weekIndex, sessionIndex, session)}
                                            onInfoClick={() => setSelectedSession({session, feedback: completionStatus[`${weekIndex}_${sessionIndex}`]})}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {feedbackTarget && <FeedbackModal session={feedbackTarget.session} onClose={() => setFeedbackTarget(null)} onSubmit={handleFeedbackSubmit} />}
            {suggestionTarget && <SessionSuggestionModal session={suggestionTarget} onClose={() => setSuggestionTarget(null)} />}
            {selectedSession && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedSession(null)}
                >
                     <div className="bg-[#0B1226] border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedSession.session.jour} {formatDate(selectedSession.session.date)}</h3>
                                <span className="text-[#00AFED] font-semibold">{selectedSession.session.type}</span>
                            </div>
                            <button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="space-y-4 text-gray-300">
                             <div className="bg-white/5 p-4 rounded-lg">
                                <p className="font-medium text-white mb-2">Contenu</p>
                                <p>{selectedSession.session.contenu}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-lg"><p className="text-xs text-gray-400 uppercase">Volume</p><p className="text-white font-bold">{selectedSession.session.volume} km</p></div>
                                <div className="bg-white/5 p-3 rounded-lg"><p className="text-xs text-gray-400 uppercase">Objectif</p><p className="text-white text-sm">{selectedSession.session.objectif}</p></div>
                            </div>
                            <button onClick={() => { setSelectedSession(null); setSuggestionTarget(selectedSession.session); }} className="w-full py-3 bg-[#FF38B1] text-white font-bold rounded-full hover:bg-[#FF38B1]/80 transition-colors">Adaptation IA</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingPlanDisplay;