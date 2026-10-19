import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { processCjShippingIssue } from "@/lib/cj/cj-api";

function syncToGitOrdersAndShipments(order: any, orderId: string, trackingNumber: string) {
  try {
    const baseOrderId = order.parentOrderId || (orderId.includes("-") && /-\d+$/.test(orderId) ? orderId.replace(/-\d+$/, "") : orderId);

    // 1. data/orders.json 업데이트
    const ordersPath = path.join(process.cwd(), "data", "orders.json");
    if (fs.existsSync(ordersPath)) {
      try {
        const raw = fs.readFileSync(ordersPath, "utf-8");
        const orders = JSON.parse(raw);
        if (Array.isArray(orders)) {
          let updated = false;
          for (const o of orders) {
            if (o.id === baseOrderId || o.orderNumber === baseOrderId || o.id === orderId || o.orderNumber === orderId) {
              o.trackingNumber = trackingNumber;
              o.status = "배송 중";
              o.updated_at = new Date().toISOString();
              updated = true;
            }
          }
          if (updated) {
            fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), "utf-8");
          }
        }
      } catch (e) {}
    }

    // 2. data/shipments.json 업데이트
    const shipmentsPath = path.join(process.cwd(), "data", "shipments.json");
    if (fs.existsSync(shipmentsPath)) {
      try {
        const raw = fs.readFileSync(shipmentsPath, "utf-8");
        const shipments = JSON.parse(raw);
        if (Array.isArray(shipments)) {
          let updated = false;
          for (const s of shipments) {
            if (s.id === baseOrderId || s.orderId === baseOrderId || s.id === orderId || s.orderId === orderId) {
              s.trackingNumber = trackingNumber;
              s.status = "In Transit";
              s.shippedDate = new Date().toISOString().split("T")[0];
              s.updated_at = new Date().toISOString();
              updated = true;
            }
          }
          if (updated) {
            fs.writeFileSync(shipmentsPath, JSON.stringify(shipments, null, 2), "utf-8");
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Notice: Failed to sync CJ tracking to Git data files:", err);
  }
}

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

    const results: PrintData[] = [];

    // 각 주문에 대해 CJ 개발서버 실제 4단계 파이프라인(토큰 ➜ 주소정제 ➜ 채번 ➜ 예약접수) 실행
    for (const order of targetOrders) {
      const orderId = order.orderId || order.id || `ORD-${Date.now()}`;
      const recipient = order.recipient || "고객";
      const phone = order.phone || "";
      const zipCode = (order.zipCode || "").replace(/[^0-9]/g, "") || "04524";
      const address = order.address || "";
      const detailAddress = order.detailAddress || "";
      const items = order.items || "주문 상품";
      const shippingMemo = order.shippingMemo || "";

      let cjResult;
      try {
        cjResult = await processCjShippingIssue({
          id: order.id,
          orderId,
          recipient,
          phone,
          zipCode,
          address,
          detailAddress,
          items,
          quantity: order.quantity || 1,
          shippingMemo,
        });
      } catch (issueErr: any) {
        console.error(`[CJ API Error] Order ${orderId} issue failed:`, issueErr.message);
        if (targetOrders.length === 1) {
          return NextResponse.json(
            { success: false, error: `CJ대한통운 접수 실패: ${issueErr.message}` },
            { status: 500 }
          );
        }
        continue;
      }

      const trackingNumber = cjResult.trackingNumber;
      const clsfCd = cjResult.clsfCd;
      const subClsfCd = cjResult.subClsfCd;
      const clldlvempNickNm = cjResult.clldlvempNickNm;
      const clsfAddr = cjResult.clsfAddr;
      const clldlvBranNm = cjResult.clldlvBranNm;
      const p2pCd = cjResult.p2pCd;

      // 0. Git data/orders.json 및 data/shipments.json 즉시 동기화
      if (trackingNumber) {
        syncToGitOrdersAndShipments(order, orderId, trackingNumber);
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
