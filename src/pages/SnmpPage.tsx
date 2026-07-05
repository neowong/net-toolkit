import { useState } from "react";
import { Plug } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Select, SpinInput } from "../components/ui/Input";
import { inputClass, btnClass, labelClass } from "../lib/styles";

// ---- Types ------------------------------------------------------------------

interface SnmpResult {
  oid: string;
  value: string | null;
  value_type: string | null;
  error: string | null;
  response_time_ms: number;
  raw_hex: string | null;
}

// ---- SNMP Constants ---------------------------------------------------------

const COMMON_OIDS: Record<string, string> = {
  "系统描述": "1.3.6.1.2.1.1.1.0",
  "系统名称": "1.3.6.1.2.1.1.5.0",
  "运行时间": "1.3.6.1.2.1.1.3.0",
  "联系信息": "1.3.6.1.2.1.1.4.0",
  "位置": "1.3.6.1.2.1.1.6.0",
  "接口数量": "1.3.6.1.2.1.2.1.0",
  "接口表": "1.3.6.1.2.1.2.2",
};

const AUTH_PROTOCOLS = ["MD5", "SHA1", "SHA256"] as const;
const PRIV_PROTOCOLS = ["none", "DES", "AES128"] as const;

// ---- SNMP Checker -----------------------------------------------------------

function SnmpChecker() {
  const [version, setVersion] = useState<"v2c" | "v3">("v2c");
  const [ip, setIp] = useState("");
  const [community, setCommunity] = useState("public");
  // v3
  const [username, setUsername] = useState("");
  const [authProto, setAuthProto] = useState("SHA1");
  const [authPass, setAuthPass] = useState("");
  const [privProto, setPrivProto] = useState("DES");
  const [privPass, setPrivPass] = useState("");
  // shared
  const [oid, setOid] = useState("1.3.6.1.2.1.1.1.0");
  const [timeout, setTimeout_] = useState("5");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SnmpResult | null>(null);
  const [error, setError] = useState("");

  const handleGet = async () => {
    setError("");
    setResult(null);
    setScanning(true);
    const t = parseInt(timeout, 10) || 5;
    try {
      let data: SnmpResult;
      if (version === "v2c") {
        data = await invoke<SnmpResult>("snmp_get", {
          ip: ip.trim(),
          community: community.trim() || "public",
          oid: oid.trim(),
          timeoutSecs: t,
        });
      } else {
        data = await invoke<SnmpResult>("snmp_v3_get", {
          ip: ip.trim(),
          username: username.trim(),
          authProtocol: authProto,
          authPassword: authPass,
          privProtocol: privProto,
          privPassword: privPass,
          oid: oid.trim(),
          timeoutSecs: t,
        });
      }
      setResult(data);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || String(e));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Version toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setVersion("v2c")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            version === "v2c"
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
          }`}
        >
          SNMP v2c
        </button>
        <button
          onClick={() => setVersion("v3")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            version === "v3"
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
          }`}
        >
          SNMP v3
        </button>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className={labelClass}>目标 IP</label>
          <input
            type="text" placeholder="192.168.1.1"
            value={ip} onChange={e => setIp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleGet()}
            className={`w-40 ${inputClass}`}
            style={{ imeMode: "disabled" }}
          />
        </div>

        {version === "v2c" && (
          <div>
            <label className={labelClass}>Community</label>
            <input
              type="text" placeholder="public"
              value={community} onChange={e => setCommunity(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleGet()}
              className={`w-32 ${inputClass}`}
            />
          </div>
        )}

        {version === "v3" && (
          <>
            <div>
              <label className={labelClass}>用户名</label>
              <input
                type="text" placeholder="snmpuser"
                value={username} onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGet()}
                className={`w-32 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>认证协议</label>
              <Select value={authProto} onChange={e => setAuthProto(e.target.value)} className="w-24">
                {AUTH_PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <div>
              <label className={labelClass}>认证密码</label>
              <input
                type="password" placeholder="auth密码"
                value={authPass} onChange={e => setAuthPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGet()}
                className={`w-32 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>加密协议</label>
              <Select value={privProto} onChange={e => setPrivProto(e.target.value)} className="w-24">
                {PRIV_PROTOCOLS.map(p => <option key={p} value={p}>{p === "none" ? "无加密" : p}</option>)}
              </Select>
            </div>
            <div>
              <label className={labelClass}>加密密码</label>
              <input
                type="password" placeholder="priv密码"
                value={privPass} onChange={e => setPrivPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGet()}
                className={`w-32 ${inputClass}`}
              />
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>OID</label>
          <input
            type="text" placeholder="1.3.6.1.2.1.1.1.0"
            value={oid} onChange={e => setOid(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleGet()}
            className={`w-56 ${inputClass} font-mono text-xs`}
            style={{ imeMode: "disabled" }}
          />
        </div>
        <div>
          <label className={labelClass}>超时 (秒)</label>
          <SpinInput
            min={1} max={30} step={1}
            value={timeout} onChange={(v) => setTimeout_(String(v))}
            className="w-20"
          />
        </div>
        <button onClick={handleGet} disabled={scanning} className={btnClass}>
          {scanning ? "查询中..." : "GET"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(COMMON_OIDS).map(([label, oidVal]) => (
          <button
            key={label}
            onClick={() => setOid(oidVal)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              oid === oidVal
                ? "bg-[hsl(var(--accent)_/_0.15)] text-[hsl(var(--accent))]"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {result && (
        <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))] w-24">版本</td>
                <td className="px-4 py-2.5 font-mono text-[hsl(var(--text-secondary))]">{version === "v2c" ? "SNMP v2c" : "SNMP v3"}</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))]">OID</td>
                <td className="px-4 py-2.5 font-mono text-xs">{result.oid || oid}</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))]">类型</td>
                <td className="px-4 py-2.5 font-mono">{result.value_type || "-"}</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))]">值</td>
                <td className="px-4 py-2.5 font-mono">
                  {result.error ? (
                    <span className="text-[hsl(var(--danger))]">{result.error}</span>
                  ) : (
                    <span className="break-all">{result.value ?? "-"}</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))]">响应时间</td>
                <td className="px-4 py-2.5 font-mono text-[hsl(var(--text-secondary))]">{result.response_time_ms}ms</td>
              </tr>
              {result.raw_hex && (
                <tr>
                  <td className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--text-secondary))]">原始数据</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[hsl(var(--text-tertiary))] break-all">{result.raw_hex}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!result && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
            <Plug size={20} className="text-[hsl(var(--text-tertiary))]" />
          </div>
          <h3 className="text-sm font-medium text-[hsl(var(--text-secondary))] mb-1">SNMP 检测</h3>
          <p className="text-xs text-[hsl(var(--text-tertiary))] max-w-md">
            支持 SNMP v2c 和 v3。v2c 使用 Community 字符串认证；v3 使用 USM 安全模型，支持 MD5/SHA1/SHA256 认证和 DES/AES128 加密。
          </p>
        </div>
      )}
    </div>
  );
}

export default function SnmpPage() {
  return (
    <div>
      <h1 className="text-sm font-semibold mb-3">SNMP</h1>
      <SnmpChecker />
    </div>
  );
}
