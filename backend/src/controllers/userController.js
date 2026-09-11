import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'

export async function connectWallet(req, res) {
  try {
    const { walletAddress } = req.body

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: 'Invalid wallet address' })
    }

    const normalized = walletAddress.toLowerCase()

    // Upsert: create if not exists, update timestamp if exists
    const user = await prisma.user.upsert({
      where:  { walletAddress: normalized },
      update: { updatedAt: new Date() },
      create: { walletAddress: normalized },
    })
// jwt token generation 
    const token = signToken(user)

    return res.status(200).json({
      message: 'Wallet connected successfully',
      token,            
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
      user,
    })
  } catch (error) {
    console.error('[connectWallet]', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
    return res.json({ user })
  } catch (error) {
    console.error('[getMe]', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

export async function getUserByAddress(req, res) {
  try {
    const { address } = req.params

    const user = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.json({ user })
  } catch (error) {
    console.error('[getUserByAddress]', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

export async function updateMe(req, res) {
  try {
    const { username, bio, avatarUrl } = req.body

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(username  !== undefined && { username }),
        ...(bio       !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    })

    return res.json({ message: 'Profile updated', user })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' })
    }
    console.error('[updateMe]', error)
    return res.status(500).json({ message: 'Server error' })
  }
}
