export const WORKANA_PROFILE =
  "https://www.workana.com/freelancer/10802ef5f9040e62df944206ccc521af";
export const GITHUB_PROFILE = "https://github.com/Jhoncstro";
export const analysisSteps = [
  "Perguntar",
  "Preparar",
  "Processar",
  "Analisar",
  "Compartilhar",
  "Agir",
];

export const services = [
  {
    title: "Organização e análise de dados",
    description:
      "Limpeza de dados, estruturação de informações e análises para perguntas de negócio bem definidas.",
    delivery: "Entrega: base organizada e explicação dos principais achados.",
    icon: "data",
  },
  {
    title: "Automação e integração de APIs",
    description: "Scripts em Python e conexão entre fontes para simplificar tarefas repetitivas.",
    delivery: "Entrega: fluxo documentado e validação com exemplos reais do seu processo.",
    icon: "automation",
  },
  {
    title: "Desenvolvimento de aplicações web",
    description:
      "Interfaces e funcionalidades com React e TypeScript, com escopo compatível com a sua necessidade.",
    delivery: "Entrega: funcionalidade testada e orientações de uso.",
    icon: "web",
  },
] as const;

export const projects = [
  {
    name: "Google Data Analytics — Capstone",
    category: "Análise de dados",
    label: "Organização de dados e raciocínio analítico",
    type: "Estudo educacional",
    visual: "data",
    description:
      "Estudo de caso educacional estruturado nas etapas Perguntar, Preparar, Processar, Analisar, Compartilhar e Agir. O foco é organizar dados e construir uma análise que responda a uma pergunta de negócio.",
    points: [
      "Organização e preparação dos dados seguindo um roteiro definido.",
      "Análise de padrões e apresentação de conclusões com visualizações e storytelling.",
      "Comunicação do processo para tornar o raciocínio analítico compreensível.",
    ],
    application:
      "Aplicável a projetos de organização de informações, análises exploratórias e relatórios para apoiar decisões.",
    note: "Projeto educacional. Não representa contratação ou vínculo com o Google. O material disponível descreve o método; não publica uma base de dados nem resultados numéricos reproduzíveis.",
    tags: ["Análise de dados", "Organização", "Storytelling"],
    source:
      "https://github.com/Jhoncstro/apresentation-jhonatas/blob/8b9100a1ced887574f6372e6924bea73ae33d5f5/src/routes/sobre.tsx",
    sourceLabel: "Consultar descrição original",
  },
  {
    name: "Nexus Workspace",
    category: "Desenvolvimento",
    label: "Gestão operacional para empresas",
    type: "Projeto próprio em desenvolvimento",
    visual: "workspace",
    description:
      "Plataforma de gestão operacional com configuração inicial por setor, porte, módulos e autonomia, acompanhamento de operações e recomendações por regras.",
    points: [
      "Smart Setup para ajustar a plataforma ao perfil e às necessidades da empresa.",
      "Motor de regras com recomendações explicáveis para revisão humana e dashboard adaptativo.",
      "Autenticação Firebase, cadastro de empresas e dados separados por empresa.",
    ],
    application:
      "Demonstra a organização de fluxos de gestão, configuração empresarial e acompanhamento de prazos e prioridades.",
    note: "Projeto próprio em desenvolvimento, com acesso público à plataforma. A autonomia disponível é manual ou assistida, sem execução automática de ações. Não é apresentado como uma solução já implantada em clientes.",
    tags: ["React", "TypeScript", "Firebase"],
    source: "https://github.com/Jhoncstro/nexo-ops-insight",
    sourceLabel: "Ver código no GitHub",
    demo: "https://project-c1bb5150-c01e-4305-9c7.web.app",
    demoLabel: "Abrir Nexus",
  },
  {
    name: "BioSensor W1",
    category: "Desenvolvimento",
    label: "Interface de demonstração",
    type: "Demonstração com dados fictícios",
    visual: "health",
    description:
      "Demonstração de interface para apresentar informações de monitoramento e acompanhamento em saúde digital.",
    points: [
      "Organização visual de informações em um painel.",
      "Exploração de componentes e navegação de uma aplicação web.",
      "Dados demonstrativos para apresentar o conceito da interface.",
    ],
    application: "Exemplo de prototipação de painéis e apresentação visual de informações.",
    note: "Demonstração de interface com dados fictícios. Não realiza monitoramento clínico real nem orienta decisões médicas.",
    tags: ["React", "Interface", "Prototipação"],
    source: "https://github.com/Jhoncstro/apresentation-jhonatas",
    sourceLabel: "Ver projeto no GitHub",
  },
] as const;
