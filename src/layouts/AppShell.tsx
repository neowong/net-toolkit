import { useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Calculator, Wifi, Plug, Route, Globe, Radio, Upload, FileText,
  Monitor, Search, Info,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: typeof Calculator;
}

const NAV_ITEMS: NavItem[] = [
  { key: "subnet",  label: "子网计算", path: "/subnet",  icon: Calculator },
  { key: "scanner", label: "存活扫描", path: "/scanner", icon: Wifi },
  { key: "port",    label: "端口扫描", path: "/port",    icon: Plug },
  { key: "trace",   label: "路由跟踪", path: "/trace",   icon: Route },
  { key: "web",     label: "WEB检测",  path: "/web",     icon: Globe },
  { key: "snmp",    label: "SNMP",     path: "/snmp",    icon: Radio },
  { key: "tftp",    label: "TFTP服务",  path: "/tftp",    icon: Upload },
  { key: "syslog",  label: "Syslog",   path: "/syslog",  icon: FileText },
  { key: "ping",    label: "批量Ping",  path: "/ping",    icon: Monitor },
  { key: "dns",     label: "DNS查询",   path: "/dns",     icon: Search },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = useMemo(
    () => NAV_ITEMS.find(item => location.pathname.startsWith(item.path))?.key ?? null,
    [location.pathname]
  );

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
            <div className="px-1.5 space-y-px">
              {NAV_ITEMS.map(item => {
                const active = activeKey === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2.5 w-full select-none transition-all duration-150 rounded-md
                      px-2.5 h-[30px] ${active ? "font-medium" : "hover:bg-[hsl(var(--sidebar-hover))]"}`}
                    style={active
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
          </nav>

          {/* Bottom: About */}
          <div className="px-1.5 pb-1.5 border-t" style={{ borderColor: "hsl(var(--sidebar-hover))" }}>
            <button
              onClick={() => navigate("/about")}
              className="flex items-center gap-2.5 w-full px-2.5 h-[30px] mt-1 rounded-md text-[12px] transition-colors hover:bg-[hsl(var(--sidebar-hover))]"
              style={{ color: "hsl(var(--sidebar-text-muted))" }}
            >
              <Info size={14} />
              <span>关于</span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: "hsl(var(--bg-content))" }}>
          <div className="animate-in p-4">
            <Outlet />
          </div>
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
        <span className="flex-1" />
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}
