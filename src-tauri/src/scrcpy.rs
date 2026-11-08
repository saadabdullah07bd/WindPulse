use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU32, Ordering};
use tauri::Window;
use serde::{Deserialize, Serialize};
use crate::binaries::find_binary;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScrcpyEvent {
    pub id: u32,
    pub data: Option<String>,
    pub code: Option<i32>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ScrcpyStartResponse {
    pub success: bool,
    pub id: Option<u32>,
    pub error: Option<String>,
}

pub struct ScrcpyManager {
    processes: Arc<Mutex<HashMap<u32, Child>>>,
    next_id: AtomicU32,
}

impl ScrcpyManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            next_id: AtomicU32::new(1),
        }
    }

    pub fn start(&self, args: Vec<String>, window: Window) -> ScrcpyStartResponse {
        let scrcpy_bin = find_binary("scrcpy");

        if !scrcpy_bin.path.exists() {
            return ScrcpyStartResponse {
                success: false,
                id: None,
                error: Some(format!("scrcpy executable not found at {:?}", scrcpy_bin.path)),
            };
        }

        let id = self.next_id.fetch_add(1, Ordering::SeqCst);

        let mut cmd = Command::new(&scrcpy_bin.path);
        cmd.args(&args);
        cmd.current_dir(&scrcpy_bin.cwd);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

        match cmd.spawn() {
            Ok(mut child) => {
                let stdout = child.stdout.take();
                let stderr = child.stderr.take();

                let processes_clone = self.processes.clone();
                processes_clone.lock().unwrap().insert(id, child);

                // Stream stdout
                if let Some(out) = stdout {
                    let win = window.clone();
                    std::thread::spawn(move || {
                        let reader = BufReader::new(out);
                        for line in reader.lines().flatten() {
                            let _ = win.emit("scrcpy:stdout", ScrcpyEvent {
                                id,
                                data: Some(line),
                                code: None,
                                error: None,
                            });
                        }
                    });
                }

                // Stream stderr
                if let Some(err) = stderr {
                    let win = window.clone();
                    std::thread::spawn(move || {
                        let reader = BufReader::new(err);
                        for line in reader.lines().flatten() {
                            let _ = win.emit("scrcpy:stderr", ScrcpyEvent {
                                id,
                                data: Some(line),
                                code: None,
                                error: None,
                            });
                        }
                    });
                }

                // Watch exit in background
                let win = window.clone();
                let processes_for_exit = self.processes.clone();
                std::thread::spawn(move || {
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        let mut map = processes_for_exit.lock().unwrap();
                        if let Some(proc) = map.get_mut(&id) {
                            if let Ok(Some(status)) = proc.try_wait() {
                                let code = status.code();
                                map.remove(&id);
                                let _ = win.emit("scrcpy:closed", ScrcpyEvent {
                                    id,
                                    data: None,
                                    code,
                                    error: None,
                                });
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                });

                ScrcpyStartResponse {
                    success: true,
                    id: Some(id),
                    error: None,
                }
            }
            Err(e) => ScrcpyStartResponse {
                success: false,
                id: None,
                error: Some(e.to_string()),
            },
        }
    }

    pub fn stop(&self, id: u32) -> bool {
        let mut map = self.processes.lock().unwrap();
        if let Some(mut proc) = map.remove(&id) {
            let _ = proc.kill();
            true
        } else {
            false
        }
    }

    pub fn stop_all(&self) {
        let mut map = self.processes.lock().unwrap();
        for (_, mut proc) in map.drain() {
            let _ = proc.kill();
        }
    }

    pub fn active_count(&self) -> usize {
        self.processes.lock().unwrap().len()
    }
}
