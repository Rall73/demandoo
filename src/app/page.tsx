import Link from "next/link"
import { Mic, Zap, Calendar, CheckSquare, Lightbulb, Inbox, ArrowRight, Shield, Lock } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
            <Inbox size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-900 text-lg">demandoo</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/como-funciona" className="hidden md:block text-sm text-slate-600 hover:text-slate-900 font-medium">
            Como funciona
          </Link>
          <Link href="/auth/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
            Entrar
          </Link>
          <Link
            href="/auth/cadastro"
            className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <span className="inline-block bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
          Capture • Organize • Execute
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
          Pare de perder{" "}
          <span className="text-violet-600">demandas.</span>
          <br />
          Fale, e pronto.
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Capture qualquer pedido em segundos — por voz ou texto. A IA organiza título, prazo,
          prioridade e próximas ações automaticamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/cadastro"
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
          >
            Começar grátis
            <ArrowRight size={20} strokeWidth={2} />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 transition-colors"
          >
            Já tenho conta
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">15 capturas com IA grátis • Sem cartão de crédito</p>
      </section>

      {/* Como funciona */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Como funciona</h2>
          <p className="text-center text-slate-500 mb-12">Três passos. Segundos.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                title: "Fale ou escreva",
                desc: "Diga qualquer coisa: 'João pediu para entregar o relatório até sexta com urgência.' Ou digita. Tanto faz.",
                color: "bg-violet-100 text-violet-600",
              },
              {
                icon: Zap,
                title: "A IA organiza",
                desc: "Em segundos: título, tipo, prioridade, prazo, solicitante e próximas ações — tudo estruturado e pronto para trabalho.",
                color: "bg-amber-100 text-amber-600",
              },
              {
                icon: CheckSquare,
                title: "Execute com clareza",
                desc: "Demandas, tarefas e ideias no mesmo lugar. Calendário integrado. Nada se perde.",
                color: "bg-emerald-100 text-emerald-600",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={24} strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tipos de captura */}
      <section className="py-20 max-w-5xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Tudo em um só lugar</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-6">
            <Inbox size={28} className="text-violet-600 mb-3" strokeWidth={2} />
            <h3 className="font-bold text-violet-900 mb-2">Demandas</h3>
            <p className="text-violet-700 text-sm">Pedidos de clientes, colegas e fornecedores — com solicitante, prazo e ações definidas.</p>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
            <CheckSquare size={28} className="text-emerald-600 mb-3" strokeWidth={2} />
            <h3 className="font-bold text-emerald-900 mb-2">Tarefas</h3>
            <p className="text-emerald-700 text-sm">Seus próprios afazeres do dia a dia — simples, diretas, com checklist integrado.</p>
          </div>
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
            <Lightbulb size={28} className="text-amber-600 mb-3" strokeWidth={2} />
            <h3 className="font-bold text-amber-900 mb-2">Ideias</h3>
            <p className="text-amber-700 text-sm">Insights e conceitos para explorar depois — capturados agora, perdidos nunca.</p>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Planos simples</h2>
          <p className="text-center text-slate-500 mb-12">Comece grátis. Faça upgrade quando precisar.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "Explorador",
                price: "Grátis",
                desc: "Para conhecer o produto",
                features: ["15 capturas com IA", "Modo manual ilimitado", "Demandas + Tarefas + Ideias", "Calendário"],
                cta: "Começar grátis",
                href: "/auth/cadastro",
                highlight: false,
              },
              {
                name: "Profissional",
                price: "R$ 19,90/mês",
                desc: "Para uso diário intenso",
                features: ["IA ilimitada", "Captura por voz", "Calendário + .ics", "Exportação de dados", "Suporte prioritário"],
                cta: "Assinar Pro",
                href: "/auth/cadastro?plano=pro",
                highlight: true,
              },
              {
                name: "Equipe",
                price: "R$ 49,90/mês",
                desc: "Para times de até 5",
                features: ["Tudo do Pro", "Até 5 usuários", "Delegação de demandas", "Painel da equipe"],
                cta: "Assinar Equipe",
                href: "/auth/cadastro?plano=team",
                highlight: false,
              },
            ].map(({ name, price, desc, features, cta, href, highlight }) => (
              <div
                key={name}
                className={`rounded-2xl p-6 border-2 ${
                  highlight
                    ? "border-violet-500 bg-violet-600 text-white shadow-xl shadow-violet-200"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h3 className={`font-bold text-lg mb-1 ${highlight ? "text-white" : "text-slate-900"}`}>{name}</h3>
                <p className={`text-sm mb-3 ${highlight ? "text-violet-200" : "text-slate-500"}`}>{desc}</p>
                <p className={`text-2xl font-bold mb-5 ${highlight ? "text-white" : "text-slate-900"}`}>{price}</p>
                <ul className="space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${highlight ? "text-violet-100" : "text-slate-600"}`}>
                      <CheckSquare size={14} strokeWidth={2} className={highlight ? "text-violet-200" : "text-violet-500"} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    highlight
                      ? "bg-white text-violet-700 hover:bg-violet-50"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section className="py-16 max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Seus dados, sua privacidade</h2>
            <p className="text-slate-500 mb-4">
              O demandoo foi construído com LGPD em mente desde o primeiro dia. Seus dados ficam
              isolados da conta de outros usuários e você tem controle total.
            </p>
            <div className="space-y-2">
              {[
                "Dados armazenados no Brasil",
                "Conformidade com a LGPD (Lei 13.709/2018)",
                "Conexões protegidas por HTTPS",
                "Você pode exportar ou excluir seus dados a qualquer momento",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield size={14} className="text-violet-500 shrink-0" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-32 h-32 bg-violet-100 rounded-full flex items-center justify-center">
              <Lock size={48} className="text-violet-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-violet-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Pronto para parar de perder demandas?</h2>
          <p className="text-violet-200 mb-8">Crie sua conta grátis em 30 segundos. Sem cartão.</p>
          <Link
            href="/auth/cadastro"
            className="inline-flex items-center gap-2 bg-white text-violet-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-violet-50 transition-colors"
          >
            Começar grátis
            <ArrowRight size={20} strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
              <Inbox size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-slate-700">demandoo</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <Link href="/como-funciona" className="hover:text-slate-700 font-medium">Como funciona</Link>
            <Link href="/politica-de-privacidade" className="hover:text-slate-700">Política de Privacidade</Link>
            <Link href="/termos-de-uso" className="hover:text-slate-700">Termos de Uso</Link>
            <a href="mailto:contato@demandoo.net" className="hover:text-slate-700">Contato</a>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} demandoo. CNPJ em formação.</p>
        </div>
      </footer>
    </div>
  )
}
