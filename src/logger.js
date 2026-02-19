import { invoke } from "@tauri-apps/api/core";

export const logEvent = async (level, message) => {
  try {
    await invoke("log_event", {
      log: {
        level,
        message,
      },
    });
    console.log(`Logged: [${level}] ${message}`);
  } catch (error) {
    console.error("Failed to log event:", error);
  }
};