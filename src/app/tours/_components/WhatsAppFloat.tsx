import { MessageCircle } from "lucide-react";
import { content } from "../_lib/content";
import { waLink } from "../_lib/site";

export function WhatsAppFloat() {
  return (
    <a
      href={waLink(content.whatsappFloat.mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={content.whatsappFloat.label}
      className="glass-cta glass-cta--gold !fixed !bottom-5 !right-5 !z-40 !h-14 !w-14 !rounded-pill !p-0 sm:!bottom-7 sm:!right-7"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2} />
    </a>
  );
}
