
import { GeneratedVideo } from "../types.ts";

/**
 * Neural API Key Resolver
 * Mengambil kunci daripada Environment Variables sahaja untuk keselamatan GitHub.
 */
const getGeminigenKey = (): string => {
  try {
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_GEMINIGEN_API_KEY;
    if (viteKey) return viteKey.trim();
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env.VITE_GEMINIGEN_API_KEY) {
      return process.env.VITE_GEMINIGEN_API_KEY.trim();
    }
  } catch (e) {}

  // Tiada fallback hardcoded untuk mengelakkan sekatan GitHub
  return ""; 
};

const GEMINIGEN_API_KEY = getGeminigenKey();
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Deep UUID Extractor
 */
export const extractUuid = (data: any): string | null => {
  if (!data) return null;
  if (typeof data === 'string' && data.length > 20) return data;
  
  const candidates = [
    data.uuid, 
    data.id, 
    data.data?.uuid, 
    data.data?.id, 
    data.item?.uuid,
    data.result?.uuid,
    data.data?.item?.uuid
  ];
  
  for (const val of candidates) {
    if (val && typeof val === 'string' && val.length > 10) return val;
  }

  try {
    const str = JSON.stringify(data);
    const match = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (match) return match[0];
  } catch (e) {}

  return null;
};

export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetUrl = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    ...((options.headers as any) || {})
  };

  if (!GEMINIGEN_API_KEY) {
    console.warn("Amaran: VITE_GEMINIGEN_API_KEY tidak dijumpai. Sila tetapkan di Environment Variables.");
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(proxyUrl, { ...options, headers });
    const resData = await response.json();
    
    if (!response.ok) {
      if (response.status === 404) return { status: "ghost", error_code: 404 };
      const msg = resData?.message || resData?.data?.message || `Error ${response.status}`;
      throw new Error(msg);
    }
    return resData;
  } catch (err: any) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

export const getSpecificHistory = async (uuid: string): Promise<any> => {
  if (!uuid) return null;
  try {
    const data = await uapiFetch(`/history/${uuid}`);
    if (data.status === "ghost") return { ...data, uuid };
    return data;
  } catch (e) {
    return { status: "ghost", uuid, prompt: "Menghubungi Server..." };
  }
};

export const startVideoGen = async (params: { prompt: string; duration?: number; ratio?: string; imageFile?: File; }): Promise<any> => {
  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2');
  formData.append('resolution', 'small');
  formData.append('duration', String(params.duration || 10));
  formData.append('aspect_ratio', params.ratio === '16:9' ? 'landscape' : 'portrait');
  if (params.imageFile) formData.append('files', params.imageFile);

  return await uapiFetch('/video-gen/sora', { method: 'POST', body: formData });
};

const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  if (url.startsWith('http')) return url;
  return `https://cdn.geminigen.ai/${url.startsWith('/') ? url.substring(1) : url}`;
};

export const mapToGeneratedVideo = (raw: any): GeneratedVideo => {
  const item = raw?.data || raw;
  
  if (item.status === "ghost") {
    return {
      uuid: item.uuid || "unknown",
      status: 1, 
      status_percentage: 10,
      prompt: "Menunggu giliran render di server Geminigen...",
      url: "",
      timestamp: Date.now(),
      mediaType: 'video',
      aspectRatio: "landscape",
      model_name: "sora-2",
      duration: 10
    };
  }

  const status = item.status !== undefined ? Number(item.status) : 1;
  const vData = (item.generated_video && item.generated_video[0]) || {};
  
  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || "unknown",
    url: normalizeUrl(vData.video_url || item.video_url || item.generate_result || ""),
    thumbnail: normalizeUrl(vData.last_frame || item.last_frame || ""),
    prompt: item.input_text || item.prompt || "Video Tanpa Tajuk",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: item.status_percentage || (status === 2 ? 100 : 0),
    aspectRatio: vData.aspect_ratio || item.aspect_ratio || "landscape",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  try {
    const response = await fetch(proxyUrl, { headers: { "x-api-key": GEMINIGEN_API_KEY } });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return url;
  }
};
