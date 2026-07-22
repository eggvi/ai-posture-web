/**
 * 生成 Web 端的 deviceToken（UUID v4）
 */
export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";

  const key = "ai_posture_device_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID?.() ?? generateUUIDv4();
    localStorage.setItem(key, token);
  }
  return token;
}

function generateUUIDv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
