
import { HistoryItem, GeneratedVideo, GeneratedImage, GeneratedTTS } from "../types";
import { GoogleGenAI } from "@google/genai";

const GEMINIGEN_API_KEY = "tts-fe8bac4d9a7681f6193dbedb69313c2d";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Senarai nod proxy yang diperluaskan untuk memastikan ralat 'Failed to fetch' diatasi.
 * Setiap nod mempunyai profil keselamatan yang berbeza untuk melepasi sekatan rangkaian.
 */
export const PROXY_NODES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  (url: string) => url // Cubaan terus sebagai pilihan terakhir
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const refinePromptWithAI = async (text: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return text;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Cinematic prompt engineer. Transform to detailed Sora prompt (40 words): "${text}". Return ONLY refined text.`,
      config: { temperature: 0.7 }
    });
    return response.text || text;
  } catch (error) {
    return text;
  }
};

/**
 * uapiFetch yang telah diperkukuhkan sepenuhnya untuk menangani isu 'Failed to fetch'.
 * Ciri-ciri baru: 
 * 1. Pusingan proxy automatik (Waterfall)
 * 2. Pengendalian FormData yang lebih stabil
 * 3. Pembersihan header preflight
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const t = Date.now();
  // Menambah parameter unik pada URL asal untuk mematikan cache di peringkat server
  const targetUrl = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}_nocache=${t}`;

  const proxies = [...PROXY_NODES];
  let lastError: any = null;

  for (const proxyFn of proxies) {
    const proxiedUrl = proxyFn(targetUrl);
    
    // Headers yang bersih untuk mengelakkan ralat 'Failed to fetch' akibat CORS preflight
    const headers: Record<string, string> = {
      'x-api-key': GEMINIGEN_API_KEY,
      'Accept': 'application/json'
    };

    // Jangan set Content-Type secara manual jika menggunakan FormData (biarkan browser set boundary)
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const controller = new AbortController();
      // Timeout 20s untuk histories, 60s untuk video generation (kerana POST FormData lebih berat)
      const timeoutDuration = endpoint.includes('video-gen') ? 60000 : 20000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const fetchOptions: RequestInit = {
        ...options,
        headers: { ...headers, ...(options.headers as any) },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store'
      };

      const response = await fetch(proxiedUrl, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Jika status kod ralat (seperti 429 atau 500), teruskan ke proxy seterusnya
        const errorText = await response.text().catch(() => "Unknown Error");
        console.warn(`Node fail [${response.status}]: ${errorText.substring(0, 50)}`);
        continue;
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        // Jika respons bukan JSON (mungkin HTML ralat dari proxy), teruskan ke proxy seterusnya
        console.warn("Respons bukan JSON, mencuba nod lain.");
        continue;
      }
    } catch (error: any) {
      lastError = error;
      // 'Failed to fetch' (TypeError) dikesan di sini. Ia akan diabaikan dan loop akan cuba nod seterusnya.
      console.error(`Gagal menghubungi nod ${proxiedUrl.substring(0, 30)}...: ${error.message}`);
      continue;
    }
  }

  // Jika semua proxy gagal dalam satu pusingan, cuba lagi dengan backoff jika belum cukup retry
  if (retryCount < 1) {
    console.warn("Semua nod gagal. Mencuba semula pusingan kedua...");
    await wait(2000);
    return uapiFetch(endpoint, options, retryCount + 1);
  }

  // Jika masih gagal, lontarkan ralat akhir
  const userFriendlyError = lastError?.name === 'AbortError' 
    ? "Rangkaian terlalu perlahan. Sila cuba lagi." 
    : "Cluster Azmeer AI tidak dapat dihubungi melalui mana-mana nod rangkaian.";
    
  throw new Error(userFriendlyError);
}

export const normalizeUrl = (url: any, type: 'video' | 'image' | 'audio', uuid?: string): string => {
  if (!url || (typeof url === 'string' && url.length < 5)) {
    if (uuid) {
      const folder = type === 'video' ? 'videos' : type === 'image' ? 'images' : 'audio';
      const ext = type === 'video' ? 'mp4' : type === 'image' ? 'jpg' : 'mp3';
      return `https://cdn.geminigen.ai/${folder}/${uuid}.${ext}`;
    }
    return "";
  }

  let cleaned = String(url);

  if (cleaned.includes('[') || cleaned.includes('{')) {
    try {
      const startIdx = Math.max(cleaned.indexOf('['), cleaned.indexOf('{'));
      const endIdx = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = cleaned.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        const extracted = Array.isArray(parsed) ? (parsed[0]?.url || parsed[0]?.video_url || parsed[0]) : (parsed.url || parsed.video_url || parsed.generate_result || cleaned);
        cleaned = String(extracted);
      }
    } catch (e) {
      const match = cleaned.match(/https?:\/\/[^"'\s\]}]+/);
      if (match) cleaned = match[0];
    }
  }

  cleaned = cleaned.replace(/\\/g, '')
                   .replace(/["'\[\]\{\}]/g, '')
                   .replace(/video_url:/g, '')
                   .replace(/url:/g, '')
                   .trim();

  if (cleaned.startsWith('http')) return cleaned.replace('http://', 'https://');
  if (cleaned.includes('/')) return `https://cdn.geminigen.ai/${cleaned.startsWith('/') ? cleaned.substring(1) : cleaned}`;

  const folder = type === 'video' ? 'videos' : type === 'image' ? 'images' : 'audio';
  const ext = type === 'video' ? 'mp4' : type === 'image' ? 'jpg' : 'mp3';
  const finalFile = cleaned.includes('.') ? cleaned : `${cleaned}.${ext}`;
  return `https://cdn.geminigen.ai/${folder}/${finalFile}`;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const data = await uapiFetch("/histories?filter_by=all&items_per_page=30&page=1");
    const results = data?.result || data?.data || (data?.data && data?.data?.result) || (Array.isArray(data) ? data : []);
    
    if (!Array.isArray(results)) return [];

    const items = await Promise.all(results.map(async (item: any) => {
      if (!item) return null;
      const historyUuid = item.uuid || "";
      const type = (item.type || item.media_type || "").toLowerCase();
      const timestamp = new Date(item.created_at || Date.now()).getTime();
      const status = Number(item.status);
      const percentage = Number(item.status_percentage) || 0;

      if (type.includes('video') || type.includes('sora') || type.includes('generation')) {
        const videoObj = (item.generated_video && item.generated_video[0]) ? item.generated_video[0] : {};
        const videoUuid = videoObj.uuid || historyUuid;
        const rawUrl = item.generate_result || videoObj.video_url || videoObj.url || item.video_url || item.url || "";
        const finalUrl = normalizeUrl(rawUrl, 'video', videoUuid);
        let effectiveStatus = status;
        if (finalUrl && finalUrl.length > 25 && status !== 3) effectiveStatus = 2;

        return {
          mediaType: 'video',
          uuid: videoUuid,
          url: finalUrl,
          prompt: item.input_text || item.prompt || "Sora Generation",
          timestamp,
          status: effectiveStatus as any,
          status_percentage: percentage >= 100 ? 100 : percentage,
          aspectRatio: videoObj.aspect_ratio || item.aspect_ratio || '9:16',
          model_name: item.model_name || "Sora 2",
          duration: Number(videoObj.duration) || Number(item.duration) || 10
        } as GeneratedVideo;
      }
      
      if (type.includes('image')) {
        const imgObj = (item.generated_image && item.generated_image[0]) ? item.generated_image[0] : {};
        const imgUuid = imgObj.uuid || historyUuid;
        const rawUrl = imgObj.image_url || item.generate_result || item.url || "";
        return {
          mediaType: 'image',
          uuid: imgUuid,
          url: normalizeUrl(rawUrl, 'image', imgUuid),
          prompt: item.input_text || item.prompt || "Neural Image",
          aspectRatio: item.aspect_ratio || "1:1",
          timestamp,
          style: item.style || item.model_name
        } as GeneratedImage;
      }

      if (type.includes('tts') || type.includes('audio')) {
        const audioObj = (item.generated_audio && item.generated_audio[0]) ? item.generated_audio[0] : {};
        const audioUuid = audioObj.uuid || historyUuid;
        const rawUrl = audioObj.audio_url || item.generate_result || "";
        return {
          mediaType: 'tts',
          uuid: audioUuid,
          prompt: item.input_text || item.prompt || "Sonic TTS",
          status: (rawUrl && status === 1) ? 2 : status,
          url: normalizeUrl(rawUrl, 'audio', audioUuid),
          voice: item.voices ? item.voices[0] : (item.voice || "Gacrux"),
          speed: item.speed || 1.0,
          timestamp
        } as GeneratedTTS;
      }
      return null;
    }));
    
    return items.filter(i => i !== null) as HistoryItem[];
  } catch (error) {
    return [];
  }
};

export const startVideoGen = async (params: { 
  prompt: string, 
  model: string, 
  duration: number, 
  ratio: string,
  imageFile?: File | string 
}) => {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("model", "sora-2"); 
  formData.append("duration", params.duration.toString());
  formData.append("aspect_ratio", params.ratio === '16:9' ? 'landscape' : 'portrait');

  if (params.imageFile) {
    if (params.imageFile instanceof File) formData.append("files", params.imageFile);
    else formData.append("file_urls", params.imageFile);
  }

  return await uapiFetch("/video-gen/sora", {
    method: "POST",
    body: formData
  });
}
