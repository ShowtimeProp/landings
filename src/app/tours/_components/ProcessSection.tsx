import { content } from "../_lib/content";

export function ProcessSection() {
  const { proceso } = content;

  return (
    <section id="proceso" className="relative bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div data-reveal className="text-center">
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {proceso.kicker}
          </p>
          <h2
            className="mx-auto mt-4 max-w-2xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.1 }}
          >
            {proceso.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{proceso.titleAccent}</span>
          </h2>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {proceso.pasos.map((paso, i) => (
            <li
              key={paso.n}
              data-reveal
              data-reveal-delay={String(i * 120)}
              className="relative rounded-card border border-hairline-2 bg-surface p-7"
            >
              <span className="font-tours-serif text-4xl italic text-gold/50">{paso.n}</span>
              <p className="mt-4 font-tours-sans text-base font-semibold text-white">{paso.titulo}</p>
              <p className="mt-2 text-sm leading-relaxed text-body">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
