use ipnetwork::Ipv4Network;
use std::net::Ipv4Addr;

pub struct SubnetInfo {
    pub items: Vec<(String, String)>, // (label, value)
}

pub fn calculate(ip_str: &str, prefix_str: &str) -> Result<SubnetInfo, String> {
    let ip_str = ip_str.trim();
    let prefix_str = prefix_str.trim();

    // 解析前缀：支持数字 "24" 或点分掩码 "255.255.255.0"
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
            return Err(format!("前缀长度不能超过 32，当前: {}", n));
        }
        n
    };

    // 解析 IP，允许带 CIDR 格式
    let ip_clean = ip_str.split('/').next().unwrap_or(ip_str);
    let ip: Ipv4Addr = ip_clean
        .parse()
        .map_err(|_| format!("无效的 IP 地址: {}", ip_clean))?;

    let network = Ipv4Network::new(ip, prefix)
        .map_err(|e| format!("网络地址错误: {}", e))?;

    let net_addr = network.network();
    let broadcast = network.broadcast();
    let mask = network.mask();
    let total: u64 = (network.size() as u64).max(1);

    let (first_host, last_host, host_count) = if prefix >= 31 {
        // /31 和 /32 特殊处理（点对点链路 / 主机路由）
        (net_addr.to_string(), broadcast.to_string(), total)
    } else {
        let first = Ipv4Addr::from(u32::from(net_addr) + 1);
        let last = Ipv4Addr::from(u32::from(broadcast) - 1);
        (first.to_string(), last.to_string(), total - 2)
    };

    // 计算通配符掩码（反掩码）
    let mask_u32 = u32::from(mask);
    let wildcard = Ipv4Addr::from(!mask_u32);

    // IP 类别
    let class = ip_class(ip);

    let items = vec![
        ("网络地址".to_string(), net_addr.to_string()),
        ("广播地址".to_string(), broadcast.to_string()),
        ("子网掩码".to_string(), format!("{} (/{prefix})", mask)),
        ("通配符掩码".to_string(), wildcard.to_string()),
        ("可用首地址".to_string(), first_host),
        ("可用末地址".to_string(), last_host),
        ("可用主机数".to_string(), format!("{}", host_count)),
        ("总地址数".to_string(), format!("{}", total)),
        ("IP 类别".to_string(), class),
        ("二进制掩码".to_string(), mask_to_binary(mask)),
    ];

    Ok(SubnetInfo { items })
}

fn dotted_mask_to_prefix(mask: Ipv4Addr) -> Result<u8, String> {
    let bits = u32::from(mask);
    let ones = bits.count_ones();
    // 验证掩码连续（高位全 1，低位全 0）
    let expected = if ones == 0 {
        0u32
    } else {
        !((1u32 << (32 - ones)) - 1)
    };
    if bits != expected {
        return Err(format!("不连续的子网掩码: {}", mask));
    }
    Ok(ones as u8)
}

fn ip_class(ip: Ipv4Addr) -> String {
    let first = ip.octets()[0];
    match first {
        0..=127 => "A 类 (0.0.0.0 – 127.255.255.255)".to_string(),
        128..=191 => "B 类 (128.0.0.0 – 191.255.255.255)".to_string(),
        192..=223 => "C 类 (192.0.0.0 – 223.255.255.255)".to_string(),
        224..=239 => "D 类（组播）".to_string(),
        _ => "E 类（保留）".to_string(),
    }
}

fn mask_to_binary(mask: Ipv4Addr) -> String {
    let octs = mask.octets();
    format!(
        "{:08b}.{:08b}.{:08b}.{:08b}",
        octs[0], octs[1], octs[2], octs[3]
    )
}
