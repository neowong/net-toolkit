import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, ExternalLink } from "lucide-react";

interface UpdateInfo {
  version: string;
  url: string;
  body: string;
}

export default function AboutPage() {
  const [currentVersion, setCurrentVersion] = useState("");
  const [osInfo, setOsInfo] = useState({ os: "", os_version: "" });
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    invoke<string>("get_app_version").then(setCurrentVersion);
    invoke<{ os: string; os_version: string }>("get_os_info").then(setOsInfo);
    // 自动检查一次
    doCheck();
  }, []);

  const doCheck = async () => {
    setChecking(true);
    try {
      const ver = await invoke<string>("get_app_version");
      const result = await invoke<UpdateInfo | null>("check_update", { currentVersion: ver });
      setUpdateInfo(result);
    } catch { /* ignore */ }
    setChecking(false);
    setChecked(true);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold mb-3">关于</h1>

      {/* 更新横幅 */}
      {updateInfo && (
        <div className="rounded-lg border border-[hsl(var(--accent)_/_0.3)] bg-[hsl(var(--accent)_/_0.06)] p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--accent))]">
              新版本 v{updateInfo.version} 可用
            </p>
            {updateInfo.body && (
              <p className="text-xs text-[hsl(var(--text-secondary))] mt-1 line-clamp-2">
                {updateInfo.body}
              </p>
            )}
          </div>
          <a
            href={updateInfo.url.startsWith("https://github.com/") ? updateInfo.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 ml-3 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 flex items-center gap-1"
          >
            <ExternalLink size={12} /> 前往下载
          </a>
        </div>
      )}

      <div className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">NetToolKit</h2>
            <p className="text-xs text-[hsl(var(--text-secondary))]">IT 运维日常小工具箱</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-[hsl(var(--text-primary))]">v{currentVersion}</p>
            <p className="text-[10px] text-[hsl(var(--text-tertiary))]">
              {osInfo.os} {osInfo.os_version}
            </p>
          </div>
        </div>

        <div className="border-t border-[hsl(var(--border))] pt-3">
          <h3 className="text-xs font-medium mb-1.5 text-[hsl(var(--text-secondary))]">技术栈</h3>
          <p className="text-xs text-[hsl(var(--text-tertiary))]">
            Tauri v2 · React 18 · TypeScript · TailwindCSS 3 · Rust
          </p>
        </div>

        <div className="border-t border-[hsl(var(--border))] pt-3">
          <h3 className="text-xs font-medium mb-1.5 text-[hsl(var(--text-secondary))]">内置工具</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-[hsl(var(--text-tertiary))]">
            <span>· 子网计算器</span>
            <span>· 存活扫描</span>
            <span>· 端口检测</span>
            <span>· 路由跟踪</span>
            <span>· WEB 检测</span>
            <span>· SNMP</span>
            <span>· TFTP 服务</span>
            <span>· Syslog</span>
            <span>· 批量 Ping</span>
            <span>· DNS / Whois</span>
          </div>
        </div>

        <div className="border-t border-[hsl(var(--border))] pt-3 flex items-center justify-between">
          <p className="text-xs text-[hsl(var(--text-tertiary))]">
            {checked && !updateInfo ? "✓ 已是最新版本" : ""}
          </p>
          <button
            onClick={doCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-hover))] disabled:opacity-50"
          >
            <RefreshCw size={12} className={checking ? "animate-spin" : ""} />
            {checking ? "检查中..." : "检查更新"}
          </button>
        </div>
      </div>
    </div>
  );
}
