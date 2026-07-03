// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- DNS Query (placeholder) ------------------------------------------------

function DnsQuery() {
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className={labelClass}>域名</label>
          <input
            type="text" placeholder="example.com"
            className={`w-64 ${inputClass}`}
            style={{ imeMode: "disabled" }}
          />
        </div>
        <div>
          <label className={labelClass}>记录类型</label>
          <select className={`w-28 ${inputClass}`}>
            <option>A</option>
            <option>AAAA</option>
            <option>CNAME</option>
            <option>MX</option>
            <option>NS</option>
            <option>TXT</option>
          </select>
        </div>
        <button className={btnClass}>查询</button>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-[hsl(var(--text-tertiary))]">DNS / Whois 查询功能开发中...</p>
      </div>
    </div>
  );
}

export default function DnsQueryPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">DNS查询</h1>
      <DnsQuery />
    </div>
  );
}
