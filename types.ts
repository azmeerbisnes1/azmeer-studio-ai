
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
  thumbnail?: string;
  prompt: string;
  timestamp: number;
  status: 1 | 2 | 3; // 1: Processing, 2: Completed, 3: Failed
  status_percentage: number;
  aspectRatio: string;
  model_name: string;
  duration: number;
}

// Added GeneratedImage type
export interface GeneratedImage {
  uuid: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  style?: string;
}

// Added GeneratedTTS type
export interface GeneratedTTS {
  uuid: string;
  url: string;
  prompt: string;
  status: number | string;
  voice: string;
  speed: number;
}

// Added ChatMessage type
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Added SoraHistoryItem type
export interface SoraHistoryItem {
  uuid: string;
  status: string | number;
  status_percentage: number;
  model_name: string;
  created_at: string;
  input_text: string;
  status_desc: string;
  type?: string;
  inference_type?: string;
  generate_result?: any;
  generated_video?: any[];
}
