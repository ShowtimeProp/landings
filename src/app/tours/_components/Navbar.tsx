"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { content } from "../_lib/content";
import { site, waLink } from "../_lib/site";
import { GlassCta } from "./ui/GlassCta";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-hairline bg-ink/80 backdrop-blur-xl" : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#" className="flex items-center gap-2.5">
          <Image src={site.logo} alt="ShowtimeProp" width={32} height={32} className="rounded-full" />
          <span className="font-tours-sans text-[15px] font-semibold tracking-[-0.02em] text-white">
            ShowtimeProp
            <span className="ml-1.5 font-tours-serif italic text-gold">Tours</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {content.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium text-body transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <GlassCta href={waLink(content.whatsappFloat.mensaje)} tone="gold" className="!px-5 !py-2.5 !text-sm">
            {content.nav.cta}
          </GlassCta>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-hairline-2 text-white md:hidden"
          aria-label="Menú"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline bg-ink/95 px-5 py-5 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-4">
            {content.nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-body transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <GlassCta href={waLink(content.whatsappFloat.mensaje)} tone="gold" className="mt-2 justify-center">
              {content.nav.cta}
            </GlassCta>
          </nav>
        </div>
      )}
    </header>
  );
}
