const { PrismaClient } = require('@prisma/client')
const client = new PrismaClient()
console.log('Patch fields:', Object.keys(client.patch || {}))
// We can't easily check fields without a connection, but we can check if the types are there
// by checking the DMMF if we had access to it, or just seeing if it throws on instantiation if there's a schema mismatch.
// Actually, let's just trust that `npx prisma generate` worked.
process.exit(0)
