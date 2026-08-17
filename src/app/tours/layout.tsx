import { Schibsted_Grotesk, Playfair_Display } from "next/font/google";
import { RevealObserver } from "./_components/ui/RevealObserver";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-schibsted",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["italic"],
  variable: "--font-playfair",
  display: "swap",
});

export default function ToursLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`tours-scope ${schibsted.variable} ${playfair.variable} font-tours-sans bg-ink text-white`}>
      <RevealObserver />
      {children}
    </div>
  );
}
