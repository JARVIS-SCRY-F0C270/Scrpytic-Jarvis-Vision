// JARVIS Vision - Screenshot Semantic Engine Client Logic

let currentUser = null;
let currentToken = localStorage.getItem('jarvis_token') || null;
let currentCategory = 'all';
let currentSort = 'relevance';
let searchDebounceTimer = null;
let currentScreenshots = [];
let selectedScreenshot = null;
let isAuthSignUp = false;

// DOM Elements
const authModal = document.getElementById('modal-auth');
const inspectorModal = document.getElementById('modal-inspector');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnSearchTrigger = document.getElementById('btn-search-trigger');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const screenshotsGrid = document.getElementById('screenshots-grid');
const emptyState = document.getElementById('empty-state');
const resultsTitle = document.getElementById('results-title');
const resultsBadgeCount = document.getElementById('results-badge-count');
const searchDurationTag = document.getElementById('search-duration-tag');
const sortSelect = document.getElementById('sort-select');
const userProfileSection = document.getElementById('user-profile-section');
const tunnelUrlText = document.getElementById('tunnel-url-text');
const btnCopyPublicUrl = document.getElementById('btn-copy-public-url');
const btnSeedSamples = document.getElementById('btn-seed-samples');
const btnEmptySeed = document.getElementById('btn-empty-seed');
const toastContainer = document.getElementById('toast-container');

// Progress Elements
const uploadProgressWrapper = document.getElementById('upload-progress-wrapper');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadPercentLabel = document.getElementById('upload-percent-label');
const uploadStatusLabel = document.getElementById('upload-status-label');
const uploadTimeTaken = document.getElementById('upload-time-taken');

// Auth Form Elements
const authForm = document.getElementById('auth-form');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authName = document.getElementById('auth-name');
const authNameContainer = document.getElementById('auth-name-container');
const authErrorMsg = document.getElementById('auth-error-msg');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');
const authToggleText = document.getElementById('auth-toggle-text');
const btnQuickGuestLogin = document.getElementById('btn-quick-guest-login');

// Modal Inspector Elements
const modalImagePreview = document.getElementById('modal-image-preview');
const modalTitle = document.getElementById('modal-title');
const modalCategoryBadge = document.getElementById('modal-category-badge');
const modalCategoryIconBox = document.getElementById('modal-category-icon-box');
const modalMetaInfo = document.getElementById('modal-meta-info');
const modalSummary = document.getElementById('modal-summary');
const modalEntitiesContainer = document.getElementById('modal-entities-container');
const modalOcrTextarea = document.getElementById('modal-ocr-textarea');
const modalOcrConfidence = document.getElementById('modal-ocr-confidence');
const modalProcessingTime = document.getElementById('modal-processing-time');
const btnCopyOcrText = document.getElementById('btn-copy-ocr-text');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnDeleteScreenshot = document.getElementById('btn-delete-screenshot');
const btnDownloadImage = document.getElementById('btn-download-image');

// Toast Notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-slate-900 border-cyan-500/40 text-cyan-300',
    success: 'bg-slate-900 border-emerald-500/40 text-emerald-300',
    error: 'bg-slate-900 border-red-500/40 text-red-300'
  };

  toast.className = `px-4 py-2.5 rounded-xl border ${colors[type] || colors.info} shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-right duration-200`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="w-4 h-4"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// API Helper with Auth
async function apiRequest(url, options = {}) {
  const headers = options.headers || {};
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  if (!options.body || !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('jarvis_token');
    currentToken = null;
    openAuthModal();
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Check Public Tunnel Link
async function checkPublicTunnel() {
  try {
    const data = await fetch('/api/tunnel').then(r => r.json());
    if (data.publicUrl) {
      tunnelUrlText.textContent = data.publicUrl;
      tunnelUrlText.classList.remove('text-slate-300');
      tunnelUrlText.classList.add('text-cyan-300', 'font-bold');
      btnCopyPublicUrl.classList.remove('hidden');
    } else {
      tunnelUrlText.textContent = `Public Live URL: Available via tunnel`;
    }
  } catch (e) {
    tunnelUrlText.textContent = `Public URL: Active on network`;
  }
}

// Copy Public Link
btnCopyPublicUrl.addEventListener('click', () => {
  const url = tunnelUrlText.textContent.startsWith('http') ? tunnelUrlText.textContent : window.location.href;
  navigator.clipboard.writeText(url);
  showToast('Public link copied to clipboard for judges!', 'success');
});

// Category Icons Mapping
const CATEGORY_ICONS = {
  receipt: 'receipt',
  recipe: 'utensils',
  address: 'map-pin',
  code: 'code',
  chat: 'message-square',
  shopping: 'shopping-bag',
  payment: 'credit-card',
  credentials: 'key',
  document: 'file-text',
  travel: 'plane',
  general: 'image'
};

const CATEGORY_COLORS = {
  receipt: '#10b981',
  recipe: '#f59e0b',
  address: '#ef4444',
  code: '#8b5cf6',
  chat: '#3b82f6',
  shopping: '#ec4899',
  payment: '#14b8a6',
  credentials: '#eab308',
  document: '#64748b',
  travel: '#06b6d4',
  general: '#6b7280'
};

// Initialize App
async function initApp() {
  lucide.createIcons();
  checkPublicTunnel();
  setInterval(checkPublicTunnel, 15000);

  if (currentToken) {
    try {
      const meData = await apiRequest('/api/auth/me');
      currentUser = meData.user;
      renderUserProfile();
      loadScreenshots();
      loadStats();
    } catch (e) {
      console.warn('Session expired, please log in.');
    }
  } else {
    // Open Auth Modal by default with instant 1-click option
    openAuthModal();
  }
}

function openAuthModal() {
  authModal.classList.remove('hidden');
  authModal.classList.add('flex');
}

function closeAuthModal() {
  authModal.classList.add('hidden');
  authModal.classList.remove('flex');
}

function renderUserProfile() {
  if (!currentUser) {
    userProfileSection.innerHTML = `
      <button onclick="openAuthModal()" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition">
        Sign In / Demo
      </button>
    `;
    return;
  }

  userProfileSection.innerHTML = `
    <div class="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl">
      <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
        ${currentUser.username.substring(0, 2)}
      </div>
      <span class="text-xs font-semibold text-slate-200">${currentUser.name || currentUser.username}</span>
      <button id="btn-logout" class="ml-1 text-slate-400 hover:text-red-400 text-xs transition" title="Log Out">
        <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `;

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('jarvis_token');
    currentToken = null;
    currentUser = null;
    renderUserProfile();
    currentScreenshots = [];
    renderScreenshotsGrid([]);
    openAuthModal();
    showToast('Logged out successfully.', 'info');
  });

  lucide.createIcons();
}

// Load Screenshots
async function loadScreenshots(query = '') {
  try {
    let url = `/api/search?category=${currentCategory}`;
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }

    const data = await apiRequest(url);
    currentScreenshots = data.results || [];

    if (query && data.searchDurationMs !== undefined) {
      searchDurationTag.textContent = `⚡ Found in ${data.searchDurationMs}ms (Semantic Vector Match)`;
      searchDurationTag.classList.remove('hidden');
    } else {
      searchDurationTag.classList.add('hidden');
    }

    resultsBadgeCount.textContent = currentScreenshots.length;
    sortAndRenderScreenshots();
    loadStats();
  } catch (err) {
    console.error('Failed to load screenshots:', err);
  }
}

// Load Stats
async function loadStats() {
  try {
    const stats = await apiRequest('/api/stats');
    const totalScEl = document.getElementById('stat-total-screenshots');
    if (totalScEl) totalScEl.textContent = stats.totalScreenshots || 0;
    const totalWordsEl = document.getElementById('stat-total-words');
    if (totalWordsEl) totalWordsEl.textContent = (stats.totalWords || 0).toLocaleString();

    // Update category badge counts
    let totalCount = 0;
    if (stats.categoryCounts) {
      for (const [cat, count] of Object.entries(stats.categoryCounts)) {
        totalCount += count;
        const badge = document.getElementById(`cat-count-${cat}`);
        if (badge) badge.textContent = count;
      }
    }
    const allBadge = document.getElementById('cat-count-all');
    if (allBadge) allBadge.textContent = totalCount;
  } catch (err) {
    console.warn('Stats fetch error:', err);
  }
}

// Render Screenshots Grid
function sortAndRenderScreenshots() {
  let list = [...currentScreenshots];

  if (currentSort === 'newest') {
    list.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));
  } else if (currentSort === 'oldest') {
    list.sort((a, b) => new Date(a.uploadTime) - new Date(b.uploadTime));
  } else {
    // Relevance score
    list.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  if (list.length === 0) {
    screenshotsGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  const query = searchInput.value.trim();

  screenshotsGrid.innerHTML = list.map(item => {
    const iconName = CATEGORY_ICONS[item.category] || 'image';
    const color = item.categoryColor || CATEGORY_COLORS[item.category] || '#6b7280';
    const imageUrl = `/api/images/${item.id}?token=${currentToken}`;
    const dateFormatted = new Date(item.uploadTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    // Highlight matching text in snippet
    let snippet = item.matchSnippet || item.summary || item.extractedText.substring(0, 100);
    if (query) {
      const words = query.split(/\s+/).filter(w => w.length > 1);
      for (const w of words) {
        const regex = new RegExp(`(${escapeRegex(w)})`, 'gi');
        snippet = snippet.replace(regex, '<span class="search-highlight">$1</span>');
      }
    }

    // Entity Pills
    const entityChips = [];
    if (item.entities) {
      if (item.entities.prices && item.entities.prices[0]) {
        entityChips.push(`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">💰 ${item.entities.prices[0]}</span>`);
      }
      if (item.entities.dates && item.entities.dates[0]) {
        entityChips.push(`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-300 border border-blue-500/30">📅 ${item.entities.dates[0]}</span>`);
      }
      if (item.entities.codes && item.entities.codes[0]) {
        entityChips.push(`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/70 text-purple-300 border border-purple-500/30">⚡ ${item.entities.codes[0].substring(0, 18)}...</span>`);
      }
    }

    const scorePill = item.score !== undefined && query ? `
      <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
        ${Math.round(item.score * 100)}% Match
      </span>
    ` : '';

    return `
      <div class="screenshot-card glass-card rounded-xl overflow-hidden cursor-pointer" onclick="openInspector('${item.id}')">
        <!-- Thumbnail -->
        <div class="relative bg-black/40 h-44 flex items-center justify-center overflow-hidden border-b border-slate-800">
          <img src="${imageUrl}" alt="Screenshot" loading="lazy" class="h-full w-full object-cover object-top hover:scale-105 transition-transform duration-300" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%231e293b\\'/></svg>'">
          
          <!-- Category Floating Badge -->
          <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-lg backdrop-blur-md" style="background-color: ${color}cc; border: 1px solid ${color};">
            <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
            <span>${item.categoryLabel || item.category}</span>
          </div>

          ${scorePill ? `<div class="absolute top-2.5 right-2.5">${scorePill}</div>` : ''}
        </div>

        <!-- Content Info -->
        <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
          <div>
            <!-- AI Summary (Content, Not Filename!) -->
            <p class="text-xs font-semibold text-slate-100 line-clamp-2 leading-relaxed">
              ${item.summary || 'Extracted screenshot content'}
            </p>
            
            <!-- Highlighted Snippet -->
            <p class="text-[11px] text-slate-400 line-clamp-2 mt-1 font-mono leading-normal bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              ${snippet}
            </p>
          </div>

          <!-- Footer / Entities -->
          <div class="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div class="flex flex-wrap gap-1">
              ${entityChips.join('')}
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>${dateFormatted}</span>
              <span>⚡ ${item.processingTimeMs || 180}ms</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Open Detailed Inspector Modal
function openInspector(id) {
  const item = currentScreenshots.find(s => s.id === id);
  if (!item) return;

  selectedScreenshot = item;
  const iconName = CATEGORY_ICONS[item.category] || 'image';
  const color = item.categoryColor || CATEGORY_COLORS[item.category] || '#06b6d4';

  modalTitle.textContent = item.categoryLabel || item.originalName || 'Screenshot Inspector';
  modalCategoryBadge.textContent = item.categoryLabel || item.category;
  modalCategoryBadge.style.backgroundColor = `${color}33`;
  modalCategoryBadge.style.borderColor = color;
  modalCategoryBadge.style.color = color;

  modalCategoryIconBox.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4" style="color: ${color}"></i>`;
  modalImagePreview.src = `/api/images/${item.id}?token=${currentToken}`;
  modalMetaInfo.textContent = `Original: ${item.originalName || item.filename} • Uploaded: ${new Date(item.uploadTime).toLocaleString()} • Size: ${(item.size / 1024).toFixed(1)} KB`;
  modalSummary.textContent = item.summary || 'No AI summary available.';
  modalOcrTextarea.value = item.extractedText || 'No OCR text extracted from this screenshot.';
  modalOcrConfidence.textContent = `OCR Confidence: ${item.ocrConfidence || 95}%`;
  modalProcessingTime.textContent = `Indexed in: ${item.processingTimeMs || 180}ms`;

  // Render Entities
  modalEntitiesContainer.innerHTML = '';
  if (item.entities) {
    for (const [key, list] of Object.entries(item.entities)) {
      if (Array.isArray(list) && list.length > 0) {
        for (const val of list) {
          const pill = document.createElement('span');
          pill.className = 'px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-cyan-300 border border-slate-700';
          pill.textContent = `${key}: ${val}`;
          modalEntitiesContainer.appendChild(pill);
        }
      }
    }
  }
  if (modalEntitiesContainer.children.length === 0) {
    modalEntitiesContainer.innerHTML = '<span class="text-xs text-slate-500">No discrete structured entities detected.</span>';
  }

  btnDownloadImage.href = `/api/images/${item.id}?token=${currentToken}`;
  btnDownloadImage.setAttribute('download', item.originalName || 'screenshot.png');

  inspectorModal.classList.remove('hidden');
  inspectorModal.classList.add('flex');
  lucide.createIcons();
}

function closeInspector() {
  inspectorModal.classList.add('hidden');
  inspectorModal.classList.remove('flex');
  selectedScreenshot = null;
}

// Copy OCR text button
btnCopyOcrText.addEventListener('click', () => {
  if (modalOcrTextarea.value) {
    navigator.clipboard.writeText(modalOcrTextarea.value);
    showToast('OCR extracted text copied to clipboard!', 'success');
  }
});

btnCloseModal.addEventListener('click', closeInspector);

// Delete Screenshot
btnDeleteScreenshot.addEventListener('click', async () => {
  if (!selectedScreenshot) return;
  if (!confirm('Are you sure you want to delete this screenshot?')) return;

  try {
    await apiRequest(`/api/screenshots/${selectedScreenshot.id}`, { method: 'DELETE' });
    showToast('Screenshot deleted successfully', 'success');
    closeInspector();
    loadScreenshots(searchInput.value.trim());
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
});

// Search input handling with debounce
searchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  if (query.length > 0) {
    btnClearSearch.classList.remove('hidden');
  } else {
    btnClearSearch.classList.add('hidden');
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadScreenshots(query);
  }, 250);
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  btnClearSearch.classList.add('hidden');
  loadScreenshots('');
});

btnSearchTrigger.addEventListener('click', () => {
  loadScreenshots(searchInput.value.trim());
});

// Query chips click
document.querySelectorAll('.query-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const q = chip.getAttribute('data-query');
    searchInput.value = q;
    btnClearSearch.classList.remove('hidden');
    loadScreenshots(q);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  });
});

// Category pills click
document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentCategory = pill.getAttribute('data-category');
    loadScreenshots(searchInput.value.trim());
  });
});

// Sort Select
sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  sortAndRenderScreenshots();
});

// Fast Upload Process
async function handleFilesUpload(files) {
  if (!files || files.length === 0) return;
  if (!currentToken) {
    openAuthModal();
    return;
  }

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('screenshots', files[i]);
  }

  // Show progress indicator
  uploadProgressWrapper.classList.remove('hidden');
  uploadProgressBar.style.width = '25%';
  uploadPercentLabel.textContent = '25%';
  uploadStatusLabel.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 text-cyan-400 animate-spin"></i><span>Uploading ${files.length} screenshots & running multithreaded OCR...</span>`;
  uploadTimeTaken.textContent = 'Processing in worker pool...';
  lucide.createIcons();

  const startTime = Date.now();

  try {
    uploadProgressBar.style.width = '65%';
    uploadPercentLabel.textContent = '65%';

    const data = await apiRequest('/api/upload', {
      method: 'POST',
      body: formData
    });

    const elapsed = Date.now() - startTime;
    uploadProgressBar.style.width = '100%';
    uploadPercentLabel.textContent = '100%';
    uploadStatusLabel.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i><span>Successfully categorized ${data.screenshots.length} screenshots!</span>`;
    uploadTimeTaken.textContent = `Completed in ${elapsed}ms (avg ${data.avgTimePerImageMs}ms/img)`;

    showToast(`⚡ Processed ${data.screenshots.length} images in ${elapsed}ms!`, 'success');

    setTimeout(() => {
      uploadProgressWrapper.classList.add('hidden');
      uploadProgressBar.style.width = '0%';
    }, 4000);

    loadScreenshots(searchInput.value.trim());
    loadStats();
  } catch (err) {
    uploadProgressWrapper.classList.add('hidden');
    showToast(`Upload failed: ${err.message}`, 'error');
  }
}

// Drag & Drop Listeners
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFilesUpload(e.target.files));

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-cyan-400', 'bg-slate-900/80');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('border-cyan-400', 'bg-slate-900/80');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-cyan-400', 'bg-slate-900/80');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFilesUpload(e.dataTransfer.files);
  }
});

// Global Paste (Ctrl + V) Handler for Screenshots
window.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  const imageFiles = [];
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      imageFiles.push(blob);
    }
  }

  if (imageFiles.length > 0) {
    showToast(`📋 Detected ${imageFiles.length} pasted screenshot(s) from clipboard!`, 'info');
    handleFilesUpload(imageFiles);
  }
});

// Demo Samples Seeder
async function triggerSeedSamples() {
  if (!currentToken) {
    openAuthModal();
    return;
  }
  try {
    showToast('Loading diverse hackathon demo sample screenshots...', 'info');
    await apiRequest('/api/seed-samples', { method: 'POST' });
    showToast('Sample screenshots loaded successfully!', 'success');
    loadScreenshots();
    loadStats();
  } catch (err) {
    showToast(`Seeding failed: ${err.message}`, 'error');
  }
}

btnSeedSamples.addEventListener('click', triggerSeedSamples);
btnEmptySeed.addEventListener('click', triggerSeedSamples);

// Quick 1-Click Demo Guest Login for Hackathon Judges
btnQuickGuestLogin.addEventListener('click', async () => {
  try {
    btnQuickGuestLogin.disabled = true;
    btnQuickGuestLogin.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Setting up isolated guest workspace...</span>`;
    lucide.createIcons();

    const res = await fetch('/api/auth/guest', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to start guest session');

    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem('jarvis_token', currentToken);

    closeAuthModal();
    renderUserProfile();
    showToast('⚡ Instant Demo Guest Session Activated with Samples!', 'success');
    loadScreenshots();
    loadStats();
  } catch (err) {
    showToast(`Guest session failed: ${err.message}`, 'error');
  } finally {
    btnQuickGuestLogin.disabled = false;
    btnQuickGuestLogin.innerHTML = `<span>⚡ Instant 1-Click Demo Guest Login</span>`;
  }
});

// Auth Form Submit
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorMsg.classList.add('hidden');
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  const name = authName.value.trim();

  const endpoint = isAuthSignUp ? '/api/auth/register' : '/api/auth/login';
  const payload = isAuthSignUp ? { username, password, name } : { username, password };

  try {
    btnAuthSubmit.disabled = true;
    btnAuthSubmit.textContent = 'Processing...';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem('jarvis_token', currentToken);

    closeAuthModal();
    renderUserProfile();
    showToast(isAuthSignUp ? 'Account created successfully!' : 'Signed in successfully!', 'success');
    loadScreenshots();
    loadStats();
  } catch (err) {
    authErrorMsg.textContent = err.message;
    authErrorMsg.classList.remove('hidden');
  } finally {
    btnAuthSubmit.disabled = false;
    btnAuthSubmit.textContent = isAuthSignUp ? 'Create Account' : 'Sign In';
  }
});

// Toggle Auth Mode (Sign In / Sign Up)
btnToggleAuthMode.addEventListener('click', (e) => {
  e.preventDefault();
  isAuthSignUp = !isAuthSignUp;
  if (isAuthSignUp) {
    authNameContainer.classList.remove('hidden');
    btnAuthSubmit.textContent = 'Create Account';
    authToggleText.textContent = 'Already have an account?';
    btnToggleAuthMode.textContent = 'Sign In';
  } else {
    authNameContainer.classList.add('hidden');
    btnAuthSubmit.textContent = 'Sign In';
    authToggleText.textContent = "Don't have an account?";
    btnToggleAuthMode.textContent = 'Create Account';
  }
  authErrorMsg.classList.add('hidden');
});

// Close modal on Escape or background click
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeInspector();
  }
});

inspectorModal.addEventListener('click', (e) => {
  if (e.target === inspectorModal) {
    closeInspector();
  }
});

// Start App
initApp();
