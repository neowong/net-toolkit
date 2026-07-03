import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SpinInput } from "../components/ui/Input";

// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- Types ------------------------------------------------------------------

interface LiveHostResult {
  ip: string;
  alive: boolean;
  response_time_ms: number | null;
}

// ---- Alive Scanner ----------------------------------------------------------

function LiveScanner() {
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [timeout, setTimeout_] = useState("2000");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<LiveHostResult[] | null>(null);
  const [error, setError] = useState("");
  // 保存当前监听器的 unlisten，组件卸载时清理，防止事件监听器泄漏
  const unlistenRef = useRef<(() => void) | null>(null);
  // 组件卸载时若仍有未结束的扫描，清理监听器，避免向已卸载组件 setState
  useEffect(() => () => { unlistenRef.current?.(); }, []);

  const handleScan = async () => {
    setError("");
    setResults([]);  // 先清空，准备接收实时结果
    setScanning(true);

    // 监听实时结果事件——每扫到一个 IP 就追加到列表
    const unlisten = await listen<LiveHostResult>("live-scan-result", (event) => {
      setResults(prev => [...(prev ?? []), event.payload]);
    });
    unlistenRef.current = unlisten;

    try {
      const data = await invoke<LiveHostResult[]>("scan_live_hosts", {
        subnet: subnet.trim(),
        timeoutMs: parseInt(timeout, 10) || 2000,
      });
      // 扫描完成后用排序结果替换
      setResults(data);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      unlisten();
      unlistenRef.current = null;
      setScanning(false);
    }
  };

  const alive = results?.filter(r => r.alive) ?? [];
  const dead = results?.filter(r => !r.alive) ?? [];

  return (
    <div className="space-y-6">
      <p className="text-xs text-[hsl(var(--text-tertiary))]">基于系统 ping + TCP 后备(135/445)探测，结果仅供参考。</p>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className={labelClass}>网段 (CIDR)</label>
          <input
            type="text" placeholder="192.168.1.0/24"
            value={subnet} onChange={e => setSubnet(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            className={`w-44 ${inputClass}`}
            style={{ imeMode: "disabled" }}
          />
        </div>
        <div>
          <label className={labelClass}>超时 (ms)</label>
          <SpinInput
            min={500} max={10000} step={500}
            value={timeout} onChange={(v) => setTimeout_(String(v))}
            className="w-24"
          />
        </div>
        <button onClick={handleScan} disabled={scanning} className={btnClass}>
          {scanning ? `扫描中... (${results?.length ?? 0})` : "开始扫描"}
        </button>
      </div>

      {scanning && (
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))]">
          <Loader2 size={16} className="animate-spin" />
          已发现 {results?.filter(r => r.alive).length ?? 0} 个在线 / 扫描 {results?.length ?? 0} 个 ...
        </div>
      )}

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {results && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[hsl(var(--success))]" />
              存活 <span className="font-semibold">{alive.length}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[hsl(var(--text-tertiary))]" />
              离线 <span className="font-semibold">{dead.length}</span>
            </span>
            <span className="text-[hsl(var(--text-tertiary))]">共 {results.length} 个 IP</span>
          </div>

          {alive.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[hsl(var(--muted))] text-left">
                    <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">IP 地址</th>
                    <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">响应时间</th>
                    <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {alive.map(r => (
                    <tr key={r.ip} className="border-t border-[hsl(var(--border))]">
                      <td className="px-4 py-2 font-mono">{r.ip}</td>
                      <td className="px-4 py-2 font-mono text-[hsl(var(--text-secondary))]">
                        {r.response_time_ms != null ? `${r.response_time_ms.toFixed(1)} ms` : "-"}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]">
                          <CheckCircle2 size={14} /> 在线
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dead.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]">
                离线主机 ({dead.length})
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dead.map(r => (
                  <span key={r.ip} className="px-2 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[hsl(var(--text-tertiary))]">
                    {r.ip}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveScanPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">存活扫描</h1>
      <LiveScanner />
    </div>
  );
}
