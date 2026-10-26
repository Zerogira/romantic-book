export type PageData = {
  id: string;
  chapter: string;
  title: string;
  text: string;
  note?: string;
  image?: string;
  imageAlt?: string;
  layout: "intro" | "photo" | "collage" | "timeline" | "details" | "letter" | "closure";
  detailsList?: { label: string; value: string }[];
  timelineItems?: { date: string; title: string; description: string }[];
};

export const bookPages: PageData[] = [
  {
    id: "dedicatoria",
    chapter: "02. ANTES DE COMEÇAR",
    title: "A dedicatória",
    text: "Se eu pudesse escolher novamente, escolheria viver tudo outra vez. Cada sorriso, cada descoberta e cada pequeno momento que nos trouxe até aqui.",
    note: "Com todo o meu amor, para a pessoa que transformou a minha vida.",
    layout: "intro",
  },
  {
    id: "comeco",
    chapter: "03. NOSSO INÍCIO",
    title: "Onde tudo começou",
    text: "Toda história tem um começo. E a nossa começou de um jeito que eu nunca imaginaria que se tornaria tão especial.",
    note: "O primeiro olhar, a primeira conversa e a certeza de que algo único estava começando.",
    image: "/images/memories/primeiro-encontro.jpg",
    imageAlt: "Primeiro registro de onde tudo começou",
    layout: "photo",
  },
  {
    id: "memorias",
    chapter: "04. REGISTROS DE AMOR",
    title: "Nossas memórias",
    text: "São tantos momentos que seria impossível colocar todos em um único livro.",
    note: "Fotografias, viagens, risadas espontâneas e pequenos instantes que guardo no peito.",
    image: "/images/memories/memoria-especial.jpg",
    imageAlt: "Colagem de memórias especiais",
    layout: "collage",
  },
  {
    id: "trajetoria",
    chapter: "05. NOSSO CAMINHO",
    title: "Nossa trajetória",
    text: "Um ano pode parecer pouco tempo, mas olha quanta coisa já vivemos juntos.",
    note: "365 dias de cumplicidade, aprendizado e planos construídos a dois.",
    layout: "timeline",
    timelineItems: [
      { date: "Mês 01", title: "O primeiro capítulo", description: "O início da nossa história e as primeiras borboletas no estômago." },
      { date: "Mês 04", title: "Momentos inesquecíveis", description: "Viagens, descobertas e passeios que marcaram o nosso caminho." },
      { date: "Mês 08", title: "Crescendo juntos", description: "Superando dias difíceis e celebrando cada vitória lado a lado." },
      { date: "365 dias", title: "Hoje e sempre", description: "Um ano inteiro de amor, e o sentimento de que estamos só no começo." },
    ],
  },
  {
    id: "detalhes",
    chapter: "06. O QUE É SÓ NOSSO",
    title: "Os pequenos detalhes",
    text: "Nem tudo que é especial precisa ser grandioso. Muitas vezes, são justamente as pequenas coisas que fazem tudo valer a pena.",
    note: "São os detalhes invisíveis para o mundo que tornam a nossa história perfeita.",
    layout: "details",
    detailsList: [
      { label: "Nossas manias", value: "Aquele abraço apertado ao acordar e as mensagens de bom dia que alegram a rotina." },
      { label: "Piadas internas", value: "Frases e risadas que só a gente entende, em qualquer lugar que estejamos." },
      { label: "Seu jeito único", value: "O brilho nos olhos quando fala sobre o que ama e o carinho em cada gesto." },
      { label: "Nossa trilha sonora", value: "Aquelas canções que sempre tocam quando estamos juntos no carro ou em casa." },
    ],
  },
  {
    id: "carta",
    chapter: "07. COM TODA A MINHA ALMA",
    title: "Uma carta para você",
    text: "Se existe algo que eu quero que você saiba, é o quanto sou feliz por ter você na minha vida. Obrigado por dividir seus dias comigo, pela paciência, pelo apoio incondicional e por ser o meu porto seguro em qualquer momento.",
    note: "Você é a minha melhor escolha todos os dias.",
    layout: "letter",
  },
  {
    id: "capitulos",
    chapter: "08. O FUTURO",
    title: "Ainda temos muitos capítulos",
    text: "Esse foi apenas o primeiro capítulo. Ainda quero escrever muitos outros ao seu lado.",
    note: "Toque no coração abaixo para ver uma mensagem especial...",
    layout: "closure",
  },
];

export const bookCoverInfo = {
  kicker: "NOSSO PRIMEIRO CAPÍTULO",
  title: "365 dias de nós",
  subtitle: "Uma pequena história sobre duas pessoas que escolheram caminhar juntas.",
  dateText: "1º Ano de Aniversário • 365 Dias de Amor",
};