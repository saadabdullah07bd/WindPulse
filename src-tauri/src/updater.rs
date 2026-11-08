use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State, Window};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: Option<String>,
    pub download_url: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdaterStatus {
    pub current_version: String,
    pub is_downloading: bool,
    pub is_ready: bool,
    pub latest_version: Option<String>,
    pub download_percent: u8,
}

#[derive(Deserialize, Debug)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Deserialize, Debug)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GithubAsset>,
    #[serde(default)]
    draft: bool,
}

pub struct UpdaterState {
    pub latest_info: Mutex<Option<UpdateInfo>>,
    pub downloaded_installer: Mutex<Option<PathBuf>>,
    pub is_downloading: Mutex<bool>,
    pub download_percent: Mutex<u8>,
}

impl UpdaterState {
    pub fn new() -> Self {
        Self {
            latest_info: Mutex::new(None),
            downloaded_installer: Mutex::new(None),
            is_downloading: Mutex::new(false),
            download_percent: Mutex::new(0),
        }
    }
}

pub fn parse_version(v: &str) -> Vec<u32> {
    v.trim_start_matches(|c: char| c == 'v' || c == 'V' || !c.is_numeric())
        .split(|c: char| c == '.' || c == '-' || c == '_')
        .filter_map(|s| s.parse::<u32>().ok())
        .collect()
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    let curr = parse_version(current);
    let late = parse_version(latest);

    let max_len = curr.len().max(late.len());
    for i in 0..max_len {
        let c = *curr.get(i).unwrap_or(&0);
        let l = *late.get(i).unwrap_or(&0);
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    false
}

pub fn check_github_releases(current_ver: &str) -> Result<UpdateInfo, String> {
    let url = "https://api.github.com/repos/saadabdullah07bd/WindPulse/releases/latest";
    let resp = ureq::get(url)
        .set("User-Agent", "WindPulse-App")
        .set("Accept", "application/vnd.github.v3+json")
        .timeout(Duration::from_secs(12))
        .call()
        .map_err(|e| format!("Network request failed: {}", e))?;

    let release: GithubRelease = resp
        .into_json()
        .map_err(|e| format!("Failed to parse release metadata: {}", e))?;

    if release.draft {
        return Ok(UpdateInfo {
            available: false,
            current_version: current_ver.to_string(),
            latest_version: release.tag_name,
            release_notes: None,
            download_url: None,
            file_name: None,
            file_size: None,
        });
    }

    let is_newer = is_newer_version(current_ver, &release.tag_name);

    if !is_newer {
        return Ok(UpdateInfo {
            available: false,
            current_version: current_ver.to_string(),
            latest_version: release.tag_name,
            release_notes: release.body,
            download_url: None,
            file_name: None,
            file_size: None,
        });
    }

    // Locate the setup installer asset (.Setupx64.exe)
    let setup_asset = release.assets.iter().find(|a| {
        let lower = a.name.to_lowercase();
        lower.ends_with(".exe") && (lower.contains("setup") || lower.contains("installer") || lower.contains("windpulse"))
    });

    if let Some(asset) = setup_asset {
        Ok(UpdateInfo {
            available: true,
            current_version: current_ver.to_string(),
            latest_version: release.tag_name,
            release_notes: release.body,
            download_url: Some(asset.browser_download_url.clone()),
            file_name: Some(asset.name.clone()),
            file_size: Some(asset.size),
        })
    } else {
        Ok(UpdateInfo {
            available: false,
            current_version: current_ver.to_string(),
            latest_version: release.tag_name,
            release_notes: release.body,
            download_url: None,
            file_name: None,
            file_size: None,
        })
    }
}

pub fn download_installer_file(
    download_url: &str,
    file_name: &str,
    window: Option<&Window>,
) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir();
    let temp_installer = temp_dir.join(format!("windpulse_update_{}", file_name));

    let resp = ureq::get(download_url)
        .set("User-Agent", "WindPulse-App")
        .timeout(Duration::from_secs(180))
        .call()
        .map_err(|e| format!("Download request error: {}", e))?;

    let total_bytes: u64 = resp
        .header("content-length")
        .and_then(|l| l.parse::<u64>().ok())
        .unwrap_or(0);

    let mut reader = resp.into_reader();
    let mut file = File::create(&temp_installer)
        .map_err(|e| format!("Failed to create temporary file: {}", e))?;

    let mut buffer = [0u8; 32768];
    let mut downloaded: u64 = 0;
    let mut last_percent: u8 = 0;

    loop {
        let n = reader
            .read(&mut buffer)
            .map_err(|e| format!("Download stream read error: {}", e))?;
        if n == 0 {
            break;
        }
        file.write_all(&buffer[..n])
            .map_err(|e| format!("Write error during download: {}", e))?;
        downloaded += n as u64;

        if total_bytes > 0 {
            let percent = ((downloaded as f64 / total_bytes as f64) * 100.0) as u8;
            if percent != last_percent {
                last_percent = percent;
                if let Some(win) = window {
                    let _ = win.emit(
                        "updater:progress",
                        DownloadProgress {
                            downloaded_bytes: downloaded,
                            total_bytes,
                            percentage: percent,
                        },
                    );
                }
            }
        }
    }

    file.flush()
        .map_err(|e| format!("Flush error during download: {}", e))?;

    if let Some(win) = window {
        let _ = win.emit(
            "updater:downloaded",
            serde_json::json!({
                "installer_path": temp_installer.to_string_lossy().to_string(),
                "file_size": downloaded
            }),
        );
    }

    Ok(temp_installer)
}

pub fn start_auto_update_worker(app: AppHandle) {
    thread::spawn(move || {
        // Give UI 3 seconds to render completely before checking
        thread::sleep(Duration::from_secs(3));

        let current_version = env!("CARGO_PKG_VERSION");
        let update_info = match check_github_releases(current_version) {
            Ok(info) => info,
            Err(e) => {
                eprintln!("[AutoUpdater] Startup check failed: {}", e);
                return;
            }
        };

        if !update_info.available {
            return;
        }

        let state = app.state::<UpdaterState>();
        {
            let mut info_guard = state.latest_info.lock().unwrap();
            *info_guard = Some(update_info.clone());
        }

        let _ = app.emit_all("updater:available", &update_info);

        let download_url = match &update_info.download_url {
            Some(u) => u.clone(),
            None => return,
        };
        let file_name = update_info
            .file_name
            .clone()
            .unwrap_or_else(|| "WindPulseV2.0.Setupx64.exe".to_string());

        {
            let mut downloading = state.is_downloading.lock().unwrap();
            if *downloading {
                return;
            }
            *downloading = true;
        }

        let window = app.get_window("main");
        match download_installer_file(&download_url, &file_name, window.as_ref()) {
            Ok(path) => {
                let mut inst_guard = state.downloaded_installer.lock().unwrap();
                *inst_guard = Some(path.clone());
                let mut downloading = state.is_downloading.lock().unwrap();
                *downloading = false;

                let _ = app.emit_all(
                    "updater:ready",
                    serde_json::json!({
                        "version": update_info.latest_version,
                        "installer_path": path.to_string_lossy().to_string(),
                    }),
                );
            }
            Err(e) => {
                eprintln!("[AutoUpdater] Download failed: {}", e);
                let mut downloading = state.is_downloading.lock().unwrap();
                *downloading = false;
                let _ = app.emit_all("updater:error", serde_json::json!({ "error": e }));
            }
        }
    });
}

#[tauri::command]
pub fn updater_check() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION");
    check_github_releases(current_version)
}

#[tauri::command]
pub fn updater_status(state: State<UpdaterState>) -> UpdaterStatus {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let is_downloading = *state.is_downloading.lock().unwrap();
    let is_ready = state.downloaded_installer.lock().unwrap().is_some();
    let latest_version = state
        .latest_info
        .lock()
        .unwrap()
        .as_ref()
        .map(|i| i.latest_version.clone());
    let download_percent = *state.download_percent.lock().unwrap();

    UpdaterStatus {
        current_version,
        is_downloading,
        is_ready,
        latest_version,
        download_percent,
    }
}

#[tauri::command]
pub fn updater_download(
    app: AppHandle,
    state: State<UpdaterState>,
    download_url: String,
    file_name: String,
) -> Result<String, String> {
    {
        let mut downloading = state.is_downloading.lock().unwrap();
        if *downloading {
            return Err("Download is already in progress".to_string());
        }
        *downloading = true;
    }

    let app_clone = app.clone();
    thread::spawn(move || {
        let window = app_clone.get_window("main");
        let state = app_clone.state::<UpdaterState>();

        match download_installer_file(&download_url, &file_name, window.as_ref()) {
            Ok(path) => {
                let mut inst_guard = state.downloaded_installer.lock().unwrap();
                *inst_guard = Some(path.clone());
                let mut downloading = state.is_downloading.lock().unwrap();
                *downloading = false;

                let _ = app_clone.emit_all(
                    "updater:ready",
                    serde_json::json!({
                        "installer_path": path.to_string_lossy().to_string(),
                    }),
                );
            }
            Err(e) => {
                let mut downloading = state.is_downloading.lock().unwrap();
                *downloading = false;
                let _ = app_clone.emit_all("updater:error", serde_json::json!({ "error": e }));
            }
        }
    });

    Ok("Download started".to_string())
}

#[tauri::command]
pub fn updater_apply_and_restart(state: State<UpdaterState>) -> Result<(), String> {
    let path = {
        let guard = state.downloaded_installer.lock().unwrap();
        guard.clone()
    };

    let installer_path = match path {
        Some(p) => p,
        None => return Err("No downloaded update available to install".to_string()),
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let temp_dir = std::env::temp_dir();
        let bat_path = temp_dir.join("windpulse_apply_update.bat");

        let bat_content = format!(
            "@echo off\r\n\
            timeout /t 2 /nobreak >nul\r\n\
            start \"\" /wait \"{}\" /VERYSILENT /SUPPRESSMSGBOXES\r\n\
            if exist \"{}\" (\r\n\
                start \"\" \"{}\"\r\n\
            ) else if exist \"%ProgramFiles%\\WindPulse\\WindPulse.exe\" (\r\n\
                start \"\" \"%ProgramFiles%\\WindPulse\\WindPulse.exe\"\r\n\
            )\r\n\
            del \"%~f0\"\r\n",
            installer_path.to_string_lossy(),
            current_exe.to_string_lossy(),
            current_exe.to_string_lossy()
        );

        std::fs::write(&bat_path, bat_content)
            .map_err(|e| format!("Failed to create updater batch script: {}", e))?;

        let mut cmd = std::process::Command::new("cmd.exe");
        cmd.args(&["/c", bat_path.to_str().unwrap()]);
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        cmd.spawn()
            .map_err(|e| format!("Failed to launch updater: {}", e))?;

        std::process::exit(0);
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Auto-update restart is only supported on Windows".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_parsing_and_comparison() {
        assert!(is_newer_version("2.0.0", "v2.1.0"));
        assert!(is_newer_version("2.1.0", "2.1.1"));
        assert!(is_newer_version("2.1.0", "v2.2.0"));
        assert!(is_newer_version("2.1.0", "v3.0.0"));
        assert!(!is_newer_version("2.1.0", "v2.1.0"));
        assert!(!is_newer_version("2.1.0", "2.1.0"));
        assert!(!is_newer_version("2.1.1", "v2.1.0"));
        assert!(!is_newer_version("3.0.0", "v2.1.0"));
    }
}
