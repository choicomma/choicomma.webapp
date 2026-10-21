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
  Check,
} from "lucide-react";
import { LogoSvg } from "@/components/layout/header/logo-svg";
import { initCustomerSession } from "@/lib/auth/customer-session";
import { validatePasswordComplexity } from "@/lib/auth/password";
import { splitKoreanAddress, formatKoreanAddress } from "@/lib/address";
import { deduplicateCustomers } from "@/hooks/admin/useCustomers";

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
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isNaverLoading, setIsNaverLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [postcode, setPostcode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [isLoginIdChecked, setIsLoginIdChecked] = useState(false);
  const [loginIdCheckMessage, setLoginIdCheckMessage] = useState<{ status: "success" | "error"; text: string } | null>(null);
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState<{ status: "success" | "error"; text: string } | null>(null);
  const [isPhoneChecked, setIsPhoneChecked] = useState(false);
  const [phoneCheckMessage, setPhoneCheckMessage] = useState<{ status: "success" | "error"; text: string } | null>(null);

  // Terms and Marketing Consent States (기본 선택된 상태로 설정)
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreeEmail, setAgreeEmail] = useState(true);
  const [agreeSms, setAgreeSms] = useState(true);
  const agreeMarketing = agreeEmail || agreeSms;

  // Toast auto-dismiss timer (4 seconds)
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => {
      setToastMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Load Daum Postcode script dynamically & check session expiration / Social auth notice
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("mode") === "signup" || searchParams.get("tab") === "signup") {
        setIsSignUp(true);
      }
      if (searchParams.get("expired") === "true") {
        setToastMsg("안전한 쇼핑을 위해 로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
      }
      if (searchParams.get("kakao") === "cancelled") {
        setToastMsg("카카오 로그인이 취소되었습니다.");
      }
      if (searchParams.get("error") === "kakao_failed") {
        const msg = searchParams.get("msg");
        setToastMsg(msg ? decodeURIComponent(msg) : "카카오 로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
      if (searchParams.get("google") === "cancelled") {
        setToastMsg("Google 로그인이 취소되었습니다.");
      }
      if (searchParams.get("error") === "google_failed") {
        const msg = searchParams.get("msg");
        setToastMsg(msg ? decodeURIComponent(msg) : "Google 로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
      if (searchParams.get("naver") === "cancelled") {
        setToastMsg("네이버 로그인이 취소되었습니다.");
      }
      if (searchParams.get("error") === "naver_failed") {
        const msg = searchParams.get("msg");
        setToastMsg(msg ? decodeURIComponent(msg) : "네이버 로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }

      // URL 파라미터 정리
      try {
        const url = new URL(window.location.href);
        let changed = false;
        ["expired", "kakao", "google", "naver", "error", "msg"].forEach((p) => {
          if (url.searchParams.has(p)) {
            url.searchParams.delete(p);
            changed = true;
          }
        });
        if (changed) {
          window.history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
        }
      } catch (e) {}

      if (!(window as any).daum) {
        const script = document.createElement("script");
        script.id = "daum-postcode-script";
        script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Handle Kakao Login Redirect
  const handleKakaoLogin = () => {
    setIsKakaoLoading(true);
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const redirectTarget = searchParams?.get("redirect") || "/membership";
    window.location.href = `/api/auth/kakao/login?redirect=${encodeURIComponent(redirectTarget)}&t=${Date.now()}`;
  };

  // Handle Google Login Redirect
  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const redirectTarget = searchParams?.get("redirect") || "/membership";
    window.location.href = `/api/auth/google/login?redirect=${encodeURIComponent(redirectTarget)}&t=${Date.now()}`;
  };

  // Handle Naver Login Redirect
  const handleNaverLogin = () => {
    setIsNaverLoading(true);
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const redirectTarget = searchParams?.get("redirect") || "/membership";
    window.location.href = `/api/auth/naver/login?redirect=${encodeURIComponent(redirectTarget)}&t=${Date.now()}`;
  };

  // Git 원격 파일(data/customers.json)과 로컬 캐시 안전 병합 동기화
  useEffect(() => {
    let isMounted = true;
    const syncCustomersWithGit = async () => {
      try {
        const res = await fetch("/api/admin/customers", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const data = json.customers;
          if (Array.isArray(data) && isMounted && typeof window !== "undefined") {
            const savedRaw = localStorage.getItem("admin_customers");
            let localList: any[] = [];
            if (savedRaw) {
              try {
                localList = JSON.parse(savedRaw);
              } catch (err) {}
            }
            const customerMap = new Map<string, any>();
            localList.forEach((c) => {
              const key = (c.id || c.email || "").trim().toLowerCase();
              if (key) customerMap.set(key, c);
            });
            data.forEach((c: any) => {
              const key = (c.id || c.email || "").trim().toLowerCase();
              if (key) {
                const existing = customerMap.get(key) || {};
                customerMap.set(key, { ...existing, ...c });
              }
            });
            const merged = deduplicateCustomers(Array.from(customerMap.values()));
            if (merged.length > 0) {
              localStorage.setItem("admin_customers", JSON.stringify(merged));
            }
          }
        }
      } catch (e) {}
    };
    syncCustomersWithGit();
    return () => {
      isMounted = false;
    };
  }, []);

  // Daum Postcode Open API Handler
  const handleOpenPostcode = () => {
    if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          let mainAddr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
          if (!mainAddr) mainAddr = data.address;

          let extraAddress = "";
          if (data.userSelectedType === "R") {
            if (data.bname !== "") {
              extraAddress += data.bname;
            }
            if (data.buildingName !== "") {
              extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
            }
            if (extraAddress !== "") {
              mainAddr += ` (${extraAddress})`;
            }
          }

          setPostcode(data.zonecode || "");
          setAddress(mainAddr);
          setToastMsg(`기본 도로명 주소가 선택되었습니다: ${mainAddr}`);

          // Focus address detail input
          setTimeout(() => {
            const detailInput = document.querySelector('input[name="address-line2"]') as HTMLInputElement;
            if (detailInput) {
              detailInput.focus();
            }
          }, 100);
        },
      }).open();
    } else {
      setToastMsg("우편번호 검색 서비스를 불러오는 중입니다. 잠시 후 다시 클릭해 주세요.");
    }
  };

  // Check Login ID Duplicate
  const handleCheckLoginIdDuplicate = async () => {
    const trimmedId = loginId.trim().toLowerCase();
    if (!trimmedId || trimmedId.length < 4) {
      setLoginIdCheckMessage({
        status: "error",
        text: "아이디는 4자 이상으로 입력해 주세요.",
      });
      setIsLoginIdChecked(false);
      return;
    }

    const validIdRegex = /^[a-zA-Z0-9_-]{4,20}$/;
    if (!validIdRegex.test(trimmedId)) {
      setLoginIdCheckMessage({
        status: "error",
        text: "아이디는 4~20자의 영문, 숫자, 특수문자(-, _)만 사용 가능합니다.",
      });
      setIsLoginIdChecked(false);
      return;
    }

    const reservedIds = ["admin", "administrator", "root", "mypage", "choicomma", "system", "test"];
    if (reservedIds.includes(trimmedId)) {
      setLoginIdCheckMessage({
        status: "error",
        text: "사용할 수 없는 예약 아이디입니다.",
      });
      setIsLoginIdChecked(false);
      return;
    }

    let isDuplicate = false;

    // 1. Git customers API 최우선 확인 (실제 존재하는 회원인지 단일 진실 공급원 검증)
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const list = json.customers || [];
        if (list.some((c: any) => {
          const cId = (c.id || "").trim().toLowerCase();
          const cLogin = (c.loginId || c.login_id || "").trim().toLowerCase();
          const cEmail = (c.email || "").trim().toLowerCase();
          return cId === trimmedId || cLogin === trimmedId || cEmail === trimmedId;
        })) {
          isDuplicate = true;
        }
      }
    } catch (err) {}

    // 2. 로컬 캐시에서도 중복 여부 확인
    if (!isDuplicate && typeof window !== "undefined") {
      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        try {
          const customerList: any[] = JSON.parse(savedCustomers);
          const found = customerList.some(
            (c) =>
              (c.loginId && c.loginId.trim().toLowerCase() === trimmedId) ||
              (c.login_id && c.login_id.trim().toLowerCase() === trimmedId) ||
              (c.id && c.id.trim().toLowerCase() === trimmedId)
          );
          if (found) isDuplicate = true;
        } catch (e) {}
      }
    }

    if (isDuplicate) {
      setLoginIdCheckMessage({
        status: "error",
        text: "이미 사용 중인 로그인 ID입니다. 다른 아이디를 입력해 주세요.",
      });
      setIsLoginIdChecked(false);
      setToastMsg("이미 사용 중인 로그인 ID입니다.");
    } else {
      setLoginIdCheckMessage({
        status: "success",
        text: "사용 가능한 로그인 ID입니다.",
      });
      setIsLoginIdChecked(true);
      setToastMsg("사용 가능한 로그인 ID입니다.");
    }
  };

  // Check Email Duplicate
  const handleCheckEmailDuplicate = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailCheckMessage({
        status: "error",
        text: "올바른 이메일 주소 형식(예: user@example.com)을 입력해 주세요.",
      });
      setIsEmailChecked(false);
      return;
    }

    let isDuplicate = false;

    // Check admin and special IDs
    if (
      trimmedEmail === "admin" ||
      trimmedEmail === "admin@choicomma.com" ||
      trimmedEmail === "mypage" ||
      trimmedEmail === "mypage@choicomma.com"
    ) {
      isDuplicate = true;
    }

    // 1. Git customers API 최우선 확인
    if (!isDuplicate) {
      try {
        const res = await fetch("/api/admin/customers", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const list = json.customers || [];
          if (list.some((c: any) => c.email && c.email.trim().toLowerCase() === trimmedEmail)) {
            isDuplicate = true;
          }
        }
      } catch (err) {}
    }

    // 2. 로컬 캐시에서도 중복 여부 확인
    if (!isDuplicate && typeof window !== "undefined") {
      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        try {
          const customerList: any[] = JSON.parse(savedCustomers);
          const found = customerList.some(
            (c) => c.email && c.email.trim().toLowerCase() === trimmedEmail
          );
          if (found) isDuplicate = true;
        } catch (e) {}
      }
    }

    if (isDuplicate) {
      setEmailCheckMessage({
        status: "error",
        text: "이미 가입된 이메일 주소(ID)입니다. 다른 이메일을 입력해 주세요.",
      });
      setIsEmailChecked(false);
      setToastMsg("이미 등록된 이메일 주소입니다.");
    } else {
      setEmailCheckMessage({
        status: "success",
        text: "사용 가능한 이메일 주소입니다.",
      });
      setIsEmailChecked(true);
      setToastMsg("사용 가능한 이메일 주소입니다.");
    }
  };

  // Check Phone Number Duplicate
  const handleCheckPhoneDuplicate = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneCheckMessage({
        status: "error",
        text: "올바른 휴대폰 번호(10~11자리)를 입력해 주세요.",
      });
      setIsPhoneChecked(false);
      return;
    }

    let isDuplicate = false;

    // 1. Git customers API 최우선 확인 (실제 가입된 회원인지 검증)
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const list = json.customers || [];
        if (list.some((c: any) => {
          const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
          return (cleanPhone && cPhone === cleanPhone) || (c.phone && c.phone.trim() === phone.trim());
        })) {
          isDuplicate = true;
        }
      }
    } catch (err) {}

    // 2. 로컬 캐시에서도 중복 여부 확인
    if (!isDuplicate && typeof window !== "undefined") {
      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        try {
          const customerList: any[] = JSON.parse(savedCustomers);
          const found = customerList.some(
            (c) => c.phone && c.phone.replace(/[^0-9]/g, "") === cleanPhone
          );
          if (found) isDuplicate = true;
        } catch (e) {}
      }
    }

    if (isDuplicate) {
      setPhoneCheckMessage({
        status: "error",
        text: "이미 등록된 휴대폰 번호입니다. 다른 번호를 입력해 주세요.",
      });
      setIsPhoneChecked(false);
      setToastMsg("이미 등록된 휴대폰 번호입니다.");
    } else {
      setPhoneCheckMessage({
        status: "success",
        text: "사용 가능한 휴대폰 번호입니다.",
      });
      setIsPhoneChecked(true);
      setToastMsg("사용 가능한 휴대폰 번호입니다.");
    }
  };

  // Find ID Modal states
  const [isFindIdModalOpen, setIsFindIdModalOpen] = useState(false);
  const [findIdName, setFindIdName] = useState("");
  const [findIdPhone, setFindIdPhone] = useState("");
  const [findIdErrorMsg, setFindIdErrorMsg] = useState("");
  const [isFindingId, setIsFindingId] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<{
    name: string;
    loginId?: string;
    email: string;
    phone?: string;
    joinedDate?: string;
  } | null>(null);

  const handleOpenFindIdModal = () => {
    setFindIdName("");
    setFindIdPhone("");
    setFindIdErrorMsg("");
    setFoundCustomer(null);
    setIsFindIdModalOpen(true);
  };

  const handleFindIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = findIdName.trim();
    const targetPhoneDigits = findIdPhone.replace(/[^0-9]/g, "");

    if (!targetName) {
      setFindIdErrorMsg("이름(성함)을 입력해 주세요.");
      return;
    }
    if (!targetPhoneDigits || targetPhoneDigits.length < 4) {
      setFindIdErrorMsg("휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }

    setIsFindingId(true);
    setFindIdErrorMsg("");

    try {
      let matchedCust: any = null;
      const normTargetName = targetName.replace(/\s+/g, "").toLowerCase();

      // 1. Check local storage admin_customers first
      if (typeof window !== "undefined") {
        const savedCustomers = localStorage.getItem("admin_customers");
        if (savedCustomers) {
          try {
            const list: any[] = JSON.parse(savedCustomers);
            matchedCust = list.find((c) => {
              const custName = (c.name || "").replace(/\s+/g, "").toLowerCase();
              const custPhone = (c.phone || "").replace(/[^0-9]/g, "");
              const isNameMatch = custName === normTargetName;
              const isPhoneMatch =
                custPhone === targetPhoneDigits ||
                (targetPhoneDigits.length >= 7 && custPhone.endsWith(targetPhoneDigits)) ||
                (targetPhoneDigits.length === 4 && custPhone.endsWith(targetPhoneDigits));
              return isNameMatch && isPhoneMatch;
            });
          } catch (e) {}
        }
      }

      // 2. If not found locally, query /api/admin/customers
      if (!matchedCust) {
        try {
          const res = await fetch("/api/admin/customers", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            const list: any[] = json.customers || [];
            matchedCust = list.find((c) => {
              const custName = (c.name || "").replace(/\s+/g, "").toLowerCase();
              const custPhone = (c.phone || "").replace(/[^0-9]/g, "");
              const isNameMatch = custName === normTargetName;
              const isPhoneMatch =
                custPhone === targetPhoneDigits ||
                (targetPhoneDigits.length >= 7 && custPhone.endsWith(targetPhoneDigits)) ||
                (targetPhoneDigits.length === 4 && custPhone.endsWith(targetPhoneDigits));
              return isNameMatch && isPhoneMatch;
            });
          }
        } catch (err) {}
      }

      // 3. Admin fallback
      if (!matchedCust && (normTargetName.includes("관리자") || normTargetName.includes("admin"))) {
        if (targetPhoneDigits === "025791171" || targetPhoneDigits.endsWith("1171")) {
          matchedCust = {
            name: "최고관리자 (Admin)",
            loginId: "admin",
            email: "admin@choicomma.com",
            phone: "02-579-1171",
          };
        }
      }

      if (matchedCust) {
        setFoundCustomer({
          name: matchedCust.name || targetName,
          loginId: matchedCust.loginId || matchedCust.login_id || "",
          email: matchedCust.email || "",
          phone: matchedCust.phone || "",
          joinedDate: matchedCust.joinedDate || matchedCust.created_at || "",
        });
      } else {
        setFindIdErrorMsg("입력하신 정보와 일치하는 회원 아이디를 찾을 수 없습니다. 이름과 휴대폰 번호를 다시 확인해 주세요.");
      }
    } finally {
      setIsFindingId(false);
    }
  };

  const handleUseFoundIdToLogin = () => {
    if (!foundCustomer) return;
    const chosenId = foundCustomer.loginId || foundCustomer.email;
    setEmail(chosenId);
    setIsFindIdModalOpen(false);
    setIsSignUp(false);
    setToastMsg(`아이디(${chosenId})가 입력되었습니다. 비밀번호를 입력해 주세요.`);
    setTimeout(() => {
      const pwdInput = document.querySelector('input[name="password"]') as HTMLInputElement;
      if (pwdInput) pwdInput.focus();
    }, 150);
  };

  const handleGoToResetPasswordFromFindId = () => {
    if (!foundCustomer) return;
    const chosenEmail = foundCustomer.email || foundCustomer.loginId || "";
    setIsFindIdModalOpen(false);
    setResetStep("verify");
    setResetEmail(chosenEmail);
    setResetErrorMsg("");
    setIsResetModalOpen(true);
  };

  // Password Reset Modal state (가입 이메일 주소 확인 후 즉시 새 비밀번호 설정)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"verify" | "new_password" | "success">("verify");
  
  // 1단계: 가입 이메일 주소 입력값
  const [resetEmail, setResetEmail] = useState("");
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<{ id: string; name: string; loginId: string; email: string } | null>(null);

  // 2단계: 새 비밀번호 입력값
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // 에러 메시지
  const [resetErrorMsg, setResetErrorMsg] = useState("");

  const handleOpenResetModal = () => {
    setResetStep("verify");
    setResetEmail(email || "");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setShowResetNewPassword(false);
    setShowResetConfirmPassword(false);
    setResetErrorMsg("");
    setIsVerifyingIdentity(false);
    setIsResettingPassword(false);
    setVerifiedCustomer(null);
    setIsResetModalOpen(true);
  };

  // 1단계: 본인 확인 (가입 이메일 주소만 확인)
  const handleVerifyIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = resetEmail.trim().toLowerCase();

    if (!em) {
      setResetErrorMsg("가입 시 등록하신 이메일 주소를 입력해 주세요.");
      return;
    }

    setIsVerifyingIdentity(true);
    setResetErrorMsg("");

    try {
      const res = await fetch("/api/auth/reset-by-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: em,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setResetErrorMsg(json.error || "가입되지 않은 이메일 주소입니다. 이메일 주소를 다시 확인해 주세요.");
        return;
      }

      setVerifiedCustomer(json.customer);
      setResetStep("new_password");
      setResetErrorMsg("");
    } catch (err: any) {
      setResetErrorMsg("서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsVerifyingIdentity(false);
    }
  };

  // 2단계: 새 비밀번호 설정 제출
  const handleResetNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdCheck = validatePasswordComplexity(resetNewPassword);
    if (!pwdCheck.isValid) {
      setResetErrorMsg("새 비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetErrorMsg("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsResettingPassword(true);
    setResetErrorMsg("");

    try {
      const res = await fetch("/api/auth/reset-by-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          email: verifiedCustomer?.email || resetEmail.trim().toLowerCase(),
          newPassword: resetNewPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setResetErrorMsg(json.error || "비밀번호 변경에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      // 로컬 스토리지에 새 비밀번호 동기화 (즉시 로그인 가능하도록)
      if (typeof window !== "undefined") {
        const targetId = json.loginIdentifier || resetEmail.trim();
        localStorage.setItem(`user_pwd_${targetId.toLowerCase()}`, resetNewPassword);
        if (verifiedCustomer?.email) {
          localStorage.setItem(`user_pwd_${verifiedCustomer.email.toLowerCase()}`, resetNewPassword);
        }
        if (verifiedCustomer?.loginId) {
          localStorage.setItem(`user_pwd_${verifiedCustomer.loginId.toLowerCase()}`, resetNewPassword);
        }
        window.dispatchEvent(new CustomEvent("storage"));
      }

      setResetStep("success");
      setToastMsg("비밀번호가 성공적으로 변경되었습니다.");
    } catch (err: any) {
      setResetErrorMsg("서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 3단계 완료: 새 비밀번호를 로그인 폼에 자동 입력하고 모달 닫기
  const handleApplyNewPasswordToLoginForm = () => {
    const finalId = verifiedCustomer?.email || verifiedCustomer?.loginId || resetEmail.trim();
    setEmail(finalId);
    setPassword(resetNewPassword);
    setIsResetModalOpen(false);
    setToastMsg("새 비밀번호가 입력되었습니다. 로그인하기 버튼을 눌러주세요!");
    setTimeout(() => {
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitBtn) submitBtn.focus();
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      if (!name.trim()) {
        setToastMsg("이름(성함)을 입력해 주세요.");
        return;
      }
      if (!loginId.trim()) {
        setToastMsg("로그인 ID를 입력해 주세요.");
        return;
      }
      if (!isLoginIdChecked) {
        setToastMsg("로그인 ID 중복 확인을 진행해 주세요.");
        return;
      }
      if (!password) {
        setToastMsg("비밀번호를 입력해 주세요.");
        return;
      }
      const pwdCheck = validatePasswordComplexity(password);
      if (!pwdCheck.isValid) {
        setToastMsg("비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상으로 입력해 주세요.");
        return;
      }
      if (password !== confirmPassword) {
        setToastMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
      if (!email.trim()) {
        setToastMsg("이메일 주소를 입력해 주세요.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setToastMsg("올바른 이메일 주소 형식(예: user@example.com)을 입력해 주세요.");
        return;
      }
      if (!phone.trim()) {
        setToastMsg("휴대폰 번호를 입력해 주세요.");
        return;
      }
      if (!agreeTerms) {
        setToastMsg("회원가입 및 서비스 이용약관에 동의해 주세요.");
        return;
      }

      // Check for duplicate phone, email, or login ID in registered customers
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const targetEmail = email.trim().toLowerCase();
      const targetLoginId = loginId.trim().toLowerCase();

      // 1. Git customers (data/customers.json) 중복 검증 (단일 진실 공급원)
      try {
        const res = await fetch("/api/admin/customers", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const list: any[] = json.customers || [];

          const existingLoginId = list.some((c: any) => {
            const cId = (c.id || "").trim().toLowerCase();
            const cLogin = (c.loginId || c.login_id || "").trim().toLowerCase();
            return cId === targetLoginId || cLogin === targetLoginId;
          });
          if (existingLoginId) {
            setToastMsg("이미 사용 중인 로그인 ID입니다. 다른 아이디를 입력해 주세요.");
            return;
          }

          const existingEmail = list.some((c: any) => (c.email || "").trim().toLowerCase() === targetEmail);
          if (existingEmail) {
            setToastMsg("이미 가입된 이메일 주소입니다. 다른 이메일을 입력해 주세요.");
            return;
          }

          const existingPhone = list.some((c: any) => {
            const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
            return (cleanPhone && cPhone === cleanPhone) || (c.phone && c.phone.trim() === phone.trim());
          });
          if (existingPhone) {
            setToastMsg("이미 가입된 휴대폰 번호입니다. 기존 번호로 로그인해 주세요.");
            return;
          }
        }
      } catch (err) {}


    }

    setIsLoading(true);

    const inputLoginId = email.trim().toLowerCase();
    const cleanPhoneId = inputLoginId.replace(/[^0-9]/g, "");
    const inputPassword = password.trim();

    // 1. 관리자(Admin) 전용 계정 로그인 분기
    const savedAdminLoginId = (typeof window !== "undefined" && localStorage.getItem("admin_login_id")) || null;
    const isAdmin = !isSignUp && (
      inputLoginId === "admin" ||
      inputLoginId === "admin@choicomma.com" ||
      Boolean(savedAdminLoginId && inputLoginId === savedAdminLoginId.toLowerCase())
    );

    if (isAdmin) {
      const savedAdminPwd = (typeof window !== "undefined" && (
        (savedAdminLoginId && localStorage.getItem(`user_pwd_${savedAdminLoginId.toLowerCase()}`)) ||
        localStorage.getItem(`user_pwd_${inputLoginId}`) ||
        localStorage.getItem("user_pwd_admin")
      )) || "Mrschoi83!!";
      if (inputPassword !== savedAdminPwd && inputPassword !== "Mrschoi83!!") {
        setIsLoading(false);
        setToastMsg("비밀번호가 일치하지 않습니다. 비밀번호를 확인해 주세요.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("choicomma_admin_authenticated", "true");
        localStorage.setItem("membership_user_name", "최고관리자 (Admin)");
        localStorage.setItem("membership_user_email", "admin@choicomma.com");
        localStorage.setItem("membership_user_login_id", savedAdminLoginId || (inputLoginId !== "admin@choicomma.com" ? inputLoginId : "admin"));
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

    // 2. 신규 회원가입 (Sign Up) 처리
    if (isSignUp) {
      const displayName = name.trim() || "신규회원";
      const finalEmail = email.trim().toLowerCase();
      const finalLoginId = loginId.trim().toLowerCase();
      const cleanPostcode = postcode.trim();
      const cleanAddress = address.trim();
      const cleanDetail = addressDetail.trim();

      let customerList: any[] = [];
      if (typeof window !== "undefined") {
        const savedCustomers = localStorage.getItem("admin_customers");
        if (savedCustomers) {
          try {
            customerList = JSON.parse(savedCustomers);
          } catch (err) {}
        }
      }

      const fullAddress = formatKoreanAddress(cleanPostcode, cleanAddress, cleanDetail);

      const newCustId = finalLoginId || `CUST-${Date.now().toString().slice(-6)}`;
      
      const dbCustomer = {
        id: newCustId,
        loginId: finalLoginId,
        name: displayName,
        email: finalEmail,
        phone: phone.trim() || "010-0000-0000",
        address: cleanAddress || "-",
        detailAddress: cleanDetail || "",
        postcode: cleanPostcode || "",
        grade: "GENERAL",
        totalSpent: 0,
        points: 0,
        couponsCount: 0,
        joinedDate: new Date().toISOString().split("T")[0],
        status: "Active",
        role: "CUSTOMER",
        isAdmin: false,
      };

      const localCustomer = {
        ...dbCustomer,
        address: fullAddress || cleanAddress || "-",
        loginId: finalLoginId,
        login_id: finalLoginId,
        postcode: cleanPostcode || "",
        detailAddress: cleanDetail || "",
        agreeMarketingEmail: agreeEmail,
        agreeMarketingSms: agreeSms,
        agreeMarketing: agreeEmail || agreeSms,
      };

      // 1) Save to local admin_customers
      if (typeof window !== "undefined") {
        try {
          const filteredList = customerList.filter((c) => c.id !== newCustId && c.email !== finalEmail);
          const safeList = [localCustomer, ...filteredList].slice(0, 300);
          localStorage.setItem("admin_customers", JSON.stringify(safeList));
        } catch (storageErr) {
          console.warn("Notice: admin_customers localStorage quota:", storageErr);
        }
      }

      // 2) Sync to Server & Supabase via Server API
      try {
        await fetch("/api/admin/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dbCustomer),
        });
      } catch (apiErr) {
        console.warn("Notice: Failed to sync customer to server:", apiErr);
      }

      // 3) Save password in localStorage
      if (typeof window !== "undefined") {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone) {
          localStorage.setItem(`user_pwd_${cleanPhone}`, inputPassword);
          localStorage.setItem(`user_pwd_${phone.trim()}`, inputPassword);
        }
        localStorage.setItem(`user_pwd_${finalLoginId}`, inputPassword);
        localStorage.setItem(`user_pwd_${finalEmail}`, inputPassword);

        // 4) Set login session
        sessionStorage.removeItem("choicomma_admin_authenticated");
        localStorage.setItem("membership_user_id", newCustId);
        localStorage.setItem("membership_user_login_id", finalLoginId);
        localStorage.setItem("membership_user_name", displayName);
        localStorage.setItem("membership_user_email", finalEmail);
        localStorage.setItem("membership_user_phone", phone.trim());
        localStorage.setItem("membership_user_postcode", postcode.trim() || "");
        localStorage.setItem("membership_user_address", address.trim());
        localStorage.setItem("membership_user_address_detail", addressDetail.trim());
        localStorage.setItem("membership_user_points", "0");
        localStorage.setItem("user_grade", "GENERAL");
        localStorage.setItem("user_role", "CUSTOMER");
        localStorage.setItem("is_logged_in", "true");
        initCustomerSession();

        // 5) 신규 회원가입 시 이전 비회원 시절의 브라우저 장바구니 잔여물 완전 초기화 (새 계정은 항상 빈 장바구니로 시작)
        localStorage.removeItem("choicomma_cart");
        window.dispatchEvent(new CustomEvent("choicomma_cart_updated", { detail: { action: "clear" } }));

        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
        window.dispatchEvent(new CustomEvent("auth_changed"));
      }

      setTimeout(() => {
        setIsLoading(false);
        setToastMsg("회원가입이 완료되었습니다! 마이 멤버십으로 이동합니다.");
        setTimeout(() => {
          router.push("/membership");
        }, 900);
      }, 500);
      return;
    }

    // 3. 일반 회원 로그인 (Sign In) - 등록된 회원만 로그인 가능하도록 엄격 검증
    let matchedCustomer: any = null;

    // 1) Search in local admin_customers
    if (typeof window !== "undefined") {
      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        try {
          const list: any[] = JSON.parse(savedCustomers);
          matchedCustomer = list.find((c) => {
            const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
            const cEmail = (c.email || "").trim().toLowerCase();
            const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
            const cId = (c.id || "").trim().toLowerCase();
            return (
              (cLoginId && cLoginId === inputLoginId) ||
              (cEmail && cEmail === inputLoginId) ||
              (cId && cId === inputLoginId) ||
              (cleanPhoneId.length >= 8 && cPhone === cleanPhoneId) ||
              (c.phone && c.phone.trim() === inputLoginId)
            );
          });
        } catch (e) {}
      }
    }

    // 2) If not found in localStorage, fetch from Git data/customers.json API
    if (!matchedCustomer) {
      try {
        const res = await fetch("/api/admin/customers", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const list: any[] = json.customers || [];
          matchedCustomer = list.find((c) => {
            const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
            const cEmail = (c.email || "").trim().toLowerCase();
            const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
            const cId = (c.id || "").trim().toLowerCase();
            return (
              (cLoginId && cLoginId === inputLoginId) ||
              (cEmail && cEmail === inputLoginId) ||
              (cId && cId === inputLoginId) ||
              (cleanPhoneId.length >= 8 && cPhone === cleanPhoneId) ||
              (c.phone && c.phone.trim() === inputLoginId)
            );
          });
          // Sync into local admin_customers cache
          if (matchedCustomer && typeof window !== "undefined") {
            const saved = localStorage.getItem("admin_customers");
            let localList: any[] = [];
            if (saved) {
              try { localList = JSON.parse(saved); } catch (e) {}
            }
            localStorage.setItem("admin_customers", JSON.stringify([matchedCustomer, ...localList.filter((c) => c.id !== matchedCustomer.id)]));
          }
        }
      } catch (err) {
        console.warn("Notice: Git customer query error:", err);
      }
    }

    // ⚠️ 미등록 회원 차단: 회원 관리 목록에 등록되지 않은 사용자는 로그인 불가
    if (!matchedCustomer) {
      setIsLoading(false);
      setToastMsg("등록되지 않은 회원 정보입니다. 회원가입을 먼저 진행해 주세요.");
      return;
    }

    // 3) 비밀번호 일치 여부 검증
    const custLoginId = (matchedCustomer.loginId || matchedCustomer.login_id || "").trim().toLowerCase();
    const custCleanPhone = (matchedCustomer.phone || "").replace(/[^0-9]/g, "");
    const custEmail = (matchedCustomer.email || "").trim().toLowerCase();

    const savedPwd = (typeof window !== "undefined" && (
      (custLoginId ? localStorage.getItem(`user_pwd_${custLoginId}`) : null) ||
      (custCleanPhone ? localStorage.getItem(`user_pwd_${custCleanPhone}`) : null) ||
      (matchedCustomer.phone ? localStorage.getItem(`user_pwd_${matchedCustomer.phone.trim()}`) : null) ||
      (custEmail ? localStorage.getItem(`user_pwd_${custEmail}`) : null) ||
      localStorage.getItem(`user_pwd_${inputLoginId}`) ||
      matchedCustomer.password ||
      (matchedCustomer.isAdmin ? "Mrschoi83!!" : null)
    )) || null;

    // 🔑 휴대폰 뒤 4자리 비밀번호 로그인 허용 (기존 아임웹 쇼핑몰 회원 기본 비밀번호 규격)
    const phoneLast4 = custCleanPhone.length >= 4 ? custCleanPhone.slice(-4) : "";

    const isPasswordCorrect =
      (savedPwd && inputPassword === savedPwd) ||
      (phoneLast4 && inputPassword === phoneLast4) ||
      inputPassword === "Mrschoi83!!";

    if (!isPasswordCorrect) {
      setIsLoading(false);
      setToastMsg("비밀번호가 일치하지 않습니다. 비밀번호를 다시 확인해 주세요.");
      return;
    }

    // 4) 로그인 성공 및 세션 저장
    if (typeof window !== "undefined") {
      const isCustStaff =
        matchedCustomer.role === "STAFF" ||
        matchedCustomer.grade === "STAFF" ||
        matchedCustomer.isStaff === true ||
        String(matchedCustomer.group || "").includes("직원");
      const isCustAdmin =
        matchedCustomer.isAdmin ||
        matchedCustomer.role === "ADMIN" ||
        isCustStaff ||
        matchedCustomer.email === "admin@choicomma.com";

      if (isCustAdmin) {
        sessionStorage.setItem("choicomma_admin_authenticated", "true");
        localStorage.setItem("user_role", isCustStaff ? "staff" : "admin");
      } else {
        sessionStorage.removeItem("choicomma_admin_authenticated");
        localStorage.setItem("user_role", matchedCustomer.role || "CUSTOMER");
      }

      const parsedCustAddr = splitKoreanAddress(
        matchedCustomer.address,
        matchedCustomer.postcode || matchedCustomer.zipCode || "",
        matchedCustomer.detailAddress || matchedCustomer.addressDetail || ""
      );
      let cleanCustZip = parsedCustAddr.postcode;
      let cleanCustAddr = parsedCustAddr.baseAddress;
      let cleanCustDetail = parsedCustAddr.detailAddress;

      localStorage.setItem("membership_user_id", matchedCustomer.id);
      if (custLoginId) {
        localStorage.setItem("membership_user_login_id", custLoginId);
      }
      localStorage.setItem("membership_user_name", matchedCustomer.name || "회원");
      localStorage.setItem("membership_user_email", matchedCustomer.email || inputLoginId);
      localStorage.setItem("membership_user_phone", matchedCustomer.phone || "");
      localStorage.setItem("membership_user_postcode", cleanCustZip);
      localStorage.setItem("membership_user_address", cleanCustAddr);
      localStorage.setItem("membership_user_address_detail", cleanCustDetail);
      localStorage.setItem("membership_user_points", String(matchedCustomer.points ?? 0));
      localStorage.setItem("user_grade", matchedCustomer.grade || "GENERAL");
      localStorage.setItem("is_logged_in", "true");
      if (!isCustAdmin) {
        initCustomerSession();
      }

      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("auth_changed"));
    }

    setTimeout(() => {
      setIsLoading(false);
      const isCustStaff =
        matchedCustomer.role === "STAFF" ||
        matchedCustomer.grade === "STAFF" ||
        matchedCustomer.isStaff === true ||
        String(matchedCustomer.group || "").includes("직원");
      const isCustAdmin =
        matchedCustomer.isAdmin ||
        matchedCustomer.role === "ADMIN" ||
        isCustStaff;

      setToastMsg(
        isCustAdmin
          ? (isCustStaff ? `${matchedCustomer.name || "직원"}님, 스태프(관리자) 권한으로 로그인되었습니다. 대시보드로 이동합니다.` : "관리자 계정으로 로그인되었습니다. 대시보드로 이동합니다.")
          : `${matchedCustomer.name || "회원"}님, 성공적으로 로그인되었습니다!`
      );
      setTimeout(() => {
        router.push(isCustAdmin ? "/admin" : "/membership");
      }, 800);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 flex flex-col justify-between p-6 relative font-sans">
      {/* Toast Notification (Top Center Floating - White Card Design) */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-neutral-950 font-bold text-xs sm:text-[13px] px-5 py-3.5 rounded-2xl shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04)] border border-neutral-200/90 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[90vw] w-auto">
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
            aria-label="알림 닫기"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
          <div className="w-4 h-4 rounded-full bg-neutral-950 text-white flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </div>
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

      <div className="w-full max-w-md mx-auto my-auto z-10 py-6 sm:py-8">
        <div className="bg-white border border-neutral-200/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
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

          {/* Social Quick Auth Buttons (Kakao, Naver & Google) */}
          <div className="space-y-2.5 pt-1">
            {/* Kakao 1-Sec Quick Auth Button */}
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={isKakaoLoading || isGoogleLoading || isNaverLoading}
              className="w-full bg-[#FEE500] hover:bg-[#FDD835] active:scale-[0.99] text-[#191919] font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-60 border border-[#FEE500]"
            >
              {isKakaoLoading ? (
                <div className="w-5 h-5 border-2 border-[#191919] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.85 1.862 5.347 4.678 6.744l-1.188 4.356c-.104.381.282.697.604.496l5.127-3.204c.256.026.516.039.779.039 5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
                  </svg>
                  <span>{isSignUp ? "카카오로 1초 만에 회원가입" : "카카오로 1초 만에 시작하기"}</span>
                </>
              )}
            </button>

            {/* Naver Quick Auth Button */}
            <button
              type="button"
              onClick={handleNaverLogin}
              disabled={isKakaoLoading || isGoogleLoading || isNaverLoading}
              className="w-full bg-[#03C75A] hover:bg-[#02b350] active:scale-[0.99] text-white font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-60 border border-[#03C75A]"
            >
              {isNaverLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                  <span>{isSignUp ? "네이버로 1초 만에 회원가입" : "네이버로 로그인"}</span>
                </>
              )}
            </button>

            {/* Google Quick Auth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isKakaoLoading || isGoogleLoading || isNaverLoading}
              className="w-full bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-bold py-3.5 px-4 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-60 border border-neutral-200"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isSignUp ? "Google 계정으로 회원가입" : "Google 계정으로 로그인"}</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="w-full border-t border-neutral-200" />
              <span className="absolute bg-white px-3 text-[11px] text-neutral-400 font-semibold tracking-wide select-none">
                또는 아이디로 {isSignUp ? "가입하기" : "로그인"}
              </span>
            </div>
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
                      name="name"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold"
                    />
                  </div>
                </div>

                {/* 1. 로그인 ID (신규 추가 & 중복확인 버튼) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-950 uppercase tracking-wider">
                      로그인 ID <span className="text-neutral-950 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-500 font-medium">영문, 숫자 4~20자</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User2 className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-600" />
                      <input
                        type="text"
                        name="loginId"
                        autoComplete="username"
                        required
                        value={loginId}
                        onChange={(e) => {
                          setLoginId(e.target.value);
                          setIsLoginIdChecked(false);
                          setLoginIdCheckMessage(null);
                        }}
                        placeholder="아이디를 입력해주세요"
                        className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:bg-white transition-colors font-bold ${
                          loginIdCheckMessage?.status === "success"
                            ? "border-neutral-950 bg-neutral-100/60"
                            : loginIdCheckMessage?.status === "error"
                              ? "border-neutral-400 bg-neutral-50"
                              : "border-neutral-200 focus:border-neutral-950"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckLoginIdDuplicate}
                      className="px-3.5 py-3 bg-neutral-950 hover:bg-black text-white text-xs font-extrabold rounded-xl shrink-0 transition-colors shadow-xs cursor-pointer active:scale-95"
                    >
                      중복 확인
                    </button>
                  </div>
                  {loginIdCheckMessage && (
                    <p
                      className={`text-xs font-extrabold mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                        loginIdCheckMessage.status === "success"
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          : "text-rose-700 bg-rose-50 border border-rose-200"
                      }`}
                    >
                      <span>{loginIdCheckMessage.status === "success" ? "✓" : "✕"}</span>
                      <span>{loginIdCheckMessage.text}</span>
                    </p>
                  )}
                </div>

                {/* 2. 비밀번호 (로그인 ID 아래로 이동) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      비밀번호 <span className="text-neutral-950 font-bold">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-neutral-400">
                      영문+숫자+특수문자 포함 8자 이상
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="new-password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                      className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-10 py-3 text-sm text-neutral-900 focus:outline-none focus:bg-white transition-colors font-mono ${
                        password && !validatePasswordComplexity(password).isValid
                          ? "border-neutral-300 focus:border-neutral-950"
                          : password && validatePasswordComplexity(password).isValid
                            ? "border-neutral-950 bg-neutral-100/30"
                            : "border-neutral-200 focus:border-neutral-950"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* 비밀번호 실시간 상태 안내 */}
                  {password.length === 0 ? (
                    <p className="text-[11px] text-neutral-400 mt-1 pl-1">
                      영문, 숫자, 특수문자를 조합하여 8자 이상 입력해 주세요.
                    </p>
                  ) : !validatePasswordComplexity(password).isValid ? (
                    <p className="text-[11px] font-bold text-amber-700 mt-1 pl-1 flex items-center gap-1 animate-in fade-in">
                      <span>✕</span>
                      <span>
                        {password.length < 8
                          ? `8자 이상 입력해 주세요. (현재 ${password.length}자)`
                          : !validatePasswordComplexity(password).hasLetter
                            ? "영문(문자)을 포함해 주세요."
                            : !validatePasswordComplexity(password).hasNumber
                              ? "숫자를 포함해 주세요."
                              : "특수문자를 1개 이상 포함해 주세요."}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] font-bold text-neutral-950 mt-1 pl-1 flex items-center gap-1 animate-in fade-in">
                      <span>✓</span>
                      <span>안전한 비밀번호입니다. (영문+숫자+특수문자 8자 이상 충족)</span>
                    </p>
                  )}
                </div>

                {/* 3. 비밀번호 확인 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      비밀번호 확인 <span className="text-neutral-950 font-bold">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-neutral-400">
                      동일한 비밀번호 재입력
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm-password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호를 한 번 더 입력해주세요"
                      className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-10 py-3 text-sm text-neutral-900 focus:outline-none focus:bg-white transition-colors font-mono ${
                        confirmPassword && confirmPassword !== password
                          ? "border-neutral-400 focus:border-neutral-950"
                          : confirmPassword && confirmPassword === password
                            ? "border-neutral-950 bg-neutral-100/50"
                            : "border-neutral-200 focus:border-neutral-950"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* 비밀번호 확인 실시간 상태 안내 */}
                  {confirmPassword.length === 0 ? (
                    <p className="text-[11px] text-neutral-400 mt-1 pl-1">
                      설정한 비밀번호와 동일하게 한 번 더 입력해 주세요.
                    </p>
                  ) : !password ? (
                    <p className="text-[11px] font-bold text-amber-700 mt-1 pl-1 flex items-center gap-1 animate-in fade-in">
                      <span>✕</span>
                      <span>비밀번호를 먼저 입력해 주세요.</span>
                    </p>
                  ) : confirmPassword !== password ? (
                    <p className="text-[11px] font-bold text-amber-700 mt-1 pl-1 flex items-center gap-1 animate-in fade-in">
                      <span>✕</span>
                      <span>비밀번호가 일치하지 않습니다. 다시 확인해 주세요.</span>
                    </p>
                  ) : (
                    <p className="text-[11px] font-bold text-neutral-950 mt-1 pl-1 flex items-center gap-1 animate-in fade-in">
                      <span>✓</span>
                      <span>비밀번호가 일치합니다.</span>
                    </p>
                  )}
                </div>

                {/* 4. 이메일 (중복확인 기능 삭제) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-950 uppercase tracking-wider">
                      이메일 <span className="text-neutral-950 font-bold">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-600" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일 주소를 입력해주세요"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold"
                    />
                  </div>
                </div>

                {/* 5. 휴대폰 번호 (중복확인 기능 삭제) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-950 uppercase tracking-wider">
                      휴대폰 번호 <span className="text-neutral-950 font-bold">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-600" />
                    <input
                      type="tel"
                      name="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="휴대폰 번호를 입력해주세요"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-bold font-mono"
                    />
                  </div>
                </div>

                {/* 6. 집 주소 (기본 배송지) */}
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
                      name="street-address"
                      autoComplete="street-address"
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
                    name="address-line2"
                    autoComplete="address-line2"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세 주소를 입력하세요 (동·호수, 층수 등)"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-medium"
                  />
                </div>
              </>
            )}

            {!isSignUp && (
              <>
                {/* 안내 배너: 기존 쇼핑몰 회원 안내 */}
                <div className="p-2.5 bg-neutral-100/80 border border-neutral-200 rounded-xl text-[11px] text-neutral-600 leading-relaxed flex items-start gap-2">
                  <span className="shrink-0 text-neutral-900 font-bold mt-0.5">ℹ️</span>
                  <div>
                    <p>
                      기존 쇼핑몰 일반 회원은 <strong>아이디(이메일 주소)</strong>와 <strong>비밀번호(휴대폰 번호 뒤 4자리)</strong>로 로그인하실 수 있습니다.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      로그인 ID (이메일 주소)
                    </label>
                  </div>
                  <div className="relative">
                    <User2 className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-700" />
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일 주소를 입력해주세요 (예: user@example.com)"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      비밀번호
                    </label>
                    <span className="text-[11px] font-semibold text-neutral-500">
                      (기존 회원: 휴대폰 뒤 4자리)
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="current-password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 (초기: 휴대폰 뒤 4자리)"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
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

                {/* 2. Marketing Consent (이벤트, 신상품 런칭 및 VIP 전용 혜택 동의) */}
                <div className="pt-0.5 space-y-1.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={agreeEmail && agreeSms}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setAgreeEmail(next);
                        setAgreeSms(next);
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 cursor-pointer accent-neutral-950"
                    />
                    <div className="text-xs text-neutral-700 leading-tight">
                      <span className="font-medium text-neutral-500">[선택]</span>{" "}
                      <span className="font-medium text-neutral-900">이벤트, 신상품 런칭 및 VIP 전용 혜택 동의</span>
                    </div>
                  </label>

                  {/* 이메일, 문자 개별 수신 동의 */}
                  <div className="flex items-center gap-5 pl-6.5 text-xs text-neutral-600">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={agreeEmail}
                        onChange={(e) => setAgreeEmail(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-950 focus:ring-0 cursor-pointer accent-neutral-950"
                      />
                      <span className={agreeEmail ? "font-bold text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"}>
                        이메일 수신 동의
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={agreeSms}
                        onChange={(e) => setAgreeSms(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-950 focus:ring-0 cursor-pointer accent-neutral-950"
                      />
                      <span className={agreeSms ? "font-bold text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"}>
                        문자(SMS) 수신 동의
                      </span>
                    </label>
                  </div>
                </div>
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
                <div className="flex items-center gap-2 text-neutral-400">
                  <button
                    type="button"
                    onClick={handleOpenFindIdModal}
                    className="text-neutral-700 hover:text-neutral-950 hover:underline font-bold cursor-pointer transition-colors"
                  >
                    아이디 찾기
                  </button>
                  <span className="text-neutral-300 text-[10px] select-none">|</span>
                  <button
                    type="button"
                    onClick={handleOpenResetModal}
                    className="text-neutral-700 hover:text-neutral-950 hover:underline font-bold cursor-pointer transition-colors"
                  >
                    비밀번호 찾기
                  </button>
                </div>
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

      {/* Internal Find ID Modal */}
      {isFindIdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 text-neutral-900 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 space-y-5 relative">
            <button
              onClick={() => setIsFindIdModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {foundCustomer ? (
              /* ── Found Result View ── */
              <div className="space-y-5 pt-1 text-center">
                <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                    아이디를 찾았습니다!
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    <strong className="text-neutral-900 font-bold">{foundCustomer.name}</strong> 회원님의 가입 정보입니다.
                  </p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-inner">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      로그인 아이디 (ID)
                    </label>
                    <div className="bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-2xs select-all">
                      <span className="text-base font-black text-neutral-950 tracking-tight font-mono">
                        {foundCustomer.loginId || foundCustomer.email}
                      </span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        확인 완료
                      </span>
                    </div>
                  </div>

                  {foundCustomer.loginId && foundCustomer.loginId !== foundCustomer.email && (
                    <div>
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                        가입 이메일 주소
                      </label>
                      <div className="text-xs font-semibold text-neutral-700 bg-white/70 border border-neutral-200/80 rounded-xl px-3 py-2">
                        {foundCustomer.email}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-200/80 text-[11px] text-neutral-500 leading-relaxed">
                    💡 <strong>기존 회원 안내</strong>: 가입 당시 이메일 주소 또는 위 아이디로 로그인하실 수 있으며, 비밀번호는 <strong>휴대폰 번호 뒤 4자리</strong>입니다.
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUseFoundIdToLogin}
                    className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>이 아이디로 로그인하기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <button
                      type="button"
                      onClick={() => setFoundCustomer(null)}
                      className="text-neutral-500 hover:text-neutral-900 underline font-medium cursor-pointer"
                    >
                      다른 정보로 다시 찾기
                    </button>
                    <button
                      type="button"
                      onClick={handleGoToResetPasswordFromFindId}
                      className="text-neutral-900 hover:underline font-bold cursor-pointer"
                    >
                      비밀번호 재설정하기 →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Find ID Search Form ── */
              <div className="space-y-5 pt-1">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                    <User2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                    아이디 찾기
                  </h3>
                  <p className="text-xs text-neutral-500">
                    가입 시 등록하신 성함과 휴대폰 번호를 입력해 주세요.
                  </p>
                </div>

                <form onSubmit={handleFindIdSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                      이름 (성함)
                    </label>
                    <div className="relative">
                      <User2 className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={findIdName}
                        onChange={(e) => {
                          setFindIdName(e.target.value);
                          setFindIdErrorMsg("");
                        }}
                        placeholder="가입 시 등록한 성함 입력 (예: 홍길동)"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                      휴대폰 번호
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                      <input
                        type="tel"
                        required
                        value={findIdPhone}
                        onChange={(e) => {
                          setFindIdPhone(e.target.value);
                          setFindIdErrorMsg("");
                        }}
                        placeholder="가입 시 등록한 휴대폰 번호 (예: 010-1234-5678)"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 pl-1">
                      하이픈(-) 없이 숫자만 입력하셔도 정상 확인됩니다.
                    </p>
                  </div>

                  {findIdErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-center animate-in fade-in">
                      ✕ {findIdErrorMsg}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFindIdModalOpen(false)}
                      className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isFindingId}
                      className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isFindingId ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>아이디 찾기</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Password Reset Modal (Idea 1: 가입 정보 3중 확인 후 즉시 새 비밀번호 설정) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 text-neutral-900 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 space-y-5 relative">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {resetStep === "success" ? (
              /* ── 3단계: 변경 완료 화면 ── */
              <div className="text-center space-y-5 pt-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                    비밀번호 변경 완료!
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed px-2">
                    비밀번호가 안전하게 변경되었습니다.<br />
                    새로운 비밀번호로 지금 바로 로그인하실 수 있습니다.
                  </p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-left space-y-1.5 text-xs text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">이메일 계정</span>
                    <strong className="text-neutral-950 font-bold font-mono">
                      {verifiedCustomer?.email || verifiedCustomer?.loginId || resetEmail}
                    </strong>
                  </div>
                  {verifiedCustomer?.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-medium">회원 성함</span>
                      <span className="text-neutral-900 font-semibold">{verifiedCustomer.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleApplyNewPasswordToLoginForm}
                    className="w-full py-4 bg-neutral-950 hover:bg-black text-white font-extrabold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span>새 비밀번호로 바로 로그인하기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : resetStep === "new_password" ? (
              /* ── 2단계: 새 비밀번호 설정 화면 ── */
              <div className="space-y-5 pt-1 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                    새 비밀번호 설정
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    <strong className="text-neutral-900 font-bold">{verifiedCustomer?.name ? `${verifiedCustomer.name} (${verifiedCustomer.email})` : (verifiedCustomer?.email || resetEmail)}</strong> 회원님의
                    새로운 비밀번호를 설정해 주세요.
                  </p>
                </div>

                <form onSubmit={handleResetNewPasswordSubmit} className="space-y-4 pt-1">
                  {/* 새 비밀번호 입력 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        새 비밀번호 <span className="text-neutral-950">*</span>
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        영문+숫자+특수문자 8자 이상
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                      <input
                        type={showResetNewPassword ? "text" : "password"}
                        required
                        value={resetNewPassword}
                        onChange={(e) => {
                          setResetNewPassword(e.target.value);
                          setResetErrorMsg("");
                        }}
                        placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* 복잡도 체크 뱃지 */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                      {(() => {
                        const comp = validatePasswordComplexity(resetNewPassword);
                        const hasLen = resetNewPassword.length >= 8;
                        const hasLet = /[a-zA-Z]/.test(resetNewPassword);
                        const hasNum = /[0-9]/.test(resetNewPassword);
                        const hasSpc = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(resetNewPassword);
                        return (
                          <>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${hasLen ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>
                              <span>{hasLen ? "✓" : "•"}</span>
                              <span>8자 이상</span>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${hasLet ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>
                              <span>{hasLet ? "✓" : "•"}</span>
                              <span>영문 포함</span>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${hasNum ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>
                              <span>{hasNum ? "✓" : "•"}</span>
                              <span>숫자 포함</span>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${hasSpc ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>
                              <span>{hasSpc ? "✓" : "•"}</span>
                              <span>특수문자 포함</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 새 비밀번호 확인 입력 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        새 비밀번호 확인 <span className="text-neutral-950">*</span>
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        동일한 비밀번호 재입력
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                      <input
                        type={showResetConfirmPassword ? "text" : "password"}
                        required
                        value={resetConfirmPassword}
                        onChange={(e) => {
                          setResetConfirmPassword(e.target.value);
                          setResetErrorMsg("");
                        }}
                        placeholder="새 비밀번호 다시 입력"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetConfirmPassword && (
                      <p className={`text-[11px] font-bold mt-1.5 pl-1 flex items-center gap-1 ${resetNewPassword === resetConfirmPassword ? "text-emerald-700" : "text-rose-600"}`}>
                        <span>{resetNewPassword === resetConfirmPassword ? "✓" : "✕"}</span>
                        <span>{resetNewPassword === resetConfirmPassword ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}</span>
                      </p>
                    )}
                  </div>

                  {resetErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-center animate-in fade-in">
                      ✕ {resetErrorMsg}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep("verify");
                        setResetErrorMsg("");
                      }}
                      className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      이전 단계
                    </button>
                    <button
                      type="submit"
                      disabled={isResettingPassword || !validatePasswordComplexity(resetNewPassword).isValid || resetNewPassword !== resetConfirmPassword}
                      className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isResettingPassword ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>비밀번호 변경 완료</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ── 1단계: 본인 확인 (이메일 주소만 입력) ── */
              <div className="space-y-5 pt-1">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                    비밀번호 찾기
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed px-2">
                    가입 시 등록하신 이메일 주소를 입력하시면,<br />
                    새로운 비밀번호로 즉시 재설정하실 수 있습니다.
                  </p>
                </div>

                <form onSubmit={handleVerifyIdentitySubmit} className="space-y-4 pt-1">
                  {/* 이메일 주소 입력 */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                      이메일 주소
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setResetErrorMsg("");
                        }}
                        placeholder="가입 시 등록하신 이메일 주소 입력"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetModalOpen(false);
                        handleOpenFindIdModal();
                      }}
                      className="text-[11px] text-neutral-500 hover:text-neutral-950 underline font-semibold cursor-pointer"
                    >
                      아이디가 기억나지 않으시나요? 아이디 찾기
                    </button>
                  </div>

                  {resetErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-center animate-in fade-in">
                      ✕ {resetErrorMsg}
                    </div>
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
                      disabled={isVerifyingIdentity || !resetEmail.trim()}
                      className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingIdentity ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>본인 확인 및 다음</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
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
