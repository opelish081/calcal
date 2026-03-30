import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email && supabaseAdmin) {
        const { error } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.image,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' })
        if (error) console.error('Profile upsert error:', error)
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        if (supabaseAdmin) {
          const { data } = await supabaseAdmin
            .from('user_profiles')
            .select('weight_kg, height_cm, age')
            .eq('id', token.sub)
            .single()
          session.user.profileComplete = !!(data?.weight_kg && data?.height_cm && data?.age)
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/onboarding',
  },
  session: { strategy: 'jwt' },
}
