'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary focus-visible:ring-primary-600/30',
  cta: 'bg-cta-500 hover:bg-cta-600 text-white shadow-cta focus-visible:ring-cta-500/30',
  secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white focus-visible:ring-secondary-600/30',
  danger: 'bg-danger-600 hover:bg-danger-700 text-white focus-visible:ring-danger-600/30',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus-visible:ring-gray-300',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700 shadow-sm focus-visible:ring-gray-300',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ease-premium',
        'hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98]',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
