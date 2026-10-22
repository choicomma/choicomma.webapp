/**
 * Web Audio API 기반 무손실 2톤 차임벨 사운드 유틸리티
 * 외부 음원 파일(mp3) 의존성 없이 0ms 즉각 재생되며 모든 모던 브라우저와 호환됩니다.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const isEnabled = localStorage.getItem("admin_chat_sound_enabled") !== "false"; // 기본값: ON
    if (!isEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1st Tone (880Hz / A5 - 맑은 고음 차임)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // 2nd Tone (1318.5Hz / E6 - 상큼하고 경쾌한 마무리 차임)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch (e) {
    console.warn("Notice: Web Audio notification sound error:", e);
  }
}
