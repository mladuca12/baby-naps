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
