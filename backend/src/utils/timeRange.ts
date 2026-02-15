/**
 * Utility functions for time range operations
 */

/**
 * Convert a time range string to a Date object
 * @param timeRange - Time range string: '1h', '24h', '7d', '30d'
 * @returns Date object representing the start of the time range
 */
export function getTimeRangeDate(timeRange: string): Date {
  const now = new Date();
  
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}
