#!/usr/bin/env node
/**
 * Moltbot Watchdog Bot
 *
 * Setup:
 *   npm install node-telegram-bot-api
 *   node watchdog-bot.js
 *
 * Commands:
 *   /status - Check gateway health
 *   /restart-windows - Restart Windows Moltbot
 *   /restart-wsl - Restart WSL Moltbot
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn } = require('child_process');
const os = require('os');
const path = require('path');

const CONFIG = {
  botToken: process.env.BOT_TOKEN,
  allowedUserId: process.env.CHAT_ID,
  gatewayPort: Number(process.env.GATEWAY_PORT || 18789),
  wslScriptPath: process.env.WSL_RESTART_SCRIPT || '~/moltbot-watchdog/restart.sh'
};

if (!CONFIG.botToken || !CONFIG.allowedUserId) {
  console.error('Missing BOT_TOKEN or CHAT_ID environment variables.');
  process.exit(1);
}

const bot = new TelegramBot(CONFIG.botToken, { polling: true });
const IS_WINDOWS = os.platform() === 'win32';

function checkGateway(port) {
  if (!IS_WINDOWS) {
    return new Promise((resolve) => {
      const req = require('http').get(`http://127.0.0.1:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
  }
  return new Promise((resolve) => {
    const scriptPath = path.resolve(__dirname, 'check-health.ps1');
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Port ${port}`;
    exec(cmd, { timeout: 10000 }, (err, stdout) => {
      if (err) resolve(false);
      else resolve(stdout.trim() === 'OK');
    });
  });
}

function checkWslGateway(port) {
  if (!IS_WINDOWS) return Promise.resolve(false);
  return new Promise((resolve) => {
    const cmd = 'wsl -e bash -l -c "moltbot gateway health 2>&1 | grep -q \\"OK\\" && echo OK || echo FAIL"';
    exec(cmd, { timeout: 10000 }, (err, stdout) => {
      if (err) resolve(false);
      else resolve(stdout.trim() === 'OK');
    });
  });
}

function checkGatewayWithRetry(port, maxRetries = 3, delayMs = 3000) {
  return new Promise(async (resolve) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const isOnline = await checkGateway(port);
      if (isOnline) {
        resolve(true);
        return;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    resolve(false);
  });
}

function checkWslGatewayWithRetry(port, maxRetries = 3, delayMs = 3000) {
  return new Promise(async (resolve) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const isOnline = await checkWslGateway(port);
      if (isOnline) {
        resolve(true);
        return;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    resolve(false);
  });
}

function runWindowsRestart() {
  return new Promise((resolve) => {
    console.log('[WINDOWS] Restarting...');
    const child = spawn(
      'cmd.exe',
      ['/c', 'start', '""', '/min', 'moltbot', 'gateway', 'run'],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();
    console.log('[WINDOWS] Started gateway (detached)');
    setTimeout(() => resolve(true), 2000);
  });
}

function runWslRestart() {
  return new Promise((resolve, reject) => {
    const cmd = buildWslRestartCommand();
    console.log('[WSL] Running:', cmd);
    exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        console.log('[WSL] Error:', stderr || err.message);
        reject(new Error(stderr || err.message));
      } else {
        console.log('[WSL] Done');
        resolve(true);
      }
    });
  });
}

function toWslPath(winPath) {
  const drive = winPath.slice(0, 2).toLowerCase();
  const rest = winPath.slice(2).replace(/\\/g, '/');
  return `/mnt/${drive[0]}${rest}`;
}

function buildWslRestartCommand() {
  const target = CONFIG.wslScriptPath;
  const winScript = path.resolve(__dirname, 'wsl-moltbot-restart.sh');
  const wslWinScript = toWslPath(winScript);
  const bash = [
    'TARGET="' + target + '"',
    'WIN_SCRIPT="' + wslWinScript + '"',
    'if [ ! -f "$TARGET" ] && [ -f "$WIN_SCRIPT" ]; then',
    '  mkdir -p "$(dirname "$TARGET")"',
    '  cp "$WIN_SCRIPT" "$TARGET" >/dev/null 2>&1 || true',
    '  chmod +x "$TARGET" >/dev/null 2>&1 || true',
    'fi',
    'if [ -f "$TARGET" ]; then',
    '  "$TARGET"',
    'elif [ -f "$WIN_SCRIPT" ]; then',
    '  bash "$WIN_SCRIPT"',
    'else',
    '  echo "Missing WSL restart script" >&2; exit 1',
    'fi'
  ].join('; ');
  return `wsl -e bash -l -c "${bash}"`;
}

function isAuthorized(msg) {
  return msg.chat && msg.chat.id.toString() === CONFIG.allowedUserId.toString();
}

bot.onText(/\/start/, (msg) => {
  if (!isAuthorized(msg)) return;
  bot.sendMessage(msg.chat.id,
    `🐕 Moltbot Watchdog\n\n` +
    `Commands:\n` +
    `/status - Check gateway health\n` +
    `/restart-windows - Restart Windows gateway\n` +
    (IS_WINDOWS ? `/restart-wsl - Restart WSL gateway\n` : '') +
    `\nRunning on: ${os.type()}`
  );
});

bot.onText(/\/(status|check)/, async (msg) => {
  if (!isAuthorized(msg)) return;

  const statusMsg = await bot.sendMessage(msg.chat.id, '🔍 Checking status...');

  try {
    const [isOnline, isWslOnline] = await Promise.all([
      checkGateway(CONFIG.gatewayPort),
      IS_WINDOWS ? checkWslGateway(CONFIG.gatewayPort) : Promise.resolve(false)
    ]);

    const status =
      `🔍 WATCHDOG STATUS\n\n` +
      `System: ${os.type()} ${os.release()}\n\n` +
      `Windows Gateway: ${isOnline ? '✅ Online' : '❌ Offline'}\n` +
      (IS_WINDOWS ? `WSL Gateway: ${isWslOnline ? '✅ Online' : '❌ Offline'}` : '');

    bot.editMessageText(status, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id
    });
  } catch (err) {
    bot.editMessageText(`Error: ${err.message}`, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id
    });
  }
});

bot.onText(/\/restart-windows/, async (msg) => {
  if (!isAuthorized(msg)) return;
  const restartMsg = await bot.sendMessage(msg.chat.id, '🔄 Restarting Windows Moltbot...');

  try {
    await runWindowsRestart();

    const isOnline = await checkGatewayWithRetry(CONFIG.gatewayPort, 4, 3000);

    if (isOnline) {
      bot.sendMessage(msg.chat.id, '✅ Windows Moltbot restarted successfully!');
    } else {
      bot.sendMessage(msg.chat.id, '⚠️ Restart command sent, but gateway is not responding. Check logs or try /status later.');
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message.slice(0, 200)}`);
  }
});

bot.onText(/\/restart-wsl/, async (msg) => {
  if (!isAuthorized(msg)) return;
  if (!IS_WINDOWS) return bot.sendMessage(msg.chat.id, 'WSL commands only work on Windows.');
  await bot.sendMessage(msg.chat.id, '🔄 Restarting WSL Moltbot...');

  try {
    await runWslRestart();
    const isWslOnline = await checkWslGatewayWithRetry(CONFIG.gatewayPort, 4, 3000);

    if (isWslOnline) {
      bot.sendMessage(msg.chat.id, '✅ WSL Moltbot restarted successfully!');
    } else {
      bot.sendMessage(msg.chat.id, '⚠️ Restart command sent, but WSL gateway is not responding. Check logs or try /status later.');
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message.slice(0, 200)}`);
  }
});

bot.on('polling_error', (err) => {
  if (err.code === 'ETELEGRAM' && err.message.includes('409')) {
    console.error('Another bot instance is running! Exiting...');
    process.exit(1);
  }
  console.error('Polling error:', err.message);
});

process.on('uncaughtException', (err) => console.error('Uncaught:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled:', err));

console.log('🐕 Watchdog bot started!');
console.log(`   Authorized user: ${CONFIG.allowedUserId}`);
