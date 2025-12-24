import { refinePromptWithAI } from "./geminigenService";

/**
 * PENGESANAN API KEY OPENAI
 */
const getApiKey = (passedKey?: string): string => {
  if (typeof passedKey === 'string' && passedKey.trim().length > 0) {
    return passedKey.trim();
  }

  try {
    const manual = localStorage.getItem('azmeer_manual_openai_key');
    if (manual && manual.trim().length > 0) return manual.trim();
  } catch (e) {}

  const viteKey = "VITE_OPENAI_API_KEY";
  const standardKey = "OPENAI_API_KEY";

  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = (import.meta as any).env[viteKey] || (import.meta as any).env[standardKey];
      if (v) return v.trim();
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      const v = process.env[viteKey] || process.env[standardKey];
      if (v) return v.trim();
    }
  } catch (e) {}

  return "";
};

const fetchOpenAI = async (apiUrl: string, payload: any, currentKey: string) => {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  let lastError: any = null;

  for (const proxyFn of proxies) {
    try {
      const url = proxyFn(apiUrl);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = new Error(data?.error?.message || `Ralat API: ${response.status}`);
        continue;
      }

      return data;
    } catch (error: any) {
      lastError = error;
      continue;
    }
  }
  
  throw new Error(lastError?.message || "Rangkaian OpenAI sesak.");
};

export const refinePromptWithOpenAI = async (text: string, manualKey?: string): Promise<string> => {
  const currentKey = getApiKey(manualKey);
  
  if (!currentKey || currentKey.length < 10) {
    return await refinePromptWithAI(text);
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a professional cinematic prompt engineer for Sora 2.0. Transform the idea into a high-quality, detailed video prompt. Return ONLY the refined prompt text in English." },
      { role: "user", content: `Refine: ${text}` }
    ],
    temperature: 0.7
  };

  try {
    const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    return await refinePromptWithAI(text);
  }
};

export const generateUGCPrompt = async (params: { 
  text: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  manualKey?: string 
}): Promise<string> => {
  const currentKey = getApiKey(params.manualKey);
  
  if (!currentKey || currentKey.length < 10) {
    throw new Error("Sila masukkan OpenAI API Key di Vercel atau tetapan untuk menggunakan mod UGC.");
  }

  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  const charDesc = params.gender === 'female' 
    ? "A beautiful 30-year-old Malay woman wearing a stylish modest hijab, looking clean and professional." 
    : "A handsome 30-year-old Malay man with a polite and friendly influencer look, short neat hair, clean-shaven or light stubble, NO earrings, NO necklaces, NO bracelets, wearing modest smart-casual attire (not shorts).";

  const systemPrompt = `You are an expert UGC (User Generated Content) Director for Sora 2.0. 
  Create a detailed 15-second cinematic video prompt based on the user's product/topic.
  
  VIDEO STRUCTURE (Mandatory 5-segment breakdown):
  - 0-3s (Hook): Extreme close-up of ${params.gender === 'male' ? 'the man' : 'the woman'} smiling at camera with the product, energetic start.
  - 3-6s (Feature): Change angle to over-the-shoulder shot showing the product in action. High-end lifestyle lighting.
  - 6-9s (Detail): Macro lens focus on the product textures or a key benefit, cinematic bokeh.
  - 9-12s (Demonstration): Medium shot, character using/holding the product in a natural sunny environment.
  - 12-15s (CTA): Final shot of the character gesturing towards the screen with the CTA text overlay appearing: "${ctaText}".
  
  CHARACTER RULES:
  ${charDesc}
  
  SCRIPT RULES:
  - Dialogue/Voiceover must be in informal, natural "Bahasa Melayu Malaysia" (santai and ringkas).
  - The script should be short enough to fit 15 seconds perfectly.
  - NO subtitles/text on screen except for the CTA at the end.
  
  OUTPUT FORMAT:
  Provide a single, long, highly descriptive English prompt for Sora 2.0 that includes the visual transitions, camera work, environment, character details, and the Malay dialogue for the AI to understand the scene context.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Product/Topic: ${params.text}` }
    ],
    temperature: 0.8
  };

  const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
  return data.choices?.[0]?.message?.content?.trim() || params.text;
};