import type { Metadata } from "next";
import { content } from "./_lib/content";
import { Navbar } from "./_components/Navbar";
import { Hero } from "./_components/Hero";
import { DemoSection } from "./_components/DemoSection";
import { ProblemSection } from "./_components/ProblemSection";
import { CreamSection } from "./_components/CreamSection";
import { FeaturesSection } from "./_components/FeaturesSection";
import { ExamplesMarquee } from "./_components/ExamplesMarquee";
import { ProcessSection } from "./_components/ProcessSection";
import { FAQSection } from "./_components/FAQSection";
import { ClosingCinematic } from "./_components/ClosingCinematic";
import { Footer } from "./_components/Footer";
import { WhatsAppFloat } from "./_components/WhatsAppFloat";

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  openGraph: {
    title: content.meta.title,
    description: content.meta.description,
    type: "website",
  },
};

export default function ToursPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <DemoSection />
      <ProblemSection />
      <CreamSection />
      <FeaturesSection />
      <ExamplesMarquee />
      <ProcessSection />
      <FAQSection />
      <ClosingCinematic />
      <Footer />
      <WhatsAppFloat />
    </main>
  );
}
