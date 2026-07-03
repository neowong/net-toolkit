import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import { SpinInput } from "../components/ui/Input";

interface PingResult {
  ip: string;
  alive: boolean;
  response_time_ms: number | null;
  error: string | null;
}

interface PingEvent {
  ip: string;
  round: number;
  alive: boolean;
  response_time_ms: number | null;
}

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

export default function BatchPingPage() {
  const [targets, setTargets] = useState("8.8.8.8\n114.114.114.114");
  const [count, setCount] = useState("4");
  const [interval, setInterval_] = useState("1000");
  const [timeout, setTimeout_] = useState("3000");
  const [concurrency, setConcurrency] = useState("50");
  const [pinging, setPinging] = useState(false);
  const [results, setResults] = useState<PingResult[] | null>(null);
  const [liveData, setLiveData] = useState<Record<string, { round: number; alive: boolean; time: number | null }[]>>({});
  const [error, setError] = useState("");
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { unlistenRef.current?.(); }, []);

  const handlePing = async () => {
    setError("");
    setResults(null);
    setLiveData({});
    setPinging(true);

    const unlisten = await listen<PingEvent>("ping-result", (e) => {
      const { ip, round, alive, response_time_ms } = e.payload;
      setLiveData(prev => {
        const existing = prev[ip] || [];
        return { ...prev, [ip]: [...existing, { round, alive, time: response_time_ms }] };
      });
    });
    unlistenRef.current = unlisten;

    try {
      const data = await invoke<PingResult[]>("batch_ping", {
        targets: targets.trim(),
        count: parseInt(count, 10) || 4,
        intervalMs: parseInt(interval, 10) || 1000,
        timeoutMs: parseInt(timeout, 10) || 3000,
        concurrency: parseInt(concurrency, 10) || 50,
      });
      setResults(data);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      unlisten();
      unlistenRef.current = null;
      setPinging(false);
    }
  };

  const exportCsv = () => {
    if (!results) return;
    const header = "IP,状态,平均延迟(ms),错误\n";
    const rows = results.map(r =>
      `${r.ip},${r.alive ? "在线" : "离线"},${r.response_time_ms?.toFixed(1) ?? "-"},${r.error ?? ""}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ping-results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const aliveCount = results?.filter(r => r.alive).length ?? 0;
  const deadCount = results ? results.length - aliveCount : 0;

  const renderChart = (ip: string) => {
    const data = liveData[ip] || [];
    if (data.length === 0) return null;
    const maxTime = Math.max(...data.map(d => d.time ?? 0), 1);
    return (
      <div className="flex items-end gap-px h-6">
        {data.map((d, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-t ${d.alive ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]"}`}
            style={{ height: d.time != null ? `${Math.max((d.time / maxTime) * 100, 8)}%` : "8%" }}
            title={`#${d.round}: ${d.time != null ? d.time.toFixed(1) + "ms" : "超时"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">批量 Ping</h1>

      <div className="flex gap-4">
        <div className="w-56">
          <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">目标 (每行一个或 CIDR)</label>
          <textarea
            value={targets} onChange={e => setTargets(e.target.value)}
            rows={4}
            className={`w-full ${inputClass} resize-y font-mono text-xs`}
            placeholder={"8.8.8.8\n192.168.1.0/24\nexample.com"}
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">次数</label>
              <SpinInput min={1} max={100} step={1} value={count} onChange={v => setCount(String(v))} className="w-20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">间隔 (ms)</label>
              <SpinInput min={100} max={10000} step={100} value={interval} onChange={v => setInterval_(String(v))} className="w-24" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">超时 (ms)</label>
              <SpinInput min={500} max={10000} step={500} value={timeout} onChange={v => setTimeout_(String(v))} className="w-24" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">并发</label>
              <SpinInput min={1} max={200} step={10} value={concurrency} onChange={v => setConcurrency(String(v))} className="w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePing} disabled={pinging} className={btnClass}>
              {pinging ? "Ping 中..." : "开始 Ping"}
            </button>
            {results && (
              <button onClick={exportCsv} className="px-4 py-2 rounded-lg text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-hover))] flex items-center gap-1.5">
                <Download size={14} /> 导出 CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {/* 实时/最终结果表格 */}
      {(pinging ? Object.keys(liveData).length > 0 : results) && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs">
            {pinging && (
              <span className="flex items-center gap-1.5 text-[hsl(var(--text-secondary))]">
                <Loader2 size={12} className="animate-spin" />
                {Object.keys(liveData).length} 个目标已响应
              </span>
            )}
            <span className="flex items-center gap-1 text-[hsl(var(--success))]">
              <CheckCircle2 size={12} />
              在线 {pinging ? Object.values(liveData).filter(d => d.some(p => p.alive)).length : aliveCount}
            </span>
            <span className="flex items-center gap-1 text-[hsl(var(--danger))]">
              <XCircle size={12} />
              离线 {pinging ? Object.values(liveData).filter(d => d.length > 0 && !d.some(p => p.alive)).length : deadCount}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--muted))] text-left">
                  <th className="px-3 py-1.5 font-medium text-[hsl(var(--text-secondary))] text-xs">IP</th>
                  <th className="px-3 py-1.5 font-medium text-[hsl(var(--text-secondary))] text-xs w-16">状态</th>
                  <th className="px-3 py-1.5 font-medium text-[hsl(var(--text-secondary))] text-xs w-20">延迟</th>
                  <th className="px-3 py-1.5 font-medium text-[hsl(var(--text-secondary))] text-xs">图表</th>
                </tr>
              </thead>
              <tbody>
                {(pinging
                  ? Object.entries(liveData).map(([ip, rounds]) => {
                      const last = rounds[rounds.length - 1];
                      return { ip, alive: last?.alive ?? false, response_time_ms: last?.time ?? null };
                    })
                  : results ?? []
                ).map(r => (
                  <tr key={r.ip} className="border-t border-[hsl(var(--border))]">
                    <td className="px-3 py-1.5 font-mono text-xs">{r.ip}</td>
                    <td className="px-3 py-1.5">
                      {r.alive ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--success))] text-xs">
                          <CheckCircle2 size={12} /> 在线
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--danger))] text-xs">
                          <XCircle size={12} /> 离线
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-[hsl(var(--text-secondary))]">
                      {r.response_time_ms != null ? `${r.response_time_ms.toFixed(1)} ms` : "-"}
                    </td>
                    <td className="px-3 py-1.5">{renderChart(r.ip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
