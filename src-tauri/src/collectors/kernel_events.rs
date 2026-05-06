use serde::Serialize;
use std::fs;
use std::time::Duration;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct KernelEvent {
    pub id: u64,
    #[serde(rename = "type")]
    pub event_type: String,
    pub source: String,
    pub message: String,
    pub severity: String,
    pub timestamp: u64,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Parse /proc/interrupts for real interrupt data
fn read_interrupts() -> Vec<KernelEvent> {
    let mut events = Vec::new();
    let content = match fs::read_to_string("/proc/interrupts") {
        Ok(c) => c,
        Err(_) => return events,
    };

    for line in content.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 { continue; }
        let irq = parts[0].trim_end_matches(':');
        // Get the device name (last field usually)
        let device = parts.last().unwrap_or(&"unknown");
        // Sum counts across all CPUs
        let total: u64 = parts[1..parts.len()-1].iter()
            .filter_map(|s| s.parse::<u64>().ok())
            .sum();

        if total > 0 {
            events.push(KernelEvent {
                id: 0,
                event_type: "IRQ".to_string(),
                source: format!("irq/{}", irq),
                message: format!("{} — total count: {}", device, total),
                severity: "info".to_string(),
                timestamp: now_ms(),
            });
        }
    }
    events
}

/// Parse /proc/stat for context switches, boot time, processes
fn read_stat_events() -> Vec<KernelEvent> {
    let mut events = Vec::new();
    let content = match fs::read_to_string("/proc/stat") {
        Ok(c) => c,
        Err(_) => return events,
    };

    for line in content.lines() {
        if line.starts_with("ctxt ") {
            let val = line.split_whitespace().nth(1).unwrap_or("0");
            events.push(KernelEvent {
                id: 0,
                event_type: "SCHED".to_string(),
                source: "kernel".to_string(),
                message: format!("Total context switches: {}", val),
                severity: "info".to_string(),
                timestamp: now_ms(),
            });
        } else if line.starts_with("processes ") {
            let val = line.split_whitespace().nth(1).unwrap_or("0");
            events.push(KernelEvent {
                id: 0,
                event_type: "SCHED".to_string(),
                source: "kernel".to_string(),
                message: format!("Total forks since boot: {}", val),
                severity: "info".to_string(),
                timestamp: now_ms(),
            });
        } else if line.starts_with("procs_running ") {
            let val = line.split_whitespace().nth(1).unwrap_or("0");
            events.push(KernelEvent {
                id: 0,
                event_type: "SCHED".to_string(),
                source: "scheduler".to_string(),
                message: format!("Currently runnable processes: {}", val),
                severity: "info".to_string(),
                timestamp: now_ms(),
            });
        } else if line.starts_with("procs_blocked ") {
            let val: u64 = line.split_whitespace().nth(1).unwrap_or("0").parse().unwrap_or(0);
            let sev = if val > 5 { "warn" } else { "info" };
            events.push(KernelEvent {
                id: 0,
                event_type: "SCHED".to_string(),
                source: "scheduler".to_string(),
                message: format!("Blocked processes (waiting I/O): {}", val),
                severity: sev.to_string(),
                timestamp: now_ms(),
            });
        }
    }
    events
}

/// Read /proc/loadavg
fn read_loadavg() -> Option<KernelEvent> {
    let content = fs::read_to_string("/proc/loadavg").ok()?;
    let parts: Vec<&str> = content.split_whitespace().collect();
    if parts.len() < 3 { return None; }
    Some(KernelEvent {
        id: 0,
        event_type: "SCHED".to_string(),
        source: "loadavg".to_string(),
        message: format!("Load average: {} {} {} (1/5/15 min)", parts[0], parts[1], parts[2]),
        severity: if parts[0].parse::<f32>().unwrap_or(0.0) > 4.0 { "warn" } else { "info" }.to_string(),
        timestamp: now_ms(),
    })
}

/// Read last lines from dmesg (kernel ring buffer) if accessible
fn read_dmesg_tail() -> Vec<KernelEvent> {
    let mut events = Vec::new();
    let content = match fs::read_to_string("/var/log/kern.log") {
        Ok(c) => c,
        Err(_) => match fs::read_to_string("/var/log/syslog") {
            Ok(c) => c,
            Err(_) => return events,
        }
    };

    // Take last 5 lines
    for line in content.lines().rev().take(5) {
        let severity = if line.contains("error") || line.contains("ERROR") { "error" }
            else if line.contains("warn") || line.contains("WARN") { "warn" }
            else { "info" };
        events.push(KernelEvent {
            id: 0,
            event_type: "DMESG".to_string(),
            source: "kernel".to_string(),
            message: line.chars().take(200).collect(),
            severity: severity.to_string(),
            timestamp: now_ms(),
        });
    }
    events
}

pub fn start_kernel_event_collector(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut id_counter: u64 = 0;
        loop {
            let mut all_events = Vec::new();

            // Collect from all real sources
            all_events.extend(read_stat_events());
            if let Some(la) = read_loadavg() {
                all_events.push(la);
            }
            // Only send top 10 interrupts by count
            let mut irqs = read_interrupts();
            irqs.sort_by(|a, b| b.message.cmp(&a.message));
            all_events.extend(irqs.into_iter().take(10));
            all_events.extend(read_dmesg_tail());

            // Assign IDs
            for ev in &mut all_events {
                id_counter += 1;
                ev.id = id_counter;
            }

            if let Err(e) = app_handle.emit("kernel-events", &all_events) {
                eprintln!("Failed to emit kernel events: {}", e);
            }

            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
}
