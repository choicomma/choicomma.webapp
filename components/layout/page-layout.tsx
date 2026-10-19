import { Footer } from "./footer";

export const PageLayout = ({ children, className, hideFooter }: { children: React.ReactNode, className?: string, hideFooter?: boolean }) => {
  return (
    <div className={className}>
      <main>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};
