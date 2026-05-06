use serde::Serialize;
use sysinfo::{System, CpuRefreshKind, RefreshKind, MemoryRefreshKind};
use std::time::Duration;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu_total: f32,
    pub cores: Vec<f32>,
    pub memory_used: u64,
    pub memory_total: u64,
    pub swap_used: u64,
    pub swap_total: u64,
}

pub fn start_system_collector(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Initialize sysinfo with only the information we need for better performance
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything())
        );

        // Warm up
        sys.refresh_cpu_usage();
        tokio::time::sleep(Duration::from_millis(200)).await;

        loop {
            sys.refresh_cpu_usage();
            sys.refresh_memory();

            let mut cores = Vec::new();
            let cpus = sys.cpus();
            for cpu in cpus {
                cores.push(cpu.cpu_usage());
            }

            let cpu_total = sys.global_cpu_usage();

            let metrics = SystemMetrics {
                cpu_total,
                cores,
                memory_used: sys.used_memory(),
                memory_total: sys.total_memory(),
                swap_used: sys.used_swap(),
                swap_total: sys.total_swap(),
            };

            // Emit to frontend
            if let Err(e) = app_handle.emit("system-metrics", metrics) {
                eprintln!("Failed to emit system metrics: {}", e);
            }

            // Stream at 10Hz for fluid animations
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    });
}
