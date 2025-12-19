export interface AnalysisResult {
  season: string;
  description: string;
  bestColors: string[];
  worstColor: string;
  yogaTitle: string;
  yogaText: string;
}

export interface ApiError {
  error: string;
}
