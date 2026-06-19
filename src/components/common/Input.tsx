import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === "password";
    const inputType = isPasswordField ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-brand-primary">
            {label}
            {required && <span className="ml-1 text-red-600">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            type={inputType}
            id={inputId}
            ref={ref}
            required={required}
            className={cn(
              "flex h-12 w-full rounded-full border bg-brand-ivory/95 px-4 py-3 text-sm text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all duration-200",
              "placeholder:text-brand-muted",
              "border-brand-border/80 hover:border-brand-primary/45",
              "focus:border-brand-primary/55 focus:outline-none focus:ring-2 focus:ring-brand-gold/15",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-brand-beige",
              error && "border-red-500 hover:border-red-500 focus:border-red-500 focus:ring-red-500/20",
              isPasswordField && "pr-10",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted transition-colors hover:text-brand-primary focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-brand-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
