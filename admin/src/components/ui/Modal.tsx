'use client';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus sur la fenêtre à l'ouverture, rendu à l'élément d'origine à la fermeture
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previous?.focus?.();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      {/* Hauteur bornée à l'écran (1366×768 compris) : en-tête et pied fixes, contenu défilant */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full animate-fade-up flex flex-col max-h-[calc(100vh-2rem)] outline-none', sizes[size])}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto min-h-0">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
