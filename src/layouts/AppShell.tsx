import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Calculator, Wifi, Plug, Route, Globe, Radio, Upload, FileText,
  Monitor, Search, Info,
} from "lucide-react";

import SubnetCalcPage from "../pages/SubnetCalcPage";
import LiveScanPage from "../pages/LiveScanPage";
import PortScanPage from "../pages/PortScanPage";
import TraceroutePage from "../pages/TraceroutePage";
import WebCheckPage from "../pages/WebCheckPage";
import SnmpPage from "../pages/SnmpPage";
import TftpPage from "../pages/TftpPage";
import SyslogPage from "../pages/SyslogPage";
import BatchPingPage from "../pages/BatchPingPage";
import DnsQueryPage from "../pages/DnsQueryPage";
import AboutPage from "../pages/AboutPage";

type PageKey = "subnet" | "scanner" | "port" | "trace" | "web" | "snmp" | "tftp" | "syslog" | "ping" | "dns" | "about";

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof Calculator;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "查询计算",
    items: [
      { key: "subnet",  label: "子网计算", icon: Calculator },
      { key: "dns",     label: "DNS查询",  icon: Search },
    ],
  },
  {
    label: "网络探测",
    items: [
      { key: "scanner", label: "存活扫描", icon: Wifi },
      { key: "port",    label: "端口检测", icon: Plug },
      { key: "trace",   label: "路由跟踪", icon: Route },
      { key: "ping",    label: "批量Ping", icon: Monitor },
    ],
  },
  {
    label: "协议工具",
    items: [
      { key: "web",    label: "WEB检测",  icon: Globe },
      { key: "snmp",   label: "SNMP",     icon: Radio },
      { key: "tftp",   label: "TFTP服务",  icon: Upload },
      { key: "syslog", label: "Syslog",   icon: FileText },
    ],
  },
];

const PAGES: Record<PageKey, JSX.Element> = {
  subnet:  <SubnetCalcPage />,
  scanner: <LiveScanPage />,
  port:    <PortScanPage />,
  trace:   <TraceroutePage />,
  web:     <WebCheckPage />,
  snmp:    <SnmpPage />,
  tftp:    <TftpPage />,
  syslog:  <SyslogPage />,
  ping:    <BatchPingPage />,
  dns:     <DnsQueryPage />,
  about:   <AboutPage />,
};

export default function AppShell() {
  const [active, setActive] = useState<PageKey>("subnet");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>("");

  // 启动时获取版本号并检查更新
  useEffect(() => {
    invoke<string>("get_app_version").then(ver => {
      setCurrentVersion(ver);
      return invoke<{ version: string; url: string } | null>("check_update", { currentVersion: ver });
    }).then(result => {
      if (result) setUpdateVersion(result.version);
    }).catch(() => { /* 静默忽略 */ });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "hsl(var(--bg-content))" }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-[180px] shrink-0 flex flex-col"
          style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
        >
          {/* Brand */}
          <div
            className="flex items-center h-11 border-b px-3 gap-2 select-none"
            style={{ borderColor: "hsl(var(--sidebar-hover))" }}
          >
            <img src="/router.svg" alt="NetToolKit" className="h-6 w-6 object-contain shrink-0" />
            <span className="text-[13px] font-bold text-white truncate">NetToolKit</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-1.5 overflow-y-auto sidebar-scroll">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-2.5" : ""}>
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "hsl(var(--sidebar-text-muted) / 0.6)" }}>
                  {group.label}
                </div>
                <div className="px-1.5 space-y-px">
                  {group.items.map(item => {
                    const isActive = active === item.key;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActive(item.key)}
                        className={`flex items-center gap-2.5 w-full select-none transition-all duration-150 rounded-md
                          px-2.5 h-[30px] ${isActive ? "font-medium" : "hover:bg-[hsl(var(--sidebar-hover))]"}`}
                        style={isActive
                          ? { backgroundColor: "hsl(var(--sidebar-active))", color: "hsl(var(--accent-foreground))" }
                          : { color: "hsl(var(--sidebar-text-muted))" }
                        }
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="text-[12px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom: About */}
          <div className="px-1.5 pb-1.5 border-t" style={{ borderColor: "hsl(var(--sidebar-hover))" }}>
            <button
              onClick={() => setActive("about")}
              className={`flex items-center gap-2.5 w-full px-2.5 h-[30px] mt-1 rounded-md text-[12px] transition-colors
                ${active === "about" ? "font-medium" : "hover:bg-[hsl(var(--sidebar-hover))]"}`}
              style={active === "about"
                ? { backgroundColor: "hsl(var(--sidebar-active))", color: "hsl(var(--accent-foreground))" }
                : { color: "hsl(var(--sidebar-text-muted))" }
              }
            >
              <Info size={14} />
              <span>关于</span>
            </button>
          </div>
        </aside>

        {/* Content — 所有页面保持挂载，用 hidden 切换，保留状态 */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: "hsl(var(--bg-content))" }}>
          {(Object.keys(PAGES) as PageKey[]).map(key => (
            <div key={key} hidden={active !== key} className="animate-in p-4">
              {PAGES[key]}
            </div>
          ))}
        </main>
      </div>

      {/* Status bar */}
      <footer
        className="h-6 shrink-0 flex items-center px-3 text-[11px] gap-3 select-none"
        style={{ backgroundColor: "hsl(var(--sidebar-bg))", color: "hsl(var(--sidebar-text-muted))", borderColor: "hsl(var(--sidebar-hover))", borderTopWidth: 1 }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--success))" }} />
          就绪
        </span>
        {updateVersion && (
          <button
            onClick={() => setActive("about")}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}
            title="点击查看详情"
          >
            🆕 v{updateVersion}
          </button>
        )}
        <span className="flex-1" />
        <span>{currentVersion ? `v${currentVersion}` : ''}</span>
      </footer>
    </div>
  );
}
