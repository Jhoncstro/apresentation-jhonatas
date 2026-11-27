import { Link } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WORKANA_PROFILE, GITHUB_PROFILE } from "@/lib/portfolio-content";
export function PortfolioShell({ children }: { children: ReactNode }) {
  return (
    <div className="portfolio min-h-screen bg-background text-foreground">
      <a href="#conteudo" className="portfolio-skip-link">
        Ir para o conteúdo
      </a>
      <header className="portfolio-header">
        <Link
          to="/"
          className="flex items-center gap-3 font-semibold"
          aria-label="Jhonatas Castro — início"
        >
          <span className="brand-mark">
            <Code2 size={18} />
          </span>
          <span>
            jhonatas<span className="text-muted-foreground">.castro</span>
          </span>
        </Link>
        <nav aria-label="Navegação principal" className="liquid-nav">
          {(
            [
              { to: "/", label: "Início" },
              { to: "/projetos", label: "Projetos" },
              { to: "/sobre", label: "Sobre" },
              { to: "/laboratorio-quantico", label: "Laboratório" },
            ] as const
          ).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "nav-active" }}
              className="nav-item"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button asChild className="rounded-full header-contact" variant="outline">
          <Link to="/contato">Contato</Link>
        </Button>
      </header>
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 border-t border-border px-7 py-8 text-sm text-muted-foreground">
        <span>© 2026 Jhonatas Castro</span>
        <span>Python · Dados · Aplicações web</span>
        <div className="flex gap-5">
          <a
            href={WORKANA_PROFILE}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Workana
          </a>
          <a
            href={GITHUB_PROFILE}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — Jhonatas Castro` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Jhonatas Castro` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
