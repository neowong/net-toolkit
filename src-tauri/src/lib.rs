use serde::{Serialize};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

mod http_check;
mod port_check;
mod scanner;
mod subnet;

// ── 共享状态 ──────────────────────────────────────────

struct ScanState {
    stop_flag: Arc<Mutex<bool>>,
}

struct PortScanState {
    stop_flag: Arc<Mutex<bool>>,
}

// ── 数据结构 ──────────────────────────────────────────

#[derive(Serialize)]
struct SubnetRow {
    label: String,
    value: String,
}

#[derive(Serialize, Clone)]
struct ScanEventPayload {
    ip: String,
    alive: bool,
    #[serde(rename = "latencyMs")]
    latency_ms: Option<u64>,
    done: usize,
    total: usize,
}

#[derive(Serialize)]
struct HttpRow {
    url: String,
    #[serde(rename = "statusCode")]
    status_code: String,
    latency: String,
    category: i32,
}

#[derive(Serialize, Clone)]
struct PortEventPayload {
    port: u16,
    protocol: String,
    status: String,
    #[serde(rename = "latencyMs")]
    latency_ms: Option<u64>,
    done: usize,
    total: usize,
}

// ── Tauri 命令 ────────────────────────────────────────

#[tauri::command]
fn calculate_subnet(ip: String, prefix: String) -> Result<Vec<SubnetRow>, String> {
    let info = subnet::calculate(&ip, &prefix)?;
    Ok(info
        .items
        .into_iter()
        .map(|(label, value)| SubnetRow { label, value })
        .collect())
}

#[tauri::command]
async fn start_scan(
    app: tauri::AppHandle,
    state: tauri::State<'_, ScanState>,
    cidr: String,
    timeout: u64,
    concurrent: usize,
) -> Result<(), String> {
    *state.stop_flag.lock().unwrap() = false;
    let stop_flag = state.stop_flag.clone();

    scanner::scan_network(
        &cidr,
        timeout,
        concurrent,
        stop_flag,
        move |result, done, total| {
            let _ = app.emit(
                "scan-result",
                ScanEventPayload {
                    ip: result.ip,
                    alive: result.alive,
                    latency_ms: result.latency_ms,
                    done,
                    total,
                },
            );
        },
    )
    .await
}

#[tauri::command]
fn stop_scan(state: tauri::State<'_, ScanState>) {
    *state.stop_flag.lock().unwrap() = true;
}

#[tauri::command]
async fn check_http(urls: Vec<String>) -> Vec<HttpRow> {
    http_check::check_urls(&urls)
        .await
        .into_iter()
        .map(|r| HttpRow {
            url: r.url,
            status_code: r.status_code,
            latency: r.latency,
            category: r.category,
        })
        .collect()
}

#[tauri::command]
async fn check_ports(
    app: tauri::AppHandle,
    state: tauri::State<'_, PortScanState>,
    host: String,
    ports: String,
    protocol: String, // "tcp" | "udp" | "both"
    timeout_ms: u64,
    concurrent: usize,
) -> Result<(), String> {
    *state.stop_flag.lock().unwrap() = false;

    let port_list = port_check::parse_ports(&ports)?;

    // 展开任务列表：both 模式每个端口两次（TCP + UDP）
    let tasks: Vec<(u16, &'static str)> = match protocol.to_lowercase().as_str() {
        "udp" => port_list.iter().map(|&p| (p, "udp")).collect(),
        "both" => port_list
            .iter()
            .flat_map(|&p| [(p, "tcp"), (p, "udp")])
            .collect(),
        _ => port_list.iter().map(|&p| (p, "tcp")).collect(),
    };

    let total = tasks.len();
    let semaphore = Arc::new(tokio::sync::Semaphore::new(concurrent.max(1)));
    let done_count = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let stop_flag = state.stop_flag.clone();

    let mut handles = Vec::with_capacity(total);

    for (port, proto) in tasks {
        if *stop_flag.lock().unwrap() {
            break;
        }

        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| e.to_string())?;

        let app = app.clone();
        let host = host.clone();
        let stop_flag = stop_flag.clone();
        let done_count = done_count.clone();

        let handle = tokio::spawn(async move {
            let _permit = permit;
            if *stop_flag.lock().unwrap() {
                return;
            }

            let result = match proto {
                "udp" => port_check::check_udp(&host, port, timeout_ms).await,
                _ => port_check::check_tcp(&host, port, timeout_ms).await,
            };

            let done = done_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
            let _ = app.emit(
                "port-result",
                PortEventPayload {
                    port: result.port,
                    protocol: result.protocol,
                    status: result.status,
                    latency_ms: result.latency_ms,
                    done,
                    total,
                },
            );
        });

        handles.push(handle);
    }

    for h in handles {
        let _ = h.await;
    }

    Ok(())
}

#[tauri::command]
fn stop_port_scan(state: tauri::State<'_, PortScanState>) {
    *state.stop_flag.lock().unwrap() = true;
}

// ── 入口 ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ScanState {
            stop_flag: Arc::new(Mutex::new(false)),
        })
        .manage(PortScanState {
            stop_flag: Arc::new(Mutex::new(false)),
        })
        .invoke_handler(tauri::generate_handler![
            calculate_subnet,
            start_scan,
            stop_scan,
            check_http,
            check_ports,
            stop_port_scan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
