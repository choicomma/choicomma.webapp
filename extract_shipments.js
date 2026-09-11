const fs = require('fs');

const pageContent = fs.readFileSync('app/admin/page.tsx', 'utf8');
const lines = pageContent.split('\n');

const startTarget = '  // Shipment Management State & Handlers';
const endTarget = '  }, [filteredShipments, shipmentPage]);';

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(startTarget)) {
    startIndex = i;
  }
  if (lines[i].includes(endTarget) && startIndex !== -1) {
    endIndex = i;
    break;
  }
}

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find block boundaries.", startIndex, endIndex);
  process.exit(1);
}

const blockLines = lines.slice(startIndex, endIndex + 1);

const hookCode = `import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import initialShipments from "@/lib/sfcc/mock/shipments-data.json";

export function useShipments(triggerToast: (msg: string) => void) {
${blockLines.join('\n').replace(/^  /gm, '')}

  return {
    shipmentsList, setShipmentsList,
    shipmentSearchQuery, setShipmentSearchQuery,
    shipmentStatusFilter, setShipmentStatusFilter,
    shipmentCarrierFilter, setShipmentCarrierFilter,
    shipmentPage, setShipmentPage,
    SHIPMENTS_PER_PAGE,
    isAddShipmentModalOpen, setIsAddShipmentModalOpen,
    newShipmentOrderId, setNewShipmentOrderId,
    newShipmentRecipient, setNewShipmentRecipient,
    newShipmentPhone, setNewShipmentPhone,
    newShipmentAltPhone, setNewShipmentAltPhone,
    newShipmentZipCode, setNewShipmentZipCode,
    newShipmentAddress, setNewShipmentAddress,
    newShipmentDetailAddress, setNewShipmentDetailAddress,
    newShipmentItems, setNewShipmentItems,
    newShipmentQuantity, setNewShipmentQuantity,
    newShipmentShippingMemo, setNewShipmentShippingMemo,
    newShipmentCarrier, setNewShipmentCarrier,
    newShipmentTracking, setNewShipmentTracking,
    newShipmentStatus, setNewShipmentStatus,
    editingShipment, setEditingShipment,
    editShipmentCarrier, setEditShipmentCarrier,
    editShipmentTracking, setEditShipmentTracking,
    editShipmentStatus, setEditShipmentStatus,
    isCjConfigModalOpen, setIsCjConfigModalOpen,
    configModalTab, setConfigModalTab,
    shippingPolicy, setShippingPolicy,
    cjClientCode, setCjClientCode,
    cjContractNo, setCjContractNo,
    cjApiKey, setCjApiKey,
    cjSenderAddress, setCjSenderAddress,
    handleOpenSenderPostcode,
    handleIssueCjLogisticsTracking,
    handleExportCjExcel,
    handleAddShipmentSubmit,
    handleSaveShipmentDetails,
    handleDeleteShipment,
    filteredShipments,
    totalShipmentPages,
    paginatedShipments
  };
}
`;

if (!fs.existsSync('hooks/admin')) {
  fs.mkdirSync('hooks/admin', { recursive: true });
}
fs.writeFileSync('hooks/admin/useShipments.ts', hookCode, 'utf8');

// Replace in page.tsx
const hookCall = `  // Shipment Management State & Handlers — extracted to useShipments hook
  const {
    shipmentsList, setShipmentsList,
    shipmentSearchQuery, setShipmentSearchQuery,
    shipmentStatusFilter, setShipmentStatusFilter,
    shipmentCarrierFilter, setShipmentCarrierFilter,
    shipmentPage, setShipmentPage,
    SHIPMENTS_PER_PAGE,
    isAddShipmentModalOpen, setIsAddShipmentModalOpen,
    newShipmentOrderId, setNewShipmentOrderId,
    newShipmentRecipient, setNewShipmentRecipient,
    newShipmentPhone, setNewShipmentPhone,
    newShipmentAltPhone, setNewShipmentAltPhone,
    newShipmentZipCode, setNewShipmentZipCode,
    newShipmentAddress, setNewShipmentAddress,
    newShipmentDetailAddress, setNewShipmentDetailAddress,
    newShipmentItems, setNewShipmentItems,
    newShipmentQuantity, setNewShipmentQuantity,
    newShipmentShippingMemo, setNewShipmentShippingMemo,
    newShipmentCarrier, setNewShipmentCarrier,
    newShipmentTracking, setNewShipmentTracking,
    newShipmentStatus, setNewShipmentStatus,
    editingShipment, setEditingShipment,
    editShipmentCarrier, setEditShipmentCarrier,
    editShipmentTracking, setEditShipmentTracking,
    editShipmentStatus, setEditShipmentStatus,
    isCjConfigModalOpen, setIsCjConfigModalOpen,
    configModalTab, setConfigModalTab,
    shippingPolicy, setShippingPolicy,
    cjClientCode, setCjClientCode,
    cjContractNo, setCjContractNo,
    cjApiKey, setCjApiKey,
    cjSenderAddress, setCjSenderAddress,
    handleOpenSenderPostcode,
    handleIssueCjLogisticsTracking,
    handleExportCjExcel,
    handleAddShipmentSubmit,
    handleSaveShipmentDetails,
    handleDeleteShipment,
    filteredShipments,
    totalShipmentPages,
    paginatedShipments
  } = useShipments(triggerToast);`;

const newPageLines = [
  ...lines.slice(0, startIndex),
  hookCall,
  ...lines.slice(endIndex + 1)
];

fs.writeFileSync('app/admin/page.tsx', newPageLines.join('\n'), 'utf8');
console.log('Successfully extracted useShipments.ts and updated page.tsx');
