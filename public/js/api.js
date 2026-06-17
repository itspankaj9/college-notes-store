/* ═══════════════════════════════════════════════════════════════════════════
   pCloud — API Client Module
   Fetch wrappers for all backend endpoints
   ═══════════════════════════════════════════════════════════════════════════ */

const API = (() => {
  const BASE = '/api';

  /**
   * Generic fetch wrapper with error handling
   */
  async function request(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`API Error [${url}]:`, err);
      throw err;
    }
  }

  // ─── Folders ────────────────────────────────────────────────────────────

  async function fetchFolders(parentId = null) {
    const query = parentId ? `?parentId=${parentId}` : '';
    return request(`${BASE}/folders${query}`);
  }

  async function fetchFolder(id) {
    return request(`${BASE}/folders/${id}`);
  }

  async function createFolder(name, parentId = null) {
    return request(`${BASE}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId }),
    });
  }

  async function renameFolder(id, name) {
    return request(`${BASE}/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  async function deleteFolder(id) {
    return request(`${BASE}/folders/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Files ──────────────────────────────────────────────────────────────

  async function fetchFiles(folderId = null) {
    const query = folderId ? `?folderId=${folderId}` : '';
    return request(`${BASE}/files${query}`);
  }

  async function getFileById(id) {
    return request(`${BASE}/files/${id}`);
  }

  async function uploadFile(file, folderId = null, onProgress = null) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);

      xhr.open('POST', `${BASE}/files/upload`);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.send(formData);
    });
  }

  async function renameFile(id, name) {
    return request(`${BASE}/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  async function deleteFile(id) {
    return request(`${BASE}/files/${id}`, {
      method: 'DELETE',
    });
  }

  function getDownloadUrl(id) {
    return `${BASE}/files/${id}/download`;
  }

  function getViewUrl(id) {
    return `${BASE}/files/${id}/view`;
  }

  // ─── Trash ──────────────────────────────────────────────────────────────

  async function fetchTrash() {
    return request(`${BASE}/trash`);
  }

  async function restoreItem(id, type) {
    return request(`${BASE}/trash/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  }

  async function permanentDelete(id, type) {
    return request(`${BASE}/trash/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  }

  // ─── Search & Recent ───────────────────────────────────────────────────

  async function search(query) {
    return request(`${BASE}/search?q=${encodeURIComponent(query)}`);
  }

  async function fetchRecent() {
    return request(`${BASE}/recent`);
  }

  async function fetchStorage() {
    return request(`${BASE}/storage`);
  }

  // ─── Authentication ────────────────────────────────────────────────────

  async function login(username, password) {
    return request(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }

  async function logout() {
    return request(`${BASE}/auth/logout`, {
      method: 'POST',
    });
  }

  async function checkAuthStatus() {
    return request(`${BASE}/auth/status`);
  }

  return {
    fetchFolders,
    fetchFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    fetchFiles,
    getFileById,
    uploadFile,
    renameFile,
    deleteFile,
    getDownloadUrl,
    getViewUrl,
    fetchTrash,
    restoreItem,
    permanentDelete,
    search,
    fetchRecent,
    fetchStorage,
    login,
    logout,
    checkAuthStatus,
  };
})();
