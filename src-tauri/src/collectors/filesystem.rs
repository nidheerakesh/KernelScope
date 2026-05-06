use serde::Serialize;
use notify::{Watcher, RecursiveMode, Event, EventKind};
use std::sync::mpsc;
use std::time::Duration;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct FsEvent {
    pub id: u64,
    pub action: String,
    pub path: String,
    pub timestamp: u64,
}

fn event_kind_to_action(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::Create(_) => "Create",
        EventKind::Modify(_) => "Modify",
        EventKind::Remove(_) => "Delete",
        EventKind::Access(_) => "Access",
        _ => "Other",
    }
}

pub fn start_filesystem_collector(app_handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create filesystem watcher: {}", e);
                return;
            }
        };

        // Watch common active directories
        let dirs = ["/tmp", "/var/log", "/home"];
        for dir in &dirs {
            let path = std::path::Path::new(dir);
            if path.exists() {
                if let Err(e) = watcher.watch(path, RecursiveMode::NonRecursive) {
                    eprintln!("Failed to watch {}: {}", dir, e);
                }
            }
        }

        let mut id_counter: u64 = 0;

        loop {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(Ok(event)) => {
                    let action = event_kind_to_action(&event.kind);
                    if action == "Other" { continue; }

                    let mut batch = Vec::new();
                    for path in &event.paths {
                        id_counter += 1;
                        batch.push(FsEvent {
                            id: id_counter,
                            action: action.to_string(),
                            path: path.to_string_lossy().to_string(),
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64,
                        });
                    }

                    if !batch.is_empty() {
                        if let Err(e) = app_handle.emit("fs-metrics", &batch) {
                            eprintln!("Failed to emit fs event: {}", e);
                        }
                    }
                }
                Ok(Err(e)) => eprintln!("Watcher error: {}", e),
                Err(mpsc::RecvTimeoutError::Timeout) => {} // no events, keep looping
                Err(_) => break,
            }
        }
    });
}
