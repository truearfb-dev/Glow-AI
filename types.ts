export interface AnalysisResult {
  season: string;
  description: string;
  bestColors: string[];
  worstColor: string;
  yogaTitle: string;
  yogaText: string;
  isDemo?: boolean;
}

export interface ApiError {
  error: string;
}