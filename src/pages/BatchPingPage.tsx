// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- Batch Ping (placeholder) -----------------------------------------------

function BatchPing() {
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-80">
          <label className={labelClass}>目标列表 (每行一个 IP 或域名)</label>
          <textarea
            placeholder={"8.8.8.8\n114.114.114.114\nwww.baidu.com"}
            rows={6}
            className={`w-full ${inputClass} resize-y font-mono text-xs`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <button className={btnClass}>开始 Ping</button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-[hsl(var(--text-tertiary))]">批量 Ping 功能开发中...</p>
      </div>
    </div>
  );
}

export default function BatchPingPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">批量Ping</h1>
      <BatchPing />
    </div>
  );
}
