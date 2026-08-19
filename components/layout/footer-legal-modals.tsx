"use client";

import { useState } from "react";
import { X, Shield, FileText } from "lucide-react";

export function FooterLegalLinks() {
  const [activeModal, setActiveModal] = useState<"terms" | "privacy" | null>(null);

  return (
    <>
      <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-neutral-400">
        <button
          onClick={() => setActiveModal("terms")}
          className="hover:text-white transition-colors cursor-pointer underline"
        >
          이용약관
        </button>
        <span className="text-white/20">|</span>
        <button
          onClick={() => setActiveModal("privacy")}
          className="hover:text-white transition-colors cursor-pointer underline"
        >
          개인정보처리방침
        </button>
      </div>

      {/* Modal Dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 text-neutral-900 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-neutral-200">
              <div className="p-2.5 bg-neutral-950 text-white rounded-2xl">
                {activeModal === "terms" ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-neutral-950">
                  {activeModal === "terms" ? "choicomma 이용약관" : "개인정보처리방침"}
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  {activeModal === "terms"
                    ? "choicomma 시그니처 스토어 이용 규정 및 조건 안내"
                    : "회원님의 개인정보 수집, 이용 및 보호 규정 안내"}
                </p>
              </div>
            </div>

            {/* Scrollable Document Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-xs md:text-sm text-neutral-700 leading-relaxed font-sans">
              {activeModal === "terms" ? (
                <>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">제 1 조 (목적)</h4>
                    <p>
                      본 약관은 choicomma(이하 "회사")가 제공하는 인터넷 쇼핑몰 서비스 및 관련 제반 서비스의 이용 조건과 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">제 2 조 (정의)</h4>
                    <p>
                      1. "몰"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.<br />
                      2. "이용자"란 "몰"에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">제 3 조 (서비스의 제공 및 변경)</h4>
                    <p>
                      회사는 재화 또는 용역에 대한 정보 제공 및 구매계약의 체결, 구매계약이 체결된 재화 또는 용역의 배송 및 기타 회사가 정하는 업무를 수행합니다.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">제 4 조 (청약철회 및 환불)</h4>
                    <p>
                      회사와 재화등의 구매에 관한 계약을 체결한 이용자는 수령한 날로부터 7일 이내에 청약의 철회를 할 수 있으며, 회사는 제품 확인 후 즉시 환불 절차를 진행합니다.
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">1. 개인정보의 수집 및 이용 목적</h4>
                    <p>
                      choicomma는 회원가입, 상품 주문 및 배송, 고객 상담 및 전용 VIP 멤버십 서비스 제공을 위해 최소한의 개인정보를 수집하고 있습니다.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">2. 수집하는 개인정보 항목</h4>
                    <p>
                      - 필수 항목: 성함, 휴대폰 번호, 기본 배송지 주소, 로그인 비밀번호<br />
                      - 서비스 이용 과정에서 생성되는 정보: 구매 및 결제 내역, 접속 IP, 쿠키, 서비스 이용 기록
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">3. 개인정보의 보유 및 이용 기간</h4>
                    <p>
                      회원 탈퇴 요청 시 수집된 개인정보는 즉시 파기됩니다. 단, 관련 법령(전자상거래 등에서의 소비자보호에 관한 법률 등)의 규정에 의하여 보존할 필요가 있는 경우 지정된 기간 동안 보관합니다.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h4 className="font-extrabold text-neutral-950 text-base">4. 개인정보의 제3자 제공 및 파기</h4>
                    <p>
                      회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않으며, 목적이 달성된 개인정보는 복구 불가능한 방법으로 파기합니다.
                    </p>
                  </section>
                </>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
