
/**
 * PENGESANAN API KEY OPENAI (Manual & Environment)
 * Dibaikpulih untuk sinkronisasi mutlak dengan kotak input UI.
 */
const getApiKey = (passedKey?: string): string => {
  // 1. Tentukan sumber kunci utama.
  let rawKey = "";
  
  if (passedKey && passedKey.trim().length > 0) {
    rawKey = passedKey;
  } else {
    try {
      rawKey = localStorage.getItem('azmeer_manual_openai_key') || "";
    } catch (e) {
      console.warn("LocalStorage access error");
    }
  }

  // 2. Fallback ke Environment Variable
  if (!rawKey.trim()) {
    try {
      // @ts-ignore
      const envKey = (import.meta.env?.VITE_OPENAI_API_KEY || "").trim();
      if (envKey) rawKey = envKey;
      else if (typeof process !== 'undefined' && process.env?.VITE_OPENAI_API_KEY) {
        rawKey = process.env.VITE_OPENAI_API_KEY || "";
      }
    } catch (e) {}
  }
  
  // 3. Pembersihan Mutlak (CRITICAL)
  const cleanedKey = rawKey
    .replace(/["']/g, "") // Buang petikan
    .replace(/[\s\n\r\t]/g, "") // Buang semua jenis ruang
    .trim();

  if (cleanedKey && !cleanedKey.startsWith('sk-')) {
    throw new Error("FORMAT SALAH: Kunci OpenAI mestilah bermula dengan 'sk-'. Sila periksa semula kotak input anda.");
  }
  
  return cleanedKey;
};

const fetchOpenAI = async (apiUrl: string, payload: any, currentKey: string) => {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`
  ];

  let lastError: any = null;

  for (const proxyFn of proxies) {
    try {
      const proxiedUrl = proxyFn(apiUrl);
      const response = await fetch(proxiedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try { 
          errorData = JSON.parse(errorText); 
        } catch (e) { 
          throw new Error(`Node Error (${response.status})`); 
        }

        if (errorData?.error) {
          const msg = errorData.error.message || "";
          const lowerMsg = msg.toLowerCase();
          
          if (lowerMsg.includes("incorrect api key") || response.status === 401) {
            throw new Error("KUNCI DITOLAK: Kunci OpenAI anda tidak sah atau tamat tempoh. Sila guna kunci baru.");
          }
          if (lowerMsg.includes("insufficient_quota") || lowerMsg.includes("exceeded your current quota")) {
            throw new Error("KREDIT HABIS: Kunci ini tiada baki kredit atau had penggunaan telah dicapai.");
          }
          throw new Error(`OpenAI Feedback: ${msg}`);
        }
        throw new Error(`Ralat Pelayan (${response.status})`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      if (error.message.includes("KUNCI DITOLAK") || error.message.includes("KREDIT HABIS")) throw error;
      continue;
    }
  }
  throw lastError || new Error("Rangkaian OpenAI tidak dapat dicapai.");
};

export const refinePromptWithOpenAI = async (text: string, manualKey?: string): Promise<string> => {
  const currentKey = getApiKey(manualKey);
  if (!currentKey) throw new Error("KUNCI DIPERLUKAN: Sila isi OpenAI API Key di kotak input.");

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a cinematic video prompt engineer for Sora 2. Return ONLY the refined prompt text in English. Dialogue must be in casual Bahasa Melayu voiceover." },
      { role: "user", content: `Refine this idea: ${text}` }
    ],
    temperature: 0.7
  };

  const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
  return data.choices?.[0]?.message?.content?.trim() || text;
};

export const generateUGCPrompt = async (params: { 
  text: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  manualKey?: string 
}): Promise<string> => {
  const currentKey = getApiKey(params.manualKey);
  if (!currentKey) throw new Error("KUNCI DIPERLUKAN: Sila isi OpenAI API Key.");

  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  const characterDesc = params.gender === 'female' 
    ? "A beautiful 30-year-old Malay woman wearing a stylish hijab (tudung), looking like a professional influencer."
    : "A handsome 30-year-old Malay man, polite and clean-cut, no earrings, no necklaces, no bracelets, wearing long pants/smart casual influencer attire.";

  const systemPrompt = `You are a master UGC (User Generated Content) strategist and Sora 2 Prompt Engineer. 
Your goal is to create a high-converting 15-second video prompt for Sora 2.

Structure (STRICT 15 SECONDS):
0-3s: Viral Hook.
3-6s: Product feature 1.
6-9s: Product feature 2.
9-12s: User benefit / demonstration.
12-15s: Strong Call to Action.

Visual Rules:
- Angle must change every 3 seconds (5 shots total).
- High-end cinematic visual style.
- Character: ${characterDesc}
- NO ONSCREEN TEXT or subtitles, EXCEPT at the very end (12-15s) which must display: "${ctaText}".

Audio/Script Rules:
- The prompt should describe the character speaking in CASUAL, FRIENDLY, and CONCISE Bahasa Melayu (Malaysia).
- Ensure the script is short enough to fit exactly 15 seconds.

Output Requirement:
- Return ONLY the final prompt in English (instructions) with the script in Malay as part of the prompt description. No other talk.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate a detailed 15s UGC Sora 2 prompt for this product/idea: ${params.text}` }
    ],
    temperature: 0.7
  };

  const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
  return data.choices?.[0]?.message?.content?.trim() || params.text;
};
