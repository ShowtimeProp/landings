import type { Metadata } from "next";
import { site } from "./_lib/site";
import { showtimeOrganization } from "@/lib/seo/organization-structured-data";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
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
  alternates: { canonical: `${site.url}/` },
  openGraph: {
    title: content.meta.title,
    description: content.meta.description,
    type: "website",
  },
};

export default function ToursPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(showtimeOrganization) }} />
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
