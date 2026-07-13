import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, checked, ...props }, ref) => {
    const inputId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-start gap-3",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            type="radio"
            id={inputId}
            ref={ref}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200",
              "border-brand-border bg-brand-ivory",
              "peer-checked:border-brand-primary",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/30 peer-focus-visible:ring-offset-2",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            )}
          >
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full bg-brand-primary transition-all duration-200",
                checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-foreground">{label}</span>
            )}
            {description && (
              <span className="text-xs text-brand-muted">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = "Radio";

export { Radio };
