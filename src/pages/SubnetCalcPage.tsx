import { useState, useMemo } from "react";

// ---- Subnet Calculator ------------------------------------------------------

interface SubnetResult {
  ipInt: number;
  maskInt: number;
  network: number[];
  broadcast: number[];
  firstHost: number[];
  lastHost: number[];
  hostCount: string;
  subnetMask: number[];
  wildcard: number[];
  cidr: number;
  ipBinary: string;
  maskBinary: string;
}

function ipToInt(octets: number[]): number {
  const [a = 0, b = 0, c = 0, d = 0] = octets;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function intToIp(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function ipToBinary(n: number): string {
  return ((n >>> 24) & 0xff).toString(2).padStart(8, "0") +
    "." + ((n >>> 16) & 0xff).toString(2).padStart(8, "0") +
    "." + ((n >>> 8) & 0xff).toString(2).padStart(8, "0") +
    "." + (n & 0xff).toString(2).padStart(8, "0");
}

// ── IPv6 helpers ──

/** 展开简写 IPv6 地址为完整 8 组 hex，返回 BigInt */
function ipv6ToBigInt(addr: string): bigint | null {
  try {
    addr = addr.trim();
    if (addr.includes("::")) {
      const [left, right] = addr.split("::");
      const leftGroups = left ? left.split(":").filter(Boolean) : [];
      const rightGroups = right ? right.split(":").filter(Boolean) : [];
      const missing = 8 - leftGroups.length - rightGroups.length;
      if (missing < 0) return null;
      const middle = Array(missing).fill("0");
      addr = [...leftGroups, ...middle, ...rightGroups].join(":");
    }
    const groups = addr.split(":");
    if (groups.length !== 8) return null;
    let result = 0n;
    for (const g of groups) {
      const val = parseInt(g, 16);
      if (isNaN(val) || val < 0 || val > 0xffff) return null;
      result = (result << 16n) | BigInt(val);
    }
    return result;
  } catch { return null; }
}

/** 128-bit BigInt → 简写格式 IPv6 字符串 */
function bigIntToIpv6(n: bigint): string {
  const groups: number[] = [];
  for (let i = 0; i < 8; i++) {
    groups.unshift(Number(n & 0xffffn));
    n >>= 16n;
  }
  // 找最长的连续零段做 ::
  let bestStart = -1, bestLen = 0;
  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      let j = i;
      while (j < 8 && groups[j] === 0) j++;
      if (j - i > bestLen) { bestStart = i; bestLen = j - i; }
      i = j;
    }
  }
  if (bestLen >= 2) {
    const parts = groups.map(g => g.toString(16));
    return [...parts.slice(0, bestStart), "", ...parts.slice(bestStart + bestLen)].join(":");
  }
  return groups.map(g => g.toString(16)).join(":");
}

function calcSubnet(ip: string, cidrStr: string): SubnetResult | null {
  const cidr = parseInt(cidrStr, 10);
  if (isNaN(cidr) || cidr < 0) return null;

  const ipTrimmed = ip.trim();

  // ── IPv4 ──
  if (ipTrimmed.includes(".") && !ipTrimmed.includes(":")) {
    if (cidr > 32) return null;
    const parts = ipTrimmed.split(".").map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
    const ipInt = ipToInt(parts);
    const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const wildcardInt = ~maskInt >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;
    let firstHost: number[], lastHost: number[], hostCount: string;
    if (cidr >= 31) {
      firstHost = [0, 0, 0, 0]; lastHost = [0, 0, 0, 0];
      hostCount = cidr === 32 ? "1 (单主机)" : "2 (点对点链路)";
    } else {
      firstHost = intToIp(networkInt + 1);
      lastHost = intToIp(broadcastInt - 1);
      hostCount = (Math.pow(2, 32 - cidr) - 2).toLocaleString();
    }
    return {
      ipInt, maskInt,
      network: intToIp(networkInt),
      broadcast: intToIp(broadcastInt),
      firstHost, lastHost, hostCount,
      subnetMask: intToIp(maskInt),
      wildcard: intToIp(wildcardInt),
      cidr,
      ipBinary: ipToBinary(ipInt),
      maskBinary: ipToBinary(maskInt),
    };
  }

  // ── IPv6 ──
  if (ipTrimmed.includes(":")) {
    if (cidr > 128) return null;
    const ipBig = ipv6ToBigInt(ipTrimmed);
    if (ipBig === null) return null;
    const maskBig = cidr === 0 ? 0n : (~0n << BigInt(128 - cidr)) & ((1n << 128n) - 1n);
    const networkBig = ipBig & maskBig;
    const lastBig = networkBig | (~maskBig & ((1n << 128n) - 1n));

    let hostCount: string;
    if (128 - cidr > 52) {
      hostCount = "≈ " + (2n ** BigInt(128 - cidr)).toLocaleString();
    } else {
      hostCount = (2n ** BigInt(128 - cidr)).toLocaleString();
    }

    return {
      network: bigIntToIpv6(networkBig).split(":") as any,
      broadcast: bigIntToIpv6(lastBig).split(":") as any,
      firstHost: cidr >= 127 ? ["—"] : bigIntToIpv6(networkBig + 1n).split(":") as any,
      lastHost: cidr >= 127 ? ["—"] : bigIntToIpv6(lastBig - 1n).split(":") as any,
      hostCount,
      subnetMask: bigIntToIpv6(maskBig).split(":") as any,
      wildcard: bigIntToIpv6(~maskBig & ((1n << 128n) - 1n)).split(":") as any,
      cidr,
      ipInt: 0, maskInt: 0,
      ipBinary: "", maskBinary: "",
    };
  }

  return null;
}

function SubnetCalc() {
  const [ip, setIp] = useState("");
  const [cidr, setCidr] = useState("");
  const [result, setResult] = useState<SubnetResult | null>(null);
  const [error, setError] = useState("");

  const isV6 = useMemo(() => ip.trim().includes(":"), [ip]);
  const maxCidr = useMemo(() => isV6 ? 128 : 32, [isV6]);

  const handleCalc = () => {
    setError("");
    const r = calcSubnet(ip.trim(), cidr.trim());
    if (!r) { setError(`请输入有效的 IP 地址和 CIDR 前缀（IPv4: 0-32 / IPv6: 0-128）`); setResult(null); return; }
    setResult(r);
  };

  const gridClass = "grid grid-cols-2 gap-x-6 gap-y-2 text-sm";
  const fmt = (arr: string[] | number[]) => isV6 ? arr.join(":") : arr.join(".");

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">IP 地址</label>
          <input
            type="text" placeholder="192.168.1.0 或 2001:db8::1"
            value={ip} onChange={e => setIp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCalc()}
            className="w-72 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]"
            style={{ imeMode: "disabled" }}
          />
        </div>
        <span className="text-lg font-bold text-[hsl(var(--text-secondary))] pb-2">/</span>
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1">CIDR</label>
          <input
            type="number" min={0} max={maxCidr} placeholder={isV6 ? "64" : "24"}
            value={cidr} onChange={e => setCidr(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCalc()}
            className="w-20 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]"
          />
        </div>
        <button
          onClick={handleCalc}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity"
        >
          计算
        </button>
      </div>

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className={gridClass}>
            <div className="text-[hsl(var(--text-secondary))]">网络地址</div>
            <div className="font-mono font-semibold break-all">{fmt(result.network)}</div>
            {!isV6 && <><div className="text-[hsl(var(--text-secondary))]">广播地址</div>
            <div className="font-mono font-semibold">{fmt(result.broadcast)}</div></>}
            <div className="text-[hsl(var(--text-secondary))]">可用范围</div>
            <div className="font-mono break-all">{fmt(result.firstHost)} — {fmt(result.lastHost)}</div>
            <div className="text-[hsl(var(--text-secondary))]">{isV6 ? "地址总数" : "可用主机数"}</div>
            <div className="font-mono">{result.hostCount}</div>
            <div className="text-[hsl(var(--text-secondary))]">子网掩码</div>
            <div className="font-mono break-all">{fmt(result.subnetMask)}</div>
            {!isV6 && <><div className="text-[hsl(var(--text-secondary))]">反掩码 (通配符)</div>
            <div className="font-mono">{fmt(result.wildcard)}</div></>}
          </div>

          {!isV6 && <details className="text-xs">
            <summary className="cursor-pointer font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors">
              二进制
            </summary>
            <div className="mt-2 space-y-1 font-mono text-xs">
              <div><span className="text-[hsl(var(--text-tertiary))]">IP:　　</span>{result.ipBinary}</div>
              <div><span className="text-[hsl(var(--text-tertiary))]">掩码:　</span>{result.maskBinary}</div>
              <div className="pt-1 text-[hsl(var(--text-tertiary))]">
                {result.ipBinary.split("").map((ch, i) => (
                  <span key={i} className={ch === "1" && result.maskBinary[i] === "1" ? "text-[hsl(var(--success))]" : ""}>{ch}</span>
                ))}
                <span className="ml-2">← 网络位</span>
              </div>
            </div>
          </details>
          }
        </div>
      )}
    </div>
  );
}

export default function SubnetCalcPage() {
  return (
    <div>
      <h1 className="text-sm font-semibold mb-3">子网计算器</h1>
      <SubnetCalc />
    </div>
  );
}
