use serde::Serialize;
use std::fs;
use std::time::Duration;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct SyscallEvent {
    pub id: u64,
    pub pid: u32,
    pub syscall: String,
    pub args: String,
    pub ret: i64,
    pub duration_ns: u64,
    pub timestamp: u64,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Map Linux x86_64 syscall numbers to names
fn syscall_name(num: i64) -> &'static str {
    match num {
        0 => "read",
        1 => "write",
        2 => "open",
        3 => "close",
        4 => "stat",
        5 => "fstat",
        7 => "poll",
        8 => "lseek",
        9 => "mmap",
        10 => "mprotect",
        11 => "munmap",
        12 => "brk",
        16 => "ioctl",
        17 => "pread64",
        18 => "pwrite64",
        19 => "readv",
        20 => "writev",
        21 => "access",
        22 => "pipe",
        23 => "select",
        24 => "sched_yield",
        32 => "dup",
        33 => "dup2",
        35 => "nanosleep",
        39 => "getpid",
        41 => "socket",
        42 => "connect",
        43 => "accept",
        44 => "sendto",
        45 => "recvfrom",
        46 => "sendmsg",
        47 => "recvmsg",
        49 => "bind",
        50 => "listen",
        56 => "clone",
        57 => "fork",
        59 => "execve",
        60 => "exit",
        61 => "wait4",
        62 => "kill",
        72 => "fcntl",
        78 => "getdents",
        79 => "getcwd",
        80 => "chdir",
        82 => "rename",
        83 => "mkdir",
        84 => "rmdir",
        87 => "unlink",
        89 => "readlink",
        90 => "chmod",
        92 => "chown",
        102 => "getuid",
        110 => "getppid",
        137 => "statfs",
        157 => "prctl",
        186 => "gettid",
        200 => "tkill",
        202 => "futex",
        217 => "getdents64",
        228 => "clock_gettime",
        230 => "clock_nanosleep",
        231 => "exit_group",
        232 => "epoll_wait",
        233 => "epoll_ctl",
        257 => "openat",
        262 => "newfstatat",
        270 => "pselect6",
        271 => "ppoll",
        280 => "utimensat",
        281 => "epoll_pwait",
        288 => "accept4",
        290 => "eventfd2",
        291 => "epoll_create1",
        292 => "dup3",
        293 => "pipe2",
        302 => "prlimit64",
        318 => "getrandom",
        332 => "statx",
        334 => "rseq",
        _ => "unknown",
    }
}

/// Read /proc/[pid]/comm to get the process name
fn get_comm(pid: u32) -> String {
    fs::read_to_string(format!("/proc/{}/comm", pid))
        .unwrap_or_default()
        .trim()
        .to_string()
}

/// Scan /proc/[pid]/syscall for all accessible processes
fn scan_syscalls() -> Vec<SyscallEvent> {
    let mut events = Vec::new();
    let ts = now_ms();

    let entries = match fs::read_dir("/proc") {
        Ok(e) => e,
        Err(_) => return events,
    };

    for entry in entries.flatten() {
        let name = entry.file_name();
        let pid_str = name.to_string_lossy().to_string();
        let pid = match pid_str.parse::<u32>() {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Read /proc/[pid]/syscall
        let syscall_path = format!("/proc/{}/syscall", pid);
        let content = match fs::read_to_string(&syscall_path) {
            Ok(c) => c,
            Err(_) => continue, // Permission denied or process gone
        };

        let trimmed = content.trim();
        if trimmed == "running" || trimmed == "-1" {
            continue; // Process is running in userspace, not in a syscall
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.is_empty() { continue; }

        let syscall_num = match parts[0].parse::<i64>() {
            Ok(n) => n,
            Err(_) => continue,
        };

        let name = syscall_name(syscall_num);
        if name == "unknown" { continue; }

        // Get the arguments (hex addresses)
        let args = if parts.len() > 1 {
            parts[1..std::cmp::min(parts.len(), 4)].join(" ")
        } else {
            String::new()
        };

        events.push(SyscallEvent {
            id: 0, // assigned later
            pid,
            syscall: format!("{} ({}:{})", name, get_comm(pid), pid),
            args,
            ret: syscall_num,
            duration_ns: 0,
            timestamp: ts,
        });
    }

    events
}

pub fn start_syscall_collector(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut id_counter: u64 = 0;
        loop {
            let mut events = scan_syscalls();

            for ev in &mut events {
                id_counter += 1;
                ev.id = id_counter;
            }

            if !events.is_empty() {
                if let Err(e) = app_handle.emit("syscall-metrics", &events) {
                    eprintln!("Failed to emit syscall metrics: {}", e);
                }
            }

            // Poll at 5Hz
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
    });
}
