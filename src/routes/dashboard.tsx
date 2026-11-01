import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Paciente em Tempo Real — VitaNexo" },
      { name: "description", content: "Monitoramento de sinais vitais e intervenções médicas em tempo real." },
      { property: "og:title", content: "Painel do Paciente — VitaNexo" },
      { property: "og:description", content: "Sinais vitais, alertas e intervenções médicas ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Vitals = { hr: number; spo2: number; sys: number; dia: number; temp: number; rr: number };
const patients = [
  { id: 1, name: "Maria Souza", age: 67, bed: "UTI 04", dx: "Insuficiência cardíaca" },
  { id: 2, name: "João Lima", age: 52, bed: "UTI 07", dx: "Pneumonia grave" },
  { id: 3, name: "Ana Ribeiro", age: 34, bed: "Enf. 12", dx: "Pós-operatório" },
];

const rnd = (v: number, d: number, min: number, max: number) =>
  Math.min(max, Math.max(min, +(v + (Math.random() - 0.5) * d).toFixed(1)));

function status(v: Vitals) {
  if (v.spo2 < 90 || v.hr > 120 || v.sys > 170) return "critical";
  if (v.spo2 < 94 || v.hr > 100 || v.temp > 37.8) return "warning";
  return "ok";
}

function Dashboard() {
  const [sel, setSel] = useState(0);
  const [v, setV] = useState<Vitals>({ hr: 88, spo2: 95, sys: 132, dia: 84, temp: 37.2, rr: 18 });
  const [hist, setHist] = useState<number[]>(Array(40).fill(88));
  const [log, setLog] = useState([
    { t: "21:40", who: "Dra. Paula", txt: "Furosemida 40mg IV administrada" },
    { t: "21:15", who: "Enf. Carlos", txt: "Ajuste de O₂ para 3 L/min" },
  ]);
  const [note, setNote] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setV((p) => {
        const n = {
          hr: Math.round(rnd(p.hr, 8, 55, 135)),
          spo2: Math.round(rnd(p.spo2, 2, 86, 100)),
          sys: Math.round(rnd(p.sys, 6, 95, 180)),
          dia: Math.round(rnd(p.dia, 4, 55, 105)),
          temp: rnd(p.temp, 0.2, 36, 39.5),
          rr: Math.round(rnd(p.rr, 2, 10, 30)),
        };
        setHist((h) => [...h.slice(1), n.hr]);
        return n;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [sel]);

  const s = status(v);
  const p = patients[sel]!;
  const now = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const addIntervention = (txt: string) => setLog((l) => [{ t: now(), who: "Você", txt }, ...l]);

  const max = 140, min = 50;
  const path = hist.map((h, i) => `${(i / (hist.length - 1)) * 100},${100 - ((h - min) / (max - min)) * 100}`).join(" ");

  const cards: [string, string, string, boolean][] = [
    ["Freq. cardíaca", `${v.hr}`, "bpm", v.hr > 100],
    ["SpO₂", `${v.spo2}`, "%", v.spo2 < 94],
    ["Pressão", `${v.sys}/${v.dia}`, "mmHg", v.sys > 150],
    ["Temperatura", `${v.temp}`, "°C", v.temp > 37.8],
    ["Freq. resp.", `${v.rr}`, "irpm", v.rr > 24],
  ];

  const badge = { ok: "bg-success/15 text-success", warning: "bg-warning/15 text-warning", critical: "bg-destructive/20 text-destructive" }[s];
  const label = { ok: "Estável", warning: "Atenção", critical: "Crítico" }[s];

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-card p-5 md:w-72 md:border-b-0 md:border-r">
        <Link to="/" className="font-display text-lg font-bold">Vita<span className="text-brand">Nexo</span></Link>
        <p className="mt-6 mb-3 text-xs uppercase tracking-wider text-muted-foreground">Pacientes monitorados</p>
        <div className="space-y-2">
          {patients.map((pt, i) => (
            <button key={pt.id} onClick={() => setSel(i)}
              className={`w-full rounded-lg p-3 text-left transition ${i === sel ? "bg-secondary ring-1 ring-primary/50" : "hover:bg-secondary/60"}`}>
              <div className="font-semibold">{pt.name}</div>
              <div className="text-xs text-muted-foreground">{pt.bed} · {pt.dx}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{p.name}</h1>
            <p className="text-muted-foreground">{p.age} anos · {p.bed} · {p.dx}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><span className="pulse-dot h-2 w-2 rounded-full bg-primary" /> Ao vivo</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge}`}>{label}</span>
          </div>
        </div>

        {s !== "ok" && (
          <div className={`mt-6 rounded-xl p-4 ${badge}`}>
            ⚠ Alerta clínico: sinais vitais fora da faixa. Avaliar intervenção imediata.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {cards.map(([n, val, u, alert]) => (
            <div key={n} className={`rounded-xl border bg-card p-4 ${alert ? "border-warning/60" : "border-border"}`}>
              <div className="text-xs text-muted-foreground">{n}</div>
              <div className={`mt-2 font-display text-3xl font-bold ${alert ? "text-warning" : ""}`}>{val}</div>
              <div className="text-xs text-muted-foreground">{u}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="font-semibold">Frequência cardíaca — tendência</h2>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-48 w-full">
              <polyline points={path} fill="none" stroke="var(--primary)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Intervenções rápidas</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["Aumentar O₂", "Chamar médico", "Administrar antitérmico", "Coletar exames"].map((a) => (
                <button key={a} onClick={() => addIntervention(a)} className="rounded-lg bg-secondary px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground">{a}</button>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { addIntervention(note); setNote(""); } }}>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Registrar intervenção…" className="flex-1 rounded-lg border border-input bg-secondary px-3 py-2 text-sm outline-none" />
              <button className="rounded-lg bg-brand px-3 text-sm font-semibold text-primary-foreground">+</button>
            </form>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Histórico de intervenções</h2>
          <ul className="mt-4 divide-y divide-border">
            {log.map((l, i) => (
              <li key={i} className="flex gap-4 py-3 text-sm">
                <span className="font-display text-primary">{l.t}</span>
                <span className="flex-1">{l.txt}</span>
                <span className="text-muted-foreground">{l.who}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
