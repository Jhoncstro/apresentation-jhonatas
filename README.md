# Portfólio de Jhonatas Castro

Python, organização e análise de dados, automação, integração de APIs e aplicações web. Projetos próprios e estudos educacionais apresentados com escopo e situação de desenvolvimento.

**Endereço principal no Firebase:** [jhonatas-castro-portfolio.web.app](https://jhonatas-castro-portfolio.web.app)

O portfólio público é editado neste repositório e publicado diretamente no Firebase Hosting. O fluxo de desenvolvimento e publicação não exige o editor, créditos ou o botão de publicação do Lovable. A hospedagem usa um site separado do Nexus no projeto Firebase `project-c1bb5150-c01e-4305-9c7` e compartilha as cotas desse projeto.

## Desenvolver e publicar

Use Node.js >=24.12 e o `package-lock.json` versionado:

```sh
npm ci --legacy-peer-deps
npm run dev
```

Antes de publicar:

```sh
npm run typecheck
npm test
npm run build
npm run verify:static
```

Com uma conta autorizada conectada ao Firebase CLI, `npm run deploy` executa build, verificação do artefato estático e publicação somente do Hosting do portfólio. Não publica regras de banco, não migra dados e não altera o site do Nexus. A configuração de destino fica em `firebase.json` e `.firebaserc`.

O build usa Vite, React e TanStack padrão, com páginas públicas pré-renderizadas e fallback para navegação da aplicação. Somente os arquivos estáticos são hospedados; não há servidor de produção ou Cloud Functions para o portfólio. Não publique o repositório inteiro, arquivos `.env`, credenciais ou artefatos de servidor.

## Alterar conteúdo, contatos e projetos

- `src/lib/portfolio-content.ts`: serviços, descrições dos projetos, links do GitHub, Workana e acesso público ao Nexus.
- `src/components/portfolio-projects.tsx`: cartões e detalhes dos projetos.
- `src/components/portfolio-shell.tsx`: navegação e rodapé compartilhados pelas páginas públicas.
- `src/routes/contato.tsx`: página de contato e download do resumo do projeto.
- `src/routes/sobre.tsx`: formação e credenciais.

Use apenas contatos e links fornecidos ou verificados. O contato atual abre a Workana; o formulário baixa um briefing local no navegador e não envia mensagens nem recebe pagamentos. Acrescentar links de contato não exige backend; receber formulários ou enviar e-mails exigirá uma implementação própria, com validação e proteção contra abuso.

O Nexus mantém o link público [Abrir Nexus](https://project-c1bb5150-c01e-4305-9c7.web.app) e o repositório do código. O Google Data Analytics — Capstone é um estudo educacional, sem vínculo empregatício com o Google. O certificado de Introduction to Data Analysis Using Python é verificável; Network Architecture e Foundations of Cybersecurity constam como cursos concluídos, sem certificado emitido disponível. O BioSensor W1 é uma demonstração com dados fictícios.

## Limite desta migração

As páginas públicas `/`, `/projetos`, `/sobre` e `/contato` funcionam sem Lovable. A rota `/dashboard` preserva a demonstração de pacientes em memória no navegador.

A rota legada `/app` continua usando seu backend existente Lovable Cloud/Supabase, suas contas, dados e fluxo de OAuth compatível. Nenhum usuário, banco ou dado desse aplicativo foi migrado para Firebase. Não excluir o projeto Lovable, desligar o backend ou substituir esse fluxo como parte de uma simples alteração no portfólio. Uma migração completa de `/app` deve tratar exportação/restauração, autenticação, permissões e URLs de retorno separadamente.

A troca de domínio não transfere sessões do navegador. Recursos autenticados do aplicativo legado devem ser validados no novo endereço antes de seu uso, incluindo os domínios e retornos permitidos de autenticação.

A integração GitHub do projeto do portfólio no Lovable foi desconectada em 22/11/2026, depois da validação do novo endereço Firebase. Não revogue a instalação global do aplicativo GitHub, que pode atender outros projetos, nem apague o projeto ou seu backend. O endereço antigo é histórico; sua desativação ou redirecionamento deve preservar os acessos existentes.

## Validação da migração

Quatro testes existentes, TypeScript, build e verificação do artefato estático passaram. As quatro páginas públicas foram pré-renderizadas e verificadas por HTTP; navegação de projetos e contato foi conferida no navegador. Auditoria das dependências de produção: zero vulnerabilidades conhecidas; Zod atualizado para 4.6.7. Persistem avisos moderados em ferramentas de desenvolvimento. O workflow GitHub Actions valida instalação, tipos, testes, build e saída estática; a publicação continua sendo um comando explícito, com a sessão Firebase autorizada.

## Nexus Workspace atualizado em 26/11/2026

O estudo de caso apresenta a aplicação Firebase atual: importação automática CSV/XLSX, análise por fonte, indicadores, resumo financeiro conectado às vendas e alertas de vencimento. A imagem usa dados fictícios. O link público abre a plataforma; a área de gestão exige cadastro/login. O código-fonte atual do Nexus permanece privado. A atualização não altera o site, os dados ou as regras do Nexus.
