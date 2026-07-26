# Agent Notes

This document is written for agent assistants or power users who want guidance
for non-Windows setups, edge cases, and alternative restart strategies.

## macOS notes

- Health checks: prefer HTTP GET to the gateway health endpoint or the CLI
  `clawdbot gateway health` if available.
- Restart strategy:
  - If you run the gateway manually, use `nohup clawdbot gateway run >/tmp/clawdbot.log 2>&1 &`
    to detach.
  - If you run it via a supervisor, restart through launchd or a process manager.
- PATH issues: if a bot runs as a service, PATH may be minimal. Use absolute paths
  in the restart command or run via `/bin/zsh -lc "clawdbot gateway run"`.

## Linux notes

- Health checks:
  - HTTP health is best: `http://127.0.0.1:<port>/health`
  - CLI fallback: `clawdbot gateway health`
- Restart strategy:
  - systemd: `systemctl restart clawdbot-gateway.service`
  - user service: `systemctl --user restart clawdbot-gateway.service`
  - manual: `nohup clawdbot gateway run >/tmp/clawdbot.log 2>&1 &`
- Permissions:
  - systemd restart may require sudo or membership in the right group.
  - If using sudo, whitelist the exact command with `sudoers`.

## WSL notes

- Preferred: keep a dedicated restart script in WSL (default path used by bot):
  `~/clawdbot-watchdog/restart.sh`
- The Windows bot will auto-copy `wsl-clawdbot-restart.sh` to that path if missing.
- Ensure Clawdbot is installed inside WSL and available on PATH.
- If `wsl` is slow to start, extend the restart timeout.

## Gateway port

- Default port is 18789 (set in .env or environment variables).
- If your gateway uses a custom port, set `GATEWAY_PORT` and make sure the health
  check uses that same port.

## Edge cases and ideas

- Gateway CLI hangs: rely on HTTP health or TCP connect fallback.
- Multiple gateways: clone the bot or make a multi-instance version; use separate
  bot tokens and ports.
- Restart verification: perform retry checks after restart (already implemented).
- Safe exit: if the watchdog is stopped, the gateway should keep running (detached
  spawn is required on Windows).
