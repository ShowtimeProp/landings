"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionItem = {
  pregunta: string;
  respuesta: string;
};

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-hairline rounded-card border border-hairline bg-surface/60">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.pregunta}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left sm:px-7"
            >
              <span className="font-tours-sans text-[15px] font-semibold text-white sm:text-base">
                {item.pregunta}
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-gold transition-transform duration-300",
                  open && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-body sm:px-7 sm:text-[15px]">
                  {item.respuesta}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
