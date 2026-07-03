# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NetToolKit — IT 运维桌面工具箱。10 个常用网络工具，基于 Rust + Tauri v2 构建。

## Tech Stack

- **Desktop**: Tauri v2
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS 3
- **Backend (Rust)**: tokio, trust-dns-resolver, reqwest, serde, chrono, regex, xdb-parse
- **UI**: lucide-react icons
- **Build**: `npx tauri dev` / `npx tauri build`

## Architecture

```
net-toolkit/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry: App (no router)
│   ├── App.tsx                   # Renders AppShell
│   ├── layouts/AppShell.tsx      # Sidebar + hidden pages (state preserved)
│   ├── pages/                    # 10 tool pages + About
│   ├── components/ui/            # Shared components (Input, etc.)
│   └── index.css                 # CSS variables, theming
├── src-tauri/                    # Rust backend
│   ├── src/main.rs               # Panic hook + run()
│   ├── src/lib.rs                # AppState + Tauri builder + command registration
│   ├── src/commands/tools.rs     # All Tauri commands
│   └── src/services/             # Tool implementations
│       ├── live_scanner.rs       # Host discovery (ping + TCP fallback)
│       ├── port_scanner.rs       # TCP/UDP port scanning
│       ├── web_checker.rs        # HTTP health check
│       ├── snmp_checker.rs       # SNMP v2c/v3
│       ├── ip_location.rs        # Offline IP geolocation (ip2region)
│       ├── batch_ping.rs         # Concurrent ping with events
│       ├── dns_resolver.rs       # DNS lookup (trust-dns-resolver)
│       └── whois_client.rs       # Whois via TCP
└── .github/workflows/            # CI (check) + Release (multi-platform)
```

## Key Patterns

- **All pages stay mounted** — use `hidden` attribute, not route unmounting, to preserve state (TFTP/Syslog servers, ping results)
- **Real-time results** — Rust backend emits Tauri events (`app.emit()`), frontend listens with `listen()` for live updates
- **No database** — settings stored in local JSON, IP geolocation uses offline xdb file
- **AppState** only holds `ip_db` (Arc<RwLock<Option>>)

## Commands

```bash
npm install              # Install deps
npx tsc --noEmit         # TypeScript check
npm run build            # Frontend build
npx tauri dev            # Desktop dev mode
npx tauri build          # Production installer
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

## Tool → Command → Service Mapping

| Tool | Tauri Command | Service |
|------|---------------|---------|
| 存活扫描 | `scan_live_hosts` | `live_scanner.rs` |
| 端口检测 | `scan_ports` / `scan_udp_ports` | `port_scanner.rs` |
| 路由跟踪 | `trace_route` | `tools.rs` (calls system traceroute) |
| WEB 检测 | `check_web_urls` | `web_checker.rs` |
| SNMP | `snmp_get` / `snmp_v3_get` | `snmp_checker.rs` |
| TFTP | `start_tftp_server` / `stop_tftp_server` | `tools.rs` |
| Syslog | `start_syslog_server` / `stop_syslog_server` | `tools.rs` |
| 批量 Ping | `batch_ping` | `batch_ping.rs` |
| DNS 查询 | `dns_lookup` | `dns_resolver.rs` |
| Whois | `whois_lookup` | `whois_client.rs` |
| IP 归属地 | `download_ip_db` / `has_ip_db` | `ip_location.rs` |
