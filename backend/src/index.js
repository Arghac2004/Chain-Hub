import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { prisma } from './lib/prisma.js'

import userRoutes from './routes/users.js'
import transactionRoutes from './routes/transactions.js'

dotenv.config()

const app  = express()
const PORT = Number(process.env.PORT ?? 5000)

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-wallet-address'],
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/users',        userRoutes)
app.use('/api/transactions', transactionRoutes)

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected'
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch {
    dbStatus = 'disconnected'
  }
  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  })
})

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err)
  const status  = err.status ?? 500
  const message = err.message ?? 'Internal server error'
  res.status(status).json({ message })
})

// ─── DB connection test ──────────────────────────────────────────────────────
async function checkDB() {
  try {
    await prisma.$connect()
    console.log('✅  Database connected successfully')
  } catch (err) {
    console.error('⚠️   Database NOT connected:', err.message)
    console.error('    → Set DATABASE_URL in backend/.env and run: npm run db:migrate\n')
  }
}

// ─── Start server with EADDRINUSE handling ───────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log(`\n🚀  ChainHub API  →  http://localhost:${PORT}`)
  console.log(`📡  Env: ${process.env.NODE_ENV ?? 'development'}\n`)
  await checkDB()
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use!`)
    console.error(`    Run this to fix:`)
    console.error(`    Get-Process -Id (netstat -ano | findstr :${PORT}).split()[-1] | Stop-Process\n`)
    process.exit(1)
  } else {
    throw err
  }
})

export default app
