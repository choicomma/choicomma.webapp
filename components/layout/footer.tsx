import Link from "next/link";
import { FooterLegalLinks } from "./footer-legal-modals";
import { Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-black text-white px-4 md:px-12 py-10 md:py-16 flex flex-col font-sans uppercase tracking-widest text-[10px] leading-relaxed mt-auto text-left border-t border-neutral-900">
      {/* Top Section: Huge Brand Text Logo (Left aligned) */}
      <div className="flex flex-col items-start justify-start text-left mb-8 md:mb-12">
        <h1 className="text-4xl sm:text-6xl md:text-[120px] lg:text-[140px] font-normal leading-none tracking-normal text-left">CHOICOMMA</h1>
      </div>

      {/* Under Logo Section: Business Info & Email Subscription (Left aligned) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mb-10 md:mb-14 border-t border-white/15 pt-8 text-left text-xs sm:text-[13px] leading-relaxed text-neutral-300 tracking-normal">
        {/* Left: Business Info 1 */}
        <div className="flex flex-col gap-2 text-left font-normal">
          <span>상호명: 주식회사 초이콤마</span>
          <span>대표자: 최고은</span>
          <span>사업자등록번호: 710-88-03854</span>
          <span>통신판매업신고번호: 제2024-서울강남-00998호</span>
        </div>

        {/* Center: Business Info 2 */}
        <div className="flex flex-col gap-2 text-left font-normal">
          <span>사업장주소: 서울 강남구 개포로22길 12 510 BD / 6F</span>
          <span>연락처: 02 579 1171</span>
          <span>대표자 이메일: info@choicomma.co.kr</span>
        </div>

        {/* Right: Email Subscription */}
        <div className="flex justify-start items-start text-left pt-1">
          <div className="flex items-center border-b border-white/60 pb-1.5 w-full md:w-64">
            <input
              type="email"
              placeholder="EMAIL SUBSCRIPTION"
              suppressHydrationWarning
              className="bg-transparent outline-none border-none w-full text-xs placeholder:text-neutral-400 uppercase tracking-wider text-left text-white"
            />
            <button aria-label="Subscribe" className="hover:opacity-70 transition-opacity text-sm font-bold text-white pl-2 cursor-pointer">
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section (Legal Links placed at the bottom alongside copyright) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] sm:text-[11px] text-neutral-400 pt-5 border-t border-white/10 text-left">
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          <span className="text-left font-normal">CHOICOMMA {new Date().getFullYear()}© — ALL RIGHTS RESERVED</span>
          <div className="flex gap-4 text-[10px] sm:text-[11px]">
            <FooterLegalLinks />
          </div>
        </div>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="hover:opacity-70 transition-opacity"
        >
          <Instagram className="w-4 h-4" />
        </a>
      </div>
    </footer>
  );
}
