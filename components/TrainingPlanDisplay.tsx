import React, { useState, useEffect, useRef } from 'react';
import type { DetailedTrainingPlan, DetailedSession, FormData, SavedPlan, CompletionStatus, SessionFeedback, OptimizationSuggestion } from '../types';
import { getSessionSuggestion } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

// --- PDF HELPERS ---
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 60; // Increased to ensure ~3-4 lines of white space
const LINE_HEIGHT = 14;
const PAGE_HEIGHT_A4 = 841.89; // Points (pt) for A4
const PAGE_WIDTH_A4 = 595.28;

function ensureSpace(doc: any, currentY: number, neededHeight: number): number {
  if (currentY + neededHeight > PAGE_HEIGHT_A4 - MARGIN_BOTTOM) {
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

    useEffect(() => {
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

    // Force default to Calendar when plan changes
    useEffect(() => {
        setViewMode('calendar');
    }, [planId]);

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
        if (!(window as any).html2pdf) return;
        
        // Use html2pdf to access jsPDF, but do manual drawing for perfect pages
        const worker = (window as any).html2pdf();
        // Create a dummy PDF just to get the instance, or manually instantiate if imported.
        // Since we are using CDN, we'll leverage the worker to get a jsPDF object.
        const opt = {
            margin: 0,
            filename: `Plan_SARC_${savedPlan.userProfile.objective}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };

        // We use a trick: render an empty div, then hook into the callback to draw manually
        worker.set(opt).from(document.createElement('div')).toPdf().get('pdf').then((doc: any) => {
            // --- MANUAL PDF GENERATION START ---
            let y = MARGIN_TOP;
            const leftX = 40;
            const rightX = PAGE_WIDTH_A4 - 40;
            const contentWidth = rightX - leftX;

            // Title Page
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(24, 60, 137); // #183C89
            doc.text("Plan d'Entraînement SARC", leftX, y);
            y += 30;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 175, 237); // #00AFED
            doc.text(`Objectif: ${savedPlan.userProfile.objective} (${savedPlan.userProfile.targetTime})`, leftX, y);
            y += 20;
            doc.setTextColor(50, 50, 50);
            doc.setFont("Helvetica", "normal");
            doc.text(`Course le: ${formatDate(plan.raceDate)}`, leftX, y);
            y += 40;

            // Loop through weeks
            plan.plan.forEach((week) => {
                const weekHeaderHeight = 30;
                // Check space for header + at least one session (approx 60pt)
                y = ensureSpace(doc, y, weekHeaderHeight + 60);

                // Week Header
                doc.setFillColor(245, 247, 250);
                doc.setDrawColor(200, 200, 200);
                doc.rect(leftX, y, contentWidth, weekHeaderHeight, "F");
                
                doc.setFont("Helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(24, 60, 137);
                doc.text(`Semaine ${week.semaine} - ${week.phase}`, leftX + 10, y + 20);
                
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`${formatDate(week.startDate)} au ${formatDate(week.endDate)}`, rightX - 10, y + 20, { align: "right" });
                y += weekHeaderHeight + 10;

                // Loop through sessions
                week.jours.forEach((session) => {
                    const typeColor = session.type.toLowerCase() === 'repos' ? [150, 150, 150] : [0, 0, 0];
                    const isRepos = session.type.toLowerCase() === 'repos';
                    
                    doc.setFont("Helvetica", "bold");
                    doc.setFontSize(10);
                    const titleLines = doc.splitTextToSize(`${session.jour} ${formatDate(session.date)} - ${session.type}`, contentWidth);
                    const titleHeight = titleLines.length * LINE_HEIGHT;
                    
                    doc.setFont("Helvetica", "normal");
                    doc.setFontSize(9);
                    // Combine contents for display
                    let contentText = "";
                    if (isRepos) {
                        contentText = "Repos complet.";
                    } else {
                         if (session.warmup) contentText += `Warm-up: ${session.warmup}\n`;
                         if (session.mainBlock) contentText += `Bloc: ${session.mainBlock}\n`;
                         if (session.cooldown) contentText += `Cool-down: ${session.cooldown}\n`;
                         if (!session.warmup) contentText += session.contenu;
                    }

                    const contentLines = doc.splitTextToSize(contentText, contentWidth - 10);
                    const contentHeight = contentLines.length * LINE_HEIGHT;
                    const totalSessionHeight = titleHeight + contentHeight + 15; // + padding

                    y = ensureSpace(doc, y, totalSessionHeight);

                    // Draw Session
                    doc.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
                    doc.setFont("Helvetica", "bold");
                    doc.text(titleLines, leftX, y);
                    y += titleHeight;

                    if (!isRepos) {
                         doc.setTextColor(80, 80, 80);
                         doc.setFont("Helvetica", "normal");
                         doc.text(contentLines, leftX + 10, y);
                    }
                    
                    y += contentHeight + 15;
                    
                    // Separator line
                    doc.setDrawColor(230, 230, 230);
                    doc.line(leftX, y - 8, rightX, y - 8);
                });
                y += 20; // Space between weeks
            });

            // Lexique (New Page if needed, but usually starts on new page for clean look)
            doc.addPage();
            y = MARGIN_TOP;

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(24, 60, 137);
            doc.text("Lexique & Allures Personnelles", leftX, y);
            y += 30;

            const allures = plan.alluresReference;
            const items = [
                { label: "EF – Endurance Fondamentale", description: "Allure confortable, respiration aisée. Base de 70–80 % de ton volume.", pace: allures.ef },
                { label: "Seuil", description: "Allure soutenue mais contrôlée, juste sous LT2.", pace: allures.seuil },
                { label: "VMA", description: "Vitesse Max Aérobie, pour le fractionné court.", pace: allures.vma },
                { label: "AS10", description: "Allure 10 km.", pace: allures.as10 },
                { label: "AS21", description: "Allure Semi-Marathon.", pace: allures.as21 },
                { label: "AS42", description: "Allure Marathon.", pace: allures.as42 }
            ];

             items.forEach(item => {
                const cardHeight = 60;
                y = ensureSpace(doc, y, cardHeight + 10);

                doc.setFillColor(248, 249, 252);
                doc.setDrawColor(220, 225, 235);
                doc.roundedRect(leftX, y, contentWidth, cardHeight, 4, 4, "FD");

                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.text(item.label, leftX + 10, y + 20);

                doc.setFont("Helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text(item.description, leftX + 10, y + 35);

                doc.setFont("Helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(0, 63, 137);
                doc.text(item.pace, rightX - 10, y + 20, { align: "right" });

                y += cardHeight + 15;
            });

            // --- MANUAL PDF GENERATION END ---
            doc.save(`Plan_SARC_${savedPlan.userProfile.objective}.pdf`);
        });
    };

    return (
        <div className="animate-fade-in relative pb-12">
            <div className="text-center mb-8 no-print pt-6">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Calendrier Réel</h1>
                <p className="text-xl text-gray-300">Objectif : <span className="text-[#00AFED] font-bold">{formatDate(plan.raceDate)}</span></p>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className="px-5 py-2 text-sm bg-[#FF38B1] text-white rounded-full hover:bg-[#FF38B1]/80 glow-shadow-pink">
                        {viewMode === 'list' ? '📅 Vue Calendrier' : '📝 Vue Liste'}
                    </button>
                    <button onClick={handlePrint} className="px-5 py-2 text-sm bg-white/10 text-white rounded-full hover:bg-white/20">🖨️ PDF (A4)</button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LexiqueItem label="EF" pace={plan.alluresReference.ef} description="Base aérobie." />
                    <LexiqueItem label="Seuil" pace={plan.alluresReference.seuil} description="Soutenu contrôlé." />
                    <LexiqueItem label="VMA" pace={plan.alluresReference.vma} description="Haute intensité." />
                    <LexiqueItem label="AS10" pace={plan.alluresReference.as10} description="Cible 10km." />
                    <LexiqueItem label="AS21" pace={plan.alluresReference.as21} description="Cible Semi." />
                    <LexiqueItem label="AS42" pace={plan.alluresReference.as42} description="Cible Marathon." />
                </div>
            </section>

            {feedbackTarget && <FeedbackModal session={feedbackTarget.session} onClose={() => setFeedbackTarget(null)} onSubmit={handleFeedbackSubmit} />}
            {suggestionTarget && <SessionSuggestionModal session={suggestionTarget} onClose={() => setSuggestionTarget(null)} />}
            
            {/* Modal Detail Session */}
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
                            
                            {/* TYPING BAR REPLACEMENT */}
                            <div className="mt-6 cursor-pointer" onClick={() => { setSelectedSession(null); setSuggestionTarget(selectedSession.session); }}>
                              <div className="w-full rounded-full bg-white/5 border border-white/15 px-4 py-3 text-sm text-gray-400 flex items-center hover:bg-white/10 transition-colors">
                                <span className="flex-1 select-none opacity-70">
                                  Modifier ma séance...
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingPlanDisplay;