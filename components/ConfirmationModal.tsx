
import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = "Confirmer",
    cancelLabel = "Annuler",
    isDestructive = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] animate-fade-in"
            onClick={onCancel}
        >
            <div 
                className="bg-gradient-to-br from-[#183C89] to-[#0a1024] border border-white/20 rounded-2xl p-8 max-w-md w-11/12 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-gray-300 leading-relaxed">{message}</p>
                </div>

                <div className="flex justify-end gap-4">
                    <button 
                        onClick={onCancel} 
                        className="px-6 py-2 text-base text-gray-300 rounded-full hover:bg-white/10 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`px-6 py-2 text-base font-semibold text-white rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 shadow-lg ${
                            isDestructive 
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600/50' 
                                : 'bg-[#00AFED] hover:bg-[#0095c7] focus:ring-[#00AFED]/50'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
