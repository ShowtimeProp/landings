import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// PENDIENTE DE DEFINIR CON EL USUARIO (LT-002)
//
// 1. MARCAS: hoy sólo se muestra el tour de `vacacional/palacio-cosmos-p6f`,
//    cuya URL no contiene ni agencia ni persona. Los demás tours reales viven
//    en rutas como /propiedades/remax/romina-remigio/... — embeberlos revela la
//    marca aunque no se la nombre en el texto. Sumar acá los que autoricen.
//
// 2. PRECIO: `multimedia_packs` tiene "Tour Virtual 360 HDR" a $85.000, pero
//    `/api/multimedia/packs` exige autenticación y no hay endpoint público. Por
//    eso la página no muestra precio y el CTA pide presupuesto. Ver LT-003.
// ---------------------------------------------------------------------------

const WHATSAPP = "5492233544057"; // instancia stp-showtimeprop-marketing
const TOUR_DEMO =
  "https://tours.showtimeprop.com/propiedades/vacacional/palacio-cosmos-p6f/index.htm";

function waLink(texto: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

export const metadata: Metadata = {
  title: "Tours virtuales para inmobiliarias | ShowtimeProp",
  description:
    "Recorridos 360 navegables para que un interesado conozca la propiedad completa antes de pedir la visita. Producción, hosting y link listo para publicar.",
  openGraph: {
    title: "Tours virtuales para inmobiliarias | ShowtimeProp",
    description:
      "Recorridos 360 navegables para que un interesado conozca la propiedad antes de pedir la visita.",
    type: "website",
  },
};

const PASOS = [
  {
    n: "1",
    titulo: "Coordinamos la producción",
    texto:
      "Vamos a la propiedad y capturamos los ambientes en 360. Una visita, sin que tengas que preparar nada más que el acceso.",
  },
  {
    n: "2",
    titulo: "Armamos el recorrido",
    texto:
      "Unimos los ambientes en un recorrido navegable, con los puntos de paso donde tienen sentido.",
  },
  {
    n: "3",
    titulo: "Te damos el link",
    texto:
      "Queda alojado y listo para pegar en el portal, en tu ficha, en WhatsApp o en el cartel. No necesitás instalar nada.",
  },
];

const INCLUYE = [
  "Captura 360 de los ambientes que definas",
  "Recorrido navegable entre ambientes",
  "Hosting del tour y link permanente",
  "Funciona en celular, sin instalar nada",
  "Se puede publicar en portales, redes y WhatsApp",
];

const NO_INCLUYE = [
  "Retoque de decoración o home staging virtual",
  "Planos ni renders 3D de obra",
  "Fotografía de producto (va aparte, es otro servicio)",
];

export default function ToursPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pt-14 pb-10 sm:pt-20">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
          Para inmobiliarias y desarrolladoras
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
          Que el interesado recorra la propiedad
          <span className="block text-neutral-400">antes de pedir la visita.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-300 sm:text-lg">
          Un tour virtual 360 deja que cualquiera entre a la propiedad desde el celular, a
          cualquier hora y desde cualquier ciudad. Los que después piden verla en persona van
          sabiendo lo que van a encontrar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={waLink("Hola, quiero saber más sobre los tours virtuales.")}
            className="inline-flex items-center justify-center rounded-lg bg-neutral-100 px-6 py-3 text-base font-medium text-neutral-950 transition hover:bg-white"
          >
            Pedir presupuesto
          </a>
          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-6 py-3 text-base font-medium text-neutral-200 transition hover:border-neutral-500"
          >
            Ver uno funcionando
          </a>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="text-xl font-semibold sm:text-2xl">Probalo acá mismo</h2>
        <p className="mt-2 text-neutral-400">
          Es un tour real, de una propiedad publicada. Movete con el dedo o el mouse.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <iframe
            src={TOUR_DEMO}
            title="Tour virtual 360 de ejemplo"
            loading="lazy"
            allowFullScreen
            className="h-[60vh] min-h-[320px] w-full border-0"
          />
        </div>
        <p className="mt-3 text-sm text-neutral-500">
          Si no carga en tu red,{" "}
          <a
            href={TOUR_DEMO}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-neutral-300"
          >
            abrilo en una pestaña nueva
          </a>
          .
        </p>
      </section>

      {/* Problema */}
      <section className="border-t border-neutral-900 bg-neutral-900/40">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-xl font-semibold sm:text-2xl">Para qué sirve, en concreto</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="font-medium">Menos visitas que no van a ningún lado</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                El que recorre primero y aun así pide la visita, viene con una idea bastante
                clara. Se coordinan menos visitas y rinden más.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Sirve para el que está lejos</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Alguien de otra ciudad o de otro país puede conocer la propiedad completa sin
                depender de un viaje para decidir si le interesa.
              </p>
            </div>
            <div>
              <h3 className="font-medium">La propiedad se muestra sola</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                El link se pega en el portal, en la ficha, en WhatsApp o en el cartel, y queda
                disponible a cualquier hora sin que nadie tenga que atender.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-xl font-semibold sm:text-2xl">Cómo es el proceso</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {PASOS.map((p) => (
            <li key={p.n}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 text-sm text-neutral-400">
                {p.n}
              </span>
              <h3 className="mt-3 font-medium">{p.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Qué incluye */}
      <section className="border-t border-neutral-900 bg-neutral-900/40">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold">Qué incluye</h2>
              <ul className="mt-4 space-y-2">
                {INCLUYE.map((i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-neutral-300">
                    <span aria-hidden className="text-neutral-500">
                      —
                    </span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Qué no incluye</h2>
              <ul className="mt-4 space-y-2">
                {NO_INCLUYE.map((i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-neutral-400">
                    <span aria-hidden className="text-neutral-600">
                      —
                    </span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-neutral-500">
                Preferimos decirlo antes: si necesitás algo de esta segunda lista, lo hablamos
                y vemos cómo resolverlo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-2xl font-semibold sm:text-3xl">¿Lo probamos con una propiedad?</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-300">
          Contanos qué propiedad tenés en mente y te pasamos el presupuesto y los tiempos. Si
          querés, arrancamos por una sola y ves el resultado antes de decidir el resto.
        </p>
        <a
          href={waLink("Hola, quiero un presupuesto de tour virtual para una propiedad.")}
          className="mt-7 inline-flex items-center justify-center rounded-lg bg-neutral-100 px-6 py-3 text-base font-medium text-neutral-950 transition hover:bg-white"
        >
          Escribinos por WhatsApp
        </a>
      </section>

      <footer className="border-t border-neutral-900">
        <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-neutral-500">
          ShowtimeProp — tours virtuales, fotografía y CRM para inmobiliarias.
        </div>
      </footer>
    </main>
  );
}
