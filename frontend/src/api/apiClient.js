export const parseApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!text) return null;

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (error) {
      const parseError = new Error('API returned invalid JSON');
      parseError.cause = error;
      parseError.responseText = text;
      throw parseError;
    }
  }

  return text;
};

const apiFetch = async (path, options = {}) => {
  const init = {
    credentials: 'include',
    ...options,
    headers: {
      ...options.headers,
    },
  };

  if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    init.headers = {
      'Content-Type': 'application/json',
      ...init.headers,
    };
    init.body = JSON.stringify(init.body);
  }

  const response = await fetch(`/api${path}`, init);
  const body = await parseApiResponse(response);

  if (!response.ok) {
    const error = new Error(body?.message || response.statusText || 'API request failed');
    error.status = response.status;
    error.data = body;
    if (body?.code === 'STAFF_PERMISSION_DENIED' && typeof window !== 'undefined') {
      window.alert(body?.message || 'Permission denied');
    }
    throw error;
  }

  return body;
};

const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

const createEntityClient = (entity) => ({
  list: (order, limit) => {
    const query = buildQueryString({ order, limit });
    return apiFetch(`/entities/${entity}/list${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },
  filter: (query = {}, order, limit, offset) => apiFetch(`/entities/${entity}/filter`, {
    method: 'POST',
    body: { query, order, limit, offset },
  }),
  get: (id) => apiFetch(`/entities/${entity}/${id}`, {
    method: 'GET',
  }),
  create: (data) => apiFetch(`/entities/${entity}`, {
    method: 'POST',
    body: data,
  }),
  update: (id, data) => apiFetch(`/entities/${entity}/${id}`, {
    method: 'PATCH',
    body: data,
  }),
  delete: (id) => apiFetch(`/entities/${entity}/${id}`, {
    method: 'DELETE',
  }),
  subscribe: () => {
    return () => {};
  },
});

const auth = {
  me: () => apiFetch('/auth/me', { method: 'GET' }),
  logout: async (redirectUrl) => {
    await apiFetch('/auth/logout', { method: 'POST' });
    if (typeof redirectUrl === 'string' && redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
  redirectToLogin: (redirectUrl = '/') => {
    const target = redirectUrl ? encodeURIComponent(redirectUrl) : '/';
    window.location.href = `/login?redirect=${target}`;
  },
  updateMe: (data) => apiFetch('/auth/me', {
    method: 'PATCH',
    body: data,
  }),
};

const functions = {
  invoke: (name, payload) => apiFetch(`/functions/${name}`, {
    method: 'POST',
    body: payload,
  }),
};

const admin = {
  users: {
    list: (params = {}) => {
      const query = buildQueryString(params);
      return apiFetch(`/admin/users${query ? `?${query}` : ''}`, {
        method: 'GET',
      });
    },
  },
};

const users = {
  inviteUser: (email, role = 'employee') => apiFetch('/admin/invite', {
    method: 'POST',
    body: { email, role },
  }),
};

const wishlist = {
  get: () => apiFetch('/wishlist', { method: 'GET' }),
  add: (product_id) => apiFetch('/wishlist', {
    method: 'POST',
    body: { product_id },
  }),
  remove: (product_id) => apiFetch(`/wishlist/${product_id}`, {
    method: 'DELETE',
  }),
  sync: (guest_items) => apiFetch('/wishlist/sync', {
    method: 'POST',
    body: { guest_items },
  }),
};

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      if (!(file instanceof File)) {
        throw new Error('UploadFile expects a browser File object.');
      }
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'File upload failed');
      }
      return parseApiResponse(response);
    },
    DeleteFile: async ({ file_url }) => apiFetch('/files', {
      method: 'DELETE',
      body: { file_url },
    }),
    InvokeLLM: (payload) => apiFetch('/llm/invoke', {
      method: 'POST',
      body: payload,
    }),
  },
};

export const apiClient = {
  entities: new Proxy({}, {
    get: (_, entity) => createEntityClient(entity),
  }),
  auth,
  admin,
  users,
  functions,
  integrations,
  wishlist,
};
