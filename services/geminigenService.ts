
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

/**
 * Geminigen API Configuration
 */
const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Core Request Engine - Sekarang dengan pemprosesan respons yang lebih agresif
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    ...((options.headers as any) || {})
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  }

  // Menggunakan CORS Proxy untuk mengelakkan sekatan browser
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, { ...options, headers });
    const rawText = await response.text();
    
    let data: any = null;
    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = { message: rawText };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.data?.message || data?.detail || data?.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    // Geminigen sering membungkus respons dalam objek 'data'
    return data;
  } catch (err: any) {
    console.error(`[Neural Diagnostic] API Error at ${endpoint}:`, err.message);
    throw err;
  }
}

/**
 * Get Video Data (Deep Search)
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  if (!uuid) return null;
  // Kita ambil respons penuh untuk dianalisis oleh mapper
  return await uapiFetch(`/history/${uuid}`);
};

/**
 * Prompt Refinement (LOCKED: Logik asal dikekalkan)
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  const key = process.env.API_KEY;
  if (!text.trim() || !key) return text;
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Transform this into a detailed Sora 2.0 cinematic prompt. Output ONLY the prompt: ${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};

/**
 * Start Sora Generation
 */
export const startVideoGen = async (params: { 
  prompt: string; 
  duration?: number; 
  ratio?: string; 
  imageFile?: File; 
}): Promise<any> => {
  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2');
  formData.append('resolution', 'small');
  formData.append('duration', String(params.duration || 10));
  formData.append('aspect_ratio', params.ratio === '16:9' ? 'landscape' : 'portrait');
  
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  return await uapiFetch('/video-gen/sora', {
    method: 'POST',
    body: formData
  });
};

/**
 * URL Sanitizer - Menangani format path relatif atau penuh
 */
const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('http')) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Deep Data Mapper - Mencari data dalam setiap lapisan respons
 */
export const mapToGeneratedVideo = (raw: any): GeneratedVideo => {
  // Geminigen respons selalunya: { status: 200, data: { ... } } atau terus { uuid: ... }
  const item = raw?.data || raw;
  
  if (!item) {
    return {
      uuid: "unknown",
      status: 3,
      prompt: "Data Corrupted",
      url: "",
      timestamp: Date.now()
    } as GeneratedVideo;
  }
  
  const status = item.status !== undefined ? Number(item.status) : 1;
  const percentage = item.status_percentage !== undefined ? Number(item.status_percentage) : (status === 2 ? 100 : 0);

  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  const rawUrl = vData.video_url || item.video_url || item.generate_result || "";
  const rawThumb = vData.last_frame || item.last_frame || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb),
    prompt: item.input_text || item.prompt || "Cinematic Sora Render",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: vData.aspect_ratio || item.aspect_ratio || "landscape",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

/**
 * Fetch Video Blob dengan x-api-key Passthrough
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl, {
      headers: { "x-api-key": GEMINIGEN_API_KEY }
    });
    
    if (!response.ok) throw new Error(`CDN Access Denied: ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("[Stream Fallback] Using direct URL instead of Blob");
    return url;
  }
};
