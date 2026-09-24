const TOKEN_KEY = 'docclean_auth_token';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

const getHeaders = (includeContentType = true): HeadersInit => {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  register: async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ name, fullName: name, email, password }),
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: getHeaders(false),
    });
    return res.json();
  },
};

export const documentsApi = {
  getMyDocuments: async () => {
    const res = await fetch('/api/documents/my-documents', {
      method: 'GET',
      headers: getHeaders(false),
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    return res.json();
  },

  download: async (id: string, fileName?: string) => {
    const token = getAuthToken();
    const url = `/api/documents/${id}/download-cleaned${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(false),
    });
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || `cleaned_document_${id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    return { success: true };
  },

  upload: async (file: File, options: string[]) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('options', JSON.stringify(options));
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },
};
