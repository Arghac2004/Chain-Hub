
import { execSync, spawnSync } from 'child_process'

const PORT  = process.env.PORT ?? 5000
const WAIT  = 500   
const RETRY = 5    

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function getOwningPid() {
  try {
    
    const out = spawnSync(
      'powershell',
      ['-NoProfile', '-Command',
       `(Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue).OwningProcess`],
      { encoding: 'utf8', timeout: 5000 }
    )
    const pid = (out.stdout ?? '').trim().split('\n')[0].trim()
    return pid && !isNaN(pid) ? pid : null
  } catch {
    return null
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function freePort() {
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    const pid = getOwningPid()

    if (!pid) {
      if (attempt === 1) {
        console.log(`✅ Port ${PORT} is already free`)
      } else {
        console.log(`✅ Port ${PORT} freed successfully`)
      }
      
      await sleep(WAIT)
      return
    }

    console.log(`🔪 Attempt ${attempt}/${RETRY}: Killing PID ${pid} on port ${PORT}...`)
    killPid(pid)
    await sleep(WAIT)
  }

  // Final check
  const stillUsed = getOwningPid()
  if (stillUsed) {
    console.error(`❌ Could not free port ${PORT} after ${RETRY} attempts (PID ${stillUsed} still running)`)
    process.exit(1)
  }

  console.log(`✅ Port ${PORT} freed successfully`)
  await sleep(WAIT)
}

await freePort()
