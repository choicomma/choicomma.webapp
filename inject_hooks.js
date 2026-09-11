const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

function replaceBlock(startAnchor, endFuncAnchor, replacement) {
  const startIdx = content.indexOf(startAnchor);
  const endFuncIdx = content.indexOf(endFuncAnchor);
  if (startIdx !== -1 && endFuncIdx !== -1) {
    const nextFuncMatch = content.indexOf('  const', endFuncIdx + endFuncAnchor.length);
    let endIdx = nextFuncMatch !== -1 ? nextFuncMatch : content.indexOf('  return (', endFuncIdx);
    
    // For specific cases where we need to find the exact end of the block
    if (endFuncAnchor === '  const [revenueSearchQuery, setRevenueSearchQuery] = useState("");') {
      endIdx = content.indexOf('\n', endFuncIdx) + 1;
    }
    
    content = content.slice(0, startIdx) + replacement + '\n' + content.slice(endIdx);
    return true;
  }
  return false;
}

// 1. useInquiries
replaceBlock(
  '  // VIP Customer Inquiry State',
  '  const handleReplyToInquiry = (id: string, reply: string) => {',
  `  // VIP Customer Inquiry State
  const {
    inquiriesList, setInquiriesList,
    zoomedInquiryImage, setZoomedInquiryImage,
    inquiriesFilter, setInquiriesFilter,
    handleReplyToInquiry
  } = useInquiries(triggerToast);`
);

// 2. useRevenue
replaceBlock(
  '  // Revenue Management State',
  '  const [revenueSearchQuery, setRevenueSearchQuery] = useState("");',
  `  // Revenue Management State
  const {
    revenueSelectedYear, setRevenueSelectedYear,
    revenueSelectedMonth, setRevenueSelectedMonth,
    revenueFilterPeriod, setRevenueFilterPeriod,
    revenueStatusFilter, setRevenueStatusFilter,
    revenueSearchQuery, setRevenueSearchQuery
  } = useRevenue();`
);

// 3. useInboundSchedules
replaceBlock(
  '  // Inbound Schedules State',
  '  const handleDeleteInboundSchedule = (id: string) => {',
  `  // Inbound Schedules State
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
  } = useInboundSchedules();` // Note: useInboundSchedules hook probably doesn't take triggerToast, or does it?
);

// 4. useLiveChat
replaceBlock(
  '  // Live Chat Admin State',
  '  const handleEndLiveChatSession = (sessionId: string) => {',
  `  // Live Chat Admin State
  const {
    adminLiveChatMessages, setAdminLiveChatMessages,
    adminLiveInput, setAdminLiveInput,
    activeSessionId, setActiveSessionId,
    chatSessionsList, setChatSessionsList,
    handleAdminSendLiveChat,
    handleEndLiveChatSession
  } = useLiveChat();`
);

// 5. useCustomers
replaceBlock(
  '  // Customer Management State',
  '  const handleClearAllCustomers = () => {',
  `  // Customer Management State
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
  } = useCustomers(triggerToast);`
);

// 6. useShipments
replaceBlock(
  '  // Shipment Management State & Handlers',
  '  const handleSaveEditShipment = (e: React.FormEvent) => {',
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
  } = useShipments(triggerToast);`
);

// Add imports
const imports = `import { useInquiries } from "@/hooks/admin/useInquiries";
import { useRevenue } from "@/hooks/admin/useRevenue";
import { useInboundSchedules } from "@/hooks/admin/useInboundSchedules";
import { useLiveChat } from "@/hooks/admin/useLiveChat";
import { useCustomers } from "@/hooks/admin/useCustomers";
import { useShipments } from "@/hooks/admin/useShipments";`;

content = content.replace('import { Users, Search', imports + '\nimport { Users, Search');

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log("Hooks 1-5 and 7 injected");
