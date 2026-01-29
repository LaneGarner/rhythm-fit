/**
 * Convert seconds to m:ss format (e.g., 90 -> "1:30")
 */
export function secondsToTimeString(seconds: number | undefined): string {
  if (seconds == null || seconds === 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse m:ss or ss format to seconds (e.g., "1:30" -> 90, "45" -> 45)
 */
export function timeStringToSeconds(input: string): number | undefined {
  if (!input || input.trim() === '') return undefined;

  const trimmed = input.trim();

  // Handle m:ss format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      return mins * 60 + secs;
    }
  }

  // Handle plain number (treat as seconds)
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? undefined : num;
}
