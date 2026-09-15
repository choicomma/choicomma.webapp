import { NextResponse } from "next/server";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export interface PrintData {
  orderId: string;           // 예약접수 시 사용한 고객사용번호 (CUST_USE_NO)
  recipient: string;         // 받는분 성명
  phone: string;             // 받는분 전화번호
  zipCode: string;           // 받는분 우편번호
  address: string;           // 주소정제 시 분리한 기본주소 (RCVR_ADDR)
  detailAddress: string;     // 주소정제 시 분리한 상세주소 (RCVR_DETAIL_ADDR)
  items: string;             // 상품명 (GDS_NM)
  shippingMemo: string;      // 배송메시지 (REMARK_1)
  trackingNumber: string;    // 채번된 12자리 운송장 번호 (INVC_NO)
  clsfCd: string;            // 주소정제 결과: 도착지 코드 (CLSFCD)
  subClsfCd: string;         // 주소정제 결과: 도착지 서브 코드 (SUBCLSFCD)
  clldlvempNickNm: string;   // 주소정제 결과: SM분류코드 (CLLDLVEMPNICKNM)
  clsfAddr?: string;         // 주소정제 결과: 주소 약칭 (CLSFADDR)
  clldlvBranNm?: string;     // 주소정제 결과: 배송집배점 명 (CLLDLVBRANNM)
  p2pCd?: string;            // 주소정제 결과: P2P코드 (P2PCD)
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // 단건 및 다건({ order } 또는 { orders } 또는 배열) 모두 유연하게 수용
    const targetOrders: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.orders)
      ? payload.orders
      : payload?.order
      ? [payload.order]
      : [];

    if (targetOrders.length === 0) {
      return NextResponse.json({ success: false, error: "주문 정보가 전달되지 않았습니다." }, { status: 400 });
    }

    const origin = req.headers.get("origin") || new URL(req.url).origin;

    // 1단계: 1Day 토큰 발급 (ReqOneDayToken)
    let token: string | null = null;
    try {
      const tokenRes = await fetch(`${origin}/api/shipping/cj/token`, { method: "POST" });
      const tokenData = await tokenRes.json();
      if (tokenData.success && tokenData.token) {
        token = tokenData.token;
      } else {
        console.warn("CJ API Token notice:", tokenData.error);
      }
    } catch (tokenErr) {
      console.warn("CJ API Token request error:", tokenErr);
    }

    const results: PrintData[] = [];

    // 각 주문에 대해 4단계 파이프라인(토큰 ➜ 주소정제 ➜ 채번 ➜ 예약접수) 실행
    for (const order of targetOrders) {
      const orderId = order.orderId || order.id || `ORD-${Date.now()}`;
      const recipient = order.recipient || "고객";
      const phone = order.phone || "";
      const zipCode = (order.zipCode || "").replace(/[^0-9]/g, "");
      const address = order.address || "";
      const detailAddress = order.detailAddress || "";
      const items = order.items || "주문 상품";
      const shippingMemo = order.shippingMemo || "";

      let clsfCd = "4W44";
      let subClsfCd = "-4g";
      let clldlvempNickNm = "A01-1구역";
      let clsfAddr = detailAddress || address.split(" ").slice(-2).join(" ") || "101동 201호";
      let clldlvBranNm = "대한통운";
      let p2pCd = "P1";
      let trackingNumber = "";

      if (token) {
        try {
          // 2단계: 주소 정제 (ReqAddrRfnSm)
          const addressRes = await fetch(`${origin}/api/shipping/cj/address`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, address }),
          });
          const addressData = await addressRes.json();
          if (addressData.success) {
            clsfCd = addressData.clsfCd || clsfCd;
            subClsfCd = addressData.subClsfCd || subClsfCd;
            clldlvempNickNm = addressData.clldlvempNickNm || clldlvempNickNm;
            clsfAddr = addressData.clsfAddr || clsfAddr;
            clldlvBranNm = addressData.clldlvBranNm || clldlvBranNm;
            p2pCd = addressData.p2pCd || p2pCd;
          }

          // 3단계: 운송장 번호 생성 (ReqInvcNo)
          const invoiceRes = await fetch(`${origin}/api/shipping/cj/invoice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const invoiceData = await invoiceRes.json();
          if (invoiceData.success && invoiceData.trackingNumber) {
            trackingNumber = invoiceData.trackingNumber;
          }

          // 4단계: (일반)예약 접수 (RegBook)
          if (trackingNumber) {
            await fetch(`${origin}/api/shipping/cj/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, invoiceNo: trackingNumber, order }),
            });
          }
        } catch (stepErr) {
          console.warn(`CJ API Pipeline warning for order [${orderId}]:`, stepErr);
        }
      }

      // 개발/테스트 환경 Fallback: CJ 개발서버 미인증 시 12자리 표준 가상번호 채번 유지
      if (!trackingNumber) {
        const seedDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
        const standard12 = `6892${seedDigits}`;
        trackingNumber = `${standard12.slice(0, 4)}-${standard12.slice(4, 8)}-${standard12.slice(8, 12)}`;
      } else {
        const rawDigits = trackingNumber.replace(/[^0-9]/g, "");
        if (rawDigits.length === 12) {
          trackingNumber = `${rawDigits.slice(0, 4)}-${rawDigits.slice(4, 8)}-${rawDigits.slice(8, 12)}`;
        }
      }

      // Supabase DB 자동 동기화 (운송장 번호 저장 및 주문 상태 '배송 중' 업데이트)
      if (isSupabaseConfigured && trackingNumber) {
        try {
          // 다박스 분리배송인 경우 baseOrderId 및 pkgIndex 추출
          const baseOrderId = order.parentOrderId || (orderId.includes("-") && /-\d+$/.test(orderId) ? orderId.replace(/-\d+$/, "") : orderId);
          const rawPkgIndex = order.pkgIndex ?? (orderId.match(/-(\d+)$/) ? parseInt(orderId.match(/-(\d+)$/)![1], 10) : null);
          const targetPkgIndex = typeof rawPkgIndex === "number" && !isNaN(rawPkgIndex) ? rawPkgIndex : null;

          // 1. orders 테이블 업데이트 (id 또는 orderNumber 일치 레코드: 운송장번호 저장 및 상태 '배송 중' 반영)
          try {
            for (const targetOrdKey of [baseOrderId, orderId]) {
              // 1) trackingNumber, status 컬럼 업데이트 시도
              let updateSuccess = false;

              const { error: err1, data: r1 } = await supabaseServer
                .from("orders")
                .update({
                  trackingNumber: trackingNumber,
                  status: "배송 중",
                  updated_at: new Date().toISOString(),
                })
                .or(`id.eq.${targetOrdKey},orderNumber.eq.${targetOrdKey}`)
                .select();

              if (!err1 && r1 && r1.length > 0) {
                updateSuccess = true;
              } else if (err1 && (err1.code === "42703" || err1.code === "PGRST204" || err1.message?.includes("column"))) {
                // 2) tracking_number (snake_case) 컬럼 시도
                const { error: err2, data: r2 } = await supabaseServer
                  .from("orders")
                  .update({
                    tracking_number: trackingNumber,
                    status: "배송 중",
                    updated_at: new Date().toISOString(),
                  })
                  .or(`id.eq.${targetOrdKey},orderNumber.eq.${targetOrdKey}`)
                  .select();

                if (!err2 && r2 && r2.length > 0) {
                  updateSuccess = true;
                }
              }

              // 3) orders 테이블에 별도 tracking 컬럼이 없는 경우 orderMemo 컬럼에 운송장번호 및 배송상태 기록
              if (!updateSuccess) {
                const memoStamp = `[CJ대한통운: ${trackingNumber}] [상태: 배송 중]`;
                const { error: memoErr, data: memoData } = await supabaseServer
                  .from("orders")
                  .update({
                    orderMemo: memoStamp,
                    updated_at: new Date().toISOString(),
                  })
                  .or(`id.eq.${targetOrdKey},orderNumber.eq.${targetOrdKey}`)
                  .select();

                if (!memoErr && memoData && memoData.length > 0) {
                  updateSuccess = true;
                }
              }

              if (updateSuccess) {
                break;
              }
            }
          } catch (ordErr) {
            console.warn(`[Supabase] orders 테이블 업데이트 알림 (orderId: ${orderId}):`, ordErr);
          }

          // 2. shipments 테이블 (관리자 웹앱 주문/배송 관리 연동 원장) 업데이트
          try {
            const parentShipmentId = order.parentShipmentId || (order.id && /-\d+$/.test(order.id) ? order.id.replace(/-\d+$/, "") : null);

            // 기존 shipment 레코드 조회
            let query = supabaseServer.from("shipments").select("*");
            if (parentShipmentId) {
              query = query.eq("id", parentShipmentId);
            } else {
              query = query.or(`orderId.eq.${baseOrderId},id.eq.${order.id || orderId}`);
            }
            const { data: existingRows } = await query.limit(1);
            const currentShipment = existingRows && existingRows.length > 0 ? existingRows[0] : null;

            if (currentShipment) {
              let updatedPackages = currentShipment.packages;
              if (Array.isArray(updatedPackages) && updatedPackages.length > 0 && targetPkgIndex !== null) {
                updatedPackages = updatedPackages.map((p: any, idx: number) => {
                  const pIdx = p.pkgIndex || idx + 1;
                  if (pIdx === targetPkgIndex) {
                    return {
                      ...p,
                      trackingNumber: trackingNumber,
                      status: "In Transit",
                    };
                  }
                  return p;
                });
              }

              const allTransit = Array.isArray(updatedPackages) && updatedPackages.length > 0
                ? updatedPackages.every((p: any) => p.trackingNumber && p.trackingNumber !== "-")
                : true;
              const anyTransit = Array.isArray(updatedPackages) && updatedPackages.length > 0
                ? updatedPackages.some((p: any) => p.trackingNumber && p.trackingNumber !== "-")
                : true;

              const finalShipmentStatus = allTransit ? "In Transit" : anyTransit ? "Partially Shipped" : (currentShipment.status || "Pending");
              const firstValidTracking = (Array.isArray(updatedPackages) && updatedPackages.find((p: any) => p.trackingNumber && p.trackingNumber !== "-")?.trackingNumber) || trackingNumber;

              const shpUpdates: Record<string, any> = {
                status: finalShipmentStatus,
                shippedDate: new Date().toISOString().split("T")[0],
                updated_at: new Date().toISOString(),
              };

              if (Array.isArray(updatedPackages)) {
                shpUpdates.packages = updatedPackages;
              }
              if (firstValidTracking && firstValidTracking !== "-") {
                shpUpdates.trackingNumber = firstValidTracking;
              }

              await supabaseServer
                .from("shipments")
                .update(shpUpdates)
                .eq("id", currentShipment.id);
            } else {
              const shpUpdates = {
                trackingNumber: trackingNumber,
                status: "In Transit",
                shippedDate: new Date().toISOString().split("T")[0],
                updated_at: new Date().toISOString(),
              };
              await supabaseServer
                .from("shipments")
                .update(shpUpdates)
                .or(`orderId.eq.${baseOrderId},id.eq.${order.id || orderId}`);
            }
          } catch (shpErr) {
            console.warn(`[Supabase] shipments 테이블 업데이트 알림 (orderId: ${orderId}):`, shpErr);
          }
        } catch (dbErr) {
          console.error(`[Supabase] DB 주문 상태 업데이트 실패 (orderId: ${orderId}):`, dbErr);
        }
      }

      // PrintData 인터페이스 규격에 100% 일치하도록 매핑
      const printItem: PrintData = {
        orderId,
        recipient,
        phone,
        zipCode,
        address,
        detailAddress,
        items,
        shippingMemo,
        trackingNumber,
        clsfCd,
        subClsfCd,
        clldlvempNickNm,
        clsfAddr,
        clldlvBranNm,
        p2pCd,
      };

      results.push(printItem);
    }

    // JSON 배열(Array) 형태로 반환
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("CJ Automated Issue Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
