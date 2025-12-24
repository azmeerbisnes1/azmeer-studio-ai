
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';

export enum AppView {
  SORA_STUDIO = 'SORA_STUDIO',
  HISTORY = 'HISTORY',
  ADMIN = 'ADMIN'
}

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
  timestamp: number;
  style?: string;
  aspectRatio: string;
}

export interface GeneratedTTS {
  mediaType: 'tts';
  uuid: string;
  url: string;
  prompt: string;
  timestamp: number;
  status: 1 | 2 | 3 | string;
  voice: string;
  speed: number;
}

export interface SoraHistoryItem {
  id: number;
  uuid: string;
  user_id: number;
  model_name: string;
  input_text: string;
  type: string;
  status: number;
  status_desc: string;
  status_percentage: number;
  generate_result: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string | null;
}

// Added ChatMessage interface to resolve missing type error
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
