export function LogoSvg({ className, isScrolled }: { className?: string; isScrolled?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-start ${className || ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/choicomma%20logo.png"
        alt="CHOICOMMA"
        className={`w-auto h-16 sm:h-24 md:h-32 scale-125 md:scale-150 origin-left object-contain transition-all duration-300 ${
          isScrolled ? "brightness-0 invert" : "brightness-0"
        }`}
      />
    </div>
  );
}
