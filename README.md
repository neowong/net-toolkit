# NetToolKit

IT 运维桌面工具箱 — 10 个常用网络工具，开箱即用。

基于 Rust + Tauri v2 构建，轻量、快速、跨平台。

## 功能

| 工具 | 说明 |
|------|------|
| 子网计算 | IPv4/IPv6 子网计算，二进制展示 |
| 存活扫描 | ping + TCP 后备探测，实时结果 |
| 端口检测 | TCP/UDP 端口扫描，常用端口预设 |
| 路由跟踪 | 系统 traceroute + 离线 IP 归属地 |
| WEB 检测 | HTTP 健康检查，批量 URL |
| SNMP | v2c/v3 GET 查询，常见 OID 预设 |
| TFTP 服务 | 内置 TFTP 服务器，支持上传/下载 |
| Syslog | UDP Syslog 实时接收 |
| 批量 Ping | 并发 ping，延迟图表，CSV 导出 |
| DNS / Whois | A/AAAA/MX/NS/TXT/SOA/SRV/PTR/CAA + Whois |

## 下载

从 [Releases](https://github.com/neowong/net-toolkit/releases) 下载对应平台的安装包：

| 平台 | 格式 |
|------|------|
| macOS (Apple Silicon) | `.dmg` |
| Ubuntu / Debian | `.deb` |
| Windows | `.msi` |

## 开发

```bash
# 安装依赖
npm install

# 前端开发 (port 1420)
npm run dev

# 桌面端开发 (另开终端)
npx tauri dev

# 类型检查
npx tsc --noEmit

# Rust 检查
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

# 构建安装包
npx tauri build
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + Vite + TypeScript + TailwindCSS 3 |
| 后端 | Rust (tokio, trust-dns-resolver, reqwest) |

## 项目结构

```
net-toolkit/
├── src/                          # React 前端
│   ├── pages/                    # 10 个工具页面 + 关于
│   ├── components/ui/            # 通用组件
│   ├── layouts/AppShell.tsx      # 侧边栏 + 内容区
│   └── lib/                      # 工具函数
├── src-tauri/                    # Rust 后端
│   ├── src/commands/tools.rs     # Tauri 命令
│   ├── src/services/             # 工具服务实现
│   └── Cargo.toml
└── .github/workflows/            # CI/CD
```

## 许可证

MIT
