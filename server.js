const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { open } = require('fs/promises');
const { spawn, exec } = require('child_process');

const winget = require('./utils/winget');
const jobs = require('./utils/jobs');
const cache = require('./utils/cache');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// --- HEARTBEAT & AUTO-SHUTDOWN REMOVED ---
// Server now runs until manually stopped


// Static Files
app.use(express.static(path.join(__dirname, 'gui')));

// Download Directory
const DOWNLOAD_DIR = path.join(__dirname, 'Downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// --- VERSION ---
app.get('/version.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'version.json'));
});

// --- INSTALLED ---
app.get('/api/installed', async (req, res) => {
    const cached = cache.load('installed');
    if (cached) {
        return res.json({ success: true, apps: cached });
    }
    // Fallback to refresh
    try {
        const apps = await winget.listInstalled();
        cache.save('installed', apps);
        res.json({ success: true, apps });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/refresh-installed', async (req, res) => {
    try {
        const apps = await winget.listInstalled();
        cache.save('installed', apps);
        res.json({ success: true, apps });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- UPDATES ---
app.get('/api/updates', async (req, res) => {
    const cached = cache.load('updates');
    const ignored = cache.load('ignored') || [];
    const ignoredIds = (Array.isArray(ignored) ? ignored : []).map(i => i.id);

    if (cached) {
        const filtered = cached.filter(u => !ignoredIds.includes(u.id));
        return res.json({ success: true, updates: filtered });
    }

    try {
        const updates = await winget.listUpdates();
        cache.save('updates', updates);
        const filtered = updates.filter(u => !ignoredIds.includes(u.id));
        res.json({ success: true, updates: filtered });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/refresh-updates', async (req, res) => {
    try {
        const updates = await winget.listUpdates();
        cache.save('updates', updates);

        const ignored = cache.load('ignored') || [];
        const ignoredIds = (Array.isArray(ignored) ? ignored : []).map(i => i.id);
        const filtered = updates.filter(u => !ignoredIds.includes(u.id));

        res.json({ success: true, updates: filtered });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- IGNORED ---
app.get('/api/ignored', (req, res) => {
    const ignored = cache.load('ignored') || [];
    res.json({ success: true, apps: ignored });
});

app.get('/api/ignore', (req, res) => {
    const { id, name } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'No ID provided' });

    let ignored = cache.load('ignored') || [];
    if (!ignored.find(i => i.id === id)) {
        ignored.push({ id, name });
        cache.save('ignored', ignored);
    }
    res.json({ success: true, message: `Ignored ${id}` });
});

app.get('/api/unignore', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'No ID provided' });

    let ignored = cache.load('ignored') || [];
    ignored = ignored.filter(i => i.id !== id);
    cache.save('ignored', ignored);
    res.json({ success: true, message: `Unignored ${id}` });
});

// Helper: Scrape Icon from URL
async function scrapeIconFromUrl(targetUrl) {
    if (!targetUrl) return null;
    try {
        const domain = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        const response = await fetch(domain, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(4000)
        });

        if (!response.ok) return null;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let html = '';
        let bytesRead = 0;
        const LIMIT = 512000; // Increase limit to 512KB for large heads

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                html += decoder.decode(value, { stream: true });
                bytesRead += value.length;
                if (bytesRead > LIMIT || html.includes('</head>')) break;
            }
        } catch (e) { }

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                html += decoder.decode(value, { stream: true });
                bytesRead += value.length;
                if (bytesRead > LIMIT || html.includes('</head>')) break;
            }
        } catch (e) { }
        try { reader.cancel(); } catch (e) { }

        const findAttr = (regex) => {
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        // Multiple patterns to catch different HTML structures
        // Pattern 1: apple-touch-icon (any attribute order)
        let iconUrl = findAttr(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
        if (!iconUrl) iconUrl = findAttr(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);

        // Pattern 2: icon with sizes
        if (!iconUrl) iconUrl = findAttr(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["'][^>]*sizes=["'](?:192|180|128|96|64|48|32)/i);
        if (!iconUrl) iconUrl = findAttr(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["']/i);

        // Pattern 3: shortcut icon
        if (!iconUrl) iconUrl = findAttr(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
        if (!iconUrl) iconUrl = findAttr(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

        // Pattern 4: Any link with icon in rel
        if (!iconUrl) iconUrl = findAttr(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i);

        if (iconUrl) {
            if (!iconUrl.startsWith('http')) {
                const u = new URL(domain);
                if (iconUrl.startsWith('//')) {
                    iconUrl = u.protocol + iconUrl;
                } else if (iconUrl.startsWith('/')) {
                    iconUrl = u.origin + iconUrl;
                } else {
                    iconUrl = u.origin + '/' + iconUrl;
                }
            }

            // Validate icon URL - check if it returns an image
            try {
                const iconRes = await fetch(iconUrl, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(2000)
                });
                const contentType = iconRes.headers.get('content-type') || '';
                // Only accept if it looks like an image
                if (iconRes.ok && (contentType.includes('image') || iconUrl.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/i))) {
                    return iconUrl;
                }
            } catch (e) { }
            // If validation failed, don't return this URL
        }

        // Fallback: Try /favicon.ico at domain root
        try {
            const u = new URL(domain);
            const faviconUrl = u.origin + '/favicon.ico';
            // Quick HEAD check to see if it exists
            const faviconRes = await fetch(faviconUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(2000)
            });
            if (faviconRes.ok) {
                return faviconUrl;
            }
        } catch (e) { }

    } catch (e) { }
    return null;
}

// Cache for manifest lookups
const manifestCache = new Map();
// Track active winget processes to kill them on new search
const activeManifestJobs = new Set();

app.get('/api/manifest', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.json({ success: false });

    if (manifestCache.has(id)) {
        return res.json(manifestCache.get(id));
    }

    // Run winget show
    // Use --accept-source-agreements just in case
    const cmd = `winget show --id "${id}" --accept-source-agreements --disable-interactivity`;

    exec(cmd, { encoding: 'utf8' }, async (err, stdout, stderr) => {
        if (err) {
            return res.json({ success: false });
        }

        // Extract ALL URLs from the output (in order of appearance)
        const urlRegex = /:\s+(https?:\/\/[^\s]+)/gi;
        const allUrls = [];
        let match;
        while ((match = urlRegex.exec(stdout)) !== null) {
            const url = match[1];
            // Clean up trailing characters that might be part of the line
            const cleanUrl = url.replace(/[,;)>\]]+$/, '');
            if (!allUrls.includes(cleanUrl)) {
                allUrls.push(cleanUrl);
            }
        }

        // Move GitHub URLs to end (they usually have GitHub's favicon, not app's)
        const nonGithubUrls = allUrls.filter(u => !u.includes('github.com') && !u.includes('github.io'));
        const githubUrls = allUrls.filter(u => u.includes('github.com') || u.includes('github.io'));
        const sortedUrls = [...nonGithubUrls, ...githubUrls];

        // Helper: Get root domain from hostname (remove subdomain)
        const getRootDomain = (hostname) => {
            const parts = hostname.split('.');
            // Handle special cases like co.uk, com.au etc.
            if (parts.length > 2) {
                return parts.slice(-2).join('.');
            }
            return hostname;
        };

        let domain = null;
        let iconUrl = null;
        let scrapeUrl = null;

        // Try each URL in order (non-GitHub first, then GitHub)
        for (const url of sortedUrls) {
            if (iconUrl) break; // Already found one

            try {
                const u = new URL(url);
                const hostname = u.hostname;

                // 1. Try full URL first
                scrapeUrl = url;
                domain = hostname;
                iconUrl = await scrapeIconFromUrl(url);

                // 2. If failed, try just the domain root
                if (!iconUrl) {
                    const domainRoot = `https://${hostname}`;
                    if (domainRoot !== url) {
                        scrapeUrl = domainRoot;
                        iconUrl = await scrapeIconFromUrl(domainRoot);
                    }
                }

                // 3. If still failed and has subdomain, try root domain
                if (!iconUrl) {
                    const rootDomain = getRootDomain(hostname);
                    if (rootDomain !== hostname) {
                        scrapeUrl = `https://${rootDomain}`;
                        domain = rootDomain;
                        iconUrl = await scrapeIconFromUrl(scrapeUrl);
                    }
                }
            } catch (e) { }
        }

        const result = { success: !!iconUrl, domain, url: scrapeUrl, iconUrl };
        manifestCache.set(id, result);
        res.json(result);
    });
});

// ==========================================
// ICON SCRAPER (SERVER SIDE)
// ==========================================
app.get('/api/scrape-icon', async (req, res) => {
    const domain = req.query.domain;
    if (!domain) return res.json({ success: false });

    // Use shared scraping logic
    // Construct simplified URL if only domain is passed
    const targetUrl = domain.startsWith('http') ? domain : `https://${domain}`;

    try {
        const url = await scrapeIconFromUrl(targetUrl);
        if (url) return res.json({ success: true, url });
        return res.json({ success: false });
    } catch (e) {
        return res.json({ success: false });
    }
});

// ==========================================
// SEARCH & LOGIC
// ==========================================
app.get('/api/search', async (req, res) => {
    const { q } = req.query;

    // START NEW SEARCH: Kill all pending icon fetches from previous searches
    // This frees up 'winget' to serve the new request's icons faster
    if (activeManifestJobs.size > 0) {
        // console.log(`[Search] New search detected. Killing ${activeManifestJobs.size} pending manifest jobs.`);
        for (const child of activeManifestJobs) {
            try { child.kill(); } catch (e) { }
        }
        activeManifestJobs.clear();
    }

    if (!q) return res.json({ success: true, results: [] });

    try {
        const results = await winget.search(q);
        res.json({ success: true, results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- JOBS (INSTALL/UNINSTALL/ETC) ---
app.get('/api/install', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'No ID provided' });

    // args: install --id <id> ...
    const jobId = jobs.startJob('winget', ['install', '--id', id, '--accept-source-agreements', '--accept-package-agreements', '--verbose']);
    res.json({ success: true, jobId });
});

app.get('/api/uninstall', (req, res) => {
    const { id, name } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'No ID provided' });

    // Use native Windows uninstall via registry (more reliable than winget for some apps)
    const scriptPath = path.join(__dirname, 'utils', 'native-uninstall.ps1');

    // Use the app name directly - it's more reliable than parsing IDs
    // The name comes from the GUI and is the actual display name
    const searchName = name || id.split('.').pop();

    const jobId = jobs.startJob('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-AppName', searchName, '-PackageId', id]);

    // Invalidate installed cache
    try {
        fs.unlinkSync(cache.FILES.installed);
    } catch (e) { }

    res.json({ success: true, jobId });
});

app.get('/api/update', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'No ID provided' });

    const jobId = jobs.startJob('winget', ['upgrade', '--id', id, '--accept-source-agreements', '--accept-package-agreements', '--verbose']);
    res.json({ success: true, jobId });
});

app.get('/api/download', (req, res) => {
    const { id, name } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'No ID provided' });

    // Determine download directory
    let targetDir = DOWNLOAD_DIR;
    if (name) {
        // Sanitize name for folder
        const safeName = name.replace(/[<>:"/\\|?*]/g, '').trim();
        if (safeName) {
            targetDir = path.join(DOWNLOAD_DIR, safeName);
        }
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const jobId = jobs.startJob('winget', ['download', '--id', id, '--download-directory', targetDir, '--accept-source-agreements', '--verbose']);
    res.json({ success: true, jobId });
});

app.get('/api/status', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'No Job ID' });

    const job = jobs.getJob(id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const output = jobs.getJobOutput(id) || "";

    res.json({
        success: job.done && job.exitCode === 0,
        done: job.done,
        output: output
    });
});

// --- ICON QUEUE ---
const iconQueue = []; // { res, args, iconPath }
let activeIconJobs = 0;
const MAX_CONCURRENT_ICONS = 2; // Keep low to prevent freeze

function processIconQueue() {
    if (activeIconJobs >= MAX_CONCURRENT_ICONS || iconQueue.length === 0) return;

    const activeJob = iconQueue.shift();
    activeIconJobs++;

    const { res, args, iconPath } = activeJob;

    // Safety timeout
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(504).send('Timeout');
            activeIconJobs--;
            processIconQueue();
        }
    }, 15000);

    const ps = spawn('powershell', args);

    let data = '';
    ps.stdout.on('data', chunk => data += chunk.toString());

    ps.on('close', code => {
        clearTimeout(timeout);
        const trimmed = data.trim();
        if (code === 0 && trimmed.length > 0) {
            try {
                // Decode Base64 and Save
                const buffer = Buffer.from(trimmed, 'base64');
                fs.writeFileSync(iconPath, buffer);
                if (!res.headersSent) res.sendFile(iconPath);
            } catch (e) {
                if (!res.headersSent) {
                    // Return generic transparent pixel with missing header
                    const empty = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
                    res.set('X-Icon-Missing', 'true');
                    res.type('image/gif').send(empty);
                }
            }
        } else {
            // Negative Cache: write a placeholder
            try {
                fs.writeFileSync(iconPath + '.404', '');
            } catch (e) { }

            if (!res.headersSent) {
                // Return generic transparent pixel with missing header
                const empty = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
                res.set('X-Icon-Missing', 'true');
                res.type('image/gif').send(empty);
            }
        }

        activeIconJobs--;
        processIconQueue();
    });

    ps.on('error', (err) => {
        clearTimeout(timeout);
        console.error("Spawn error:", err);
        // Also negative cache on spawn errors? Maybe temporary? 
        // Let's assume spawn errors might be transient or system load, but for now we won't cache them.
        if (!res.headersSent) {
            const empty = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.set('X-Icon-Missing', 'true');
            res.type('image/gif').send(empty);
        }
        activeIconJobs--;
        processIconQueue();
    });
}


// --- ICONS (LOCAL) ---
app.get('/api/icon', async (req, res) => {
    const { id, name, file } = req.query; // 'file' is the relative path from Downloads

    try {
        fs.appendFileSync(path.join(__dirname, 'server_debug.log'), `REQ: ${JSON.stringify(req.query)}\n`);
    } catch (e) { }

    if (!name && !file && !id) return res.status(400).send("No identifier provided");

    // Cache Key: ID > Name > File
    // Sanitize key for filesystem
    const rawKey = (id || name || file);
    const cacheKey = rawKey.replace(/[^a-zA-Z0-9.-]/g, '_');
    const iconPath = path.join(__dirname, 'data', 'icons', `${cacheKey}.png`);
    const iconDir = path.dirname(iconPath);

    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }

    if (fs.existsSync(iconPath)) {
        return res.sendFile(iconPath);
    }

    // Check Negative Cache
    if (fs.existsSync(iconPath + '.404')) {
        const empty = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set('X-Icon-Missing', 'true');
        return res.type('image/gif').send(empty);
    }

    const scriptPath = path.join(__dirname, 'utils', 'get-icon.ps1');
    let args = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath];

    if (file) {
        // Handle Downloaded File
        // Construct absolute path using DOWNLOAD_DIR
        const absPath = path.join(DOWNLOAD_DIR, file);
        args.push('-Path', absPath);
    } else {
        // Handle Installed App - pass both name and ID for better matching
        args.push('-AppName', name);
        if (id) {
            // Parse MSIX IDs to extract clean package name
            // Format: MSIX\Microsoft.AV1VideoExtension_2.0.6.0_x64__8wekyb3d8bbwe
            // Extract: Microsoft.AV1VideoExtension
            let cleanId = id;
            if (id.startsWith('MSIX\\') || id.startsWith('MSIX/')) {
                cleanId = id.substring(5); // Remove "MSIX\"
            }
            // Remove version and architecture suffix (everything after first underscore)
            if (cleanId.includes('_')) {
                cleanId = cleanId.split('_')[0];
            }
            // Also handle ARP format: ARP\Machine\X86\LTRM_15_0_1
            if (id.startsWith('ARP\\') || id.startsWith('ARP/')) {
                // For ARP, use just the last part as a hint
                const parts = id.split(/[\\\/]/);
                cleanId = parts[parts.length - 1];
            }
            args.push('-AppId', cleanId);
        }
    }

    // Add to Queue
    iconQueue.push({ res, args, iconPath });
    processIconQueue();
});


// --- DOWNLOADED FILES ---
function getFilesRecursive(dir, baseDir = dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            // Skip "Dependencies" folder
            if (file.toLowerCase() === 'dependencies') return;

            const fullPath = path.join(dir, file);
            try {
                const stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getFilesRecursive(fullPath, baseDir));
                } else {
                    if (/\.(exe|msi|zip|7z|rar|iso|msix|appx)$/i.test(file)) {
                        results.push({
                            Name: path.relative(baseDir, fullPath),
                            Length: stat.size,
                            // Ensure valid ISO string
                            LastWriteTime: stat.mtime ? stat.mtime.toISOString() : new Date().toISOString()
                        });
                    }
                }
            } catch (e) { }
        });
    } catch (e) { }
    return results;
}

app.get('/api/downloaded', (req, res) => {
    try {
        const files = getFilesRecursive(DOWNLOAD_DIR);
        cache.save('downloads', files);
        res.json({ success: true, files });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/downloaded/delete', (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).json({ success: false, message: 'No file' });

    // Check if file is in a subfolder (e.g. "AppName/file.exe")
    const parts = file.split(path.sep);
    const isSubfolder = parts.length > 1;

    try {
        if (isSubfolder) {
            // Delete the parent folder (e.g. "Downloads/AppName")
            // Security check: ensure no '..' to escape downloads
            if (file.includes('..')) throw new Error('Invalid path');

            const folderName = parts[0];
            const folderPath = path.join(DOWNLOAD_DIR, folderName);

            if (fs.existsSync(folderPath)) {
                fs.rmSync(folderPath, { recursive: true, force: true });
            }
        } else {
            // Just delete the file
            const filePath = path.join(DOWNLOAD_DIR, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Refresh cache
        const files = getFilesRecursive(DOWNLOAD_DIR);
        cache.save('downloads', files);

        res.json({ success: true, message: `Deleted ${file}` });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/downloaded/run', (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).json({ success: false, message: 'No file' });

    const filePath = path.join(DOWNLOAD_DIR, file);
    if (fs.existsSync(filePath)) {
        // Use PowerShell Start-Process to handle MSIX, UAC, etc. nicely
        // and wrap it in a job to provide feedback
        const jobId = jobs.startJob('powershell', ['-Command', 'Start-Process', '-FilePath', `'${filePath}'`, '-PassThru']);
        res.json({ success: true, jobId, message: `Launching ${file}` });
    } else {
        res.status(404).json({ success: false, message: 'File not found' });
    }
});

// Open folder containing downloaded file
app.get('/api/downloaded/open-folder', (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).json({ success: false, message: 'No file' });

    // Security check
    if (file.includes('..')) {
        return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    const filePath = path.join(DOWNLOAD_DIR, file);

    if (fs.existsSync(filePath)) {
        // Open Explorer and select the file - use start command to bring to foreground
        exec(`start explorer.exe /select,"${filePath}"`);
        res.json({ success: true });
    } else {
        // Just open the download directory
        exec(`start explorer.exe "${DOWNLOAD_DIR}"`);
        res.json({ success: true });
    }
});

// Start Server
// Start Server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`EasyWinGet Node Server running at http://127.0.0.1:${PORT}`);
    require('child_process').exec(`start http://127.0.0.1:${PORT}`);
});
