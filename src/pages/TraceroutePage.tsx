import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- Types ------------------------------------------------------------------

interface TraceHop {
  hop: number;
  ip: string | null;
  region: string;
  rtt_ms: number | null;
}

// ---- Traceroute -------------------------------------------------------------

function Traceroute() {
  const [target, setTarget] = useState("8.8.8.8");
  const [maxHops, setMaxHops] = useState("30");
  const [timeout, setTimeout_] = useState("1000");
  const [tracing, setTracing] = useState(false);
  const [hops, setHops] = useState<TraceHop[] | null>(null);
  const [error, setError] = useState("");
  const [hasIpDb, setHasIpDb] = useState(true); // 默认 true，避免闪烁
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState("");

  // 检查离线 IP 归属地库是否已加载
  useEffect(() => {
    invoke<boolean>("has_ip_db").then(setHasIpDb).catch(() => setHasIpDb(false));
  }, []);

  // 监听下载进度事件
  useEffect(() => {
    if (!downloading) return;
    const unlisten = listen<{ percent: number }>("ip-db-download-progress", (e) => {
      setDownloadProgress(e.payload.percent);
    });
    return () => { unlisten.then(fn => fn()); };
  }, [downloading]);

  const handleDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    setDownloadProgress(0);
    try {
      await invoke<string>("download_ip_db");
      setHasIpDb(true);
    } catch (e: any) {
      setDownloadError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleTrace = async () => {
    setError("");
    setHops([]);
    setTracing(true);
    try {
      await invoke<void>("trace_route", {
        target: target.trim(),
        maxHops: parseInt(maxHops, 10) || 30,
        timeoutMs: parseInt(timeout, 10) || 1000,
      });
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      // 确保 tracing 一定被复位（trace-done 事件可能丢失）
      setTracing(false);
    }
  };

  // 实时接收每跳结果
  useEffect(() => {
    const unlistenHop = listen<TraceHop>("trace-hop", (e) => {
      setHops(prev => [...(prev ?? []), e.payload]);
    });
    const unlistenDone = listen("trace-done", () => {
      setTracing(false);
    });
    return () => {
      unlistenHop.then(fn => fn());
      unlistenDone.then(fn => fn());
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClass}>目标 IP / 域名</label>
          <input
            type="text" placeholder="如 8.8.8.8 或 www.baidu.com"
            value={target} onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !tracing && handleTrace()}
            className={`w-64 ${inputClass}`}
            style={{ imeMode: "disabled" }}
          />
        </div>
        <div>
          <label className={labelClass}>最大跳数</label>
          <input type="number" value={maxHops} onChange={(e) => setMaxHops(e.target.value)} className={`w-24 ${inputClass}`} />
        </div>
        <div>
          <label className={labelClass}>每跳超时(ms)</label>
          <input type="number" value={timeout} onChange={(e) => setTimeout_(e.target.value)} className={`w-28 ${inputClass}`} />
        </div>
        <button onClick={handleTrace} disabled={tracing} className={btnClass}>
          {tracing ? "跟踪中..." : "开始跟踪"}
        </button>
      </div>

      {!hasIpDb && (
        <div className="rounded-lg border border-[hsl(var(--warning)_/_0.3)] bg-[hsl(var(--warning)_/_0.08)] px-4 py-3 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[hsl(var(--warning))]">IP 归属地库未安装</p>
              <p className="text-[hsl(var(--text-secondary))] mt-0.5">
                路由跟踪可正常使用，但节点归属地无法解析。下载离线 IP 库即可启用。
              </p>
            </div>
            <button onClick={handleDownload} disabled={downloading} className={btnClass + " shrink-0"}>
              {downloading ? `下载中 ${downloadProgress}%` : "一键下载"}
            </button>
          </div>
          {downloading && (
            <div className="w-full bg-[hsl(var(--bg-hover))] rounded-full h-1.5">
              <div className="bg-[hsl(var(--accent))] h-1.5 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
            </div>
          )}
          {downloadError && (
            <p className="text-xs text-[hsl(var(--danger))]">{downloadError}</p>
          )}
          <p className="text-xs text-[hsl(var(--text-tertiary))]">
            自动下载 ip2region_v4.xdb（~11MB）到程序目录。也可手动下载：
            <a href="https://github.com/lionsoul2014/ip2region/raw/master/data/ip2region_v4.xdb" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--accent))] underline ml-1">GitHub</a>
          </p>
        </div>
      )}

      {tracing && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">路由跟踪中，最多 {maxHops} 跳，请耐心等待（可能需要数十秒）...</p>
      )}

      {error && (
        <div className="rounded-md border border-[hsl(var(--danger)_/_0.3)] bg-[hsl(var(--danger)_/_0.1)] px-3 py-2 text-sm text-[hsl(var(--danger))]">
          {error}
        </div>
      )}

      {hops && hops.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--bg-hover))]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--text-secondary))] w-16">跳数</th>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--text-secondary))] w-44">节点 IP</th>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--text-secondary))]">归属地</th>
                <th className="px-4 py-2 text-right font-medium text-[hsl(var(--text-secondary))] w-28">延迟(ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border-light))]">
              {hops.map((h) => (
                <tr key={h.hop} className="hover:bg-[hsl(var(--bg-hover))]">
                  <td className="px-4 py-2 text-[hsl(var(--text-tertiary))]">{h.hop}</td>
                  <td className="px-4 py-2 font-mono text-[hsl(var(--text-primary))]">
                    {h.ip ?? <span className="text-[hsl(var(--text-tertiary))]">*</span>}
                  </td>
                  <td className="px-4 py-2 text-[hsl(var(--text-secondary))]">
                    {h.region || <span className="text-[hsl(var(--text-tertiary))]">-</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[hsl(var(--text-secondary))]">
                    {h.rtt_ms != null ? h.rtt_ms.toFixed(1) : <span className="text-[hsl(var(--text-tertiary))]">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hops && hops.length === 0 && !error && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">未获取到跟踪结果</p>
      )}

      <p className="text-xs text-[hsl(var(--text-tertiary))]">
        调用系统 traceroute（Linux）/ tracert（Windows）
        {hasIpDb && "，归属地由离线 ip2region 库解析"}
        。Linux 需先安装 traceroute：sudo apt install traceroute
      </p>
    </div>
  );
}

export default function TraceroutePage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">路由跟踪</h1>
      <Traceroute />
    </div>
  );
}
