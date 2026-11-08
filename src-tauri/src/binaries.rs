use std::path::{Path, PathBuf};

pub struct BinaryInfo {
    pub path: PathBuf,
    pub cwd: PathBuf,
}

pub fn find_binary(name: &str) -> BinaryInfo {
    let exe_name = if cfg!(target_os = "windows") {
        format!("{}.exe", name)
    } else {
        name.to_string()
    };

    // 1. Check next to executable or in dev root bin/
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            // Check ./bin/
            let candidate1 = parent.join("bin").join(&exe_name);
            if candidate1.exists() {
                return BinaryInfo {
                    cwd: candidate1.parent().unwrap().to_path_buf(),
                    path: candidate1,
                };
            }
            // Check ../bin/ (for development or resources)
            let candidate2 = parent.join("..").join("bin").join(&exe_name);
            if candidate2.exists() {
                return BinaryInfo {
                    cwd: candidate2.parent().unwrap().to_path_buf(),
                    path: candidate2,
                };
            }
            // Check resources/bin/ (Tauri bundle resources)
            let candidate3 = parent.join("resources").join("bin").join(&exe_name);
            if candidate3.exists() {
                return BinaryInfo {
                    cwd: candidate3.parent().unwrap().to_path_buf(),
                    path: candidate3,
                };
            }
        }
    }

    // Check relative to current working directory
    let cwd_bin = Path::new("bin").join(&exe_name);
    if cwd_bin.exists() {
        return BinaryInfo {
            cwd: PathBuf::from("bin"),
            path: cwd_bin,
        };
    }

    // 2. Check system PATH via `which`
    if let Ok(found) = which::which(&exe_name) {
        let parent = found.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| PathBuf::from("."));
        return BinaryInfo {
            path: found,
            cwd: parent,
        };
    }

    // Default fallback
    BinaryInfo {
        path: PathBuf::from("bin").join(&exe_name),
        cwd: PathBuf::from("bin"),
    }
}
