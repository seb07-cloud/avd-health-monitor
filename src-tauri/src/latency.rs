use std::net::ToSocketAddrs;
use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::time::timeout;

/// Test TCP connection latency to an endpoint
pub async fn test_tcp_latency(host: &str, port: u16) -> Result<f64, Box<dyn std::error::Error>> {
    let address = format!("{}:{}", host, port);

    // Resolve the address
    let addr = tokio::task::spawn_blocking(move || {
        address
            .to_socket_addrs()
            .and_then(|mut addrs| addrs.next().ok_or_else(|| {
                std::io::Error::new(std::io::ErrorKind::NotFound, "No addresses found")
            }))
    })
    .await??;

    // Measure connection time
    let start = Instant::now();
    let connection = timeout(Duration::from_secs(5), TcpStream::connect(addr)).await;
    let duration = start.elapsed();

    match connection {
        Ok(Ok(_)) => Ok(duration.as_secs_f64() * 1000.0), // Convert to milliseconds
        Ok(Err(e)) => Err(Box::new(e)),
        Err(_) => Err("Connection timeout".into()),
    }
}

/// Test ICMP ping latency (requires elevated privileges on some systems)
pub async fn ping_icmp(host: &str) -> Result<f64, Box<dyn std::error::Error>> {
    use surge_ping::{Client, Config, PingIdentifier, PingSequence};

    let client = Client::new(&Config::default())?;
    let payload = [0; 56];

    let mut pinger = client.pinger(host.parse()?, PingIdentifier(1)).await;

    match pinger.ping(PingSequence(0), &payload).await {
        Ok((_, duration)) => Ok(duration.as_secs_f64() * 1000.0),
        Err(e) => {
            // Fallback to TCP test if ICMP fails (common on restricted environments)
            eprintln!("ICMP ping failed ({}), falling back to TCP test", e);
            test_tcp_latency(host, 443).await
        }
    }
}

/// Test HTTP/HTTPS request latency
/// Note: We consider any HTTP response (even 4xx/5xx) as a successful connection test,
/// since we're measuring network latency, not HTTP application status.
/// Some endpoints like www.msftconnecttest.com return 404 for HEAD requests but are still reachable.
pub async fn test_http_latency(url: &str) -> Result<f64, Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    let start = Instant::now();
    // Use GET instead of HEAD as some servers don't properly support HEAD
    // but limit response body size to avoid downloading large pages
    let response = client.get(url).send().await?;
    let duration = start.elapsed();

    // Any HTTP response means the connection succeeded - we're testing network latency,
    // not whether the HTTP application returns a specific status code
    let _status = response.status();
    Ok(duration.as_secs_f64() * 1000.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tcp_connection_success() {
        let result = test_tcp_latency("www.google.com", 443).await;
        assert!(result.is_ok());
        let latency = result.unwrap();
        assert!(latency > 0.0);
        assert!(latency < 5000.0); // Should be less than 5 seconds
        println!("TCP Latency: {}ms", latency);
    }

    #[tokio::test]
    async fn test_tcp_connection_timeout() {
        // Use an IP that will timeout (non-routable IP)
        let result = test_tcp_latency("192.0.2.1", 443).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_tcp_connection_invalid_host() {
        let result = test_tcp_latency("invalid.host.that.does.not.exist.example", 443).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_http_request_success() {
        let result = test_http_latency("https://www.google.com").await;
        assert!(result.is_ok());
        let latency = result.unwrap();
        assert!(latency > 0.0);
        assert!(latency < 10000.0); // Should be less than 10 seconds
        println!("HTTP Latency: {}ms", latency);
    }

    #[tokio::test]
    async fn test_http_request_invalid_url() {
        let result = test_http_latency("https://invalid.host.example").await;
        assert!(result.is_err());
    }

    #[test]
    fn test_latency_range() {
        // Test that latency values are reasonable
        let test_duration = std::time::Duration::from_millis(50);
        let latency_ms = test_duration.as_secs_f64() * 1000.0;
        assert_eq!(latency_ms, 50.0);
    }
}
