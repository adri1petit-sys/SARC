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
             <div className="text-center w-full max-w-4xl">
                <h2 className="text-3xl font-bold text-[#FF38B1] mb-6">Clé API Manquante</h2>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#00AFED] rounded-full text-white">Réessayer</button>
            </div>
        </main>
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
        <div className="min-h-screen flex flex-col bg-[#0B1226] text-gray-200 antialiased">
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
            
            <div className="flex-grow flex flex-col pt-16">
                 {renderPage()}
            </div>
            
            {showAuth && !currentUser && (
                <AuthPage 
                    onClose={() => setShowAuth(false)} 
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            {currentUser && <Chatbot />}

            <footer className="w-full bg-[#0B1226] border-t border-white/10 py-6 text-center text-gray-400 no-print mt-auto">
                <p>&copy; {new Date().getFullYear()} Saint-Avertin Run Club.</p>
            </footer>
        </div>
    );
};

export default App;