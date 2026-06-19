"use client";

interface AccountLoadingSpinnerProps {
  message: string;
}

export function AccountLoadingSpinner({ message }: AccountLoadingSpinnerProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary" />
        <p className="text-brand-muted">{message}</p>
      </div>
    </div>
  );
}
