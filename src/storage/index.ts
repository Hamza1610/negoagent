import { StorageAdapter } from "./adapter";
import { LocalFileAdapter } from "./localAdapter";

let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    const storageType = process.env.STORAGE_TYPE || "json";

    if (storageType === "json") {
      storageInstance = new LocalFileAdapter();
    } else {
      // Fallback or extensible router
      storageInstance = new LocalFileAdapter();
    }
  }

  return storageInstance;
}

export * from "./types";
export * from "./adapter";
export * from "./localAdapter";
