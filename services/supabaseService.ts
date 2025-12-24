
/**
 * PENTING UNTUK VITE & VERCEL:
 * Pembolehubah persekitaran (Env Vars) dikesan menggunakan pelbagai kaedah 
 * untuk memastikan keserasian merentas platform (Vite, Vercel, Sandbox).
 */

const getEnvValue = (key: string): string => {
  const viteKey = `VITE_SUPABASE_${key}`;
  const standardKey = `SUPABASE_${key}`;

  // 1. Cuba akses melalui process.env (Paling stabil dalam sandbox/node environments)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[viteKey] || process.env[standardKey];
      if (val) return val.trim();
    }
  } catch (e) {}

  // 2. Cuba akses melalui import.meta.env (Standard untuk Vite/ESM)
  try {
    // @ts-ignore
    const metaEnv = import.meta.env;
    if (metaEnv) {
      const val = metaEnv[viteKey] || metaEnv[standardKey];
      if (val) return val.trim();
    }
  } catch (e) {}

  // 3. Cuba akses melalui window (Fallback terakhir)
  try {
    if (typeof window !== 'undefined') {
      const win = window as any;
      const val = win[viteKey] || win[standardKey] || win.env?.[viteKey] || win.env?.[standardKey];
      if (val) return val.trim();
    }
  } catch (e) {}

  return "";
};

const SUPABASE_URL = getEnvValue('URL');
const SUPABASE_ANON_KEY = getEnvValue('ANON_KEY');

// Log Diagnostik Berwarna untuk Console
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log(
    `%c 🆘 AZMEER AI: MASALAH DATABASE %c\n` +
    `URL: ${SUPABASE_URL ? '✅ OK' : '❌ TIADA'}\n` +
    `KEY: ${SUPABASE_ANON_KEY ? '✅ OK' : '❌ TIADA'}\n\n` +
    `TINDAKAN SEGERA:\n` +
    `1. Buka Vercel Dashboard > Settings > Environment Variables.\n` +
    `2. Pastikan nama variable adalah TEPAT: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.\n` +
    `3. WAJIB klik 'REDEPLOY' selepas anda simpan variable tersebut.\n`,
    "background: #ef4444; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
    "color: #ef4444; font-weight: bold;"
  );
} else {
  console.log("%c 🚀 Supabase: Connected! %c Sistem Sedia.", "background: #10b981; color: white; padding: 2px 5px; border-radius: 3px;", "color: #10b981;");
}

/**
 * Enjin permintaan (request engine) untuk berinteraksi dengan Supabase REST API.
 */
const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const baseUrl = SUPABASE_URL.replace(/\/+$/, "");
    const url = `${baseUrl}/rest/v1/${path}`;
    
    const response = await fetch(url, { 
      ...options, 
      headers, 
      mode: 'cors',
      cache: 'no-store' 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase API Error (${response.status}):`, errorText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("Ralat rangkaian Supabase:", e);
    return null;
  }
};

export const db = {
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY),

  saveUser: async (username: string, password: string, userData: any) => {
    return await supabaseRequest('azmeer_users', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ 
        username: username.toLowerCase().trim(), 
        password, 
        data: userData 
      })
    });
  },

  updateUser: async (username: string, userData: any) => {
    return await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  getUser: async (username: string) => {
    const data = await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  },

  saveUuid: async (userId: string, uuid: string) => {
    return await supabaseRequest('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId.toLowerCase().trim(), 
        uuid: uuid 
      })
    });
  },

  getUuids: async (userId: string) => {
    const data = await supabaseRequest(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return data ? data.map((d: any) => d.uuid) : [];
  },

  getAllUsers: async () => {
    const data = await supabaseRequest('azmeer_users?select=*&order=created_at.desc');
    return data ? data : [];
  }
};
