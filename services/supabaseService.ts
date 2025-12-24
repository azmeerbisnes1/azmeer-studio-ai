
const getSupabaseConfig = () => {
  try {
    // 1. Cuba akses guna standard Vite (Paling utama untuk Vercel/Local)
    // @ts-ignore
    let url = import.meta.env?.VITE_SUPABASE_URL;
    // @ts-ignore
    let key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    // 2. Fallback jika nama variable tak ada prefix VITE_ (Berguna untuk sesetengah persekitaran)
    if (!url) {
      // @ts-ignore
      url = import.meta.env?.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : null);
    }
    if (!key) {
      // @ts-ignore
      key = import.meta.env?.SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY : null);
    }

    // 3. Last resort: check window object (kadangkala disuntik oleh sesetengah CI/CD)
    if (!url && typeof window !== 'undefined') url = (window as any)._env_?.VITE_SUPABASE_URL;
    if (!key && typeof window !== 'undefined') key = (window as any)._env_?.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error("❌ SUPABASE CONFIG MISSING: Sila pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah di-set dalam Vercel Environment Variables.");
    } else {
      console.log("✅ Supabase Configuration Detected.");
    }
    
    return { 
      url: (url || "").trim(), 
      key: (key || "").trim() 
    };
  } catch (e) {
    console.error("Config fetch error:", e);
    return { url: "", key: "" };
  }
};

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = getSupabaseConfig();

const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase request aborted: Missing credentials.");
    return null;
  }
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { 
      ...options, 
      headers,
      mode: 'cors' 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase Error ${response.status}:`, errorText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("Supabase Network Error:", e);
    return null;
  }
};

export const db = {
  // Check if DB is ready
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY),

  // Simpan atau Kemaskini User (Register/Admin Update)
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

  // Kemaskini data (Status Approve/Reject, Limit Video)
  updateUser: async (username: string, userData: any) => {
    return await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  // Ambil data user untuk Login
  getUser: async (username: string) => {
    const data = await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  },

  // Simpan sejarah UUID video
  saveUuid: async (userId: string, uuid: string) => {
    return await supabaseRequest('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId.toLowerCase().trim(), 
        uuid: uuid 
      })
    });
  },

  // Ambil semua UUID milik user
  getUuids: async (userId: string) => {
    const data = await supabaseRequest(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return data ? data.map((d: any) => d.uuid) : [];
  },

  // Fungsi khas untuk Admin Dashboard
  getAllUsers: async () => {
    const data = await supabaseRequest('azmeer_users?select=*&order=created_at.desc');
    return data ? data : [];
  }
};
