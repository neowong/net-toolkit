use ipnetwork::{Ipv4Network, Ipv6Network};
use std::net::{Ipv4Addr, Ipv6Addr};

pub struct SubnetInfo {
    pub items: Vec<(String, String)>,
}

/// 入口：自动检测 IPv4 / IPv6
pub fn calculate(ip_str: &str, prefix_str: &str) -> Result<SubnetInfo, String> {
    let ip_clean = ip_str.trim().split('/').next().unwrap_or(ip_str.trim());
    if ip_clean.contains(':') {
        calculate_v6(ip_clean, prefix_str.trim())
    } else {
        calculate_v4(ip_clean, prefix_str.trim())
    }
}

// ── IPv4 ──────────────────────────────────────────────

fn calculate_v4(ip_str: &str, prefix_str: &str) -> Result<SubnetInfo, String> {
    // 前缀：支持数字 "24" 或点分掩码 "255.255.255.0"
    let prefix: u8 = if prefix_str.contains('.') {
        let mask: Ipv4Addr = prefix_str
            .parse()
            .map_err(|_| format!("无效的子网掩码: {}", prefix_str))?;
        dotted_mask_to_prefix(mask)?
    } else {
        let n: u8 = prefix_str
            .parse()
            .map_err(|_| format!("无效的前缀长度: {}", prefix_str))?;
        if n > 32 {
            return Err(format!("IPv4 前缀长度不能超过 32，当前: {}", n));
        }
        n
    };

    let ip: Ipv4Addr = ip_str
        .parse()
        .map_err(|_| format!("无效的 IPv4 地址: {}", ip_str))?;
    let network = Ipv4Network::new(ip, prefix)
        .map_err(|e| format!("网络地址错误: {}", e))?;

    let net_addr  = network.network();
    let broadcast = network.broadcast();
    let mask      = network.mask();
    let total     = (network.size() as u64).max(1);

    let (first_host, last_host, host_count) = if prefix >= 31 {
        (net_addr.to_string(), broadcast.to_string(), total)
    } else {
        let first = Ipv4Addr::from(u32::from(net_addr) + 1);
        let last  = Ipv4Addr::from(u32::from(broadcast) - 1);
        (first.to_string(), last.to_string(), total - 2)
    };

    let wildcard = Ipv4Addr::from(!u32::from(mask));

    let items = vec![
        ("网络地址".into(),   net_addr.to_string()),
        ("广播地址".into(),   broadcast.to_string()),
        ("子网掩码".into(),   format!("{} (/{prefix})", mask)),
        ("通配符掩码".into(), wildcard.to_string()),
        ("二进制掩码".into(), mask_to_binary(mask)),
        ("可用首地址".into(), first_host),
        ("可用末地址".into(), last_host),
        ("可用主机数".into(), host_count.to_string()),
        ("总地址数".into(),   total.to_string()),
        ("IP 类别".into(),    ip_class(ip)),
    ];
    Ok(SubnetInfo { items })
}

fn dotted_mask_to_prefix(mask: Ipv4Addr) -> Result<u8, String> {
    let bits = u32::from(mask);
    let ones = bits.count_ones();
    let expected = if ones == 0 { 0u32 } else { !((1u32 << (32 - ones)) - 1) };
    if bits != expected {
        return Err(format!("不连续的子网掩码: {}", mask));
    }
    Ok(ones as u8)
}

fn ip_class(ip: Ipv4Addr) -> String {
    match ip.octets()[0] {
        0..=127   => "A 类 (0.0.0.0 – 127.255.255.255)".into(),
        128..=191 => "B 类 (128.0.0.0 – 191.255.255.255)".into(),
        192..=223 => "C 类 (192.0.0.0 – 223.255.255.255)".into(),
        224..=239 => "D 类（组播）".into(),
        _         => "E 类（保留）".into(),
    }
}

fn mask_to_binary(mask: Ipv4Addr) -> String {
    let o = mask.octets();
    format!("{:08b}.{:08b}.{:08b}.{:08b}", o[0], o[1], o[2], o[3])
}

// ── IPv6 ──────────────────────────────────────────────

fn calculate_v6(ip_str: &str, prefix_str: &str) -> Result<SubnetInfo, String> {
    let prefix: u8 = prefix_str
        .parse()
        .map_err(|_| format!("无效的前缀长度: {}", prefix_str))?;
    if prefix > 128 {
        return Err(format!("IPv6 前缀长度不能超过 128，当前: {}", prefix));
    }

    let ip: Ipv6Addr = ip_str
        .parse()
        .map_err(|_| format!("无效的 IPv6 地址: {}", ip_str))?;
    let network = Ipv6Network::new(ip, prefix)
        .map_err(|e| format!("网络地址错误: {}", e))?;

    let net_addr = network.network();
    let mask     = network.mask();
    let net_u128 = u128::from(net_addr);

    // 末个地址：避免 /0 时 1<<128 溢出
    let last_u128 = if prefix == 0 {
        u128::MAX
    } else {
        net_u128.saturating_add((1u128 << (128 - prefix)) - 1)
    };
    let last_addr = Ipv6Addr::from(last_u128);

    let total_str   = format!("2^{}", 128 - prefix);
    let addr_type   = ipv6_addr_type(ip);
    let expanded_ip = expand_ipv6(ip);
    let mask_str    = format!("{} (/{prefix})", mask);

    let items = vec![
        ("版本".into(),     "IPv6".into()),
        ("网络地址".into(), net_addr.to_string()),
        ("末个地址".into(), last_addr.to_string()),
        ("前缀掩码".into(), mask_str),
        ("前缀掩码（展开）".into(), expand_ipv6(mask)),
        ("总地址数".into(), total_str),
        ("地址类型".into(), addr_type),
        ("输入地址（展开）".into(), expanded_ip),
    ];
    Ok(SubnetInfo { items })
}

fn expand_ipv6(addr: Ipv6Addr) -> String {
    addr.segments()
        .iter()
        .map(|s| format!("{:04x}", s))
        .collect::<Vec<_>>()
        .join(":")
}

fn ipv6_addr_type(addr: Ipv6Addr) -> String {
    let segs = addr.segments();
    let u = u128::from(addr);

    if u == 1 {
        return "回环地址 (::1)".into();
    }
    if u == 0 {
        return "未指定地址 (::)".into();
    }
    // fe80::/10 — 链路本地
    if segs[0] & 0xffc0 == 0xfe80 {
        return "链路本地单播 (fe80::/10)".into();
    }
    // fc00::/7 — 唯一本地 (ULA)
    if segs[0] & 0xfe00 == 0xfc00 {
        return "唯一本地单播 ULA (fc00::/7)".into();
    }
    // ff00::/8 — 组播
    if segs[0] & 0xff00 == 0xff00 {
        return "组播 (ff00::/8)".into();
    }
    // 2002::/16 — 6to4
    if segs[0] == 0x2002 {
        return "6to4 (2002::/16)".into();
    }
    // 2001::/32 — Teredo
    if segs[0] == 0x2001 && segs[1] == 0x0000 {
        return "Teredo (2001::/32)".into();
    }
    // 2000::/3 — 全球单播
    if segs[0] & 0xe000 == 0x2000 {
        return "全球单播 (2000::/3)".into();
    }
    "未知类型".into()
}
