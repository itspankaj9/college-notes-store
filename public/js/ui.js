/* ═══════════════════════════════════════════════════════════════════════════
   pCloud — UI Rendering Module
   DOM creation and manipulation for all visual components
   ═══════════════════════════════════════════════════════════════════════════ */

const UI = (() => {

  // ─── Folder Card ────────────────────────────────────────────────────────

  function renderFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.dataset.id = folder.id;
    card.dataset.type = 'folder';
    card.dataset.name = folder.name;
    card.style.animation = `cardEnter 0.2s ease-out`;

    card.innerHTML = `
      <span class="material-symbols-rounded folder-card__icon" style="color: var(--text-secondary);">folder</span>
      <span class="folder-card__name" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</span>
      <button class="folder-card__more" data-action="more" title="More actions">
        <span class="material-symbols-rounded">more_vert</span>
      </button>
    `;

    return card;
  }

  // ─── File Card ──────────────────────────────────────────────────────────

  function renderFileCard(file, viewMode = 'grid') {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.dataset.id = file.id;
    card.dataset.type = 'file';
    card.dataset.name = file.name;
    card.style.animation = `cardEnter 0.2s ease-out`;

    const icon = Utils.getFileIcon(file.mime_type);
    const color = Utils.getFileColor(file.mime_type);
    const size = Utils.formatFileSize(file.size);
    const date = Utils.formatDate(file.updated_at || file.created_at);
    const isImage = Utils.isPreviewableImage(file.mime_type);

    if (viewMode === 'grid') {
      card.innerHTML = `
        <div class="file-card__preview" style="background: ${color}12;">
          ${isImage
            ? `<img src="${API.getViewUrl(file.id)}" alt="${escapeHtml(file.name)}" loading="lazy">`
            : `<span class="material-symbols-rounded file-card__type-icon" style="color: ${color};">${icon}</span>`
          }
        </div>
        <div class="file-card__info">
          <span class="material-symbols-rounded file-card__icon" style="color: ${color};">${icon}</span>
          <div class="file-card__details">
            <div class="file-card__name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-card__meta">${date}</div>
          </div>
          <button class="file-card__more" data-action="more" title="More actions">
            <span class="material-symbols-rounded">more_vert</span>
          </button>
        </div>
      `;
    } else {
      // List view
      card.innerHTML = `
        <div class="file-card__info">
          <span class="material-symbols-rounded file-card__icon" style="color: ${color};">${icon}</span>
          <div class="file-card__details">
            <div class="file-card__name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          </div>
          <span class="file-card__size">${size}</span>
          <span class="file-card__date">${date}</span>
          <button class="file-card__more" data-action="more" title="More actions">
            <span class="material-symbols-rounded">more_vert</span>
          </button>
        </div>
      `;
    }

    return card;
  }

  // ─── Trash Card ─────────────────────────────────────────────────────────

  function renderTrashCard(item) {
    const card = document.createElement('div');
    card.className = 'trash-card';
    card.dataset.id = item.id;
    card.dataset.type = item.type;
    card.dataset.name = item.name || item.original_name;

    const isFolder = item.type === 'folder';
    const icon = isFolder ? 'folder' : Utils.getFileIcon(item.mime_type);
    const color = isFolder ? 'var(--text-secondary)' : Utils.getFileColor(item.mime_type);
    const date = Utils.formatDate(item.trashed_at);
    const name = item.name || item.original_name;

    card.innerHTML = `
      <span class="material-symbols-rounded trash-card__icon" style="color: ${color};">${icon}</span>
      <div class="trash-card__details">
        <div class="trash-card__name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="trash-card__meta">Trashed ${date}</div>
      </div>
      <button class="trash-card__more" data-action="trash-more" title="More actions">
        <span class="material-symbols-rounded">more_vert</span>
      </button>
    `;

    return card;
  }

  // ─── Breadcrumbs ────────────────────────────────────────────────────────

  function renderBreadcrumbs(pathArr) {
    const container = document.getElementById('breadcrumbs');
    container.innerHTML = '';

    // Root item
    const root = document.createElement('a');
    root.className = 'breadcrumbs__item';
    root.href = '#my-files';
    root.dataset.id = 'root';
    root.innerHTML = `<span class="material-symbols-rounded">folder</span> My Files`;
    container.appendChild(root);

    if (pathArr && pathArr.length > 0) {
      pathArr.forEach((item, idx) => {
        // Separator
        const sep = document.createElement('span');
        sep.className = 'breadcrumbs__separator';
        sep.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
        container.appendChild(sep);

        // Path item
        const link = document.createElement('a');
        const isLast = idx === pathArr.length - 1;
        link.className = `breadcrumbs__item${isLast ? ' breadcrumbs__item--current' : ''}`;
        link.href = `#folder/${item.id}`;
        link.dataset.id = item.id;
        link.textContent = item.name;
        container.appendChild(link);
      });
    }

    container.style.display = 'flex';
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  function renderEmptyState(type) {
    const emptyState = document.getElementById('empty-state');
    const title = document.getElementById('empty-title');
    const text = document.getElementById('empty-text');
    const icon = emptyState.querySelector('.empty-state__icon');

    const states = {
      home: {
        icon: 'cloud_upload',
        title: 'Welcome to PCloud',
        text: 'Drop files here or use the "New" button to get started',
      },
      folder: {
        icon: 'folder_open',
        title: 'This folder is empty',
        text: 'Upload files or create subfolders to organize your content',
      },
      recent: {
        icon: 'schedule',
        title: 'No recent files',
        text: 'Files you upload or modify will appear here',
      },
      trash: {
        icon: 'delete_sweep',
        title: 'Trash is empty',
        text: 'Items you delete will be moved here',
      },
      search: {
        icon: 'search_off',
        title: 'No results found',
        text: 'Try different keywords or check your spelling',
      },
    };

    const state = states[type] || states.home;
    icon.textContent = state.icon;
    title.textContent = state.title;
    text.textContent = state.text;

    emptyState.style.display = 'flex';
  }

  function hideEmptyState() {
    document.getElementById('empty-state').style.display = 'none';
  }

  // ─── Modal ──────────────────────────────────────────────────────────────

  function showModal({ title, placeholder, value, confirmText, onConfirm }) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalInput = document.getElementById('modal-input');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    const modalClose = document.getElementById('modal-close');

    modalTitle.textContent = title;
    modalInput.placeholder = placeholder || 'Enter name';
    modalInput.value = value || '';
    modalConfirm.textContent = confirmText || 'Create';

    overlay.style.display = 'flex';

    // Focus input and select text
    setTimeout(() => {
      modalInput.focus();
      modalInput.select();
    }, 100);

    // Handle confirm
    const handleConfirm = () => {
      const inputValue = modalInput.value.trim();
      if (inputValue) {
        onConfirm(inputValue);
        closeModal();
      }
    };

    // Handle key press
    const handleKeydown = (e) => {
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') closeModal();
    };

    // Cleanup previous listeners
    modalConfirm.onclick = handleConfirm;
    modalCancel.onclick = closeModal;
    modalClose.onclick = closeModal;
    modalInput.onkeydown = handleKeydown;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.style.display = 'none';
  }

  // ─── Context Menu ──────────────────────────────────────────────────────

  function showContextMenu(event, item, isTrash = false) {
    event.preventDefault();
    event.stopPropagation();

    hideAllContextMenus();

    const menuId = isTrash ? 'trash-context-menu' : 'context-menu';
    const menu = document.getElementById(menuId);

    // Show/hide "Open", "View", "Download" for folders vs files
    if (!isTrash) {
      const openBtn = document.getElementById('ctx-open');
      const downloadBtn = document.getElementById('ctx-download');
      const viewBtn = document.getElementById('ctx-view');
      if (item.type === 'folder') {
        openBtn.style.display = 'flex';
        downloadBtn.style.display = 'none';
        if (viewBtn) viewBtn.style.display = 'none';
      } else {
        openBtn.style.display = 'none';
        downloadBtn.style.display = 'flex';
        if (viewBtn) viewBtn.style.display = 'flex';
      }
    }

    // Position the menu
    const x = event.clientX || event.pageX;
    const y = event.clientY || event.pageY;

    menu.style.display = 'block';
    menu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 200)}px`;

    // Store item data on the menu
    menu.dataset.itemId = item.id;
    menu.dataset.itemType = item.type;
    menu.dataset.itemName = item.name;

    // Close on click outside
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  function hideAllContextMenus() {
    document.getElementById('context-menu').style.display = 'none';
    document.getElementById('trash-context-menu').style.display = 'none';
  }

  // ─── Toast Notifications ───────────────────────────────────────────────

  function showToast(message, type = 'success', actionText = null, actionFn = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const iconMap = {
      success: 'check_circle',
      error: 'error',
      info: 'info',
    };

    toast.innerHTML = `
      <span class="material-symbols-rounded">${iconMap[type] || 'info'}</span>
      <span>${escapeHtml(message)}</span>
      ${actionText ? `<button class="toast__action">${escapeHtml(actionText)}</button>` : ''}
    `;

    if (actionText && actionFn) {
      toast.querySelector('.toast__action').onclick = () => {
        actionFn();
        removeToast(toast);
      };
    }

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => removeToast(toast), 4000);
  }

  function removeToast(toast) {
    toast.classList.add('toast--removing');
    setTimeout(() => toast.remove(), 200);
  }

  // ─── Loading State ─────────────────────────────────────────────────────

  function showLoading() {
    document.getElementById('skeleton-grid').style.display = 'grid';
    document.getElementById('content-grid').style.display = 'none';
    hideEmptyState();
  }

  function hideLoading() {
    document.getElementById('skeleton-grid').style.display = 'none';
    document.getElementById('content-grid').style.display = 'grid';
  }

  // ─── Upload Progress ──────────────────────────────────────────────────

  function showUploadProgress(filename) {
    const overlay = document.getElementById('upload-overlay');
    const bar = document.getElementById('upload-bar');
    const nameEl = document.getElementById('upload-filename');

    bar.style.width = '0%';
    nameEl.textContent = filename;
    overlay.style.display = 'block';
  }

  function updateUploadProgress(percent) {
    const bar = document.getElementById('upload-bar');
    bar.style.width = `${percent}%`;
  }

  function hideUploadProgress() {
    document.getElementById('upload-overlay').style.display = 'none';
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setViewTitle(title) {
    document.getElementById('view-title').textContent = title;
  }

  function clearContentGrid() {
    document.getElementById('content-grid').innerHTML = '';
  }

  function setActiveNav(view) {
    document.querySelectorAll('.sidebar__link').forEach(link => {
      link.classList.remove('sidebar__link--active');
    });
    const activeLink = document.querySelector(`.sidebar__link[data-view="${view}"]`);
    if (activeLink) {
      activeLink.classList.add('sidebar__link--active');
    }
  }

  // ─── File Viewer ──────────────────────────────────────────────────────────

  async function showFileViewer(file) {
    const overlay = document.getElementById('viewer-overlay');
    const nameEl = document.getElementById('viewer-file-name');
    const iconEl = document.getElementById('viewer-file-icon');
    const downloadBtn = document.getElementById('btn-viewer-download');
    const contentContainer = document.getElementById('viewer-content');

    nameEl.textContent = file.name;
    downloadBtn.href = API.getDownloadUrl(file.id);

    // Set icon based on type
    const icon = Utils.getFileIcon(file.mime_type);
    iconEl.textContent = icon;
    iconEl.style.color = Utils.getFileColor(file.mime_type);

    contentContainer.innerHTML = ''; // Clear previous

    const mime = file.mime_type || '';
    const fileUrl = API.getViewUrl(file.id);

    if (mime.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = fileUrl;
      img.alt = file.name;
      contentContainer.appendChild(img);
    } 
    else if (mime === 'application/pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = fileUrl;
      contentContainer.appendChild(iframe);
    } 
    else if (mime.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = fileUrl;
      video.controls = true;
      video.autoplay = true;
      contentContainer.appendChild(video);
    } 
    else if (mime.startsWith('audio/')) {
      const audio = document.createElement('audio');
      audio.src = fileUrl;
      audio.controls = true;
      audio.autoplay = true;
      contentContainer.appendChild(audio);
    } 
    else if (
      mime.startsWith('text/') || 
      mime === 'application/json' || 
      mime === 'application/javascript' ||
      mime === 'application/xml' ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.html')
    ) {
      // Fetch text contents
      const textContainer = document.createElement('div');
      textContainer.className = 'viewer-text-container';
      const pre = document.createElement('pre');
      pre.className = 'viewer-text';
      pre.textContent = 'Loading file contents...';
      textContainer.appendChild(pre);
      contentContainer.appendChild(textContainer);

      try {
        const response = await fetch(fileUrl);
        if (response.ok) {
          const text = await response.text();
          pre.textContent = text;
        } else {
          pre.textContent = 'Error: Failed to load file content.';
        }
      } catch (err) {
        pre.textContent = 'Error: Failed to load file content.';
      }
    } 
    else {
      // Fallback for binaries (docx, xlsx, zip, etc.)
      const placeholder = document.createElement('div');
      placeholder.className = 'viewer-placeholder';

      const fileColor = Utils.getFileColor(file.mime_type);
      placeholder.innerHTML = `
        <span class="material-symbols-rounded" style="color: ${fileColor};">${icon}</span>
        <div class="viewer-placeholder__name">${escapeHtml(file.name)}</div>
        <div class="viewer-placeholder__meta">${Utils.formatFileSize(file.size)} • ${escapeHtml(mime || 'Unknown format')}</div>
        <a href="${fileUrl}" class="btn btn--filled btn--viewer-placeholder" download>
          <span class="material-symbols-rounded">download</span>
          <span>Download to View</span>
        </a>
      `;
      contentContainer.appendChild(placeholder);
    }

    overlay.style.display = 'flex';
  }

  function closeFileViewer() {
    const overlay = document.getElementById('viewer-overlay');
    const contentContainer = document.getElementById('viewer-content');
    
    // Stop playing audio/video by clearing innerHTML
    contentContainer.innerHTML = '';
    overlay.style.display = 'none';
  }

  return {
    renderFolderCard,
    renderFileCard,
    renderTrashCard,
    renderBreadcrumbs,
    renderEmptyState,
    hideEmptyState,
    showModal,
    closeModal,
    showContextMenu,
    hideAllContextMenus,
    showToast,
    showLoading,
    hideLoading,
    showUploadProgress,
    updateUploadProgress,
    hideUploadProgress,
    setViewTitle,
    clearContentGrid,
    setActiveNav,
    escapeHtml,
    showFileViewer,
    closeFileViewer,
  };
})();
