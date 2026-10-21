import { cn } from "@/lib/utils";

export function LogoSvg({
  className,
  textClassName,
  isScrolled,
}: {
  className?: string;
  textClassName?: string;
  isScrolled?: boolean;
}) {
  return (
    <div className={cn("relative inline-flex items-center justify-start", className)}>
      <span
        className={cn(
          "font-extrabold tracking-[0.14em] text-xl sm:text-2xl uppercase select-none transition-colors",
          textClassName || "text-neutral-950"
        )}
      >
        CHOICOMMA
      </span>
    </div>
  );
}
