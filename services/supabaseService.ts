
const getSupabaseConfig = () => {
  try {
    // Mencari URL dan KEY daripada environment variables (Vite atau Process)
    const url = (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : null) || "";
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : null) || "";
    
    if (!url || !key) {
      console.warn("⚠️ AMARAN: SUPABASE_URL atau SUPABASE_ANON_KEY tidak dikesan. Sila pastikan hampa dah masukkan dalam Environment Variables atau .env file.");
    }
    
    return { url, key };
  } catch (e) {
    return { url: "", key: "" };
  }
};

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = getSupabaseConfig();

const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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
      console.error(`Supabase Error (${response.status}):`, errorText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("Network Error with Supabase:", e);
    return null;
  }
};

export const db = {
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
