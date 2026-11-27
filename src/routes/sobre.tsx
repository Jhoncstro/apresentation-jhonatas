import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, GraduationCap } from "lucide-react";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import { PortfolioProjects } from "@/components/portfolio-projects";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/sobre")({
  head: () =>
    pageHead(
      "Sobre meu trabalho",
      "Jhonatas Castro, estudante de Ciência da Computação. Projetos próprios, estudo de caso Google Data Analytics e formação em tecnologia.",
    ),
  component: About,
});
const courses = [
  {
    title: "Network Operations",
    issuer: "Coursera",
    status: "Curso concluído",
    date: "Credencial: DS3DLO7OQJZ6",
    description: "Formação complementar em operações de redes.",
    url: "https://coursera.org/share/1afba6cea00c57cef9f61c15f8fd8ecd",
    linkLabel: "Verificar certificado",
    note: "Certificado de conclusão com link público fornecido pelo titular.",
  },
  {
    title: "Introduction to Data Analysis Using Python",
    issuer: "Google · Coursera",
    status: "Certificado verificável",
    date: "Concluído em 11 de novembro de 2026 · aproximadamente 27 horas",
    description:
      "Python aplicado à análise de dados, estruturas de dados, limpeza e manipulação de dados, NumPy e Pandas.",
    url: "https://www.coursera.org/account/accomplishments/verify/IMYP0J0UD5UD",
    linkLabel: "Verificar certificado",
    note: "Certificado de conclusão do curso emitido em nome de Jhonatas Oliveira.",
  },
  {
    title: "Network Architecture",
    issuer: "Google · Coursera",
    status: "Curso concluído",
    date: "Concluído em maio de 2026",
    description: "Formação complementar em arquitetura de redes, infraestrutura e conectividade.",
    url: "https://www.coursera.org/learn/google-network-architecture",
    linkLabel: "Conhecer o curso",
    note: "Conclusão confirmada na conta Coursera. Certificado verificável emitido não disponível.",
  },
  {
    title: "Foundations of Cybersecurity",
    issuer: "Google · Coursera",
    status: "Curso concluído",
    date: "Concluído em maio de 2026",
    description:
      "Formação complementar em fundamentos de cibersegurança, riscos e proteção da informação.",
    url: "https://www.coursera.org/learn/foundations-of-cybersecurity",
    linkLabel: "Conhecer o curso",
    note: "Conclusão confirmada na conta Coursera. Certificado verificável emitido não disponível.",
  },
];
function About() {
  return (
    <PortfolioShell>
      <section className="mx-auto max-w-7xl px-7 pb-20 pt-40">
        <p className="eyebrow">SOBRE MEU TRABALHO</p>
        <h1 className="mt-5 text-5xl font-semibold">
          Jhonatas Castro<span className="text-primary">.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground">
          Sou estudante de Ciência da Computação e desenvolvo projetos próprios e educacionais em
          software e análise de dados. Meu foco é entender o problema, organizar a informação e
          construir entregas de escopo claro.
        </p>
        <div className="my-12 grid gap-7 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7">
            <GraduationCap className="text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Ciência da Computação — Estácio</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Bacharelado em andamento. Conclusão prevista: janeiro de 2029.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-7">
            <h2 className="text-xl font-semibold">Uma forma prática de começar</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Um pequeno processo, um conjunto de dados ou uma funcionalidade bem definida.
              Combinamos o que será entregue e como verificar o resultado.
            </p>
            <Button asChild variant="outline" className="mt-5 rounded-full">
              <Link to="/contato">Apresentar meu desafio</Link>
            </Button>
          </div>
        </div>
        <PortfolioProjects />
        <div id="certificacoes" className="mt-16 scroll-mt-8">
          <p className="eyebrow">FORMAÇÃO GOOGLE · COURSERA</p>
          <h2 className="mt-4 text-3xl font-semibold">Certificados e cursos concluídos</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Formação complementar pela Coursera, com links para certificados e cursos concluídos.
          </p>
          <div className="mt-7 grid gap-6 md:grid-cols-3">
            {courses.map((course) => (
              <article key={course.title} className="rounded-2xl border border-border bg-card p-7">
                <Award className="text-primary" />
                <p className="mt-4 text-sm font-semibold text-primary">{course.status}</p>
                <h3 className="mt-5 text-xl font-semibold">{course.title}</h3>
                <p className="mt-2 text-sm font-semibold">{course.issuer}</p>
                <p className="mt-3 text-sm text-muted-foreground">{course.date}</p>
                <p className="mt-4 leading-relaxed text-muted-foreground">{course.description}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{course.note}</p>
                <a
                  className="cert-link mt-6"
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {course.linkLabel}
                </a>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-12 rounded-2xl border border-border bg-secondary/50 p-7">
          <h2 className="text-xl font-semibold">Também exploro desafios computacionais</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            Projeto de estudo sobre compilação verificável de circuitos quânticos, relacionado ao
            desafio Google Quantum AI no Kaggle.
          </p>
          <a
            className="cert-link mt-5"
            href="https://github.com/Jhoncstro/google-quantum-circuit-compilation"
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar repositório do estudo
          </a>
        </div>
      </section>
    </PortfolioShell>
  );
}
