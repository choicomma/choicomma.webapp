const fs = require('fs');
const lines = fs.readFileSync('app/admin/page.tsx', 'utf8').split(/\r?\n/);

function findLine(prefix, startIdx = 0) {
  if (startIdx < 0 || startIdx >= lines.length) return -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes(prefix)) return i;
  }
  return -1;
}

// 1. Inquiries
const b1_s = findLine('  // VIP Customer Inquiry State');
const b1_e = findLine('  // Revenue Management State', b1_s) - 1;
const b1_rep = [
`  // VIP Customer Inquiry State
  const {
    inquiriesList, setInquiriesList,
    zoomedInquiryImage, setZoomedInquiryImage,
    inquiriesFilter, setInquiriesFilter,
    handleReplyToInquiry
  } = useInquiries(triggerToast);`, ``
];

// 2. Revenue
const b2_s = findLine('  // Revenue Management State', b1_e);
const b2_e = findLine('  // Inbound Management State', b2_s) - 1;
const b2_rep = [
`  // Revenue Management State
  const {
    revenueSelectedYear, setRevenueSelectedYear,
    revenueSelectedMonth, setRevenueSelectedMonth,
    revenueFilterPeriod, setRevenueFilterPeriod,
    revenueStatusFilter, setRevenueStatusFilter,
    revenueSearchQuery, setRevenueSearchQuery
  } = useRevenue();`, ``
];

// 3. Inbound (Two blocks!)
const b3a_s = findLine('  // Inbound Management State');
const b3a_e = findLine('  const [newInboundStatus, setNewInboundStatus] = useState("Scheduled");', b3a_s);
const b3a_rep = [
`  // Inbound Management State
  const {
    inboundSchedulesList, setInboundSchedulesList,
    selectedInboundItem, setSelectedInboundItem,
    isInboundModalOpen, setIsInboundModalOpen,
    inboundItemSearchQuery, setInboundItemSearchQuery,
    inboundItemStatusFilter, setInboundItemStatusFilter,
    newInboundOrderId, setNewInboundOrderId,
    newInboundSupplier, setNewInboundSupplier,
    newInboundSupplierPhone, setNewInboundSupplierPhone,
    newInboundCarrier, setNewInboundCarrier,
    newInboundTracking, setNewInboundTracking,
    newInboundExpectedDate, setNewInboundExpectedDate,
    newInboundReceivedDate, setNewInboundReceivedDate,
    newInboundItems, setNewInboundItems,
    newInboundQuantity, setNewInboundQuantity,
    newInboundReceivedQuantity, setNewInboundReceivedQuantity,
    newInboundNotes, setNewInboundNotes,
    newInboundStatus, setNewInboundStatus,
    handleDeleteInboundSchedule
  } = useInboundSchedules(triggerToast);`, ``
];

const b3b_s = findLine('  const handleAddInboundSchedule = (e: React.FormEvent) => {');
const b3b_e = findLine('  const handleDeleteInboundSchedule = (id: string) => {', b3b_s) + 5; 
// +5 to cover the body of handleDeleteInboundSchedule
const b3b_rep = [``, ``];

// 4. Live Chat
const b4_s = findLine('  // Live Chat Admin State & Storage Sync');
const b4_e = findLine('  const handleAdminClearLiveChat = () => {', b4_s);
const b4_end_full = findLine('  };', b4_e + 1);
const b4_rep = [
`  // Live Chat Admin State & Storage Sync
  const {
    adminLiveChatMessages, setAdminLiveChatMessages,
    adminLiveInput, setAdminLiveInput,
    activeSessionId, setActiveSessionId,
    chatSessionsList, setChatSessionsList,
    handleAdminSendLiveChat,
    handleEndLiveChatSession,
    demoSessionMessages, setDemoSessionMessages,
    handleAdminClearLiveChat
  } = useLiveChat(triggerToast);`, ``
];

// 5. Customers
const b5_s = findLine('  // Customer Management Admin State');
const b5_e = findLine('  const paginatedCustomers = React.useMemo', b5_s) + 3; // +3 to cover the closing `  }, [filteredCustomers, customerPage]);`
const b5_rep = [
`  // Customer Management Admin State
  const {
    customersList, setCustomersList,
    customerSearchQuery, setCustomerSearchQuery,
    customerGradeFilter, setCustomerGradeFilter,
    customerStatusFilter, setCustomerStatusFilter,
    isAddCustomerModalOpen, setIsAddCustomerModalOpen,
    newCustName, setNewCustName,
    newCustEmail, setNewCustEmail,
    newCustPhone, setNewCustPhone,
    newCustAddress, setNewCustAddress,
    newCustGrade, setNewCustGrade,
    newCustPoints, setNewCustPoints,
    newCustStatus, setNewCustStatus,
    editingCustomer, setEditingCustomer,
    editCustGrade, setEditCustGrade,
    editCustAddress, setEditCustAddress,
    editCustPointsDelta, setEditCustPointsDelta,
    editCustStatus, setEditCustStatus,
    handleAddCustomerSubmit,
    handleOpenEditCustomer,
    handleSaveEditCustomer,
    handleDeleteCustomer,
    handleExcelFileUpload,
    handleResetCustomerData,
    handleClearAllCustomers,
    newCustomersThisMonth
  } = useCustomers(triggerToast);`, ``
];

// 6. Timesale Block 1
const b6a_s = findLine('  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState("14");');
const b6a_e = findLine('  }, [secretSalesList]);', b6a_s);
const b6a_rep = [
`  const {
    adminTimeSaleHours, setAdminTimeSaleHours,
    adminTimeSaleMinutes, setAdminTimeSaleMinutes,
    adminTimeSaleDiscount, setAdminTimeSaleDiscount,
    adminTimeSaleTitle, setAdminTimeSaleTitle,
    adminTimeSaleStatus, setAdminTimeSaleStatus,
    adminTimeSaleCategory, setAdminTimeSaleCategory,
    adminTimeSaleProductIds, setAdminTimeSaleProductIds,
    secretSalesList, setSecretSalesList,
    newIsTimeSale, setNewIsTimeSale,
    newTimeSaleHours, setNewTimeSaleHours,
    newTimeSaleMinutes, setNewTimeSaleMinutes,
    newTimeSaleDiscountRate, setNewTimeSaleDiscountRate,
    timeSaleRemainingSec, setTimeSaleRemainingSec,
    isTimeSaleItemModalOpen, setIsTimeSaleItemModalOpen,
    timeSaleItemSearchQuery, setTimeSaleItemSearchQuery,
    timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter,
    productTimeSaleSettings, setProductTimeSaleSettings,
    productTimeSaleExpiries, setProductTimeSaleExpiries,
    formatRemainingTimeDisplay,
    handleSaveTimeSaleDetailSettings,
    handleToggleTimeSaleProduct,
    handleDeleteTimeSale
  } = useTimesale(triggerToast);`, ``
];

// Timesale Block 2
const b6b_s = findLine('  // Time sale states for new product modal');
const b6b_e = findLine('  const [newTimeSaleDiscountRate, setNewTimeSaleDiscountRate] = useState("35");', b6b_s);
const b6b_rep = [``, ``];

// Timesale Block 3
const b6c_s = findLine('  const [productTimeSaleSettings, setProductTimeSaleSettings]');
const b6c_e = findLine('    return {};', b6c_s) + 2; // skip return {}; and });
const b6c_rep = [``, ``];

// Timesale Block 4
const b6d_s = findLine('  const [productTimeSaleExpiries, setProductTimeSaleExpiries]');
const b6d_e = findLine('    return {};', b6d_s) + 2;
const b6d_rep = [``, ``];

// Timesale Block 5
const b6e_s = findLine('  const [timeSaleRemainingSec, setTimeSaleRemainingSec]');
const b6e_e = findLine('  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter]', b6e_s) - 1;
const b6e_rep = [``, ``];

// 7. Shipments
const b7_s = findLine('  // Shipment Management State & Handlers');
const b7_e = findLine('    return filteredShipments.slice(start, start + SHIPMENTS_PER_PAGE);', b7_s) + 1; // +1 for the `  }, [filteredShipments, shipmentPage]);`
const b7_rep = [
`  // Shipment Management State & Handlers
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
    paginatedShipments,
    handleOpenNewShipmentPostcode,
    handleOpenEditShipment,
    handleSaveEditShipment
  } = useShipments(triggerToast);`, ``
];

const replaces = [
  {s: b7_s, e: b7_e, rep: b7_rep, name: 'Shipments'},
  {s: b5_s, e: b5_e, rep: b5_rep, name: 'Customers'},
  {s: b6e_s, e: b6e_e, rep: b6e_rep, name: 'Timesale 5'},
  {s: b6d_s, e: b6d_e, rep: b6d_rep, name: 'Timesale 4'},
  {s: b4_s, e: b4_end_full, rep: b4_rep, name: 'Live Chat'},
  {s: b6c_s, e: b6c_e, rep: b6c_rep, name: 'Timesale 3'},
  {s: b6b_s, e: b6b_e, rep: b6b_rep, name: 'Timesale 2'},
  {s: b6a_s, e: b6a_e, rep: b6a_rep, name: 'Timesale 1'},
  {s: b3b_s, e: b3b_e, rep: b3b_rep, name: 'Inbound Fns'},
  {s: b3a_s, e: b3a_e, rep: b3a_rep, name: 'Inbound State'},
  {s: b2_s, e: b2_e, rep: b2_rep, name: 'Revenue'},
  {s: b1_s, e: b1_e, rep: b1_rep, name: 'Inquiries'}
];

replaces.sort((a, b) => b.s - a.s);

let newLines = [...lines];

let allGood = true;
for (const r of replaces) {
  if (r.s !== -1 && r.e !== -1 && r.e >= r.s) {
    const len = r.e - r.s + 1;
    if (r.rep[0] === '') {
      newLines.splice(r.s, len);
    } else {
      newLines.splice(r.s, len, ...r.rep[0].split('\n'));
    }
    console.log("Successfully replaced", r.name, "lines", r.s, "to", r.e);
  } else {
    console.log("Failed to find bounds for", r.name, r.s, r.e);
    allGood = false;
  }
}

if (!allGood) {
  console.error("Aborting, some bounds were missing.");
  process.exit(1);
}

let content = newLines.join('\n');
const imports = `import { useInquiries } from "@/hooks/admin/useInquiries";
import { useRevenue } from "@/hooks/admin/useRevenue";
import { useInboundSchedules } from "@/hooks/admin/useInboundSchedules";
import { useLiveChat } from "@/hooks/admin/useLiveChat";
import { useCustomers } from "@/hooks/admin/useCustomers";
import { useTimesale } from "@/hooks/admin/useTimesale";
import { useShipments } from "@/hooks/admin/useShipments";`;

if (!content.includes('import { useInquiries }')) {
  content = content.replace('import { Users, Search', imports + '\nimport { Users, Search');
}

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log("All blocks perfectly replaced without deleting interleaved state!");
