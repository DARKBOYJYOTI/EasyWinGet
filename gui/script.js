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
    minimizedTasks: []
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const DOM = {
    views: {
        search: document.getElementById('search-view'),
        installed: document.getElementById('installed-view'),
        updates: document.getElementById('updates-view')
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
    badge: document.getElementById('update-badge'),
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
function showTaskModal(title, appId) {
    DOM.modal.title.textContent = title;
    DOM.modal.output.innerHTML = '<div class="output-line info">Starting task...</div>';

    // Show backdrop and modal
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.style.display = 'block';
    DOM.modal.container.style.display = 'flex';

    // Lock body scroll
    document.body.classList.add('modal-open');

    // Reset progress
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressBar.style.width = '10%';
    progressText.textContent = 'Initializing...';

    State.currentTask = {
        title,
        appId,
        output: [],
        progress: 10,
        stage: 'init'
    };
}

function updateProgress(stage, percent, text) {
    if (!State.currentTask) return;

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    State.currentTask.progress = percent;
    State.currentTask.stage = stage;

    progressBar.style.width = percent + '%';
    progressText.textContent = text;
}

function addModalOutput(text, type = 'info') {
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = text;
    DOM.modal.output.appendChild(line);
    DOM.modal.output.scrollTop = DOM.modal.output.scrollHeight;

    if (State.currentTask) {
        State.currentTask.output.push({ text, type });

        // Update progress based on output text
        const lower = text.toLowerCase();

        if (lower.includes('package id') || lower.includes('starting')) {
            updateProgress('init', 15, 'Preparing...');
        } else if (lower.includes('running:') || lower.includes('searching')) {
            updateProgress('search', 30, 'Searching packages...');
        } else if (lower.includes('downloading') || lower.includes('download')) {
            updateProgress('download', 50, 'Downloading...');
        } else if (lower.includes('installing') || lower.includes('install')) {
            updateProgress('install', 70, 'Installing...');
        } else if (lower.includes('upgrading') || lower.includes('update')) {
            updateProgress('update', 70, 'Updating...');
        } else if (lower.includes('uninstalling') || lower.includes('removing')) {
            updateProgress('uninstall', 70, 'Uninstalling...');
        } else if (lower.includes('verifying') || lower.includes('configuring')) {
            updateProgress('verify', 85, 'Finalizing...');
        }

        // Complete progress on success/error
        if (type === 'success') {
            updateProgress('complete', 100, 'Completed!');
        } else if (type === 'error') {
            updateProgress('error', 100, 'Failed');
        }
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
    DOM.modal.container.style.display = 'flex';
    updateMinimizedTray();
};

// ==========================================
// API CALLS WITH MODAL
// ==========================================
async function apiCall(endpoint) {
    try {
        log(`API: ${endpoint}`);
        const res = await fetch(endpoint);
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
window.confirmInstall = async function (id, name) {
    const safeName = name.replace(/'/g, "\\'");
    const confirmed = await customConfirm(
        'Install Application',
        `Install "${safeName}"?\n\nThis will download and install the application.`,
        '📥'
    );

    if (confirmed) {
        showToast(`Installing ${safeName}...`, 'info');
        showTaskModal(`Installing ${safeName}`, id);
        addModalOutput(`Package ID: ${id}`, 'info');
        addModalOutput(`Running: winget install ${id}...`, 'info');

        fetch(`/api/install?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    addModalOutput('✓ Installation completed successfully!', 'success');
                    showToast(`${safeName} installed successfully!`, 'success');
                } else {
                    addModalOutput('✗ Installation failed', 'error');
                    addModalOutput(data.message || 'Unknown error', 'error');
                    showToast(`Failed to install ${safeName}`, 'error');
                }
            })
            .catch(err => {
                addModalOutput('✗ Network error', 'error');
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
        showTaskModal(`Downloading ${safeName}`, id);
        addModalOutput(`Package ID: ${id}`, 'info');
        addModalOutput(`Downloading installer...`, 'info');

        fetch(`/api/download?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    addModalOutput('✓ Download completed!', 'success');
                    addModalOutput(`Saved to: Downloads/${id}.exe`, 'info');
                    showToast(`${safeName} downloaded successfully!`, 'success');
                } else {
                    addModalOutput('✗ Download failed', 'error');
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
        showTaskModal(`Uninstalling ${safeName}`, id);
        addModalOutput(`Package ID: ${id}`, 'info');
        addModalOutput(`Running: winget uninstall ${id}...`, 'info');

        fetch(`/api/uninstall?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    addModalOutput('✓ Uninstallation completed!', 'success');
                    showToast(`${safeName} uninstalled successfully!`, 'success');
                    loadInstalled(true);
                } else {
                    addModalOutput('✗ Uninstallation failed', 'error');
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
        showTaskModal(`Updating ${safeName}`, id);
        addModalOutput(`Package ID: ${id}`, 'info');
        addModalOutput(`Running: winget upgrade ${id}...`, 'info');

        fetch(`/api/update?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    addModalOutput('✓ Update completed!', 'success');
                    showToast(`${safeName} updated successfully!`, 'success');
                    loadUpdates(true);
                } else {
                    addModalOutput('✗ Update failed', 'error');
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

    container.innerHTML = validResults.map(app => `
        <div class="app-card">
            <span class="icon">${getIcon(app.name)}</span>
            <h3>${app.name}</h3>
            <div class="app-id">${app.id}</div>
            <div class="version">v${app.version || 'Unknown'}</div>
            <div class="actions">
                <button class="btn btn-primary" onclick="confirmInstall('${app.id}', '${app.name}')">Install</button>
                <button class="btn btn-secondary" onclick="confirmDownload('${app.id}', '${app.name}')">Download</button>
            </div>
        </div>
    `).join('');

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
        if (DOM.badge) DOM.badge.style.display = 'none';
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
                <button class="btn btn-primary" style="width:100%;" onclick="confirmUpdate('${app.id}', '${app.name}')">Update</button>
            </div>
        </div>
    `).join('');

    if (DOM.badge) {
        DOM.badge.textContent = validUpdates.length;
        DOM.badge.style.display = validUpdates.length > 0 ? 'inline-flex' : 'none';
    }

    log(`Rendered ${filtered.length}/${validUpdates.length} updates`);
}

// Rest of code (view switching, data loading, search, initialization) remains the same...
// Continuing from previous script.js...

// ==========================================
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
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadInstalled(refresh = false) {
    showLoading();
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

        if (refresh) showToast('Installed apps refreshed', 'success');
    } catch (error) {
        log('Error loading installed', error);
    } finally {
        hideLoading();
    }
}

async function loadUpdates(refresh = false) {
    showLoading();
    try {
        const updates = await fetchUpdates(refresh);
        State.cache.updates = updates;
        renderUpdates(updates);
        if (refresh) showToast('Updates checked', 'success');
    } catch (error) {
        log('Error loading updates', error);
    } finally {
        hideLoading();
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
            if (DOM.inputs.search) handleSearch(DOM.inputs.search.value);
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

    // Setup modal controls
    if (DOM.modal.close) {
        DOM.modal.close.addEventListener('click', closeModal);
    }
    if (DOM.modal.minimize) {
        DOM.modal.minimize.addEventListener('click', minimizeModal);
    }

    // Start on search view
    switchView('search');

    log('Ready!');
});
