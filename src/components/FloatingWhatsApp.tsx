import React from 'react';
import { MessageCircle, Zap } from 'lucide-react';
import { StoreSettings } from '../types';

interface FloatingWhatsAppProps {
  settings: StoreSettings;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ settings }) => {
  const cleanPhone = settings.whatsappNumber.replace(/\D/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Olá! Estou navegando na loja e gostaria de atendimento rápido.'
  )}`;

  return (
    <aside aria-label="Atendimento rápido" translate="no" className="notranslate fixed bottom-5 right-4 z-40 flex items-center gap-3">
      {/* Tooltip / Badge requested by user */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        translate="no"
        className="notranslate hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-blue-200/80 hover:bg-blue-50 transition-all text-xs font-bold text-stone-800 group"
      >
        <div className="flex flex-col text-left leading-tight" translate="no">
          <span className="text-stone-900 group-hover:text-blue-700">Fale com a gente no WhatsApp</span>
          <span className="text-blue-700 font-extrabold flex items-center gap-1 text-[11px]">
            <Zap className="w-3 h-3 fill-amber-400 text-amber-500 animate-bounce" />
            Atendimento Rápido em segundos
          </span>
        </div>
      </a>

      {/* Floating Action Button */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale com a gente no WhatsApp. Atendimento rápido!"
        translate="no"
        className="notranslate relative w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all"
      >
        {/* Pulsing rings */}
        <span className="absolute -inset-1 rounded-full bg-blue-500 opacity-30 animate-ping pointer-events-none"></span>
        <MessageCircle className="w-7 h-7" />
        
        {/* Mobile small badge */}
        <span className="sm:hidden absolute -top-1 -right-1 bg-amber-400 text-stone-900 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs border border-white">
          ⚡
        </span>
      </a>
    </aside>
  );
};
