import React, { useState } from 'react';
import { login, signup } from '../services/authService';
import type { User } from '../types';

interface AuthPageProps {
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onClose, onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            let user: User | null;
            if (isLoginView) {
                user = login(email, password);
            } else {
                user = signup(email, name, password);
            }
            if (user) {
                onLoginSuccess(user);
            }
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gradient-to-br from-[#183C89] to-[#0a1024] border border-white/20 rounded-2xl p-10 max-w-md w-11/12 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <h2 className="text-3xl font-bold text-white mb-6">{isLoginView ? 'Connexion' : 'Créer un compte'}</h2>
                    <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginView && (
                        <input
                            type="text"
                            placeholder="Prénom"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 outline-none focus:ring-2 focus:ring-[#FF38B1]"
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 outline-none focus:ring-2 focus:ring-[#FF38B1]"
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 outline-none focus:ring-2 focus:ring-[#FF38B1]"
                    />
                     {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" className="w-full px-8 py-3 text-lg font-semibold text-black rounded-full bg-[#FF38B1] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#FF38B1]/50 glow-shadow-pink-hover">
                        {isLoginView ? 'Se connecter' : "S'inscrire"}
                    </button>
                </form>

                <p className="text-center text-gray-400 mt-6 text-sm">
                    {isLoginView ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-[#00AFED] hover:underline ml-2">
                        {isLoginView ? "S'inscrire" : 'Se connecter'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;