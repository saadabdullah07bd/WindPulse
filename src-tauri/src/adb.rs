use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use serde::{Deserialize, Serialize};
use regex::Regex;
use crate::binaries::find_binary;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DeviceInfo {
    pub serial: String,
    pub state: String,
    pub model: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MdnsService {
    pub name: String,
    pub r#type: String,
    pub address: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AdbResponse {
    pub success: bool,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DevicesResponse {
    pub success: bool,
    pub devices: Vec<DeviceInfo>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DeviceNameResponse {
    pub success: bool,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MdnsResponse {
    pub success: bool,
    pub services: Vec<MdnsService>,
    pub error: Option<String>,
}

pub fn run_adb_cmd(args: &[&str]) -> Result<String, String> {
    let adb = find_binary("adb");
    let mut cmd = Command::new(&adb.path);
    cmd.args(args);
    cmd.current_dir(&adb.cwd);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd.output().map_err(|e| format!("Failed to execute adb: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        Ok(stdout)
    } else {
        let err_msg = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("Process exited with status {:?}", output.status.code())
        };
        Err(err_msg)
    }
}

pub fn start_server() -> AdbResponse {
    match run_adb_cmd(&["start-server"]) {
        Ok(msg) => AdbResponse {
            success: true,
            message: Some(msg),
            error: None,
        },
        Err(e) => AdbResponse {
            success: false,
            message: None,
            error: Some(e),
        },
    }
}

pub fn list_devices() -> DevicesResponse {
    match run_adb_cmd(&["devices", "-l"]) {
        Ok(stdout) => {
            let mut devices = Vec::new();
            let model_regex = Regex::new(r"model:(\S+)").unwrap();
            let device_regex = Regex::new(r"device:(\S+)").unwrap();
            let line_regex = Regex::new(r"^(\S+)\s+(device|unauthorized|offline)\s*(.*)").unwrap();

            for line in stdout.lines().skip(1) {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                if let Some(caps) = line_regex.captures(trimmed) {
                    let serial = caps[1].to_string();
                    let state = caps[2].to_string();
                    let info = caps.get(3).map(|m| m.as_str()).unwrap_or("");

                    let model = model_regex
                        .captures(info)
                        .map(|c| c[1].to_string())
                        .unwrap_or_else(|| serial.clone());

                    let name = device_regex
                        .captures(info)
                        .map(|c| c[1].to_string())
                        .unwrap_or_else(|| model.clone());

                    devices.push(DeviceInfo {
                        serial,
                        state,
                        model,
                        name,
                    });
                }
            }

            DevicesResponse {
                success: true,
                devices,
                error: None,
            }
        }
        Err(e) => DevicesResponse {
            success: false,
            devices: Vec::new(),
            error: Some(e),
        },
    }
}

pub fn get_device_name(serial: &str) -> DeviceNameResponse {
    // 1. Try global device_name
    if let Ok(out) = run_adb_cmd(&["-s", serial, "shell", "settings", "get", "global", "device_name"]) {
        if !out.is_empty() && out != "null" && !out.contains("error") {
            return DeviceNameResponse { success: true, name: out };
        }
    }

    // 2. Try bluetooth_name
    if let Ok(out) = run_adb_cmd(&["-s", serial, "shell", "settings", "get", "secure", "bluetooth_name"]) {
        if !out.is_empty() && out != "null" {
            return DeviceNameResponse { success: true, name: out };
        }
    }

    // 3. Try ro.product.model
    if let Ok(out) = run_adb_cmd(&["-s", serial, "shell", "getprop", "ro.product.model"]) {
        if !out.is_empty() {
            return DeviceNameResponse { success: true, name: out };
        }
    }

    DeviceNameResponse {
        success: false,
        name: serial.to_string(),
    }
}

pub fn connect(ip: &str) -> AdbResponse {
    match run_adb_cmd(&["connect", ip]) {
        Ok(out) => {
            let success = !out.contains("failed") && !out.contains("unable");
            AdbResponse {
                success,
                message: Some(out.clone()),
                error: if success { None } else { Some(out) },
            }
        }
        Err(e) => AdbResponse {
            success: false,
            message: None,
            error: Some(e),
        },
    }
}

pub fn tcpip(serial: &str) -> AdbResponse {
    match run_adb_cmd(&["-s", serial, "tcpip", "5555"]) {
        Ok(out) => AdbResponse {
            success: true,
            message: Some(out),
            error: None,
        },
        Err(e) => AdbResponse {
            success: false,
            message: None,
            error: Some(e),
        },
    }
}

pub fn disconnect(serial: &str) -> AdbResponse {
    match run_adb_cmd(&["disconnect", serial]) {
        Ok(out) => AdbResponse {
            success: true,
            message: Some(out),
            error: None,
        },
        Err(e) => AdbResponse {
            success: false,
            message: None,
            error: Some(e),
        },
    }
}

pub fn pair(address: &str, code: &str) -> AdbResponse {
    // Newer ADB supports direct argument `adb pair <address> <code>`
    match run_adb_cmd(&["pair", address, code]) {
        Ok(out) => {
            let success = out.to_lowercase().contains("successfully");
            AdbResponse {
                success,
                message: Some(out.clone()),
                error: if success { None } else { Some(out) },
            }
        }
        Err(e) => AdbResponse {
            success: false,
            message: None,
            error: Some(e),
        },
    }
}

pub fn mdns_services() -> MdnsResponse {
    match run_adb_cmd(&["mdns", "services"]) {
        Ok(stdout) => {
            let mut services = Vec::new();
            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.to_lowercase().starts_with("list of") {
                    continue;
                }
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                if parts.len() >= 3 {
                    services.push(MdnsService {
                        name: parts[0].to_string(),
                        r#type: parts[1].to_string(),
                        address: parts[2].to_string(),
                    });
                }
            }
            MdnsResponse {
                success: true,
                services,
                error: None,
            }
        }
        Err(e) => MdnsResponse {
            success: false,
            services: Vec::new(),
            error: Some(e),
        },
    }
}
