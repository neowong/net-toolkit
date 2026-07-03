use serde::Serialize;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Clone, Serialize)]
pub struct WhoisResult {
    pub domain: String,
    pub raw_text: String,
    pub fields: Vec<WhoisField>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WhoisField {
    pub key: String,
    pub value: String,
}

/// Determine the whois server for a domain
fn whois_server(domain: &str) -> &str {
    let parts: Vec<&str> = domain.split('.').collect();
    let tld = parts.last().unwrap_or(&"com");
    match *tld {
        "cn" => "whois.cnnic.cn",
        "jp" => "whois.jprs.jp",
        "uk" => "whois.nic.uk",
        "de" => "whois.denic.de",
        "ru" => "whois.tcinet.ru",
        _ => "whois.verisign-grs.com",
    }
}

/// Query whois for a domain
pub async fn whois_lookup(domain: &str) -> Result<WhoisResult, String> {
    let server = whois_server(domain);
    let addr = format!("{}:43", server);

    let mut stream = tokio::net::TcpStream::connect(&addr)
        .await
        .map_err(|e| format!("连接 Whois 服务器失败 ({}): {}", server, e))?;

    let query = format!("{}\r\n", domain);
    stream.write_all(query.as_bytes())
        .await
        .map_err(|e| format!("发送查询失败: {}", e))?;

    let mut response = String::new();
    stream.read_to_string(&mut response)
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    let mut fields = Vec::new();
    for line in response.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('%') || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim().to_string();
            let value = value.trim().to_string();
            if !value.is_empty() {
                fields.push(WhoisField { key, value });
            }
        }
    }

    Ok(WhoisResult {
        domain: domain.to_string(),
        raw_text: response,
        fields,
        error: None,
    })
}
