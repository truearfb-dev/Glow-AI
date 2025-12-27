import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, Palette, Smile, Camera, Loader2, Info, ChevronDown } from 'lucide-react';
import { ResultCard } from './components/ResultCard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AnalysisResult } from './types';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

// Simple Error Boundary to catch "White Screen" crashes
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error: error.toString() };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-rose-50 text-center">
          <Info className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-stone-800 mb-2">Произошла ошибка</h2>
          <p className="text-sm text-stone-600 mb-6 bg-white p-3 rounded-lg border border-rose-100 break-words max-w-full">
            {this.state.error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-medium shadow-lg active:scale-95 transition-transform"
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheckingSub, setIsCheckingSub] = useState(false);
  const [subCheckError, setSubCheckError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Configuration
  const TELEGRAM_CHANNEL_ID = "-1003657083355";

  // Init Telegram WebApp and Silent check on load
  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand(); // Force full screen mode
    }

    checkSubscription(true);
  }, []);

  // Auto-scroll to results when ready and subscribed
  useEffect(() => {
    if (result && isSubscribed && !loading && resultsRef.current) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const timer = setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 2000); 
        return () => clearTimeout(timer);
    }
  }, [result, isSubscribed, loading]);

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

  // Helper to compress image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Reduced from 450 to 350 to save traffic and processing time.
          // 350px is sufficient for color analysis.
          const MAX_WIDTH = 350; 
          const MAX_HEIGHT = 350;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.5 is good balance for speed/AI readability
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    try {
        setLoading(true);
        const compressedBase64 = await compressImage(file);
        setImagePreview(compressedBase64);
        processImage(compressedBase64);
    } catch (err) {
        console.error("Compression error:", err);
        setError("Не удалось обработать изображение. Попробуйте другое.");
        setLoading(false);
    }
  };

  const processImage = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    
    try {
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
      
      // Safety check before setting state
      if (!data || typeof data !== 'object') {
          throw new Error("Invalid response format from AI");
      }
      
      setResult(data as AnalysisResult);

    } catch (err: any) {
      console.error("Analysis failed:", err);
      let displayError = "Не удалось проанализировать фото. Попробуйте еще раз.";
      
      if (err.message) {
         if (err.message.includes("400")) {
             displayError = "Ошибка фото (400). Попробуйте другое изображение.";
         } else if (err.message.length > 100) {
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
                
                {!(result && isSubscribed) && (
                    <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-full shadow-lg">
                    <Camera className="w-5 h-5 text-stone-700" />
                    </div>
                )}
                
                {result && isSubscribed && (
                    <div className="absolute inset-x-0 bottom-0 pb-6 pt-12 bg-gradient-to-t from-black/50 to-transparent flex justify-center items-end pointer-events-none animate-fade-in">
                        <div className="flex flex-col items-center gap-2 animate-bounce">
                            <span className="text-white font-medium text-sm shadow-black drop-shadow-md">Результат ниже</span>
                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                                <ChevronDown className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                )}
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
          <div 
            ref={resultsRef} 
            className={`space-y-6 transition-all duration-700 ${!isSubscribed ? 'blur-xl select-none pointer-events-none opacity-80' : 'animate-fade-in'}`}
          >
                
            {/* Color Analysis Card */}
            <ResultCard 
              title="Твой Цветотип" 
              icon={<Palette className="w-5 h-5" />}
              delay={100}
            >
              <div className="mb-4">
                {/* SAFE RENDER: Ensure primitives are used */}
                <span className="block text-2xl font-serif text-rose-900 mb-2">
                    {String(result.season || "Цветотип определен")}
                </span>
                <p className="text-stone-600 text-sm leading-relaxed">
                    {String(result.description || "Анализ завершен.")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Идеальные оттенки</span>
                  <div className="flex gap-3 mt-2">
                    {/* SAFE RENDER: Validate array and item types */}
                    {Array.isArray(result.bestColors) && result.bestColors.map((color, idx) => {
                      const safeColor = typeof color === 'string' ? color : '#000000';
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1 group">
                            <div 
                            className="w-12 h-12 rounded-full shadow-md ring-2 ring-white transition-transform transform group-hover:-translate-y-1"
                            style={{ backgroundColor: safeColor }}
                            />
                            <span className="text-[10px] text-stone-400 font-mono">{safeColor}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Лучше избегать</span>
                  <div className="flex gap-3 mt-2">
                    <div className="flex flex-col items-center gap-1 group">
                      <div 
                        className="w-12 h-12 rounded-full shadow-md ring-2 ring-white opacity-90 relative overflow-hidden"
                        style={{ backgroundColor: String(result.worstColor || '#000000') }}
                      >
                         <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-full h-[1px] bg-stone-500/50 rotate-45 transform"></div>
                         </div>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">{String(result.worstColor || '#000000')}</span>
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
                <h4 className="font-serif text-lg text-stone-800 mb-2">
                    {String(result.yogaTitle || "Упражнение")}
                </h4>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {String(result.yogaText || "Выполните легкий массаж лица.")}
                </p>
              </div>
            </ResultCard>

            <button 
              onClick={() => {
                setResult(null);
                setImagePreview(null);
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-4 text-center text-rose-600 font-medium hover:text-rose-700 transition-colors text-sm"
            >
              Загрузить другое фото
            </button>
          </div>
        )}

        {/* Subscription Modal Overlay */}
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