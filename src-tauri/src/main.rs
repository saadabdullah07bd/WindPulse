#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod binaries;
mod adb;
mod scrcpy;

use tauri::{State, Window};
use serde::{Deserialize, Serialize};
use adb::{AdbResponse, DevicesResponse, DeviceNameResponse, MdnsResponse};
use scrcpy::{ScrcpyManager, ScrcpyStartResponse};
use binaries::find_binary;

#[derive(Serialize, Deserialize)]
pub struct BinariesCheck {
    #[serde(rename = "scrcpyExists")]
    pub scrcpy_exists: bool,
    #[serde(rename = "adbExists")]
    pub adb_exists: bool,
}

#[tauri::command]
fn adb_start_server() -> AdbResponse {
    adb::start_server()
}

#[tauri::command]
fn adb_devices() -> DevicesResponse {
    adb::list_devices()
}

#[tauri::command]
fn adb_device_name(serial: String) -> DeviceNameResponse {
    adb::get_device_name(&serial)
}

#[tauri::command]
fn adb_connect(ip: String) -> AdbResponse {
    adb::connect(&ip)
}

#[tauri::command]
fn adb_tcpip(serial: String) -> AdbResponse {
    adb::tcpip(&serial)
}

#[tauri::command]
fn adb_disconnect(serial: String) -> AdbResponse {
    adb::disconnect(&serial)
}

#[tauri::command]
fn adb_pair(address: String, code: String) -> AdbResponse {
    adb::pair(&address, &code)
}

#[tauri::command]
fn adb_mdns_services() -> MdnsResponse {
    adb::mdns_services()
}

#[tauri::command]
fn check_binaries() -> BinariesCheck {
    let scrcpy = find_binary("scrcpy");
    let adb = find_binary("adb");
    BinariesCheck {
        scrcpy_exists: scrcpy.path.exists(),
        adb_exists: adb.path.exists(),
    }
}

#[tauri::command]
fn scrcpy_start(
    args: Vec<String>,
    window: Window,
    manager: State<ScrcpyManager>,
) -> ScrcpyStartResponse {
    manager.start(args, window)
}

#[tauri::command]
fn scrcpy_stop(id: u32, manager: State<ScrcpyManager>) -> bool {
    manager.stop(id)
}

#[tauri::command]
fn scrcpy_stop_all(manager: State<ScrcpyManager>) -> bool {
    manager.stop_all();
    true
}

#[tauri::command]
fn scrcpy_active_count(manager: State<ScrcpyManager>) -> usize {
    manager.active_count()
}

fn main() {
    let scrcpy_manager = ScrcpyManager::new();

    tauri::Builder::default()
        .manage(scrcpy_manager)
        .invoke_handler(tauri::generate_handler![
            adb_start_server,
            adb_devices,
            adb_device_name,
            adb_connect,
            adb_tcpip,
            adb_disconnect,
            adb_pair,
            adb_mdns_services,
            check_binaries,
            scrcpy_start,
            scrcpy_stop,
            scrcpy_stop_all,
            scrcpy_active_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running windpulse application");
}
