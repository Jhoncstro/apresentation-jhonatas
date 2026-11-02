import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Code2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PortfolioShell({ children }: { children: ReactNode }) {
  return <div className="portfolio min-h-screen bg-background text-foreground">
    <header className="portfolio-header">
      <Link to="/" className="flex items-center gap-3 font-semibold"><span className="brand-mark"><Code2 size={18} /></span><span>jhonatas<span className="text-muted-foreground">.castro</span></span></Link>
      <nav aria-label="Navegação principal" className="liquid-nav">
        {([{ to: "/", label: "Início" }, { to: "/projetos", label: "Projetos" }, { to: "/sobre", label: "Sobre" }] as const).map(item => <Link key={item.to} to={item.to} activeOptions={{ exact: true }} activeProps={{ className: "nav-active" }} className="nav-item">{item.label}</Link>)}
      </nav>
      <Button asChild className="rounded-full header-contact" variant="outline"><Link to="/contato" aria-label="Vamos conversar"><span>Vamos conversar</span> <ArrowUpRight /></Link></Button>
    </header>
    <main>{children}</main>
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-border px-7 py-8 text-xs text-muted-foreground"><span>© 2026 Jhonatas Castro</span><span>Desenvolvimento com propósito. Dados com direção.</span><Link to="/contato" className="flex items-center gap-2 hover:text-foreground">Começar uma conversa <ArrowUpRight size={14} /></Link></footer>
  </div>;
}

export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} — Jhonatas Castro` }, { name: "description", content: description }, { property: "og:title", content: `${title} — Jhonatas Castro` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}