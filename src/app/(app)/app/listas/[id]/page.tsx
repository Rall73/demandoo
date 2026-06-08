import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ListaDetalhe from "./ListaDetalhe"

export default async function ListaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const { id } = await params
  return <ListaDetalhe listaId={Number(id)} />
}
