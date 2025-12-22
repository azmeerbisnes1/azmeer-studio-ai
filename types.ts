
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';
export type EngineType = 'SORA' | 'ARCHIVE' | 'GEMINI' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
  status: 'approved' | 'pending' | 'rejected';
  credits: number;
  videoLimit: number;
  azmeerLimit: number;
  videosGenerated: number;
  azmeerGenerated: number;
  picture: string;
}

export interface GeneratedVideo {
  mediaType: 'video';
  uuid: string;
  url: string;
  prompt: string;
  timestamp: number;
  status: 1 | 2 | 3;
  status_percentage: number;
  aspectRatio: string;
  model_name: string;
  duration: number;
}

export interface GeneratedImage {
  mediaType: 'image';
  uuid: string;
  url: string;
  prompt: string;
  style?: string;
  aspectRatio: string;
  timestamp: number;
  status?: number | string;
}

export interface GeneratedTTS {
  mediaType: 'tts';
  uuid: string;
  prompt: string;
  status: number | string;
  url: string;
  voice: string;
  speed: number;
  timestamp: number;
}

export type HistoryItem = GeneratedVideo | GeneratedImage | GeneratedTTS;

export interface AppState {
  activeTab: EngineType;
  isGenerating: boolean;
  isRefining: boolean;
  history: HistoryItem[];
  error: string | null;
  success: string | null;
  loadingMessage: string;
}