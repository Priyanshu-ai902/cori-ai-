import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)
  
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL missing')
  }

  const adapter = new PrismaNeon({
    connectionString,
  })

  const client = new PrismaClient({
    adapter,
  })

  if (client.analysis) {
    console.log(`[Prisma] Analysis model registered`)
  }

  return client
}

export const prisma =
  globalForPrisma.prisma ??
  prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma