import React, { useState, useEffect } from 'react';
import type { User, SavedPlan, DetailedTrainingPlan, FormData, CompletionStatus } from '../types';
import { getPlansForUser, savePlanForUser, updatePlanCompletion } from '../services/planService';
import GeneratorPage from './GeneratorPage';
import TrainingPlanDisplay from './TrainingPlanDisplay';

interface DashboardPageProps {
    user: User;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
    const [view, setView] = useState<'dashboard' | 'generator'>('dashboard');
    const [plans, setPlans] = useState<SavedPlan[]>([]);
    const [activePlan, setActivePlan] = useState<SavedPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPlans = () => {
            setIsLoading(true);
            const userPlans = getPlansForUser(user.id);
            setPlans(userPlans);
            const currentActivePlan = userPlans.find(p => p.isActive) || userPlans[0] || null;
            setActivePlan(currentActivePlan);
            setIsLoading(false);
        };
        loadPlans();
    }, [user.id]);

    const handlePlanGenerated = (planData: DetailedTrainingPlan, formData: FormData) => {
        const newPlan = savePlanForUser(user.id, planData, formData);
        setPlans(prev => [newPlan, ...prev.map(p => ({...p, isActive: false}))]);
        setActivePlan(newPlan);
        setView('dashboard');
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
                    onCancel={() => setView('dashboard')}
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
                Bienvenue sur votre tableau de bord personnel.
            </p>

            <div className="flex-1">
                {activePlan ? (
                    <TrainingPlanDisplay
                        savedPlan={activePlan}
                        onUpdateCompletion={handleUpdateCompletion}
                        onNewPlanRequest={handleNewPlanRequest}
                    />
                ) : (
                    <div className="text-center bg-black/20 border border-white/10 rounded-2xl p-12 mt-10">
                        <h2 className="text-2xl font-bold mb-2">Vous n'avez pas encore de plan d'entraînement.</h2>
                        <p className="text-gray-300 mb-6">Créez votre premier plan personnalisé pour commencer votre progression !</p>
                        <button onClick={() => setView('generator')} className="px-8 py-3 text-lg font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 glow-shadow-hover">
                            🚀 Générer mon premier plan
                        </button>
                    </div>
                )}

                {plans.length > 1 && (
                    <div className="mt-16 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Historique des plans</h2>
                        <div className="space-y-3">
                            {plans.map(plan => (
                                <div key={plan.id} onClick={() => {
                                    setActivePlan(plan)
                                    }} className={`p-4 border rounded-lg cursor-pointer transition-colors ${activePlan?.id === plan.id ? 'bg-[#00AFED]/20 border-[#00AFED]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                                    <p className="font-semibold">{plan.userProfile.objective} - {plan.userProfile.duration} semaines</p>
                                    <p className="text-sm text-gray-400">Créé le {new Date(plan.createdAt).toLocaleDateString('fr-FR')}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default DashboardPage;