# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**net-toolkit** — 网络工程师工具箱 (Network Engineer Toolkit)

A Tauri v2 desktop app with a plain HTML/CSS/JS frontend and a Rust backend. Features: subnet calculator, concurrent IP scanner, and HTTP status checker.

## Commands

```bash
# Development (hot-reload)
cargo tauri dev

# Release build
cargo tauri build

# Compile backend only (faster iteration)
cargo build -p net-toolkit

# Run backend tests
cargo test -p net-toolkit
```

> `cargo tauri` requires `@tauri-apps/cli` installed via npm/pnpm, or use `npx tauri`.

## Architecture

```
/
├── Cargo.toml            # Workspace root (member: src-tauri)
├── ui/                   # Frontend — plain static files, no bundler
│   ├── index.html
│   ├── app.js            # Vanilla JS, uses window.__TAURI__ APIs
│   └── style.css
├── src-tauri/            # Tauri backend (Rust)
│   ├── tauri.conf.json   # frontendDist: "../ui", withGlobalTauri: true
│   └── src/
│       ├── lib.rs        # Tauri commands + ScanState managed state
│       ├── subnet.rs     # Subnet calculation (ipnetwork crate)
│       ├── scanner.rs    # Concurrent ping scan (tokio + system ping)
│       └── http_check.rs # HTTP status check (reqwest + rustls)
└── src/                  # Legacy Slint prototype — not used by Tauri
```

## Key Design Decisions

**Frontend ↔ Backend communication:**
- Regular commands use `invoke(command_name, args)` → returns `Promise`
- IP scan uses Tauri events: backend emits `"scan-result"` per host; frontend calls `listen("scan-result", cb)` for real-time streaming
- `withGlobalTauri: true` in `tauri.conf.json` injects `window.__TAURI__` without any JS import

**Scanner stop mechanism:**
- `ScanState { stop_flag: Arc<Mutex<bool>> }` is registered via `.manage()` and injected into `stop_scan` command
- The scan loop checks `stop_flag` and exits early when set

**Scanner does not require root** — uses system `ping` binary (which has setuid on Linux/macOS).

**HTTP result categories** (used for color-coding in the UI):
- `1` = 2xx, `2` = 3xx, `3` = 4xx, `4` = 5xx, `0` = error/unreachable

**No frontend build step** — `ui/` contains raw files served directly; `tauri.conf.json` points `frontendDist` at `../ui`.
