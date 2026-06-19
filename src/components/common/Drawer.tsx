"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: "left" | "right";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  title?: string;
  titleIcon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  overlayClassName?: string;
  dir?: "ltr" | "rtl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
};

export function Drawer({
  isOpen,
  onClose,
  position = "right",
  size = "md",
  title,
  titleIcon,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  overlayClassName,
  dir = "ltr",
}: DrawerProps) {
  const isRTL = dir === "rtl";
  const effectivePosition = isRTL ? (position === "right" ? "left" : "right") : position;

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscapeKey]);

  const getTransformClass = () => {
    if (isOpen) return "translate-x-0";
    return effectivePosition === "left" ? "-translate-x-full" : "translate-x-full";
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-brand-dark-brown/48 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
          overlayClassName
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed top-0 z-50 h-full w-full border-brand-border/70 bg-brand-ivory shadow-[0_28px_70px_rgba(20,15,10,0.22)] transition-transform duration-300 ease-in-out",
          sizeClasses[size],
          effectivePosition === "left" ? "left-0 border-r" : "right-0 border-l",
          getTransformClass(),
          className
        )}
        dir={dir}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
      >
        <div className="flex h-full flex-col">
          {(title || showCloseButton) && (
            <div
              className={cn(
                "flex items-center justify-between border-b border-brand-border/70 bg-brand-beige/55 px-4 py-4",
                headerClassName
              )}
            >
              <div className="flex items-center gap-2">
                {titleIcon}
                {title && (
                  <h2 id="drawer-title" className="font-title text-xl text-brand-primary">
                    {title}
                  </h2>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="rounded-full border border-brand-border/60 bg-brand-ivory p-2 text-brand-muted transition-colors hover:border-brand-primary/35 hover:bg-brand-primary hover:text-white"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          <div className={cn("flex-1 overflow-y-auto", bodyClassName)}>
            {children}
          </div>

          {footer && (
            <div className={cn("border-t border-brand-border/70 bg-brand-beige/40 p-5", footerClassName)}>{footer}</div>
          )}
        </div>
      </div>
    </>
  );
}

export interface DrawerHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DrawerHeader({ children, className }: DrawerHeaderProps) {
  return (
    <div className={cn("border-b border-brand-border/70 bg-brand-beige/45 p-5", className)}>
      {children}
    </div>
  );
}

export interface DrawerBodyProps {
  children: ReactNode;
  className?: string;
}

export function DrawerBody({ children, className }: DrawerBodyProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-5", className)}>
      {children}
    </div>
  );
}

export interface DrawerFooterProps {
  children: ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return (
    <div className={cn("border-t border-brand-border/70 bg-brand-beige/40 p-5", className)}>
      {children}
    </div>
  );
}
