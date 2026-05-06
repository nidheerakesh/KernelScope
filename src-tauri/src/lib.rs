pub mod collectors;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let h = app.handle().clone();
            collectors::system::start_system_collector(h.clone());
            collectors::process::start_process_collector(h.clone());
            collectors::network::start_network_collector(h.clone());
            collectors::filesystem::start_filesystem_collector(h.clone());
            collectors::kernel_events::start_kernel_event_collector(h.clone());
            collectors::syscall::start_syscall_collector(h);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


