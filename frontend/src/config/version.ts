/**
 * App Version Configuration
 *
 * ════════════════════════════════════════════════════════════════
 * ⚠️  IMPORTANT: VERSION UPDATE GUIDE
 * ════════════════════════════════════════════════════════════════
 * UPDATE VERSION IN ONE PLACE ONLY:
 *
 * 1. 📝 HERE: Update APP_VERSION below
 * 2. 🔄 RUN: npm run sync-version
 *
 * The script will automatically sync to:
 *   - public/sw.js (CACHE_NAME)
 *   - package.json (version)
 *
 * Example:
 *   1. Change APP_VERSION to 'v2.1.0'
 *   2. Run: npm run sync-version
 *   3. Done! ✅
 *
 * ════════════════════════════════════════════════════════════════
 *
 * Format: v{major}.{minor}.{patch}
 * - major: Breaking changes (requires reinstall/update)
 * - minor: New features (backward compatible)
 * - patch: Bug fixes (no breaking changes)
 */
export const APP_VERSION = 'v2.1.3'

/**
 * Cache name for service worker
 * This should match the pattern in sw.js: 'catat-uang-{version}'
 */
export const CACHE_NAME = `catat-uang-${APP_VERSION}`

/**
 * Get app version information
 */
export function getAppVersion(): string {
  return APP_VERSION
}

/**
 * Get cache name
 */
export function getCacheName(): string {
  return CACHE_NAME
}
