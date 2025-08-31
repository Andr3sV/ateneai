export interface MotivationalQuote {
  text: string
  author: string
  category: 'sales' | 'persistence' | 'success' | 'mindset'
}

export const motivationalQuotes: MotivationalQuote[] = [
  // Sales & Persistence
  {
    text: "El éxito en las ventas no es cuestión de suerte, sino de persistencia y estrategia.",
    author: "Zig Ziglar",
    category: "sales"
  },
  {
    text: "Cada 'no' te acerca más al 'sí' que cambiará tu vida.",
    author: "Grant Cardone",
    category: "persistence"
  },
  {
    text: "Las ventas son números, pero las relaciones son para siempre.",
    author: "Jeffrey Gitomer",
    category: "sales"
  },
  {
    text: "No vendes un producto, vendes una solución a un problema.",
    author: "Brian Tracy",
    category: "sales"
  },
  {
    text: "El cliente no siempre tiene razón, pero siempre merece respeto.",
    author: "Harvey Mackay",
    category: "sales"
  },
  
  // Success & Mindset
  {
    text: "La diferencia entre lo imposible y lo posible está en la determinación.",
    author: "Tommy Lasorda",
    category: "mindset"
  },
  {
    text: "El fracaso es solo la oportunidad de comenzar de nuevo de manera más inteligente.",
    author: "Henry Ford",
    category: "mindset"
  },
  {
    text: "La confianza en uno mismo es el primer secreto del éxito.",
    author: "Ralph Waldo Emerson",
    category: "mindset"
  },
  {
    text: "El éxito no es final, el fracaso no es fatal: lo que cuenta es el coraje para continuar.",
    author: "Winston Churchill",
    category: "persistence"
  },
  {
    text: "La persistencia es el camino del éxito.",
    author: "Calvin Coolidge",
    category: "persistence"
  },
  
  // Daily Motivation
  {
    text: "Hoy es el primer día del resto de tu carrera de ventas.",
    author: "Anónimo",
    category: "mindset"
  },
  {
    text: "Cada llamada es una oportunidad, cada 'no' es una lección.",
    author: "Anónimo",
    category: "sales"
  },
  {
    text: "El mejor momento para vender es ahora, el mejor cliente es el que tienes enfrente.",
    author: "Anónimo",
    category: "sales"
  },
  {
    text: "La excelencia en las ventas no es un acto, es un hábito.",
    author: "Aristóteles",
    category: "mindset"
  },
  {
    text: "Tu actitud determina tu altitud en las ventas.",
    author: "Zig Ziglar",
    category: "mindset"
  },
  
  // Advanced Sales
  {
    text: "Escucha más de lo que hablas, aprende más de lo que enseñas.",
    author: "Robert T. Kiyosaki",
    category: "sales"
  },
  {
    text: "La calidad de tu vida es la calidad de tus preguntas.",
    author: "Tony Robbins",
    category: "mindset"
  },
  {
    text: "El precio es lo que pagas, el valor es lo que recibes.",
    author: "Warren Buffett",
    category: "sales"
  },
  {
    text: "La consistencia es más importante que la perfección.",
    author: "Seth Godin",
    category: "persistence"
  },
  {
    text: "El éxito en las ventas es 80% psicología y 20% técnica.",
    author: "Brian Tracy",
    category: "sales"
  },
  
  // Spanish Motivational
  {
    text: "El éxito no tiene secretos, solo trabajo duro y perseverancia.",
    author: "Anónimo",
    category: "persistence"
  },
  {
    text: "Cada día es una nueva oportunidad para superar tus límites.",
    author: "Anónimo",
    category: "mindset"
  },
  {
    text: "La confianza se construye con cada pequeña victoria.",
    author: "Anónimo",
    category: "mindset"
  },
  {
    text: "El mejor vendedor es el que más ayuda a sus clientes.",
    author: "Anónimo",
    category: "sales"
  },
  {
    text: "La persistencia convierte el fracaso en éxito.",
    author: "Anónimo",
    category: "persistence"
  }
]

export function getQuoteOfTheDay(): MotivationalQuote {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  const index = dayOfYear % motivationalQuotes.length
  return motivationalQuotes[index]
}

export function getRandomQuote(): MotivationalQuote {
  const index = Math.floor(Math.random() * motivationalQuotes.length)
  return motivationalQuotes[index]
}
