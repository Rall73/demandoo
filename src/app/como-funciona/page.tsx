import Link from "next/link"
import {
  Inbox, Mic, Sparkles, PenLine, CheckSquare, Lightbulb,
  Calendar, Settings, Users, ArrowRight, Check, Zap,
  BookOpen, MessageSquare, Clock, Tag, ListChecks,
  LayoutDashboard, ChevronRight, Star,
} from "lucide-react"

export const metadata = {
  title: "Como funciona — demandoo",
  description:
    "Guia completo do demandoo: conceitos, modos de captura, funcionalidades, exemplos reais e planos disponíveis.",
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Section({
  id,
  children,
  className = "",
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`py-16 scroll-mt-24 ${className}`}>
      <div className="max-w-4xl mx-auto px-6">{children}</div>
    </section>
  )
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-10">
      {eyebrow && (
        <span className="inline-block text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-bold text-slate-900 mb-3">{title}</h2>
      {subtitle && <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{subtitle}</p>}
    </div>
  )
}

function ExampleBubble({
  text,
  result,
  tipo,
}: {
  text: string
  result: { tipo: string; titulo: string; prioridade: string; prazo?: string; acoes?: string[] }
  tipo: "DEMANDA" | "TAREFA" | "IDEIA"
}) {
  const colors = {
    DEMANDA: { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
    TAREFA:  { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    IDEIA:   { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  }
  const c = colors[tipo]

  return (
    <div className="space-y-3">
      {/* Input do usuário */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
          <Mic size={14} className="text-slate-500" strokeWidth={2} />
        </div>
        <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 max-w-md italic">
          "{text}"
        </div>
      </div>

      {/* Resultado da IA */}
      <div className="flex items-start gap-3 justify-end">
        <div className={`${c.bg} border ${c.border} rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-sm w-full`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
              {result.tipo}
            </span>
            <span className="text-xs text-slate-400">IA estruturou:</span>
          </div>
          <p className="font-semibold text-slate-800 text-sm mb-1">{result.titulo}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1"><Tag size={10} /> {result.prioridade}</span>
            {result.prazo && <span className="flex items-center gap-1"><Clock size={10} /> {result.prazo}</span>}
          </div>
          {result.acoes && result.acoes.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.acoes.map((a) => (
                <div key={a} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
          <Zap size={14} className="text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
              <Inbox size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 text-lg">demandoo</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <a href="#conceitos" className="hover:text-slate-900 transition-colors">Conceitos</a>
            <a href="#captura" className="hover:text-slate-900 transition-colors">Como capturar</a>
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-slate-900 transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
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
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-b from-violet-50 to-white py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <BookOpen size={13} strokeWidth={2} />
            Guia completo do demandoo
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5 leading-tight">
            Tudo que você precisa saber<br />
            <span className="text-violet-600">para não perder nada</span>
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed mb-8">
            Do conceito básico aos exemplos práticos — um guia rápido para aproveitar
            o demandoo ao máximo desde o primeiro dia.
          </p>

          {/* Índice rápido */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left max-w-xl mx-auto shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Nesta página</p>
            <div className="space-y-1">
              {[
                { href: "#conceitos",       label: "Os três tipos: Demanda, Tarefa e Ideia" },
                { href: "#captura",         label: "Modos de captura: Voz, Texto + IA e Manual" },
                { href: "#ia",              label: "Como a IA classifica automaticamente" },
                { href: "#funcionalidades", label: "Funcionalidades de cada página" },
                { href: "#planos",          label: "Planos e quotas de IA" },
                { href: "#faq",             label: "Perguntas frequentes" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 py-1 transition-colors group"
                >
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-violet-400 transition-colors" strokeWidth={2} />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Seção 1: Conceitos ── */}
      <Section id="conceitos">
        <SectionTitle
          eyebrow="Conceitos fundamentais"
          title="Três tipos de captura"
          subtitle="O demandoo organiza tudo em três categorias. Entender a diferença entre elas é o primeiro passo."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {/* Demanda */}
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-6">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
              <Inbox size={20} className="text-violet-600" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-violet-900 text-lg mb-2">📋 Demanda</h3>
            <p className="text-violet-700 text-sm leading-relaxed mb-4">
              Pedidos que vêm de outras pessoas — clientes, colegas, fornecedores. Geralmente têm
              um solicitante, um prazo e múltiplos passos para resolver.
            </p>
            <div className="bg-white rounded-lg p-3 text-xs text-violet-600 font-medium border border-violet-200">
              💬 "A Alessandra pediu para enviar o relatório mensal até sexta com urgência."
            </div>
          </div>

          {/* Tarefa */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <CheckSquare size={20} className="text-emerald-600" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-emerald-900 text-lg mb-2">✅ Tarefa</h3>
            <p className="text-emerald-700 text-sm leading-relaxed mb-4">
              Afazeres seus, simples e diretos. Só você envolvido, uma ação clara, geralmente curta.
              O modo checklist facilita marcar como feito com um clique.
            </p>
            <div className="bg-white rounded-lg p-3 text-xs text-emerald-600 font-medium border border-emerald-200">
              💬 "Ligar pro dentista para marcar consulta amanhã."
            </div>
          </div>

          {/* Ideia */}
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <Lightbulb size={20} className="text-amber-600" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-amber-900 text-lg mb-2">💡 Ideia</h3>
            <p className="text-amber-700 text-sm leading-relaxed mb-4">
              Insights, conceitos e possibilidades para explorar depois. Não têm urgência —
              o importante é registrar agora para não perder o fio do pensamento.
            </p>
            <div className="bg-white rounded-lg p-3 text-xs text-amber-600 font-medium border border-amber-200">
              💬 "E se a gente criasse um painel de métricas por cliente?"
            </div>
          </div>
        </div>

        {/* Dica */}
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <Zap size={16} className="text-violet-500 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-slate-600">
            <strong>Não precisa pensar no tipo antes de capturar.</strong> Nos modos Voz e Texto + IA,
            a IA classifica automaticamente. Você só escolhe o tipo quando usa o modo Manual.
          </p>
        </div>
      </Section>

      {/* ── Seção 2: Modos de captura ── */}
      <Section id="captura" className="bg-slate-50">
        <SectionTitle
          eyebrow="Modos de captura"
          title="Três formas de registrar"
          subtitle="Escolha o que é mais natural no momento. O resultado final é sempre o mesmo: uma demanda organizada no banco."
        />

        <div className="space-y-6">

          {/* Voz */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <Mic size={20} className="text-violet-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">🎙️ Voz</h3>
                <p className="text-sm text-slate-500">Fale livremente — Whisper transcreve, GPT estrutura</p>
              </div>
              <span className="ml-auto text-xs bg-violet-100 text-violet-700 font-semibold px-2.5 py-1 rounded-full">Consome IA</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Aperte o botão, fale normalmente como se estivesse mandando um áudio no WhatsApp.
                Não precisa ser formal. A IA entende contexto, identifica o solicitante pelo nome,
                resolve datas relativas ("amanhã", "semana que vem") e extrai as próximas ações.
              </p>
              <ExampleBubble
                text="O João do financeiro pediu pra eu enviar a planilha de gastos do mês até quarta-feira, disse que é urgente pra fechar o balanço"
                result={{
                  tipo: "DEMANDA",
                  titulo: "Enviar planilha de gastos ao financeiro",
                  prioridade: "ALTA",
                  prazo: "Quarta-feira",
                  acoes: ["Consolidar gastos do mês", "Enviar planilha para João"],
                }}
                tipo="DEMANDA"
              />
            </div>
          </div>

          {/* Texto + IA */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-violet-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">✨ Texto + IA</h3>
                <p className="text-sm text-slate-500">Digite livremente — GPT estrutura tudo</p>
              </div>
              <span className="ml-auto text-xs bg-violet-100 text-violet-700 font-semibold px-2.5 py-1 rounded-full">Consome IA</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Prefere escrever? Funciona igual à voz. Escreva o que vier à cabeça em uma caixa
                de texto livre — sem formatar, sem organizar. A IA faz o trabalho de estruturar.
                Útil quando você está em reunião e não pode falar.
              </p>
              <ExampleBubble
                text="tive uma ideia pra aumentar retenção: criar um programa de pontos pra clientes que renovam antes do vencimento"
                result={{
                  tipo: "IDEIA",
                  titulo: "Programa de pontos para renovações antecipadas",
                  prioridade: "BAIXA",
                  acoes: ["Pesquisar programas de fidelidade similares", "Prototipar mecânica de pontos"],
                }}
                tipo="IDEIA"
              />
            </div>
          </div>

          {/* Manual */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <PenLine size={20} className="text-slate-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">📝 Manual</h3>
                <p className="text-sm text-slate-500">Você preenche cada campo — sem IA</p>
              </div>
              <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-full">Não consome IA</span>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Quando você já sabe exatamente o que precisa preencher e não quer a ajuda da IA.
                Você escolhe o tipo (Demanda / Tarefa / Ideia), preenche título, descrição,
                prioridade, prazo, solicitante, delegado e adiciona as próximas ações uma a uma.
                <strong className="text-slate-800"> Não consome quota de IA.</strong>
              </p>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 space-y-2">
                <p className="font-medium text-slate-700 text-xs uppercase tracking-wide mb-3">Campos disponíveis no modo manual:</p>
                {[
                  ["Tipo", "Demanda / Tarefa / Ideia (você escolhe)"],
                  ["Título", "Obrigatório — o que precisa fazer"],
                  ["Descrição", "Contexto e detalhes opcionais"],
                  ["Prioridade", "Baixa / Média / Alta / Crítica"],
                  ["Prazo", "Data específica"],
                  ["Solicitante", "Quem pediu (texto livre)"],
                  ["Delegado para", "Quem vai executar"],
                  ["Próximas ações", "Checklist de passos — adicione um por vez"],
                ].map(([campo, desc]) => (
                  <div key={campo} className="flex gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-28 shrink-0 mt-0.5">{campo}</span>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Seção 3: Como a IA classifica ── */}
      <Section id="ia">
        <SectionTitle
          eyebrow="Inteligência artificial"
          title="Como a IA decide o tipo"
          subtitle="A IA aplica uma árvore de decisão com base no conteúdo — você não precisa fazer nada."
        />

        <div className="bg-slate-900 rounded-2xl p-6 text-sm font-mono mb-8 overflow-x-auto">
          <p className="text-slate-400 mb-3 text-xs">// Árvore de decisão (aplicada nesta ordem)</p>
          <div className="space-y-2">
            <p className="text-slate-300">
              Tem expressão de ideia <span className="text-amber-400">OU</span> tom exploratório?
              <span className="text-amber-400 ml-2">→ 💡 IDEIA</span>
            </p>
            <p className="text-slate-300">
              Senão, pedido simples só de quem fala, sem terceiros?
              <span className="text-emerald-400 ml-2">→ ✅ TAREFA</span>
            </p>
            <p className="text-slate-300">
              Senão (qualquer outro caso, inclusive dúvida)
              <span className="text-violet-400 ml-2">→ 📋 DEMANDA</span>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <Lightbulb size={16} strokeWidth={2} /> Expressões de IDEIA
            </h4>
            <ul className="space-y-1.5 text-sm text-amber-700">
              {[
                '"tive uma ideia"', '"tenho uma ideia"', '"tive um insight"',
                '"pensei em / pensei numa"', '"uma sacada"', '"e se..."',
                '"imagina se"', "Tom exploratório ou hipotético",
              ].map((e) => (
                <li key={e} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <CheckSquare size={16} strokeWidth={2} /> Características de TAREFA
            </h4>
            <ul className="space-y-1.5 text-sm text-emerald-700">
              {[
                "Só envolve quem fala",
                "Sem terceiros mencionados",
                "Curto e direto",
                "Máximo 1-2 ações",
                "Ex: comprar pão amanhã",
                "Ex: ligar pro dentista",
                "Ex: pagar a conta",
              ].map((e) => (
                <li key={e} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <h4 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
              <Inbox size={16} strokeWidth={2} /> Características de DEMANDA
            </h4>
            <ul className="space-y-1.5 text-sm text-violet-700">
              {[
                "Solicitante terceiro mencionado",
                "Contexto narrativo",
                "Múltiplos passos",
                "Prazo ou restrição explícita",
                "Qualquer dúvida → cai aqui",
                "É o tipo padrão (fallback)",
              ].map((e) => (
                <li key={e} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <MessageSquare size={16} className="text-blue-500 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-blue-700">
            <strong>O tipo pode ser alterado depois.</strong> Se a IA errar a classificação
            (acontece raramente), você pode trocar o tipo diretamente na página de detalhe
            da demanda com um clique.
          </p>
        </div>
      </Section>

      {/* ── Seção 4: Funcionalidades ── */}
      <Section id="funcionalidades" className="bg-slate-50">
        <SectionTitle
          eyebrow="Funcionalidades"
          title="O que cada página faz"
        />

        <div className="space-y-4">
          {[
            {
              icon: LayoutDashboard,
              color: "bg-violet-100 text-violet-600",
              title: "Dashboard principal (/app)",
              desc: "A central de tudo. Três abas — Demandas, Tarefas e Ideias — com KPIs de status no topo (abertas, em andamento, concluídas). Filtre por status, prioridade ou busque pelo título. Tarefas aparecem em modo checklist para marcar como feita com um toque.",
              items: [
                "Filtros por status e prioridade",
                "Busca textual em tempo real",
                "Checklist rápido para Tarefas",
                "Badge 'IA' nos itens processados pela IA",
                "Aviso de quota de IA quando restam menos de 30%",
              ],
            },
            {
              icon: ListChecks,
              color: "bg-slate-100 text-slate-600",
              title: "Detalhe da demanda (/app/[id])",
              desc: "Página completa de um item. Edite qualquer campo inline — título, descrição, prioridade, prazo, delegado. Gerencie o checklist de próximas ações. Mude o status com os botões contextuais (Iniciar, Concluir, Cancelar, Reabrir).",
              items: [
                "Edição inline de título e descrição (clique para editar)",
                "Dropdown de tipo editável",
                "Painel de detalhes colapsável (prazo, prioridade, delegado)",
                "Checklist de próximas ações com toggle, edição e exclusão",
                "Histórico: criado em, concluído em + duração",
                "Export .ics para Google Calendar / Apple Calendar",
                "Soft delete com confirmação",
              ],
            },
            {
              icon: Calendar,
              color: "bg-blue-100 text-blue-600",
              title: "Calendário (/app/calendario)",
              desc: "Visão mensal de todos os itens com prazo definido, independente do tipo. Navegue entre meses. Os badges são coloridos por tipo: violet para Demandas, emerald para Tarefas, amber para Ideias.",
              items: [
                "Grid mensal com navegação",
                "Agrupa todos os tipos com prazo",
                "Badges coloridos por tipo",
                "Clique no item → vai para o detalhe",
                "Datas calculadas em horário de Brasília",
              ],
            },
            {
              icon: Settings,
              color: "bg-slate-100 text-slate-600",
              title: "Configurações (/configuracoes)",
              desc: "Gerencie seu perfil, e-mail e segurança da conta. Veja o plano atual com a quota de IA consumida.",
              items: [
                "Editar nome e foto de perfil",
                "Trocar e-mail (com confirmação no novo endereço)",
                "Criar ou alterar senha",
                "Painel do plano atual com barra de quota",
                "Countdown de dias restantes no trial",
              ],
            },
            {
              icon: Users,
              color: "bg-emerald-100 text-emerald-600",
              title: "Equipe (/equipe) — apenas ADMIN",
              desc: "Disponível apenas para administradores em planos de equipe. Convide membros por e-mail, gerencie quem tem acesso e veja os convites pendentes.",
              items: [
                "Lista de membros ativos com avatar",
                "Convidar por e-mail (link expira em 7 dias)",
                "Cancelar convite pendente",
                "Remover membro (soft delete)",
                "Controle de vagas pelo limite do plano",
              ],
            },
          ].map(({ icon: Icon, color, title, desc, items }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-start gap-4 p-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{desc}</p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {items.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Seção 5: Planos ── */}
      <Section id="planos">
        <SectionTitle
          eyebrow="Planos"
          title="Simples e transparentes"
          subtitle="Comece grátis e faça upgrade quando precisar de mais IA ou mais pessoas na equipe."
        />

        {/* Individual */}
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Inbox size={14} strokeWidth={2} /> Individual
        </h3>
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            {
              name: "Gratuito", emoji: "🌱", price: "R$ 0", period: "",
              badge: "bg-slate-100 text-slate-600",
              border: "border-slate-200",
              highlight: false,
              features: ["20 capturas com IA", "1 usuário", "Voz + Texto + Manual", "Calendário e export .ics"],
              cta: "Começar grátis", href: "/auth/cadastro",
              note: "Quota vitalícia (não renova mensalmente)",
            },
            {
              name: "Básico", emoji: "🚀", price: "R$ 49", period: "/mês",
              badge: "bg-violet-100 text-violet-700",
              border: "border-violet-200",
              highlight: false,
              features: ["200 capturas IA/mês", "1 usuário", "Voz + Texto + Manual", "Delegação", "Suporte por e-mail"],
              cta: "Falar com a equipe", href: "mailto:contato@demandoo.net",
            },
            {
              name: "Completo", emoji: "⭐", price: "R$ 99", period: "/mês",
              badge: "bg-violet-900 text-violet-100",
              border: "border-violet-400",
              highlight: true,
              features: ["500 capturas IA/mês", "1 usuário", "Voz + Texto + Manual", "Delegação", "Lembretes de prazo por e-mail", "Suporte prioritário"],
              cta: "Falar com a equipe", href: "mailto:contato@demandoo.net",
            },
          ].map(({ name, emoji, price, period, badge, border, highlight, features, cta, href, note }) => (
            <div
              key={name}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 ${border} ${highlight ? "shadow-md" : ""}`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={11} fill="white" strokeWidth={0} /> Mais popular
                  </span>
                </div>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start ${badge}`}>
                {emoji} {name}
              </span>
              <div>
                <span className="text-3xl font-bold text-slate-900">{price}</span>
                <span className="text-slate-400 text-sm">{period}</span>
              </div>
              <ul className="space-y-2 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check size={13} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              {note && <p className="text-xs text-slate-400 -mt-1">{note}</p>}
              <Link
                href={href}
                className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  highlight
                    ? "bg-violet-900 text-white hover:bg-violet-800"
                    : name === "Gratuito"
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "border border-violet-200 text-violet-700 hover:bg-violet-50"
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Equipe */}
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Users size={14} strokeWidth={2} /> Para equipes
        </h3>
        <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-2xl">
          {[
            {
              name: "Básico Equipe", emoji: "👥", price: "R$ 149", period: "/mês",
              badge: "bg-emerald-100 text-emerald-700",
              border: "border-emerald-200",
              highlight: false,
              features: ["500 capturas IA/mês", "Até 5 usuários", "Convite e gestão de equipe", "Delegação entre membros", "Suporte por e-mail"],
              cta: "Falar com a equipe", href: "mailto:contato@demandoo.net",
            },
            {
              name: "Completo Equipe", emoji: "🏢", price: "R$ 299", period: "/mês",
              badge: "bg-emerald-800 text-emerald-100",
              border: "border-emerald-400",
              highlight: true,
              features: ["1.500 capturas IA/mês", "Até 20 usuários", "Convite e gestão de equipe", "Delegação entre membros", "Lembretes de prazo por e-mail", "Suporte prioritário"],
              cta: "Falar com a equipe", href: "mailto:contato@demandoo.net",
            },
          ].map(({ name, emoji, price, period, badge, border, highlight, features, cta, href }) => (
            <div
              key={name}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 ${border} ${highlight ? "shadow-md" : ""}`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={11} fill="white" strokeWidth={0} /> Mais completo
                  </span>
                </div>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start ${badge}`}>
                {emoji} {name}
              </span>
              <div>
                <span className="text-3xl font-bold text-slate-900">{price}</span>
                <span className="text-slate-400 text-sm">{period}</span>
              </div>
              <ul className="space-y-2 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check size={13} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={href}
                className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                  highlight
                    ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {cta}
              </a>
            </div>
          ))}
        </div>

        {/* Nota sobre IA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Zap size={14} className="text-violet-500" strokeWidth={2} />
            O que conta como captura com IA?
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><Check size={13} className="text-emerald-500" strokeWidth={2.5} /> Captura por <strong>voz</strong> (transcrição Whisper + estruturação GPT)</div>
            <div className="flex items-center gap-2"><Check size={13} className="text-emerald-500" strokeWidth={2.5} /> Captura por <strong>texto + IA</strong> (estruturação GPT)</div>
            <div className="flex items-center gap-2 text-slate-400"><span className="w-3.5 text-center font-bold">—</span> Captura <strong>manual</strong> não consome quota</div>
          </div>
        </div>

        <p className="text-sm text-center text-slate-400 mt-6">
          Precisa de algo diferente?{" "}
          <a href="mailto:contato@demandoo.net" className="text-violet-500 hover:underline">
            Fale com a gente
          </a>{" "}
          e montamos um plano personalizado.
        </p>
      </Section>

      {/* ── Seção 6: FAQ ── */}
      <Section id="faq" className="bg-slate-50">
        <SectionTitle
          eyebrow="Dúvidas frequentes"
          title="Perguntas e respostas"
        />
        <div className="space-y-4 max-w-2xl">
          {[
            {
              q: "Preciso instalar alguma coisa?",
              a: "Não. O demandoo é 100% web — funciona em qualquer navegador, no celular ou computador. Você pode adicionar à tela inicial do celular como um app (PWA).",
            },
            {
              q: "O que acontece quando minha quota de IA acaba?",
              a: "Você ainda pode usar o modo Manual sem nenhuma limitação. A captura por voz e texto+IA fica bloqueada até o upgrade de plano. No plano Gratuito, as 20 capturas são vitalícias (não renovam todo mês).",
            },
            {
              q: "Posso mudar o tipo de uma demanda depois de criada?",
              a: "Sim. Na página de detalhe, clique no dropdown de tipo (ex: 'Demanda') e selecione outro. A mudança é imediata.",
            },
            {
              q: "Como funcionam os lembretes de prazo?",
              a: "Nos planos Completo e Completo Equipe, o sistema envia um e-mail automático quando uma demanda tem prazo amanhã (D-1) e outro quando o prazo é hoje (D-0). Cada demanda recebe o lembrete uma única vez.",
            },
            {
              q: "Posso convidar minha equipe no plano gratuito?",
              a: "Não. O convite de membros está disponível apenas nos planos de equipe (Básico Equipe e Completo Equipe). Os planos individuais são limitados a 1 usuário.",
            },
            {
              q: "Meus dados são privados?",
              a: "Sim. Cada empresa tem seu ambiente isolado — nenhum usuário de outra empresa vê seus dados. Tudo trafega via HTTPS e os dados ficam armazenados no Brasil, em conformidade com a LGPD.",
            },
            {
              q: "Como exporto uma demanda para o Google Calendar?",
              a: "Na página de detalhe de qualquer demanda com prazo definido, clique em '+ Calendário' ao lado do prazo. Isso baixa um arquivo .ics que pode ser importado no Google Calendar, Apple Calendar ou Outlook.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="font-semibold text-slate-900 mb-2">{q}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA final */}
      <section className="bg-violet-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-violet-200 mb-8">
            15 minutos de uso e você nunca mais perde uma demanda.
            Sem cartão de crédito.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/cadastro"
              className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-violet-50 transition-colors"
            >
              Criar conta grátis
              <ArrowRight size={20} strokeWidth={2} />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 border border-violet-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-violet-700 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
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
            <Link href="/" className="hover:text-slate-700">Home</Link>
            <Link href="/como-funciona" className="hover:text-slate-700 font-medium text-violet-600">Como funciona</Link>
            <Link href="/politica-de-privacidade" className="hover:text-slate-700">Política de Privacidade</Link>
            <Link href="/termos-de-uso" className="hover:text-slate-700">Termos de Uso</Link>
            <a href="mailto:contato@demandoo.net" className="hover:text-slate-700">Contato</a>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} demandoo.</p>
        </div>
      </footer>

    </div>
  )
}
