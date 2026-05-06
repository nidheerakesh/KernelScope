use serde::Serialize;
use sysinfo::{System, ProcessRefreshKind};
use std::time::Duration;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
    pub status: String,
}

pub fn start_process_collector(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut sys = System::new();
        
        loop {
            // Refresh process list
            sys.refresh_processes_specifics(sysinfo::ProcessesToUpdate::All, true, ProcessRefreshKind::everything());
            
            let mut processes = Vec::new();
            
            for (pid, process) in sys.processes() {
                processes.push(ProcessInfo {
                    pid: pid.as_u32(),
                    ppid: process.parent().map(|p| p.as_u32()),
                    name: process.name().to_string_lossy().to_string(),
                    cpu_usage: process.cpu_usage(),
                    memory: process.memory(),
                    status: process.status().to_string(),
                });
            }

            // Emit to frontend
            if let Err(e) = app_handle.emit("process-metrics", processes) {
                eprintln!("Failed to emit process metrics: {}", e);
            }

            // Stream at 1Hz (Process graphs are heavy)
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
}
