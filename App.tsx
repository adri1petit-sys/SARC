import React, { useState, useEffect } from 'react';
import type { User } from './types';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import AuthPage from './components/AuthPage';
import Chatbot from './components/Chatbot';
import { getCurrentUser, logout } from './services/authService';
import { getApiKey } from './services/geminiService';

const Logo = () => (
    <div className="flex items-center space-x-3">
        <img src="https://i.postimg.cc/vHTLCvyW/Untitled-4.png" alt="SARC Logo" className="h-10 w-10"/>
        <span className="text-xl font-semibold text-white tracking-tight">Saint-Avertin Run Club</span>
    </div>
);

const ApiKeyErrorDisplay: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="min-h-screen bg-[#0B1226] text-gray-200 antialiased flex flex-col">
        <header className="w-full z-50 bg-[#0B1226]/50 backdrop-blur-lg border-b border-white/10 no-print">
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                <Logo />
            </nav>
        </header>
        <main className="flex-grow flex items-center justify-center p-4">
            <div className="text-center w-full max-w-4xl animate-fade-in">
                <div className="bg-black/40 backdrop-blur-xl border border-[#FF38B1] rounded-3xl p-8 sm:p-12 shadow-2xl glow-shadow-pink mx-auto relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#FF38B1] to-transparent"></div>
                    
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#FF38B1] mb-6">Configuration Manquante</h2>
                    
                    <div className="text-left space-y-6 text-gray-300 mb-8 max-w-2xl mx-auto">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">!</div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Clé API introuvable</h3>
                                <p className="text-sm mt-1">L'application ne trouve pas la clé API nécessaire pour communiquer avec l'IA.</p>
                            </div>
                        </div>

                        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                            <h3 className="font-bold text-[#00AFED] text-lg mb-3 flex items-center gap-2">
                                🛠️ Comment corriger (Vercel / Netlify)
                            </h3>
                            <ol className="list-decimal list-inside space-y-3 text-sm">
                                <li>
                                    Allez sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-white underline hover:text-[#00AFED]">Google AI Studio</a> pour récupérer votre clé.
                                </li>
                                <li>
                                    Dans les paramètres de votre hébergeur (ex: Vercel &rarr; Settings &rarr; Environment Variables), ajoutez une nouvelle variable :
                                </li>
                            </ol>
                            <div className="mt-4 font-mono bg-black/50 p-4 rounded-lg border border-white/10 flex flex-col sm:flex-row gap-2 items-center justify-center sm:justify-start">
                                <span className="text-[#FF38B1] font-bold">VITE_API_KEY</span>
                                <span className="hidden sm:inline text-gray-500">=</span>
                                <span className="text-gray-400 truncate max-w-[200px]">AIzaSy...</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">
                                ⚠️ Important : Le préfixe <strong>VITE_</strong> est obligatoire pour que la clé soit accessible par le navigateur.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-3 text-lg font-semibold text-white rounded-full bg-[#00AFED] transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 glow-shadow-hover"
                        >
                            J'ai ajouté la clé, Réessayer
                        </button>
                    </div>
                </div>
            </div>
        </main>
        <footer className="w-full container mx-auto px-6 py-6 text-center text-gray-400 border-t border-white/10 no-print">
            <p>&copy; {new Date().getFullYear()} Saint-Avertin Run Club. Propulsé par l'IA.</p>
        </footer>
    </div>
);


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        setIsLoading(true);
        setApiKeyError(null);

        const key = getApiKey();

        if (!key) {
            setApiKeyError("missing_key");
            setIsLoading(false);
            return;
        }

        try {
            const user = getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }
        } catch (error) {
            console.error("Failed to load user session:", error);
        } finally {
            setIsLoading(false);
        }
    }, [retryCount]);
    
    const handleLogout = () => {
        logout();
        setCurrentUser(null);
    };

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setShowAuth(false);
    };

    const renderPage = () => {
        if (isLoading) {
            return (
                <div className="text-center py-20 flex flex-col items-center justify-center min-h-[60vh]">
                     <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-[#00AFED]/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-[#00AFED] rounded-full animate-spin"></div>
                    </div>
                </div>
            );
        }
        if (currentUser) {
            return <DashboardPage user={currentUser} />;
        }
        return <LandingPage onAuthRequest={() => setShowAuth(true)} />;
    };
    
    if (apiKeyError) {
        return <ApiKeyErrorDisplay error={apiKeyError} onRetry={() => setRetryCount(c => c + 1)} />;
    }


    return (
        <div className="min-h-screen bg-[#0B1226] text-gray-200 antialiased">
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1226]/50 backdrop-blur-lg border-b border-white/10 no-print">
                <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                    <Logo />
                    {currentUser ? (
                         <button onClick={handleLogout} className="px-4 py-2 text-sm font-semibold text-white rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-500/50">
                            Déconnexion
                        </button>
                    ) : (
                         <button onClick={() => setShowAuth(true)} className="px-4 py-2 text-sm font-semibold text-white rounded-full bg-[#00AFED] hover:bg-[#0095c7] transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#00AFED]/50 glow-shadow-hover">
                            Générer mon Plan
                        </button>
                    )}
                </nav>
            </header>
            
            {renderPage()}
            
            {showAuth && !currentUser && (
                <AuthPage 
                    onClose={() => setShowAuth(false)} 
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            {currentUser && <Chatbot />}

            <footer className="container mx-auto px-6 py-6 text-center text-gray-400 border-t border-white/10 no-print">
                <p>&copy; {new Date().getFullYear()} Saint-Avertin Run Club. Propulsé par l'IA.</p>
            </footer>
        </div>
    );
};

export default App;