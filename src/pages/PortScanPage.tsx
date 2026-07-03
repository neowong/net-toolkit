import { useState, useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SpinInput } from "../components/ui/Input";

// ---- Shared styles ----------------------------------------------------------

const inputClass = "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";
const btnClass = "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

// ---- Types ------------------------------------------------------------------

interface PortScanResult {
  port: number;
  open: boolean;
  service: string;
}

interface UdpPortResult {
  port: number;
  open: boolean;
  filtered: boolean;
  service: string;
  detail: string;
}

type ScanType = "tcp" | "udp";

// ---- Port Scanner presets ---------------------------------------------------

const TCP_PORT_PRESETS: Record<string, string> = {
  "常用端口": "22,80,443,8080,8443",
  "Web 端口": "80,443,8080,8443,9090,3000,5000,8000",
  "数据库端口": "3306,5432,1433,1521,6379,27017,5236",
  "SMB/文件共享": "135,139,445,2049",
  "FTP": "20,21,990",
  "邮件服务": "25,110,143,465,587,993,995",
  "远程登录": "22,23,3389,5900,5985",
  "基础设施": "53,88,123,389,636,464,623,161,162",
  "全端口 (1-1000)": "1-1000",
  "全端口 (1-5000)": "1-5000",
};

const UDP_PORT_PRESETS: Record<string, string> = {
  "常用UDP": "53,67,123,161,514,1900,5353",
  "DNS+DHCP+NTP": "53,67,68,123",
  "SNMP+管理": "161,162,514,623",
  "发现服务": "1900,5353,5683",
  "SMB/NetBIOS": "137,138",
  "Syslog/TFTP": "514,69",
  "全端口 (1-500)": "1-500",
};

// ---- Port Scanner -----------------------------------------------------------

function PortScanner() {
  const [scanType, setScanType] = useState<ScanType>("tcp");
  const [ip, setIp] = useState("192.168.1.1");
  const [ports, setPorts] = useState("5000");
  const [timeout, setTimeout_] = useState("2000");
  const [scanning, setScanning] = useState(false);
  const [tcpResults, setTcpResults] = useState<PortScanResult[] | null>(null);
  const [udpResults, setUdpResults] = useState<UdpPortResult[] | null>(null);
  const [error, setError] = useState("");

  const results = scanType === "tcp" ? tcpResults : udpResults;

  // 实时接收端口扫描结果
  useEffect(() => {
    const unlistenTcp = listen<PortScanResult>("port-scan-result", (e) => {
      setTcpResults(prev => [...(prev ?? []), e.payload]);
    });
    const unlistenUdp = listen<UdpPortResult>("udp-scan-result", (e) => {
      setUdpResults(prev => [...(prev ?? []), e.payload]);
    });
    return () => {
      unlistenTcp.then(fn => fn());
      unlistenUdp.then(fn => fn());
    };
  }, []);

  const handleScan = async () => {
    setError("");
    setTcpResults([]);
    setUdpResults([]);
    setScanning(true);
    const t = parseInt(timeout, 10) || 2000;
    try {
      if (scanType === "tcp") {
        await invoke<void>("scan_ports", {
          ip: ip.trim(), ports: ports.trim(), timeoutMs: t,
        });
      } else {
        await invoke<void>("scan_udp_ports", {
          ip: ip.trim(), ports: ports.trim(), timeoutMs: t,
        });
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      setScanning(false);
    }
  };

  const presets = scanType === "tcp" ? TCP_PORT_PRESETS : UDP_PORT_PRESETS;

  const tcpOpen = (tcpResults ?? []).filter(r => r.open).length;
  const tcpClosed = (tcpResults ?? []).filter(r => !r.open).length;
  const udpOpen = (udpResults ?? []).filter(r => r.open).length;
  const udpFiltered = (udpResults ?? []).filter(r => r.filtered).length;
  const udpClosed = (udpResults ?? []).filter(r => !r.open && !r.filtered).length;

  return (
    <div className="space-y-3">
      {/* Scan type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setScanType("tcp"); setTcpResults(null); setUdpResults(null); }}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            scanType === "tcp"
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
          }`}
        >
          TCP 扫描
        </button>
        <button
          onClick={() => { setScanType("udp"); setTcpResults(null); setUdpResults(null); }}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            scanType === "udp"
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
          }`}
        >
          UDP 扫描
        </button>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className={labelClass}>目标 IP</label>
          <input
            type="text" placeholder="192.168.1.1"
            value={ip} onChange={e => setIp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            className={`w-40 ${inputClass}`}
            style={{ imeMode: "disabled" }}
          />
        </div>
        <div>
          <label className={labelClass}>端口 (逗号/范围)</label>
          <input
            type="text" placeholder="22,80,443 或 1-1000"
            value={ports} onChange={e => setPorts(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            className={`w-56 ${inputClass}`}
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
          {scanning ? "扫描中..." : "开始扫描"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(presets).map(([label, preset]) => (
          <button
            key={label}
            onClick={() => setPorts(preset)}
            className="px-2.5 py-1 rounded text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {results && results.length > 0 && (
        <div className="space-y-3">
          {scanType === "tcp" && (
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[hsl(var(--success))]" />
                开放 <span className="font-semibold">{tcpOpen}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle size={14} className="text-[hsl(var(--text-tertiary))]" />
                关闭 <span className="font-semibold">{tcpClosed}</span>
              </span>
            </div>
          )}
          {scanType === "udp" && (
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[hsl(var(--success))]" />
                开放/响应 <span className="font-semibold">{udpOpen}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[hsl(var(--accent)_/_0.4)]" />
                开放/无响应 <span className="font-semibold">{udpFiltered}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle size={14} className="text-[hsl(var(--danger))]" />
                关闭 <span className="font-semibold">{udpClosed}</span>
              </span>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--muted))] text-left">
                  <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))] w-24">端口</th>
                  <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">服务</th>
                  <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))] w-24">状态</th>
                  {scanType === "udp" && <th className="px-4 py-2 font-medium text-[hsl(var(--text-secondary))]">详情</th>}
                </tr>
              </thead>
              <tbody>
                {scanType === "tcp" && (results as PortScanResult[]).map(r => (
                  <tr key={r.port} className="border-t border-[hsl(var(--border))]">
                    <td className="px-4 py-2 font-mono">{r.port}</td>
                    <td className="px-4 py-2 text-[hsl(var(--text-secondary))]">{r.service}</td>
                    <td className="px-4 py-2">
                      {r.open ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]">
                          <CheckCircle2 size={14} /> 开放
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--text-tertiary))]">关闭</span>
                      )}
                    </td>
                  </tr>
                ))}
                {scanType === "udp" && (results as UdpPortResult[]).map(r => (
                  <tr key={r.port} className="border-t border-[hsl(var(--border))]">
                    <td className="px-4 py-2 font-mono">{r.port}</td>
                    <td className="px-4 py-2 text-[hsl(var(--text-secondary))]">{r.service}</td>
                    <td className="px-4 py-2">
                      {r.open ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]">
                          <CheckCircle2 size={14} /> 开放
                        </span>
                      ) : r.filtered ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--text-primary))]">
                          <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--accent)_/_0.5)]" />
                          开放
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--danger))]">
                          <XCircle size={14} /> 关闭
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-[hsl(var(--text-secondary))]">{r.detail}</td>
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

export default function PortScanPage() {
  return (
    <div>
      <h1 className="text-sm font-semibold mb-2">端口扫描</h1>
      <PortScanner />
    </div>
  );
}
