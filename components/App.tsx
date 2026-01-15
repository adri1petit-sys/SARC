
import React, { useState } from 'react';
import LandingPage from './LandingPage';
import GeneratorPage from './GeneratorPage';

const Logo = () => (
    <div className="flex items-center justify-center space-x-2 md:space-x-3">
        <img 
            src="https://i.postimg.cc/G3NV2Z4M/Generated-Image-December-11-2025-11-40AM-modified.png" 
            alt="SARC Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full object-cover shadow-lg border border-white/10"
        />
        <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tighter drop-shadow-md whitespace-nowrap">
            SAINT AVERTIN RUN CLUB
        </span>
    </div>
);

const App: React.FC = () => {
    // État simple pour la navigation : soit on est sur la Landing, soit sur le Générateur
    const [currentView, setCurrentView] = useState<'landing' | 'generator'>('landing');

    const renderPage = () => {
        if (currentView === 'generator') {
            return (
                <main className="container mx-auto px-4 sm:px-6 py-8 flex-grow flex flex-col">
                    <GeneratorPage 
                        onCancel={() => setCurrentView('landing')} 
                    />
                </main>
            );
        }
        return <LandingPage onStart={() => setCurrentView('generator')} />;
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0B1226] text-gray-200 antialiased font-sans">
            {/* Header fixe simplifié */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1226]/90 backdrop-blur-xl border-b border-white/10 no-print transition-all duration-300">
                <nav className="container mx-auto px-3 sm:px-6 py-4 flex justify-center items-center relative">
                    <div onClick={() => setCurrentView('landing')} className="cursor-pointer transition-opacity hover:opacity-80">
                        <Logo />
                    </div>
                </nav>
            </header>
            
            {/* Contenu Principal avec padding pour le header fixe */}
            <div className="flex-grow flex flex-col pt-24 sm:pt-28 pb-10">
                 {renderPage()}
            </div>
            
            {/* Footer */}
            <footer className="w-full bg-[#0B1226] border-t border-white/10 py-8 text-center text-gray-400 no-print mt-auto">
                <p className="text-sm font-medium opacity-60">
                    &copy; {new Date().getFullYear()} Saint-Avertin Run Club. <br className="sm:hidden"/> Performance & Convivialité.
                </p>
            </footer>
        </div>
    );
};

export default App;
