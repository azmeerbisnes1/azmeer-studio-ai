
/**
 * PENGESANAN API KEY OPENAI (Manual & Environment)
 * Dibaikpulih untuk sinkronisasi mutlak dengan kotak input UI.
 */
const getApiKey = (passedKey?: string): string => {
  let rawKey = "";
  
  // Keutamaan 1: Kunci yang dihantar terus dari UI state
  if (typeof passedKey === 'string' && passedKey.trim().length > 0) {
    rawKey = passedKey;
  } else {
    // Keutamaan 2: Kunci dari simpanan tempatan
    try {
      rawKey = (localStorage.getItem('azmeer_manual_openai_key') || "").trim();
    } catch (e) {
      console.warn("LocalStorage access error");
    }
  }

  // Keutamaan 3: Environment Variable (Backup)
  if (!rawKey) {
    try {
      // @ts-ignore
      const envKey = (import.meta.env?.VITE_OPENAI_API_KEY || "").trim();
      if (envKey) rawKey = envKey;
      else if (typeof process !== 'undefined' && process.env?.VITE_OPENAI_API_KEY) {
        rawKey = (process.env.VITE_OPENAI_API_KEY || "").trim();
      }
    } catch (e) {}
  }
  
  // PEMBERSIHAN AGRESIF: Buang karakter halimun, ruang putih, petikan, dan karakter bukan-ASCII
  // Ini untuk mengelakkan ralat "Incorrect API Key" disebabkan copy-paste.
  const cleanedKey = rawKey
    .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200D\uFEFF]/g, "") // Buang hidden/zero-width chars
    .replace(/["']/g, "") // Buang tanda petikan
    .replace(/\s+/g, "") // Buang semua jenis space/tab/newline
    .trim();

  return cleanedKey;
};

const fetchOpenAI = async (apiUrl: string, payload: any, currentKey: string) => {
  // Susunan proxy yang paling stabil
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`
  ];

  let lastError: any = null;

  for (const proxyFn of proxies) {
    try {
      const url = proxyFn(apiUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Jika bukan JSON, mungkin proxy bermasalah atau return HTML.
        // Jangan putus asa, cuba proxy seterusnya.
        continue;
      }

      if (!response.ok) {
        const msg = data?.error?.message || "";
        const code = data?.error?.code || "";

        // SAHKAN ralat ini benar-benar dari OpenAI
        if (code === "invalid_api_key" || msg.toLowerCase().includes("invalid api key") || msg.toLowerCase().includes("incorrect api key")) {
          throw new Error("KUNCI DITOLAK: OpenAI mengesahkan kunci API ini tidak sah. Sila salin semula kunci 'sk-...' yang penuh dan aktif.");
        }
        
        if (code === "insufficient_quota" || msg.toLowerCase().includes("quota")) {
          throw new Error("KREDIT HABIS: Kunci ini tiada baki atau sudah tamat tempoh.");
        }

        // Ralat lain (seperti 500), kita simpan dan cuba proxy lain
        lastError = new Error(msg || "Ralat Pelayan OpenAI");
        continue;
      }

      // Berjaya! Pulangkan data.
      return data;

    } catch (error: any) {
      // Jika ralat adalah ralat kunci/kredit yang SAH dari OpenAI, berhenti cuba.
      if (error.message.includes("KUNCI DITOLAK") || error.message.includes("KREDIT HABIS")) {
        throw error;
      }
      lastError = error;
      continue; 
    }
  }
  
  throw new Error(lastError?.message || "Rangkaian OpenAI sibuk. Sila pastikan kunci API anda betul dan cuba lagi.");
};

export const refinePromptWithOpenAI = async (text: string, manualKey?: string): Promise<string> => {
  const currentKey = getApiKey(manualKey);
  if (!currentKey) throw new Error("Sila isi OpenAI API Key di terminal dahulu.");

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a professional cinematic prompt engineer. Return ONLY the refined prompt text in English." },
      { role: "user", content: `Refine: ${text}` }
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
  if (!currentKey) throw new Error("Sila isi OpenAI API Key di terminal dahulu.");

  const cta = params.platform === 'tiktok' ? "tekan beg kuning" : "tekan learn more";
  const desc = params.gender === 'female' ? "Malay woman wearing hijab" : "Malay man";

  const systemPrompt = `Create a 15s UGC video prompt for Sora 2. 
Character: ${desc}. 
Style: Friendly influencer. 
CTA: "${cta}". 
Output: Return ONLY the refined prompt in English with Malay script integrated.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Topic: ${params.text}` }
    ],
    temperature: 0.7
  };

  const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
  return data.choices?.[0]?.message?.content?.trim() || params.text;
};
