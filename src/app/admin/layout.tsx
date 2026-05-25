import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "./AdminSidebar"

export const metadata = { title: "Admin — demandoo" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const adminEmail = process.env.SUPER_ADMIN_EMAIL

  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    redirect("/app")
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
