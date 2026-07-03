import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

// ---- Shared styles ----------------------------------------------------------

const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- TFTP Server ------------------------------------------------------------

function TftpServer() {
  const [filePath, setFilePath] = useState("");
  const [port, setPort] = useState("69");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const [progress, setProgress] = useState<{ ip: string; bytes: number; total: number; done: boolean } | null>(null);
  const [speed, setSpeed] = useState("");
  const prevBytesRef = useRef(0);
  const prevTimeRef = useRef(0);

  useEffect(() => {
    const unlistens: (() => void)[] = [];
    listen<{ msg: string; type: string }>("tftp-log", (e) => {
      setLogs(prev => [...prev.slice(-199), e.payload]);
    }).then(f => unlistens.push(f));
    listen<{ ip: string; bytes: number; total: number; done: boolean }>("tftp-progress", (e) => {
      const now = Date.now();
      const prevT = prevTimeRef.current;
      const prevB = prevBytesRef.current;
      if (prevT > 0 && prevB > 0 && e.payload.bytes > prevB) {
        const dt = (now - prevT) / 1000;
        if (dt > 0.2) {
          const ds = e.payload.bytes - prevB;
          const spd = ds / dt;
          setSpeed(spd >= 1048576 ? `${(spd/1048576).toFixed(1)} MB/s`
            : spd >= 1024 ? `${(spd/1024).toFixed(0)} KB/s`
            : `${spd.toFixed(0)} B/s`);
          prevBytesRef.current = e.payload.bytes;
          prevTimeRef.current = now;
        }
      }
      setProgress(e.payload);
    }).then(f => unlistens.push(f));
    return () => unlistens.forEach(f => f());
  }, []);

  const start = async () => {
    if (!filePath.trim()) { alert("请选择 TFTP 根目录"); return; }
    try {
      await invoke("start_tftp_server", { filePath: filePath.trim(), port: parseInt(port) || 69 });
      setRunning(true); setProgress(null); setSpeed(""); prevBytesRef.current = 0; prevTimeRef.current = Date.now();
    } catch (e: any) { alert(typeof e === "string" ? e : e?.message || "启动失败"); }
  };
  const stop = async () => {
    try { await invoke("stop_tftp_server"); } catch {}
    setRunning(false); setProgress(null);
  };

  const fmtSize = (b: number) => b >= 1048576 ? `${(b/1048576).toFixed(1)} MB` : b >= 1024 ? `${(b/1024).toFixed(0)} KB` : `${b} B`;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <label className={labelClass}>TFTP 根目录</label>
          <div className="flex gap-2">
            <input value={filePath} readOnly
              className="flex-1 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-primary))] text-sm text-[hsl(var(--text-primary))] cursor-default"
              placeholder="未选择目录" />
            <button onClick={async () => {
              const selected = await open({ multiple: false, directory: true });
              if (selected) setFilePath(selected as string);
            }} className="px-3 py-2 rounded-lg text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-hover))] shrink-0">
              选择目录
            </button>
          </div>
        </div>
        <div className="w-20">
          <label className={labelClass}>端口</label>
          <input value={port} onChange={e => setPort(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-primary))] text-sm" />
        </div>
        <div className="flex gap-2">
          {!running
            ? <button onClick={start} className={btnClass}>▶ 启动</button>
            : <button onClick={stop} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:opacity-90">⏹ 停止</button>}
        </div>
        {running && <span className="text-xs text-green-500">● 运行中</span>}
      </div>
      {progress && !progress.done && (
        <div className="p-4 border-2 border-[hsl(var(--accent)_/_0.3)] rounded-xl bg-[hsl(var(--accent)_/_0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
              {progress.total > 0 ? '↓' : '↑'} 传输中 — {progress.ip}
            </p>
            <p className="text-xs text-[hsl(var(--text-secondary))]">
              {progress.total > 0 ? `${Math.round((progress.bytes / progress.total) * 100)}%` : ''} {speed}
            </p>
          </div>
          <div className="w-full bg-[hsl(var(--border))] rounded-full h-4 overflow-hidden">
            <div className="bg-[hsl(var(--accent))] h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
              style={{ width: progress.total > 0 ? `${Math.max((progress.bytes / progress.total) * 100, 2)}%` : '100%', animation: progress.total === 0 ? 'pulse 2s infinite' : undefined }}>
              {progress.total > 0 && progress.bytes / progress.total > 0.15 &&
                <span className="text-[10px] text-white font-medium">{Math.round((progress.bytes / progress.total) * 100)}%</span>}
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--text-tertiary))] mt-1.5">
            {fmtSize(progress.bytes)}{progress.total > 0 ? ` / ${fmtSize(progress.total)}` : ' 已接收'}
          </p>
        </div>
      )}
      <div className="max-h-48 overflow-y-auto border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--bg-primary))] text-xs font-mono space-y-1">
        {logs.length === 0 && <p className="text-[hsl(var(--text-tertiary))]">等待传输...</p>}
        {logs.map((l, i) => (
          <p key={i} className={l.type === "error" ? "text-red-500" : l.type === "success" ? "text-green-500" : "text-[hsl(var(--text-secondary))]"}>
            {l.msg}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function TftpPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">TFTP服务</h1>
      <TftpServer />
    </div>
  );
}
