#!/bin/bash
# Clawdbot WSL Restart Script
# Run this via: wsl ~/clawdbot-watchdog/restart.sh

# Prevent clawdbot from adding --disable-warning flags
export CLAWDBOT_NODE_OPTIONS_READY=1

# Clear any problematic NODE_OPTIONS
unset NODE_OPTIONS
unset NPM_CONFIG_NODE_OPTIONS

# Restart via systemd service (cleaner than pkill)
clawdbot gateway restart
