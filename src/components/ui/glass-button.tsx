import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const glassButtonVariants = cva(
  'glass-button relative isolate cursor-pointer transition-all',
  {
    variants: {
      size: {
        default: 'text-base font-semibold',
        sm: 'text-sm font-semibold',
        lg: 'text-lg font-semibold',
        icon: 'h-12 w-12',
      },
      tone: {
        default: '',
        whatsapp: 'glass-button--whatsapp',
        email: 'glass-button--email',
      },
    },
    defaultVariants: {
      size: 'default',
      tone: 'default',
    },
  }
)

const glassButtonTextVariants = cva(
  'glass-button-text relative block select-none tracking-tight',
  {
    variants: {
      size: {
        default: 'px-7 py-3.5',
        sm: 'px-6 py-3',
        lg: 'px-9 py-4',
        icon: 'flex h-12 w-12 items-center justify-center',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

export interface GlassButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'href'>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string
  href?: string
  target?: string
  rel?: string
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      children,
      size,
      tone,
      contentClassName,
      href,
      target,
      rel,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classes = cn(glassButtonVariants({ size, tone }))
    const textClasses = cn(glassButtonTextVariants({ size }), contentClassName)

    const inner = (
      <>
        <span className={textClasses}>{children}</span>
      </>
    )

    return (
      <div className={cn('glass-button-wrap cursor-pointer', className)}>
        {href ? (
          <a
            className={classes}
            href={href}
            target={target}
            rel={rel}
            onClick={props.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
          >
            {inner}
          </a>
        ) : (
          <button className={classes} ref={ref} type={type} {...props}>
            {inner}
          </button>
        )}
        <div className="glass-button-shadow" aria-hidden="true" />
      </div>
    )
  }
)
GlassButton.displayName = 'GlassButton'

export { GlassButton, glassButtonVariants }
