import { content } from "../_lib/content";

export function ProofSection() {
  const { prueba } = content;

  return (
    <section className="relative bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div data-reveal className="text-center">
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {prueba.kicker}
          </p>
          <h2
            className="mx-auto mt-4 max-w-2xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.1 }}
          >
            {prueba.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{prueba.titleAccent}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body">{prueba.body}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {prueba.items.map((item, i) => (
            <article
              key={item.titulo}
              data-reveal
              data-reveal-delay={String(i * 90)}
              className="rounded-card border border-hairline-2 bg-surface p-6 sm:p-7"
            >
              <p className="font-tours-sans text-4xl font-semibold tracking-[-0.04em] text-gold">{item.valor}</p>
              <p className="mt-3 font-tours-sans text-base font-semibold text-white">{item.titulo}</p>
              <p className="mt-2 text-sm leading-relaxed text-body">{item.texto}</p>
            </article>
          ))}
        </div>

        <p data-reveal className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-tours">
          {prueba.fuentes}{" "}
          {prueba.fuentesLinks.map((link, i) => (
            <span key={link.href}>
              {i > 0 ? " · " : ""}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline-offset-4 hover:underline"
              >
                {link.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
