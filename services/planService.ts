import type { SavedPlan, DetailedTrainingPlan, FormData, CompletionStatus } from '../types';

const PLANS_KEY = 'sarc_plans_v2';

const getAllPlans = (): SavedPlan[] => {
    try {
        const plans = localStorage.getItem(PLANS_KEY);
        return plans ? JSON.parse(plans) : [];
    } catch (e) {
        return [];
    }
};

const saveAllPlans = (plans: SavedPlan[]) => {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
};

export const getPlansForUser = (userId: string): SavedPlan[] => {
    const allPlans = getAllPlans();
    // Return plans for specific user, sorted by newest first
    return allPlans
        .filter(plan => plan.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const savePlanForUser = (userId: string, planData: DetailedTrainingPlan, formData: FormData): SavedPlan => {
    let allPlans = getAllPlans();
    
    // Set all other plans for this user to inactive (only one active plan at a time)
    allPlans = allPlans.map(p => {
        if (p.userId === userId) {
            return { ...p, isActive: false };
        }
        return p;
    });

    const newPlan: SavedPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        plan: planData,
        userProfile: formData,
        createdAt: new Date().toISOString(),
        isActive: true, // New plan is always active
        completionStatus: {},
    };

    allPlans.push(newPlan);
    saveAllPlans(allPlans);
    return newPlan;
};

export const updatePlanCompletion = (planId: string, newStatus: CompletionStatus) => {
    let allPlans = getAllPlans();
    const planIndex = allPlans.findIndex(p => p.id === planId);
    if (planIndex > -1) {
        allPlans[planIndex].completionStatus = newStatus;
        saveAllPlans(allPlans);
    }
};

export const getSharedPlan = (planId: string): SavedPlan | null => {
     const allPlans = getAllPlans();
     return allPlans.find(p => p.id === planId) || null;
}

export const deletePlan = (planId: string) => {
    let allPlans = getAllPlans();
    const filteredPlans = allPlans.filter(p => p.id !== planId);
    saveAllPlans(filteredPlans);
};

export const deleteAllPlansForUser = (userId: string) => {
    let allPlans = getAllPlans();
    const filteredPlans = allPlans.filter(p => p.userId !== userId);
    saveAllPlans(filteredPlans);
};