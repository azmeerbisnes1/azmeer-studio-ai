
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

/**
 * Geminigen API Configuration
 */
const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Core Request Engine dengan Deep Logging
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
      // Sesetengah error berada dalam data.data.message atau data.detail
      const errorMsg = data?.data?.message || data?.detail?.message || data?.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    // Jika API bungkus dalam { status: 200, data: { ... } }
    return data?.data || data;
  } catch (err: any) {
    console.error(`[Geminigen API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

/**
 * Mendapatkan Status Video (Mendukung pelbagai format respons)
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  if (!uuid) return null;
  const res = await uapiFetch(`/history/${uuid}`);
  return res;
};

/**
 * Prompt Refinement (LOCKED: Logik asal tidak diubah)
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
 * Memulakan Penjanaan Video (Sora 2.0)
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

  const res = await uapiFetch('/video-gen/sora', {
    method: 'POST',
    body: formData
  });
  
  return res;
};

/**
 * URL Sanitizer - Memastikan URL sentiasa lengkap dengan domain CDN
 */
const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('http')) return trimmed;
  // Jika server hantar path separuh, kita lengkapkan
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Deep Data Mapper - Menyelam ke dalam respons API untuk mencari data penting
 */
export const mapToGeneratedVideo = (raw: any): GeneratedVideo => {
  // Jika respons dibungkus dalam 'data', kita ambil yang dalam
  const item = raw?.data || raw;
  if (!item) return {} as GeneratedVideo;
  
  const status = item.status !== undefined ? Number(item.status) : 1;
  const percentage = item.status_percentage !== undefined ? Number(item.status_percentage) : (status === 2 ? 100 : 0);

  // Mencari video dalam array 'generated_video' atau field 'generate_result'
  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  const rawUrl = vData.video_url || item.video_url || item.generate_result || "";
  const rawThumb = vData.last_frame || item.last_frame || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || vData.uuid || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb),
    prompt: item.input_text || item.prompt || "Cinematic Vision",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: vData.aspect_ratio || item.aspect_ratio || "landscape",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

/**
 * Fetch Video sebagai Blob (Mengendalikan octet-stream)
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl, {
      headers: { "x-api-key": GEMINIGEN_API_KEY }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    // Force MP4 format
    const blob = new Blob([buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("Blob conversion failed, fallback to direct URL", e);
    return url;
  }
};
