import Image from "next/image";
import { content } from "../_lib/content";
import { site } from "../_lib/site";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-ink py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <Image src={site.logo} alt="ShowtimeProp" width={26} height={26} className="rounded-full" />
          <span className="font-tours-sans text-sm font-semibold text-white">ShowtimeProp</span>
        </div>
        <p className="text-sm text-muted-tours">{content.footer.tagline}</p>
      </div>
    </footer>
  );
}
