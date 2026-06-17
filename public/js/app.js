/* ═══════════════════════════════════════════════════════════════════════════
   pCloud — Main Application Controller
   Client-side routing, state management, and event handling
   ═══════════════════════════════════════════════════════════════════════════ */

const App = (() => {
  // ─── State ──────────────────────────────────────────────────────────────
  let currentView = 'home';        // 'home' | 'my-files' | 'folder' | 'recent' | 'trash' | 'search'
  let currentFolderId = null;
  let viewMode = 'grid';           // 'grid' | 'list'
  let selectedItem = null;
  let currentSearchQuery = '';

  // ─── DOM References ─────────────────────────────────────────────────────
  const contentGrid = document.getElementById('content-grid');
  const breadcrumbs = document.getElementById('breadcrumbs');
  const fileInput = document.getElementById('file-input');
  const newMenu = document.getElementById('new-menu');

  // ─── Initialize ─────────────────────────────────────────────────────────
  async function init() {
    setupLoginHandlers();

    try {
      const status = await API.checkAuthStatus();
      if (status.authenticated) {
        showApp();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
  }

  function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'grid';

    setupRouting();
    setupEventListeners();
    setupSearch();
    setupDragAndDrop();
    setupKeyboardShortcuts();

    // Navigate to initial route
    handleRoute();
    updateStorageBar();

    // Profile menu toggle and logout
    setupProfileMenu();
  }

  function setupLoginHandlers() {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login-submit');
    const errorBanner = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      
      if (!username || !password) return;

      submitBtn.disabled = true;
      submitBtn.classList.add('btn--loading');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span>Logging in...</span>`;
      errorBanner.style.display = 'none';

      try {
        await API.login(username, password);
        usernameInput.value = '';
        passwordInput.value = '';
        showApp();
      } catch (err) {
        errorBanner.style.display = 'flex';
        errorText.textContent = err.message || 'Invalid username or password';
        
        // Add card shake effect
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
          loginCard.classList.remove('shake');
          void loginCard.offsetWidth; // trigger reflow
          loginCard.classList.add('shake');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn--loading');
        submitBtn.innerHTML = originalText;
      }
    });
  }

  function setupProfileMenu() {
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('btn-logout');

    if (!avatar || !dropdown || !logoutBtn) return;

    avatar.onclick = (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    };

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== avatar) {
        dropdown.style.display = 'none';
      }
    });

    logoutBtn.onclick = async () => {
      try {
        await API.logout();
        window.location.reload();
      } catch (err) {
        UI.showToast('Logout failed', 'error');
      }
    };
  }

  // ─── Storage Bar ────────────────────────────────────────────────────────

  async function updateStorageBar() {
    try {
      const { used, max } = await API.fetchStorage();
      const percent = Math.min((used / max) * 100, 100);
      const fill = document.getElementById('storage-fill');
      const label = document.getElementById('storage-label');

      fill.style.width = `${percent}%`;

      // Change color if near limit
      if (percent > 90) {
        fill.style.background = 'var(--error)';
      } else if (percent > 70) {
        fill.style.background = 'var(--warning)';
      } else {
        fill.style.background = 'linear-gradient(90deg, var(--primary), #8ab4f8)';
      }

      label.textContent = `${Utils.formatFileSize(used)} of ${Utils.formatFileSize(max)} used`;
    } catch (err) {
      // Silently fail — storage bar is non-critical
    }
  }

  // ─── Client-Side Routing ────────────────────────────────────────────────

  function setupRouting() {
    window.addEventListener('hashchange', handleRoute);
  }

  function handleRoute() {
    const hash = window.location.hash || '#home';
    const parts = hash.substring(1).split('/');
    const view = parts[0];
    const param = parts[1];

    UI.hideAllContextMenus();
    selectedItem = null;

    switch (view) {
      case 'home':
        navigateHome();
        break;
      case 'my-files':
        navigateMyFiles();
        break;
      case 'folder':
        if (param) navigateToFolder(param);
        break;
      case 'recent':
        navigateRecent();
        break;
      case 'trash':
        navigateTrash();
        break;
      case 'search':
        if (param) navigateSearch(decodeURIComponent(param));
        break;
      default:
        navigateHome();
    }
  }

  // ─── Navigation Functions ───────────────────────────────────────────────

  async function navigateHome() {
    currentView = 'home';
    currentFolderId = null;
    UI.setActiveNav('home');
    UI.setViewTitle('Home');
    breadcrumbs.style.display = 'none';
    await loadFolderContents(null);
  }

  async function navigateMyFiles() {
    currentView = 'my-files';
    currentFolderId = null;
    UI.setActiveNav('my-files');
    UI.setViewTitle('My Files');
    breadcrumbs.style.display = 'none';
    await loadFolderContents(null);
  }

  async function navigateToFolder(folderId) {
    currentView = 'folder';
    currentFolderId = folderId;
    UI.setActiveNav('my-files');

    try {
      const folder = await API.fetchFolder(folderId);
      UI.setViewTitle(folder.name);
      UI.renderBreadcrumbs(folder.path);
    } catch (err) {
      UI.setViewTitle('Folder');
      breadcrumbs.style.display = 'none';
    }

    await loadFolderContents(folderId);
  }

  async function navigateRecent() {
    currentView = 'recent';
    currentFolderId = null;
    UI.setActiveNav('recent');
    UI.setViewTitle('Recent');
    breadcrumbs.style.display = 'none';

    UI.showLoading();

    try {
      const files = await API.fetchRecent();
      UI.hideLoading();
      UI.clearContentGrid();

      if (files.length === 0) {
        UI.renderEmptyState('recent');
        return;
      }

      UI.hideEmptyState();
      files.forEach(file => {
        contentGrid.appendChild(UI.renderFileCard(file, viewMode));
      });
    } catch (err) {
      UI.hideLoading();
      UI.showToast('Failed to load recent files', 'error');
    }
  }

  async function navigateTrash() {
    currentView = 'trash';
    currentFolderId = null;
    UI.setActiveNav('trash');
    UI.setViewTitle('Trash');
    breadcrumbs.style.display = 'none';

    UI.showLoading();

    try {
      const items = await API.fetchTrash();
      UI.hideLoading();
      UI.clearContentGrid();

      if (items.length === 0) {
        UI.renderEmptyState('trash');
        return;
      }

      UI.hideEmptyState();
      contentGrid.className = 'content-grid';
      contentGrid.style.gridTemplateColumns = '1fr';

      items.forEach(item => {
        contentGrid.appendChild(UI.renderTrashCard(item));
      });
    } catch (err) {
      UI.hideLoading();
      UI.showToast('Failed to load trash', 'error');
    }
  }

  async function navigateSearch(query) {
    currentView = 'search';
    currentFolderId = null;
    currentSearchQuery = query;
    UI.setActiveNav('');
    UI.setViewTitle(`Search results for "${query}"`);
    breadcrumbs.style.display = 'none';

    UI.showLoading();

    try {
      const results = await API.search(query);
      UI.hideLoading();
      UI.clearContentGrid();

      if (results.length === 0) {
        UI.renderEmptyState('search');
        return;
      }

      UI.hideEmptyState();
      updateGridMode();

      // Render folders first, then files
      const folders = results.filter(r => r.type === 'folder');
      const files = results.filter(r => r.type === 'file');

      if (folders.length > 0) {
        const header = document.createElement('div');
        header.className = 'section-header';
        header.textContent = 'Folders';
        header.style.gridColumn = '1 / -1';
        contentGrid.appendChild(header);

        folders.forEach(folder => {
          contentGrid.appendChild(UI.renderFolderCard(folder));
        });
      }

      if (files.length > 0) {
        const header = document.createElement('div');
        header.className = 'section-header';
        header.textContent = 'Files';
        header.style.gridColumn = '1 / -1';
        contentGrid.appendChild(header);

        files.forEach(file => {
          contentGrid.appendChild(UI.renderFileCard(file, viewMode));
        });
      }
    } catch (err) {
      UI.hideLoading();
      UI.showToast('Search failed', 'error');
    }
  }

  // ─── Load Folder Contents ───────────────────────────────────────────────

  async function loadFolderContents(folderId) {
    UI.showLoading();

    try {
      const [folders, files] = await Promise.all([
        API.fetchFolders(folderId),
        API.fetchFiles(folderId),
      ]);

      UI.hideLoading();
      UI.clearContentGrid();

      if (folders.length === 0 && files.length === 0) {
        const emptyType = currentView === 'home' ? 'home' : 'folder';
        UI.renderEmptyState(emptyType);
        return;
      }

      UI.hideEmptyState();
      updateGridMode();

      // Render folders
      if (folders.length > 0 && files.length > 0) {
        const header = document.createElement('div');
        header.className = 'section-header';
        header.textContent = 'Folders';
        header.style.gridColumn = '1 / -1';
        contentGrid.appendChild(header);
      }

      folders.forEach(folder => {
        contentGrid.appendChild(UI.renderFolderCard(folder));
      });

      // Render files
      if (folders.length > 0 && files.length > 0) {
        const header = document.createElement('div');
        header.className = 'section-header';
        header.textContent = 'Files';
        header.style.gridColumn = '1 / -1';
        contentGrid.appendChild(header);
      }

      files.forEach(file => {
        contentGrid.appendChild(UI.renderFileCard(file, viewMode));
      });

    } catch (err) {
      UI.hideLoading();
      UI.showToast('Failed to load contents', 'error');
    }
  }

  // ─── Event Listeners ───────────────────────────────────────────────────

  function setupEventListeners() {
    // ── New menu toggle ──
    document.getElementById('btn-new-menu').addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = newMenu.style.display === 'block';
      newMenu.style.display = isOpen ? 'none' : 'block';
    });

    // Close new menu on outside click
    document.addEventListener('click', (e) => {
      if (!newMenu.contains(e.target) && e.target.id !== 'btn-new-menu') {
        newMenu.style.display = 'none';
      }
    });

    // ── New folder ──
    document.getElementById('btn-new-folder').addEventListener('click', () => {
      newMenu.style.display = 'none';
      UI.showModal({
        title: 'New folder',
        placeholder: 'Untitled folder',
        value: 'Untitled folder',
        confirmText: 'Create',
        onConfirm: async (name) => {
          try {
            await API.createFolder(name, currentFolderId);
            UI.showToast('Folder created', 'success');
            refreshCurrentView();
          } catch (err) {
            UI.showToast('Failed to create folder', 'error');
          }
        },
      });
    });

    // ── Upload file button ──
    document.getElementById('btn-upload-file').addEventListener('click', () => {
      newMenu.style.display = 'none';
      fileInput.click();
    });

    // ── File input change ──
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      for (const file of files) {
        await uploadSingleFile(file);
      }

      fileInput.value = ''; // Reset
      refreshCurrentView();
    });

    // ── Content grid event delegation ──
    contentGrid.addEventListener('click', handleContentClick);
    contentGrid.addEventListener('contextmenu', handleContentContextMenu);
    contentGrid.addEventListener('dblclick', handleContentDoubleClick);

    // ── Context menu actions ──
    document.getElementById('ctx-open').addEventListener('click', handleCtxOpen);
    document.getElementById('ctx-view').addEventListener('click', handleCtxView);
    document.getElementById('ctx-download').addEventListener('click', handleCtxDownload);
    document.getElementById('ctx-rename').addEventListener('click', handleCtxRename);
    document.getElementById('ctx-delete').addEventListener('click', handleCtxDelete);
    document.getElementById('ctx-restore').addEventListener('click', handleCtxRestore);
    document.getElementById('ctx-permanent-delete').addEventListener('click', handleCtxPermanentDelete);

    // ── File Viewer Actions ──
    document.getElementById('btn-viewer-close').addEventListener('click', UI.closeFileViewer);

    // ── View toggle ──
    document.getElementById('btn-view-toggle').addEventListener('click', toggleViewMode);

    // ── Sidebar toggle (mobile) ──
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('sidebar--open');
    });

    // ── Brand logo ──
    document.getElementById('brand-logo').addEventListener('click', () => {
      window.location.hash = '#home';
    });

    // Close sidebar on nav link click (mobile)
    document.querySelectorAll('.sidebar__link').forEach(link => {
      link.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('sidebar--open');
      });
    });
  }

  // ─── Content Click Handlers ─────────────────────────────────────────────

  function handleContentClick(e) {
    const card = e.target.closest('.folder-card, .file-card, .trash-card');
    if (!card) return;

    // Handle more button
    const moreBtn = e.target.closest('[data-action="more"], [data-action="trash-more"]');
    if (moreBtn) {
      const isTrash = moreBtn.dataset.action === 'trash-more';
      UI.showContextMenu(e, {
        id: card.dataset.id,
        type: card.dataset.type,
        name: card.dataset.name,
      }, isTrash);
      return;
    }

    // Handle folder click — navigate into it
    if (card.classList.contains('folder-card') && currentView !== 'trash') {
      window.location.hash = `#folder/${card.dataset.id}`;
      return;
    }
  }

  async function handleContentDoubleClick(e) {
    const card = e.target.closest('.file-card');
    if (!card) return;

    if (currentView !== 'trash') {
      try {
        const file = await API.getFileById(card.dataset.id);
        if (file) {
          UI.showFileViewer(file);
        }
      } catch (err) {
        UI.showToast('Failed to load file preview', 'error');
      }
    }
  }

  function handleContentContextMenu(e) {
    const card = e.target.closest('.folder-card, .file-card, .trash-card');
    if (!card) return;

    const isTrash = currentView === 'trash';
    UI.showContextMenu(e, {
      id: card.dataset.id,
      type: card.dataset.type,
      name: card.dataset.name,
    }, isTrash);
  }

  // ─── Context Menu Actions ──────────────────────────────────────────────

  function handleCtxOpen() {
    const menu = document.getElementById('context-menu');
    const id = menu.dataset.itemId;
    UI.hideAllContextMenus();
    window.location.hash = `#folder/${id}`;
  }

  function handleCtxDownload() {
    const menu = document.getElementById('context-menu');
    const id = menu.dataset.itemId;
    UI.hideAllContextMenus();

    const a = document.createElement('a');
    a.href = API.getDownloadUrl(id);
    a.download = '';
    a.click();
  }

  async function handleCtxView() {
    const menu = document.getElementById('context-menu');
    const id = menu.dataset.itemId;
    UI.hideAllContextMenus();

    try {
      const file = await API.getFileById(id);
      if (file) {
        UI.showFileViewer(file);
      }
    } catch (err) {
      UI.showToast('Failed to load file preview', 'error');
    }
  }

  function handleCtxRename() {
    const menu = document.getElementById('context-menu');
    const id = menu.dataset.itemId;
    const type = menu.dataset.itemType;
    const name = menu.dataset.itemName;
    UI.hideAllContextMenus();

    UI.showModal({
      title: `Rename ${type}`,
      placeholder: 'Enter new name',
      value: name,
      confirmText: 'Rename',
      onConfirm: async (newName) => {
        try {
          if (type === 'folder') {
            await API.renameFolder(id, newName);
          } else {
            await API.renameFile(id, newName);
          }
          UI.showToast(`${type === 'folder' ? 'Folder' : 'File'} renamed`, 'success');
          refreshCurrentView();
        } catch (err) {
          UI.showToast('Failed to rename', 'error');
        }
      },
    });
  }

  async function handleCtxDelete() {
    const menu = document.getElementById('context-menu');
    const id = menu.dataset.itemId;
    const type = menu.dataset.itemType;
    const name = menu.dataset.itemName;
    UI.hideAllContextMenus();

    try {
      if (type === 'folder') {
        await API.deleteFolder(id);
      } else {
        await API.deleteFile(id);
      }
      UI.showToast(`"${name}" moved to trash`, 'success', 'Undo', async () => {
        try {
          await API.restoreItem(id, type);
          UI.showToast('Item restored', 'success');
          refreshCurrentView();
        } catch (err) {
          UI.showToast('Failed to undo', 'error');
        }
      });
      refreshCurrentView();
    } catch (err) {
      UI.showToast('Failed to delete', 'error');
    }
  }

  async function handleCtxRestore() {
    const menu = document.getElementById('trash-context-menu');
    const id = menu.dataset.itemId;
    const type = menu.dataset.itemType;
    UI.hideAllContextMenus();

    try {
      await API.restoreItem(id, type);
      UI.showToast('Item restored', 'success');
      refreshCurrentView();
    } catch (err) {
      UI.showToast('Failed to restore', 'error');
    }
  }

  async function handleCtxPermanentDelete() {
    const menu = document.getElementById('trash-context-menu');
    const id = menu.dataset.itemId;
    const type = menu.dataset.itemType;
    const name = menu.dataset.itemName;
    UI.hideAllContextMenus();

    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;

    try {
      await API.permanentDelete(id, type);
      UI.showToast('Permanently deleted', 'success');
      refreshCurrentView();
    } catch (err) {
      UI.showToast('Failed to delete', 'error');
    }
  }

  // ─── View Mode Toggle ──────────────────────────────────────────────────

  function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    const btn = document.getElementById('btn-view-toggle');
    btn.querySelector('.material-symbols-rounded').textContent =
      viewMode === 'grid' ? 'grid_view' : 'view_list';
    updateGridMode();
    refreshCurrentView();
  }

  function updateGridMode() {
    if (currentView === 'trash') {
      contentGrid.className = 'content-grid';
      contentGrid.style.gridTemplateColumns = '1fr';
    } else if (viewMode === 'list') {
      contentGrid.className = 'content-grid content-grid--list';
      contentGrid.style.gridTemplateColumns = '';
    } else {
      contentGrid.className = 'content-grid';
      contentGrid.style.gridTemplateColumns = '';
    }
  }

  // ─── Upload ─────────────────────────────────────────────────────────────

  async function uploadSingleFile(file) {
    UI.showUploadProgress(file.name);

    try {
      await API.uploadFile(file, currentFolderId, (percent) => {
        UI.updateUploadProgress(percent);
      });
      UI.hideUploadProgress();
      UI.showToast(`"${file.name}" uploaded`, 'success');
      updateStorageBar();
    } catch (err) {
      UI.hideUploadProgress();
      // Check if it's a storage limit error
      if (err.message && err.message.includes('Storage limit')) {
        UI.showToast('Storage full! Maximum 1 GB reached.', 'error');
      } else {
        UI.showToast(`Failed to upload "${file.name}"`, 'error');
      }
    }
  }

  // ─── Drag & Drop ───────────────────────────────────────────────────────

  function setupDragAndDrop() {
    const mainContent = document.getElementById('main-content');
    let dragCounter = 0;

    // Create drag overlay
    const overlay = document.createElement('div');
    overlay.className = 'drag-overlay';
    overlay.innerHTML = `
      <div class="drag-overlay__content">
        <span class="material-symbols-rounded">cloud_upload</span>
        <p>Drop files to upload</p>
      </div>
    `;
    document.body.appendChild(overlay);

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (currentView !== 'trash') {
        overlay.classList.add('drag-overlay--active');
      }
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        overlay.classList.remove('drag-overlay--active');
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('drag-overlay--active');

      if (currentView === 'trash') return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      for (const file of files) {
        await uploadSingleFile(file);
      }
      refreshCurrentView();
    });
  }

  // ─── Search ─────────────────────────────────────────────────────────────

  function setupSearch() {
    Search.init(
      // onSearch
      (query) => {
        window.location.hash = `#search/${encodeURIComponent(query)}`;
      },
      // onClear
      () => {
        if (currentView === 'search') {
          window.location.hash = '#home';
        }
      }
    );
  }

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape — Close viewer
      if (e.key === 'Escape') {
        UI.closeFileViewer();
      }

      // Don't fire other shortcuts when typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Ctrl+N or Shift+N — New folder
      if ((e.ctrlKey && e.key === 'n') || (e.shiftKey && e.key === 'N')) {
        e.preventDefault();
        document.getElementById('btn-new-folder').click();
      }

      // / — Focus search
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input').focus();
      }
    });
  }

  // ─── Refresh ────────────────────────────────────────────────────────────

  function refreshCurrentView() {
    updateStorageBar();
    switch (currentView) {
      case 'home':
        navigateHome();
        break;
      case 'my-files':
        navigateMyFiles();
        break;
      case 'folder':
        navigateToFolder(currentFolderId);
        break;
      case 'recent':
        navigateRecent();
        break;
      case 'trash':
        navigateTrash();
        break;
      case 'search':
        navigateSearch(currentSearchQuery);
        break;
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refreshCurrentView };
})();
