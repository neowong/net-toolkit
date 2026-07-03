export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">关于 NetToolKit</h1>
      <div className="rounded-lg border border-[hsl(var(--border))] p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">NetToolKit</h2>
          <p className="text-sm text-[hsl(var(--text-secondary))]">IT 运维日常小工具箱</p>
          <p className="text-xs text-[hsl(var(--text-tertiary))] mt-1">版本 1.0.0</p>
        </div>
        <div className="border-t border-[hsl(var(--border))] pt-4">
          <h3 className="text-sm font-medium mb-2">技术栈</h3>
          <p className="text-sm text-[hsl(var(--text-secondary))]">
            Tauri v2 · React 18 · TypeScript · TailwindCSS 3 · Rust
          </p>
        </div>
        <div className="border-t border-[hsl(var(--border))] pt-4">
          <h3 className="text-sm font-medium mb-2">内置工具</h3>
          <ul className="text-sm text-[hsl(var(--text-secondary))] space-y-1">
            <li>• 子网计算器 (IPv4/IPv6)</li>
            <li>• 存活扫描</li>
            <li>• 端口扫描 (TCP/UDP)</li>
            <li>• 路由跟踪</li>
            <li>• WEB 检测</li>
            <li>• SNMP (v2c/v3)</li>
            <li>• TFTP 服务</li>
            <li>• Syslog 接收器</li>
            <li>• 批量 Ping</li>
            <li>• DNS / Whois 查询</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
