import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Database, Layers3, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analysisSteps, projects } from "@/lib/portfolio-content";

export function PortfolioProjects({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState<(typeof projects)[number] | null>(null);
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">TRABALHOS E PROCESSO</p>
          <h2 className="mt-3 text-3xl font-semibold">
            {compact ? "Conheça meu trabalho" : "Projetos e estudos de caso"}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Projetos próprios e estudos educacionais, com contexto, método e situação de cada
            entrega.
          </p>
        </div>
        <div className="filter-group" aria-label="Filtrar projetos">
          {["Todos", "Desenvolvimento", "Análise de dados"].map((value) => (
            <Button
              key={value}
              variant="ghost"
              className={`rounded-full ${filter === value ? "filter-active" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {projects
          .filter((p) => filter === "Todos" || p.category === filter)
          .map((project) => {
            const Icon =
              project.visual === "data"
                ? Database
                : project.visual === "health"
                  ? Activity
                  : Layers3;
            return (
              <article key={project.name} className="project-item">
                <button
                  type="button"
                  className={`project-visual ${project.visual}${project.visual === "workspace" ? " nexus-visual" : ""}`}
                  onClick={() => setSelected(project)}
                  aria-label={`Ver projeto ${project.name}`}
                >
                  {project.visual === "workspace" ? (
                    <>
                      <img
                        className="nexus-project-image"
                        src="/images/nexus-workspace.jpg"
                        alt="Visão geral do Nexus com filtro por fonte de dados"
                        width={1280}
                        height={720}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="nexus-project-caption">
                        <span className="block text-xs font-medium">APLICAÇÃO PUBLICADA</span>
                        <strong className="mt-2 block text-2xl">Nexus Workspace</strong>
                      </div>
                    </>
                  ) : (
                    <div className="case-preview">
                      <Icon size={28} />
                      <span className="mt-6 block text-sm font-medium">{project.type}</span>
                      <strong className="mt-3 block text-2xl leading-snug">{project.name}</strong>
                      <span className="mt-5 block text-sm leading-relaxed">
                        {project.visual === "data"
                          ? "Pergunta de negócio · Dados organizados · Conclusões"
                          : "Prototipação · Componentes · Navegação"}
                      </span>
                    </div>
                  )}
                </button>
                <p className="mt-5 text-sm text-muted-foreground">{project.label}</p>
                <h3 className="mt-2 text-xl font-semibold">{project.name}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((t) => (
                    <span key={t} className="tech-tag">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setSelected(project)}
                  >
                    Ver detalhes
                  </Button>
                  {"demo" in project && (
                    <Button asChild className="rounded-full">
                      <a href={project.demo} target="_blank" rel="noopener noreferrer">
                        {project.demoLabel}
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="portfolio text-foreground max-h-[85vh] max-w-2xl overflow-y-auto p-7 sm:p-10">
          {selected && (
            <>
              <DialogHeader>
                <p className="eyebrow">{selected.type}</p>
                <DialogTitle className="mt-3 text-3xl">{selected.name}</DialogTitle>
                <DialogDescription className="pt-3 text-base leading-relaxed">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>
              {selected.visual === "workspace" && (
                <figure className="mt-2 space-y-2">
                  <img
                    src="/images/nexus-workspace.jpg"
                    alt="Painel publicado do Nexus Workspace com filtro por fonte, indicadores e gráficos"
                    width={1280}
                    height={720}
                    className="w-full rounded-lg border border-border"
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    Imagem da plataforma publicada com dados fictícios.
                  </figcaption>
                </figure>
              )}
              {selected.visual === "data" && (
                <div className="mt-2 flex flex-wrap gap-2" aria-label="Etapas da análise">
                  {analysisSteps.map((step) => (
                    <span key={step} className="tech-tag">
                      {step}
                    </span>
                  ))}
                </div>
              )}
              <h3 className="mt-3 text-lg font-semibold">O que o trabalho apresenta</h3>
              <ul className="list-disc space-y-3 pl-5 leading-relaxed text-muted-foreground">
                {selected.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="mt-2 leading-relaxed">{selected.application}</p>
              <p className="rounded-lg border border-border bg-secondary/50 p-4 text-sm leading-relaxed text-muted-foreground">
                {selected.note}
              </p>
              <div className="flex flex-wrap gap-3">
                {"demo" in selected && (
                  <Button asChild className="rounded-full">
                    <a href={selected.demo} target="_blank" rel="noopener noreferrer">
                      {selected.demoLabel}
                    </a>
                  </Button>
                )}
                {selected.source && (
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={selected.source} target="_blank" rel="noopener noreferrer">
                      <FileSearch size={17} />
                      {selected.sourceLabel}
                    </a>
                  </Button>
                )}
                <Button asChild className="rounded-full">
                  <Link to="/contato">Conversar sobre meu projeto</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
