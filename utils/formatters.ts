/**
 * Format timestamp into readable date and time string
 */
export const formatTimestamp = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

/**
 * Truncate text cleanly with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 80): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

