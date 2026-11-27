import { createFileRoute } from "@tanstack/react-router";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import { QuantumLab } from "@/components/quantum-lab";
export const Route = createFileRoute("/laboratorio-quantico")({
  head: () =>
    pageHead(
      "Laboratório quântico",
      "Otimização adaptativa de circuitos quânticos no navegador, com verificação de equivalência, evolução cumulativa e memória de experimentos.",
    ),
  component: QuantumLabPage,
});
function QuantumLabPage() {
  return (
    <PortfolioShell>
      <section className="mx-auto max-w-7xl px-7 pb-24 pt-40">
        <p className="eyebrow">QAIE · Quantum Adaptive Intelligence Engine</p>
        <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Laboratório quântico</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Otimizador de circuitos quânticos que combina reescritas exatas, simulated annealing, beam
          search e recombinação evolutiva escolhidas por um bandit. Cada candidato é verificado
          contra o circuito original antes de ser aceito, o melhor resultado nunca regride e todo o
          histórico fica salvo no seu navegador.
        </p>
        <div className="mt-10">
          <QuantumLab />
        </div>
      </section>
    </PortfolioShell>
  );
}
