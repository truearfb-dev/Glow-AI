import React, { useState, useRef } from 'react';
import { Sparkles, Upload, Palette, Smile, Camera, Loader2, Info } from 'lucide-react';
import { ResultCard } from './components/ResultCard';
import { AnalysisResult } from './types';

// Mock function to simulate API call if backend isn't running in this specific view
// In a real Vercel deployment, this would fetch from /api/analyze-face
import { analyzeFaceMock } from './services/mockService'; 

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

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
    try {
      // In a real Vercel environment, un-comment the fetch below:
      /*
      const response = await fetch('/api/analyze-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      
      if (!response.ok) throw new Error('Failed to analyze image');
      const data: AnalysisResult = await response.json();
      */

      // For this demo (since we can't deploy the backend API here), we use a direct service call 
      // or a mock if API_KEY is missing. 
      // We will attempt to use the backend logic structure via a client-side wrapper 
      // ensuring the logic matches the user request.
      
      // To satisfy the user prompt's architecture request, we assume the fetch to /api/analyze-face
      // is how it works. However, to make this code functional in a standalone React preview without
      // a Node backend, I will implement the logic via a direct call here using the logic 
      // intended for api/analyze-face.ts.
      
      // See services/geminiService.ts for the actual implementation that mimics the backend api.
      
      // Simulating network delay for effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // NOTE: In a real Vercel app, this logic lives in api/analyze-face.ts
      // Here we call the client-side equivalent for demonstration.
      import('./services/geminiService').then(async ({ analyzeFaceClientSide }) => {
         try {
             const data = await analyzeFaceClientSide(base64Image);
             setResult(data);
         } catch (err) {
             console.error(err);
             setError("Не удалось проанализировать фото. Попробуйте еще раз.");
         } finally {
             setLoading(false);
         }
      });

    } catch (err) {
      console.error(err);
      setError("Произошла ошибка при обработке.");
      setLoading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen pb-12 px-4 flex flex-col items-center">
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
      <main className="w-full max-w-md space-y-8">
        
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
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm border border-red-100 flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && !loading && (
          <div className="space-y-6 animate-fade-in">
            
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
      </main>
    </div>
  );
}