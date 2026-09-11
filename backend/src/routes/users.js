import express from 'express'
import {
  connectWallet,
  getMe,
  getUserByAddress,
  updateMe,
} from '../controllers/userController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// ── Protected routes (JWT required) ──────────────────────────────────────────
// MUST be defined BEFORE /:address so Express doesn't treat "me" as an address
// GET  /api/users/me  – get own profile via JWT
router.get('/me', requireAuth, getMe)

// PUT  /api/users/me  – update own profile via JWT
router.put('/me', requireAuth, updateMe)

// ── Public routes (no JWT needed) ────────────────────────────────────────────
// POST /api/users/connect  – wallet login / register → returns JWT
router.post('/connect', connectWallet)

// GET  /api/users/:address – public profile lookup
router.get('/:address', getUserByAddress)

export default router
