
/**
 * OPENAI SCRIPTING ENGINE (GPT-4o-mini)
 * Specialized for Sora 2.0 UGC Cinema Prompts
 */

const getApiKey = (): string => {
  // @ts-ignore
  const viteKey = import.meta.env?.VITE_OPENAI_API_KEY;
  if (viteKey) return viteKey.trim();

  try {
    if (typeof process !== 'undefined' && process.env.VITE_OPENAI_API_KEY) {
      return process.env.VITE_OPENAI_API_KEY.trim();
    }
  } catch (e) {}
  return "";
};

const fetchOpenAI = async (payload: any) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("Konfigurasi Diperlukan: Sila pastikan VITE_OPENAI_API_KEY telah dimasukkan dalam environment Vercel dan anda telah melakukan Redeploy.");
  }

  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent("https://api.openai.com/v1/chat/completions")}`;

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI Error: ${response.status}`);
  }
  return data;
};

export const generateUGCPrompt = async (params: { 
  productDesc: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  imageRef?: string
}): Promise<string> => {
  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  
  // Character Definitions
  const charFemale = "A beautiful 30-year-old Malay woman, wearing a stylish modest hijab and professional modern attire. She has a charismatic Malaysian influencer vibe, warm and friendly.";
  const charMale = "A handsome 30-year-old Malay man, clean-shaved with neat short hair, wearing a professional smart-casual outfit. STRICTLY NO earrings, NO necklaces, NO bracelets, and NO rings. He looks like a polite, professional Malaysian influencer.";
  
  const selectedChar = params.gender === 'female' ? charFemale : charMale;

  const systemPrompt = `You are a world-class UGC (User Generated Content) Creative Director for Sora 2.0.
Your task is to write a single, highly detailed cinematic video prompt in English.

VIDEO ARCHITECTURE (Exactly 15 Seconds):
The video MUST have 5 distinct segments of 3 seconds each. Every 3 seconds, the camera angle and visual style MUST change drastically.

STRICT TIMELINE INSTRUCTION:
1. 0s-3s [THE HOOK]: Extreme close-up or high-energy medium shot. ${selectedChar} looks directly at the camera with high energy, holding the product. They say a short hook in casual "Bahasa Melayu Malaysia".
2. 3s-6s [THE PROBLEM/NEED]: 45-degree side shot or over-the-shoulder. Character interacting with the product in a premium lifestyle setting. Lighting is warm and volumetric.
3. 6s-9s [PRODUCT DETAIL]: Macro lens extreme close-up. Focus on the product's high-quality texture, label, or unique feature. Shallow depth of field, anamorphic lens flares.
4. 9s-12s [THE RESULT]: Low-angle hero shot or wide dynamic shot. Character looking extremely satisfied/happy with the product results.
5. 12s-15s [THE CTA]: Final camera shift to a direct eye-level shot. Character pointing towards the screen. Add a clean, bold Text Overlay in the center reading: "${ctaText}".

CORE RULES:
- DIALOGUE: Any spoken words MUST be in natural, casual, and short "Bahasa Melayu Malaysia" (Bahasa harian/santai).
- VISUALS: Describe everything in cinematic English (4K, photorealistic, cinematic lighting, 8k resolution).
- TEXT: NO subtitles. NO on-screen text during the first 12 seconds. ONLY the final CTA text at the 12s-15s mark.
- CHARACTER: Strictly follow the demographic rules (Malay, 30s, polite, no jewelry for men).

Return ONLY the final cinematic prompt string.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Product/Topic: ${params.productDesc}` }
    ],
    temperature: 0.85
  };

  const result = await fetchOpenAI(payload);
  return result.choices?.[0]?.message?.content?.trim() || params.productDesc;
};

export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert Sora 2.0 prompt engineer. Transform user input into a cinematic, detailed prompt in English focusing on lighting, camera paths, and high-end textures." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  };

  try {
    const result = await fetchOpenAI(payload);
    return result.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    return text;
  }
};
