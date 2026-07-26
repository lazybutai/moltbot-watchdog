#!/bin/bash
# Moltbot WSL Restart Script
# Run this via: wsl ~/moltbot-watchdog/restart.sh

# Prevent Moltbot from adding --disable-warning flags
export MOLTBOT_NODE_OPTIONS_READY=1

# Clear any problematic NODE_OPTIONS
unset NODE_OPTIONS
unset NPM_CONFIG_NODE_OPTIONS

# Restart via systemd service (cleaner than pkill)
moltbot gateway restart
