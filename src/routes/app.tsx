import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Nexo Empresarial — Gestão operacional com IA para PMEs" },
      { name: "description", content: "Operações, prazos, regras internas e recomendações sob revisão humana para pequenas e médias empresas." },
      { property: "og:title", content: "Nexo Empresarial" },
      { property: "og:description", content: "Gestão operacional inteligente para PMEs, com recomendações sob revisão humana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NexoApp,
});

type Priority = "Baixa" | "Média" | "Alta" | "Crítica";
type Status = "A fazer" | "Em andamento" | "Concluída";
type Op = { id: string; title: string; owner: string; priority: Priority; due: string; status: Status };
type Rule = { id: string; name: string; on: boolean };

const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const seedOps: Op[] = [
  { id: "1", title: "Entrega pedido cliente Alfa", owner: "Carla", priority: "Alta", due: day(1), status: "Em andamento" },
  { id: "2", title: "Renovar contrato fornecedor", owner: "", priority: "Crítica", due: day(0), status: "A fazer" },
  { id: "3", title: "Fechamento financeiro mensal", owner: "Rafael", priority: "Média", due: day(5), status: "A fazer" },
  { id: "4", title: "Treinamento equipe vendas", owner: "Bruna", priority: "Baixa", due: day(-2), status: "Concluída" },
];
const seedRules: Rule[] = [
  { id: "r1", name: "Alertar quando o prazo for menor que 24h", on: true },
  { id: "r2", name: "Alertar operação crítica sem responsável", on: true },
  { id: "r3", name: "Sinalizar operações atrasadas", on: true },
];

function useStored<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  useEffect(() => { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s)); }, [key]);
  const set = (n: T) => { setV(n); localStorage.setItem(key, JSON.stringify(n)); };
  return [v, set] as const;
}

const tabs = ["Visão geral", "Operações", "Inteligência", "Regras", "Planos"] as const;

function NexoApp() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Visão geral");
  const [ops, setOps] = useStored<Op[]>("nexo-ops", seedOps);
  const [rules, setRules] = useStored<Rule[]>("nexo-rules", seedRules);
  const [approved, setApproved] = useStored<string[]>("nexo-approved", []);

  const today = day(0);
  const insights = useMemo(() => {
    const out: { id: string; text: string }[] = [];
    const on = (id: string) => rules.find((r) => r.id === id)?.on;
    for (const o of ops) {
      if (o.status === "Concluída") continue;
      if (on("r1") && o.due <= day(1) && o.due >= today) out.push({ id: "p" + o.id, text: `"${o.title}" vence em menos de 24h — priorize hoje.` });
      if (on("r2") && o.priority === "Crítica" && !o.owner) out.push({ id: "o" + o.id, text: `"${o.title}" é crítica e não tem responsável — defina alguém.` });
      if (on("r3") && o.due < today) out.push({ id: "l" + o.id, text: `"${o.title}" está atrasada — renegocie o prazo.` });
    }
    return out;
  }, [ops, rules, today]);

  const done = ops.filter((o) => o.status === "Concluída").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <Link to="/" className="text-lg font-semibold">Nexo<span className="text-primary">.</span> Empresarial</Link>
        <nav className="flex flex-wrap gap-1 rounded-full border border-border bg-secondary/50 p-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        {tab === "Visão geral" && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              {[["Operações", ops.length], ["Concluídas", done], ["Ritmo de entrega", ops.length ? Math.round((done / ops.length) * 100) + "%" : "0%"], ["Alertas", insights.length]].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{k}</p><p className="mt-2 text-3xl font-semibold">{v}</p></div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Resumo executivo</h2>
              <p className="text-sm text-muted-foreground">Recomendações sempre sob revisão humana.</p>
              <ul className="mt-4 space-y-3">
                {insights.length === 0 && <li className="text-muted-foreground">Nenhuma ação pendente. Tudo em dia.</li>}
                {insights.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3">
                    <span>{i.text}</span>
                    {approved.includes(i.id)
                      ? <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">Revisado</span>
                      : <button onClick={() => setApproved([...approved, i.id])} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">Marcar como revisado</button>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        {tab === "Operações" && <Operations ops={ops} setOps={setOps} />}
        {tab === "Inteligência" && <Intel ops={ops} />}
        {tab === "Regras" && (
          <section className="space-y-3">
            {rules.map((r) => (
              <label key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
                <span>{r.name}</span>
                <input type="checkbox" checked={r.on} onChange={() => setRules(rules.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))} className="h-5 w-5 accent-[var(--primary)]" />
              </label>
            ))}
          </section>
        )}
        {tab === "Planos" && <Plans />}
      </main>
    </div>
  );
}

function Operations({ ops, setOps }: { ops: Op[]; setOps: (o: Op[]) => void }) {
  const [f, setF] = useState<Omit<Op, "id">>({ title: "", owner: "", priority: "Média", due: day(3), status: "A fazer" });
  const [filter, setFilter] = useState<Priority | "Todas">("Todas");
  const list = ops.filter((o) => filter === "Todas" || o.priority === filter);
  const input = "rounded-full border border-border bg-background px-4 py-2 text-sm";
  return (
    <section className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; setOps([{ ...f, id: crypto.randomUUID() }, ...ops]); setF({ ...f, title: "", owner: "" }); }} className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
        <input className={`${input} flex-1`} placeholder="Nova operação" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className={input} placeholder="Responsável" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} />
        <select className={input} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>{["Baixa", "Média", "Alta", "Crítica"].map((p) => <option key={p}>{p}</option>)}</select>
        <input type="date" className={input} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
        <button className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Adicionar</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {(["Todas", "Baixa", "Média", "Alta", "Crítica"] as const).map((p) => (
          <button key={p} onClick={() => setFilter(p)} className={`rounded-full border border-border px-4 py-1.5 text-sm ${filter === p ? "bg-primary text-primary-foreground" : ""}`}>{p}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex-1"><p className="font-medium">{o.title}</p><p className="text-sm text-muted-foreground">{o.owner || "Sem responsável"} · prazo {o.due.split("-").reverse().join("/")} · {o.priority}</p></div>
            <select className={input} value={o.status} onChange={(e) => setOps(ops.map((x) => (x.id === o.id ? { ...x, status: e.target.value as Status } : x)))}>{["A fazer", "Em andamento", "Concluída"].map((s) => <option key={s}>{s}</option>)}</select>
            <button onClick={() => setOps(ops.filter((x) => x.id !== o.id))} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive">Excluir</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Intel({ ops }: { ops: Op[] }) {
  const groups = (key: "priority" | "status", vals: string[]) => vals.map((v) => [v, ops.filter((o) => o[key] === v).length] as const);
  const max = Math.max(1, ops.length);
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {([["Por prioridade", groups("priority", ["Baixa", "Média", "Alta", "Crítica"])], ["Por status", groups("status", ["A fazer", "Em andamento", "Concluída"])]] as const).map(([title, data]) => (
        <div key={title} className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">{title}</h3>
          <div className="mt-4 space-y-3">
            {data.map(([k, n]) => (
              <div key={k}><div className="flex justify-between text-sm"><span>{k}</span><span>{n}</span></div><div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div></div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Plans() {
  const plans = [
    { name: "Básico", price: "R$ 49", items: ["Até 3 usuários", "100 operações/mês", "Regras padrão"] },
    { name: "Pro", price: "R$ 149", items: ["Usuários ilimitados", "Operações ilimitadas", "Importação de planilhas", "Relatórios com IA"] },
  ];
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {plans.map((p) => (
        <div key={p.name} className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-semibold">{p.name}</h3>
          <p className="mt-2 text-3xl font-semibold">{p.price}<span className="text-sm text-muted-foreground">/mês</span></p>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">{p.items.map((i) => <li key={i}>• {i}</li>)}</ul>
          <button disabled className="mt-6 w-full rounded-full border border-border py-2 text-sm text-muted-foreground">Assinatura em breve</button>
        </div>
      ))}
    </section>
  );
}
