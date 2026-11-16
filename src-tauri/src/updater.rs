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

pub fn extract_tag_from_release_url(url: &str) -> Option<String> {
    let marker = "/releases/tag/";
    let idx = url.find(marker)?;
    let tag = &url[idx + marker.len()..];
    let clean = tag.split(['?', '#']).next().unwrap_or(tag).trim();
    if clean.is_empty() {
        None
    } else {
        Some(clean.to_string())
    }
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

fn check_github_web_fallback(current_ver: &str) -> Result<UpdateInfo, String> {
    let latest_url = "https://github.com/saadabdullah07bd/WindPulse/releases/latest";
    let resp = ureq::get(latest_url)
        .set("User-Agent", "WindPulse-App")
        .timeout(Duration::from_secs(12))
        .call()
        .map_err(|e| format!("Fallback release check failed: {}", e))?;

    let final_url = resp.get_url().to_string();
    let tag_name = extract_tag_from_release_url(&final_url)
        .ok_or_else(|| "Could not determine latest release tag".to_string())?;

    if !is_newer_version(current_ver, &tag_name) {
        return Ok(UpdateInfo {
            available: false,
            current_version: current_ver.to_string(),
            latest_version: tag_name,
            release_notes: None,
            download_url: None,
            file_name: None,
            file_size: None,
        });
    }

    let file_name = "WindPulseV2.0.Setupx64.exe".to_string();
    let download_url = format!(
        "https://github.com/saadabdullah07bd/WindPulse/releases/download/{}/{}",
        tag_name, file_name
    );

    let head_resp = ureq::head(&download_url)
        .set("User-Agent", "WindPulse-App")
        .timeout(Duration::from_secs(12))
        .call()
        .map_err(|e| format!("Failed to verify release installer asset: {}", e))?;

    let file_size = head_resp
        .header("content-length")
        .and_then(|s| s.parse::<u64>().ok());

    Ok(UpdateInfo {
        available: true,
        current_version: current_ver.to_string(),
        latest_version: tag_name,
        release_notes: None,
        download_url: Some(download_url),
        file_name: Some(file_name),
        file_size,
    })
}

pub fn check_github_releases(current_ver: &str) -> Result<UpdateInfo, String> {
    let url = "https://api.github.com/repos/saadabdullah07bd/WindPulse/releases/latest";
    let resp = match ureq::get(url)
        .set("User-Agent", "WindPulse-App")
        .set("Accept", "application/vnd.github.v3+json")
        .timeout(Duration::from_secs(12))
        .call()
    {
        Ok(r) => r,
        Err(ureq::Error::Status(code, _)) if code == 403 || code == 429 => {
            return check_github_web_fallback(current_ver);
        }
        Err(e) => {
            if let Ok(fallback) = check_github_web_fallback(current_ver) {
                return Ok(fallback);
            }
            return Err(format!("Network request failed: {}", e));
        }
    };

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
    app: Option<&AppHandle>,
    window: Option<&Window>,
) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir();
    let temp_installer = temp_dir.join(format!("windpulse_update_{}", file_name));
    let part_installer = temp_dir.join(format!("windpulse_update_{}.part", file_name));
    let _ = std::fs::remove_file(&part_installer);

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
    let mut file = File::create(&part_installer)
        .map_err(|e| format!("Failed to create temporary file: {}", e))?;

    let mut buffer = [0u8; 32768];
    let mut downloaded: u64 = 0;
    let mut last_percent: u8 = 0;

    loop {
        let n = reader.read(&mut buffer).map_err(|e| {
            let _ = std::fs::remove_file(&part_installer);
            format!("Download stream read error: {}", e)
        })?;
        if n == 0 {
            break;
        }
        file.write_all(&buffer[..n]).map_err(|e| {
            let _ = std::fs::remove_file(&part_installer);
            format!("Write error during download: {}", e)
        })?;
        downloaded += n as u64;

        if total_bytes > 0 {
            let percent = ((downloaded as f64 / total_bytes as f64) * 100.0).min(100.0) as u8;
            if percent != last_percent {
                last_percent = percent;
                if let Some(handle) = app {
                    let state = handle.state::<UpdaterState>();
                    *state.download_percent.lock().unwrap() = percent;
                }
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

    file.flush().map_err(|e| {
        let _ = std::fs::remove_file(&part_installer);
        format!("Flush error during download: {}", e)
    })?;
    drop(file);

    if downloaded == 0 || (total_bytes > 0 && downloaded < total_bytes) {
        let _ = std::fs::remove_file(&part_installer);
        return Err("Incomplete update download".to_string());
    }

    let _ = std::fs::remove_file(&temp_installer);
    std::fs::rename(&part_installer, &temp_installer)
        .map_err(|e| format!("Failed to finalize downloaded installer: {}", e))?;

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
        // Give UI 3 seconds to render completely before first check
        thread::sleep(Duration::from_secs(3));

        loop {
            let state = app.state::<UpdaterState>();
            let already_ready = state.downloaded_installer.lock().unwrap().is_some();
            let already_downloading = *state.is_downloading.lock().unwrap();

            if already_ready {
                break;
            }

            if !already_downloading {
                let current_version = env!("CARGO_PKG_VERSION");
                if let Ok(update_info) = check_github_releases(current_version) {
                    if update_info.available {
                        {
                            let mut info_guard = state.latest_info.lock().unwrap();
                            *info_guard = Some(update_info.clone());
                        }

                        let _ = app.emit_all("updater:available", &update_info);

                        if let Some(download_url) = update_info.download_url.clone() {
                            let file_name = update_info
                                .file_name
                                .clone()
                                .unwrap_or_else(|| "WindPulseV2.0.Setupx64.exe".to_string());

                            let can_start = {
                                let mut downloading = state.is_downloading.lock().unwrap();
                                if *downloading {
                                    false
                                } else {
                                    *downloading = true;
                                    true
                                }
                            };

                            if can_start {
                                let window = app.get_window("main");
                                match download_installer_file(
                                    &download_url,
                                    &file_name,
                                    Some(&app),
                                    window.as_ref(),
                                ) {
                                    Ok(path) => {
                                        {
                                            let mut inst_guard =
                                                state.downloaded_installer.lock().unwrap();
                                            *inst_guard = Some(path.clone());
                                        }
                                        *state.is_downloading.lock().unwrap() = false;

                                        let _ = app.emit_all(
                                            "updater:ready",
                                            serde_json::json!({
                                                "version": update_info.latest_version,
                                                "installer_path": path.to_string_lossy().to_string(),
                                            }),
                                        );
                                        break;
                                    }
                                    Err(e) => {
                                        eprintln!("[AutoUpdater] Download failed: {}", e);
                                        *state.is_downloading.lock().unwrap() = false;
                                        let _ = app.emit_all(
                                            "updater:error",
                                            serde_json::json!({ "error": e }),
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Re-check every 30 minutes while running
            thread::sleep(Duration::from_secs(1800));
        }
    });
}

#[tauri::command]
pub fn updater_check(state: State<UpdaterState>) -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION");
    let info = check_github_releases(current_version)?;
    *state.latest_info.lock().unwrap() = Some(info.clone());
    Ok(info)
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

        match download_installer_file(&download_url, &file_name, Some(&app_clone), window.as_ref()) {
            Ok(path) => {
                {
                    let mut inst_guard = state.downloaded_installer.lock().unwrap();
                    *inst_guard = Some(path.clone());
                }
                *state.is_downloading.lock().unwrap() = false;
                let latest_version = state
                    .latest_info
                    .lock()
                    .unwrap()
                    .as_ref()
                    .map(|i| i.latest_version.clone());

                let _ = app_clone.emit_all(
                    "updater:ready",
                    serde_json::json!({
                        "version": latest_version,
                        "installer_path": path.to_string_lossy().to_string(),
                    }),
                );
            }
            Err(e) => {
                *state.is_downloading.lock().unwrap() = false;
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
        Some(p) if p.exists() => p,
        Some(_) => return Err("Downloaded update installer file is missing".to_string()),
        None => return Err("No downloaded update available to install".to_string()),
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let pid = std::process::id();
        let temp_dir = std::env::temp_dir();
        let ps1_path = temp_dir.join("windpulse_apply_update.ps1");

        let ps_escape = |s: &str| s.replace('\'', "''");
        let installer_escaped = ps_escape(&installer_path.to_string_lossy());
        let current_exe_escaped = ps_escape(&current_exe.to_string_lossy());
        let ps1_escaped = ps_escape(&ps1_path.to_string_lossy());

        // Wait for WindPulse PID to exit, run Inno Setup elevated with -Wait, then launch installed exe
        let ps1_content = format!(
            "$ErrorActionPreference = 'SilentlyContinue'\r\n\
            $oldPid = {pid}\r\n\
            $installer = '{installer_escaped}'\r\n\
            $fallbackExe = '{current_exe_escaped}'\r\n\
            $selfScript = '{ps1_escaped}'\r\n\
            $p = Get-Process -Id $oldPid -ErrorAction SilentlyContinue\r\n\
            if ($p) {{ $p.WaitForExit(10000) | Out-Null }}\r\n\
            Start-Sleep -Milliseconds 400\r\n\
            $argsList = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/SP-', '/CLOSEAPPLICATIONS', '/FORCEAPPLICATIONS')\r\n\
            $installed = $false\r\n\
            try {{\r\n\
              $proc = Start-Process -FilePath $installer -ArgumentList $argsList -Verb RunAs -Wait -PassThru -ErrorAction Stop\r\n\
              if ($proc -and $proc.ExitCode -eq 0) {{ $installed = $true }}\r\n\
            }} catch {{\r\n\
              $installed = $false\r\n\
            }}\r\n\
            Start-Sleep -Milliseconds 500\r\n\
            $launchExe = $null\r\n\
            $regPaths = @(\r\n\
              'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{{5E1C3782-E7A4-48E6-9E9A-A3D97DF019D2}}_is1',\r\n\
              'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{{5E1C3782-E7A4-48E6-9E9A-A3D97DF019D2}}_is1',\r\n\
              'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{{5E1C3782-E7A4-48E6-9E9A-A3D97DF019D2}}_is1'\r\n\
            )\r\n\
            foreach ($rp in $regPaths) {{\r\n\
              if (Test-Path $rp) {{\r\n\
                $loc = (Get-ItemProperty -Path $rp -ErrorAction SilentlyContinue).InstallLocation\r\n\
                if ($loc) {{\r\n\
                  $candidate = Join-Path $loc 'WindPulse.exe'\r\n\
                  if (Test-Path $candidate) {{ $launchExe = $candidate; break }}\r\n\
                }}\r\n\
              }}\r\n\
            }}\r\n\
            if (-not $launchExe -and (Test-Path \"$env:ProgramFiles\\WindPulse\\WindPulse.exe\")) {{\r\n\
              $launchExe = \"$env:ProgramFiles\\WindPulse\\WindPulse.exe\"\r\n\
            }}\r\n\
            if (-not $launchExe -or (-not $installed -and (Test-Path $fallbackExe))) {{\r\n\
              $launchExe = $fallbackExe\r\n\
            }}\r\n\
            if ($launchExe -and (Test-Path $launchExe)) {{\r\n\
              Start-Process -FilePath $launchExe\r\n\
            }}\r\n\
            if ($installed) {{ Remove-Item -LiteralPath $installer -Force -ErrorAction SilentlyContinue }}\r\n\
            Remove-Item -LiteralPath $selfScript -Force -ErrorAction SilentlyContinue\r\n"
        );

        std::fs::write(&ps1_path, ps1_content)
            .map_err(|e| format!("Failed to create updater helper script: {}", e))?;

        let mut cmd = std::process::Command::new("powershell.exe");
        cmd.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-File",
            ps1_path.to_str().unwrap(),
        ]);
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        cmd.spawn()
            .map_err(|e| format!("Failed to launch updater helper: {}", e))?;

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
        assert!(is_newer_version("2.2.0", "v2.3.0"));
        assert!(is_newer_version("2.1.0", "v3.0.0"));
        assert!(!is_newer_version("2.1.0", "v2.1.0"));
        assert!(!is_newer_version("2.1.0", "2.1.0"));
        assert!(!is_newer_version("2.1.1", "v2.1.0"));
        assert!(!is_newer_version("3.0.0", "v2.1.0"));
    }

    #[test]
    fn test_extract_tag_from_release_url() {
        assert_eq!(
            extract_tag_from_release_url("https://github.com/saadabdullah07bd/WindPulse/releases/tag/v2.3.0"),
            Some("v2.3.0".to_string())
        );
        assert_eq!(
            extract_tag_from_release_url("https://github.com/saadabdullah07bd/WindPulse/releases/tag/v2.3.0?foo=1"),
            Some("v2.3.0".to_string())
        );
        assert_eq!(
            extract_tag_from_release_url("https://github.com/saadabdullah07bd/WindPulse/releases"),
            None
        );
    }
}
