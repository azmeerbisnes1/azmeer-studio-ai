
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

/**
 * Geminigen API Key System
 */
const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Core fetcher dengan perlindungan ralat dan bypass CORS
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    ...((options.headers as any) || {})
  };

  // PENTING: Jangan set Content-Type jika menggunakan FormData. 
  // Browser akan set Content-Type: multipart/form-data; boundary=... secara automatik.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  }

  // Gunakan corsproxy.io untuk bypass sekatan CORS
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
 * Mendapatkan status spesifik daripada Arkib History
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  if (!uuid) return null;
  // Mengikut dokumentasi: GET /uapi/v1/history/{conversion_uuid}
  return await uapiFetch(`/history/${uuid}`);
};

/**
 * Prompt Refinement (LOCKED: Tidak diubah)
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
 * Mula menjana Video Sora 2.0
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
 * Membersihkan URL daripada CDN Geminigen
 */
const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('http')) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Pemetaan Data Berdasarkan Dokumentasi Rasmi (History Response)
 */
export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  const status = item.status !== undefined ? Number(item.status) : 1;
  const percentage = item.status_percentage !== undefined 
    ? Number(item.status_percentage) 
    : (status === 2 ? 100 : 0);

  // DATA PEMETAAN KRITIKAL: Respons history mengandungi array 'generated_video'
  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  // URL utama berada dalam vData.video_url
  const rawUrl = vData.video_url || item.generate_result || "";
  const rawThumb = vData.last_frame || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb),
    prompt: item.input_text || "Cinematic Vision",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: vData.aspect_ratio || item.aspect_ratio || "landscape",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || 10
  };
};

/**
 * Fungsi Penyelamat: Menukar fail octet-stream kepada video/mp4 yang boleh dimainkan
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  
  // Bypass CORS supaya kita boleh baca data binary
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Gagal mengambil data video.");
    
    const arrayBuffer = await response.arrayBuffer();
    // PAKSA fail menjadi video/mp4 supaya browser tidak memulakan auto-download
    const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
    return URL.createObjectURL(videoBlob);
  } catch (e) {
    console.error("Blob conversion error:", e);
    return url; // Fallback ke URL asal jika gagal
  }
};
