use std::fs;
use std::path::PathBuf;

pub struct Logger {
    log_path: PathBuf,
}

impl Logger {
    pub fn new(_retention_days: u32) -> std::io::Result<Self> {
        let log_dir = Self::get_log_directory()?;
        fs::create_dir_all(&log_dir)?;

        Ok(Self {
            log_path: log_dir,
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
}
