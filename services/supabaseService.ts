
// Mengambil API Key daripada Environment Variables platform hosting (Vercel/Netlify)
// Jika tiada, ia akan cuba ambil dari window process (Local dev)
const SUPABASE_URL = (window as any).process?.env?.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = (window as any).process?.env?.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

/**
 * Helper untuk fetch dari Supabase REST API.
 */
const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("SUPABASE_CONFIG_MISSING: Sila set URL dan ANON_KEY di persekitaran hosting anda.");
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
      const errText = await response.text();
      console.error(`SUPABASE_API_ERROR [${response.status}]:`, errText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("SUPABASE_CONNECTION_ERROR:", e);
    return null;
  }
};

export const db = {
  saveUser: async (username: string, password: string, userData: any) => {
    return await supabaseRequest('azmeer_users', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ username, password, data: userData })
    });
  },

  getUser: async (username: string) => {
    const data = await supabaseRequest(`azmeer_users?username=eq.${username}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  },

  saveUuid: async (userId: string, uuid: string) => {
    return await supabaseRequest('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, uuid: uuid })
    });
  },

  getUuids: async (userId: string) => {
    const data = await supabaseRequest(`azmeer_uuids?user_id=eq.${userId}&select=uuid`);
    return data ? data.map((d: any) => d.uuid) : [];
  },

  getAllUsers: async () => {
    const data = await supabaseRequest('azmeer_users?select=*');
    return data ? data.map((d: any) => d.data) : [];
  }
};
