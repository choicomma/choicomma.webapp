const fs = require('fs');
const { execSync } = require('child_process');

const headContent = execSync('git show HEAD:app/admin/page.tsx').toString('utf8');

const startAnchor = '  // Shipment Management State & Handlers\n  const [shipmentsList';
const endAnchor = '  const handleSaveEditShipment = (e: React.FormEvent) => {';

const startIndex = headContent.indexOf('  // Shipment Management State');
const endFuncIndex = headContent.indexOf(endAnchor);

if (startIndex !== -1 && endFuncIndex !== -1) {
  const nextFuncMatch = headContent.indexOf('  const', endFuncIndex + endAnchor.length);
  let endIndex = nextFuncMatch !== -1 ? nextFuncMatch : headContent.indexOf('  return (', endFuncIndex);
  
  const blockLines = headContent.slice(startIndex, endIndex);

  const hookCode = `import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { initialShipments } from "@/lib/sfcc/mock/shipments-data";

export function useShipments(triggerToast: (msg: string) => void) {
${blockLines.replace(/^  /gm, '')}

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
    paginatedShipments,
    handleOpenNewShipmentPostcode,
    handleOpenEditShipment,
    handleSaveEditShipment
  };
}
`;

  if (!fs.existsSync('hooks/admin')) fs.mkdirSync('hooks/admin', { recursive: true });
  fs.writeFileSync('hooks/admin/useShipments.ts', hookCode, 'utf8');
  console.log("Successfully created useShipments.ts");
} else {
  console.log("Could not find anchors", startIndex, endFuncIndex);
}
