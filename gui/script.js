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

// ==========================================
// ICON LOGIC
// ==========================================
const DOMAIN_MAP = {
    'Microsoft': 'microsoft.com',
    'Google': 'google.com',
    'Mozilla': 'mozilla.org',
    'Discord': 'discord.com',
    'Spotify': 'spotify.com',
    'Valve': 'steampowered.com',
    'EpicGames': 'epicgames.com',
    'Notion': 'notion.so',
    'Slack': 'slack.com',
    'Oracle': 'oracle.com',
    'Adobe': 'adobe.com',
    'VideoLAN': 'videolan.org',
    'Canonical': 'ubuntu.com',
    '7zip': '7-zip.org',
    'GIMP': 'gimp.org',
    'Blender': 'blender.org',
    'OBSProject': 'obsproject.com',
    'Telegram': 'telegram.org',
    'WhatsApp': 'whatsapp.com',
    'Zoom': 'zoom.us',
    'Dropbox': 'dropbox.com',
    'Figma': 'figma.com',
    'Git': 'git-scm.com',
    'Python': 'python.org',
    'NodeJS': 'nodejs.org',
    'OpenJS': 'nodejs.org',
    'Docker': 'docker.com',
    'Kubernetes': 'kubernetes.io',
    'JetBrains': 'jetbrains.com',
    'TheDocumentFoundation': 'libreoffice.org',
    'Brave': 'brave.com',
    'Vivaldi': 'vivaldi.com',
    'Opera': 'opera.com',
    'RARLab': 'rarlab.com',
    'WinRAR': 'rarlab.com',
    'Nullsoft': 'winamp.com',
    'GerardoG': 'github.com',
    'JanDeDobbeleer': 'ohmyposh.dev',
    'OhMyPosh': 'ohmyposh.dev',
    'BurntSushi': 'github.com',
    'JQLang': 'github.com',
    'Deltco': 'github.com',
    'XhmikosR': 'github.com',
    'CoreyButler': 'github.com',
    'ApacheFriends': 'apachefriends.org',
    'Adobe': 'adobe.com',
    'EpicGames': 'epicgames.com',
    'Valve': 'steampowered.com',
    'Discord': 'discord.com',
    'Slack': 'slack.com',
    'Spotify': 'spotify.com',
    'Notepad++': 'notepad-plus-plus.org',
    'PuTTY': 'putty.org',
    'Audacity': 'audacityteam.org',
    'Inkscape': 'inkscape.org',
    'Krita': 'krita.org',
    'HandBrake': 'handbrake.fr',
    'Wireshark': 'wireshark.org',
    'VirtualBox': 'virtualbox.org',
    'Oracle': 'oracle.com',
    'Vmware': 'vmware.com',
    'TeamViewer': 'teamviewer.com',
    'AnyDesk': 'anydesk.com',
    'Rust': 'rust-lang.org',
    'GoLang': 'go.dev',
    'Ruby': 'ruby-lang.org',
    'PHP': 'php.net',
    'Mozilla': 'mozilla.org',
    'Thunderbird': 'thunderbird.net',
    'Signal': 'signal.org',
    'Element': 'element.io',
    'Bitwarden': 'bitwarden.com',
    'LastPass': 'lastpass.com',
    '1Password': '1password.com',
    'KeePass': 'keepass.info',
    'Greenshot': 'getgreenshot.org',
    'ShareX': 'getsharex.com',
    'BleachBit': 'bleachbit.org',
    'CCleaner': 'ccleaner.com',
    'Malwarebytes': 'malwarebytes.com',
    'Avast': 'avast.com',
    'AVG': 'avg.com',
    'Kaspersky': 'kaspersky.com',
    'ESET': 'eset.com',
    'McAfee': 'mcafee.com',
    'Norton': 'norton.com',
    'Logitech': 'logitech.com',
    'Razer': 'razer.com',
    'Corsair': 'corsair.com',
    'SteelSeries': 'steelseries.com',
    'Nvidia': 'nvidia.com',
    'AMD': 'amd.com',
    'Intel': 'intel.com',
    'Asus': 'asus.com',
    'Acer': 'acer.com',
    'Dell': 'dell.com',
    'HP': 'hp.com',
    'Lenovo': 'lenovo.com',
    'MSI': 'msi.com',
    'Samsung': 'samsung.com',
    'LG': 'lg.com',
    'Sony': 'sony.com',
    'Apple': 'apple.com',
    'Amazon': 'amazon.com',
    'Netflix': 'netflix.com',
    'Hulu': 'hulu.com',
    'Disney': 'disneyplus.com',
    'Twitch': 'twitch.tv',
    'OBS': 'obsproject.com',
    'Streamlabs': 'streamlabs.com',
    'Unity': 'unity.com',
    'UnrealEngine': 'unrealengine.com',
    'Godot': 'godotengine.org',
    'Arduino': 'arduino.cc',
    'RaspberryPi': 'raspberrypi.com',
    'Plex': 'plex.tv',
    'Jellyfin': 'jellyfin.org',
    'Emby': 'emby.media',
    'Kodi': 'kodi.tv',
    'VLC': 'videolan.org',
    'MPC-HC': 'mpc-hc.org',
    'PotPlayer': 'potplayer.daum.net',
    'Foobar2000': 'foobar2000.org',
    'AIMP': 'aimp.ru',
    'MusicBee': 'getmusicbee.com',
    'Audacious': 'audacious-media-player.org',
    'Clementine': 'clementine-player.org',
    'Strawberry': 'strawberrymusicplayer.org',
    'QuodLibet': 'quodlibet.readthedocs.io',
    'Rhythmbox': 'wiki.gnome.org/Apps/Rhythmbox',
    'Lollypop': 'wiki.gnome.org/Apps/Lollypop',
    'GnomeMusic': 'wiki.gnome.org/Apps/Music',
    'Elisa': 'kde.org/applications/multimedia/org.kde.elisa',
    'JuK': 'kde.org/applications/multimedia/org.kde.juk',
    'Cantata': 'github.com/CDrummond/cantata',
    'MPD': 'musicpd.org',
    'NCMPCPP': 'rybczak.net/ncmpcpp',
    'Beets': 'beets.io',
    'Picard': 'picard.musicbrainz.org'
};

function getEmojiFallback(name) {
    if (!name) return '📦';
    const n = name.toLowerCase();
    if (n.includes('chrome') || n.includes('edge') || n.includes('firefox') || n.includes('brave')) return '🌐';
    if (n.includes('code') || n.includes('git') || n.includes('studio')) return '💻';
    if (n.includes('discord') || n.includes('slack') || n.includes('telegram')) return '💬';
    if (n.includes('spotify') || n.includes('vlc') || n.includes('media')) return '🎵';
    if (n.includes('steam') || n.includes('game') || n.includes('play')) return '🎮';
    if (n.includes('python') || n.includes('node') || n.includes('java')) return '🐍';
    if (n.includes('office') || n.includes('word') || n.includes('excel')) return '📄';
    if (n.includes('zip') || n.includes('rar') || n.includes('7z')) return '🗜️';
    return '📦';
}

// ==========================================
// INTELLIGENT ICON FALLBACK
// ==========================================
// ==========================================
// INTELLIGENT ICON FALLBACK & LOADING
// ==========================================
// Helper to get fallback domain
function getDomain(id) {
    if (!id) return null;

    // 0. Product Specific Map (Best for Google S2 accuracy)
    const PRODUCT_MAP = {
        'Microsoft.Teams': 'teams.microsoft.com',
        'Microsoft.VisualStudioCode': 'code.visualstudio.com',
        'Microsoft.Edge': 'microsoft.com/edge', // Google S2 handles paths poorly, usually just domain. Let's try edge.microsoft.com? or generic.
        'Microsoft.PowerToys': 'learn.microsoft.com', // Often has generic MS icon, but better than nothing
        'Google.Chrome': 'google.com/chrome',
        'Mozilla.Firefox': 'mozilla.org', // Firefox usually has its own
        'Brave.Brave': 'brave.com',
        'VideoLAN.VLC': 'videolan.org',
        'Discord.Discord': 'discord.com',
        'Slack.Slack': 'slack.com',
        'Spotify.Spotify': 'spotify.com',
        'Valve.Steam': 'store.steampowered.com',
        'EpicGames.EpicGamesLauncher': 'store.epicgames.com',
        'Telegram.TelegramDesktop': 'telegram.org',
        'WhatsApp.WhatsApp': 'whatsapp.com',
        'Zoom.Zoom': 'zoom.us',
        'Notion.Notion': 'notion.so',
        'Figma.Figma': 'figma.com',
        'Postman.Postman': 'postman.com',
        'Obsidian.Obsidian': 'obsidian.md',
        'Anki.Anki': 'apps.ankiweb.net',
        'Audacity.Audacity': 'audacityteam.org',
        'GIMP.GIMP': 'gimp.org',
        'Blender.Blender': 'blender.org',
        'OBSProject.OBSStudio': 'obsproject.com',
        'HandBrake.HandBrake': 'handbrake.fr',
        'Wireshark.Wireshark': 'wireshark.org',
        'Oracle.VirtualBox': 'virtualbox.org',
        'Git.Git': 'git-scm.com',
        'Python.Python': 'python.org',
        'OpenJS.NodeJS': 'nodejs.org',
        'Docker.DockerDesktop': 'docker.com',
        'Kubernetes.Kubernetes': 'kubernetes.io',
        'Microsoft.WindowsTerminal': 'learn.microsoft.com', // Generic
        'XPipe.XPipe': 'xpipe.io',
        'JanDeDobbeleer.OhMyPosh': 'ohmyposh.dev'
    };

    if (PRODUCT_MAP[id]) return PRODUCT_MAP[id];

    // 1. Check for Microsoft Store ID (12 chars alnum)
    // Map these to apps.microsoft.com for generic MS icon (better than nothing)
    // or specific if we can guess, but apps.microsoft.com is safe for "Microsoft Store" branding
    if (/^[a-zA-Z0-9]{12}$/.test(id)) {
        return 'apps.microsoft.com';
    }

    // Filter out garbage WinGet IDs
    if (id.startsWith('ARP') || id.startsWith('MSIX') || id.startsWith('User') || id.startsWith('Machine') || id.includes('{')) {
        return null;
    }

    // 2. Exact Match in Map (Full ID)
    // DISABLED PER USER REQUEST (Use dynamic manifest fetching)
    // if (DOMAIN_MAP[id]) return DOMAIN_MAP[id];

    // 3. Publisher Match
    // DISABLED PER USER REQUEST
    /*
    const parts = id.split('.');
    if (parts.length > 0) {
        const pub = parts[0];

        // Check Map first
        if (DOMAIN_MAP[pub]) return DOMAIN_MAP[pub];

        // Heuristic: Remove non-alphanumeric and append .com
        return `${pub.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}.com`;
    }
    */
    return null;
};

// Intersection Observer for Lazy Loading
const iconObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            observer.unobserve(img);
            loadIcon(img);
        }
    });
}, { rootMargin: "100px" });

function observeIcons() {
    document.querySelectorAll('img.lazy-icon').forEach(img => {
        // Only observe if not already processed
        if (!img.dataset.loaded) {
            iconObserver.observe(img);
        }
    });
}

// Helper to clean up UI on success
function cleanupSuccess(img) {
    img.style.opacity = 1;
    if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
        img.parentElement.classList.remove('icon-loading');
        img.parentElement.classList.add('has-icon');
    }
}

// Main Icon Loading Logic
async function loadIcon(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Mark as processed attempt
    img.dataset.loaded = "true";

    // Add loading state to parent
    if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
        img.parentElement.classList.add('icon-loading');
    }

    // Bypass fetch check for Google Icons (CORS blocks fetch, but img src works)
    if (src.includes('google.com/s2/favicons')) {
        img.src = src;
        img.style.opacity = 1;
        if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
            img.parentElement.classList.remove('icon-loading');
            img.parentElement.classList.add('has-icon');
        }
        return;
    }

    // ---------------------------------------------------------
    // DYNAMIC RESOLVER (LAZY LOAD MANIFEST for Real URL)
    // ---------------------------------------------------------
    // If src is empty (Stage 5 with no Domain Map hit) OR it's a specific "Resolve Me" flag
    if (src === 'RESOLVE_MANIFEST') {
        const appId = img.dataset.id;
        if (!appId) return; // Should not happen

        try {
            const res = await fetch(`/api/manifest?id=${encodeURIComponent(appId)}`);
            const data = await res.json();

            if (data && data.success) {
                // Optimization: Did server already scrape it?
                if (data.iconUrl) {
                    img.src = data.iconUrl;
                    cleanupSuccess(img);
                    return;
                }

                // Fallback: Got domain but no icon URL? Trigger manual Scrape/Google
                if (data.domain) {
                    const scrapeUrl = `/api/scrape-icon?domain=${encodeURIComponent(data.domain)}`;
                    img.dataset.src = scrapeUrl;
                    loadIcon(img);
                    return;
                }
            }
        } catch (e) { }

        // If Manifest failed or no domain, fallback to Stage 6 (Give Up / Fallback Icon)
        // Or just Fallback Emoji
        img.parentElement.classList.remove('icon-loading');
        // If we had a fallback element, it would show now if we hid the spinner?
        // Actually if we just return, the spinner stays forever. We must clean up.
        if (img.parentElement.classList.contains('icon-wrapper')) {
            img.parentElement.classList.remove('icon-loading');
        }
        // Trigger "Give Up" visual? 
        // processIconStage(img) might expect 'step' logic.
        // Let's just force display:none and show fallback.
        img.style.display = 'none';
        return;
    }

    // Special handling for Scraper API (returns JSON, not Image Blob)
    if (src.includes('/api/scrape-icon')) {
        try {
            const res = await fetch(src);
            const data = await res.json();

            // Default Fallback (Google)
            let finalUrl = null;

            // Extract domain for fallback from the src URL param
            const urlObj = new URL(src, window.location.origin);
            const domain = urlObj.searchParams.get('domain');
            const googleFallback = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

            if (data && data.success && data.url) {
                finalUrl = data.url;
            } else {
                finalUrl = googleFallback;
            }

            img.src = finalUrl;
            img.style.opacity = 1;

            // Success State (Spinner Off)
            if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
                img.parentElement.classList.remove('icon-loading');
                img.parentElement.classList.add('has-icon');
            }
            return;

        } catch (e) {
            // Extract domain for fallback from the src URL param
            try {
                const urlObj = new URL(src, window.location.origin);
                const domain = urlObj.searchParams.get('domain');
                img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                img.style.opacity = 1;
                if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
                    img.parentElement.classList.remove('icon-loading');
                    img.parentElement.classList.add('has-icon');
                }
            } catch (ex) { }
            return;
        }
    }

    try {
        // Use GET instead of HEAD to ensure we get headers properly (and the image if it exists)
        // Since we are same-origin for /api/icon, this is fine.
        // For external URLs, we still try.
        const res = await fetch(src);

        if (res.ok) {
            // Check for our custom "Missing" header from server
            if (res.headers.get('X-Icon-Missing') === 'true') {
                // Server says it's missing (but sent 200 OK to hide console error)
                processIconStage(img);
                return;
            }

            // Valid image
            const blob = await res.blob();
            img.src = URL.createObjectURL(blob);
            img.style.opacity = 1;

            // Robustly hide fallback by adding class to parent wrapper
            // This allows CSS to handle the visibility state cleanly
            if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
                img.parentElement.classList.remove('icon-loading');
                img.parentElement.classList.add('has-icon');
            }
            return;
        }
    } catch (e) { }

    // If failed, proceed to next stage
    processIconStage(img);
}

async function processIconStage(img) {
    const id = img.dataset.id;
    let stage = parseInt(img.dataset.stage || '0');

    // If local icon failed (stage 0), try web scraping via manifest
    if (stage < 5) {
        img.dataset.stage = 5;
        img.dataset.src = 'RESOLVE_MANIFEST';
        loadIcon(img);
        return;
    }

    // Stage 5+ failed, show fallback emoji
    img.dataset.stage = 6;
    img.style.display = 'none';
    if (img.parentElement && img.parentElement.classList.contains('icon-wrapper')) {
        img.parentElement.classList.remove('icon-loading');
    }
}

// Window global for manual triggering if needed
window.handleIconError = function (img) {
    if (!img.dataset.loaded) loadIcon(img);
};

function getAppIconHTML(app, isInstalled = false) {
    if (!app) return `<span class="icon">📦</span>`;

    const fallbackEmoji = getEmojiFallback(app.name);

    // Prepare Data Attributes
    const safeId = (app.id || '').replace(/"/g, '&quot;');
    const safeName = (app.name || '').replace(/"/g, '&quot;');

    // Determine Initial Source
    let initialSrc = '';
    let initialStage = 0;

    // 1. Downloaded File (Explicit path) - Highest Priority
    if (app.file) {
        const encodedFile = encodeURIComponent(app.file);
        initialSrc = `/api/icon?file=${encodedFile}`;
        initialStage = -1; // Special stage for file based
    }
    // 2. Local Icon for Installed Apps
    else if (isInstalled || (State.cache.installed && State.cache.installed.some(i => i.id === app.id))) {
        const encodedName = encodeURIComponent(app.name);
        const encodedId = encodeURIComponent(app.id);
        initialSrc = `/api/icon?id=${encodedId}&name=${encodedName}`;
        initialStage = 0;
    }
    // 3. Search / Updates (Start with Scraper/Google)
    else {
        const domain = getDomain(app.id);
        if (domain) {
            // Set the Source to the Scraper API
            initialSrc = `/api/scrape-icon?domain=${encodeURIComponent(domain)}`;
            initialStage = 5;
        } else {
            // NEW: Dynamic Resolver!
            // Instead of failing to emoji, we ask the server to find the domain.
            initialSrc = 'RESOLVE_MANIFEST';
            initialStage = 5;
        }
    }

    // Use data-src to prevent browser from firing 404s to console immediately
    const imgHtml = `
            <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                data-src="${initialSrc}"
                class="app-icon lazy-icon" 
                alt="${safeName}"
                data-id="${safeId}"
                data-name="${safeName}"
                data-stage="${initialStage}"
                style="opacity: 0; transition: opacity 0.3s;"
            >`;

    // Start everything in LOADING state (spinner) to hide fallback flicker
    const loadingClass = 'icon-loading';

    return `
        <div class="icon-wrapper ${loadingClass}">
            ${imgHtml}
            <div class="icon-fallback">
                <span class="icon">${fallbackEmoji}</span>
            </div>
        </div>
    `;
}

// Backward compatibility alias for parts I might have missed
function getIcon(name) {
    return getEmojiFallback(name);
}

// Toast Singleton - Replaces any existing toast
function showToast(message, type = 'info') {
    if (!DOM.toasts) {
        DOM.toasts = document.getElementById('toast-container');
        if (!DOM.toasts) return;
    }

    // SINGLETON: Clear existing toasts
    DOM.toasts.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    DOM.toasts.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        // Fade out
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3000);
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

    // Hotfix: Replace double-encoded UTF-8 characters if server/cmd messed them up
    // Γûê is █ (Full Block), ΓûÆ is ▒ (Light Shade) approx
    text = text.replace(/Γûê/g, '█').replace(/ΓûÆ/g, '▒');

    // Detect progress bar lines (e.g., containing blocks or "1.2 MB / 5.6 MB") or spinner chars
    const isProgressLine = text.includes('█') || text.includes('▒')
        || (text.match(/\d+(\.\d+)?\s*(KB|MB|GB)\s*\/\s*\d+(\.\d+)?\s*(KB|MB|GB)/i) && !text.includes('id'))
        || text.match(/^\s*[\-\\\|\/]\s*$/);

    // Add to history
    // If we want to animate, we should replace the last entry if both are progress lines
    const lastEntry = task.output[task.output.length - 1];
    const isLastProgress = lastEntry && lastEntry.isProgress;

    if (isProgressLine && isLastProgress) {
        // Update the last entry's text
        lastEntry.text = text;

        // UI Update: Update the last DOM element
        if (State.currentTask === task) {
            const lastDom = DOM.modal.output.lastElementChild;
            if (lastDom) {
                lastDom.textContent = text;
            }
        }
    } else {
        // Standard append
        task.output.push({ text, type, isProgress: isProgressLine });

        // UI Update: Append new element
        if (State.currentTask === task) {
            const line = document.createElement('div');
            line.className = `output-line ${type}`;
            // If it's a progress line, give it a monospaced look or special class if desired
            if (isProgressLine) line.style.fontFamily = 'Consolas, monospace';
            // Add $ prefix for terminal look
            line.textContent = '$ ' + text;
            DOM.modal.output.appendChild(line);
            DOM.modal.output.scrollTop = DOM.modal.output.scrollHeight;
        }
    }

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
        } else if (lower.includes('uninstalling') || lower.includes('removing') || lower.includes('uninstall')) {
            task.progress = 70; task.stage = 'uninstall';
        } else if ((lower.includes('installing') || lower.includes('install')) && !lower.includes('uninstall')) {
            task.progress = 70; task.stage = 'install';
        } else if (lower.includes('upgrading') || lower.includes('update')) {
            task.progress = 70; task.stage = 'update';
        } else if (lower.includes('verifying') || lower.includes('configuring')) {
            task.progress = 85; task.stage = 'verify';
        }
    }

    if (type === 'success') {
        task.progress = 100; task.stage = 'complete';
    } else if (type === 'error') {
        task.progress = 100; task.stage = 'error';
    }

    // Update progress bar UI (always, in case stage changed)
    if (State.currentTask === task) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        if (progressBar && progressText) {
            let statusText = text;
            if (isProgressLine) statusText = "Downloading..."; // Simplify text on the bar itself if it's a complex progress line

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
        stage: 'init',
        processedLines: 0 // Track processed log lines
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
// POLLING HELPER
// ==========================================
async function pollJob(jobId, task, successMsg, failMsg, onSuccess) {
    if (!jobId || !task) return;

    let errorCount = 0;

    const checkStatus = async () => {
        try {
            const data = await apiCall(`/api/status?id=${jobId}`);

            if (!data) {
                errorCount++;
                if (errorCount > 5) {
                    updateTaskLog(task, 'Lost connection to task.', 'error');
                    return; // Stop polling
                }
            } else {
                errorCount = 0; // Reset error count on success

                // Process new output lines
                if (data.output) {
                    // Split by any CR/LF to handle winget's animation updates which use \r
                    const allLines = data.output.split(/[\r\n]+/);

                    // Only take new lines
                    const newLines = allLines.slice(task.processedLines || 0);
                    task.processedLines = allLines.length; // Update pointer immediately

                    // Process lines with visual delay to smooth out animations
                    // We await this so next poll doesn't happen until we finish animating this batch
                    if (newLines.length > 0) {
                        await processLogLinesWithDelay(task, newLines);
                    }
                }

                if (data.done) {
                    if (data.success) {
                        updateTaskLog(task, '✓ Task Completed!', 'success');
                        showToast(successMsg, 'success');
                        if (onSuccess) onSuccess();
                    } else {
                        updateTaskLog(task, '✗ Task Failed', 'error');
                        updateTaskLog(task, 'Check logs for details.', 'error');
                        showToast(failMsg, 'error');
                    }
                    return; // Stop polling
                }
            }
        } catch (e) {
            log('Polling error', e);
        }

        // Schedule next poll
        // Poll once per second instead of spam
        setTimeout(checkStatus, 200);
    };

    // Start the loop
    checkStatus();
}

async function processLogLinesWithDelay(task, lines) {
    console.log(`[Animation] Processing ${lines.length} lines`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if it's a progress/spinner line
        const isProgress = trimmed.includes('█') || trimmed.includes('▒') || trimmed.match(/[\-\\\|\/]/) || trimmed.match(/\d+(\.\d+)?\s*(KB|MB|GB)\s*\/\s*\d+(\.\d+)?\s*(KB|MB|GB)/i);

        updateTaskLog(task, trimmed, 'info');

        // Add delay for progress lines so user can SEE each update
        // 100ms = smooth animation, 10ms for regular text
        if (isProgress && i < lines.length - 1) {
            await new Promise(r => setTimeout(r, 100));
        } else if (!isProgress && i < lines.length - 1) {
            await new Promise(r => setTimeout(r, 10));
        }
    }
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
        updateTaskLog(task, `Requesting install...`, 'info');

        fetch(`/api/install?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.jobId) {
                    updateTaskLog(task, '✓ Request accepted. Starting background job...', 'info');
                    pollJob(data.jobId, task, `${safeName} installed successfully!`, `Failed by install ${safeName}`, () => {
                        fetchInstalled(true);
                    });
                } else {
                    updateTaskLog(task, '✗ Installation request failed', 'error');
                    if (data.message) updateTaskLog(task, data.message, 'error');
                    if (data.error) updateTaskLog(task, "Server Error: " + data.error, 'error');
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
        updateTaskLog(task, `Requesting download...`, 'info');

        fetch(`/api/download?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.jobId) {
                    pollJob(data.jobId, task, `${safeName} downloaded!`, `Failed to download ${safeName}`, () => {
                        loadDownloaded(true);
                    });
                } else {
                    updateTaskLog(task, '✗ Download request failed', 'error');
                    if (data.message) updateTaskLog(task, data.message, 'error');
                    if (data.error) updateTaskLog(task, "Server Error: " + data.error, 'error');
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
        updateTaskLog(task, `Requesting uninstall...`, 'info');

        fetch(`/api/uninstall?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.jobId) { // Check for jobId
                    pollJob(data.jobId, task, `${safeName} uninstalled!`, `Failed to uninstall ${safeName}`, () => {
                        loadInstalled(true);
                    });
                } else {
                    updateTaskLog(task, '✗ Uninstall request failed', 'error');
                    if (data.message) updateTaskLog(task, data.message, 'error');
                    if (data.error) updateTaskLog(task, "Server Error: " + data.error, 'error');
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
        updateTaskLog(task, `Requesting update...`, 'info');

        fetch(`/api/update?id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.jobId) {
                    pollJob(data.jobId, task, `${safeName} updated!`, `Failed to update ${safeName}`, () => {
                        loadUpdates(true);
                    });
                } else {
                    updateTaskLog(task, '✗ Update request failed', 'error');
                    if (data.message) updateTaskLog(task, data.message, 'error');
                    if (data.error) updateTaskLog(task, "Server Error: " + data.error, 'error');
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

    // Sort: Installed first, then keep winget's original relevance order
    const installedIds = new Set((State.cache.installed || []).map(i => i.id));

    validResults.sort((a, b) => {
        const aInstalled = installedIds.has(a.id);
        const bInstalled = installedIds.has(b.id);

        // Only reorder if one is installed and other is not
        if (aInstalled && !bInstalled) return -1;
        if (!aInstalled && bInstalled) return 1;

        // Keep original winget relevance order
        return 0;
    });

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
            ${getAppIconHTML(app)}
            <h3>${app.name}</h3>
            <div 
                class="app-id" 
                title="Click to copy ID" 
                style="cursor: pointer;" 
                onclick="copyToClipboard('${app.id}')"
            >${app.id}</div>
            <div class="version">v${app.version || 'Unknown'}</div>
            <div class="actions">
                ${actionButtons}
            </div>
        </div>
    `}).join('');

    log(`Rendered ${validResults.length} search results`);
    observeIcons();
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

    const headerTitle = document.getElementById('installed-header-title');
    if (headerTitle) headerTitle.textContent = `Installed Applications (${validApps.length})`;

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
            ${getAppIconHTML(app, true)}
            <div class="info">
                <h3>${app.name}</h3>
                <p 
                    title="Click to copy ID" 
                    style="cursor: pointer; display: inline-block;" 
                    onclick="copyToClipboard('${app.id}')"
                >${app.id} • v${app.version || '?'}</p>
            </div>
            <button class="btn btn-danger" onclick="confirmUninstall('${app.id}', '${app.name}')">Uninstall</button>
        </div>
    `).join('');

    log(`Rendered ${filtered.length}/${validApps.length} installed apps`);
    observeIcons();
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

    const headerTitle = document.getElementById('updates-header-title');
    if (headerTitle) headerTitle.textContent = `Available Updates (${validUpdates.length})`;

    const updateAllBtn = document.getElementById('update-all-btn');
    if (updateAllBtn) {
        updateAllBtn.style.display = validUpdates.length > 0 ? 'inline-block' : 'none';
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
            ${getAppIconHTML(app)}
            <h3>${app.name}</h3>
            <div 
                class="app-id" 
                title="Click to copy ID" 
                style="cursor: pointer;" 
                onclick="copyToClipboard('${app.id}')"
            >${app.id}</div>
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
    observeIcons();
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
    const badge = document.getElementById('downloaded-badge');

    // Validate files array
    const validFiles = files && Array.isArray(files) ? files : [];

    // -----------------------------------------------------
    // BADGE UPDATE (Force Direct DOM Update)
    // -----------------------------------------------------
    if (badge) {
        badge.textContent = validFiles.length;
        badge.style.display = validFiles.length > 0 ? 'inline-flex' : 'none';
        badge.style.backgroundColor = validFiles.length > 0 ? 'var(--primary)' : 'var(--danger)';
        console.log('Badge updated to:', validFiles.length); // Debug
    }

    if (validFiles.length === 0) {
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
        if (empty) empty.style.display = 'flex';
        return;
    }

    if (empty) empty.style.display = 'none';
    if (container) container.style.display = 'flex';

    if (container) {
        container.innerHTML = validFiles.map(file => {
            const size = (file.Length / 1024 / 1024).toFixed(2) + ' MB';

            // Fix Date Parsing
            let dateStr = 'Unknown Date';
            if (file.LastWriteTime) {
                try {
                    // Parse ISO string
                    const date = new Date(file.LastWriteTime);
                    if (!isNaN(date.getTime())) {
                        // Format: "Jan 4, 3:30 PM"
                        dateStr = date.toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric'
                        }) + ', ' + date.toLocaleTimeString(undefined, {
                            hour: 'numeric', minute: '2-digit'
                        });
                    }
                } catch (e) {
                    console.error('Date parsing error', e);
                }
            }

            // Escape backslashes for string literal in onclick
            const safePath = file.Name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

            return `
            <div class="app-row">
                ${getAppIconHTML({ name: file.Name, file: file.Name })}
                <div class="info">
                    <h3>${file.Name}</h3>
                    <p>${size} • ${dateStr}</p>
                </div>
                <div class="actions">
                    <button class="btn btn-folder" onclick="openDownloadedFolder('${safePath}')" title="Open Folder">📂</button>
                    <button class="btn btn-primary" onclick="confirmRunDownloaded('${safePath}')">Run</button>
                    <button class="btn btn-danger" onclick="confirmDeleteDownloaded('${safePath}')">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    log(`Rendered ${validFiles.length} downloaded files`);
    observeIcons();
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

        // Use Task Modal for feedback (Console View)
        // Use a dummy ID for 'run' tasks as they don't map to a winget ID
        const task = showTaskModal(`Run: ${fileName}`, 'run-task');
        updateTaskLog(task, `File: ${fileName}`, 'info');
        updateTaskLog(task, `Requesting launch via PowerShell...`, 'info');

        fetch(`/api/downloaded/run?file=${encodeURIComponent(fileName)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.jobId) {
                    pollJob(data.jobId, task, 'Launched successfully!', 'Launch failed', () => {
                        // Optional: close modal automatically on success? 
                        // User might want to see output.
                    });
                } else {
                    updateTaskLog(task, '✗ Launch failed', 'error');
                    if (data.message) updateTaskLog(task, data.message, 'error');
                }
            })
            .catch(() => {
                updateTaskLog(task, '✗ Network error', 'error');
            });
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
                    showToast(`Deleted ${fileName}`, 'success');
                    // Refresh list AND BADGE immediately
                    loadDownloaded(false);
                } else {
                    showToast(`Failed to delete: ${data.message}`, 'error');
                }
            })
            .catch(() => showToast('Network error', 'error'));
    }
};

// Open folder containing downloaded file
window.openDownloadedFolder = function (fileName) {
    fetch(`/api/downloaded/open-folder?file=${encodeURIComponent(fileName)}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showToast('Failed to open folder', 'error');
            }
        })
        .catch(() => showToast('Network error', 'error'));
};

// VIEW SWITCHING
// ==========================================
function switchView(viewName) {
    log(`Switching to: ${viewName}`);

    // RESET LOGIC: Clear state before switching
    if (viewName !== 'search') {
        // Clear search if leaving search
        if (DOM.inputs.search) DOM.inputs.search.value = '';
        if (DOM.containers.searchResults) DOM.containers.searchResults.innerHTML = '';
        if (DOM.containers.searchEmpty) DOM.containers.searchEmpty.style.display = 'block';
        if (DOM.containers.searchLoading) DOM.containers.searchLoading.style.display = 'none';
        const welcome = document.getElementById('search-welcome');
        if (welcome) welcome.style.display = 'block';
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) clearBtn.style.display = 'none';

        // Hide initial empty text if we want a fresh start
        if (DOM.containers.searchEmpty) DOM.containers.searchEmpty.innerHTML = '<div class="empty-icon">🔍</div><h3>Search Packages</h3><p>Type to search...</p>';
    }

    // Reset filters
    if (DOM.inputs.filterInstalled) {
        DOM.inputs.filterInstalled.value = '';
        document.getElementById('clear-filter-installed').style.display = 'none';
        // Restore full list if cached
        if (State.cache.installed) renderInstalledApps(State.cache.installed);
    }

    if (DOM.inputs.filterUpdates) {
        DOM.inputs.filterUpdates.value = '';
        document.getElementById('clear-filter-updates').style.display = 'none';
        // Restore full list if cached
        if (State.cache.updates) renderUpdates(State.cache.updates);
    }

    // Reset Scroll Positions
    if (DOM.containers.installedList) DOM.containers.installedList.scrollTop = 0;
    if (DOM.containers.updatesGrid) DOM.containers.updatesGrid.scrollTop = 0;
    if (DOM.containers.downloadedList) DOM.containers.downloadedList.scrollTop = 0; // Assuming this exists or using ID
    const downloadedList = document.getElementById('downloaded-list');
    if (downloadedList) downloadedList.scrollTop = 0;

    // Standard View Switching
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

    // Load data if needed (or assume cache is valid but user wants to see "default" view)
    if (viewName === 'installed' && !State.cache.installed) {
        loadInstalled();
    }
    if (viewName === 'updates' && !State.cache.updates) {
        loadUpdates();
    }
    if (viewName === 'downloaded') {
        loadDownloaded(); // Always refresh downloaded to be safe? Or just check cache
    }
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadInstalled(refresh = false, background = false) {
    const loading = document.getElementById('installed-loading');
    const container = DOM.containers.installedList;

    if (!background && loading) {
        loading.style.display = 'flex'; // Flex for centering
        container.style.display = 'none';
        // Also hide empty state if we had one (not currently tracked in DOM global but good practice)
    }

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
        container.innerHTML = '<div class="error-state"><p>Failed to load installed apps</p></div>';
        container.style.display = 'block';
    } finally {
        if (!background && loading) loading.style.display = 'none';
        if (!background) container.style.display = 'flex'; // Restore list
    }
}

async function loadUpdates(refresh = false, background = false) {
    const loading = document.getElementById('updates-loading');
    const container = DOM.containers.updatesGrid;

    if (!background && loading) {
        loading.style.display = 'flex';
        container.style.display = 'none';
    }

    try {
        const updates = await fetchUpdates(refresh);
        State.cache.updates = updates;
        renderUpdates(updates);
        if (refresh && !background) showToast('Updates checked', 'success');
    } catch (error) {
        log('Error loading updates', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load updates</p></div>';
        container.style.display = 'grid';
    } finally {
        if (!background && loading) loading.style.display = 'none';
        if (!background) container.style.display = 'grid';
    }
}

async function handleSearch(query) {
    if (!query) query = '';
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

    // Update All button
    const updateAllBtn = document.getElementById('update-all-btn');
    if (updateAllBtn) {
        updateAllBtn.addEventListener('click', updateAllApps);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to close modals
        if (e.key === 'Escape') {
            const taskModal = document.getElementById('task-modal');
            const ignoredModal = document.getElementById('ignored-modal');
            const confirmDialog = document.getElementById('confirm-dialog');

            if (ignoredModal && ignoredModal.style.display === 'flex') {
                closeIgnoredModal();
            } else if (confirmDialog && confirmDialog.style.display !== 'none') {
                confirmDialog.style.display = 'none';
            } else if (taskModal && taskModal.style.display !== 'none') {
                minimizeModal();
            }
        }

        // Enter to search
        if (e.key === 'Enter' && document.activeElement.id === 'search-input') {
            handleSearch();
        }
    });

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

// ==========================================
// IGNORED APPS MODAL
// ==========================================
function openIgnoredModal() {
    const ignoredApps = getIgnoredApps();
    const modal = document.getElementById('ignored-modal');
    const list = document.getElementById('ignored-list');

    if (!modal || !list) return;

    list.innerHTML = '';

    if (ignoredApps.length === 0) {
        list.innerHTML = `
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 12px; opacity: 0.5;">📋</div>
                <p style="margin: 0;">No ignored apps</p>
            </div>
        `;
    } else {
        ignoredApps.forEach(app => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: var(--bg-light);
                border-radius: 8px;
                margin-bottom: 8px;
            `;

            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 2px;">${app.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${app.id}</div>
                </div>
                <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" 
                        onclick="unignoreApp('${app.id.replace(/'/g, "\\'")}', '${app.name.replace(/'/g, "\\'")}')">
                    Un-ignore
                </button>
            `;

            list.appendChild(item);
        });
    }

    modal.style.display = 'flex';
}

function closeIgnoredModal() {
    const modal = document.getElementById('ignored-modal');
    if (modal) modal.style.display = 'none';
}

function unignoreApp(id, name) {
    const ignored = getIgnoredApps();
    const updated = ignored.filter(app => app.id !== id);
    localStorage.setItem('ignoredApps', JSON.stringify(updated));

    showToast(`${name} removed from ignored list`, 'success');
    openIgnoredModal(); // Refresh the modal
    loadUpdates(true); // Refresh updates view
}

// ==========================================
// UPDATE ALL APPS
// ==========================================
async function updateAllApps() {
    const updates = State.cache.updates || [];
    if (updates.length === 0) {
        showToast('No updates available', 'info');
        return;
    }

    const confirmed = await customConfirm(
        'Update All Applications',
        `Update ${updates.length} application(s)?\n\nThis will update all available packages.`,
        '⬆️'
    );

    if (!confirmed) return;

    showToast(`Starting batch update of ${updates.length} app(s)...`, 'info');

    // Update sequentially to avoid overwhelming the system
    for (const app of updates) {
        const task = showTaskModal(`Updating ${app.name}`, app.id);
        updateTaskLog(task, `Package ID: ${app.id}`, 'info');
        updateTaskLog(task, `Current: v${app.current || 'Unknown'}`, 'info');
        updateTaskLog(task, `Available: v${app.version || 'Unknown'}`, 'info');
        updateTaskLog(task, `Requesting update...`, 'info');

        try {
            const res = await fetch(`/api/update?id=${encodeURIComponent(app.id)}`);
            const data = await res.json();

            if (data.success && data.jobId) {
                // Wait for this update to complete before starting next
                await new Promise((resolve) => {
                    pollJob(data.jobId, task, `${app.name} updated!`, `Failed to update ${app.name}`, resolve);
                });
            } else {
                updateTaskLog(task, '✗ Update request failed', 'error');
                if (data.message) updateTaskLog(task, data.message, 'error');
            }
        } catch (err) {
            updateTaskLog(task, '✗ Network error', 'error');
        }

        // Small delay between updates
        await new Promise(r => setTimeout(r, 1000));
    }

    showToast('Batch update completed!', 'success');
    loadUpdates(true); // Refresh the updates list
}

window.copyToClipboard = function (text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('ID copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

function setupRealTimeFiltering() {
    const filterInstalled = document.getElementById('filter-installed');
    const filterUpdates = document.getElementById('filter-updates');

    if (filterInstalled) {
        filterInstalled.addEventListener('input', debounce((e) => {
            const val = e.target.value;
            // Update clear button visibility
            const clearBtn = document.getElementById('clear-filter-installed');
            if (clearBtn) clearBtn.style.display = val ? 'inline-block' : 'none';
            // Re-render list
            if (State.cache.installed) {
                renderInstalledApps(State.cache.installed, val);
            }
        }, 300));
    }

    if (filterUpdates) {
        filterUpdates.addEventListener('input', debounce((e) => {
            const val = e.target.value;
            // Update clear button visibility
            const clearBtn = document.getElementById('clear-filter-updates');
            if (clearBtn) clearBtn.style.display = val ? 'inline-block' : 'none';
            // Re-render list
            if (State.cache.updates) {
                renderUpdates(State.cache.updates, val);
            }
        }, 300));
    }
}

// Call this in initialization
document.addEventListener('DOMContentLoaded', () => {
    // ... existing init code ...
    setupRealTimeFiltering();
});

// --- HEARTBEAT & AUTO-SHUTDOWN REMOVED ---

