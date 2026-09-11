const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// Fix Inbound
content = content.replace(
  'isInboundModalOpen, setIsInboundModalOpen,',
  'isInboundModalOpen, setIsInboundModalOpen,\n    isAddInboundModalOpen, setIsAddInboundModalOpen,\n    calendarDate, setCalendarDate,\n    inboundSearchQuery, setInboundSearchQuery,\n    newInboundTitle, setNewInboundTitle,\n    newInboundWarehouse, setNewInboundWarehouse,\n    newInboundDate, setNewInboundDate,\n    handleUpdateInboundStatus,\n    handleAddInboundSchedule,'
);

// Fix LiveChat
content = content.replace(
  'handleAdminClearLiveChat',
  'handleAdminClearLiveChat,\n    isLiveChatSessionEnded,\n    activeSessionMessages,\n    handleAdminEndLiveChat'
);

// Fix Timesale
content = content.replace(
  'newTimeSaleDiscountRate, setNewTimeSaleDiscountRate,',
  'newTimeSaleDiscountRate, setNewTimeSaleDiscountRate,\n    newTimeSaleDiscountPrice, setNewTimeSaleDiscountPrice,'
);

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('Fixed missing destructuring.');
