
/**
 * Fungsi pengesan env yang sangat agresif untuk Vercel/Vite/Local/Sandbox.
 */
const getEnv = (key: string): string => {
  const variations = [
    `VITE_SUPABASE_${key}`,
    `SUPABASE_${key}`,
    `NEXT_PUBLIC_SUPABASE_${key}`
  ];

  try {
    // @ts-ignore
    const meta = import.meta.env;
    if (meta) {
      for (const v of variations) {
        if (meta[v]) return meta[v].trim();
      }
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      for (const v of variations) {
        if (process.env[v]) return process.env[v].trim();
      }
    }
  } catch (e) {}

  try {
    const local = localStorage.getItem(`AZMEER_SUPABASE_${key}`);
    if (local) return local.trim();
  } catch (e) {}

  return "";
};

let SUPABASE_URL = getEnv('URL');
let SUPABASE_ANON_KEY = getEnv('ANON_KEY');

// Helper to safely handle strings
const safeLower = (str: any) => (str ? String(str).toLowerCase().trim() : "");

export const db = {
  isReady: () => {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
  },

  setManualKeys: (url: string, key: string) => {
    localStorage.setItem('AZMEER_SUPABASE_URL', url.trim());
    localStorage.setItem('AZMEER_SUPABASE_ANON_KEY', key.trim());
    SUPABASE_URL = url.trim();
    SUPABASE_ANON_KEY = key.trim();
    window.location.reload();
  },

  request: async (path: string, options: RequestInit = {}) => {
    if (!db.isReady()) {
      return { error: `Konfigurasi Supabase tidak lengkap.` };
    }
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, "");
      const url = `${baseUrl}/rest/v1/${path}`;
      
      const response = await fetch(url, { ...options, headers });
      const rawText = await response.text();
      let data: any = null;
      
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          data = { message: rawText };
        }
      }

      if (!response.ok) {
        return { error: data?.message || `Ralat API: ${response.status}` };
      }

      return data || { success: true };
    } catch (e: any) {
      return { error: "Gagal menyambung ke Supabase." };
    }
  },

  saveUser: async (username: string, password: string, userData: any) => {
    if (!username) return { error: "Username diperlukan." };
    return await db.request('azmeer_users', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ 
        username: safeLower(username), 
        password, 
        data: userData 
      })
    });
  },

  getUser: async (username: string) => {
    if (!username) return null;
    const data = await db.request(`azmeer_users?username=eq.${safeLower(username)}&select=*`);
    if (data?.error) return data;
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  updateUser: async (username: string, userData: any) => {
    if (!username) return { error: "Username diperlukan." };
    return await db.request(`azmeer_users?username=eq.${safeLower(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  saveUuid: async (userId: string, uuid: string) => {
    if (!userId || !uuid) return;
    return await db.request('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ user_id: safeLower(userId), uuid: uuid })
    });
  },

  getUuids: async (userId: string) => {
    if (!userId) return [];
    const data = await db.request(`azmeer_uuids?user_id=eq.${safeLower(userId)}&select=uuid`);
    return Array.isArray(data) ? data.map((d: any) => d.uuid) : [];
  },

  getAllUsers: async () => {
    const data = await db.request('azmeer_users?select=*&order=created_at.desc');
    return Array.isArray(data) ? data : [];
  }
};
