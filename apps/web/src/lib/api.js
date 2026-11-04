// Sendora API Client
// Standard ES Module

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Handle API responses with proper error surfacing
 */
async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { error: await res.text() };
  }

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Transfers
  async createTransfer(payload) {
    const res = await fetch(`${API_BASE}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getTransfer(identifier, { unlockToken, senderToken } = {}) {
    const headers = {};
    if (unlockToken) headers['X-Unlock-Token'] = unlockToken;
    if (senderToken) headers['X-Sender-Token'] = senderToken;

    const res = await fetch(`${API_BASE}/transfers/${encodeURIComponent(identifier)}`, {
      headers
    });
    return handleResponse(res);
  },

  async unlockTransfer(identifier, password) {
    const res = await fetch(`${API_BASE}/transfers/${encodeURIComponent(identifier)}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return handleResponse(res);
  },

  async deleteTransfer(id, senderToken) {
    const res = await fetch(`${API_BASE}/transfers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'X-Sender-Token': senderToken
      }
    });
    return handleResponse(res);
  },

  // Lookup
  async lookupCode(code) {
    const res = await fetch(`${API_BASE}/lookup/${encodeURIComponent(code)}`);
    return handleResponse(res);
  },

  // File Requests
  async createFileRequest(payload) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getFileRequest(identifier) {
    const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(identifier)}`);
    return handleResponse(res);
  },

  async createSubmission(identifier, payload = {}) {
    const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(identifier)}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getRequestManagement(id, requesterToken) {
    const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(id)}/manage`, {
      headers: { 'X-Requester-Token': requesterToken }
    });
    return handleResponse(res);
  },

  async closeFileRequest(id, requesterToken) {
    const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      headers: { 'X-Requester-Token': requesterToken }
    });
    return handleResponse(res);
  },

  async deleteFileRequest(id, requesterToken) {
    const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Requester-Token': requesterToken }
    });
    return handleResponse(res);
  },

  // Admin
  async adminLogin(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res);
  },

  async adminGetStats(token) {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },

  async adminGetTransfers(page = 1, token) {
    const res = await fetch(`${API_BASE}/admin/transfers?page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },

  async adminRunCleanup(token) {
    const res = await fetch(`${API_BASE}/admin/cleanup`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  },

  async adminLogout(token) {
    const res = await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(res);
  }
};

