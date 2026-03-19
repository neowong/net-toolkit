use std::net::IpAddr;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::sync::Semaphore;

pub struct HostResult {
    pub ip: String,
    pub alive: bool,
    pub latency_ms: Option<u64>,
}

/// 扫描整个网段，每扫描出一个结果就调用 on_result 回调
pub async fn scan_network<F>(
    cidr: &str,
    timeout_ms: u64,
    max_concurrent: usize,
    stop_flag: Arc<Mutex<bool>>,
    on_result: F,
) -> Result<(), String>
where
    F: Fn(HostResult, usize, usize) + Send + Sync + 'static,
{
    let network: ipnetwork::IpNetwork = cidr.parse().map_err(|_| {
        // 判断用户是否输入了裸 IP（漏了 /前缀）
        if cidr.parse::<std::net::IpAddr>().is_ok() {
            format!(
                "请输入网段格式，例如: {}/24（IP 地址后面需要加掩码前缀）",
                cidr
            )
        } else {
            format!(
                "无效的网络地址: \"{}\"，正确格式为: 192.168.1.0/24",
                cidr
            )
        }
    })?;

    let ips: Vec<IpAddr> = network.iter().collect();
    let total = ips.len();
    if total == 0 {
        return Err("网络地址为空".to_string());
    }

    let semaphore = Arc::new(Semaphore::new(max_concurrent.max(1)));
    let done_count = Arc::new(Mutex::new(0usize));
    let on_result = Arc::new(on_result);

    let mut handles = Vec::with_capacity(total);

    for ip in ips {
        if *stop_flag.lock().unwrap() {
            break;
        }

        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| e.to_string())?;

        let stop_flag = stop_flag.clone();
        let done_count = done_count.clone();
        let on_result = on_result.clone();

        let handle = tokio::spawn(async move {
            let _permit = permit; // 作用域结束自动释放

            if *stop_flag.lock().unwrap() {
                return;
            }

            let ip_str = ip.to_string();
            let result = ping_host(&ip_str, timeout_ms).await;

            let mut count = done_count.lock().unwrap();
            *count += 1;
            let current = *count;
            drop(count);

            on_result(
                HostResult {
                    ip: ip_str,
                    alive: result.is_some(),
                    latency_ms: result,
                },
                current,
                total,
            );
        });

        handles.push(handle);
    }

    for h in handles {
        let _ = h.await;
    }

    Ok(())
}

/// 通过系统 ping 命令检测主机存活
/// 无需 root 权限（系统 ping 已有 setuid / capabilities）
async fn ping_host(ip: &str, timeout_ms: u64) -> Option<u64> {
    let start = Instant::now();

    #[cfg(target_os = "windows")]
    let output = tokio::process::Command::new("ping")
        .args(["-n", "1", "-w", &timeout_ms.to_string(), ip])
        .output()
        .await;

    #[cfg(not(target_os = "windows"))]
    let output = {
        // Linux/macOS: -W 单位是秒，向上取整
        let secs = ((timeout_ms + 999) / 1000).to_string();
        tokio::process::Command::new("ping")
            .args(["-c", "1", "-W", &secs, ip])
            .output()
            .await
    };

    match output {
        Ok(out) if out.status.success() => Some(start.elapsed().as_millis() as u64),
        _ => None,
    }
}
