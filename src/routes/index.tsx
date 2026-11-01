import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VitaNexo — Invista na infraestrutura de saúde do Brasil" },
      { name: "description", content: "Torne-se acionista de tecnologia e infraestrutura de saúde no Brasil com monitoramento de pacientes em tempo real." },
      { property: "og:title", content: "VitaNexo — Invista na saúde do Brasil" },
      { property: "og:description", content: "Captação de recursos para tecnologia e infraestrutura de saúde com impacto real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const stats = [
  ["R$ 48M", "meta de captação"],
  ["126", "hospitais parceiros"],
  ["2,4M", "pacientes atendidos"],
  ["18%", "crescimento a.a. do setor"],
];

const pillars = [
  ["Sensoriamento biométrico multicanal", "Sensores de alta precisão que monitoram diferentes parâmetros fisiológicos de forma contínua."],
  ["Microeletrônica miniaturizada", "Circuitos ultracompactos, materiais flexíveis e conectividade wireless em um único dispositivo vestível."],
  ["Inteligência artificial", "Análise de tendências fisiológicas que transforma sinais biológicos em dados inteligentes."],
];

const businessLines = [
  "Desenvolvimento e comercialização do dispositivo",
  "Plataforma digital e serviços por assinatura",
  "Soluções tecnológicas para empresas e instituições",
  "Parcerias estratégicas em pesquisa e inovação",
  "Expansão para novos mercados",
];

const tiers = [
  ["Semente", "R$ 5 mil", "Acesso a relatórios trimestrais e participação acionária proporcional."],
  ["Crescimento", "R$ 50 mil", "Assento em conselho consultivo e visitas às unidades."],
  ["Estratégico", "R$ 500 mil+", "Participação direta nas decisões de expansão regional."],
];

function Index() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-xl font-bold">Vita<span className="text-brand">Nexo</span></span>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#tese" className="hidden hover:text-foreground sm:inline">Tese</a>
            <a href="#investir" className="hidden hover:text-foreground sm:inline">Investir</a>
            <Link to="/dashboard" className="rounded-full bg-brand px-4 py-2 font-semibold text-primary-foreground">Ver plataforma</Link>
          </nav>
        </div>
      </header>

      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <span className="pulse-dot h-2 w-2 rounded-full bg-primary" /> Rodada Série A aberta
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Seja acionista do futuro da <span className="text-brand">saúde brasileira</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Investimos em tecnologia e infraestrutura que conectam pacientes, médicos e hospitais em tempo real — salvando vidas e gerando retorno sustentável.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#investir" className="rounded-full bg-brand px-6 py-3 font-semibold text-primary-foreground shadow-glow">Quero investir</a>
            <Link to="/dashboard" className="rounded-full border border-border px-6 py-3 font-semibold hover:bg-secondary">Demo do painel do paciente</Link>
          </div>
          <div className="mt-20 grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map(([v, l]) => (
              <div key={l} className="border-l border-primary/40 pl-4">
                <div className="font-display text-3xl font-bold">{v}</div>
                <div className="text-sm text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tese" className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Nossa tese de investimento</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-4xl">
          BioSensor W1 — o futuro do monitoramento humano começa agora.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Uma nova geração de tecnologia vestível. Uma nova forma de compreender o corpo humano.
        </p>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Imagine um dispositivo capaz de acompanhar continuamente diferentes indicadores do organismo, transformar sinais biológicos em dados inteligentes e conectar essas informações a uma plataforma digital integrada. Essa é a proposta do BioSensor W1: uma pulseira biométrica inteligente que combina sensores de alta precisão, microeletrônica miniaturizada, conectividade wireless e inteligência artificial.
        </p>

        <h3 className="mt-16 text-2xl font-bold">Tecnologia que trabalha em conjunto</h3>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {pillars.map(([t, d], i) => (
            <div key={t} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 font-display text-sm text-primary">0{i + 1}</div>
              <h4 className="text-xl font-semibold">{t}</h4>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold">Muito além de uma pulseira inteligente</h3>
            <p className="mt-4 text-muted-foreground">
              O diferencial do BioSensor W1 está na integração entre hardware e inteligência de dados. Enquanto dispositivos convencionais priorizam indicadores isolados, nossa visão é construir uma plataforma capaz de reunir diferentes informações fisiológicas em um único ecossistema — uma tecnologia pensada para evoluir junto com os avanços da microeletrônica, da inteligência artificial e da saúde digital.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold">Uma oportunidade de inovação</h3>
            <p className="mt-4 text-muted-foreground">
              O mercado de tecnologia vestível representa uma oportunidade para o desenvolvimento de novas soluções de monitoramento e análise de dados pessoais. O BioSensor W1 pretende ocupar esse espaço com uma arquitetura própria, escalável e preparada para incorporar novas tecnologias de sensoriamento. Nossa visão de negócio contempla:
            </p>
            <ul className="mt-6 space-y-3">
              {businessLines.map((b) => (
                <li key={b} className="flex items-start gap-3 text-muted-foreground">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 rounded-xl border border-primary/30 bg-card p-8 text-center shadow-glow">
          <h3 className="text-2xl font-bold">Nossa visão</h3>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Não queremos apenas desenvolver mais uma pulseira tecnológica. Queremos construir uma plataforma capaz de aproximar o corpo humano da inteligência digital — um ecossistema no qual sensores, microcircuitos, conectividade e inteligência artificial trabalham juntos para oferecer uma compreensão cada vez mais ampla dos padrões fisiológicos humanos.
          </p>
          <p className="mt-6 font-display text-lg font-semibold text-primary">
            Mais do que monitorar. Conectar, compreender e transformar dados em inteligência.
          </p>
        </div>
      </section>

      <section id="investir" className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">Formas de participação</h2>
            <div className="mt-8 space-y-4">
              {tiers.map(([n, v, d]) => (
                <div key={n} className="rounded-xl border border-border bg-background p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{n}</h3>
                    <span className="font-display text-primary">a partir de {v}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="rounded-xl border border-border bg-background p-8 shadow-glow"
          >
            <h3 className="text-2xl font-semibold">Manifeste seu interesse</h3>
            <p className="mt-1 text-sm text-muted-foreground">Nossa equipe de relações com investidores entrará em contato.</p>
            {sent ? (
              <p className="mt-8 rounded-lg bg-primary/15 p-4 text-primary">Obrigado! Recebemos seu interesse.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {["Nome completo", "E-mail", "Telefone"].map((p) => (
                  <input key={p} required placeholder={p} className="w-full rounded-lg border border-input bg-secondary px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                ))}
                <select className="w-full rounded-lg border border-input bg-secondary px-4 py-3">
                  {tiers.map(([n]) => <option key={n}>{n}</option>)}
                </select>
                <button className="w-full rounded-lg bg-brand py-3 font-semibold text-primary-foreground">Enviar</button>
              </div>
            )}
          </form>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 VitaNexo · Investimentos envolvem riscos. Leia o prospecto antes de investir.
      </footer>
    </div>
  );
}
