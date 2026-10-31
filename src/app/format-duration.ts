export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours === 1 ? '1hr' : `${hours}hrs`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  return parts.length > 0 ? parts.join(' ') : '0m';
}

// A running timer in the same style, with seconds, e.g. "1hr 12m 34s".
export function formatElapsed(totalSeconds: number): string {
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  return totalMinutes > 0 ? `${formatDuration(totalMinutes)} ${seconds}s` : `${seconds}s`;
}
