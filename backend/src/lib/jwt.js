import jwt from 'jsonwebtoken'

const SECRET  = process.env.JWT_SECRET  ?? 'fallback_secret_change_me'
const EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d'


export function signToken(user) {
  return jwt.sign(
    {
      sub:           user.id,
      walletAddress: user.walletAddress,
    },
    SECRET,
    { expiresIn: EXPIRES }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function decodeToken(token) {
  return jwt.decode(token)
}
