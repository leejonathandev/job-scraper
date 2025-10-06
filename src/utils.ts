/**
 * Format a date into a consistent string format
 * @param date The date to format
 * @returns Formatted date string in 'YYYY-MM-DD HH:MM:SS' format
 */
export function formatDate(date: Date, timezone: string = 'UTC'): string {
    return date.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
}

/**
 * Truncate a string to a maximum length, adding '...' if truncated
 * @param str The string to truncate
 * @param maxLength Maximum length of the resulting string
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Get new entries from a map that don't exist in an old map
 * @param oldMap The reference map to compare against
 * @param newMap The new map to check for new entries
 * @returns A new map containing only the new entries
 */
export function getNewEntries<K, V>(oldMap: Map<K, V>, newMap: Map<K, V>): Map<K, V> {
    const newEntries = new Map<K, V>();

    for (const [key, value] of newMap) {
        // If the old map does not have the key, it's a new entry.
        if (!oldMap.has(key)) {
            newEntries.set(key, value);
        }
    }

    return newEntries;
}

/**
 * Simple rate limiter that adds a delay between operations
 * @returns Promise that resolves after the rate limit delay
 */
export const rateLimiter = async (): Promise<void> => {
    await new Promise(r => setTimeout(r, 20)); // "All bots can make up to 50 requests per second to our API"
    // this is actually conservative since we're waiting until the request completes before waiting again
};
