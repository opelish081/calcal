import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { isProfileComplete } from '@/lib/onboarding'
import { ensureUserProfile, findUserProfile, isUuid } from '@/lib/user-profile'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const profile = await ensureUserProfile({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          })
          user.id = profile.id
        } catch (error) {
          console.error('Profile sync error:', error)
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        try {
          const profile = await findUserProfile({ id: token.sub, email: token.email })
          if (profile) {
            session.user.id = profile.id
            session.user.profileComplete = isProfileComplete(profile)
          } else if (token.sub) {
            session.user.id = token.sub
          }
        } catch (error) {
          console.error('Session profile lookup error:', error)
          if (token.sub) session.user.id = token.sub
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const profile = await ensureUserProfile({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          })
          token.sub = profile.id
        } catch (error) {
          console.error('JWT profile sync error:', error)
          if (user.id) token.sub = user.id
        }
        return token
      }

      if ((!token.sub || !isUuid(token.sub)) && token.email) {
        try {
          const profile = await findUserProfile({ id: token.sub, email: token.email })
          if (profile) token.sub = profile.id
        } catch (error) {
          console.error('JWT profile lookup error:', error)
        }
      }

      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/onboarding',
  },
  session: { strategy: 'jwt' },
}
