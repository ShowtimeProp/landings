'use client'

import { QRCode } from '@/components/ui/qr-code'
import { cn } from '@/lib/utils'

type ContactQrCardProps = {
  value: string
  href?: string
  /** Default: "Guarda My Contacto" */
  label?: string
  size?: number
  className?: string
  isLight?: boolean
}

export function ContactQrCard({
  value,
  href,
  label = 'Guarda My Contacto',
  size = 144,
  className,
  isLight = true,
}: ContactQrCardProps) {
  if (!value) return null

  return (
    <a
      href={href || value}
      target="_blank"
      rel="noreferrer"
      title={label}
      className={cn(
        'group inline-flex flex-col items-center rounded-2xl border p-3 transition',
        isLight
          ? 'border-cyan-300/80 bg-cyan-50/90 hover:border-cyan-400 hover:bg-cyan-100'
          : 'border-cyan-300/35 bg-cyan-400/10 hover:border-cyan-300/65 hover:bg-cyan-300/15',
        className
      )}
    >
      <QRCode
        value={value}
        size={size}
        fgColor="#0a0a0a"
        bgColor="#ffffff"
        errorCorrectionLevel="M"
        className="rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
      />
      <span
        className={cn(
          'mt-2.5 max-w-[11rem] text-center text-xs font-semibold tracking-[0.1em]',
          isLight ? 'text-cyan-800' : 'text-cyan-200'
        )}
      >
        {label}
      </span>
    </a>
  )
}
