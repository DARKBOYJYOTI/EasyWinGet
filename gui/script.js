/**
 * EasyWinGet Frontend - v3.1 with Task Modal
 * Added: Task modal, minimize/close, search filters
 */

// ==========================================
// STATE
// ==========================================
const State = {
    currentView: 'search',
    cache: { installed: null, updates: null },
    searchTimeout: null,
    currentTask: null,
    minimizedTasks: [],
    // Used for task logging even when task is not "current"
    activeTasks: {}
};

// ==========================================
// UTILITIES
// ==========================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// ==========================================
// DOM ELEMENTS
// ==========================================
const DOM = {
    views: {
        search: document.getElementById('search-view'),
        installed: document.getElementById('installed-view'),
        updates: document.getElementById('updates-view'),
        downloaded: document.getElementById('view-downloaded')
    },
    containers: {
        searchResults: document.getElementById('search-results'),
        searchEmpty: document.getElementById('search-empty'),
        searchLoading: document.getElementById('search-loading'),
        installedList: document.getElementById('installed-list'),
        updatesGrid: document.getElementById('updates-grid')
    },
    inputs: {
        search: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        filterInstalled: document.getElementById('filter-installed'),
        filterUpdates: document.getElementById('filter-updates')
    },
    buttons: {
        refreshInstalled: document.getElementById('refresh-installed'),
        refreshUpdates: document.getElementById('refresh-updates')
    },
    modal: {
        container: document.getElementById('task-modal'),
        title: document.getElementById('modal-title'),
        output: document.getElementById('modal-output'),
        minimize: document.getElementById('minimize-modal'),
        close: document.getElementById('close-modal')
    },
    tray: document.getElementById('minimized-tray'),
    badge: {
        updates: document.getElementById('update-badge'),
        downloaded: document.getElementById('downloaded-badge')
    },
    loading: document.getElementById('loading-overlay'),
    toasts: document.getElementById('toast-container')
};

// ==========================================
// UTILITIES
// ==========================================
function log(msg, data) {
    console.log(`[EasyWinGet] ${msg}`, data || '');
}

function getIcon(name) {
    if (!name) return '📦';
    const n = name.toLowerCase();
    if (n.includes('chrome') || n.includes('edge') || n.includes('firefox') || n.includes('brave')) return '🌐';
    if (n.includes('code') || n.includes('git')) return '💻';
    if (n.includes('discord') || n.includes('slack')) return '💬';
    if (n.includes('spotify') || n.includes('vlc')) return '🎵';
    if (n.includes('steam')) return '🎮';
    if (n.includes('python') || n.includes('node')) return '🐍';
    if (n.includes('office') || n.includes('word')) return '📄';
    return '📦';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${message}</strong>`;
    DOM.toasts.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showLoading() {
    if (DOM.loading) DOM.loading.style.display = 'flex';
}

function hideLoading() {
    if (DOM.loading) DOM.loading.style.display = 'none';
}

// Custom Confirm Dialog
function customConfirm(title, message, icon = '⚠️') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirm-dialog');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const iconEl = overlay.querySelector('.confirm-icon');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        titleEl.textContent = title;
        messageEl.textContent = message;
        iconEl.textContent = icon;
        overlay.style.display = 'flex';

        const handleOk = () => {
            overlay.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            overlay.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// ==========================================
// TASK MODAL FUNCTIONS
// ==========================================
// ==========================================
// TASK MODAL FUNCTIONS
// ==========================================
function updateTaskLog(task, text, type = 'info') {
    if (!task) return;

    // Add to history
    task.output.push({ text, type });

    // Update progress based on text
    // Update progress based on text (only if not already complete/error)
    if (task.stage !== 'complete' && task.stage !== 'error') {
        const lower = text.toLowerCase();
        if (lower.includes('package id') || lower.includes('starting')) {
            task.progress = 15; task.stage = 'init';
        } else if (lower.includes('running:') || lower.includes('searching')) {
            task.progress = 30; task.stage = 'search';
        } else if (lower.includes('downloading') || lower.includes('download')) {
            task.progress = 50; task.stage = 'download';
        } else if (lower.includes('installing') || lower.includes('install')) {
            task.progress = 70; task.stage = 'install';
        } else if (lower.includes('upgrading') || lower.includes('update')) {
            task.progress = 70; task.stage = 'update';
        } else if (lower.includes('uninstalling') || lower.includes('removing')) {
            task.progress = 70; task.stage = 'uninstall';
        } else if (lower.includes('verifying') || lower.includes('configuring')) {
            task.progress = 85; task.stage = 'verify';
        }
    }

    if (type === 'success') {
        task.progress = 100; task.stage = 'complete';
    } else if (type === 'error') {
        task.progress = 100; task.stage = 'error';
    }

    // Update UI only if this is the currently visible task
    if (State.currentTask === task) {
        // Append log
        const line = document.createElement('div');
        line.className = `output-line ${type}`;
        line.textContent = text;
        DOM.modal.output.appendChild(line);
        DOM.modal.output.scrollTop = DOM.modal.output.scrollHeight;

        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        let statusText = text;
        if (task.stage === 'init') statusText = 'Preparing...';
        if (task.stage === 'search') statusText = 'Searching...';
        if (task.stage === 'download') statusText = 'Downloading...';
        if (task.stage === 'install') statusText = 'Installing...';
        if (task.stage === 'update') statusText = 'Updating...';
        if (task.stage === 'uninstall') statusText = 'Uninstalling...';
        if (task.stage === 'complete') statusText = 'Completed!';
        if (task.stage === 'error') statusText = 'Failed';

        progressBar.style.width = task.progress + '%';
        progressText.textContent = statusText;
    }
}

function showTaskModal(title, appId) {
    DOM.modal.title.textContent = title;
    DOM.modal.output.innerHTML = '';

    // Create new task object
    const newTask = {
        id: Date.now(), // unique internal ID
        title,
        appId,
        output: [],
        progress: 0,
        stage: 'init'
    };

    State.currentTask = newTask;

    // UI Setup
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.style.display = 'block';
    DOM.modal.container.style.display = 'flex';
    document.body.classList.add('modal-open');

    // Initial log
    updateTaskLog(newTask, 'Starting task...', 'info');

    return newTask;
}

// Deprecated: helper for old calls, but we should update calls to use updateTaskLog
function addModalOutput(text, type = 'info') {
    if (State.currentTask) {
        updateTaskLog(State.currentTask, text, type);
    }
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.style.display = 'none';
    DOM.modal.container.style.display = 'none';

    // Unlock body scroll
    document.body.classList.remove('modal-open');

    State.currentTask = null;
}

function minimizeModal() {
    if (!State.currentTask) return;

    const backdrop = document.getElementById('modal-backdrop');
    backdrop.style.display = 'none';
    DOM.modal.container.style.display = 'none';

    // Unlock body scroll
    document.body.classList.remove('modal-open');

    State.minimizedTasks.push(State.currentTask);
    updateMinimizedTray();
    State.currentTask = null;
}

function updateMinimizedTray() {
    if (State.minimizedTasks.length === 0) {
        DOM.tray.style.display = 'none';
        return;
    }

    DOM.tray.style.display = 'flex';
    DOM.tray.innerHTML = State.minimizedTasks.map((task, index) => `
        <div class="minimized-task" onclick="restoreTask(${index})">
            <span class="task-icon">📋</span>
            <span class="task-name">${task.title}</span>
        </div>
    `).join('');
}

window.restoreTask = function (index) {
    const task = State.minimizedTasks.splice(index, 1)[0];
    State.currentTask = task;

    // Show backdrop
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.style.display = 'block';

    // Lock scroll
    document.body.classList.add('modal-open');

    DOM.modal.title.textContent = task.title;
    DOM.modal.output.innerHTML = task.output.map(o =>
        `<div class="output-line ${o.type}">${o.text}</div>`
    ).join('');
    DOM.modal.output.scrollTop = DOM.modal.output.scrollHeight;

    // Restore progress UI
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = task.progress + '%';

    if (progressText) {
        let statusText = 'Processing...';
        if (task.stage === 'init') statusText = 'Preparing...';
        if (task.stage === 'search') statusText = 'Searching...';
        if (task.stage === 'download') statusText = 'Downloading...';
        if (task.stage === 'install') statusText = 'Installing...';
        if (task.stage === 'update') statusText = 'Updating...';
        if (task.stage === 'uninstall') statusText = 'Uninstalling...';
        if (task.stage === 'complete') statusText = 'Completed!';
        if (task.stage === 'error') statusText = 'Failed';
        progressText.textContent = statusText;
    }

    DOM.modal.container.style.display = 'flex';
    updateMinimizedTray();
};

// ==========================================
// API CALLS WITH MODAL
// ==========================================
async function apiCall(endpoint) {
    try {
        // Add cache busting
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${endpoint}${separator}_=${Date.now()}`;

        log(`API: ${url}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        log(`Response:`, data);
        return data;
    } catch (error) {
        log(`API Error: ${error.message}`);
        return null;
    }
}

async function fetchInstalled(refresh = false) {
    const endpoint = refresh ? '/api/refresh-installed' : '/api/installed';
    const data = await apiCall(endpoint);
    if (!data) return [];

    let apps = data.apps || data.data?.apps || [];
    if (!Array.isArray(apps)) apps = [apps];

    log(`Fetched ${apps.length} installed apps`);
    return apps;
}

async function fetchUpdates(refresh = false) {
    const endpoint = refresh ? '/api/refresh-updates' : '/api/updates';
    const data = await apiCall(endpoint);
    if (!data) return [];

    let updates = data.updates || data.data?.updates || [];
    if (!Array.isArray(updates)) updates = [updates];

    log(`Fetched ${updates.length} updates`);
    return updates;
}

async function searchApps(query) {
    if (!query || query.length < 2) return [];

    const data = await apiCall(`/api/search?q=${encodeURIComponent(query)}`);
    if (!data) return [];

    let results = data.results || data.data?.results || [];
    if (!Array.isArray(results)) results = [results];

    log(`Search: ${results.length} results for "${query}"`);
    return results;
}

// ==========================================
// TASK FUNCTIONS WITH MODAL
// ==========================================
// ==========================================
// TASK FUNCTIONS WITH MODAL - UPDATED FOR BACKGROUND LOGGING
// ==========================================
window.confirmInstall = async function (id, name) {
    const safeName = name.replace(/'/g, "\\'");
    const confirmed = await customConfirm(
        'Install Application',
        `Install "${safeName}"?\n\nThis will download and install the application.`,
        '📥'
    );

    if (confirmed) {
        showToast(`Installing ${safeName}...`, 'info');
        // Capture the task object!
        const task = showTaskModal(`Installing ${safeName}`, id);
        updateTaskLog(task, `Package ID: ${id}`, 'info');
        updateTaskLog(task, `Running: winget install ${id}...`, 'info');

        fetch(`/api/install?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateTaskLog(task, '✓ Installation completed successfully!', 'success');
                    showToast(`${safeName} installed successfully!`, 'success');
                } else {
                    updateTaskLog(task, '✗ Installation failed', 'error');
                    updateTaskLog(task, data.message || 'Unknown error', 'error');
                    showToast(`Failed to install ${safeName}`, 'error');
                }
            })
            .catch(err => {
                updateTaskLog(task, '✗ Network error', 'error');
                showToast(`Error installing ${safeName}`, 'error');
            });
    }
};

window.confirmDownload = async function (id, name) {
    const safeName = name.replace(/'/g, "\\'");
    const confirmed = await customConfirm(
        'Download Installer',
        `Download "${safeName}"?\n\nThe installer will be saved to the Downloads folder.`,
        '💾'
    );

    if (confirmed) {
        showToast(`Downloading ${safeName}...`, 'info');
        const task = showTaskModal(`Downloading ${safeName}`, id);
        updateTaskLog(task, `Package ID: ${id}`, 'info');
        updateTaskLog(task, `Downloading installer...`, 'info');

        fetch(`/api/download?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateTaskLog(task, '✓ Download completed!', 'success');
                    updateTaskLog(task, `Saved to: Downloads/${id}.exe`, 'info');
                    showToast(`${safeName} downloaded successfully!`, 'success');
                    // Refresh downloads list to update badge
                    loadDownloaded(true);
                } else {
                    updateTaskLog(task, '✗ Download failed', 'error');
                    showToast(`Failed to download ${safeName}`, 'error');
                }
            });
    }
};

window.confirmUninstall = async function (id, name) {
    const safeName = name.replace(/'/g, "\\'");
    const confirmed = await customConfirm(
        'Uninstall Application',
        `Uninstall "${safeName}"?\n\nThis will permanently remove the application.`,
        '🗑️'
    );

    if (confirmed) {
        showToast(`Uninstalling ${safeName}...`, 'info');
        const task = showTaskModal(`Uninstalling ${safeName}`, id);
        updateTaskLog(task, `Package ID: ${id}`, 'info');
        updateTaskLog(task, `Running: winget uninstall ${id}...`, 'info');

        fetch(`/api/uninstall?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateTaskLog(task, '✓ Uninstallation completed!', 'success');
                    showToast(`${safeName} uninstalled successfully!`, 'success');
                    loadInstalled(true);
                } else {
                    updateTaskLog(task, '✗ Uninstallation failed', 'error');
                    showToast(`Failed to uninstall ${safeName}`, 'error');
                }
            });
    }
};

window.confirmUpdate = async function (id, name) {
    const safeName = name.replace(/'/g, "\\'");
    const confirmed = await customConfirm(
        'Update Application',
        `Update "${safeName}"?\n\nThis will upgrade to the latest version.`,
        '⬆️'
    );

    if (confirmed) {
        showToast(`Updating ${safeName}...`, 'info');
        const task = showTaskModal(`Updating ${safeName}`, id);
        updateTaskLog(task, `Package ID: ${id}`, 'info');
        updateTaskLog(task, `Running: winget upgrade ${id}...`, 'info');

        fetch(`/api/update?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateTaskLog(task, '✓ Update completed!', 'success');
                    showToast(`${safeName} updated successfully!`, 'success');
                    loadUpdates(true);
                } else {
                    updateTaskLog(task, '✗ Update failed', 'error');
                    showToast(`Failed to update ${safeName}`, 'error');
                }
            });
    }
};

// ==========================================
// RENDERING & FILTERING
// ==========================================
function renderSearchResults(results) {
    const container = DOM.containers.searchResults;
    const empty = DOM.containers.searchEmpty;

    // Filter out invalid results (null, undefined, or missing required fields)
    const validResults = results && Array.isArray(results)
        ? results.filter(app => app && app.id && app.name)
        : [];

    if (validResults.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    container.style.display = 'grid';

    container.innerHTML = validResults.map(app => {
        let actionButtons = '';
        const isInstalled = State.cache.installed && State.cache.installed.some(i => i.id === app.id);
        const hasUpdate = State.cache.updates && State.cache.updates.some(u => u.id === app.id);

        if (hasUpdate) {
            actionButtons = `
                <button class="btn btn-primary" onclick="confirmUpdate('${app.id}', '${app.name}')">Update</button>
                <button class="btn btn-secondary" onclick="confirmDownload('${app.id}', '${app.name}')">Download</button>
            `;
        } else if (isInstalled) {
            actionButtons = `
                <button class="btn btn-secondary" disabled style="opacity:0.7; cursor:default;">Installed</button>
                <button class="btn btn-secondary" onclick="confirmDownload('${app.id}', '${app.name}')">Download</button>
            `;
        } else {
            actionButtons = `
                <button class="btn btn-primary" onclick="confirmInstall('${app.id}', '${app.name}')">Install</button>
                <button class="btn btn-secondary" onclick="confirmDownload('${app.id}', '${app.name}')">Download</button>
            `;
        }

        return `
        <div class="app-card">
            <span class="icon">${getIcon(app.name)}</span>
            <h3>${app.name}</h3>
            <div class="app-id">${app.id}</div>
            <div class="version">v${app.version || 'Unknown'}</div>
            <div class="actions">
                ${actionButtons}
            </div>
        </div>
    `}).join('');

    log(`Rendered ${validResults.length} search results`);
}

function renderInstalledApps(apps, filter = '') {
    const container = DOM.containers.installedList;

    // Validate apps array
    const validApps = apps && Array.isArray(apps)
        ? apps.filter(app => app && app.id && app.name)
        : [];

    if (validApps.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💻</div><h3>No apps found</h3></div>';
        return;
    }

    const filtered = filter ? validApps.filter(app =>
        (app.name && app.name.toLowerCase().includes(filter.toLowerCase())) ||
        (app.id && app.id.toLowerCase().includes(filter.toLowerCase()))
    ) : validApps;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No matches</h3></div>';
        return;
    }

    container.innerHTML = filtered.map(app => `
        <div class="app-row">
            <span class="icon">${getIcon(app.name)}</span>
            <div class="info">
                <h3>${app.name}</h3>
                <p>${app.id} • v${app.version || '?'}</p>
            </div>
            <button class="btn btn-danger" onclick="confirmUninstall('${app.id}', '${app.name}')">Uninstall</button>
        </div>
    `).join('');

    log(`Rendered ${filtered.length}/${validApps.length} installed apps`);
}

function renderUpdates(updates, filter = '') {
    const container = DOM.containers.updatesGrid;

    // Validate updates array
    const validUpdates = updates && Array.isArray(updates)
        ? updates.filter(app => app && app.id && app.name)
        : [];

    if (validUpdates.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><h3>All up to date!</h3></div>';
        if (DOM.badge && DOM.badge.updates) DOM.badge.updates.style.display = 'none';
        return;
    }

    const filtered = filter ? validUpdates.filter(app =>
        (app.name && app.name.toLowerCase().includes(filter.toLowerCase())) ||
        (app.id && app.id.toLowerCase().includes(filter.toLowerCase()))
    ) : validUpdates;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No matches</h3></div>';
        return;
    }

    container.innerHTML = filtered.map(app => `
        <div class="app-card">
            <span class="icon">${getIcon(app.name)}</span>
            <h3>${app.name}</h3>
            <div class="app-id">${app.id}</div>
            <div class="version">
                v${app.version || 'Unknown'}
                ${app.current ? `<br><small style="color:var(--text-secondary)">Current: ${app.current}</small>` : ''}
            </div>
            <div class="actions">
                <button class="btn btn-primary" style="flex: 2;" onclick="confirmUpdate('${app.id}', '${app.name}')">Update</button>
                <button class="btn btn-secondary" style="flex: 1;" onclick="confirmIgnore('${app.id}', '${app.name}')" title="Ignore this update">Ignore</button>
            </div>
        </div>
    `).join('');

    if (DOM.badge && DOM.badge.updates) {
        DOM.badge.updates.textContent = validUpdates.length;
        DOM.badge.updates.style.display = validUpdates.length > 0 ? 'inline-flex' : 'none';
    }

    log(`Rendered ${filtered.length}/${validUpdates.length} updates`);
}

// ==========================================
// IGNORE UPDATES LOGIC
// ==========================================
window.confirmIgnore = async function (id, name) {
    const safeName = name.replace(/'/g, "\\'");
    if (await customConfirm('Ignore Update', `Hide updates for "${safeName}"?`, '🙈')) {
        try {
            const data = await apiCall(`/api/ignore?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`);
            if (data && data.success) {
                showToast(`Ignored ${safeName}`, 'success');
                loadUpdates(); // Refresh list to remove it
            } else {
                showToast('Failed to ignore app', 'error');
            }
        } catch (e) {
            log('Ignore error', e);
        }
    }
};

window.openIgnoredModal = async function () {
    const modal = document.getElementById('ignored-modal');
    const list = document.getElementById('ignored-list');
    if (!modal || !list) return;

    list.innerHTML = '<div class="spinner"></div>';
    modal.style.display = 'flex';

    try {
        const data = await apiCall('/api/ignored');
        const apps = data.apps || [];

        if (apps.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No ignored apps</p></div>';
        } else {
            list.innerHTML = apps.map(app => `
                <div class="app-row" style="padding: 8px; border-bottom:1px solid var(--border);">
                    <div class="info">
                        <h3>${app.name || app.id}</h3>
                        <p style="font-size:0.8rem; opacity:0.7;">${app.id}</p>
                    </div>
                    <button class="btn btn-secondary" style="font-size:0.8rem;" onclick="unignoreApp('${app.id}')">Unignore</button>
                </div>
            `).join('');
        }
    } catch (e) {
        list.innerHTML = '<p class="error">Failed to load ignored apps</p>';
    }
};

window.unignoreApp = async function (id) {
    try {
        const data = await apiCall(`/api/unignore?id=${encodeURIComponent(id)}`);
        if (data && data.success) {
            showToast('App unignored', 'success');
            openIgnoredModal(); // Refresh modal
            loadUpdates(false, true); // Background refresh updates list
        }
    } catch (e) {
        showToast('Failed to unignore', 'error');
    }
};

window.closeIgnoredModal = function () {
    const modal = document.getElementById('ignored-modal');
    if (modal) modal.style.display = 'none';
};

function renderDownloaded(files) {
    const container = document.getElementById('downloaded-list');
    const empty = document.getElementById('downloaded-empty');
    if (!container) return;

    if (!files || (Array.isArray(files) && files.length === 0)) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    // Double check valid array for safety
    if (!Array.isArray(files)) files = [files];

    // FILTER OUT NULLS/UNDEFINED
    const validFiles = files.filter(f => f && f.Name);

    if (empty) empty.style.display = validFiles.length === 0 ? 'block' : 'none';

    container.innerHTML = validFiles.map(file => {
        const size = (file.Length / 1024 / 1024).toFixed(2) + ' MB';
        // Simple date formatting
        const date = new Date(parseInt(file.LastWriteTime.replace(/\/Date\((\d+)\)\//, '$1')));
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        return `
        <div class="app-row">
            <span class="icon">📦</span>
            <div class="info">
                <h3>${file.Name}</h3>
                <p>${size} • ${dateStr}</p>
            </div>
            <div class="actions">
                <button class="btn btn-primary" onclick="confirmRunDownloaded('${file.Name}')">Run</button>
                <button class="btn btn-danger" onclick="confirmDeleteDownloaded('${file.Name}')">Delete</button>
            </div>
        </div>
    `}).join('');

    log(`Rendered ${validFiles.length} downloaded files`);

    // Update Badge
    if (DOM.badge && DOM.badge.downloaded) {
        DOM.badge.downloaded.textContent = validFiles.length;
        DOM.badge.downloaded.style.display = validFiles.length > 0 ? 'inline-flex' : 'none';
        // Add danger color if files exist
        DOM.badge.downloaded.style.backgroundColor = validFiles.length > 0 ? 'var(--primary)' : 'var(--danger)';
    }

    if (files.length > 0) {
        log('First file object:', files[0]);
    }
}

async function fetchDownloaded() {
    const data = await apiCall('/api/downloaded');
    log('Raw downloaded API data:', data);
    if (!data) return [];

    let files = data.files || [];
    if (!Array.isArray(files)) {
        // If single object, wrap in array
        files = [files];
    }
    return files;
}

async function loadDownloaded(background = false) {
    const loading = document.getElementById('downloaded-loading');
    const refreshBtn = document.getElementById('refresh-downloaded');
    const container = document.getElementById('downloaded-list');
    const empty = document.getElementById('downloaded-empty');

    // Only show loading UI if not background refresh
    if (!background && loading) {
        loading.style.display = 'flex'; // Use flex to center
        if (container) container.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    // Add spin animation (show even in background for feedback if visible)
    if (refreshBtn) {
        const icon = refreshBtn.querySelector('.icon-svg');
        if (icon) icon.classList.add('spinning');
    }

    try {
        const p1 = fetchDownloaded();
        const p2 = new Promise(r => setTimeout(r, 800)); // Minimum 800ms spin
        const [files] = await Promise.all([p1, p2]);

        renderDownloaded(files);
        if (container) container.style.display = 'flex'; // Restore list display
    } catch (e) {
        log('Error loading downloaded files', e);
        if (!background) showToast('Failed to load downloads', 'error');
        if (container) {
            container.innerHTML = '<div class="error-state"><p>Failed to load downloads</p></div>';
            container.style.display = 'block';
        }
    } finally {
        if (loading) loading.style.display = 'none';

        // Remove spin animation
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('.icon-svg');
            if (icon) icon.classList.remove('spinning');
        }
    }
}

// Global actions for downloaded files
window.confirmRunDownloaded = async function (fileName) {
    const confirmed = await customConfirm(
        'Run Installer',
        `Run "${fileName}"?\n\nMake sure you trust this installer.`,
        '🚀'
    );

    if (confirmed) {
        showToast(`Launching ${fileName}...`, 'info');
        // We can use a simple task log or just toast
        // For consistency, let's use toast as this is usually quick fire-and-forget

        fetch(`/api/downloaded/run?file=${encodeURIComponent(fileName)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('Installer launched!', 'success');
                } else {
                    showToast(`Failed to launch: ${data.message}`, 'error');
                }
            })
            .catch(() => showToast('Network error', 'error'));
    }
};

window.confirmDeleteDownloaded = async function (fileName) {
    const confirmed = await customConfirm(
        'Delete File',
        `Permanently delete "${fileName}"?`,
        '🗑️'
    );

    if (confirmed) {
        showToast(`Deleting ${fileName}...`, 'info');
        fetch(`/api/downloaded/delete?file=${encodeURIComponent(fileName)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('File deleted', 'success');
                    loadDownloaded(); // Refresh list
                } else {
                    showToast(`Delete failed: ${data.message}`, 'error');
                }
            })
            .catch(() => showToast('Network error', 'error'));
    }
};
// VIEW SWITCHING
// ==========================================
function switchView(viewName) {
    log(`Switching to: ${viewName}`);
    State.currentView = viewName;

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    Object.keys(DOM.views).forEach(key => {
        if (DOM.views[key]) {
            DOM.views[key].style.display = key === viewName ? 'block' : 'none';
        }
    });

    if (viewName === 'installed' && !State.cache.installed) {
        loadInstalled();
    }
    if (viewName === 'updates' && !State.cache.updates) {
        loadUpdates();
    }
    if (viewName === 'downloaded') {
        loadDownloaded();
    }
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadInstalled(refresh = false, background = false) {
    if (!background) showLoading();
    try {
        const apps = await fetchInstalled(refresh);

        // Sort by name (A-Z) by default or respect dropdown
        const sortSelect = document.getElementById('sort-installed');
        const sortValue = sortSelect ? sortSelect.value : 'name';

        if (sortValue === 'name') {
            apps.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortValue === 'name-desc') {
            apps.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        }

        State.cache.installed = apps;

        // Render with current filter if any
        const filter = DOM.inputs.filterInstalled ? DOM.inputs.filterInstalled.value : '';
        renderInstalledApps(apps, filter);

        if (refresh && !background) showToast('Installed apps refreshed', 'success');
    } catch (error) {
        log('Error loading installed', error);
    } finally {
        if (!background) hideLoading();
    }
}

async function loadUpdates(refresh = false, background = false) {
    if (!background) showLoading();
    try {
        const updates = await fetchUpdates(refresh);
        State.cache.updates = updates;
        renderUpdates(updates);
        if (refresh && !background) showToast('Updates checked', 'success');
    } catch (error) {
        log('Error loading updates', error);
    } finally {
        if (!background) hideLoading();
    }
}

async function handleSearch(query) {
    const trimmed = query.trim();
    const results = DOM.containers.searchResults;
    const empty = DOM.containers.searchEmpty;
    const loading = DOM.containers.searchLoading;

    results.style.display = 'none';
    empty.style.display = 'none';
    loading.style.display = 'none';
    results.innerHTML = '';

    if (trimmed.length < 2) {
        empty.innerHTML = '<div class="empty-icon">✍️</div><h3>Start typing</h3><p>Enter at least 2 characters</p>';
        empty.style.display = 'block';
        return;
    }

    loading.style.display = 'block';

    try {
        const searchResults = await searchApps(trimmed);
        loading.style.display = 'none';
        renderSearchResults(searchResults);
    } catch (error) {
        log('Search error', error);
        loading.style.display = 'none';
        empty.style.display = 'block';
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    log('=== EasyWinGet v3.1 Initialized ===');

    // Load version from version.json
    // Load version from version.json
    fetch('/version.json')
        .then(res => res.json())
        .then(data => {
            const versionEl = document.getElementById('app-version');
            const descEl = document.getElementById('app-description');

            if (versionEl && data.version) {
                versionEl.textContent = `v${data.version}`;
            }
            if (descEl && data.description) {
                descEl.textContent = data.description;
            }
        })
        .catch(() => {
            log('Could not load version.json');
        });

    // Setup navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Setup search
    // Setup search
    if (DOM.inputs.search) {
        DOM.inputs.search.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch(e.target.value);
        });

        // Hide welcome when typing
        DOM.inputs.search.addEventListener('input', (e) => {
            const welcome = document.getElementById('search-welcome');
            const clearBtn = document.getElementById('clear-search');
            if (welcome) {
                welcome.style.display = e.target.value.length > 0 ? 'none' : 'block';
            }
            if (clearBtn) {
                clearBtn.style.display = e.target.value.length > 0 ? 'flex' : 'none';
            }
        });
    }

    if (DOM.inputs.searchBtn) {
        DOM.inputs.searchBtn.addEventListener('click', () => {
            if (DOM.inputs.search) {
                handleSearch(DOM.inputs.search.value);
            }
        });
    }

    // Clear search button
    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (DOM.inputs.search) {
                DOM.inputs.search.value = '';
                DOM.inputs.search.focus();
                clearSearch.style.display = 'none';
                const welcome = document.getElementById('search-welcome');
                if (welcome) welcome.style.display = 'block';
                // Clear results
                DOM.containers.searchResults.innerHTML = '';
                DOM.containers.searchResults.style.display = 'none';
                DOM.containers.searchEmpty.style.display = 'none';
            }
        });
    }

    // Setup sort dropdown for installed apps
    const sortInstalled = document.getElementById('sort-installed');
    if (sortInstalled) {
        sortInstalled.addEventListener('change', (e) => {
            if (!State.cache.installed) return;

            const sorted = [...State.cache.installed];
            const filter = DOM.inputs.filterInstalled?.value || '';

            switch (e.target.value) {
                case 'name':
                    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    break;
                case 'name-desc':
                    sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                    break;
            }

            State.cache.installed = sorted;
            renderInstalledApps(sorted, filter);
        });
    }

    // Setup filter inputs
    if (DOM.inputs.filterInstalled) {
        DOM.inputs.filterInstalled.addEventListener('input', (e) => {
            const clearBtn = document.getElementById('clear-filter-installed');
            if (clearBtn) {
                clearBtn.style.display = e.target.value.length > 0 ? 'flex' : 'none';
            }
            if (State.cache.installed) {
                renderInstalledApps(State.cache.installed, e.target.value);
            }
        });
    }

    // Clear filter installed button
    const clearFilterInstalled = document.getElementById('clear-filter-installed');
    if (clearFilterInstalled) {
        clearFilterInstalled.addEventListener('click', () => {
            if (DOM.inputs.filterInstalled) {
                DOM.inputs.filterInstalled.value = '';
                DOM.inputs.filterInstalled.focus();
                clearFilterInstalled.style.display = 'none';
                if (State.cache.installed) {
                    renderInstalledApps(State.cache.installed, '');
                }
            }
        });
    }

    if (DOM.inputs.filterUpdates) {
        DOM.inputs.filterUpdates.addEventListener('input', (e) => {
            const clearBtn = document.getElementById('clear-filter-updates');
            if (clearBtn) {
                clearBtn.style.display = e.target.value.length > 0 ? 'flex' : 'none';
            }
            if (State.cache.updates) {
                renderUpdates(State.cache.updates, e.target.value);
            }
        });
    }

    // Clear filter updates button
    const clearFilterUpdates = document.getElementById('clear-filter-updates');
    if (clearFilterUpdates) {
        clearFilterUpdates.addEventListener('click', () => {
            if (DOM.inputs.filterUpdates) {
                DOM.inputs.filterUpdates.value = '';
                DOM.inputs.filterUpdates.focus();
                clearFilterUpdates.style.display = 'none';
                if (State.cache.updates) {
                    renderUpdates(State.cache.updates, '');
                }
            }
        });
    }

    // Setup refresh buttons
    if (DOM.buttons.refreshInstalled) {
        DOM.buttons.refreshInstalled.addEventListener('click', () => loadInstalled(true));
    }
    if (DOM.buttons.refreshUpdates) {
        DOM.buttons.refreshUpdates.addEventListener('click', () => loadUpdates(true));
    }

    // Ignored Modal Events
    const viewIgnoredBtn = document.getElementById('view-ignored-btn');
    if (viewIgnoredBtn) {
        viewIgnoredBtn.addEventListener('click', openIgnoredModal);
    }
    const closeIgnoredBtn = document.getElementById('close-ignored-modal');
    if (closeIgnoredBtn) {
        closeIgnoredBtn.addEventListener('click', closeIgnoredModal);
    }

    const refreshDownloaded = document.getElementById('refresh-downloaded');
    if (refreshDownloaded) {
        refreshDownloaded.addEventListener('click', () => {
            showToast('Refreshed downloads', 'info');
            loadDownloaded(true);
        });
    }

    // Setup modal controls
    if (DOM.modal.close) {
        DOM.modal.close.addEventListener('click', closeModal);
    }
    if (DOM.modal.minimize) {
        DOM.modal.minimize.addEventListener('click', minimizeModal);
    }

    // Start on search view
    switchView('search');

    // Background pre-loading
    log('Starting background data fetch...');
    loadInstalled(false, true);
    loadUpdates(false, true);
    loadDownloaded();

    log('Ready!');
});
