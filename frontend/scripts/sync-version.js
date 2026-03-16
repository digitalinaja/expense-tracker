#!/usr/bin/env node

/**
 * Sync Version Script
 *
 * Automatically syncs APP_VERSION from src/config/version.ts to:
 * 1. public/sw.js (CACHE_NAME)
 * 2. package.json (version field)
 *
 * Usage: node scripts/sync-version.js
 * Or: npm run sync-version (if added to package.json scripts)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const rootDir = path.resolve(__dirname, '..')
const versionFile = path.join(rootDir, 'src/config/version.ts')
const swFile = path.join(rootDir, 'public/sw.js')
const packageFile = path.join(rootDir, 'package.json')

/**
 * Extract version from TypeScript file
 * Matches: export const APP_VERSION = 'v1.0.0'
 */
function extractVersionFromTS(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(/export const APP_VERSION = ['"]([^'"]+)['"]/)
  if (!match) {
    throw new Error(`Could not find APP_VERSION in ${filePath}`)
  }
  return match[1]
}

/**
 * Update version in sw.js
 * Matches: const CACHE_NAME = 'catat-uang-v1.0.0';
 */
function updateServiceWorkerVersion(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const cacheName = `catat-uang-${version}`

  // Update CACHE_NAME
  content = content.replace(
    /const CACHE_NAME = ['"]catat-uang-[^'"]+['"];?/,
    `const CACHE_NAME = '${cacheName}';`
  )

  // Update comment if exists
  content = content.replace(
    /\/\/ Current version: v[\d.]+/,
    `// Current version: ${version}`
  )

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ Updated sw.js: CACHE_NAME = '${cacheName}'`)
}

/**
 * Update version in package.json
 */
function updatePackageVersion(filePath, version) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const cleanVersion = version.replace(/^v/, '') // Remove 'v' prefix
  json.version = cleanVersion
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8')
  console.log(`✅ Updated package.json: version = '${cleanVersion}'`)
}

/**
 * Main execution
 */
try {
  console.log('\n🔄 Syncing app version...\n')

  // Extract version from source of truth
  const version = extractVersionFromTS(versionFile)
  console.log(`📌 Current APP_VERSION: ${version}`)

  // Update files
  updateServiceWorkerVersion(swFile, version)
  updatePackageVersion(packageFile, version)

  console.log('\n✨ Version sync complete!\n')
  console.log('💡 Tip: Only update APP_VERSION in src/config/version.ts')
  console.log('   Run this script to sync to other files automatically.\n')
} catch (error) {
  console.error('\n❌ Error syncing version:', error.message, '\n')
  process.exit(1)
}
