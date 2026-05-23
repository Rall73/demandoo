import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id:          string
      name:        string
      email:       string
      companyId:   number
      companyName: string
      planSlug:    string
      aiQuota:     number | null   // null = ilimitado
      aiUsedTotal: number
      role:        string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:          string
    companyId:   number
    companyName: string
    planSlug:    string
    aiQuota:     number | null
    aiUsedTotal: number
    role:        string
  }
}
