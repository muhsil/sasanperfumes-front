"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/common/Button";

interface AccountAuthGuardProps {
  locale: string;
  icon: LucideIcon;
  notLoggedInText: string;
  loginText: string;
  children: React.ReactNode;
}

function AuthLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="mb-6 h-7 w-44 rounded bg-brand-beige" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-brand-border/70 bg-brand-ivory" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NotAuthenticatedState({
  locale,
  icon: Icon,
  notLoggedInText,
  loginText,
}: {
  locale: string;
  icon: LucideIcon;
  notLoggedInText: string;
  loginText: string;
}) {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="mx-auto max-w-md rounded-lg border border-brand-border/70 bg-brand-ivory p-6 text-center shadow-[0_18px_44px_rgba(20,15,10,0.08)]">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-brand-border/70 bg-white">
            <Icon className="h-7 w-7 text-brand-primary" />
          </div>
        </div>
        <p className="mb-6 text-sm leading-6 text-brand-muted">{notLoggedInText}</p>
        <Button asChild variant="primary" size="lg" className="w-full rounded-md shadow-none hover:translate-y-0">
          <Link href={`/${locale}/login`}>{loginText}</Link>
        </Button>
      </div>
    </div>
  );
}

export function AccountAuthGuard({
  locale,
  icon,
  notLoggedInText,
  loginText,
  children,
}: AccountAuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <NotAuthenticatedState
        locale={locale}
        icon={icon}
        notLoggedInText={notLoggedInText}
        loginText={loginText}
      />
    );
  }

  return <div className="account-shell">{children}</div>;
}
