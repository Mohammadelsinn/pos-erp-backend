import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer = null,
    size = 'md'
}) {
    // Escape key listener to close modal
    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') onClose();
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <div 
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Box */}
            <div className={`w-full ${sizes[size]} z-10 backdrop-blur-2xl bg-slate-900/95 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up duration-250`}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-850 bg-slate-950/20">
                    <h3 className="text-sm font-bold text-slate-200">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg bg-slate-950/50 hover:bg-slate-950 border border-slate-850 text-slate-450 hover:text-slate-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-5 overflow-y-auto flex-1 text-slate-350 text-xs leading-normal">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-5 py-3.5 border-t border-slate-850 bg-slate-950/40 flex items-center justify-end gap-2.5">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
