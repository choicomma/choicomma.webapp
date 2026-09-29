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
  maxDimension = 1920,
  quality = 0.8
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
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};
