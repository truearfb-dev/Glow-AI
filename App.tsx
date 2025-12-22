import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, Palette, Smile, Camera, Loader2, Info } from 'lucide-react';
import { ResultCard } from './components/ResultCard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AnalysisResult } from './types';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheckingSub, setIsCheckingSub] = useState(false);
  const [subCheckError, setSubCheckError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration
  const TELEGRAM_CHANNEL_ID = "-1003657083355";

  // Silent check on load (so returning users don't see the gate)
  useEffect(() => {
    checkSubscription(true);
  }, []);

  const checkSubscription = async (silent = false) => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;

    if (!userId) {
      if (!silent) setSubCheckError("Не удалось определить ID пользователя Telegram.");
      return;
    }

    if (!silent) {
        setIsCheckingSub(true);
        setSubCheckError(null);
    }

    try {
      const res = await fetch(`/api/check-subscription?user_id=${userId}&channel_id=${TELEGRAM_CHANNEL_ID}`);
      const data = await res.json();

      if (data.subscribed) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
        if (!silent) {
            setSubCheckError("Мы не нашли подписку. Пожалуйста, подпишитесь и попробуйте снова.");
        }
      }
    } catch (e) {
      console.error("Subscription check failed", e);
      if (!silent) setSubCheckError("Ошибка соединения.");
    } finally {
      if (!silent) setIsCheckingSub(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    // Don't reset isSubscribed here, we want to remember if they passed the gate

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      processImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sending request to Vercel Serverless Function
      const response = await fetch('/api/analyze-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        let errorMsg = data.error || 'Failed to analyze image';
        if (typeof errorMsg === 'string') {
             if (errorMsg.includes('Quota') || errorMsg.includes('quota') || errorMsg.includes('429')) {
                errorMsg = 'Высокая нагрузка на сервис. Пожалуйста, подождите минуту.';
            } else if (errorMsg.includes('Service Error') || errorMsg.includes('Internal')) {
                errorMsg = 'Сервис временно недоступен. Попробуйте позже.';
            }
        } else {
            errorMsg = 'Произошла ошибка при обработке.';
        }
        throw new Error(errorMsg);
      }
      
      setResult(data as AnalysisResult);

    } catch (err: any) {
      console.error("Analysis failed:", err);
      let displayError = "Не удалось проанализировать фото. Попробуйте еще раз.";
      
      if (err.message) {
         if (err.message.length > 100) {
             displayError = "Ошибка сервера. Попробуйте позже.";
         } else {
             displayError = err.message;
         }
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen pb-12 px-4 flex flex-col items-center relative overflow-x-hidden">
      {/* Header */}
      <header className="pt-8 pb-6 text-center w-full max-w-md">
        <div className="flex justify-center mb-3">
          <div className="bg-rose-200/50 p-3 rounded-full">
            <Sparkles className="w-6 h-6 text-rose-600" />
          </div>
        </div>
        <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">
          Glow AI
        </h1>
        <p className="text-stone-600 font-light text-lg">
          Узнай свой код красоты ✨
        </p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md space-y-8 relative">
        
        {/* Upload Section */}
        <div className="relative group">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          
          <div 
            onClick={triggerUpload}
            className={`
              relative overflow-hidden rounded-3xl aspect-[3/4] shadow-xl transition-all duration-300 cursor-pointer
              ${!imagePreview ? 'bg-white border-2 border-dashed border-rose-300 hover:border-rose-400' : ''}
              ${result && !isSubscribed ? 'blur-md pointer-events-none' : ''} 
            `}
          >
            {imagePreview ? (
              <>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-full shadow-lg">
                  <Camera className="w-5 h-5 text-stone-700" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-400">
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="font-serif text-lg text-stone-600">Загрузить селфи</span>
                <span className="text-sm text-stone-400 mt-2 font-light">JPG, PNG</span>
              </div>
            )}

            {/* Scanning Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-rose-400 blur-xl opacity-20 animate-pulse"></div>
                  <Loader2 className="w-12 h-12 text-rose-600 animate-spin relative z-10" />
                </div>
                <p className="mt-4 font-serif text-rose-800 animate-pulse">ИИ сканирует черты лица...</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm border border-red-100 flex flex-col items-center justify-center gap-2 animate-fade-in mx-4">
            <div className="flex items-center gap-2">
                <Info className="w-4 h-4 min-w-4" />
                <span className="font-medium">Ошибка</span>
            </div>
            <span className="opacity-90 break-words w-full px-2">{error}</span>
          </div>
        )}

        {/* Results Section */}
        {result && !loading && (
          <div className={`space-y-6 transition-all duration-700 ${!isSubscribed ? 'blur-xl select-none pointer-events-none opacity-80' : 'animate-fade-in'}`}>
                
            {/* Color Analysis Card */}
            <ResultCard 
              title="Твой Цветотип" 
              icon={<Palette className="w-5 h-5" />}
              delay={100}
            >
              <div className="mb-4">
                <span className="block text-2xl font-serif text-rose-900 mb-2">{result.season}</span>
                <p className="text-stone-600 text-sm leading-relaxed">{result.description}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Идеальные оттенки</span>
                  <div className="flex gap-3 mt-2">
                    {result.bestColors.map((color, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 group">
                        <div 
                          className="w-12 h-12 rounded-full shadow-md ring-2 ring-white transition-transform transform group-hover:-translate-y-1"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] text-stone-400 font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Лучше избегать</span>
                  <div className="flex gap-3 mt-2">
                    <div className="flex flex-col items-center gap-1 group">
                      <div 
                        className="w-12 h-12 rounded-full shadow-md ring-2 ring-white opacity-90 relative overflow-hidden"
                        style={{ backgroundColor: result.worstColor }}
                      >
                         <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-full h-[1px] bg-stone-500/50 rotate-45 transform"></div>
                         </div>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">{result.worstColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ResultCard>

            {/* Face Yoga Card */}
            <ResultCard 
              title="Face Yoga на сегодня" 
              icon={<Smile className="w-5 h-5" />}
              delay={300}
            >
              <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100">
                <h4 className="font-serif text-lg text-stone-800 mb-2">{result.yogaTitle}</h4>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {result.yogaText}
                </p>
              </div>
            </ResultCard>

            <button 
              onClick={() => {
                setResult(null);
                setImagePreview(null);
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="w-full py-4 text-center text-rose-600 font-medium hover:text-rose-700 transition-colors text-sm"
            >
              Загрузить другое фото
            </button>
          </div>
        )}

        {/* Subscription Modal Overlay - Moved out to be on top of everything */}
        {result && !loading && !isSubscribed && (
             <SubscriptionModal 
                onCheck={() => checkSubscription(false)} 
                isChecking={isCheckingSub} 
                checkError={subCheckError} 
             />
        )}

      </main>
    </div>
  );
}