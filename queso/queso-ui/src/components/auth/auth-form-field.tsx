import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface AuthFormFieldProps extends React.ComponentPropsWithoutRef<typeof Input> {
  label: string;
  error?: string;
}

export function AuthFormField({ label, error, ...props }: AuthFormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-white">{label}</label>
      <Input
        className={cn(
          'h-12 bg-[#141414] text-white placeholder:text-gray-500',
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
