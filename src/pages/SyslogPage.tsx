import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- Syslog Receiver --------------------------------------------------------

function SyslogReceiver() {
  const [port, setPort] = useState("514");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<{ time: string; ip: string; msg: string }[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unlistenRef = { current: undefined as (() => void) | undefined };
    listen<{ time: string; ip: string; msg: string }>("syslog-msg", (e) => {
      setMessages(prev => [...prev.slice(-499), e.payload]);
      setCount(c => c + 1);
    }).then(f => { unlistenRef.current = f; });
    return () => unlistenRef.current?.();
  }, []);

  const start = async () => {
    try {
      await invoke("start_syslog_server", { port: parseInt(port) || 514 });
      setRunning(true);
    } catch (e: any) { alert(typeof e === "string" ? e : e?.message || "启动失败"); }
  };
  const stop = async () => {
    try { await invoke("stop_syslog_server"); } catch {}
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-24">
          <label className={labelClass}>端口</label>
          <input value={port} onChange={e => setPort(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-primary))] text-sm" />
        </div>
        <div className="flex gap-2">
          {!running
            ? <button onClick={start} className={btnClass}>▶ 启动</button>
            : <button onClick={stop} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:opacity-90">⏹ 停止</button>}
          <button onClick={() => { setMessages([]); setCount(0); }} className="px-3 py-2 rounded-lg text-xs border border-[hsl(var(--border))]">清空</button>
        </div>
        {running && <span className="text-xs text-green-500">● 运行中</span>}
        <span className="text-xs text-[hsl(var(--text-secondary))] ml-auto">已接收 {count} 条</span>
      </div>
      <div className="max-h-80 overflow-y-auto border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-primary))] text-xs font-mono">
        {messages.length === 0 && <p className="p-4 text-[hsl(var(--text-tertiary))] text-center">等待日志...</p>}
        {messages.map((m, i) => (
          <div key={i} className="flex gap-2 px-3 py-1 border-b border-[hsl(var(--border-light))] hover:bg-[hsl(var(--bg-hover))]">
            <span className="text-[hsl(var(--text-tertiary))] shrink-0">{m.time}</span>
            <span className="text-[hsl(var(--accent))] shrink-0">{m.ip}</span>
            <span className="text-[hsl(var(--text-primary))] truncate">{m.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SyslogPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Syslog</h1>
      <SyslogReceiver />
    </div>
  );
}
