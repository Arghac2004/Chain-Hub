import prisma from '../lib/prisma.js'

/**
 * GET /api/transactions/:address
 * Fetch all transactions for a wallet address (paginated).
 */
export async function getTransactions(req, res) {
  try {
    const { address } = req.params
    const page  = parseInt(req.query.page  ?? '1', 10)
    const limit = parseInt(req.query.limit ?? '20', 10)
    const skip  = (page - 1) * limit

    // Find user first
    const user = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId: user.id } }),
    ])

    return res.json({
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[getTransactions]', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

/**
 * POST /api/transactions
 * Save a new on-chain transaction to the database.
 */
export async function saveTransaction(req, res) {
  try {
    const { txHash, from, to, value, network, chainId, status, gasUsed, blockNumber } = req.body

    // Validate required fields
    if (!txHash || !from || !to || !value || !network || !chainId) {
      return res.status(400).json({ message: 'Missing required transaction fields' })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { walletAddress: from.toLowerCase() },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found – connect wallet first' })
    }

    // Upsert to avoid duplicate tx hashes
    const transaction = await prisma.transaction.upsert({
      where:  { txHash },
      update: { status: status ?? 'pending', gasUsed, blockNumber },
      create: {
        txHash,
        from:    from.toLowerCase(),
        to:      to.toLowerCase(),
        value:   String(value),
        network,
        chainId: Number(chainId),
        status:  status ?? 'pending',
        gasUsed,
        blockNumber,
        userId:  user.id,
      },
    })

    return res.status(201).json({ message: 'Transaction saved', transaction })
  } catch (error) {
    console.error('[saveTransaction]', error)
    return res.status(500).json({ message: 'Server error' })
  }
}
