import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Braces, Database, Workflow, Sparkles } from "lucide-react";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import { PortfolioProjects } from "@/components/portfolio-projects";
import { Button } from "@/components/ui/button";
import studio from "@/assets/studio.jpg";

export const Route = createFileRoute("/")({
  head: () => pageHead("Desenvolvedor & engenheiro de dados", "Jhonatas Castro. Desenvolvimento de software, engenharia de dados e produtos digitais para transformar ideias em realidade."),
  component: Index,
});
function Index() {
  return <PortfolioShell>
    <section className="portfolio-hero">
      <img className="hero-image" src={studio} alt="Estúdio de tecnologia com computador e visualização de dados" width={1920} height={1088} fetchPriority="high" />
      <div className="hero-wash" />
      <div className="hero-content">
        <span className="availability"><span />Vamos construir seu próximo projeto</span>
        <p className="hero-role">DESENVOLVEDOR & ENGENHEIRO DE DADOS</p>
        <h1>Jhonatas<br />Castro<span className="text-primary">.</span></h1>
        <p className="hero-description">Transformo ideias em experiências digitais.<br className="hidden sm:block" /> E dados em novas possibilidades.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild className="h-12 rounded-full px-6"><Link to="/contato">Vamos criar algo juntos <ArrowUpRight /></Link></Button><Button asChild variant="outline" className="liquid-button h-12 rounded-full px-6"><Link to="/projetos">Explorar projetos <ArrowDown /></Link></Button></div>
        <div className="hero-skills"><span><Braces size={15} /> Código com propósito</span><span><Database size={15} /> Dados com direção</span></div>
      </div>
      <div className="hero-note"><span className="note-icon"><Sparkles size={19} /></span><div><strong>Ideias. Código. Impacto.</strong><span>Da primeira conversa à próxima entrega.</span></div><ArrowUpRight size={20} /></div>
      <span className="hero-caption">TECNOLOGIA QUE CONECTA POSSIBILIDADES</span>
    </section>
    <div className="tech-strip"><span className="tech-strip-label">FERRAMENTAS PARA CONSTRUIR</span><span>Python</span><span>React</span><span>TypeScript</span><span>SQL</span><span>Node.js</span><span>Cloud</span></div>
    <section className="mx-auto max-w-7xl px-7 py-20"><PortfolioProjects compact /></section>
    <section className="border-y border-border bg-secondary/50"><div className="mx-auto grid max-w-7xl gap-12 px-7 py-20 md:grid-cols-[1fr_1.7fr]"><div><p className="eyebrow">COMO POSSO AJUDAR</p><h2 className="mt-4 text-3xl font-semibold leading-tight">Do desafio à solução.<br /><span className="text-muted-foreground">Sem complicar.</span></h2><Button asChild variant="link" className="mt-6 px-0 text-foreground"><Link to="/sobre">Conheça meu trabalho <ArrowUpRight /></Link></Button></div><div className="grid gap-8 sm:grid-cols-3">{[{ icon: Braces, title: "Desenvolvimento", description: "Aplicações web e sistemas que unem uma boa experiência a uma base sólida." }, { icon: Database, title: "Engenharia de dados", description: "Pipelines, integrações e dados organizados para decisões melhores." }, { icon: Workflow, title: "Soluções sob medida", description: "Automação e produtos digitais pensados para o seu desafio." }].map(item => <div key={item.title}><item.icon size={24} className="text-primary" /><h3 className="mt-6 text-base font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div>)}</div></div></section>
    <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-7 py-20"><div><p className="eyebrow">TEM UMA IDEIA EM MENTE?</p><h2 className="mt-4 text-3xl font-semibold">Vamos construir o que vem a seguir.</h2></div><Button asChild className="h-12 rounded-full px-7"><Link to="/contato">Fale sobre seu projeto <ArrowUpRight /></Link></Button></section>
  </PortfolioShell>;
}
