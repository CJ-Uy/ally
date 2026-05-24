import { PairingData } from "./storage";

export function decodePairingCode(code: string): PairingData | null {
  try {
    const trimmed = code.trim();
    const decoded = atob(trimmed);
    const newlineIdx = decoded.indexOf("\n");
    if (newlineIdx === -1) return null;
    const dbUrl = decoded.slice(0, newlineIdx).trim();
    const authToken = decoded.slice(newlineIdx + 1).trim();
    if (!dbUrl || !authToken) return null;
    return { dbUrl, authToken };
  } catch {
    return null;
  }
}

// libsql:// → https:// for the HTTP pipeline API
export function toHttpUrl(dbUrl: string): string {
  return dbUrl.replace(/^libsql:\/\//, "https://");
}
