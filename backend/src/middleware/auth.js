import { verifyToken } from '../lib/jwt.js'
import prisma from '../lib/prisma.js'

export async function requireAuth(req, res, next) {
  try {
    //  Extract token from Authorization header
    const authHeader = req.headers['authorization'] ?? ''
    const token      = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    if (!token) {
      return res.status(401).json({ message: 'No token provided. Please connect your wallet.' })
    }

    //  Verify token signature + expiry
    const payload = verifyToken(token)
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token. Please reconnect.' })
    }

    //  Confirm user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    })

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }

    //  Attach to request for downstream handlers
    req.user  = user
    req.token = payload
    next()
  } catch (err) {
    console.error('[requireAuth]', err)
    return res.status(500).json({ message: 'Auth error' })
  }
}

/**
 * optionalAuth – attaches user if token is present, but does NOT block.
 * Useful for routes that work for both guests and logged-in users.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers['authorization'] ?? ''
    const token      = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } })
        if (user) {
          req.user  = user
          req.token = payload
        }
      }
    }
  } catch {
    // silently ignore – optionalAuth never blocks
  }
  next()
}

export default requireAuth
