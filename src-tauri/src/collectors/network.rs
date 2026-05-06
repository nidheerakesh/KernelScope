use serde::Serialize;
use std::fs;
use std::time::Duration;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct NetworkConnection {
    pub id: u32,
    pub pid: u32,
    pub process_name: String,
    pub protocol: String,
    pub local_addr: String,
    pub remote_addr: String,
    pub state: String,
    pub inode: u64,
}

fn hex_to_ip_port(hex: &str) -> String {
    let parts: Vec<&str> = hex.split(':').collect();
    if parts.len() != 2 { return hex.to_string(); }
    let ip_hex = parts[0];
    let port = u16::from_str_radix(parts[1], 16).unwrap_or(0);
    if ip_hex.len() == 8 {
        let ip = u32::from_str_radix(ip_hex, 16).unwrap_or(0);
        format!("{}.{}.{}.{}:{}", ip & 0xFF, (ip >> 8) & 0xFF, (ip >> 16) & 0xFF, (ip >> 24) & 0xFF, port)
    } else {
        format!("[::]:{}", port)
    }
}

fn tcp_state(state: &str) -> &'static str {
    match state {
        "01" => "ESTABLISHED",
        "02" => "SYN_SENT",
        "03" => "SYN_RECV",
        "04" => "FIN_WAIT1",
        "05" => "FIN_WAIT2",
        "06" => "TIME_WAIT",
        "07" => "CLOSE",
        "08" => "CLOSE_WAIT",
        "09" => "LAST_ACK",
        "0A" => "LISTEN",
        "0B" => "CLOSING",
        _ => "UNKNOWN",
    }
}

fn parse_proc_net(path: &str, protocol: &str) -> Vec<NetworkConnection> {
    let mut conns = Vec::new();
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return conns,
    };

    for (i, line) in content.lines().enumerate() {
        if i == 0 { continue; } // skip header
        let fields: Vec<&str> = line.split_whitespace().collect();
        if fields.len() < 10 { continue; }

        let local = hex_to_ip_port(fields[1]);
        let remote = hex_to_ip_port(fields[2]);
        let state = if protocol == "UDP" { "ACTIVE".to_string() } else { tcp_state(fields[3]).to_string() };
        let inode = fields[9].parse::<u64>().unwrap_or(0);

        conns.push(NetworkConnection {
            id: i as u32,
            pid: 0, // will be resolved below
            process_name: String::new(),
            protocol: protocol.to_string(),
            local_addr: local,
            remote_addr: remote,
            state,
            inode,
        });
    }
    conns
}

fn resolve_inode_to_pid(inode: u64) -> Option<(u32, String)> {
    if inode == 0 { return None; }
    let target = format!("socket:[{}]", inode);
    if let Ok(entries) = fs::read_dir("/proc") {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let pid_str = name.to_string_lossy().to_string();
            if let Ok(pid) = pid_str.parse::<u32>() {
                let fd_path = format!("/proc/{}/fd", pid);
                if let Ok(fds) = fs::read_dir(&fd_path) {
                    for fd in fds.flatten() {
                        if let Ok(link) = fs::read_link(fd.path()) {
                            if link.to_string_lossy() == target {
                                let comm = fs::read_to_string(format!("/proc/{}/comm", pid))
                                    .unwrap_or_default().trim().to_string();
                                return Some((pid, comm));
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn start_network_collector(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let mut all_conns = Vec::new();
            all_conns.extend(parse_proc_net("/proc/net/tcp", "TCP"));
            all_conns.extend(parse_proc_net("/proc/net/tcp6", "TCP6"));
            all_conns.extend(parse_proc_net("/proc/net/udp", "UDP"));

            // Resolve PIDs for first 50 connections (full scan is expensive)
            for conn in all_conns.iter_mut().take(50) {
                if let Some((pid, name)) = resolve_inode_to_pid(conn.inode) {
                    conn.pid = pid;
                    conn.process_name = name;
                }
            }

            if let Err(e) = app_handle.emit("network-metrics", &all_conns) {
                eprintln!("Failed to emit network metrics: {}", e);
            }

            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
}
