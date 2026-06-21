import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'
import { authConfig } from './auth.config'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.userId = user.id
      }

      // Query DB for GitHub connection status and onboarding status
      const dbUser = await prisma.user.findUnique({
        where: { id: token.userId as string },
        include: { accounts: { where: { provider: 'github' } } }
      })

      if (dbUser) {
        token.githubConnected = dbUser.accounts.length > 0
        token.onboardingCompleted = dbUser.onboardingCompleted
        if (dbUser.accounts[0]) {
          token.accessToken = dbUser.accounts[0].access_token ?? undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string
        session.githubConnected = token.githubConnected as boolean
        session.onboardingCompleted = token.onboardingCompleted as boolean
        session.accessToken = token.accessToken as string
      }
      return session
    },
  },
  providers: [
    ...authConfig.providers.filter((p) => p.id !== 'credentials'),
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })
        
        if (!user || !user.passwordHash) return null
        
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        
        if (passwordMatch) return user
        return null
      },
    }),
  ],
})

export const { GET, POST } = handlers
