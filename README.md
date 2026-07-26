# Moltbot Watchdog

A small Telegram bot that monitors the moltbot gateway and can restart it on Windows
and WSL.

> ⚠️ Disclaimer: This repo is fully vibe‑coded. It may contain bugs, rough edges, or
> surprising behavior. Use at your own risk, review the code before running it, and test
> in a safe environment first.

## Features

- /status shows Windows + WSL gateway health
- /restart-windows restarts the Windows gateway
- /restart-wsl restarts the WSL gateway (optional)

## Requirements

- Node.js 18+ (or recent LTS)
- A Telegram bot token
- Moltbot installed and available on PATH (Windows and/or WSL)
- PowerShell (for Windows health check)

## Install (humans)

1) Clone or download this folder

2) Install dependencies

```powershell
npm install
```

3) Create environment variables (recommended)

```powershell
$env:BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
$env:CHAT_ID="YOUR_TELEGRAM_USER_ID"
```

Or create a `.env` file (copy from `.env.example`) and load it in your shell or process
manager.

4) Start the watchdog

```powershell
node .\watchdog-bot.js
```

5) In Telegram, talk to your bot:

- /start
- /status
- /restart-windows
- /restart-wsl (only on Windows)

## Install (agents)

Copy/paste this into your agent:

```
Please set up the Moltbot Watchdog in this repo folder.

Goal:
- Ensure watchdog-bot.js runs and responds to /status and /restart-windows.

Steps:
1) Install dependencies: npm install
2) Set env vars: BOT_TOKEN and CHAT_ID
3) Start the bot: node .\watchdog-bot.js

Notes:
- The Windows health check script is .\check-health.ps1
- The WSL restart script is .\wsl-moltbot-restart.sh
```

## Configuration

Set these environment variables:

- BOT_TOKEN: Telegram bot token
- CHAT_ID: Your Telegram user ID

Optional:

- GATEWAY_PORT: defaults to 18789
- WSL_RESTART_SCRIPT: defaults to ~/moltbot-watchdog/restart.sh

Example `.env`:

```
BOT_TOKEN=123456:ABCDEF...
CHAT_ID=123456789
GATEWAY_PORT=18789
WSL_RESTART_SCRIPT=~/moltbot-watchdog/restart.sh
```

## WSL restart script

The bot will try to run this inside WSL:

```
~/moltbot-watchdog/restart.sh
```

If it does not exist, it will auto-copy:

```
.\wsl-moltbot-restart.sh -> ~/moltbot-watchdog/restart.sh
```

## Troubleshooting

- If /status shows Windows Gateway Offline, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\check-health.ps1 -Port 18789
```

- If /restart-windows does not start the gateway, run:

```powershell
moltbot gateway run
```

- If WSL restart fails, ensure Moltbot is installed in WSL and restart.sh is executable.

## Security

The bot is locked to a single Telegram user ID (CHAT_ID). Do not share your BOT_TOKEN.

## Support

If this project helps you, you can sponsor it here:

```
https://ko-fi.com/lazybutai
```

## Work with me

Want a custom plugin or automation built? Reach out:

```
https://x.com/lazybutai
```

## Contributing

This project is open for everyone. Feel free to fork it, modify it, break it, or fix it.
