/**
 * 비밀번호 조합 및 보안 규칙 검증 유틸리티
 * 정책: 영문 + 숫자 + 특수문자 포함 8자 이상
 */

export interface PasswordValidationResult {
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValidLength: boolean;
  isValid: boolean;
}

export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const pwd = password || "";
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  // 공백 및 영문/숫자를 제외한 특수문자 검증
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(pwd);
  const isValidLength = pwd.length >= 8;

  return {
    hasLetter,
    hasNumber,
    hasSpecial,
    isValidLength,
    isValid: isValidLength && hasLetter && hasNumber && hasSpecial,
  };
}
