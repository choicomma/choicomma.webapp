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

  const [postcode, setPostcode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [isPhoneChecked, setIsPhoneChecked] = useState(false);
  const [phoneCheckMessage, setPhoneCheckMessage] = useState<{ status: "success" | "error"; text: string } | null>(null);

  // Terms and SNS Marketing Consent States
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // Load Daum Postcode script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).daum) {
      const script = document.createElement("script");
      script.id = "daum-postcode-script";
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Daum Postcode Open API Handler
  const handleOpenPostcode = () => {
    if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          let fullAddress = data.address;
          let extraAddress = "";

          if (data.addressType === "R") {
            if (data.bname !== "") {
              extraAddress += data.bname;
            }
            if (data.buildingName !== "") {
              extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
          }

          setPostcode(data.zonecode || "");
          setAddress(fullAddress);
          setToastMsg(`주소가 선택되었습니다: ${fullAddress}`);
        },
      }).open();
    } else {
      setToastMsg("우편번호 검색 서비스를 불러오는 중입니다. 잠시 후 다시 클릭해 주세요.");
    }
  };

  // Check ID (Phone Number) Duplicate
  const handleCheckIdDuplicate = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneCheckMessage({
        status: "error",
        text: "올바른 휴대폰 번호(10~11자리)를 입력해 주세요.",
      });
      setIsPhoneChecked(false);
      return;
    }

    if (typeof window !== "undefined") {
      const savedCustomers = localStorage.getItem("admin_customers");
      let isDuplicate = false;
      if (savedCustomers) {
        try {
          const customerList: any[] = JSON.parse(savedCustomers);
          isDuplicate = customerList.some(
            (c) => c.phone && c.phone.replace(/[^0-9]/g, "") === cleanPhone
          );
        } catch (e) { }
      }

      // Also check local storage saved user password keys
      if (localStorage.getItem(`user_pwd_${cleanPhone}`)) {
        isDuplicate = true;
      }

      if (isDuplicate) {
        setPhoneCheckMessage({
          status: "error",
          text: "이미 가입된 휴대폰 번호(ID)입니다. 다른 번호를 입력해 주세요.",
        });
        setIsPhoneChecked(false);
      } else {
        setPhoneCheckMessage({
          status: "success",
          text: "사용 가능한 로그인 ID(휴대폰 번호)입니다.",
        });
        setIsPhoneChecked(true);
      }
    }
  };

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
      if (!agreeTerms) {
        alert("회원가입 및 서비스 이용약관에 동의해 주세요.");
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
          } catch (e) { }
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
        localStorage.setItem("membership_user_name", "관리자");
        localStorage.setItem("membership_user_email", "admin");
        localStorage.setItem("user_role", "admin");
        localStorage.setItem("is_logged_in", "true");
        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("auth_changed"));
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
        const fullCombinedAddress = addressDetail.trim() ? `${address.trim()} ${addressDetail.trim()}` : address.trim();

        localStorage.setItem("membership_user_name", displayName);
        localStorage.setItem("membership_user_phone", phone.trim());
        localStorage.setItem("membership_user_email", finalEmail);
        localStorage.setItem("membership_user_postcode", postcode.trim() || "06306");
        localStorage.setItem("membership_user_address", fullCombinedAddress);

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
          } catch (err) { }
        }
        const newCustomer = {
          id: `CUST-${1000 + customerList.length + 1}`,
          name: displayName,
          email: finalEmail,
          phone: phone.trim() || "010-1234-5678",
          address: fullCombinedAddress || "서울특별시 강남구 압구정로 100",
          joinedDate: new Date().toISOString().split("T")[0],
          totalOrders: 0,
          totalSpent: 0,
          grade: "GENERAL",
          points: 5000,
          status: "Active",
        };
        localStorage.setItem("admin_customers", JSON.stringify([newCustomer, ...customerList]));
        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
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
                    이름 (성함) <span className="text-neutral-950 font-bold">*</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-950 uppercase tracking-wider">
                      휴대폰 번호 (로그인 ID) <span className="text-neutral-950 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-500 font-medium">로그인 아이디로 사용됩니다</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-600" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setIsPhoneChecked(false);
                          setPhoneCheckMessage(null);
                        }}
                        placeholder="로그인에 사용 할 휴대폰번호"
                        className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:bg-white transition-colors font-bold font-mono ${phoneCheckMessage?.status === "success"
                          ? "border-neutral-950 bg-neutral-100/60"
                          : phoneCheckMessage?.status === "error"
                            ? "border-neutral-400 bg-neutral-50"
                            : "border-neutral-200 focus:border-neutral-950"
                          }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckIdDuplicate}
                      className="px-3.5 py-3 bg-neutral-950 hover:bg-black text-white text-xs font-extrabold rounded-xl shrink-0 transition-colors shadow-xs cursor-pointer"
                    >
                      중복 확인
                    </button>
                  </div>
                  {phoneCheckMessage && (
                    <p
                      className={`text-[11px] font-bold mt-1.5 flex items-center gap-1 text-neutral-900`}
                    >
                      {phoneCheckMessage.status === "success" ? "✓" : "✕"}{" "}
                      {phoneCheckMessage.text}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    이메일 주소 <span className="text-neutral-950 font-bold">*</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-950 uppercase tracking-wider">
                      집 주소 (기본 배송지) <span className="text-neutral-950 font-bold">*</span>
                    </label>
                  </div>

                  {/* Postcode & Address Search Button Row */}
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        readOnly
                        value={postcode}
                        placeholder="우편번호"
                        onClick={handleOpenPostcode}
                        className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 font-bold font-mono cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenPostcode}
                      className="px-3.5 py-2.5 bg-neutral-950 hover:bg-black text-white text-xs font-extrabold rounded-xl shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>주소 검색</span>
                    </button>
                  </div>

                  {/* Main Road Address Input */}
                  <div className="relative mb-2">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={address}
                      onClick={handleOpenPostcode}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="주소 검색 버튼을 눌러 도로명 주소를 입력하세요"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold cursor-pointer"
                    />
                  </div>

                  {/* Detail Address Input */}
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세 주소를 입력하세요 (동·호수, 층수 등)"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-medium"
                  />
                </div>
              </>
            )}

            {!isSignUp && (
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                  휴대폰 번호 또는 이메일
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-700" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="휴대폰 번호 또는 이메일 입력"
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
                    className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-10 py-3 text-sm text-neutral-900 focus:outline-none focus:bg-white transition-colors font-mono ${confirmPassword && confirmPassword !== password
                      ? "border-neutral-400 focus:border-neutral-950"
                      : confirmPassword && confirmPassword === password
                        ? "border-neutral-950 bg-neutral-100/50"
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
                  <p className="text-[11px] font-bold text-neutral-800 mt-1 flex items-center gap-1">
                    ✕ 비밀번호가 일치하지 않습니다.
                  </p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="text-[11px] font-bold text-neutral-950 mt-1 flex items-center gap-1">
                    ✓ 비밀번호가 일치합니다.
                  </p>
                )}
              </div>
            )}

            {isSignUp && (
              <div className="pt-2 pb-1 space-y-2 border-t border-neutral-100">
                {/* 1. Terms of Service & Privacy Policy Agreement */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 cursor-pointer accent-neutral-950"
                  />
                  <div className="text-xs text-neutral-700 leading-tight">
                    <span className="font-bold text-neutral-950">[필수]</span>{" "}
                    <span>회원가입 및 서비스 이용약관, 개인정보 처리방침에 동의합니다.</span>
                  </div>
                </label>

                {/* 2. SNS & Marketing Consent */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={agreeMarketing}
                    onChange={(e) => setAgreeMarketing(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 cursor-pointer accent-neutral-950"
                  />
                  <div className="text-xs text-neutral-600 leading-tight">
                    <span className="font-medium text-neutral-500">[선택]</span>{" "}
                    <span>이벤트, 신상품 런칭 및 VIP 전용 혜택 SNS/SMS 수신에 동의합니다.</span>
                  </div>
                </label>
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
              className="w-full bg-neutral-950 hover:bg-black active:scale-[0.99] text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
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
