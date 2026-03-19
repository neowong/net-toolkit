use slint::{ModelRc, SharedString, VecModel};
use std::sync::{Arc, Mutex};

mod http_check;
mod scanner;
mod subnet;

slint::include_modules!();

fn main() {
    // 构建 tokio 运行时，后续 on_xxx 回调中可直接 tokio::spawn
    let rt = tokio::runtime::Runtime::new().expect("tokio runtime 创建失败");
    let _guard = rt.enter();

    let app = AppWindow::new().expect("窗口创建失败");

    setup_subnet(&app);
    setup_scanner(&app);
    setup_http_check(&app);

    app.run().expect("程序运行失败");
}

// ─────────────────────────────────────────────
//  子网计算
// ─────────────────────────────────────────────

fn setup_subnet(app: &AppWindow) {
    let app_weak = app.as_weak();

    app.on_calculate_subnet(move |ip, prefix| {
        let app = match app_weak.upgrade() {
            Some(a) => a,
            None => return,
        };

        match subnet::calculate(ip.as_str(), prefix.as_str()) {
            Ok(info) => {
                let rows: Vec<SubnetResult> = info
                    .items
                    .into_iter()
                    .map(|(label, value)| SubnetResult {
                        label: label.into(),
                        value: value.into(),
                    })
                    .collect();
                app.set_subnet_results(ModelRc::new(VecModel::from(rows)));
                app.set_subnet_error(SharedString::default());
            }
            Err(e) => {
                app.set_subnet_results(ModelRc::new(VecModel::<SubnetResult>::default()));
                app.set_subnet_error(e.into());
            }
        }
    });
}

// ─────────────────────────────────────────────
//  IP 扫描
// ─────────────────────────────────────────────

fn setup_scanner(app: &AppWindow) {
    let stop_flag: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));

    // on_start_scan
    {
        let app_weak = app.as_weak();
        let stop_flag = stop_flag.clone();

        app.on_start_scan(move |cidr, timeout_str, concurrent_str| {
            let app = match app_weak.upgrade() {
                Some(a) => a,
                None => return,
            };

            // 重置 UI
            app.set_scan_results(ModelRc::new(VecModel::<ScanResult>::default()));
            app.set_scan_progress(0.0);
            app.set_scan_error(SharedString::default());
            app.set_scan_status("0/0".into());
            app.set_scanning(true);

            // 重置停止标志
            *stop_flag.lock().unwrap() = false;

            let timeout_ms: u64 = timeout_str.parse().unwrap_or(1000);
            let max_concurrent: usize = concurrent_str.parse().unwrap_or(50);
            let cidr_str = cidr.to_string();
            let stop_flag = stop_flag.clone();
            let app_weak = app.as_weak();

            // 用于累积存活结果
            let alive: Arc<Mutex<Vec<ScanResult>>> = Arc::new(Mutex::new(Vec::new()));

            tokio::spawn(async move {
                let alive_for_cb = alive.clone();
                let app_weak_for_cb = app_weak.clone();

                let result = scanner::scan_network(
                    &cidr_str,
                    timeout_ms,
                    max_concurrent,
                    stop_flag,
                    move |host, done, total| {
                        if host.alive {
                            let sr = ScanResult {
                                ip: host.ip.clone().into(),
                                alive: true,
                                latency: format!(
                                    "{} ms",
                                    host.latency_ms.unwrap_or(0)
                                )
                                .into(),
                            };
                            alive_for_cb.lock().unwrap().push(sr);
                        }

                        let snapshot = alive_for_cb.lock().unwrap().clone();
                        let progress = done as f32 / total.max(1) as f32;
                        let status = format!("{}/{}", done, total);
                        let app_weak = app_weak_for_cb.clone();

                        slint::invoke_from_event_loop(move || {
                            if let Some(app) = app_weak.upgrade() {
                                app.set_scan_progress(progress);
                                app.set_scan_status(status.into());
                                app.set_scan_results(ModelRc::new(VecModel::from(snapshot)));
                            }
                        })
                        .ok();
                    },
                )
                .await;

                // 扫描结束（正常或停止）
                let app_weak = app_weak.clone();
                let err_msg = match result {
                    Err(e) => e,
                    Ok(_) => String::new(),
                };

                slint::invoke_from_event_loop(move || {
                    if let Some(app) = app_weak.upgrade() {
                        app.set_scanning(false);
                        app.set_scan_progress(1.0);
                        if !err_msg.is_empty() {
                            app.set_scan_error(err_msg.into());
                        }
                    }
                })
                .ok();
            });
        });
    }

    // on_stop_scan
    {
        let app_weak = app.as_weak();
        let stop_flag = stop_flag.clone();

        app.on_stop_scan(move || {
            *stop_flag.lock().unwrap() = true;
            if let Some(app) = app_weak.upgrade() {
                app.set_scan_status("已停止".into());
            }
        });
    }
}

// ─────────────────────────────────────────────
//  HTTP 检测
// ─────────────────────────────────────────────

fn setup_http_check(app: &AppWindow) {
    let app_weak = app.as_weak();

    app.on_start_http_check(move |urls_raw| {
        let app = match app_weak.upgrade() {
            Some(a) => a,
            None => return,
        };

        // 解析 URL 列表（每行一个）
        let url_list: Vec<String> = urls_raw
            .as_str()
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if url_list.is_empty() {
            app.set_http_status("请至少输入一个 URL".into());
            return;
        }

        app.set_http_results(ModelRc::new(VecModel::<HttpResult>::default()));
        app.set_http_checking(true);
        app.set_http_status(format!("正在检测 {} 个 URL...", url_list.len()).into());

        let app_weak = app.as_weak();

        tokio::spawn(async move {
            let raw_results = http_check::check_urls(&url_list).await;

            let slint_results: Vec<HttpResult> = raw_results
                .into_iter()
                .map(|r| HttpResult {
                    url: r.url.into(),
                    status_code: r.status_code.into(),
                    latency: r.latency.into(),
                    category: r.category,
                })
                .collect();

            let count = slint_results.len();

            slint::invoke_from_event_loop(move || {
                if let Some(app) = app_weak.upgrade() {
                    app.set_http_results(ModelRc::new(VecModel::from(slint_results)));
                    app.set_http_checking(false);
                    app.set_http_status(format!("完成，共 {} 个 URL", count).into());
                }
            })
            .ok();
        });
    });
}
