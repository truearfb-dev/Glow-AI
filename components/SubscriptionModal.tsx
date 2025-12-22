import React from 'react';
import { Loader2 } from 'lucide-react';

interface SubscriptionModalProps {
  onCheck: () => void;
  isChecking: boolean;
  checkError: string | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onCheck, isChecking, checkError }) => {
  const TELEGRAM_CHANNEL_LINK = "https://t.me/groupaifaily";

  const handleSubscribe = () => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(TELEGRAM_CHANNEL_LINK);
    } else {
      window.open(TELEGRAM_CHANNEL_LINK, '_blank');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-rose-200 animate-fade-in">
        
        <div className="flex justify-center mb-6">
          <div className="bg-rose-100 p-4 rounded-full relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <div className="absolute -top-1 -right-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fb7185" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-serif font-bold text-stone-800 mb-3">
          Секрет Красоты
        </h2>
        <p className="text-stone-600 mb-8 font-light leading-relaxed text-sm">
          Результат анализа готов! Чтобы открыть его, подпишитесь на наш канал.
        </p>

        <div className="space-y-3">
          <button 
            onClick={handleSubscribe}
            className="w-full h-14 px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-rose-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Подписаться
          </button>
          
          <button 
            onClick={onCheck}
            disabled={isChecking}
            className="w-full h-14 px-6 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors flex items-center justify-center text-center"
          >
            {isChecking ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Проверяем...</span>
                </div>
            ) : "Я подписался, открыть"}
          </button>
        </div>

        {checkError && (
          <p className="text-rose-500 text-sm mt-4 font-medium animate-pulse">
            {checkError}
          </p>
        )}
      </div>
    </div>
  );
};