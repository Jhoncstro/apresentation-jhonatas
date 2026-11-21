import { createFileRoute, Link } from "@tanstack/react-router";
import { Braces, Database, Workflow, ClipboardCheck } from "lucide-react";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import { PortfolioProjects } from "@/components/portfolio-projects";
import { services } from "@/lib/portfolio-content";
import { Button } from "@/components/ui/button";
import studio from "@/assets/studio.jpg";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Python, dados e aplicações web",
      "Jhonatas Castro. Organização e análise de dados, automação com Python, integração de APIs e aplicações web. Conheça projetos e estudos de caso.",
    ),
  component: Index,
});
function Index() {
  return (
    <PortfolioShell>
      <section className="portfolio-hero">
        <img
          className="hero-image"
          src={studio}
          alt="Ambiente ilustrativo de desenvolvimento e análise de dados"
          width={1920}
          height={1088}
          fetchPriority="high"
        />
        <div className="hero-wash" />
        <div className="hero-content">
          <span className="availability">PROJETOS COM ESCOPO CLARO</span>
          <p className="hero-role">JHONATAS CASTRO · PYTHON, SQL E DESENVOLVIMENTO WEB</p>
          <h1>
            Dados claros.
            <br />
            Rotinas mais simples<span className="text-primary">.</span>
          </h1>
          <p className="hero-description">
            Organização de dados, automação e aplicações web.
            <br className="hidden sm:block" /> Um primeiro projeto bem definido para o seu negócio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="h-12 rounded-full px-6">
              <Link to="/contato">Falar sobre meu projeto</Link>
            </Button>
            <Button asChild variant="outline" className="liquid-button h-12 rounded-full px-6">
              <Link to="/projetos">Conhecer os trabalhos</Link>
            </Button>
          </div>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Estudante de Ciência da Computação. Projetos próprios e estudos educacionais
            apresentados com transparência.
          </p>
        </div>
      </section>
      <div className="tech-strip">
        <span className="tech-strip-label">TECNOLOGIAS E CONHECIMENTOS</span>
        <span>Python</span>
        <span>SQL</span>
        <span>React</span>
        <span>TypeScript</span>
        <span>APIs</span>
      </div>
      <section className="mx-auto max-w-7xl px-7 py-20">
        <p className="eyebrow">COMO POSSO AJUDAR</p>
        <h2 className="mt-4 text-3xl font-semibold">Uma entrega concreta para o seu desafio.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {services.map((item) => {
            const Icon =
              item.icon === "data" ? Database : item.icon === "automation" ? Workflow : Braces;
            return (
              <div key={item.title} className="service-block">
                <Icon size={26} className="text-primary" />
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">{item.description}</p>
                <p className="mt-5 text-sm font-medium leading-relaxed">{item.delivery}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mx-auto max-w-7xl border-t border-border px-7 py-20">
        <PortfolioProjects compact />
      </section>
      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto grid max-w-7xl gap-10 px-7 py-20 md:grid-cols-[1fr_1.6fr]">
          <div>
            <ClipboardCheck className="text-primary" />
            <p className="eyebrow mt-5">COMO TRABALHO</p>
            <h2 className="mt-4 text-3xl font-semibold">Clareza antes de começar.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Entender",
                text: "Você apresenta a tarefa, os dados disponíveis e o resultado esperado.",
              },
              {
                title: "Definir",
                text: "Combinamos escopo, etapas, prazo e critérios de entrega antes da execução.",
              },
              {
                title: "Validar",
                text: "A solução é verificada e acompanhada de orientações para o uso.",
              },
            ].map((step) => (
              <div key={step.title}>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-7 py-20">
        <div>
          <p className="eyebrow">QUAL TAREFA VOCÊ QUER SIMPLIFICAR?</p>
          <h2 className="mt-4 text-3xl font-semibold">Vamos definir seu primeiro projeto.</h2>
        </div>
        <Button asChild className="h-12 rounded-full px-7">
          <Link to="/contato">Ver opções de contato</Link>
        </Button>
      </section>
    </PortfolioShell>
  );
}
