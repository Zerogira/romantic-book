export type PageData = {
  id: string;
  chapter: string;
  title: string;
  text: string;
  note?: string;
  image?: string;
  imageAlt?: string;
  layout: "intro" | "photo" | "quote" | "timeline" | "letter";
};

export const bookPages: PageData[] = [
  {
    id: "dedicatoria",
    chapter: "ANTES DE COMEÇAR",
    title: "Para você,",
    text: "Se eu pudesse escolher novamente, escolheria viver tudo outra vez. Cada sorriso, cada descoberta e cada pequeno momento que nos trouxe até aqui.",
    note: "Com carinho, para a pessoa que faz meus dias mais bonitos.",
    layout: "intro",
  },
  {
    id: "comeco",
    chapter: "CAPÍTULO 01",
    title: "Onde tudo começou",
    text: "Toda história tem um começo. E a nossa começou de um jeito que eu nunca imaginaria que se tornaria tão especial.",
    note: "Aqui entra a lembrança de como nos conhecemos.",
    image: "/images/memories/primeiro-encontro.jpg",
    imageAlt: "Espaço reservado para uma foto do começo da história",
    layout: "photo",
  },
  {
    id: "memorias",
    chapter: "CAPÍTULO 02",
    title: "Nossas memórias",
    text: "São tantos momentos que seria impossível colocar todos em um único livro. Mas alguns deles merecem ficar guardados para sempre.",
    note: "Em breve: nossas fotos favoritas.",
    image: "/images/memories/memoria-especial.jpg",
    imageAlt: "Espaço reservado para uma memória especial",
    layout: "photo",
  },
  {
    id: "trajetoria",
    chapter: "CAPÍTULO 03",
    title: "Um ano de nós",
    text: "Um ano pode parecer pouco tempo, mas olha quanta coisa já vivemos juntos.",
    note: "Adicione aqui datas, viagens, conquistas e momentos marcantes.",
    layout: "timeline",
  },
  {
    id: "detalhes",
    chapter: "CAPÍTULO 04",
    title: "O que faz ser nosso",
    text: "Nem tudo que é especial precisa ser grandioso. Muitas vezes, são justamente as pequenas coisas que fazem tudo valer a pena.",
    note: "As manias, as brincadeiras, os olhares e as piadas que só a gente entende.",
    layout: "quote",
  },
  {
    id: "carta",
    chapter: "COM TODO MEU AMOR",
    title: "Uma carta para você",
    text: "Se existe algo que eu quero que você saiba, é o quanto sou feliz por ter você na minha vida. Obrigado por dividir seus dias comigo, por cada abraço, cada conversa e cada plano.",
    note: "Este espaço é seu: depois vamos transformar esta página em uma carta escrita com suas próprias palavras.",
    layout: "letter",
  },
];

export const bookTitle = "365 dias de nós";