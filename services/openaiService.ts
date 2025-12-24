import { refinePromptWithAI } from "./geminigenService";

/**
 * PENGESANAN API KEY OPENAI
 * Mengutamakan process.env.OPENAI_API_KEY atau process.env.API_KEY
 */
const getApiKey = (passedKey?: string): string => {
  if (typeof passedKey === 'string' && passedKey.trim().length > 0) {
    return passedKey.trim();
  }
  // Berdasarkan arahan, gunakan pre-configured environment variables
  return (process.env.OPENAI_API_KEY || process.env.API_KEY || "").trim();
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
  
  throw new Error(lastError?.message || "Rangkaian OpenAI sesak. Sila pastikan API KEY sah.");
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
  image?: string,
  manualKey?: string 
}): Promise<string> => {
  const currentKey = getApiKey(params.manualKey);
  
  if (!currentKey || currentKey.length < 10) {
    throw new Error("Sila pastikan API KEY OpenAI telah dikonfigurasi dalam environment.");
  }

  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  
  // Strict Demographic Description
  const femaleDesc = "A beautiful 30-year-old Malay woman, wearing a clean and stylish modest hijab, looking like a professional influencer. Her skin is glowing, modest make-up.";
  const maleDesc = "A handsome 30-year-old Malay man, polite and well-groomed influencer style, short neat hair. STRICTLY: NO earrings, NO necklaces, NO bracelets, NO rings. Wearing modest smart-casual attire (not shorts).";
  
  const charDesc = params.gender === 'female' ? femaleDesc : maleDesc;

  const systemPrompt = `You are a world-class UGC (User Generated Content) Video Director for Sora 2.0.
Your task is to generate a highly detailed 15-second cinematic video prompt.

SPECIFICATIONS:
- Duration: 15 seconds.
- DYNAMIC CAMERA: Change the camera angle or visual style every 3 seconds (Total 5 distinct segments).
- CONTENT: Must include a Hook (0-3s), Product/Value Description (3-12s), and a final CTA (12-15s).
- NO ON-SCREEN TEXT or subtitles except for the final CTA text.
- DIALOGUE: Any spoken words must be in natural, casual "Bahasa Melayu Malaysia" (Bahasa santai/ringkas).
- VISUAL DESCRIPTION: Write the technical video prompt in high-end cinematic English.

CHARACTER REQUIREMENTS:
- Demographic: ${charDesc}

VIDEO SEGMENTS (Describe these in the prompt):
1. [0-3s Hook]: Energetic start, character looking at camera with a warm smile, extreme close-up.
2. [3-6s Feature]: Sudden camera angle change to a side view/profile, showing the product benefit.
3. [6-9s Detail]: Change to a high-angle drone-like sweep or macro-focus on product texture.
4. [9-12s Lifestyle]: Change to a low-angle medium shot, character using the product naturally in a modern setting.
5. [12-15s CTA]: Final camera change to a stable eye-level medium shot. Character gestures towards the screen. TEXT OVERLAY in center: "${ctaText}".

If an image is provided, analyze the image to ensure the product and setting in the video prompt match the image perfectly. The video should feel like a natural extension of the provided image.`;

  const userContent: any[] = [{ type: "text", text: `Produce a UGC script for: ${params.text}. Platform: ${params.platform}. Gender: ${params.gender}.` }];
  
  if (params.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: params.image }
    });
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    max_tokens: 1000,
    temperature: 0.8
  };

  const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
  return data.choices?.[0]?.message?.content?.trim() || params.text;
};