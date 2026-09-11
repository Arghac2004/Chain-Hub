import express from 'express'
import { getTransactions, saveTransaction } from '../controllers/txController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// All transaction routes require a valid JWT
// GET  /api/transactions/:address – get txs for a wallet
router.get('/:address', requireAuth, getTransactions)

// POST /api/transactions           – save a new transaction
router.post('/', requireAuth, saveTransaction)

export default router
