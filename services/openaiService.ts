import { refinePromptWithAI } from "./geminigenService";

/**
 * Mendapatkan API Key OpenAI dengan sokongan persekitaran Vite/Vercel.
 */
const getApiKey = (): string => {
  // @ts-ignore - Menggunakan standard Vite untuk akses environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_OPENAI_API_KEY.trim();
  }
  
  // Fallback untuk persekitaran Node/Vercel Backend
  if (typeof process !== 'undefined' && process.env) {
    return (process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  }
  
  return "";
};

const fetchOpenAI = async (apiUrl: string, payload: any) => {
  const currentKey = getApiKey();
  
  if (!currentKey) {
    throw new Error("API KEY TIDAK DIKESAN: Sila pastikan VITE_OPENAI_API_KEY telah ditambah di Dashboard Vercel dan anda telah klik 'Redeploy'.");
  }

  // Gunakan proxy untuk mengelakkan ralat CORS di browser
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Ralat OpenAI: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error("OpenAI Fetch Error:", error);
    throw error;
  }
};

export const generateUGCPrompt = async (params: { 
  productDesc: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  imageRef?: string
}): Promise<string> => {
  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  
  const femaleDesc = "A beautiful 30-year-old Malay woman, wearing a stylish modest hijab, looking like a professional influencer. Warm and glowing skin tone.";
  const maleDesc = "A handsome 30-year-old Malay man, polite influencer look, short neat hair. STRICTLY NO earrings, NO necklaces, NO bracelets, NO rings. Modest smart-casual attire.";
  
  const characterRules = params.gender === 'female' ? femaleDesc : maleDesc;

  const systemPrompt = `You are a professional UGC Video Director for Sora 2.0. 
Create a detailed 15-second cinematic video prompt based on the product description.

STRICT VIDEO STRUCTURE (15 SECONDS TOTAL):
- Change camera angle EXACTLY every 3 seconds (Total 5 angles).
- 0-3s: [HOOK] Extreme close-up of character smiling and showing the product to camera.
- 3-6s: [ANGLE 2] Side-profile shot, 45-degree angle, showing the product in use.
- 6-9s: [ANGLE 3] Macro close-up on the product textures or a key physical detail.
- 9-12s: [ANGLE 4] Medium shot from a different perspective (low angle), character looking satisfied.
- 12-15s: [CTA] Eye-level medium shot, character pointing to the screen. ON-SCREEN TEXT: "${ctaText}".

RULES:
- CHARACTER: ${characterRules}
- DIALOGUE: Any spoken words must be in casual, natural "Bahasa Melayu Malaysia" (Bahasa santai).
- VISUALS: Write visual descriptions in high-end cinematic English.
- TEXT: NO subtitles on screen except for the final CTA text.

Return ONLY the refined prompt text for Sora 2.0.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate UGC prompt for: ${params.productDesc}` }
    ],
    temperature: 0.8
  };

  const result = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload);
  return result.choices?.[0]?.message?.content?.trim() || params.productDesc;
};

export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a cinematic prompt engineer. Output ONLY the refined version of the user prompt in English for Sora 2.0. Focus on lighting and camera motion." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  };

  try {
    const result = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload);
    return result.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    return await refinePromptWithAI(text);
  }
};