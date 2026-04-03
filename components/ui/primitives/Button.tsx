'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixly-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-fixly-text text-white hover:opacity-90',
        primary: 'bg-fixly-accent text-fixly-text hover:bg-fixly-accent-dark',
        secondary: 'bg-fixly-bg text-fixly-text border border-fixly-border hover:bg-fixly-border/40',
        ghost: 'text-fixly-text hover:bg-fixly-bg',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-fixly-border bg-transparent text-fixly-text hover:bg-fixly-bg',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps): JSX.Element {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
