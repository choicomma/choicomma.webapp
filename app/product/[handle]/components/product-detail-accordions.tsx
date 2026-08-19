"use client";
// Force HMR refresh for Designer Description Accordion

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Product } from "@/lib/sfcc/types";
import { Plus } from "lucide-react";

interface ProductDetailAccordionsProps {
  product: Product;
}

export function ProductDetailAccordions({ product }: ProductDetailAccordionsProps) {
  const prod = product as any;
  const hasDistinctDetail =
    prod.detailDescription &&
    prod.detailDescription.trim() !== "" &&
    prod.detailDescription.trim() !== product.description?.trim();

  const hasDistinctDetailedInfo =
    prod.detailedInfo &&
    prod.detailedInfo.trim() !== "" &&
    prod.detailedInfo.trim() !== product.description?.trim();

  const detailText = hasDistinctDetail
    ? prod.detailDescription
    : hasDistinctDetailedInfo
    ? prod.detailedInfo
    : `• 디자이너 노트: 본 상품(${product.title})은 choicomma 오리지널 실루엣 디자인으로 섬세하게 디테일을 더해 연출된 메인 컬렉션 작품입니다.\n• 소재 및 아웃핏: 최고급 소재와 감각적인 핏 설계로 바디 라인을 아름답게 잡아줍니다.\n• 관리 안내: 전문 드라이클리닝을 권장합니다.`;

  return (
    <div className="w-full mt-12 border-t border-neutral-200">
      <Accordion type="single" collapsible className="w-full" defaultValue="details">
        {/* 1. Details */}
        <AccordionItem value="details" className="border-b border-neutral-200">
          <AccordionTrigger className="py-4 text-xs font-bold text-neutral-900 hover:no-underline flex justify-between items-center group cursor-pointer uppercase tracking-widest">
            디자이너 설명
          </AccordionTrigger>
          <AccordionContent className="text-xs text-neutral-600 leading-relaxed pb-6">
            <div className="whitespace-pre-wrap leading-relaxed text-xs text-neutral-700">
              {detailText}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Fabric Info */}
        <AccordionItem value="fabric" className="border-b border-neutral-200">
          <AccordionTrigger className="py-4 text-xs font-bold text-neutral-900 hover:no-underline flex justify-between items-center group cursor-pointer uppercase tracking-widest">
            원단 정보
          </AccordionTrigger>
          <AccordionContent className="text-xs text-neutral-600 leading-relaxed pb-6">
            <div className="flex flex-col gap-4 py-4 px-4 border border-neutral-200/80 bg-neutral-50/50 rounded-2xl">
              <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2.5">
                <span className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">소재 구성 (FABRIC)</span>
                <span className="font-bold text-neutral-950 text-xs">
                  {(product as any).fabricComposition || "COTTON 100% (프리미엄 콤마 코튼)"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col items-center gap-1 shadow-2xs">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">신축성</span>
                  <span className="font-extrabold text-neutral-900">{(product as any).elasticity || "보통"}</span>
                </div>
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col items-center gap-1 shadow-2xs">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">비침</span>
                  <span className="font-extrabold text-neutral-900">{(product as any).sheerness || "없음"}</span>
                </div>
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col items-center gap-1 shadow-2xs">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">두께감</span>
                  <span className="font-extrabold text-neutral-900">{(product as any).thickness || "적당함"}</span>
                </div>
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col items-center gap-1 shadow-2xs">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">안감</span>
                  <span className="font-extrabold text-neutral-900">{(product as any).lining || "없음"}</span>
                </div>
              </div>
              <div className="text-[11px] text-neutral-500 pt-1 leading-relaxed border-t border-neutral-200/60 mt-1">
                <p>• 권장 세탁 방법: 드라이클리닝 권장 / 찬물 미온수 단독 손세탁 (건조기 사용 금지)</p>
              </div>

              {/* Fabric Texture Image Preview */}
              {((product as any).fabricImage || (product as any).fabricTextureImage) && (
                <div className="w-full mt-2 rounded-2xl overflow-hidden border border-neutral-200 bg-white p-3 shadow-2xs">
                  <span className="block text-[11px] font-black text-neutral-900 mb-2 uppercase tracking-wider">
                    🔍 원단 실물 텍스처 / 상세 확대컷
                  </span>
                  <img
                    src={(product as any).fabricImage || (product as any).fabricTextureImage}
                    alt="원단 텍스처 이미지"
                    className="w-full h-auto object-cover max-h-[350px] rounded-xl border border-neutral-100"
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Size Guide */}
        <AccordionItem value="guide" className="border-b border-neutral-200">
          <AccordionTrigger className="py-4 text-xs font-bold text-neutral-900 hover:no-underline flex justify-between items-center group cursor-pointer uppercase tracking-widest">
            사이즈 가이드
          </AccordionTrigger>
          <AccordionContent className="text-xs text-neutral-600 leading-relaxed pb-6">
            <div className="flex flex-col items-center py-4 my-1 border border-neutral-200/80 bg-white rounded-2xl p-5 md:p-6 shadow-2xs">
              {((product as any).sizeGuideImage || (product as any).sizeChartImage) && (
                <div className="w-full mb-4 rounded-xl overflow-hidden border border-neutral-200 bg-white p-2">
                  <img
                    src={(product as any).sizeGuideImage || (product as any).sizeChartImage}
                    alt="상품 수치 / 사이즈 가이드 표"
                    className="w-full h-auto object-contain max-h-[450px]"
                  />
                </div>
              )}

              {/* Notice Bullet Points */}
              <div className="text-[10.5px] text-neutral-500 text-center space-y-0.5 my-3 font-sans leading-relaxed">
                <p>- 측정수치는 cm를 나타냅니다.</p>
                <p>- 측정 위치에 따라 1~1.5cm 정도의 차이가 생길 수 있습니다.</p>
                <p>- 색상은 모니터 사양 또는 해상도에 따라 약간의 차이가 있을 수 있습니다.</p>
              </div>

              {/* Garment Measurements Table */}
              <div className="w-full overflow-x-auto mt-2">
                {(() => {
                  const sizes = (product as any).sizes?.length ? (product as any).sizes : ["1", "2", "3", "FREE"];
                  const customRows = (product as any).sizeMeasurements;
                  const rows = customRows && customRows.length > 0 ? customRows : [
                    { name: "SHOULDER", values: { "1": "50", "2": "52", "3": "54", "FREE": "56" } },
                    { name: "CHEST", values: { "1": "56.5", "2": "58.5", "3": "60.5", "FREE": "62.5" } },
                    { name: "SLEEVE", values: { "1": "59", "2": "60", "3": "61", "FREE": "61.5" } },
                    { name: "LENGTH", values: { "1": "58/62.5", "2": "60/64.5", "3": "62/66.5", "FREE": "63/67.5" } },
                  ];

                  return (
                    <table className="w-full text-center border-t border-b border-neutral-400 text-xs font-sans">
                      <thead>
                        <tr className="border-b border-neutral-200 font-bold text-neutral-800">
                          <th className="py-2.5 px-2 text-left font-bold text-[11px] uppercase">SIZE</th>
                          {sizes.map((size: string) => (
                            <th key={size} className="py-2.5 px-2 text-[11px]">{size}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-neutral-700 font-medium">
                        {rows.map((row: any) => (
                          <tr key={row.name}>
                            <td className="py-2.5 px-2 text-left font-bold text-neutral-900 text-[10.5px] uppercase tracking-wider">
                              {row.name}
                            </td>
                            {sizes.map((size: string) => (
                              <td key={size} className="py-2.5 px-2 text-[11px] font-mono">
                                {row.values[size] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Care & Delivery */}
        <AccordionItem value="care" className="border-b border-neutral-200">
          <AccordionTrigger className="py-4 text-xs font-bold text-neutral-900 hover:no-underline flex justify-between items-center group cursor-pointer uppercase tracking-widest">
            배송 및 반품
          </AccordionTrigger>
          <AccordionContent className="text-xs text-neutral-700 leading-relaxed pb-6 space-y-4">
            {/* 2. 불량 사유 제외 안내 */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
              <h4 className="text-sm font-black text-neutral-950 flex items-center gap-1.5">
                반품 불가 안내
              </h4>
              <p className="text-xs font-semibold text-neutral-600">
                다음과 같은 내용은 불량 사유가 아니오니 구입 전 확인해 주시기 바랍니다.
              </p>

              <div className="pt-2 border-t border-neutral-200/70">
                <span className="text-[11px] font-bold text-neutral-500 block mb-2">불량 사유 제외 사유 안내</span>
                <ul className="space-y-2 text-xs text-neutral-700 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>모니터 해상도에 따른 컬러 차이</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>배송 시 생긴 구김 또는 실밥 미정리, 바느질선 대칭 차이</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>상품 제작 과정의 초크 자국</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>원단 특유의 냄새</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>측정 방식에 따른 1~3cm 사이즈 오차</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>제품의 버튼 및 기타 부자재가 헐겁게 부착된 경우 <span className="text-neutral-500 font-medium">(초이 콤마는 내부 검수 팀을 통해 제품에 대한 검수 작업을 진행하고 있습니다.)</span></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">•</span>
                    <span>수제화/가방 등 제작상품의 경우, 제작과정에서 발생되는 미세한 본드 자국 및 펴질 수 있는 주름</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 3. 배송에 대한 안내 */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
              <h4 className="text-sm font-black text-neutral-950 flex items-center gap-1.5">
                배송에 대한 안내
              </h4>
              <ul className="space-y-2.5 text-xs text-neutral-700 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="shrink-0 font-bold">•</span>
                  <div>
                    <strong className="font-extrabold text-neutral-950">배송비 :</strong> CJ대한통운 이용, 기본 4,000원 (10만 원 이상 무료 / 도서산간 지역의 경우에는 추가 비용이 발생할 수 있습니다.)
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="shrink-0 font-bold">•</span>
                  <div>
                    <strong className="font-extrabold text-neutral-950">배송 기간 :</strong> 초이콤마의 모든 제품은 자체 제작 상품으로 주문 후 제작되고 있습니다. 본 배송기간은 영업일 기준, 7~14일 소요(주말·공휴일 제외) 소요 됩니다.
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="shrink-0 font-bold">•</span>
                  <div>
                    <strong className="font-extrabold text-neutral-950">바로배송 :</strong> 단, 바로 배송을 통해 미리 공지된 제품은 1~3일 소요됩니다.
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="shrink-0 font-bold">•</span>
                  <div>
                    <strong className="font-extrabold text-neutral-950">주의 :</strong> 제작 과정 중 생긴 공장 사정에 따라 갑작스러운 지연이 발생할 수 있습니다. 상품에 따라 유동적일 수 있어 배송기간 확인 후 주문해주시기 바랍니다.
                  </div>
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
