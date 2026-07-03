use serde::Serialize;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Semaphore;

#[derive(Debug, Clone, Serialize)]
pub struct PingResult {
    pub ip: String,
    pub alive: bool,
    pub response_time_ms: Option<f64>,
    pub error: Option<String>,
}

/// Parse targets: one IP/hostname per line, or CIDR subnet
pub fn parse_targets(input: &str) -> Vec<String> {
    let mut targets = Vec::new();
    for line in input.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if line.contains('/') {
            // CIDR subnet
            if let Ok(ips) = crate::services::live_scanner::parse_cidr(line) {
                for ip in ips {
                    targets.push(ip.to_string());
                }
            }
        } else {
            targets.push(line.to_string());
        }
    }
    targets
}

/// Ping a single host using system ping command
async fn ping_once(ip: &str, timeout_ms: u64) -> PingResult {
    let timeout_secs = (timeout_ms as f64 / 1000.0).ceil() as u64;

    #[cfg(target_os = "windows")]
    let output = tokio::process::Command::new("ping")
        .args(["-n", "1", "-w", &timeout_ms.to_string(), ip])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .await;

    #[cfg(not(target_os = "windows"))]
    let output = tokio::process::Command::new("ping")
        .args(["-c", "1", "-W", &timeout_secs.to_string(), ip])
        .output()
        .await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let success = out.status.success();
            let response_time_ms = parse_ping_time(&stdout);

            PingResult {
                ip: ip.to_string(),
                alive: success,
                response_time_ms,
                error: if success { None } else { Some("无响应".to_string()) },
            }
        }
        Err(e) => PingResult {
            ip: ip.to_string(),
            alive: false,
            response_time_ms: None,
            error: Some(format!("执行失败: {}", e)),
        },
    }
}

/// Parse ping time from output
fn parse_ping_time(output: &str) -> Option<f64> {
    let re = regex::Regex::new(r"time[=<](\d+(?:\.\d+)?)\s*ms").ok()?;
    let caps = re.captures(output)?;
    caps[1].parse::<f64>().ok()
}

/// Batch ping with concurrency limit and real-time event emission
pub async fn batch_ping(
    app: tauri::AppHandle,
    targets: Vec<String>,
    count: u32,
    interval_ms: u64,
    timeout_ms: u64,
    concurrency: usize,
) -> Vec<PingResult> {
    let sem = Arc::new(Semaphore::new(concurrency));
    let mut handles = Vec::with_capacity(targets.len());

    for ip in targets {
        let sem = sem.clone();
        let app = app.clone();
        handles.push(tokio::spawn(async move {
            let _permit = sem.acquire().await;
            let mut last_result = PingResult {
                ip: ip.clone(),
                alive: false,
                response_time_ms: None,
                error: None,
            };

            for round in 0..count {
                if round > 0 {
                    tokio::time::sleep(std::time::Duration::from_millis(interval_ms)).await;
                }
                last_result = ping_once(&ip, timeout_ms).await;

                // Emit per-ping result for real-time UI
                let _ = app.emit("ping-result", serde_json::json!({
                    "ip": &ip,
                    "round": round + 1,
                    "alive": last_result.alive,
                    "response_time_ms": last_result.response_time_ms,
                }));
            }

            last_result
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for h in handles {
        if let Ok(r) = h.await {
            results.push(r);
        }
    }

    // Sort by IP
    results.sort_by(|a, b| {
        let a_parts: Vec<u32> = a.ip.split('.').filter_map(|s| s.parse().ok()).collect();
        let b_parts: Vec<u32> = b.ip.split('.').filter_map(|s| s.parse().ok()).collect();
        a_parts.cmp(&b_parts)
    });

    results
}
