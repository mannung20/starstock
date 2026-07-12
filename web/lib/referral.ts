/**
 * 추천 코드 유틸.
 * referral_code 는 profiles.referral_code(varchar(10) UNIQUE)에 lazy 저장.
 * 혼동 문자(0/O, 1/I/L) 제외한 base-30 알파벳 6자리 → 충돌 시 상위에서 재시도.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 0,1,O,I,L 제외

/** 6자리 추천 코드 1건 생성 */
export function genReferralCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** ?ref= 파라미터 유효성: 영숫자 1~10자 (referral_code 형식) */
export function isValidRefCode(v: string | null | undefined): v is string {
  return !!v && /^[A-Za-z0-9]{1,10}$/.test(v);
}
