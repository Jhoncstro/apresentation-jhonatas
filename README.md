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
- `src/routes/laboratorio-quantico.tsx` e `src/components/quantum-lab.tsx`: Laboratório quântico (QAIE), descrito abaixo.

Use apenas contatos e links fornecidos ou verificados. O contato atual abre a Workana; o formulário baixa um briefing local no navegador e não envia mensagens nem recebe pagamentos. Acrescentar links de contato não exige backend; receber formulários ou enviar e-mails exigirá uma implementação própria, com validação e proteção contra abuso.

O Nexus mantém o link público [Abrir Nexus](https://project-c1bb5150-c01e-4305-9c7.web.app) e o repositório do código. O Google Data Analytics — Capstone é um estudo educacional, sem vínculo empregatício com o Google. O certificado de Introduction to Data Analysis Using Python é verificável; Network Architecture e Foundations of Cybersecurity constam como cursos concluídos, sem certificado emitido disponível. O BioSensor W1 é uma demonstração com dados fictícios.

## Laboratório quântico (QAIE + CEE)

A rota `/laboratorio-quantico` otimiza circuitos quânticos inteiramente no navegador do visitante, dentro de um Web Worker. Não há servidor nem dados enviados para fora do navegador. O código fica em `src/lib/qaie/`:

| Arquivo                    | Função                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `circuit.ts`, `qasm.ts`    | Modelo de circuito; importação/exportação OpenQASM 2 e JSON (até 64 qubits e 200.000 portas; sem `gate`, `if`, `reset`)                                                                                                                                                                                                                              |
| `metrics.ts`               | Portas, T-count, T-depth, profundidade, portas de 2+ qubits, rotações arbitrárias, qubits ativos; custo ponderado normalizado pelo original (= 1); fronteira de Pareto                                                                                                                                                                               |
| `simulate.ts`, `verify.ts` | Simulação por vetor de estado; equivalência a menos de fase global: exata (todas as colunas) até 8 qubits, estados aleatórios de 9 a 20, rejeição acima disso                                                                                                                                                                                        |
| `rewrite.ts`               | Reescritas exatas: cancelamento de inversos, fusão de rotações, comutação, conjugação por Hadamard, inversão de CNOT, CZ↔CX, decomposição de SWAP                                                                                                                                                                                                    |
| `engine.ts`                | Ciclo adaptativo: bandit UCB1 escolhe entre descida gulosa, simulated annealing, beam search e recombinação evolutiva; melhor global monotônico; detecção de estagnação com reajuste de parâmetros                                                                                                                                                   |
| `engine.ts` (CEE)          | Genealogia com pais, transformações e evidência de verificação; elites como linhagens; recombinação reaplica transformações de outra linhagem e reavalia o circuito resultante (pontuações nunca são somadas); interações positivas/negativas; reaproveitamento de transformações parciais revalidadas uma a uma; recuperação de gerações anteriores |
| `storage.ts`               | Execuções e checkpoints no IndexedDB (até 20 por execução)                                                                                                                                                                                                                                                                                           |
| `obsidian.ts`, `zip.ts`    | Notas Markdown com front matter e wiki links; gravação direta no Vault (Chrome/Edge) ou download em ZIP                                                                                                                                                                                                                                              |

Limites: o custo exibido é local e não é pontuação oficial de competição. Não há Python, Qiskit, Cirq, ZX-calculus, QSP/QSVT nem síntese numérica; métodos como CMA-ES, Bayesian Optimization e MCTS ainda não estão implementados. A importação aceita apenas OpenQASM 2 e JSON. Testes em `src/test/qaie.test.ts`.

### DCRE — recursos computacionais distribuídos

A seção _Distributed Computing Center_ do laboratório separa três estados, sem simular conexões:

| Estado            | Ambientes                                                                              | Como funciona                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conectado         | Web Workers, IndexedDB, GitHub Actions (só testes)                                     | Pool de workers em modelo de ilhas: cada worker usa outra semente; melhorias vão para o hub (worker 0), que as verifica de novo antes de aceitar e devolve o melhor às ilhas                            |
| Exportação manual | Kaggle, Colab, Jupyter, Mac (Python local)                                             | "Transferir" baixa um ZIP com `.ipynb` (NumPy), checkpoint universal e `manifest.json`; o notebook verifica e simplifica o circuito e grava `qaie-result.json`, que a página importa e verifica de novo |
| Não implementado  | WebGPU, WASM, Qiskit/Cirq/PyZX, Hugging Face, Google Cloud, Oracle, Azure, AWS, Docker | Apenas listados                                                                                                                                                                                         |

Arquivos: `resources.ts` (detecção de núcleos, memória, WebGPU, WASM e quota; recomendação por tamanho), `checkpoint.ts` (checkpoint universal com hash SHA-256 de JSON canônico e hash do circuito original), `notebook.ts` (pacote `.ipynb` e formato `qaie-result`) e `src/components/distributed-center.tsx`. O orçamento para servidores é R$ 0: nenhum serviço pago é contratado e nenhuma quota é contornada. `src/test/qaie-dcre.test.ts` executa o notebook gerado com Python e NumPy quando estão disponíveis.

## Limite desta migração

As páginas públicas `/`, `/projetos`, `/sobre` e `/contato` funcionam sem Lovable. A rota `/dashboard` preserva a demonstração de pacientes em memória no navegador.

A rota legada `/app` continua usando seu backend existente Lovable Cloud/Supabase, suas contas, dados e fluxo de OAuth compatível. Nenhum usuário, banco ou dado desse aplicativo foi migrado para Firebase. Não excluir o projeto Lovable, desligar o backend ou substituir esse fluxo como parte de uma simples alteração no portfólio. Uma migração completa de `/app` deve tratar exportação/restauração, autenticação, permissões e URLs de retorno separadamente.

A troca de domínio não transfere sessões do navegador. Recursos autenticados do aplicativo legado devem ser validados no novo endereço antes de seu uso, incluindo os domínios e retornos permitidos de autenticação.

A integração GitHub do projeto do portfólio no Lovable foi desconectada em 22/11/2026, depois da validação do novo endereço Firebase. Não revogue a instalação global do aplicativo GitHub, que pode atender outros projetos, nem apague o projeto ou seu backend. O endereço antigo é histórico; sua desativação ou redirecionamento deve preservar os acessos existentes.

## Validação da migração

Quatro testes existentes, TypeScript, build e verificação do artefato estático passaram. As quatro páginas públicas foram pré-renderizadas e verificadas por HTTP; navegação de projetos e contato foi conferida no navegador. Auditoria das dependências de produção: zero vulnerabilidades conhecidas; Zod atualizado para 4.6.7. Persistem avisos moderados em ferramentas de desenvolvimento. O workflow GitHub Actions valida instalação, tipos, testes, build e saída estática; a publicação continua sendo um comando explícito, com a sessão Firebase autorizada.

## Nexus Workspace atualizado em 26/11/2026

O estudo de caso apresenta a aplicação Firebase atual: importação automática CSV/XLSX, análise por fonte, indicadores, resumo financeiro conectado às vendas e alertas de vencimento. A imagem usa dados fictícios. O link público abre a plataforma; a área de gestão exige cadastro/login. O código-fonte atual do Nexus permanece privado. A atualização não altera o site, os dados ou as regras do Nexus.
