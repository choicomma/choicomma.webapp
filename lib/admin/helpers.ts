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
  maxWidth = 1000,
  quality = 0.76
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

      // 1. 가로 너비(width) 기준 최적 리사이즈 (쇼핑몰 및 모바일 화면에 최적화된 선명도 보존)
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // 브라우저 캔버스 하드웨어 최대 제한(16384px) 초과 방지
      const maxCanvasHeight = 10000;
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

      // 투명 배경 PNG가 검은색으로 깨지는 현상 방지: 흰색 배경 채우기
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // WebP 지원 시 최적화 WebP, 미지원 시 JPEG 출력
      let result = "";
      try {
        const webpResult = canvas.toDataURL("image/webp", quality);
        if (webpResult.startsWith("data:image/webp")) {
          result = webpResult;
        }
      } catch (e) {}

      if (!result) {
        result = canvas.toDataURL("image/jpeg", quality);
      }

      // 2. 적응형(Adaptive) 압축: Base64 크기가 280KB(약 380,000자)를 초과하는 대용량인 경우, quality를 0.65로 재압축하여 150KB 이하로 최적화
      if (result.length > 380000) {
        try {
          const reWebp = canvas.toDataURL("image/webp", 0.65);
          if (reWebp.startsWith("data:image/webp") && reWebp.length < result.length) {
            result = reWebp;
          } else {
            const reJpeg = canvas.toDataURL("image/jpeg", 0.65);
            if (reJpeg.length < result.length) {
              result = reJpeg;
            }
          }
        } catch (e) {}
      }

      resolve(result);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

