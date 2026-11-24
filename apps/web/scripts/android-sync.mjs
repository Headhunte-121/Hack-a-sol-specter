// Copy the built web files into the Android project WITHOUT the website's own APK.
// Why: public/suraksha.apk is the download the website offers. `cap sync` copies dist/ (which contains it) into the app's assets, so every rebuild
// embedded the previous APK inside the new one (23 MB, then 35 MB, against 12 MB for a clean build). This runs the sync and then removes that copy.
// Usage (from apps/web, after `npm run build`):  npm run android:sync   then   cd android && gradlew assembleRelease
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sync = spawnSync('npx cap sync android', { cwd: root, stdio: 'inherit', shell: true })
if (sync.status !== 0) process.exit(sync.status ?? 1)

const nested = join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'suraksha.apk')
if (existsSync(nested)) {
  const mb = (statSync(nested).size / 1048576).toFixed(1)
  rmSync(nested)
  console.log(`removed the copy of suraksha.apk (${mb} MB) from the app's assets`)
} else {
  console.log('no copy of suraksha.apk in the app assets: nothing to remove')
}
