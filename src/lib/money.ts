export function hkd(amount: number) {
  return `HKD ${Math.round(amount).toLocaleString("en-HK")}`;
}

export const HK_TIMEZONE = "Asia/Hong_Kong";

export function formatTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function endTime(start: string, hours: number) {
  const [h, m] = start.split(":").map(Number);
  const total = (h * 60 + m + hours * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return formatTime(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
}
