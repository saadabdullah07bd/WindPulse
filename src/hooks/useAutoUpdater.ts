import { useState, useEffect, useCallback } from "react";
import type { UpdateInfo, DownloadProgress, UpdaterStatus } from "@/types/windpulse";

export function useAutoUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    const wp = window.windpulse;
    if (!wp) return;

    // Fetch initial status from Rust backend
    wp.updaterStatus?.()
      .then((status: UpdaterStatus) => {
        setIsDownloading(status.is_downloading);
        setIsReady(status.is_ready);
        if (status.latest_version) {
          setUpdateInfo({
            available: status.is_ready || status.is_downloading,
            current_version: status.current_version,
            latest_version: status.latest_version,
          });
        }
      })
      .catch(() => {});

    // Listen to updater events from Rust backend
    const unAvailable = wp.onUpdaterAvailable?.((info) => {
      setUpdateInfo(info);
      if (info.available) {
        setIsDownloading(true);
      }
    });

    const unProgress = wp.onUpdaterProgress?.((prog) => {
      setIsDownloading(true);
      setProgress(prog);
    });

    const unReady = wp.onUpdaterReady?.((data) => {
      setIsDownloading(false);
      setIsReady(true);
      if (data.version) {
        setUpdateInfo((prev) =>
          prev ? { ...prev, latest_version: data.version! } : null
        );
      }
    });

    return () => {
      unAvailable?.();
      unProgress?.();
      unReady?.();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    const wp = window.windpulse;
    if (!wp?.updaterCheck) return null;
    setIsChecking(true);
    setCheckError(null);
    try {
      const res = await wp.updaterCheck();
      setUpdateInfo(res);
      if (res.available && res.download_url && res.file_name && !isReady && !isDownloading) {
        setIsDownloading(true);
        wp.updaterDownload?.(res.download_url, res.file_name).catch(() => {
          setIsDownloading(false);
        });
      }
      return res;
    } catch (err: unknown) {
      setCheckError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [isReady, isDownloading]);

  const applyUpdateAndRestart = useCallback(async () => {
    const wp = window.windpulse;
    if (!wp?.updaterApplyAndRestart) return;
    try {
      await wp.updaterApplyAndRestart();
    } catch (err) {
      console.error("Failed to restart for update:", err);
    }
  }, []);

  return {
    updateInfo,
    isDownloading,
    isReady,
    progress,
    isChecking,
    checkError,
    checkForUpdates,
    applyUpdateAndRestart,
  };
}
