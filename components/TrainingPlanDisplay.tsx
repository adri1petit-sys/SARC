import React, { useState, useEffect, useRef } from 'react';
import type { DetailedTrainingPlan, DetailedSession, FormData, SavedPlan, CompletionStatus, SessionFeedback, OptimizationSuggestion } from '../types';
import { getSessionSuggestion } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

// --- PDF HELPERS ---
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;

function getPageHeight(doc: any): number {
  return doc.internal?.pageSize?.getHeight?.() ?? doc.internal.pageSize.height;
}

function newPage(doc: any): number {
  doc.addPage();
  return MARGIN_TOP;
}

function ensureSpace(doc: any, currentY: number, neededHeight: number): number {
  const pageHeight = getPageHeight(doc);
  if (currentY + neededHeight > pageHeight - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return currentY;
}

// --- UI HELPERS ---

const getIntensityColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('fondamentale') || lowerType.includes('ef')) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (lowerType.includes('seuil') || lowerType.includes('tempo')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (lowerType.includes('vma') || lowerType.includes('fractionné') || lowerType.includes('surprise')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (lowerType.includes('longue') || lowerType.includes('club')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
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

// --- SUB-COMPONENTS ---

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

const SessionCard: React.FC<{ session: DetailedSession, feedback: SessionFeedback | undefined, onToggle: () => void, onInfoClick: () => void, minimal?: boolean }> = ({ session, feedback, onToggle, onInfoClick, minimal = false }) => {
    const isCompleted = feedback?.completed || false;
    const hasNotes = !!feedback?.notes || !!feedback?.rpe;
    const colorClasses = getIntensityColor(session.type);
    const isSurprise = session.type.toLowerCase().includes('surprise');

    if (session.type.toLowerCase() === 'repos') {
        return (
            <div className={`rounded-lg border flex flex-col justify-center items-center ${colorClasses} opacity-60 ${minimal ? 'p-2 text-xs h-24' : 'p-4 h-full'}`}>
                {minimal ? (
                    <span className="font-bold">REPOS</span>
                ) : (
                    <>
                    <h4 className="font-bold text-lg">{session.jour} <span className="text-sm font-normal opacity-75">{formatDate(session.date)}</span></h4>
                    <span className="text-sm font-bold mt-1">REPOS</span>
                    </>
                )}
            </div>
        );
    }
    
    if (minimal) {
         return (
            <div 
                className={`rounded-lg border flex flex-col p-2 h-32 transition-all duration-300 cursor-pointer hover:scale-105 ${isCompleted ? 'bg-gray-800/80 border-gray-700' : colorClasses}`}
                onClick={onInfoClick}
            >
                 <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs truncate w-full">{session.type}</span>
                    {isCompleted && <div className="h-2 w-2 rounded-full bg-green-500 shrink-0 ml-1"></div>}
                 </div>
                 <div className="flex-grow overflow-hidden">
                     <p className="text-[10px] leading-tight opacity-80 line-clamp-3">{session.contenu}</p>
                 </div>
                 <div className="mt-1 pt-1 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-mono">{session.volume}km</span>
                    <input type="checkbox" checked={isCompleted} onClick={(e) => { e.stopPropagation(); onToggle(); }} className="h-3 w-3 cursor-pointer rounded bg-white/10 border-white/20 text-[#00AFED]"/>
                 </div>
            </div>
         )
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
            
            <div onClick={onInfoClick} className={`text-sm md:text-base flex-grow cursor-pointer hover:text-white transition-colors whitespace-pre-line ${isCompleted ? 'text-gray-500' : 'text-gray-300'}`}>
                {session.warmup && <p className="mb-1"><span className="font-semibold text-xs uppercase opacity-70">Warm-up:</span> {session.warmup}</p>}
                {session.mainBlock && <p className="mb-1 font-semibold text-white"><span className="font-normal text-xs uppercase opacity-70 text-gray-300">Bloc:</span> {session.mainBlock}</p>}
                {session.cooldown && <p className="mb-1"><span className="font-semibold text-xs uppercase opacity-70">Cool-down:</span> {session.cooldown}</p>}
                {!session.warmup && <p className="line-clamp-3">{session.contenu}</p>}
            </div>

            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
                {isCompleted && hasNotes ? <FeedbackIcon /> : <div/>}
                <span className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-white'}`}>{session.type} • {session.volume} km</span>
            </div>
        </div>
    );
};

const LexiqueItem: React.FC<{ label: string; pace: string; description: string }> = ({ label, pace, description }) => (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-[#00AFED] text-lg">{label}</h3>
            <span className="px-3 py-1 bg-[#00AFED]/20 text-white rounded-full text-sm font-mono border border-[#00AFED]/30">{pace}</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{description}</p>
    </div>
);

const CalendarView: React.FC<{ plan: DetailedTrainingPlan, completionStatus: CompletionStatus, onToggle: (w: number, s: number, sess: DetailedSession) => void, onInfo: (sess: DetailedSession, fb: SessionFeedback|undefined) => void }> = ({ plan, completionStatus, onToggle, onInfo }) => {
    const today = new Date().toISOString().split('T')[0];
    const scrollRef = useRef<HTMLDivElement>(null);
    const [centeredWeek, setCenteredWeek] = useState<number>(1);

    useEffect(() => {
        // Find current week index
        const currentWeekObj = plan.plan.find(w => isDateInWeek(today, w.startDate, w.endDate));
        if (currentWeekObj && scrollRef.current) {
             const element = document.getElementById(`week-calendar-${currentWeekObj.semaine}`);
             if (element) {
                 setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
             }
        }
    }, [plan.plan, today]);

    return (
        <div className="space-y-8" ref={scrollRef}>
             {plan.plan.map((week, wIndex) => {
                 const isCurrent = isDateInWeek(today, week.startDate, week.endDate);
                 return (
                    <div id={`week-calendar-${week.semaine}`} key={week.semaine} className={`rounded-2xl border p-4 ${isCurrent ? 'bg-[#183C89]/20 border-[#00AFED] ring-1 ring-[#00AFED]/30' : 'bg-black/20 border-white/5'}`}>
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
                            <div>
                                <h3 className={`text-xl font-bold ${isCurrent ? 'text-[#00AFED]' : 'text-white'}`}>Semaine {week.semaine} <span className="text-sm font-normal text-gray-400 ml-2">{formatDate(week.startDate)} au {formatDate(week.endDate)}</span></h3>
                                <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${getPhaseColor(week.phase)}`}>{week.phase}</span>
                                    <span className="text-xs text-gray-400 border border-white/10 px-2 rounded">{week.volumeTotal} km</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                            {week.jours.map((session, sIndex) => {
                                const isToday = session.date === today;
                                return (
                                    <div key={sIndex} className={`${isToday ? 'ring-2 ring-[#FF38B1] rounded-lg' : ''}`}>
                                         <div className="text-center text-xs text-gray-400 mb-1">{session.jour} {new Date(session.date).getDate()}</div>
                                         <SessionCard 
                                            session={session} 
                                            feedback={completionStatus[`${wIndex}_${sIndex}`]} 
                                            onToggle={() => onToggle(wIndex, sIndex, session)}
                                            onInfoClick={() => onInfo(session, completionStatus[`${wIndex}_${sIndex}`])}
                                            minimal={true}
                                         />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 )
             })}
        </div>
    )
}

// Template for HTML2PDF - Weeks ONLY (Lexique is handled programmatically)
const PDFExportTemplate: React.FC<{ plan: DetailedTrainingPlan, userProfile: FormData }> = ({ plan, userProfile }) => (
    <div id="pdf-content" className="p-8 bg-white text-gray-800" style={{ width: '210mm', minHeight: '297mm' }}>
        <h1 className="text-3xl font-bold text-[#183C89] mb-4">Plan SARC - {userProfile.objective}</h1>
        <p className="mb-8">Objectif: {formatDate(plan.raceDate)}</p>
        <div className="space-y-6 mb-8">
            {plan.plan.map((week) => (
                <div key={week.semaine} className="break-inside-avoid">
                    <h3 className="text-xl font-bold mb-2 text-[#183C89] border-b border-[#00AFED]">Semaine {week.semaine} - {week.phase}</h3>
                    <div className="grid grid-cols-1 gap-1">
                        {week.jours.map((session, index) => (
                            <div key={index} className="p-2 border-b text-sm">
                                <span className="font-bold">{session.jour} {formatDate(session.date)}</span> - {session.type} ({session.volume} km)
                                <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{session.contenu}</div>
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
    onOptimizeRequest?: () => void;
    isOptimizing?: boolean;
    optimizationSuggestions?: OptimizationSuggestion[] | null;
    optimizationError?: string | null;
}

const TrainingPlanDisplay: React.FC<TrainingPlanDisplayProps> = ({ 
    savedPlan, onUpdateCompletion, onNewPlanRequest
}) => {
    const [selectedSession, setSelectedSession] = useState<{session: DetailedSession, feedback: SessionFeedback | undefined} | null>(null);
    const [feedbackTarget, setFeedbackTarget] = useState<{ weekIndex: number, sessionIndex: number, session: DetailedSession } | null>(null);
    const [suggestionTarget, setSuggestionTarget] = useState<DetailedSession | null>(null);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const weekRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const { plan, completionStatus, id: planId } = savedPlan;

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        let currentWeekIndex = -1;

        plan.plan.forEach((week) => {
             if (isDateInWeek(today, week.startDate, week.endDate)) {
                 currentWeekIndex = week.semaine;
             }
        });

        if (currentWeekIndex === -1) {
            const firstWeekStart = plan.plan[0].startDate;
            if (new Date(today) < new Date(firstWeekStart)) currentWeekIndex = 1;
            else currentWeekIndex = plan.plan[plan.plan.length - 1].semaine;
        }

        setExpandedWeeks(new Set([currentWeekIndex, currentWeekIndex + 1]));
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

        const allures = plan.alluresReference;

        const opt = {
            margin: 0,
            filename: `plan-sarc.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };

        (window as any).html2pdf().from(element).set(opt).toPdf().get('pdf').then((doc: any) => {
            let y = newPage(doc);

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(18);
            y = ensureSpace(doc, y, 24);
            doc.text("Lexique & Allures Personnelles", 40, y);
            y += 18;

            doc.setDrawColor(0, 175, 237);
            doc.setLineWidth(1);
            doc.line(40, y, doc.internal.pageSize.width - 40, y);
            y += 12;

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(10);
            y = ensureSpace(doc, y, 30);
            doc.text(
            "Vos allures de référence pour suivre ce plan, calculées selon votre profil.",
            40,
            y
            );
            y += 20;

            const items = [
                { label: "EF – Endurance Fondamentale", description: "Allure confortable, respiration aisée, tu peux parler en phrases complètes.", pace: allures.ef },
                { label: "Seuil", description: "Allure soutenue mais contrôlée, juste sous LT2.", pace: allures.seuil },
                { label: "VMA – Vitesse Max Aérobie", description: "Allure très intense utilisée pour l'intervallé court.", pace: allures.vma },
                { label: "AS10 (Allure 10 km)", description: "Allure cible 10 km.", pace: allures.as10 },
                { label: "AS21 (Allure Semi)", description: "Allure Semi-Marathon.", pace: allures.as21 },
                { label: "AS42 (Allure Marathon)", description: "Allure Marathon.", pace: allures.as42 }
            ];

            const cardHeight = 52;
            const cardSpacing = 10;
            const left = 40;
            const right = doc.internal.pageSize.width - 40;

            items.forEach(item => {
                y = ensureSpace(doc, y, cardHeight + cardSpacing);

                doc.setFillColor(248, 249, 252);
                doc.setDrawColor(220, 225, 235);
                doc.roundedRect(left, y, right - left, cardHeight, 4, 4, "FD");

                let textY = y + 16;
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                doc.text(item.label, left + 10, textY);

                doc.setFont("Helvetica", "normal");
                doc.setFontSize(9);
                const descLines = doc.splitTextToSize(item.description, right - left - 20);
                textY += 10;
                doc.text(descLines, left + 10, textY);

                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(0, 63, 137);
                doc.text(item.pace, right - 10, y + 16, { align: "right" });
                doc.setTextColor(0, 0, 0);

                y += cardHeight + cardSpacing;
            });
        }).save();
    };

    return (
        <div className="animate-fade-in relative pb-12">
             <div style={{ position: 'absolute', left: '-9999px', top: 'auto' }}>
                <PDFExportTemplate plan={plan} userProfile={savedPlan.userProfile} />
            </div>

            <div className="text-center mb-8 no-print pt-6">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Calendrier Réel</h1>
                <p className="text-xl text-gray-300">Objectif : <span className="text-[#00AFED] font-bold">{formatDate(plan.raceDate)}</span></p>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className="px-5 py-2 text-sm bg-[#FF38B1] text-white rounded-full hover:bg-[#FF38B1]/80 glow-shadow-pink">
                        {viewMode === 'list' ? '📅 Vue Calendrier' : '📝 Vue Liste'}
                    </button>
                    <button onClick={handlePrint} className="px-5 py-2 text-sm bg-white/10 text-white rounded-full hover:bg-white/20">🖨️ PDF</button>
                    <button onClick={onNewPlanRequest} className="px-5 py-2 text-sm bg-[#00AFED] text-white rounded-full hover:bg-[#0095c7]">Nouveau Plan</button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <CalendarView 
                    plan={plan} 
                    completionStatus={completionStatus} 
                    onToggle={handleToggleSession}
                    onInfo={(sess, fb) => setSelectedSession({session: sess, feedback: fb})}
                />
            ) : (
                <div className="space-y-6 no-print">
                    {plan.plan.map((week, weekIndex) => {
                        const isExpanded = expandedWeeks.has(week.semaine);
                        const today = new Date().toISOString().split('T')[0];
                        const isCurrent = isDateInWeek(today, week.startDate, week.endDate);
                        
                        return (
                            <div 
                                key={week.semaine} 
                                ref={(el) => { weekRefs.current[week.semaine] = el; }}
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
            )}

            {/* Lexique Section Web */}
            <section className="mt-12 bg-black/20 border border-white/10 rounded-3xl p-6 md:p-8 no-print">
                <h2 className="text-2xl font-semibold text-white mb-4">
                    Lexique &amp; Allures Personnelles
                </h2>

                <p className="text-sm text-gray-300 mb-6">
                    Voici les allures et termes clés utilisés dans ton plan. Garde ce bloc sous la main pour ne jamais être perdu pendant tes séances.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LexiqueItem
                        label="EF – Endurance Fondamentale"
                        pace={plan.alluresReference.ef}
                        description="Allure confortable, respiration aisée, tu peux parler en phrases complètes. Base de 70–80 % de ton volume."
                    />
                    <LexiqueItem
                        label="Seuil"
                        pace={plan.alluresReference.seuil}
                        description="Allure soutenue mais contrôlée, tu es juste en dessous de la zone où ça “brûle”. Sert à améliorer ta capacité à tenir une allure rapide longtemps."
                    />
                    <LexiqueItem
                        label="VMA – Vitesse Max Aérobie"
                        pace={plan.alluresReference.vma}
                        description="Allure très intense que tu peux tenir 4 à 7 minutes. Utilisée pour les intervalles courts (200–400 m, 30/30...)."
                    />
                    <LexiqueItem
                        label="AS10"
                        pace={plan.alluresReference.as10}
                        description="Allure cible sur 10 km. Sert pour les blocs de travail spécifique 10 km."
                    />
                    <LexiqueItem
                        label="AS21"
                        pace={plan.alluresReference.as21}
                        description="Allure cible Semi-Marathon. Utilisée pour les blocs d’endurance soutenue."
                    />
                    <LexiqueItem
                        label="AS42"
                        pace={plan.alluresReference.as42}
                        description="Allure cible Marathon. Base des séances spécifiques longues pour les prépas marathon."
                    />
                </div>
            </section>

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
                             <div className="bg-white/5 p-4 rounded-lg space-y-2">
                                <p className="font-medium text-white mb-2 uppercase text-sm border-b border-white/10 pb-1">Détails de la séance</p>
                                {selectedSession.session.warmup && <p><span className="text-gray-400 text-xs uppercase font-bold">Échauffement :</span> {selectedSession.session.warmup}</p>}
                                {selectedSession.session.mainBlock && <p className="bg-white/5 p-2 rounded"><span className="text-[#00AFED] text-xs uppercase font-bold block mb-1">Bloc Principal :</span> {selectedSession.session.mainBlock}</p>}
                                {selectedSession.session.cooldown && <p><span className="text-gray-400 text-xs uppercase font-bold">Retour au calme :</span> {selectedSession.session.cooldown}</p>}
                                {(!selectedSession.session.warmup && !selectedSession.session.mainBlock) && <div className="whitespace-pre-wrap">{selectedSession.session.contenu}</div>}
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