
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';

export enum AppView {
  SORA_STUDIO = 'SORA_STUDIO',
  HISTORY = 'HISTORY',
  ADMIN = 'ADMIN',
  WEBCINEMA = 'WEBCINEMA'
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
  aspectRatio: string;
  style?: string;
}

export interface GeneratedTTS {
  mediaType: 'tts';
  uuid: string;
  url: string;
  prompt: string;
  timestamp: number;
  status: number | string;
  voice: string;
  speed: number;
}

export interface SoraHistoryItem {
  uuid: string;
  status: number | string;
  status_percentage?: number;
  status_desc?: string;
  model_name?: string;
  created_at: string;
  input_text: string;
  generated_video?: Array<{
    video_url?: string;
    video_uri?: string;
  }>;
  generate_result?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
