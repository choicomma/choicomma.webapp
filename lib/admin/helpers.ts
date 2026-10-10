export const calculateTotalStock = (
  colors: string[],
  sizes: string[],
  stockMap: Record<string, number>
): number => {
  const effectiveSizes = sizes?.length ? sizes : ["FREE"];
  let total = 0;

  if (colors && colors.length > 0) {
    colors.forEach((c) => {
      effectiveSizes.forEach((s) => {
        const comboKey = `${c}-${s}`;
        const qty =
          stockMap[comboKey] !== undefined
            ? stockMap[comboKey]
            : stockMap[s] !== undefined
            ? stockMap[s]
            : 10;
        total += qty || 0;
      });
    });
  } else {
    effectiveSizes.forEach((s) => {
      const qty = stockMap[s] !== undefined ? stockMap[s] : 10;
      total += qty || 0;
    });
  }
  return total;
};

export const compressImageDataUrl = (
  dataUrl: string,
  maxWidth = 1280,
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve) => {
    if (
      !dataUrl ||
      !dataUrl.startsWith("data:image") ||
      typeof window === "undefined" ||
      !window.Image
    ) {
      resolve(dataUrl);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // 1. 가로 너비(width) 기준으로만 리사이즈 (상세페이지 긴 세로 컷의 가로 해상도가 뭉개지지 않도록 보호)
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // 브라우저 캔버스 하드웨어 최대 제한(16384px) 초과 방지
      const maxCanvasHeight = 12000;
      if (height > maxCanvasHeight) {
        width = Math.round((width * maxCanvasHeight) / height);
        height = maxCanvasHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // 고해상도 리샘플링 스무딩 설정
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // 투명 배경 PNG가 검은색으로 깨지는 현상 방지: 흰색 배경 먼저 채우기
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // WebP 지원 시 고품질 WebP, 미지원 시 고품질 JPEG 출력
      try {
        const webpResult = canvas.toDataURL("image/webp", quality);
        if (webpResult.startsWith("data:image/webp")) {
          resolve(webpResult);
          return;
        }
      } catch (e) {}

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

