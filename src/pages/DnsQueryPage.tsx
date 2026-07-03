import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Copy, Check } from "lucide-react";

interface DnsRecord {
  record_type: string;
  name: string;
  value: string;
  ttl: number | null;
  priority: number | null;
}

interface DnsResult {
  domain: string;
  records: DnsRecord[];
  error: string | null;
}

interface WhoisResult {
  domain: string;
  raw_text: string;
  fields: { key: string; value: string }[];
  error: string | null;
}

const RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "SOA", "SRV", "PTR", "CAA", "ALL"];

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

export default function DnsQueryPage() {
  const [domain, setDomain] = useState("google.com");
  const [recordType, setRecordType] = useState("ALL");
  const [mode, setMode] = useState<"dns" | "whois">("dns");
  const [loading, setLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsResult | null>(null);
  const [whoisResult, setWhoisResult] = useState<WhoisResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleQuery = async () => {
    setError("");
    setDnsResult(null);
    setWhoisResult(null);
    setLoading(true);

    try {
      if (mode === "dns") {
        const data = await invoke<DnsResult>("dns_lookup", {
          domain: domain.trim(),
          recordType,
        });
        setDnsResult(data);
      } else {
        const data = await invoke<WhoisResult>("whois_lookup", {
          domain: domain.trim(),
        });
        setWhoisResult(data);
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">DNS / Whois 查询</h1>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("dns"); setDnsResult(null); setWhoisResult(null); }}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === "dns"
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
          }`}
        >
          DNS 查询
        </button>
        <button
          onClick={() => { setMode("whois"); setDnsResult(null); setWhoisResult(null); }}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === "whois"
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
          }`}
        >
          Whois 查询
        </button>
      </div>

      {/* Input */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">域名</label>
          <input
            type="text" placeholder="example.com"
            value={domain} onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuery()}
            className={`w-64 ${inputClass}`}
            style={{ imeMode: "disabled" }}
          />
        </div>
        {mode === "dns" && (
          <div className="flex gap-1.5 flex-wrap">
            {RECORD_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setRecordType(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  recordType === t
                    ? "bg-[hsl(var(--accent)_/_0.15)] text-[hsl(var(--accent))]"
                    : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <button onClick={handleQuery} disabled={loading} className={btnClass}>
          {loading ? "查询中..." : mode === "dns" ? "DNS 查询" : "Whois 查询"}
        </button>
      </div>

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {/* DNS Results */}
      {dnsResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              {dnsResult.domain} — 找到 {dnsResult.records.length} 条记录
            </p>
            <button
              onClick={() => copyToClipboard(dnsResult.records.map(r => `${r.record_type}\t${r.value}`).join("\n"))}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-hover))]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--muted))] text-left">
                  <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))] w-20">类型</th>
                  <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">记录值</th>
                  <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))] w-20">优先级</th>
                </tr>
              </thead>
              <tbody>
                {dnsResult.records.map((r, i) => (
                  <tr key={i} className="border-t border-[hsl(var(--border))]">
                    <td className="px-4 py-2 font-mono font-semibold text-[hsl(var(--accent))]">{r.record_type}</td>
                    <td className="px-4 py-2 font-mono break-all">{r.value}</td>
                    <td className="px-4 py-2 font-mono text-[hsl(var(--text-secondary))]">
                      {r.priority ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Whois Results */}
      {whoisResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              {whoisResult.domain} — Whois 信息
            </p>
            <button
              onClick={() => copyToClipboard(whoisResult.raw_text)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-hover))]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "已复制" : "复制原始数据"}
            </button>
          </div>
          {whoisResult.fields.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
              <table className="w-full text-sm">
                <tbody>
                  {whoisResult.fields.map((f, i) => (
                    <tr key={i} className="border-t border-[hsl(var(--border))]">
                      <td className="px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] w-48 font-medium">{f.key}</td>
                      <td className="px-4 py-2 font-mono break-all">{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="text-xs font-mono p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-primary))] overflow-auto max-h-96">
              {whoisResult.raw_text}
            </pre>
          )}
        </div>
      )}

      {!dnsResult && !whoisResult && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-[hsl(var(--text-tertiary))]">
            输入域名，选择查询类型后点击查询
          </p>
        </div>
      )}
    </div>
  );
}
