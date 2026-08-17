import { content } from "../_lib/content";
import { Accordion } from "./ui/Accordion";

export function FAQSection() {
  const { faq } = content;

  return (
    <section id="preguntas" className="relative bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <div data-reveal className="text-center">
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {faq.kicker}
          </p>
          <h2
            className="mx-auto mt-4 max-w-xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 44px)", lineHeight: 1.1 }}
          >
            {faq.title} <span className="font-tours-serif italic text-gold-gradient">{faq.titleAccent}</span>
          </h2>
        </div>

        <div data-reveal data-reveal-delay="120" className="mt-10">
          <Accordion items={faq.items} />
        </div>
      </div>
    </section>
  );
}
