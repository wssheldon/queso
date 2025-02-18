import * as React from 'react';
import { cn } from '@/lib/utils';

interface AuthLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, footer, className, children, ...props }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-[400px] space-y-8">
        <header className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-2xl">🧀</div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
        </header>

        <div className={cn('rounded-lg bg-[#1a1a1a] p-6', className)} {...props}>
          {children}
        </div>

        {footer && <footer className="text-center text-sm">{footer}</footer>}
      </div>
    </main>
  );
}
