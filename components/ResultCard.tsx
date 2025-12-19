import React from 'react';

interface ResultCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, icon, children, delay = 0 }) => {
  return (
    <div 
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-rose-100 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-rose-100 text-rose-600 rounded-full">
          {icon}
        </div>
        <h3 className="text-xl font-serif font-semibold text-stone-800">{title}</h3>
      </div>
      <div>
        {children}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};