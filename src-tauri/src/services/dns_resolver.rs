use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DnsRecord {
    pub record_type: String,
    pub name: String,
    pub value: String,
    pub ttl: Option<u32>,
    pub priority: Option<u16>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DnsResult {
    pub domain: String,
    pub records: Vec<DnsRecord>,
    pub error: Option<String>,
}

/// Query DNS records for a domain
pub async fn dns_lookup(domain: &str, record_type: &str) -> Result<DnsResult, String> {
    use trust_dns_resolver::TokioAsyncResolver;
    use trust_dns_resolver::config::*;

    let resolver = TokioAsyncResolver::tokio(ResolverConfig::default(), ResolverOpts::default());

    let mut records = Vec::new();
    let rt = record_type.to_uppercase();

    if rt == "A" || rt == "ALL" {
        if let Ok(response) = resolver.ipv4_lookup(domain).await {
            for r in response.iter() {
                records.push(DnsRecord {
                    record_type: "A".to_string(),
                    name: domain.to_string(),
                    value: r.to_string(),
                    ttl: None,
                    priority: None,
                });
            }
        }
    }

    if rt == "AAAA" || rt == "ALL" {
        if let Ok(response) = resolver.ipv6_lookup(domain).await {
            for r in response.iter() {
                records.push(DnsRecord {
                    record_type: "AAAA".to_string(),
                    name: domain.to_string(),
                    value: r.to_string(),
                    ttl: None,
                    priority: None,
                });
            }
        }
    }

    if rt == "MX" || rt == "ALL" {
        if let Ok(response) = resolver.mx_lookup(domain).await {
            for r in response.iter() {
                records.push(DnsRecord {
                    record_type: "MX".to_string(),
                    name: domain.to_string(),
                    value: r.exchange().to_string(),
                    ttl: None,
                    priority: Some(r.preference()),
                });
            }
        }
    }

    if rt == "NS" || rt == "ALL" {
        if let Ok(response) = resolver.ns_lookup(domain).await {
            for r in response.iter() {
                records.push(DnsRecord {
                    record_type: "NS".to_string(),
                    name: domain.to_string(),
                    value: r.to_string(),
                    ttl: None,
                    priority: None,
                });
            }
        }
    }

    if rt == "TXT" || rt == "ALL" {
        if let Ok(response) = resolver.txt_lookup(domain).await {
            for r in response.iter() {
                for txt in r.iter() {
                    records.push(DnsRecord {
                        record_type: "TXT".to_string(),
                        name: domain.to_string(),
                        value: String::from_utf8_lossy(txt).to_string(),
                        ttl: None,
                        priority: None,
                    });
                }
            }
        }
    }

    if rt == "SOA" || rt == "ALL" {
        if let Ok(response) = resolver.soa_lookup(domain).await {
            for r in response.iter() {
                records.push(DnsRecord {
                    record_type: "SOA".to_string(),
                    name: domain.to_string(),
                    value: format!(
                        "{} {} {} {} {} {} {}",
                        r.mname(), r.serial(), r.refresh(), r.retry(), r.expire(),
                        r.minimum(), r.rname()
                    ),
                    ttl: None,
                    priority: None,
                });
            }
        }
    }

    if rt == "SRV" || rt == "ALL" {
        if let Ok(response) = resolver.srv_lookup(domain).await {
            for r in response.iter() {
                records.push(DnsRecord {
                    record_type: "SRV".to_string(),
                    name: domain.to_string(),
                    value: format!("{}:{} (weight={})", r.target(), r.port(), r.weight()),
                    ttl: None,
                    priority: Some(r.priority()),
                });
            }
        }
    }

    if rt == "CAA" || rt == "ALL" {
        use trust_dns_resolver::proto::rr::RecordType;
        if let Ok(response) = resolver.lookup(domain, RecordType::CAA).await {
            for r in response.record_iter() {
                if let Some(cdata) = r.data() {
                    records.push(DnsRecord {
                        record_type: "CAA".to_string(),
                        name: domain.to_string(),
                        value: cdata.to_string(),
                        ttl: Some(r.ttl()),
                        priority: None,
                    });
                }
            }
        }
    }

    if rt == "PTR" || rt == "ALL" {
        if let Ok(addr) = domain.parse::<std::net::IpAddr>() {
            if let Ok(response) = resolver.reverse_lookup(addr).await {
                for r in response.iter() {
                    records.push(DnsRecord {
                        record_type: "PTR".to_string(),
                        name: domain.to_string(),
                        value: r.to_string(),
                        ttl: None,
                        priority: None,
                    });
                }
            }
        }
    }

    if records.is_empty() && record_type != "ALL" {
        return Err(format!("未找到 {} 类型的记录", record_type));
    }

    Ok(DnsResult {
        domain: domain.to_string(),
        records,
        error: None,
    })
}
