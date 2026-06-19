import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-2 block text-sm font-semibold text-brand-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "flex h-12 w-full appearance-none rounded-full border bg-brand-ivory/95 px-4 py-3 pr-11 text-sm text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all duration-200",
              "border-brand-border/80 hover:border-brand-primary/45",
              "focus:border-brand-primary/55 focus:outline-none focus:ring-2 focus:ring-brand-gold/15",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-brand-beige",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
