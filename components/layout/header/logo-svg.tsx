export function LogoSvg({ className, isScrolled }: { className?: string; isScrolled?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-start ${className || ""}`}>
      <span className="font-extrabold tracking-[0.14em] text-xl sm:text-2xl text-neutral-950 uppercase select-none transition-colors">
        CHOICOMMA
      </span>
    </div>
  );
}
