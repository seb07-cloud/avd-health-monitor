use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyLog {
    pub timestamp: String,
    pub endpoint: String,
    pub latency_ms: f64,
    pub status: String,
}

pub struct Logger {
    log_path: PathBuf,
    retention_days: u32,
}

impl Logger {
    pub fn new(retention_days: u32) -> std::io::Result<Self> {
        let log_dir = Self::get_log_directory()?;
        fs::create_dir_all(&log_dir)?;

        let log_file = log_dir.join(format!(
            "avd_latency_{}.log",
            Local::now().format("%Y-%m-%d")
        ));

        Ok(Self {
            log_path: log_file,
            retention_days,
        })
    }

    fn get_log_directory() -> std::io::Result<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            let appdata = std::env::var("APPDATA")
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::NotFound, e))?;
            Ok(PathBuf::from(appdata).join("AVDHealthMonitor").join("logs"))
        }

        #[cfg(not(target_os = "windows"))]
        {
            let home = std::env::var("HOME")
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::NotFound, e))?;
            Ok(PathBuf::from(home)
                .join(".config")
                .join("avd-health-monitor")
                .join("logs"))
        }
    }

    pub fn log_latency(
        &self,
        endpoint: &str,
        latency: f64,
        status: &str,
    ) -> std::io::Result<()> {
        let log_entry = LatencyLog {
            timestamp: Local::now().to_rfc3339(),
            endpoint: endpoint.to_string(),
            latency_ms: latency,
            status: status.to_string(),
        };

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)?;

        writeln!(
            file,
            "{}",
            serde_json::to_string(&log_entry).unwrap_or_default()
        )?;

        Ok(())
    }

    pub fn cleanup_old_logs(&self) -> std::io::Result<()> {
        let log_dir = Self::get_log_directory()?;
        if !log_dir.exists() {
            return Ok(());
        }

        let cutoff_time = Local::now()
            .checked_sub_days(chrono::Days::new(self.retention_days as u64))
            .unwrap();

        for entry in fs::read_dir(log_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() && path.extension().map_or(false, |e| e == "log") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        let modified_time: DateTime<Local> = modified.into();
                        if modified_time < cutoff_time {
                            let _ = fs::remove_file(&path);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    pub fn get_log_path(&self) -> &PathBuf {
        &self.log_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logger_creation() {
        let logger = Logger::new(30);
        assert!(logger.is_ok());
    }

    #[test]
    fn test_log_entry() {
        let logger = Logger::new(30).unwrap();
        let result = logger.log_latency("test.example.com", 45.5, "good");
        assert!(result.is_ok());
    }
}
