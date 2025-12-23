
/**
 * PENGESANAN API KEY OPENAI (Vercel & Vite Optimized)
 */
const getApiKey = (): string => {
  try {
    // Akses literal untuk Vite static replacement
    // @ts-ignore
    const viteKey = import.meta.env ? import.meta.env.VITE_OPENAI_API_KEY : null;
    if (viteKey) return viteKey;

    // Fallback untuk persekitaran lain
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.VITE_OPENAI_API_KEY) {
      return process.env.VITE_OPENAI_API_KEY;
    }
  } catch (e) {
    console.warn("Environment access restricted.");
  }
  return "";
};

const OPENAI_API_KEY = getApiKey().trim();

/**
 * Proxy Wrapper untuk mengelakkan sekatan CORS
 */
const proxiedFetch = async (url: string, options: RequestInit) => {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return fetch(proxyUrl, options);
};

/**
 * Refinement Prompt menggunakan OpenAI GPT-4o-mini
 */
export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    console.warn("OpenAI API Key is missing. Returning original text.");
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
      console.error("OpenAI Error:", data.error.message);
      return text;
    }
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    console.error("OpenAI Refine Error:", error);
    return text;
  }
};

/**
 * Penjana UGC Specialist menggunakan OpenAI GPT-4o-mini
 */
export const generateUGCPrompt = async (idea: string, platform: 'tiktok' | 'facebook'): Promise<string> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    throw new Error(`PENGESAHAN GAGAL: Kunci API OpenAI tidak dikesan. Sila pastikan VITE_OPENAI_API_KEY telah ditambah di Vercel Settings dan lakukan REDEPLOY.`);
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
