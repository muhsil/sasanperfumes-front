import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "new" | "special" | "bestseller";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "border border-brand-border bg-brand-beige text-brand-primary",
    success: "bg-green-50 text-green-700 border border-green-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    error: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    new: "border border-brand-gold bg-brand-gold/10 text-brand-primary",
    special: "bg-brand-primary text-white border border-brand-primary",
    bestseller: "bg-brand-primary text-white border border-brand-primary",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-tight transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
