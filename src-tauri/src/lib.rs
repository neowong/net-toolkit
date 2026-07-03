pub mod commands;
pub mod services;

use std::sync::Arc;
use tauri::Manager;

pub struct AppState {
    /// 离线 IP 归属地库（ip2region.xdb），setup 时加载，None 表示未加载
    pub ip_db: Arc<parking_lot::RwLock<Option<Arc<Vec<u8>>>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ip_db: Arc::new(parking_lot::RwLock::new(None)),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Debug logging to temp dir
    let debug_log = |msg: &str| {
        let log_file = std::env::temp_dir().join("net-toolkit-debug.log");
        let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = std::fs::OpenOptions::new().create(true).append(true).open(&log_file)
            .and_then(|mut f| { use std::io::Write; writeln!(f, "[{}] {}", ts, msg) });
    };

    debug_log("NetToolKit 启动");

    // Logging: stdout + rolling daily file
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let log_dir = exe_dir.join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    let file_appender = tracing_appender::rolling::daily(&log_dir, "net-toolkit.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    use tracing_subscriber::layer::SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info".into());
    let stdout_layer = tracing_subscriber::fmt::layer()
        .with_writer(std::io::stdout)
        .with_ansi(true);
    let file_layer = tracing_subscriber::fmt::layer()
        .with_writer(non_blocking)
        .with_ansi(false);
    tracing_subscriber::registry()
        .with(env_filter)
        .with(stdout_layer)
        .with(file_layer)
        .init();

    std::mem::forget(_guard);
    debug_log("日志系统初始化完成");

    let state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Load offline IP geolocation database
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()));
            let xdb_path = exe_dir.as_ref().map(|d| d.join("ip2region_v4.xdb"));
            match xdb_path.as_deref() {
                Some(path) if path.exists() => {
                    match crate::services::ip_location::load_xdb(path) {
                        Ok(data) => {
                            let state = app.state::<AppState>();
                            *state.ip_db.write() = Some(Arc::new(data));
                            tracing::info!("ip2region_v4.xdb 已加载: {}", path.display());
                        }
                        Err(e) => {
                            tracing::warn!("ip2region_v4.xdb 加载失败: {}", e);
                        }
                    }
                }
                _ => {
                    tracing::info!("ip2region_v4.xdb 未找到，路由跟踪归属地不可用");
                }
            }
            Ok(())
        })
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::tools::scan_live_hosts,
            commands::tools::scan_ports,
            commands::tools::scan_udp_ports,
            commands::tools::check_web_urls,
            commands::tools::snmp_get,
            commands::tools::snmp_v3_get,
            commands::tools::has_ip_db,
            commands::tools::download_ip_db,
            commands::tools::trace_route,
            commands::tools::start_tftp_server,
            commands::tools::stop_tftp_server,
            commands::tools::start_syslog_server,
            commands::tools::stop_syslog_server,
            commands::tools::batch_ping,
            commands::tools::dns_lookup,
            commands::tools::whois_lookup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
