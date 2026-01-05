use image::{ImageBuffer, Rgba, RgbaImage};
use std::io::Cursor;

#[derive(Debug, Clone, Copy)]
pub enum IconStatus {
    Excellent,
    Good,
    Warning,
    Critical,
    Unknown,
}

impl IconStatus {
    pub fn from_latency(latency: f64, thresholds: &LatencyThresholds) -> Self {
        if latency <= thresholds.excellent {
            Self::Excellent
        } else if latency <= thresholds.good {
            Self::Good
        } else if latency <= thresholds.warning {
            Self::Warning
        } else {
            Self::Critical
        }
    }

    fn get_color(&self) -> Rgba<u8> {
        match self {
            Self::Excellent => Rgba([34, 197, 94, 255]),   // Green
            Self::Good => Rgba([234, 179, 8, 255]),        // Yellow
            Self::Warning => Rgba([249, 115, 22, 255]),    // Orange
            Self::Critical => Rgba([239, 68, 68, 255]),    // Red
            Self::Unknown => Rgba([156, 163, 175, 255]),   // Gray
        }
    }
}

#[derive(Debug, Clone)]
pub struct LatencyThresholds {
    pub excellent: f64,
    pub good: f64,
    pub warning: f64,
}

impl Default for LatencyThresholds {
    fn default() -> Self {
        Self {
            excellent: 30.0,
            good: 80.0,
            warning: 150.0,
        }
    }
}

/// Generate a tray icon with a colored circle and latency text
pub fn generate_tray_icon(status: IconStatus, _latency: Option<f64>) -> Vec<u8> {
    let size = 64u32;
    let mut img: RgbaImage = ImageBuffer::new(size, size);

    let color = status.get_color();
    let center_x = size / 2;
    let center_y = size / 2;
    let radius = (size / 2 - 4) as f32;

    // Draw circle
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - center_x as f32;
            let dy = y as f32 - center_y as f32;
            let distance = (dx * dx + dy * dy).sqrt();

            if distance <= radius {
                // Main color
                img.put_pixel(x, y, color);
            } else if distance <= radius + 2.0 {
                // Border
                img.put_pixel(x, y, Rgba([255, 255, 255, 200]));
            } else {
                // Transparent background
                img.put_pixel(x, y, Rgba([0, 0, 0, 0]));
            }
        }
    }

    // Add latency text (simplified - just show the dot for now)
    // In a production app, you'd use a proper font rendering library like rusttype

    // Convert to PNG
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    img.write_to(&mut cursor, image::ImageFormat::Png)
        .expect("Failed to write image");

    buffer
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_icon_status_from_latency() {
        let thresholds = LatencyThresholds::default();

        assert!(matches!(
            IconStatus::from_latency(20.0, &thresholds),
            IconStatus::Excellent
        ));
        assert!(matches!(
            IconStatus::from_latency(50.0, &thresholds),
            IconStatus::Good
        ));
        assert!(matches!(
            IconStatus::from_latency(100.0, &thresholds),
            IconStatus::Warning
        ));
        assert!(matches!(
            IconStatus::from_latency(200.0, &thresholds),
            IconStatus::Critical
        ));
    }

    #[test]
    fn test_generate_icon() {
        let icon_data = generate_tray_icon(IconStatus::Excellent, Some(25.5));
        assert!(!icon_data.is_empty());
        // PNG signature check
        assert_eq!(&icon_data[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
    }
}
