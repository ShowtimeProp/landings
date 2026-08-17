import { X, Check } from "lucide-react";
import { content } from "../_lib/content";

export function ProblemSection() {
  const { problem } = content;

  return (
    <section className="relative bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div data-reveal className="text-center">
          <h2
            className="mx-auto max-w-2xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.1 }}
          >
            {problem.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{problem.titleAccent}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body">{problem.body}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <div
            data-reveal
            className="rounded-card border border-red-500/25 bg-surface/60 p-6 sm:p-8"
          >
            <p className="font-tours-sans text-sm font-semibold text-red-400">{problem.sin.label}</p>
            <ul className="mt-5 space-y-4">
              {problem.sin.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/80" />
                  <span className="text-sm leading-relaxed text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            data-reveal
            data-reveal-delay="120"
            className="relative overflow-hidden rounded-card border border-gold/35 bg-surface/60 p-6 shadow-[0_0_50px_rgba(245,197,24,0.08)] sm:p-8"
          >
            <div className="gold-glow -right-10 -top-10 h-52 w-52" />
            <p className="relative font-tours-sans text-sm font-semibold text-gold">{problem.con.label}</p>
            <ul className="relative mt-5 space-y-4">
              {problem.con.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-sm leading-relaxed text-white/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
