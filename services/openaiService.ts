
/**
 * PENGESANAN API KEY OPENAI (Vercel & Vite Optimized)
 * PENTING: Vite melakukan 'static replacement'. Kod ini menggunakan 
 * optional chaining untuk mengelakkan ralat 'undefined' semasa runtime
 * jika objek env belum sedia.
 */

// Akses selamat menggunakan optional chaining agar tidak crash jika import.meta.env tiada
// @ts-ignore
const OPENAI_API_KEY = (import.meta?.env?.VITE_OPENAI_API_KEY || "").trim();

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
  // Jika kunci tiada, pulangkan prompt asal tanpa ralat yang menyekat UI
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    console.warn("OpenAI Key missing from build metadata.");
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
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    throw new Error(`PENGESAHAN GAGAL: Kunci API OpenAI tidak dikesan dalam 'build environment'. Sila pastikan VITE_OPENAI_API_KEY telah ditambah di Vercel Settings dan anda telah melakukan REDEPLOY dengan mematikan (uncheck) 'Use existing build cache'.`);
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
