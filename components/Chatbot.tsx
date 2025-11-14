import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, GroundingSource } from '../types';
import { generateChatResponse } from '../services/geminiService';

const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" /></svg>
);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
);
const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
);
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.655-3.654-11.127-8.588l-6.521,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.904,36.45,44,30.85,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
);


const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', parts: [{ text: "Bonjour ! Je suis le coach IA du SARC. Comment puis-je vous aider avec votre entraînement aujourd'hui ?" }] }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        const loadingMessage: ChatMessage = { role: 'model', parts: [{ text: '' }], isLoading: true };
        
        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setInput('');
        setIsLoading(true);

        const history = messages.filter(m => !m.isLoading);

        try {
            const response = await generateChatResponse(history, input, useGoogleSearch);
            const text = response.text;
            
            let sources: GroundingSource[] = [];
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                sources = groundingChunks
                    .filter((chunk: any) => chunk.web)
                    .map((chunk: any) => ({
                        uri: chunk.web.uri,
                        title: chunk.web.title,
                    }));
            }

            const modelMessage: ChatMessage = { role: 'model', parts: [{ text }], sources };
            setMessages(prev => [...prev.slice(0, -1), modelMessage]);

        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Désolé, une erreur est survenue. Veuillez réessayer." }] };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const chatWindow = (
        <div className="fixed bottom-24 right-5 sm:right-8 w-[calc(100%-40px)] sm:w-96 h-[65vh] max-h-[600px] bg-gradient-to-br from-[#0B1226] to-[#183C89] border border-white/20 rounded-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out origin-bottom-right" style={{ transform: isOpen ? 'scale(1)' : 'scale(0)', opacity: isOpen ? 1 : 0}}>
             <header className="flex justify-between items-center p-4 border-b border-white/10">
                <div>
                    <h3 className="text-lg font-bold text-white">SARC AI Coach</h3>
                     <div className="flex items-center mt-1">
                        <label className="relative inline-flex items-center cursor-pointer mr-2">
                            <input type="checkbox" checked={useGoogleSearch} onChange={e => setUseGoogleSearch(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00AFED]"></div>
                        </label>
                        <span className="text-sm text-gray-300 flex items-center gap-1">
                            <GoogleIcon className="w-4 h-4" />
                            Google Search
                        </span>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white p-2 rounded-full hover:bg-white/10">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#00AFED] text-white rounded-br-none' : 'bg-black/20 text-gray-200 rounded-bl-none'}`}>
                            {msg.isLoading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce"></div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-base whitespace-pre-wrap">{msg.parts[0].text}</p>
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-white/20">
                                            <h4 className="text-xs font-semibold mb-1">Sources:</h4>
                                            <ul className="text-xs space-y-1">
                                                {msg.sources.map((source, i) => (
                                                    <li key={i}>
                                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline break-all">
                                                          {i+1}. {source.title || source.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10">
                <div className="flex items-center bg-black/20 rounded-full p-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Posez votre question..."
                        className="flex-1 bg-transparent px-4 py-2 text-white outline-none placeholder-gray-400"
                    />
                    <button onClick={handleSend} disabled={isLoading} className="bg-[#00AFED] rounded-full p-3 text-white disabled:bg-gray-600 transition-colors">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );


    return (
        <div className="fixed bottom-5 right-5 sm:right-8 z-50 no-print">
            {isOpen && chatWindow}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-[#FF38B1] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ease-in-out hover:scale-110 glow-shadow-pink"
                aria-label="Ouvrir le chatbot"
            >
                <ChatIcon className={`w-8 h-8 transition-opacity duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`} />
                 <CloseIcon className={`w-8 h-8 absolute transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
            </button>
        </div>
    );
};

export default Chatbot;
