import { formatDistanceToNow, format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

/**
 * Format Unix timestamp as relative time (e.g., "2 hours ago")
 * @param unixTimestamp Unix epoch timestamp in seconds
 * @param locale Language locale ('en' or 'ja')
 * @returns Human-readable relative time string
 * @example
 * formatRelativeTime(1704067200, 'en') // "2 hours ago"
 * formatRelativeTime(1704067200, 'ja') // "2時間前"
 */
export function formatRelativeTime(
  unixTimestamp: number,
  locale: 'en' | 'ja' = 'en'
): string {
  const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
  const localeObj = locale === 'ja' ? ja : enUS;

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: localeObj,
  });
}

/**
 * Format Unix timestamp as absolute time (e.g., "Jan 1, 2025, 12:00 AM")
 * @param unixTimestamp Unix epoch timestamp in seconds
 * @param locale Language locale ('en' or 'ja')
 * @returns Formatted date/time string
 * @example
 * formatAbsoluteTime(1704067200, 'en') // "Jan 1, 2025, 12:00 AM"
 * formatAbsoluteTime(1704067200, 'ja') // "2025年1月1日 0:00"
 */
export function formatAbsoluteTime(
  unixTimestamp: number,
  locale: 'en' | 'ja' = 'en'
): string {
  const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
  const localeObj = locale === 'ja' ? ja : enUS;

  const formatString = locale === 'ja' ? 'yyyy年M月d日 H:mm' : 'MMM d, yyyy, h:mm a';

  return format(date, formatString, { locale: localeObj });
}

/**
 * Format Unix timestamp as short date (e.g., "Jan 1, 2025")
 * @param unixTimestamp Unix epoch timestamp in seconds
 * @param locale Language locale ('en' or 'ja')
 * @returns Formatted date string (without time)
 * @example
 * formatShortDate(1704067200, 'en') // "Jan 1, 2025"
 * formatShortDate(1704067200, 'ja') // "2025年1月1日"
 */
export function formatShortDate(
  unixTimestamp: number,
  locale: 'en' | 'ja' = 'en'
): string {
  const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
  const localeObj = locale === 'ja' ? ja : enUS;

  const formatString = locale === 'ja' ? 'yyyy年M月d日' : 'MMM d, yyyy';

  return format(date, formatString, { locale: localeObj });
}

/**
 * Get current Unix timestamp in seconds
 * @returns Current Unix epoch timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
