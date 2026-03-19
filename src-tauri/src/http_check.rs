use std::time::{Duration, Instant};

pub struct CheckResult {
    pub url: String,
    pub status_code: String,
    pub latency: String,
    /// 0=连接错误, 1=2xx, 2=3xx, 3=4xx, 4=5xx
    pub category: i32,
}

/// 并发检测所有 URL
pub async fn check_urls(urls: &[String]) -> Vec<CheckResult> {
    let client = match build_client() {
        Ok(c) => c,
        Err(e) => {
            return urls
                .iter()
                .map(|u| CheckResult {
                    url: u.clone(),
                    status_code: format!("客户端错误: {}", e),
                    latency: "-".to_string(),
                    category: 0,
                })
                .collect()
        }
    };

    let client = std::sync::Arc::new(client);
    let mut handles = Vec::with_capacity(urls.len());

    for url in urls {
        let client = client.clone();
        let url = url.clone();
        handles.push(tokio::spawn(async move { check_one(&client, url).await }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for h in handles {
        match h.await {
            Ok(r) => results.push(r),
            Err(_) => {} // task panic，忽略
        }
    }
    results
}

async fn check_one(client: &reqwest::Client, url: String) -> CheckResult {
    // 简单校验 URL
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return CheckResult {
            url,
            status_code: "URL 格式错误（需以 http:// 或 https:// 开头）".to_string(),
            latency: "-".to_string(),
            category: 0,
        };
    }

    let start = Instant::now();
    let resp = client.get(&url).send().await;
    let latency_ms = start.elapsed().as_millis();

    match resp {
        Ok(r) => {
            let code = r.status().as_u16();
            let category = match code {
                200..=299 => 1,
                300..=399 => 2,
                400..=499 => 3,
                500..=599 => 4,
                _ => 0,
            };
            let desc = r.status().canonical_reason().unwrap_or("");
            CheckResult {
                url,
                status_code: format!("{} {}", code, desc),
                latency: format!("{} ms", latency_ms),
                category,
            }
        }
        Err(e) => {
            let msg = if e.is_timeout() {
                "超时".to_string()
            } else if e.is_connect() {
                "连接失败".to_string()
            } else if e.is_redirect() {
                "重定向错误".to_string()
            } else {
                format!("错误: {}", e)
            };
            CheckResult {
                url,
                status_code: msg,
                latency: format!("{} ms", latency_ms),
                category: 0,
            }
        }
    }
}

fn build_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(5))
        .user_agent("net-toolkit/0.1 (network engineer tool)")
        .build()
}
