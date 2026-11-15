import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
  component: NexoGate,
});

type Priority = "Baixa" | "Média" | "Alta" | "Crítica";
type Status = "A fazer" | "Em andamento" | "Concluída";
type Op = { id: string; title: string; owner: string; priority: Priority; due: string; status: Status };
type Rule = { id: string; code: string; name: string; enabled: boolean };
type Org = { id: string; name: string };

const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const tabs = ["Visão geral", "Operações", "Inteligência", "Regras", "Planos"] as const;

function NexoApp({ org, session }: { org: Org; session: Session }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Visão geral");
  const [ops, setOpsState] = useState<Op[]>([]);
  const [rules, setRulesState] = useState<Rule[]>([]);
  const [approved, setApprovedState] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [o, r, v] = await Promise.all([
      supabase.from("operations").select("id,title,owner,priority,due,status").eq("organization_id", org.id).order("created_at", { ascending: false }),
      supabase.from("rules").select("id,code,name,enabled").eq("organization_id", org.id).order("code"),
      supabase.from("reviews").select("insight_key").eq("organization_id", org.id),
    ]);
    setOpsState((o.data ?? []) as Op[]);
    setRulesState((r.data ?? []) as Rule[]);
    setApprovedState((v.data ?? []).map((x) => x.insight_key));
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  const setOps = async (next: Op[]) => {
    const prev = ops; setOpsState(next);
    const removed = prev.filter((p) => !next.some((n) => n.id === p.id));
    const added = next.filter((n) => !prev.some((p) => p.id === n.id));
    const changed = next.filter((n) => { const p = prev.find((x) => x.id === n.id); return p && JSON.stringify(p) !== JSON.stringify(n); });
    for (const r of removed) await supabase.from("operations").delete().eq("id", r.id);
    for (const a of added) { const { id: _id, ...rest } = a; await supabase.from("operations").insert({ ...rest, organization_id: org.id }); }
    for (const c of changed) await supabase.from("operations").update({ status: c.status }).eq("id", c.id);
    if (added.length) load();
  };
  const setRules = async (next: Rule[]) => {
    setRulesState(next);
    for (const r of next) { const p = rules.find((x) => x.id === r.id); if (p && p.enabled !== r.enabled) await supabase.from("rules").update({ enabled: r.enabled }).eq("id", r.id); }
  };
  const setApproved = async (next: string[]) => {
    setApprovedState(next);
    const k = next[next.length - 1]; if (k) await supabase.from("reviews").insert({ organization_id: org.id, insight_key: k });
  };

  const today = day(0);
  const insights = useMemo(() => {
    const out: { id: string; text: string }[] = [];
    const on = (code: string) => rules.find((r) => r.code === code)?.enabled;
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
        <div className="flex items-center gap-3"><Link to="/" className="text-lg font-semibold">Nexo<span className="text-primary">.</span></Link><span className="rounded-full bg-secondary px-3 py-1 text-sm">{org.name}</span></div>
        <nav className="flex flex-wrap gap-1 rounded-full border border-border bg-secondary/50 p-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="hidden md:inline">{session.user.email}</span><button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border px-3 py-1.5 hover:text-foreground">Sair</button></div>
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
                <input type="checkbox" checked={r.enabled} onChange={() => setRules(rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))} className="h-5 w-5 accent-[var(--primary)]" />
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
      <form onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; setOps([{ ...f, id: "new-" + Date.now() }, ...ops]); setF({ ...f, title: "", owner: "" }); }} className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
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

const field = "w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm";

function NexoGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [org, setOrg] = useState<Org | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);
  const loadOrg = useCallback(async () => {
    const { data } = await supabase.from("organizations").select("id,name").order("created_at").limit(1);
    setOrg(data?.[0] ?? null);
  }, []);
  useEffect(() => { if (session) loadOrg(); else setOrg(undefined); }, [session, loadOrg]);

  if (session === undefined || (session && org === undefined)) return <Center><p className="text-muted-foreground">Carregando…</p></Center>;
  if (!session) return <Login />;
  if (!org) return <Onboarding session={session} onDone={loadOrg} />;
  return <NexoApp org={org} session={session} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-8">{children}</div></div>;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name } } });
      setMsg(error ? error.message : "Conta criada! Confirme pelo link enviado ao seu e-mail.");
    }
    setBusy(false);
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (r.error) setMsg("Não foi possível entrar com Google.");
  };
  return (
    <Center>
      <h1 className="text-2xl font-semibold">Nexo<span className="text-primary">.</span> Empresarial</h1>
      <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Entre na conta da sua empresa." : "Crie sua conta e cadastre sua empresa."}</p>
      <button type="button" onClick={google} className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#1F1F1F]">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
        Continuar com Google
      </button>
      <div className="my-5 text-center text-xs text-muted-foreground">ou com e-mail</div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && <input required className={field} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />}
        <input required type="email" className={field} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input required type="password" minLength={6} className={field} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm text-primary-foreground">{mode === "in" ? "Entrar" : "Criar conta"}</button>
      </form>
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-primary">{mode === "in" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}</button>
    </Center>
  );
}

function Onboarding({ session, onDone }: { session: Session; onDone: () => void }) {
  const [full, setFull] = useState((session.user.user_metadata?.['full_name'] as string) ?? "");
  const [phone, setPhone] = useState(""); const [company, setCompany] = useState(""); const [doc, setDoc] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    await supabase.from("profiles").update({ full_name: full, phone }).eq("id", session.user.id);
    const { error } = await supabase.from("organizations").insert({ name: company, document: doc || null, created_by: session.user.id });
    if (error) return setErr("Não foi possível criar a empresa. Tente novamente.");
    onDone();
  };
  return (
    <Center>
      <h1 className="text-2xl font-semibold">Cadastre sua empresa</h1>
      <p className="mt-1 text-sm text-muted-foreground">Os dados ficam visíveis só para você e sua equipe.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input required className={field} placeholder="Seu nome completo" value={full} onChange={(e) => setFull(e.target.value)} />
        <input className={field} placeholder="Telefone / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input required className={field} placeholder="Nome da empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
        <input className={field} placeholder="CNPJ (opcional)" value={doc} onChange={(e) => setDoc(e.target.value)} />
        <button className="w-full rounded-full bg-primary py-2.5 text-sm text-primary-foreground">Começar</button>
      </form>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm text-muted-foreground">Sair</button>
    </Center>
  );
}
