import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Wifi } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SpinInput } from "../components/ui/Input";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { inputClass, btnClass, labelClass } from "../lib/styles";

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

  const alive = useMemo(() => results?.filter(r => r.alive) ?? [], [results]);
  const dead = useMemo(() => results?.filter(r => !r.alive) ?? [], [results]);

  const columns = useMemo(() => [
    {
      key: "ip",
      header: "IP 地址",
      width: "40%",
      render: (row: LiveHostResult) => (
        <span className="font-mono">{row.ip}</span>
      ),
    },
    {
      key: "response_time_ms",
      header: "响应时间",
      width: "30%",
      render: (row: LiveHostResult) => (
        <span className="font-mono text-[hsl(var(--text-secondary))]">
          {row.response_time_ms != null ? `${row.response_time_ms.toFixed(1)} ms` : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "状态",
      width: "30%",
      render: (row: LiveHostResult) => (
        <StatusBadge status={row.alive ? "online" : "offline"} />
      ),
    },
  ], []);

  return (
    <div className="space-y-3">
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
          已发现 {alive.length} 个在线 / 扫描 {results?.length ?? 0} 个 ...
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

          {alive.length > 0 ? (
            <DataTable
              columns={columns}
              data={alive}
              rowKey={(r) => r.ip}
              loading={scanning}
              loadingText="扫描中..."
              emptyText="暂无在线主机"
              emptyIcon={<Wifi size={24} className="text-[hsl(var(--text-tertiary))]" />}
              maxHeight="400px"
            />
          ) : !scanning && results.length > 0 ? (
            <div className="text-center py-8 text-sm text-[hsl(var(--text-tertiary))]">
              <Wifi size={24} className="mx-auto mb-2 opacity-50" />
              <p>未发现在线主机</p>
            </div>
          ) : null}

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
      <h1 className="text-sm font-semibold mb-3">存活扫描</h1>
      <LiveScanner />
    </div>
  );
}
