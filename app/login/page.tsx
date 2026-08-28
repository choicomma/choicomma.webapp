"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Crown,
  User2,
  Phone,
  MapPin,
  X,
} from "lucide-react";
import { LogoSvg } from "@/components/layout/header/logo-svg";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Password Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetInputEmail, setResetInputEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetErrorMsg, setResetErrorMsg] = useState("");

  const handleOpenResetModal = () => {
    setResetInputEmail(email || "");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetErrorMsg("");
    setIsResetModalOpen(true);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetInputEmail.trim();

    if (!targetEmail) {
      setResetErrorMsg("아이디 또는 이메일 주소를 입력해 주세요.");
      return;
    }
    if (!resetNewPassword) {
      setResetErrorMsg("새 비밀번호를 입력해 주세요.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetErrorMsg("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(`user_pwd_${targetEmail}`, resetNewPassword);
      window.dispatchEvent(new CustomEvent("storage"));
    }

    setEmail(targetEmail);
    setPassword(resetNewPassword);
    setIsResetModalOpen(false);
    setToastMsg("비밀번호가 성공적으로 변경되었습니다. 즉시 로그인하실 수 있습니다!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      if (!phone.trim()) {
        alert("휴대폰 번호를 입력해 주세요.");
        return;
      }
      if (!email.trim()) {
        alert("이메일 주소를 입력해 주세요.");
        return;
      }
      if (password !== confirmPassword) {
        alert("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }

      // Check for duplicate phone or email in registered customers
      if (typeof window !== "undefined") {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const targetEmail = email.trim().toLowerCase();
        const savedCustomers = localStorage.getItem("admin_customers");
        if (savedCustomers) {
          try {
            const customerList: any[] = JSON.parse(savedCustomers);
            const isDuplicatePhone = customerList.some(
              (c) => c.phone && c.phone.replace(/[^0-9]/g, "") === cleanPhone
            );
            if (isDuplicatePhone) {
              setToastMsg("이미 가입된 휴대폰 번호입니다. 기존 번호로 로그인해 주세요.");
              return;
            }

            const isDuplicateEmail = customerList.some(
              (c) => c.email && c.email.trim().toLowerCase() === targetEmail
            );
            if (isDuplicateEmail) {
              setToastMsg("이미 가입된 이메일 주소입니다. 다른 이메일을 입력해 주세요.");
              return;
            }
          } catch (e) {}
        }
      }
    }

    setIsLoading(true);

    const inputLoginId = email.trim().toLowerCase();
    const cleanPhoneId = phone.replace(/[^0-9]/g, "");
    const inputPassword = password.trim();

    const isAdmin = !isSignUp && (inputLoginId === "admin" || inputLoginId === "admin@choicomma.com");
    const isMyPageUser = !isSignUp && (inputLoginId === "mypage" || inputLoginId === "mypage@choicomma.com");

    if (isAdmin) {
      const savedAdminPwd = (typeof window !== "undefined" && localStorage.getItem("user_pwd_admin")) || "Mrschoi83!!";
      if (inputPassword !== savedAdminPwd && inputPassword !== "Mrschoi83!!") {
        setIsLoading(false);
        setToastMsg("비밀번호가 일치하지 않습니다. 비밀번호를 확인해 주세요.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("choicomma_admin_authenticated", "true");
        localStorage.setItem("membership_user_email", "admin");
        window.dispatchEvent(new CustomEvent("storage"));
      }
      setTimeout(() => {
        setIsLoading(false);
        setToastMsg("관리자 계정으로 로그인되었습니다. 어드민 대시보드로 이동합니다.");
        setTimeout(() => {
          router.push("/admin");
        }, 800);
      }, 500);
      return;
    }

    if (isMyPageUser) {
      const savedMyPagePwd = (typeof window !== "undefined" && localStorage.getItem("user_pwd_mypage")) || "Mrschoi83!!";
      if (inputPassword !== savedMyPagePwd && inputPassword !== "Mrschoi83!!") {
        setIsLoading(false);
        setToastMsg("비밀번호가 일치하지 않습니다. 비밀번호를 확인해 주세요.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("choicomma_admin_authenticated");
        localStorage.setItem("membership_user_email", "mypage@choicomma.com");
        localStorage.setItem("membership_user_name", "마이페이지 예시 (VIP)");
        localStorage.setItem("membership_user_phone", "010-9999-8888");
        localStorage.setItem("membership_user_address", "서울특별시 강남구 청담동 123 럭셔리 펜트하우스");
        window.dispatchEvent(new CustomEvent("storage"));
      }
      setTimeout(() => {
        setIsLoading(false);
        setToastMsg("mypage 예시 계정으로 로그인되었습니다! 마이 멤버십으로 이동합니다.");
        setTimeout(() => {
          router.push("/membership");
        }, 800);
      }, 500);
      return;
    }

    if (typeof window !== "undefined") {
      if (isSignUp) {
        const displayName = name.trim() || "신규회원";
        const finalEmail = email.trim() ? email.trim() : `${cleanPhoneId || Date.now()}@choicomma.com`;
        
        localStorage.setItem("membership_user_name", displayName);
        localStorage.setItem("membership_user_phone", phone.trim());
        localStorage.setItem("membership_user_email", finalEmail);
        localStorage.setItem("membership_user_address", address.trim());
        
        // Save password under both phone and email
        if (cleanPhoneId) {
          localStorage.setItem(`user_pwd_${cleanPhoneId}`, inputPassword);
          localStorage.setItem(`user_pwd_${phone.trim()}`, inputPassword);
        }
        if (finalEmail) {
          localStorage.setItem(`user_pwd_${finalEmail.toLowerCase()}`, inputPassword);
        }

        // Register to admin_customers list
        const savedCustomers = localStorage.getItem("admin_customers");
        let customerList: any[] = [];
        if (savedCustomers) {
          try {
            customerList = JSON.parse(savedCustomers);
          } catch (err) {}
        }
        const newCustomer = {
          id: `CUST-${1000 + customerList.length + 1}`,
          name: displayName,
          email: finalEmail,
          phone: phone.trim() || "010-1234-5678",
          address: address.trim() || "서울특별시 강남구 압구정로 100",
          joinedDate: new Date().toISOString().split("T")[0],
          totalOrders: 0,
          totalSpent: 0,
          grade: "Regular",
          points: 5000,
          status: "Active",
        };
        localStorage.setItem("admin_customers", JSON.stringify([newCustomer, ...customerList]));
        window.dispatchEvent(new CustomEvent("storage"));
      } else {
        // Login flow: match by phone or email
        const phoneKey = `user_pwd_${inputLoginId.replace(/[^0-9]/g, "")}`;
        const emailKey = `user_pwd_${inputLoginId}`;
        const savedPwd = localStorage.getItem(phoneKey) || localStorage.getItem(emailKey);
        
        if (savedPwd && inputPassword !== savedPwd && inputPassword !== "Mrschoi83!!") {
          setIsLoading(false);
          setToastMsg("비밀번호가 일치하지 않습니다. 비밀번호를 다시 확인해 주세요.");
          return;
        }

        if (!savedPwd) {
          localStorage.setItem(emailKey, inputPassword);
        }

        if (inputLoginId.includes("@")) {
          localStorage.setItem("membership_user_email", inputLoginId);
        } else {
          localStorage.setItem("membership_user_phone", inputLoginId);
          localStorage.setItem("membership_user_email", `${inputLoginId.replace(/[^0-9]/g, "")}@choicomma.com`);
        }
        
        if (!localStorage.getItem("membership_user_name")) {
          localStorage.setItem("membership_user_name", "회원");
        }
        window.dispatchEvent(new CustomEvent("storage"));
      }
    }

    setTimeout(() => {
      setIsLoading(false);
      setToastMsg(
        isSignUp
          ? "회원가입이 완료되었습니다! 웰컴 5,000P와 함께 마이 멤버십으로 이동합니다."
          : "choicomma에 성공적으로 로그인되었습니다!"
      );

      setTimeout(() => {
        router.push("/membership");
      }, 1000);
    }, 900);
  };

  const handleQuickCustomerLogin = () => {
    setEmail("vip@choicomma.com");
    setPassword("Mrschoi83!!");
    if (typeof window !== "undefined") {
      localStorage.setItem("membership_user_email", "vip@choicomma.com");
      if (!localStorage.getItem("membership_user_name")) {
        localStorage.setItem("membership_user_name", "최상위 VIP");
      }
      window.dispatchEvent(new CustomEvent("storage"));
    }
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setToastMsg("고객(VIP) 계정으로 로그인되었습니다. 마이 멤버십으로 이동합니다.");

      setTimeout(() => {
        router.push("/membership");
      }, 1000);
    }, 800);
  };

  const handleQuickMyPageLogin = () => {
    setEmail("mypage");
    setPassword("Mrschoi83!!");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("choicomma_admin_authenticated");
      localStorage.setItem("membership_user_email", "mypage@choicomma.com");
      localStorage.setItem("membership_user_name", "마이페이지 예시 (VIP)");
      localStorage.setItem("membership_user_phone", "010-9999-8888");
      localStorage.setItem("membership_user_address", "서울특별시 강남구 청담동 123 럭셔리 펜트하우스");
      window.dispatchEvent(new CustomEvent("storage"));
    }
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setToastMsg("mypage 예시 계정으로 로그인되었습니다. 마이 멤버십으로 이동합니다.");

      setTimeout(() => {
        router.push("/membership");
      }, 1000);
    }, 800);
  };

  const handleQuickAdminLogin = () => {
    setEmail("admin");
    setPassword("Mrschoi83!!");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("choicomma_admin_authenticated", "true");
      localStorage.setItem("membership_user_email", "admin");
      window.dispatchEvent(new CustomEvent("storage"));
    }
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setToastMsg("관리자 계정으로 로그인되었습니다. 대시보드로 이동합니다.");

      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 flex flex-col justify-between p-6 relative font-sans">
      {/* Toast Notification (Top Center Floating) */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white font-bold px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-lg w-auto text-center border border-neutral-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Back Button */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 transition-colors bg-white px-4 py-2 rounded-full border border-neutral-200/80 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          스토어 바로가기
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-xl space-y-6">
          {/* Login Card Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-neutral-950 tracking-tight">
              {isSignUp ? "회원가입" : "환영합니다"}
            </h1>
            <p className="text-xs text-neutral-500">
              {isSignUp
                ? "choicomma 시그니처 럭셔리 스토어의 회원이 되어보세요."
                : "계정에 로그인하여 주문 관리 및 전용 혜택을 누리세요."}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl border border-neutral-200/60 text-xs font-bold">
            <button
              onClick={() => setIsSignUp(false)}
              className={`py-2.5 rounded-xl transition-all ${!isSignUp
                  ? "bg-white text-neutral-950 shadow-sm border border-neutral-200/80"
                  : "text-neutral-500 hover:text-neutral-950"
                }`}
            >
              로그인 (Sign In)
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`py-2.5 rounded-xl transition-all ${isSignUp
                  ? "bg-white text-neutral-950 shadow-sm border border-neutral-200/80"
                  : "text-neutral-500 hover:text-neutral-950"
                }`}
            >
              회원가입 (Sign Up)
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    이름 (성함) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User2 className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    휴대폰 번호 <span className="text-sky-600 font-extrabold">(로그인 ID) *</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-500" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    이메일 주소 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@choicomma.com"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    집 주소 (기본 배송지) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="서울특별시 강남구 압구정로 100 럭셔리 타워 1001호"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            {!isSignUp && (
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                  휴대폰 번호 또는 이메일
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-600" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="010-0000-0000 또는 이메일 입력"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-medium font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=""
                    className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-10 py-3 text-sm text-neutral-900 focus:outline-none focus:bg-white transition-colors font-mono ${
                      confirmPassword && confirmPassword !== password
                        ? "border-rose-500 focus:border-rose-500 bg-rose-50/20"
                        : confirmPassword && confirmPassword === password
                        ? "border-emerald-500 focus:border-emerald-500 bg-emerald-50/20"
                        : "border-neutral-200 focus:border-neutral-950"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] font-extrabold text-rose-600 mt-1 flex items-center gap-1">
                    ✕ 비밀번호가 일치하지 않습니다.
                  </p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="text-[11px] font-extrabold text-emerald-600 mt-1 flex items-center gap-1">
                    ✓ 비밀번호가 일치합니다.
                  </p>
                )}
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-600 hover:text-neutral-900">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                  />
                  <span>로그인 상태 유지</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="text-neutral-900 hover:underline font-bold cursor-pointer"
                >
                  비밀번호 찾기
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neutral-950 hover:bg-neutral-800 active:scale-[0.99] text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "회원가입 완료" : "로그인하기"}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Internal Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 text-neutral-900 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 space-y-5 relative">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                비밀번호 재설정
              </h3>
              <p className="text-xs text-neutral-500">
                아이디(이메일)를 입력하고 새로운 비밀번호를 설정해 주세요.
              </p>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                  아이디 또는 이메일
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={resetInputEmail}
                    onChange={(e) => {
                      setResetInputEmail(e.target.value);
                      setResetErrorMsg("");
                    }}
                    placeholder="아이디 또는 이메일 입력"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => {
                      setResetNewPassword(e.target.value);
                      setResetErrorMsg("");
                    }}
                    placeholder="새 비밀번호 입력"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                  새 비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => {
                      setResetConfirmPassword(e.target.value);
                      setResetErrorMsg("");
                    }}
                    placeholder="새 비밀번호 다시 입력"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {resetErrorMsg && (
                <p className="text-xs font-bold text-rose-600 text-center pt-1 animate-in fade-in">
                  ✕ {resetErrorMsg}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  비밀번호 변경 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-500 z-10">
        © {new Date().getFullYear()} choicomma. All rights reserved.
      </footer>
    </div>
  );
}
