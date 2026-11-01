import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Activity, Database, Layers3, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const projects = [
  { name: "BioSensor W1", category: "Desenvolvimento", label: "Saúde digital", description: "Uma interface para conectar sinais vitais, acompanhamento de pacientes e intervenções médicas.", type: "Demo interativa", icon: Activity, visual: "health", tags: ["React", "Tempo real", "Healthtech"] },
  { name: "Data Flow", category: "Engenharia de dados", label: "Infraestrutura de dados", description: "Conceito de uma plataforma para organizar pipelines, integrar fontes e acompanhar a qualidade dos dados.", type: "Projeto conceitual", icon: Database, visual: "data", tags: ["Python", "SQL", "Pipelines"] },
  { name: "Nexus Workspace", category: "Desenvolvimento", label: "Produto digital", description: "Conceito de um ambiente de trabalho que reúne projetos, tarefas e indicadores em uma experiência simples.", type: "Projeto conceitual", icon: Layers3, visual: "workspace", tags: ["TypeScript", "React", "Produto"] },
];

export function PortfolioProjects({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState<(typeof projects)[number] | null>(null);
  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div><p className="eyebrow">DA IDEIA À EXECUÇÃO</p><h2 className="mt-3 text-3xl font-semibold">{compact ? "Projetos em destaque" : "Projetos & possibilidades"}</h2></div>
      <div className="filter-group" aria-label="Filtrar projetos">{["Todos", "Desenvolvimento", "Engenharia de dados"].map(value => <Button key={value} variant="ghost" className={`rounded-full ${filter === value ? "filter-active" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</Button>)}</div>
    </div>
    <div className="grid gap-6 md:grid-cols-3">{projects.filter(p => filter === "Todos" || p.category === filter).map(project => <article key={project.name} className="project-item">
      <Button variant="ghost" className={`project-visual ${project.visual}`} onClick={() => setSelected(project)} aria-label={`Ver projeto ${project.name}`}>
        <div className="project-preview"><div className="preview-top"><project.icon size={15} /><span>{project.name}</span><span className="preview-dot" /></div>
          {project.visual === "health" ? <><div className="preview-heading">Visão geral do paciente <span>Ao vivo</span></div><div className="vital-grid"><div><small>Frequência cardíaca</small><strong>88 <em>bpm</em></strong></div><div><small>Oxigenação</small><strong>98 <em>%</em></strong></div></div><div className="signal-line">⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁⌁</div><div className="preview-bottom">Monitoramento contínuo <span>● Estável</span></div></> : project.visual === "data" ? <><div className="preview-heading">Pipeline overview <span>Healthy</span></div><div className="pipeline"><span>Sources</span><span>Transform</span><span>Warehouse</span></div><div className="data-bars">{[42, 65, 48, 80, 60, 94, 76, 88].map((h, i) => <i key={i} className={`bar-${h}`} />)}</div><div className="preview-bottom">Data quality <span>All checks passed</span></div></> : <><div className="preview-heading">Meu workspace <span>+ Novo projeto</span></div><div className="workspace-preview">{["Planejamento", "Em andamento", "Concluído"].map(t => <div key={t}><small>{t}</small><i /><i /><i /></div>)}</div><div className="preview-bottom">Tudo no seu lugar <span>3 projetos</span></div></>}
        </div><span className="project-open"><ArrowUpRight size={18} /></span>
      </Button>
      <div className="mt-5 flex items-center justify-between"><p className="text-xs text-muted-foreground">{project.label}</p><span className="text-[10px] text-muted-foreground">{project.type}</span></div>
      <Button variant="link" onClick={() => setSelected(project)} className="h-auto px-0 py-2 text-xl font-semibold text-foreground">{project.name}<ArrowUpRight /></Button>
      <div className="mt-1 flex flex-wrap gap-2">{project.tags.map(t => <span key={t} className="tech-tag">{t}</span>)}</div>
    </article>)}</div>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="project-title" className="project-dialog" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full" aria-label="Fechar projeto" onClick={() => setSelected(null)}><X /></Button><selected.icon className="mb-6 text-primary" size={32} /><p className="eyebrow">{selected.type}</p><h2 id="project-title" className="mt-3 text-3xl font-semibold">{selected.name}</h2><p className="mt-5 leading-relaxed text-muted-foreground">{selected.description}</p><div className="mt-8">{selected.name === "BioSensor W1" ? <Button asChild className="rounded-full"><Link to="/dashboard">Explorar demonstração <ArrowUpRight /></Link></Button> : <Button asChild className="rounded-full"><Link to="/contato">Tenho um projeto parecido <ArrowUpRight /></Link></Button>}</div></section></div>}
  </>;
}