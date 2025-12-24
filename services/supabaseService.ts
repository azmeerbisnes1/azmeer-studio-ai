
const getEnvValue = (key: string): string => {
  const viteKey = `VITE_SUPABASE_${key}`;
  const standardKey = `SUPABASE_${key}`;
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[viteKey] || process.env[standardKey];
      if (val) return val.trim();
    }
  } catch (e) {}
  try {
    // @ts-ignore
    const metaEnv = import.meta.env;
    if (metaEnv) {
      const val = metaEnv[viteKey] || metaEnv[standardKey];
      if (val) return val.trim();
    }
  } catch (e) {}
  return "";
};

const SUPABASE_URL = getEnvValue('URL');
const SUPABASE_ANON_KEY = getEnvValue('ANON_KEY');

export const db = {
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY),

  /**
   * Enjin permintaan dengan diagnostik ralat yang diperkukuh
   */
  request: async (path: string, options: RequestInit = {}) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Supabase Error: URL atau API Key tiada dalam env!");
      return { error: "Konfigurasi Env Vercel tidak lengkap." };
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
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMsg = errorBody.message || await response.text();
        
        console.error(`%c Supabase API Error (${response.status}) %c`, "background:red;color:white", "", errorMsg);
        
        if (response.status === 401) return { error: "Kunci API (Anon Key) tidak sah. Sila gunakan kunci 'ey...' yang betul." };
        if (response.status === 404) return { error: "Jadual (Table) 'azmeer_users' tidak dijumpai. Sila Run SQL di Supabase." };
        return { error: errorMsg };
      }

      if (response.status === 204) return { success: true };
      return await response.json();
    } catch (e: any) {
      console.error("Rangkaian Supabase Gagal:", e);
      return { error: "Tiada sambungan internet atau masalah rangkaian." };
    }
  },

  saveUser: async (username: string, password: string, userData: any) => {
    return await db.request('azmeer_users', {
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
    return await db.request(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  getUser: async (username: string) => {
    const data = await db.request(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    return Array.isArray(data) && data.length > 0 ? data[0] : (data?.error ? data : null);
  },

  saveUuid: async (userId: string, uuid: string) => {
    return await db.request('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId.toLowerCase().trim(), 
        uuid: uuid 
      })
    });
  },

  getUuids: async (userId: string) => {
    const data = await db.request(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return Array.isArray(data) ? data.map((d: any) => d.uuid) : [];
  },

  getAllUsers: async () => {
    const data = await db.request('azmeer_users?select=*&order=created_at.desc');
    return Array.isArray(data) ? data : [];
  }
};
