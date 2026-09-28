/**
 * Precios públicos de tours (definidos y confirmados por el dueño el 28-sep-2026). Sólo el
 * tramo más económico: arriba de 50 m² se cotiza. Todo en USD + IVA.
 * Es la única fuente: la FAQ, el Markdown para agentes y el JSON-LD salen de acá.
 */
export const pricing = {
  currency: "USD",
  ivaNota: "Valores en dólares, más IVA.",
  tourBase: { price: 40, maxM2: 50 },
  tourAereo: { price: 85, maxM2: 50 },
  hosting: { mesesSinCargo: 3, mensual: 3.5, anual: 35, mesesDeRegaloAnual: 2 },
  bonusCrm: { minTours: 10 },
} as const;

export function usd(value: number): string {
  return `USD ${value.toLocaleString("es-AR", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2 })}`;
}

const precioTour =
  `Un tour virtual 360 de una propiedad de hasta ${pricing.tourBase.maxM2} m² cuesta ${usd(pricing.tourBase.price)} + IVA, ` +
  `o ${usd(pricing.tourAereo.price)} + IVA si incluye tomas aéreas 360 con drone.`;
const precioHosting =
  `Los primeros ${pricing.hosting.mesesSinCargo} meses de hosting de cada tour son sin cargo. Después, ` +
  `${usd(pricing.hosting.mensual)} por tour por mes, o ${usd(pricing.hosting.anual)} por tour por año ` +
  `(pagando el año, ${pricing.hosting.mesesDeRegaloAnual} meses te quedan de regalo). Más IVA.`;
const bonusCrm =
  `Con ${pricing.bonusCrm.minTours} tours virtuales o más tenés acceso al plan básico del CRM de ShowtimeProp sin costo adicional y sin el cargo de puesta en marcha.`;

export const content = {
  meta: {
    title: "Tours Virtuales 360 para inmobiliarias y comercios | ShowtimeProp",
    description:
      "Tours virtuales 360 para inmobiliarias y comercios en Mar del Plata. Desde USD 40 + IVA, con 3 meses de hosting sin cargo y link listo para publicar.",
  },

  nav: {
    links: [
      { href: "#demo", label: "Ver un tour" },
      { href: "#clientes", label: "Clientes" },
      { href: "#proceso", label: "Cómo funciona" },
      { href: "#preguntas", label: "Preguntas" },
    ],
    cta: "Pedir presupuesto",
  },

  hero: {
    kicker: "Producción + hosting, listo para publicar",
    titleTop: "Que conozcan el lugar",
    titleAccent: "antes de pisarlo.",
    body: "Un tour virtual 360 deja que cualquiera entre al lugar desde el celular, a cualquier hora y desde cualquier ciudad. Los que después piden ir en persona van sabiendo lo que van a encontrar.",
    ctaPrimary: "Pedir presupuesto",
    ctaSecondary: "Ver uno funcionando",
    features: [
      "Captura 360 en una sola visita",
      "Recorrido navegable entre ambientes",
      "3 meses de hosting sin cargo",
      "Funciona en celular, sin instalar nada",
      "Listo para portales, redes y WhatsApp",
      "Se actualiza cuando cambia el lugar",
    ],
  },

  demo: {
    kicker: "Probalo acá mismo",
    title: "Es un tour real,",
    titleAccent: "de un lugar publicado.",
    body: "Movete con el dedo o el mouse. Así es exactamente lo que va a ver un interesado antes de escribirte.",
    fallback: "Si no carga en tu red,",
    fallbackLink: "abrilo en una pestaña nueva",
    muteNote: "El audio arranca recién cuando tocás el tour, nunca solo.",
  },

  problem: {
    title: "Menos vueltas,",
    titleAccent: "más interesados con criterio.",
    body: "El tour no reemplaza la visita — la hace rendir. El que recorre primero y aun así pide ir, viene con una idea clara de lo que quiere.",
    sin: {
      label: "Sin tour virtual",
      items: [
        "Cada consulta necesita una visita para recién ahí descartar el lugar",
        "El interesado de otra ciudad depende de fotos sueltas para decidir",
        "El cartel y el link del portal no muestran nada más que texto y fotos",
        "Atender cada visita te come la agenda, incluso las que no van a ningún lado",
      ],
    },
    con: {
      label: "Con tour virtual",
      items: [
        "El que pide visita ya conoció el lugar completo y viene decidido",
        "Cualquiera, desde donde esté, recorre el lugar como si estuviera ahí",
        "El link se pega en el portal, la ficha, WhatsApp o el cartel",
        "Se coordinan menos visitas y las que se hacen, rinden más",
      ],
    },
  },

  cream: {
    kicker: "Así se ve del otro lado",
    title: "Un link.",
    titleAccent: "Eso es todo lo que necesitás compartir.",
    body: "Nada de instalar apps ni pedir turno para una videollamada. El interesado toca el link y ya está adentro, moviéndose por su cuenta.",
    points: [
      "Se abre en cualquier celular o computadora, sin fricción",
      "Navegación entre ambientes con hotspots claros",
      "Queda alojado con nosotros, con link permanente",
    ],
  },

  features: {
    kicker: "Qué lleva el servicio",
    title: "Lo que incluye",
    titleAccent: "y lo que no.",
    incluye: {
      label: "Incluye",
      icon: "Check" as const,
      items: [
        {
          titulo: "Captura 360",
          resumen: "De los ambientes que definas.",
          detalle:
            "Vamos al lugar y capturamos cada ambiente en 360, en una sola visita. No hace falta que prepares nada más que el acceso.",
        },
        {
          titulo: "Recorrido navegable",
          resumen: "Ambientes conectados con lógica.",
          detalle:
            "Unimos las capturas en un recorrido con puntos de paso donde tienen sentido, para que se entienda la circulación real del lugar.",
        },
        {
          titulo: "Hosting y link",
          resumen: "3 meses sin cargo, link fijo.",
          detalle:
            "El tour queda alojado en nuestra infraestructura con un link fijo, listo para pegar en cualquier lado. " +
            precioHosting,
        },
        {
          titulo: "Funciona en cualquier lado",
          resumen: "Celular, tablet o PC.",
          detalle:
            "Sin instalar nada. El interesado toca el link que le compartiste y entra directo, desde el dispositivo que tenga a mano.",
        },
      ],
    },
    noIncluye: {
      label: "No incluye",
      items: [
        "Retoque de decoración o home staging virtual",
        "Planos ni renders 3D de obra",
        "Fotografía de producto (va aparte, es otro servicio)",
      ],
      nota: "Preferimos decirlo antes: si necesitás algo de esta lista, lo hablamos y vemos cómo resolverlo.",
    },
  },

  proceso: {
    kicker: "Cómo es el proceso",
    title: "Tres pasos,",
    titleAccent: "sin vueltas.",
    pasos: [
      {
        n: "01",
        titulo: "Coordinamos la producción",
        texto:
          "Vamos al lugar y capturamos los ambientes en 360. Una visita, sin que tengas que preparar nada más que el acceso.",
      },
      {
        n: "02",
        titulo: "Armamos el recorrido",
        texto:
          "Unimos los ambientes en un recorrido navegable, con los puntos de paso donde tienen sentido.",
      },
      {
        n: "03",
        titulo: "Te damos el link",
        texto:
          "Queda alojado y listo para pegar en el portal, en tu ficha, en WhatsApp o en el cartel. No necesitás instalar nada.",
      },
    ],
  },

  clientes: {
    kicker: "Ya lo usan",
    title: "Inmobiliarias y comercios",
    titleAccent: "que ya recorren distinto.",
    body: "Desde gimnasios hasta inmuebles en venta y alquiler temporario. Tocá una tarjeta para entrar al tour real.",
    ctaCategoria: "Ver tour",
    ctaMultiple: "Elegir propiedad",
  },

  faq: {
    kicker: "Antes de escribirnos",
    title: "Preguntas",
    titleAccent: "frecuentes.",
    items: [
      {
        pregunta: "¿Cuánto tarda la producción?",
        respuesta:
          "La captura en el lugar se hace en una sola visita. Después de eso, el armado del recorrido y la publicación del link tardan unos días — te confirmamos el plazo exacto cuando coordinamos según la cantidad de ambientes.",
      },
      {
        pregunta: "¿Qué necesito preparar antes de la visita?",
        respuesta:
          "Poco: que el lugar esté ordenado y con buena luz, y darnos acceso en el horario acordado. Del resto nos encargamos nosotros.",
      },
      {
        pregunta: "¿El tour funciona en cualquier celular?",
        respuesta:
          "Sí. No hace falta instalar nada — se abre directo desde el navegador, tanto en celular como en computadora.",
      },
      {
        pregunta: "¿Puedo pedir un tour para varios ambientes o sucursales?",
        respuesta:
          "Sí, se arma según la cantidad de ambientes o unidades que necesites. Contanos el caso por WhatsApp y te pasamos el presupuesto puntual.",
      },
      {
        pregunta: "¿Cuánto cuesta?",
        respuesta:
          precioTour +
          " Para superficies mayores o varias unidades, el valor depende de los metros: escribinos con el caso y te pasamos un presupuesto concreto, sin vueltas.",
      },
      {
        pregunta: "¿Cuánto cuesta el hosting?",
        respuesta: precioHosting,
      },
      {
        pregunta: "¿Hay beneficios si hago varios tours?",
        respuesta: bonusCrm,
      },
      {
        pregunta: "¿El link vence en algún momento?",
        respuesta:
          "No, el link queda fijo mientras el hosting esté activo (los primeros 3 meses van sin cargo). Si el lugar cambia, se puede actualizar la producción.",
      },
    ],
  },

  closing: {
    kicker: "¿Lo probamos con un lugar tuyo?",
    title: "Arrancá",
    titleAccent: "con uno solo.",
    body: "Contanos qué propiedad o local tenés en mente y te pasamos presupuesto y tiempos. Si querés, empezás por uno solo y ves el resultado antes de decidir el resto.",
    stat: { value: 11, suffix: "+", label: "tours ya publicados" },
    ctaPrimary: "Escribinos por WhatsApp",
  },

  footer: {
    tagline: "Tours virtuales, fotografía y CRM para inmobiliarias y comercios.",
  },

  whatsappFloat: {
    label: "WhatsApp",
    mensaje: "Hola, quiero saber más sobre los tours virtuales.",
  },
};
