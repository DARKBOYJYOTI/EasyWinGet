const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'utils', 'get-icon.ps1');
console.log('Testing Script:', scriptPath);

// Test 1: Registry Mode (Notepad is usually not unistallable, try something common or generic)
// Try "Microsoft Edge" or "Google Chrome" or just "Paint".
// Actually, "Visual Studio Code" if available.
// Or just check if arguments work.

// Let's try to extract from a real file if possible, but I don't know paths.
// So let's try Registry mode with a query that MIGHT match.
// "Edge"
const args = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-AppName', 'Edge'];

console.log('Running Powershell...');
const child = spawn('powershell', args);

let stdout = '';
let stderr = '';

child.stdout.on('data', d => stdout += d.toString());
child.stderr.on('data', d => stderr += d.toString());

child.on('close', code => {
    console.log('Exit Code:', code);
    console.log('Stdout (Length):', stdout.length);
    console.log('Stdout (First 100):', stdout.trim().substring(0, 100));
    console.log('Stderr:', stderr);
});
