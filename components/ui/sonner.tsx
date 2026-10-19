'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-blue-600 group-[.toaster]:text-white group-[.toaster]:border-blue-400/40 group-[.toaster]:shadow-lg group-[.toaster]:shadow-blue-900/20 text-xs py-1.5 px-3.5 rounded-full font-semibold',
          description: 'group-[.toast]:text-blue-100 text-[11px]',
          actionButton:
            'group-[.toast]:bg-blue-800 group-[.toast]:text-white text-xs',
          cancelButton:
            'group-[.toast]:bg-blue-700 group-[.toast]:text-white text-xs',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
