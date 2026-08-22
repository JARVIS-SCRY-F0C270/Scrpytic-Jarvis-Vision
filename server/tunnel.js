const { spawn } = require('child_process');
const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

let activeTunnel = null;
let publicUrl = 'https://dollars-anticipated-bar-bottle.trycloudflare.com';

async function startTunnel(port = 5000) {
  console.log(`[Tunnel] Starting Cloudflare High-Speed Zero-Password Tunnel on port ${port}...`);

  try {
    const cloudflaredProcess = spawn('npx.cmd', ['cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    cloudflaredProcess.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        publicUrl = match[0];
        console.log('====================================================');
        console.log('🚀 LIVE CLOUDFLARE PUBLIC LINK (NO PASSWORD REQUIRED):');
        console.log(`👉 ${publicUrl}`);
        console.log('====================================================');
      }
    });

    cloudflaredProcess.stderr.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        publicUrl = match[0];
        console.log('====================================================');
        console.log('🚀 LIVE CLOUDFLARE PUBLIC LINK (NO PASSWORD REQUIRED):');
        console.log(`👉 ${publicUrl}`);
        console.log('====================================================');
      }
    });

    return publicUrl;
  } catch (err) {
    console.warn('[Tunnel] Cloudflare tunnel start notice:', err.message);
    return publicUrl;
  }
}

function getPublicUrl() {
  return publicUrl;
}

module.exports = {
  startTunnel,
  getPublicUrl
};
