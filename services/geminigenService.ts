
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Robust fetcher with CORS proxy for Geminigen API calls.
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

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
    console.error("Geminigen API Error:", err.message);
    throw err;
  }
}

/**
 * Get all generation history from Geminigen.ai
 * Documentation: GET /uapi/v1/histories
 */
export const getAllHistory = async (page = 1, itemsPerPage = 50): Promise<any> => {
  return await uapiFetch(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
};

/**
 * Get specific generation history by UUID
 * Documentation: GET /uapi/v1/history/{conversion_uuid}
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  const res = await uapiFetch(`/history/${uuid}`);
  return res.data || res.result || res;
};

const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    return trimmed;
  }
  
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  if (!cleanPath) return "";
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Map API item to app's GeneratedVideo interface following the provided documentation.
 */
export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  // Doc says: status (1: processing, 2: completed, 3: failed)
  // status_percentage: Progress percentage (0-100)
  const status = item.status !== undefined ? Number(item.status) : 1;
  const percentage = item.status_percentage !== undefined ? Number(item.status_percentage) : (status === 2 ? 100 : 0);

  // Extract from generated_video array as per doc
  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  let rawUrl = vData.video_url || vData.video_uri || item.generate_result || "";
  let rawThumb = vData.thumbnail || vData.last_frame || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb) || "https://i.ibb.co/b5N15CGf/Untitled-design-18.png",
    prompt: item.input_text || item.prompt || "Sora Generation",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: item.aspect_ratio || vData.aspect_ratio || "16:9",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

/**
 * Fetches video data and converts it to a browser-compatible MP4 blob URL.
 * Essential for bypass CORS and ensuring preview/download work.
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) return "";
  
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  for (const proxyFn of proxies) {
    try {
      const response = await fetch(proxyFn(url));
      if (!response.ok) continue;
      
      const blob = await response.blob();
      const videoBlob = new Blob([blob], { type: 'video/mp4' });
      return URL.createObjectURL(videoBlob);
    } catch (e) {
      console.warn(`Proxy attempt failed for ${url}:`, e);
      continue;
    }
  }
  
  return url; 
};

/**
 * DO NOT TOUCH - LOCKED BY USER REQUEST
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
 * DO NOT TOUCH - LOCKED BY USER REQUEST
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a world-class cinematic director for Sora 2.0. 
      Transform the following user idea into a highly detailed, visually stunning video prompt. 
      Return ONLY the refined English prompt.
      User Idea: ${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};
