/* ═══════════════════════════════════════════════════════════════════════════
   pCloud — Utility Functions
   ═══════════════════════════════════════════════════════════════════════════ */

const Utils = (() => {
  /**
   * Format bytes into human-readable file size
   * @param {number} bytes
   * @returns {string} e.g. "2.3 MB"
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format date into readable string
   * @param {string} dateStr - ISO date string
   * @returns {string} e.g. "15 June 2026"
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Get Material Symbols icon name for a MIME type
   * @param {string} mimeType
   * @returns {string} icon name
   */
  function getFileIcon(mimeType) {
    if (!mimeType) return 'draft';

    const map = {
      // Documents
      'application/pdf': 'picture_as_pdf',
      'application/msword': 'description',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'description',
      'text/plain': 'article',
      'text/markdown': 'article',

      // Spreadsheets
      'application/vnd.ms-excel': 'table_chart',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'table_chart',
      'text/csv': 'table_chart',

      // Presentations
      'application/vnd.ms-powerpoint': 'slideshow',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slideshow',

      // Archives
      'application/zip': 'folder_zip',
      'application/x-rar-compressed': 'folder_zip',
      'application/x-7z-compressed': 'folder_zip',
      'application/gzip': 'folder_zip',

      // Code
      'application/json': 'data_object',
      'application/javascript': 'code',
      'text/html': 'code',
      'text/css': 'code',
      'application/xml': 'code',
    };

    if (map[mimeType]) return map[mimeType];
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'movie';
    if (mimeType.startsWith('audio/')) return 'music_note';
    if (mimeType.startsWith('text/')) return 'article';

    return 'draft';
  }

  /**
   * Get accent color for a file type
   * @param {string} mimeType
   * @returns {string} CSS color value
   */
  function getFileColor(mimeType) {
    if (!mimeType) return 'var(--color-default)';

    if (mimeType === 'application/pdf') return 'var(--color-pdf)';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'var(--color-doc)';
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'var(--color-sheet)';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'var(--color-slide)';
    if (mimeType.startsWith('image/')) return 'var(--color-image)';
    if (mimeType.startsWith('video/')) return 'var(--color-video)';
    if (mimeType.startsWith('audio/')) return 'var(--color-audio)';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('gzip')) return 'var(--color-archive)';
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml') || mimeType.includes('code')) return 'var(--color-code)';

    return 'var(--color-default)';
  }

  /**
   * Truncate a file name if too long
   * @param {string} name
   * @param {number} maxLength
   * @returns {string}
   */
  function truncateName(name, maxLength = 30) {
    if (name.length <= maxLength) return name;
    const ext = name.lastIndexOf('.');
    if (ext > 0 && name.length - ext <= 6) {
      const base = name.substring(0, ext);
      const extension = name.substring(ext);
      const maxBase = maxLength - extension.length - 3;
      return base.substring(0, maxBase) + '...' + extension;
    }
    return name.substring(0, maxLength - 3) + '...';
  }

  /**
   * Debounce a function
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Check if the mime type is an image that can be previewed
   * @param {string} mimeType
   * @returns {boolean}
   */
  function isPreviewableImage(mimeType) {
    return mimeType && (
      mimeType === 'image/jpeg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/gif' ||
      mimeType === 'image/webp' ||
      mimeType === 'image/svg+xml'
    );
  }

  return {
    formatFileSize,
    formatDate,
    getFileIcon,
    getFileColor,
    truncateName,
    debounce,
    isPreviewableImage,
  };
})();
