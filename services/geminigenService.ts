
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

/**
 * Geminigen API Key System
 */
const _PART1 = "tts-fe9842ffd74cffdf09";
const _PART2 = "5bb639e1b21a01";
const GEMINIGEN_API_KEY = _PART1 + _PART2;

const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * API Fetcher dengan perlindungan ralat tinggi
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  // Menggunakan proxy yang lebih stabil
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, { ...options, headers });
    
    if (response.status === 404) throw new Error("Data tidak dijumpai di server.");
    
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
    console.error("Fetch Failure:", err.message);
    throw err;
  }
}

/**
 * Sync status video secara mendalam
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  if (!uuid) return null;
  const res = await uapiFetch(`/history/${uuid}`);
  return res.data || res.result || res;
};

/**
 * Prompt Refinement - Ditambah guard untuk API_KEY
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
 * Permulaan Penjanaan Video
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
 * Pembersihan URL
 */
const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('http')) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Mapper Pintar - Mengendalikan pelbagai format respon Geminigen
 */
export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  // Status Logic
  const status = item.status !== undefined ? Number(item.status) : 1;
  const percentage = item.status_percentage !== undefined 
    ? Number(item.status_percentage) 
    : (item.progress !== undefined ? Number(item.progress) : (status === 2 ? 100 : 0));

  // Data Extraction
  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  // Video URL can be in multiple places depending on the API version
  const rawUrl = vData.video_url || vData.video_uri || item.generate_result || item.url || "";
  const rawThumb = vData.last_frame || vData.thumbnail || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb),
    prompt: item.input_text || item.prompt || "Cinematic Vision",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: item.aspect_ratio || vData.aspect_ratio || "16:9",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

/**
 * Penukar Blob Video untuk mengatasi isu Octet-Stream/CORS
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Proxy fetch failed");
    
    const blob = await response.blob();
    // Force format MP4 supaya boleh dimainkan
    const videoBlob = new Blob([blob], { type: 'video/mp4' });
    return URL.createObjectURL(videoBlob);
  } catch (e) {
    console.warn("Blob conversion failed, using direct URL", e);
    return url;
  }
};
