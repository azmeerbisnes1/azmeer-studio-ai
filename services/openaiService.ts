
// Fungsi untuk mengesan API Key daripada pelbagai punca persekitaran
const getOpenAiKey = () => {
  try {
    // 1. Akses literal untuk Vite (Paling penting untuk Vercel Deployment)
    // Vite memerlukan nama penuh 'import.meta.env.VITE_...' untuk menggantikan nilai semasa build.
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_OPENAI_API_KEY.trim();
    }

    // 2. Fallback kepada nama tanpa prefix VITE_
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.OPENAI_API_KEY) {
      // @ts-ignore
      return import.meta.env.OPENAI_API_KEY.trim();
    }

    // 3. Fallback kepada process.env (Untuk persekitaran Node/SSR atau suntikan Vercel tertentu)
    if (typeof process !== 'undefined' && process.env) {
      const vKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (vKey) return vKey.trim();
    }

    // 4. Semakan dinamik sebagai usaha terakhir
    const meta = import.meta as any;
    if (meta.env && meta.env.VITE_OPENAI_API_KEY) return meta.env.VITE_OPENAI_API_KEY.trim();

    return null;
  } catch (e) {
    console.error("Error detecting API Key:", e);
    return null;
  }
};

const OPENAI_API_KEY = getOpenAiKey();

/**
 * Proxy Wrapper untuk mengelakkan sekatan CORS di pelayar
 */
const proxiedFetch = async (url: string, options: RequestInit) => {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return fetch(proxyUrl, options);
};

/**
 * Refinement Prompt menggunakan GPT-4o mini
 */
export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY tidak dikesan. Sila REDEPLOY projek anda di Vercel selepas menambah Environment Variable.");
    return text;
  }

  try {
    const response = await proxiedFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are a cinematic video prompt engineer for Sora 2. Transform the user's idea into a detailed, visually descriptive prompt in English. Ensure the visual description contains NO text overlays, labels, or subtitles on screen. If there is dialogue, it MUST be in casual 'Bahasa Melayu Malaysia santai' as a voiceover only. Return ONLY the refined prompt text." 
          },
          { role: "user", content: `Refine this idea into a 15-second cinematic Sora prompt: ${text}` }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI API Error:", data.error.message);
      return text;
    }
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    console.error("OpenAI Refine Error:", error);
    return text;
  }
};

/**
 * Penjana UGC Specialist menggunakan GPT-4o mini
 */
export const generateUGCPrompt = async (idea: string, platform: 'tiktok' | 'facebook'): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error("Sila REDEPLOY (Deploy semula) projek anda di dashboard Vercel untuk mengaktifkan kunci API yang baru ditambah.");
  }

  const systemPrompt = `You are a professional UGC (User Generated Content) Video Engineer for Sora 2 AI. 
  Your goal is to create a highly detailed 15-second technical video prompt in ENGLISH.
  
  CORE RULES:
  - Duration: EXACTLY 15 seconds.
  - Visual Changes: MUST change camera angle every 3 seconds.
  - Character Personas: Malay woman with Hijab or Malay man (influencer style).
  - Dialogue/Script: Informal 'Bahasa Melayu Malaysia santai'.
  - Text Rule: NO TEXT ON SCREEN until last 3 seconds.
  
  Return ONE long technical descriptive prompt in English.`;

  try {
    const response = await proxiedFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a high-conversion 15s UGC prompt for: ${idea}. Platform: ${platform}` }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (error: any) {
    console.error("OpenAI UGC Error:", error);
    throw new Error(`Ralat OpenAI: ${error.message}`);
  }
};
