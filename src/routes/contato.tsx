import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Linkedin, Mail, MessageCircle, MessageSquare, Send } from "lucide-react";
import { PortfolioShell, pageHead } from "@/components/portfolio-shell";
import {
  CONTACT_EMAIL,
  EMAIL_LINK,
  GITHUB_PROFILE,
  LINKEDIN_PROFILE,
  WHATSAPP_DISPLAY,
  WHATSAPP_LINK,
  WORKANA_PROFILE,
} from "@/lib/portfolio-content";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/contato")({
  head: () =>
    pageHead(
      "Vamos definir seu projeto",
      "Converse sobre seu projeto de dados, automação ou desenvolvimento web com Jhonatas Castro.",
    ),
  component: Contact,
});
export function Contact() {
  const [preparedMessage, setPreparedMessage] = useState<string | null>(null);
  function requestContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = `Olá Jhonatas! Gostaria de solicitar contato sobre um projeto.\n\nÁrea: ${data.get("service")}\n\nTarefa ou problema:\n${data.get("problem")}\n\nDados ou sistemas disponíveis:\n${data.get("systems")}\n\nResultado esperado:\n${data.get("result")}\n\nPrazo desejado:\n${data.get("deadline") || "A combinar"}`;
    setPreparedMessage(text);
    window.open(
      `${WHATSAPP_LINK}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  const emailSubject = encodeURIComponent("Solicitação de contato — Projeto");
  const emailBody = preparedMessage ? encodeURIComponent(preparedMessage) : "";
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
            <Button asChild variant="outline" className="rounded-full">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} />
                WhatsApp {WHATSAPP_DISPLAY}
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <a href={LINKEDIN_PROFILE} target="_blank" rel="noopener noreferrer">
                <Linkedin size={18} />
                LinkedIn
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <a href={EMAIL_LINK}>
                <Mail size={18} />
                {CONTACT_EMAIL}
              </a>
            </Button>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Escolha o canal de sua preferência para iniciar a conversa. Você também pode preencher o
            formulário ao lado para enviar os detalhes do projeto.
          </p>
        </div>
        <form
          onSubmit={requestContact}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <h2 className="text-2xl font-semibold">Prepare seu pedido</h2>
          <p className="mb-7 mt-3 leading-relaxed text-muted-foreground">
            Preencha os detalhes abaixo e envie sua solicitação de contato pelo WhatsApp ou e-mail.
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
            {preparedMessage ? <Check /> : <Send />}
            Solicitar contato
          </Button>
          {preparedMessage && (
            <p role="status" className="mt-4 text-sm text-primary">
              Solicitação preparada para envio via WhatsApp. Confirme o envio no aplicativo ou{" "}
              <a
                href={`${EMAIL_LINK}?subject=${emailSubject}&body=${emailBody}`}
                className="underline"
              >
                envie por e-mail
              </a>
              .
            </p>
          )}
        </form>
      </section>
    </PortfolioShell>
  );
}
