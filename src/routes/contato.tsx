import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownToLine, Check, MessageSquare } from "lucide-react";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import { WORKANA_PROFILE, GITHUB_PROFILE } from "@/lib/portfolio-content";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/contato")({
  head: () =>
    pageHead(
      "Vamos definir seu projeto",
      "Converse sobre seu projeto de dados, automação ou desenvolvimento web com Jhonatas Castro pela Workana.",
    ),
  component: Contact,
});
export function Contact() {
  const [downloaded, setDownloaded] = useState(false);
  function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = `RESUMO DO PROJETO\n\nÁrea: ${data.get("service")}\n\nTarefa ou problema:\n${data.get("problem")}\n\nDados ou sistemas disponíveis:\n${data.get("systems")}\n\nResultado esperado:\n${data.get("result")}\n\nPrazo desejado:\n${data.get("deadline") || "A combinar"}`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumo-do-projeto.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  return (
    <PortfolioShell>
      <section className="mx-auto grid max-w-6xl gap-14 px-7 pb-24 pt-40 md:grid-cols-2">
        <div>
          <p className="eyebrow">UMA CONVERSA COM OBJETIVO</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight">
            Conte o desafio.
            <br />
            Vamos definir a entrega.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
            Qual tarefa toma seu tempo? Quais informações você precisa organizar? Comece com o
            problema que quer resolver.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <a href={WORKANA_PROFILE} target="_blank" rel="noopener noreferrer">
                <MessageSquare size={18} />
                Abrir meu perfil na Workana
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">
                Conhecer meu GitHub
              </a>
            </Button>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            A contratação e a conversa seguem pelos canais disponíveis na plataforma. Este site não
            recebe mensagens nem solicita pagamentos.
          </p>
        </div>
        <form onSubmit={prepare} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Prepare seu pedido</h2>
          <p className="mb-7 mt-3 leading-relaxed text-muted-foreground">
            Baixe um resumo para compartilhar na conversa. O preenchimento fica no seu navegador.
          </p>
          <label htmlFor="service" className="form-label">
            Área do projeto
          </label>
          <select id="service" name="service" className="portfolio-input mb-5">
            <option>Análise de dados</option>
            <option>Automação e APIs</option>
            <option>Desenvolvimento web</option>
            <option>Outro projeto</option>
          </select>
          <label htmlFor="problem" className="form-label">
            Qual tarefa ou problema precisa resolver?
          </label>
          <textarea
            id="problem"
            name="problem"
            className="portfolio-input mb-5 min-h-24"
            required
          />
          <label htmlFor="systems" className="form-label">
            Quais dados ou sistemas estão disponíveis?
          </label>
          <textarea
            id="systems"
            name="systems"
            className="portfolio-input mb-5 min-h-20"
            required
          />
          <label htmlFor="result" className="form-label">
            Como seria uma entrega bem-sucedida?
          </label>
          <textarea id="result" name="result" className="portfolio-input mb-5 min-h-20" required />
          <label htmlFor="deadline" className="form-label">
            Prazo desejado (opcional)
          </label>
          <input id="deadline" name="deadline" className="portfolio-input mb-5" />
          <Button type="submit" className="w-full rounded-full">
            {downloaded ? <Check /> : <ArrowDownToLine />}
            {downloaded ? "Baixar resumo novamente" : "Baixar resumo do projeto"}
          </Button>
          {downloaded && (
            <p role="status" className="mt-4 text-sm text-primary">
              Resumo baixado. Nenhuma mensagem foi enviada. Compartilhe o arquivo no canal que
              escolher.
            </p>
          )}
        </form>
      </section>
    </PortfolioShell>
  );
}
