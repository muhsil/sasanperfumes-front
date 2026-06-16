import Image from "next/image";
import { cn } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import { siteConfig } from "@/config/site";

interface AuthBackgroundProps {
  children: React.ReactNode;
  className?: string;
  showImage?: boolean;
}

export function AuthBackground({ children, className, showImage = true }: AuthBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", showImage && "bg-brand-beige", className)}>
      {showImage && (
        <Image
          src={siteConfig.authBackgroundImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          unoptimized={shouldUseUnoptimizedImage(siteConfig.authBackgroundImage)}
        />
      )}
      <div className="relative z-10 flex w-full justify-center">
        {children}
      </div>
    </div>
  );
}
