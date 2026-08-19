export function LogoSvg({ className }: { className?: string }) {
  return (
    <svg
      width="280"
      height="48"
      viewBox="0 0 280 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="36"
        fill="currentColor"
        fontSize="36"
        fontWeight="400"
        letterSpacing="-1.5"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        CHOICOMMA
      </text>
    </svg>
  );
}
