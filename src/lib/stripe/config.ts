import { getEnvVar } from "@/lib/utils/loadEnv";

export function getStripeSecretKey(): string {
  return (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_RESTRICTED_KEY ||
    process.env.STRIPE_API_KEY ||
    getEnvVar("STRIPE_SECRET_KEY") ||
    getEnvVar("STRIPE_RESTRICTED_KEY") ||
    getEnvVar("STRIPE_API_KEY") ||
    ""
  ).trim();
}

export function getStripePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    getEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") ||
    getEnvVar("STRIPE_PUBLISHABLE_KEY") ||
    ""
  ).trim();
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}
