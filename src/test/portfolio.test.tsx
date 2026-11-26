import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({
    to,
    children,
    activeOptions: _a,
    activeProps: _b,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
    activeOptions?: unknown;
    activeProps?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
import { PortfolioProjects } from "@/components/portfolio-projects";
import { Contact } from "@/routes/contato";
import {
  CONTACT_EMAIL,
  EMAIL_LINK,
  LINKEDIN_PROFILE,
  WHATSAPP_DISPLAY,
  WHATSAPP_LINK,
  WORKANA_PROFILE,
} from "@/lib/portfolio-content";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Portfolio interactions", () => {
  it("apresenta o Nexus atual com imagem, importação automática e acesso à plataforma publicada", () => {
    render(<PortfolioProjects />);
    fireEvent.click(screen.getByRole("button", { name: "Ver projeto Nexus Workspace" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Importação automática de CSV e Excel/)).toBeInTheDocument();
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/images/nexus-workspace.jpg");
    expect(within(dialog).getByRole("link", { name: "Abrir Nexus" })).toHaveAttribute(
      "href",
      "https://project-c1bb5150-c01e-4305-9c7.web.app/",
    );
    expect(within(dialog).getByText(/repositório privado/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: /Ver código/ })).not.toBeInTheDocument();
  });

  it("filters to the educational data case and restores development projects", () => {
    render(<PortfolioProjects />);
    fireEvent.click(screen.getByRole("button", { name: "Análise de dados" }));
    expect(
      screen.getByRole("heading", { name: "Google Data Analytics — Capstone" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nexus Workspace" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByRole("heading", { name: "Nexus Workspace" })).toBeInTheDocument();
  });
  it("opens an accessible case dialog with source and closes it", async () => {
    render(<PortfolioProjects />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver projeto Google Data Analytics — Capstone" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Não representa contratação ou vínculo/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /Consultar descrição original/ }),
    ).toHaveAttribute("href", expect.stringContaining("github.com/Jhoncstro/"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("offers real contact destinations and prepares a contact request via WhatsApp or email", () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<Contact />);
    expect(screen.getByRole("link", { name: "Abrir meu perfil na Workana" })).toHaveAttribute(
      "href",
      WORKANA_PROFILE,
    );
    expect(screen.getByRole("link", { name: `WhatsApp ${WHATSAPP_DISPLAY}` })).toHaveAttribute(
      "href",
      WHATSAPP_LINK,
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      LINKEDIN_PROFILE,
    );
    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", EMAIL_LINK);
    fireEvent.change(screen.getByLabelText("Qual tarefa ou problema precisa resolver?"), {
      target: { value: "Organizar planilhas" },
    });
    fireEvent.change(screen.getByLabelText("Quais dados ou sistemas estão disponíveis?"), {
      target: { value: "Arquivos CSV" },
    });
    fireEvent.change(screen.getByLabelText("Como seria uma entrega bem-sucedida?"), {
      target: { value: "Uma base limpa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar contato" }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${WHATSAPP_LINK}?text=`),
      "_blank",
      "noopener,noreferrer",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Solicitação preparada para envio via WhatsApp",
    );
    expect(screen.getByRole("link", { name: "envie por e-mail" })).toHaveAttribute(
      "href",
      expect.stringContaining(EMAIL_LINK),
    );
    expect(network).not.toHaveBeenCalled();
  });
});
