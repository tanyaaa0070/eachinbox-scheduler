export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatTimeOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return diffSec >= 0 ? `in ${diffSec}s` : `${Math.abs(diffSec)}s ago`;
  if (Math.abs(diffMin) < 60) return diffMin >= 0 ? `in ${diffMin}m` : `${Math.abs(diffMin)}m ago`;
  if (Math.abs(diffHour) < 24) return diffHour >= 0 ? `in ${diffHour}h` : `${Math.abs(diffHour)}h ago`;
  return diffDay >= 0 ? `in ${diffDay}d` : `${Math.abs(diffDay)}d ago`;
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
