import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import InstallBanner from "@/components/InstallBanner"
import { PomodoroProvider } from "@/components/pomodoro/PomodoroProvider"
import PomodoroWidget from "@/components/pomodoro/PomodoroWidget"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  return (
    <PomodoroProvider>
      <div className="md:flex md:h-screen min-h-screen bg-slate-50">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <InstallBanner />
      </div>
      <PomodoroWidget />
    </PomodoroProvider>
  )
}
