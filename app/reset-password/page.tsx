"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";

function validateComplexity(pwd: string) {
  const hasMinLength = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
    isValid: hasMinLength && hasLetter && hasNumber && hasSpecial,
  };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenErrorMsg, setTokenErrorMsg] = useState("");
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    email: string;
    maskedEmail: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. 토큰 유효성 검증
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenValid(false);
      setTokenErrorMsg("비밀번호 재설정 링크의 토큰이 누락되었습니다. 이메일 링크를 다시 확인해 주세요.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.valid) {
          setTokenValid(true);
          setCustomerInfo({
            name: json.name || "회원",
            email: json.email || "",
            maskedEmail: json.maskedEmail || json.email || "",
          });
        } else {
          setTokenValid(false);
          setTokenErrorMsg(json.message || "유효하지 않거나 만료된 링크입니다.");
        }
      } catch (err) {
        setTokenValid(false);
        setTokenErrorMsg("토큰 확인 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [token]);

  // 2. 비밀번호 재설정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const complexity = validateComplexity(newPassword);
    if (!complexity.isValid) {
      setSubmitError("새 비밀번호는 영문, 숫자, 특수문자를 모두 포함하여 8자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error || "비밀번호 변경에 실패했습니다. 다시 시도해 주세요.");
        setSubmitting(false);
        return;
      }

      // 로컬 스토리지에 새 비밀번호 동기화 (클라이언트 캐시 갱신)
      if (typeof window !== "undefined" && customerInfo?.email) {
        localStorage.setItem(`user_pwd_${customerInfo.email.toLowerCase()}`, newPassword);
        if (json.loginIdentifier) {
          localStorage.setItem(`user_pwd_${json.loginIdentifier.toLowerCase()}`, newPassword);
        }
        window.dispatchEvent(new CustomEvent("storage"));
      }

      setIsSuccess(true);
    } catch (err) {
      setSubmitError("서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const complexity = validateComplexity(newPassword);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full">
        {/* 상단 브랜딩 */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 hover:opacity-80 transition-opacity"
          >
            CHOICOMMA
          </Link>
          <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">
            Contemporary Minimalist Fashion
          </p>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-200/80 relative">
          {/* 로딩 상태 */}
          {isVerifying ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-neutral-600">
                비밀번호 재설정 링크를 확인하고 있습니다...
              </p>
            </div>
          ) : isSuccess ? (
            /* 성공 화면 */
            <div className="py-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  비밀번호 변경 완료
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  비밀번호가 성공적으로 변경되었습니다.<br />
                  새로운 비밀번호로 로그인해 주세요.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full py-4 bg-neutral-950 hover:bg-black text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>로그인하러 가기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : !tokenValid ? (
            /* 토큰 에러 화면 */
            <div className="py-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border-2 border-rose-200">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  링크가 만료되었거나 유효하지 않습니다
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed px-2">
                  {tokenErrorMsg}
                </p>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 text-left text-xs text-neutral-500 space-y-1.5 border border-neutral-200/80">
                <p className="font-bold text-neutral-800">💡 안내</p>
                <p>• 비밀번호 재설정 링크는 발송 후 <strong>1시간</strong> 동안만 유효합니다.</p>
                <p>• 이미 비밀번호를 변경하셨다면 해당 링크는 다시 사용하실 수 없습니다.</p>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  href="/login"
                  className="w-full py-3.5 bg-neutral-950 hover:bg-black text-white font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span>비밀번호 찾기 다시 시도하기</span>
                </Link>
                <Link
                  href="/"
                  className="inline-block text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors pt-2"
                >
                  홈으로 돌아가기
                </Link>
              </div>
            </div>
          ) : (
            /* 비밀번호 입력 폼 */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  새 비밀번호 설정
                </h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  <strong className="text-neutral-900 font-bold">{customerInfo?.name}</strong> 회원님(
                  {customerInfo?.maskedEmail})의 새로운 비밀번호를 설정해 주세요.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* 새 비밀번호 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      새 비밀번호 <span className="text-neutral-950">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      영문+숫자+특수문자 8자 이상
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setSubmitError("");
                      }}
                      placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* 비밀번호 복잡도 체크 뱃지 */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                        complexity.hasMinLength
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <span>{complexity.hasMinLength ? "✓" : "•"}</span>
                      <span>8자 이상</span>
                    </div>
                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                        complexity.hasLetter
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <span>{complexity.hasLetter ? "✓" : "•"}</span>
                      <span>영문 포함</span>
                    </div>
                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                        complexity.hasNumber
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <span>{complexity.hasNumber ? "✓" : "•"}</span>
                      <span>숫자 포함</span>
                    </div>
                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                        complexity.hasSpecial
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <span>{complexity.hasSpecial ? "✓" : "•"}</span>
                      <span>특수문자 포함</span>
                    </div>
                  </div>
                </div>

                {/* 새 비밀번호 확인 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      새 비밀번호 확인 <span className="text-neutral-950">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      동일한 비밀번호 재입력
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setSubmitError("");
                      }}
                      placeholder="새 비밀번호를 한 번 더 입력해 주세요"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p
                      className={`text-[11px] font-bold mt-1.5 pl-1 flex items-center gap-1 ${
                        newPassword === confirmPassword
                          ? "text-emerald-700"
                          : "text-rose-600"
                      }`}
                    >
                      <span>{newPassword === confirmPassword ? "✓" : "✕"}</span>
                      <span>
                        {newPassword === confirmPassword
                          ? "비밀번호가 일치합니다."
                          : "비밀번호가 일치하지 않습니다."}
                      </span>
                    </p>
                  )}
                </div>

                {/* 에러 메시지 배너 */}
                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-center animate-in fade-in">
                    ✕ {submitError}
                  </div>
                )}

                {/* 변경 완료 버튼 */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !complexity.isValid || newPassword !== confirmPassword}
                    className="w-full py-4 bg-neutral-950 hover:bg-black text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>비밀번호 변경 완료</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>로그인 페이지로 돌아가기</span>
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="w-10 h-10 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
