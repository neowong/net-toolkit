#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Panic hook: log to temp file + show MessageBox on Windows
    std::panic::set_hook(Box::new(|info| {
        let msg = info.payload_as_str().unwrap_or("未知 panic");
        let location = info.location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "未知位置".to_string());
        let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let log_line = format!("[{}] PANIC: {} @ {}\n", ts, msg, location);

        let temp_log = std::env::temp_dir().join("net-toolkit-debug.log");
        let _ = std::fs::OpenOptions::new().create(true).append(true).open(&temp_log)
            .and_then(|mut f| { use std::io::Write; f.write_all(log_line.as_bytes()) });

        #[cfg(target_os = "windows")]
        {
            extern "system" {
                fn MessageBoxW(hWnd: *const core::ffi::c_void, lpText: *const u16, lpCaption: *const u16, uType: u32) -> i32;
            }
            let dialog_text = format!(
                "程序发生致命错误:\n\n{}\n\n位置: {}\n\n日志: {}",
                msg, location, temp_log.display()
            );
            let text_utf16: Vec<u16> = dialog_text.encode_utf16().chain(std::iter::once(0)).collect();
            let title: Vec<u16> = "NetToolKit - 致命错误".encode_utf16().chain(std::iter::once(0)).collect();
            unsafe { MessageBoxW(std::ptr::null(), text_utf16.as_ptr(), title.as_ptr(), 0x10); }
        }
    }));

    net_toolkit_lib::run();
}
