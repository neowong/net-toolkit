import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SpinInput } from "../components/ui/Input";

// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- Types ------------------------------------------------------------------

interface WebCheckResult {
  url: string;
  final_url: string;
  status_code: number | null;
  response_time_ms: number;
  error: string | null;
  content_type: string | null;
  content_length: number | null;
}

// ---- Web Checker ------------------------------------------------------------

function WebChecker() {
  const [urls, setUrls] = useState("https://www.baidu.com");
  const [timeout, setTimeout_] = useState("10");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<WebCheckResult[] | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    setError("");
    setResults(null);
    setScanning(true);
    const urlList = urls.split("\n").map(s => s.trim()).filter(Boolean);
    if (urlList.length === 0) { setError("请输入至少一个URL"); setScanning(false); return; }
    try {
      const data = await invoke<WebCheckResult[]>("check_web_urls", {
        urls: urlList,
        timeoutSecs: parseInt(timeout, 10) || 10,
      });
      setResults(data);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      setScanning(false);
    }
  };

  const statusColor = (code: number | null) => {
    if (!code) return "text-[hsl(var(--text-tertiary))]";
    if (code >= 200 && code < 300) return "text-[hsl(var(--success))]";
    if (code >= 300 && code < 400) return "text-[hsl(var(--warning))]";
    return "text-[hsl(var(--danger))]";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-80">
          <label className={labelClass}>URL (每行一个)</label>
          <textarea
            placeholder={"https://www.baidu.com\nhttps://github.com"}
            value={urls} onChange={e => setUrls(e.target.value)}
            rows={4}
            className={`w-full ${inputClass} resize-y font-mono text-xs`}
          />
        </div>
        <div>
          <label className={labelClass}>超时 (秒)</label>
          <SpinInput
            min={1} max={60} step={1}
            value={timeout} onChange={(v) => setTimeout_(String(v))}
            className="w-20"
          />
        </div>
        <button onClick={handleCheck} disabled={scanning} className={btnClass}>
          {scanning ? "检测中..." : "开始检测"}
        </button>
      </div>

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {results && (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] text-left">
                <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">URL</th>
                <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))] w-20">状态码</th>
                <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))] w-24">响应时间</th>
                <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">详情</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-[hsl(var(--border))]">
                  <td className="px-4 py-2 max-w-60 truncate font-mono" title={r.url}>
                    {r.url}
                  </td>
                  <td className={`px-4 py-2 font-mono font-semibold ${statusColor(r.status_code)}`}>
                    {r.status_code ?? "ERR"}
                  </td>
                  <td className="px-4 py-2 font-mono text-[hsl(var(--text-secondary))]">
                    {r.response_time_ms}ms
                  </td>
                  <td className="px-4 py-2 text-xs text-[hsl(var(--text-secondary))]">
                    {r.error ? (
                      <span className="text-[hsl(var(--danger))]">{r.error}</span>
                    ) : (
                      <span>
                        {r.final_url !== r.url && (
                          <span className="text-[hsl(var(--text-tertiary))]">→ {r.final_url}</span>
                        )}
                        {r.content_type && (
                          <span className="ml-2 text-[hsl(var(--text-tertiary))]">{r.content_type.split(";")[0]}</span>
                        )}
                        {r.content_length != null && (
                          <span className="ml-2 text-[hsl(var(--text-tertiary))]">
                            {(r.content_length / 1024).toFixed(1)}KB
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function WebCheckPage() {
  return (
    <div>
      <h1 className="text-sm font-semibold mb-2">WEB检测</h1>
      <WebChecker />
    </div>
  );
}
