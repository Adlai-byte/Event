const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Load .env file manually so EXPO_PUBLIC_API_BASE_URL is available before Expo starts
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const expoArgs = process.argv.slice(2);

function getIpCandidates() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!net) {
        continue;
      }
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (!isIPv4 || net.internal) {
        continue;
      }
      const address = net.address;
      const isPrivate =
        /^10\./.test(address) ||
        /^192\.168\./.test(address) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(address);
      if (!isPrivate) {
        continue;
      }

      const lowerName = (name || '').toLowerCase();
      let score = 1;
      if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wlan')) {
        score = 4;
      } else if (lowerName.includes('ethernet') || lowerName.includes('eth') || lowerName.includes('lan')) {
        score = 3;
      } else if (
        lowerName.includes('virtual') ||
        lowerName.includes('vbox') ||
        lowerName.includes('vmware') ||
        lowerName.includes('loopback')
      ) {
        score = 0;
      }

      candidates.push({ address, name, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.filter((c) => c.score > 0);
}

function detectIPv4() {
  const candidates = getIpCandidates();
  return candidates.length > 0 ? candidates[0] : null;
}

// Use VPS URL for API (production server)
// If you want to use local server for development, set EXPO_PUBLIC_API_BASE_URL in .env file
if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://72.62.64.59:3001';
  console.log('🌐 Using VPS API base URL: http://72.62.64.59:3001');
  console.log('   (Set EXPO_PUBLIC_API_BASE_URL in .env file to override)');
} else {
  console.log(`🌐 Using API base URL from environment: ${process.env.EXPO_PUBLIC_API_BASE_URL}`);
}

// Optional: Show detected local IP for reference (not used for API)
const selected = detectIPv4();
if (selected?.address) {
  console.log(`   Detected local IPv4 (${selected?.name || 'unknown adapter'}): ${selected.address}`);
}

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npx';
const commandArgs = isWindows ? ['/c', 'npx', 'expo', 'start', ...expoArgs] : ['expo', 'start', ...expoArgs];

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

