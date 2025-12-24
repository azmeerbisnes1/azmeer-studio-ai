import { refinePromptWithAI } from "./geminigenService";

/**
 * Mendapatkan API Key OpenAI dengan sokongan pelbagai persekitaran (Vercel/Vite).
 * Memastikan VITE_OPENAI_API_KEY dikesan dengan betul.
 */
const getApiKey = (): string => {
  let key = "";
  
  // 1. Periksa process.env (Standard Node/Vercel backend environment)
  try {
    if (typeof process !== 'undefined' && process.env) {
      key = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.API_KEY || "";
    }
  } catch (e) {}

  // 2. Periksa import.meta.env (Vite frontend environment - Sangat penting untuk Vercel)
  try {
    // @ts-ignore
    if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
    }
  } catch (e) {}

  return (key || "").trim();
};

const fetchOpenAI = async (apiUrl: string, payload: any) => {
  const currentKey = getApiKey();
  
  if (!currentKey) {
    throw new Error("API Key OpenAI tidak dijumpai. Pastikan anda telah menambah 'VITE_OPENAI_API_KEY' di Environment Variables Vercel dan telah melakukan 'Redeploy'.");
  }

  // Menggunakan proxy untuk mengelakkan ralat CORS
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
  
  const femaleDesc = "A beautiful 30-year-old Malay woman, wearing a clean and stylish modest hijab, looking clean and professional. Charismatic influencer look.";
  const maleDesc = "A handsome 30-year-old Malay man, polite and well-groomed influencer style, 30s, short neat hair. STRICTLY NO earrings, NO necklaces, NO bracelets, NO rings, and NO shorts. Modest and sophisticated influencer attire.";
  
  const characterRules = params.gender === 'female' ? femaleDesc : maleDesc;

  const systemPrompt = `You are a world-class UGC (User Generated Content) Creative Director for Sora 2.0.
Your goal is to write a highly detailed 15-second cinematic video prompt based on the product description provided.

STRUCTURE REQUIREMENTS (Total 15 Seconds):
- DYNAMIC CAMERA: Every 3 seconds, the camera angle and visual style MUST change (Total 5 distinct segments).
- 0-3s (Hook): Extreme close-up of the character smiling warmly at the camera, holding the product. High energy start.
- 3-6s (Feature 1): Side view, 45-degree angle. Show character interacting with the product in a premium lifestyle setting.
- 6-9s (Detail): Macro close-up focus on the product's high-quality texture/details. Cinematic bokeh.
- 9-12s (Demonstration): Medium shot from a different angle. Character demonstrates a key benefit naturally.
- 12-15s (CTA): Final camera change to a stable eye-level medium shot. Character gestures towards the screen. CTA TEXT OVERLAY in center: "${ctaText}".

CONTENT RULES:
- CHARACTER: ${characterRules}
- DIALOGUE/VOICE: All spoken words MUST be in natural, casual "Bahasa Melayu Malaysia" (Bahasa santai & ringkas).
- TEXT ON SCREEN: NO subtitles. ONLY the final CTA text overlay during the 12-15s segment.
- LANGUAGE: Write the technical visual prompt in high-end cinematic English for Sora 2.0, but include the Malay dialogue in the description.

Return ONLY the full cinematic prompt text for Sora 2.0.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Product Description: ${params.productDesc}` }
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
      { role: "system", content: "You are a cinematic prompt expert. Improve the user's prompt for Sora 2.0 focusing on realistic details and lighting. Output ONLY the refined prompt in English." },
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