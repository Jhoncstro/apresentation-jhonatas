import { createFileRoute } from "@tanstack/react-router";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import { PortfolioProjects } from "@/components/portfolio-projects";
export const Route = createFileRoute("/projetos")({ head: () => pageHead("Projetos", "Explore projetos de desenvolvimento e engenharia de dados de Jhonatas Castro."), component: Projects });
function Projects() { return <PortfolioShell><section className="mx-auto min-h-[75vh] max-w-7xl px-7 pb-24 pt-40"><PortfolioProjects /></section></PortfolioShell>; }