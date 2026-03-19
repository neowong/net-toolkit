use std::time::{Duration, Instant};
use tokio::net::{TcpStream, UdpSocket};
use tokio::time::timeout;

pub struct PortResult {
    pub port: u16,
    pub protocol: String,
    pub status: String, // "open" | "closed" | "filtered" | "open|filtered"
    pub latency_ms: Option<u64>,
}

pub async fn check_tcp(host: &str, port: u16, timeout_ms: u64) -> PortResult {
    let addr = format!("{}:{}", host, port);
    let start = Instant::now();

    match timeout(Duration::from_millis(timeout_ms), TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => PortResult {
            port,
            protocol: "TCP".into(),
            status: "open".into(),
            latency_ms: Some(start.elapsed().as_millis() as u64),
        },
        Ok(Err(e)) => {
            let status = if e.kind() == std::io::ErrorKind::ConnectionRefused {
                "closed"
            } else {
                "filtered"
            };
            PortResult { port, protocol: "TCP".into(), status: status.into(), latency_ms: None }
        }
        Err(_) => PortResult {
            port,
            protocol: "TCP".into(),
            status: "filtered".into(),
            latency_ms: None,
        },
    }
}

/// UDP 无握手，探测逻辑：
/// - 发送空报文，等待回包 → open
/// - 收到 ConnectionRefused（对应 ICMP Port Unreachable）→ closed
/// - 超时 → open|filtered（无法区分，常见于防火墙）
pub async fn check_udp(host: &str, port: u16, timeout_ms: u64) -> PortResult {
    let start = Instant::now();

    let sock = match UdpSocket::bind("0.0.0.0:0").await {
        Ok(s) => s,
        Err(_) => {
            return PortResult {
                port,
                protocol: "UDP".into(),
                status: "error".into(),
                latency_ms: None,
            }
        }
    };

    let target = format!("{}:{}", host, port);
    if sock.connect(&target).await.is_err() {
        return PortResult { port, protocol: "UDP".into(), status: "error".into(), latency_ms: None };
    }

    // 发送空 UDP 报文触发响应
    let _ = sock.send(b"\x00").await;

    let mut buf = [0u8; 256];
    match timeout(Duration::from_millis(timeout_ms), sock.recv(&mut buf)).await {
        Ok(Ok(_)) => PortResult {
            port,
            protocol: "UDP".into(),
            status: "open".into(),
            latency_ms: Some(start.elapsed().as_millis() as u64),
        },
        Ok(Err(e)) if e.kind() == std::io::ErrorKind::ConnectionRefused => PortResult {
            port,
            protocol: "UDP".into(),
            status: "closed".into(),
            latency_ms: None,
        },
        _ => PortResult {
            port,
            protocol: "UDP".into(),
            status: "open|filtered".into(),
            latency_ms: None,
        },
    }
}

/// 解析端口规格字符串，例如 "22,80,443,8080-8090"
pub fn parse_ports(spec: &str) -> Result<Vec<u16>, String> {
    let mut ports = Vec::new();

    for part in spec.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((s, e)) = part.split_once('-') {
            let start: u16 = s.trim().parse().map_err(|_| format!("无效端口: \"{}\"", part))?;
            let end: u16 = e.trim().parse().map_err(|_| format!("无效端口范围: \"{}\"", part))?;
            if start > end {
                return Err(format!("端口范围无效: {}-{}（起始必须 ≤ 结束）", start, end));
            }
            ports.extend(start..=end);
        } else {
            let p: u16 = part.parse().map_err(|_| format!("无效端口: \"{}\"", part))?;
            ports.push(p);
        }
    }

    if ports.is_empty() {
        return Err("端口列表为空".into());
    }
    if ports.len() > 10_000 {
        return Err(format!("端口数量过多（{}），上限 10000", ports.len()));
    }
    Ok(ports)
}
