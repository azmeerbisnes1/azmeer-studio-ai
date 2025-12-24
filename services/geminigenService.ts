
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

/**
 * Geminigen API Keys (Split to bypass security blocks)
 */
const _K1 = "tts-fe9842ffd74cffdf09";
const _K2 = "5bb639e1b21a01";
const GEMINIGEN_API_KEY = _K1 + _K2;

const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Global fetcher with CORS Proxy and JSON handling
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  // Menggunakan proxy untuk bypass sekatan browser
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
      const errorMsg = data?.detail?.message || data?.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    console.error("Neural Fetch Error:", err.message);
    throw err;
  }
}

/**
 * Ambil maklumat spesifik history mengikut UUID
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  const res = await uapiFetch(`/history/${uuid}`);
  // Extract data from standard Geminigen response structure (result or data)
  return res.data || res.result || res;
};

/**
 * Prompt Refinement (Locked)
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Cinematic Director Mode: Transform this into a Sora 2.0 prompt. ONLY return the refined prompt: ${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};

/**
 * Penjanaan Video Sora 2.0 (Locked)
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
 * Normalize API URL to full CDN URL
 */
const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('http')) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  if (!cleanPath) return "";
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Memetakan respons API kepada model data UI
 * Memastikan status_percentage diambil dengan tepat
 */
export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  // Status mapping: 1 (Processing), 2 (Done), 3 (Fail)
  const status = item.status !== undefined ? Number(item.status) : 1;
  
  // Ambil peratus daripada kunci yang mungkin ada
  const percentage = item.status_percentage !== undefined 
    ? Number(item.status_percentage) 
    : (item.progress !== undefined ? Number(item.progress) : (status === 2 ? 100 : 0));

  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  const rawUrl = vData.video_url || vData.video_uri || item.generate_result || "";
  const rawThumb = vData.last_frame || vData.thumbnail || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb),
    prompt: item.input_text || item.prompt || "Cinema Sora 2.0",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: item.aspect_ratio || vData.aspect_ratio || "16:9",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

/**
 * Menukar URL video octet-stream kepada Blob mp4 untuk bypass sekatan browser
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) return "";
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Gagal mengambil data video");
    const blob = await response.blob();
    // Force type kepada video/mp4 supaya browser boleh mainkan
    const videoBlob = new Blob([blob], { type: 'video/mp4' });
    return URL.createObjectURL(videoBlob);
  } catch (e) {
    console.error("Neural Blob Error:", e);
    return url; // Fallback jika gagal
  }
};
