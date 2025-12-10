
import React, { useState, useEffect } from 'react';
import type { User, SavedPlan, DetailedTrainingPlan, FormData, CompletionStatus } from '../types';
import { getPlansForUser, updatePlanCompletion, deletePlan, deleteAllPlansForUser } from '../services/planService';
import GeneratorPage from './GeneratorPage';
import TrainingPlanDisplay from './TrainingPlanDisplay';
import ConfirmationModal from './ConfirmationModal';

// Icons
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

interface DashboardPageProps {
    user: User;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
    const [view, setView] = useState<'calendar' | 'generator'>('calendar');
    const [plans, setPlans] = useState<SavedPlan[]>([]);
    const [activePlan, setActivePlan] = useState<SavedPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'single' | 'all';
        targetId?: string;
    }>({ isOpen: false, type: 'single' });

    useEffect(() => {
        loadPlans();
    }, [user.id]);

    const loadPlans = () => {
        setIsLoading(true);
        const userPlans = getPlansForUser(user.id);
        setPlans(userPlans);
        
        // Find the plan marked as active by the service
        const currentActivePlan = userPlans.find(p => p.isActive) || null;
        setActivePlan(currentActivePlan);
        
        setIsLoading(false);
    };

    const handlePlanGenerated = (planData: DetailedTrainingPlan, formData: FormData) => {
        // The plan has already been saved by geminiService.
        // We just need to reload the plans from storage to get the new SavedPlan (with ID).
        loadPlans();
        setView('calendar');
    };

    const handleUpdateCompletion = (planId: string, newStatus: CompletionStatus) => {
        updatePlanCompletion(planId, newStatus);
        const updatedPlans = plans.map(p => p.id === planId ? {...p, completionStatus: newStatus} : p);
        setPlans(updatedPlans);
        if (activePlan?.id === planId) {
            setActivePlan(prev => prev ? {...prev, completionStatus: newStatus} : null);
        }
    };
    
    const handleNewPlanRequest = () => {
        setView('generator');
    }

    // --- Delete Logic ---

    const confirmDeletePlan = (id: string) => {
        setModalConfig({ isOpen: true, type: 'single', targetId: id });
    };

    const confirmDeleteAll = () => {
        setModalConfig({ isOpen: true, type: 'all' });
    };

    const handleExecuteDelete = () => {
        if (modalConfig.type === 'single' && modalConfig.targetId) {
            deletePlan(modalConfig.targetId);
            
            // If we deleted the active plan, reset active plan
            if (activePlan?.id === modalConfig.targetId) {
                setActivePlan(null);
            }
        } else if (modalConfig.type === 'all') {
            deleteAllPlansForUser(user.id);
            setActivePlan(null);
        }
        
        loadPlans(); // Reload from storage
        setModalConfig({ isOpen: false, type: 'single' });
    };

    if (isLoading) {
        return (
             <div className="text-center py-20 flex flex-col items-center justify-center flex-grow">
                 <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-[#00AFED]/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-[#00AFED] rounded-full animate-spin"></div>
                </div>
            </div>
        )
    }

    if (view === 'generator') {
        return (
             <main className="container mx-auto px-6 py-12 flex-grow flex flex-col">
                <GeneratorPage 
                    onPlanGenerated={handlePlanGenerated}
                    onCancel={() => setView('calendar')}
                />
            </main>
        )
    }

    return (
        <main className="container mx-auto px-6 py-8 flex-grow flex flex-col">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Bonjour {user.name}, prêt à vous entraîner ?
            </h1>
            <p className="text-lg text-gray-400 mb-8">
                Bienvenue sur votre calendrier d'entraînement.
            </p>

            <div className="flex-1">
                {activePlan ? (
                    <TrainingPlanDisplay
                        savedPlan={activePlan}
                        onUpdateCompletion={handleUpdateCompletion}
                        onNewPlanRequest={handleNewPlanRequest}
                    />
                ) : (
                    <div className="text-center bg-black/20 border border-white/10 rounded-2xl p-12 mt-10 animate-fade-in">
                        <h2 className="text-2xl font-bold mb-2">Vous n'avez pas de plan actif.</h2>
                        <p className="text-gray-300 mb-6">Créez un nouveau plan personnalisé pour commencer votre progression !</p>
                        <button onClick={() => setView('generator')} className="px-8 py-3 text-lg font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 glow-shadow-hover">
                            🚀 Générer mon plan
                        </button>
                    </div>
                )}

                {plans.length > 0 && (
                    <div className="mt-16 mb-8 border-t border-white/10 pt-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Historique des plans</h2>
                            <button 
                                onClick={confirmDeleteAll}
                                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded-full hover:bg-red-500/10 transition-colors"
                            >
                                <TrashIcon /> Tout supprimer
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {plans.map(plan => (
                                <div 
                                    key={plan.id} 
                                    className={`relative group p-4 border rounded-xl transition-all duration-300 ${activePlan?.id === plan.id ? 'bg-[#00AFED]/20 border-[#00AFED] ring-1 ring-[#00AFED]/50' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                                >
                                    <div 
                                        className="cursor-pointer"
                                        onClick={() => { setActivePlan(plan); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-white text-lg">{plan.userProfile.objective}</p>
                                                <p className="text-[#00AFED] text-sm font-medium">{plan.userProfile.duration} semaines</p>
                                            </div>
                                            {activePlan?.id === plan.id && <span className="flex h-2 w-2 rounded-full bg-[#00AFED]"></span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3">Créé le {new Date(plan.createdAt).toLocaleDateString('fr-FR')}</p>
                                    </div>

                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); confirmDeletePlan(plan.id); }}
                                        className="absolute bottom-4 right-4 p-2 text-gray-500 hover:text-red-400 bg-black/20 hover:bg-black/40 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Supprimer ce plan"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.type === 'single' ? "Supprimer ce plan ?" : "Tout supprimer ?"}
                message={modalConfig.type === 'single' 
                    ? "Cette action est irréversible. Le plan sera définitivement retiré de votre historique." 
                    : "Attention ! Vous allez supprimer l'intégralité de votre historique de plans. Cette action est irréversible."
                }
                confirmLabel="Supprimer"
                isDestructive={true}
                onConfirm={handleExecuteDelete}
                onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
            />
        </main>
    );
};

export default DashboardPage;
