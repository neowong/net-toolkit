export default function AboutPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">关于</h1>
      <div className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">NetToolKit</h2>
          <p className="text-xs text-[hsl(var(--text-secondary))]">IT 运维日常小工具箱 · v1.0.0</p>
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
            <span>· 端口扫描</span>
            <span>· 路由跟踪</span>
            <span>· WEB 检测</span>
            <span>· SNMP</span>
            <span>· TFTP 服务</span>
            <span>· Syslog</span>
            <span>· 批量 Ping</span>
            <span>· DNS / Whois</span>
          </div>
        </div>
      </div>
    </div>
  );
}
