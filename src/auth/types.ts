import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id:            string
      name:          string
      email:         string
      avatarUrl:     string | null
      companyId:     number
      companyName:   string
      planSlug:      string
      planExpiresAt: string | null   // ISO string — Date não serializa em JWT
      aiQuota:       number | null   // null = ilimitado
      aiUsedTotal:   number
      role:          string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:            string
    avatarUrl:     string | null
    companyId:     number
    companyName:   string
    planSlug:      string
    planExpiresAt: string | null
    aiQuota:       number | null
    aiUsedTotal:   number
    role:          string
  }
}
