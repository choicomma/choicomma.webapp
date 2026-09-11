const fs = require('fs');

let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const target1Start = '  // Time sale states\n  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState("14");';
const target1End = '    window.dispatchEvent(new CustomEvent("secret_timesales_updated"));\n    }\n  }, [secretSalesList]);\n';

const idx1Start = content.indexOf(target1Start);
const idx1End = content.indexOf(target1End);

if (idx1Start === -1 || idx1End === -1) {
  console.log("Could not find block 1.", idx1Start, idx1End);
  process.exit(1);
}

// Remove block 1
content = content.slice(0, idx1Start) + content.slice(idx1End + target1End.length);

const triggerToastFunc = `  function triggerToast(msg: string) {\n    setToastMessage(msg);\n    setTimeout(() => {\n      setToastMessage(null);\n    }, 3000);\n  }\n`;
const hookCall = `
  // Timesale State — extracted to useTimesale hook
  const {
    adminTimeSaleHours, setAdminTimeSaleHours,
    adminTimeSaleMinutes, setAdminTimeSaleMinutes,
    adminTimeSaleDiscount, setAdminTimeSaleDiscount,
    adminTimeSaleTitle, setAdminTimeSaleTitle,
    adminTimeSaleStatus, setAdminTimeSaleStatus,
    adminTimeSaleCategory, setAdminTimeSaleCategory,
    adminTimeSaleProductIds, setAdminTimeSaleProductIds,
    secretSalesList, setSecretSalesList,
    nowTick,
    productTimeSaleSettings, setProductTimeSaleSettings,
    productTimeSaleExpiries, setProductTimeSaleExpiries,
    timeSaleRemainingSec, setTimeSaleRemainingSec,
    formatRemainingTimeDisplay,
    getProductTimeSetting,
    handleUpdateProductTimeSetting,
    isTimeSaleItemModalOpen, setIsTimeSaleItemModalOpen,
    timeSaleItemSearchQuery, setTimeSaleItemSearchQuery,
    timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter,
    newIsTimeSale, setNewIsTimeSale,
    newTimeSaleHours, setNewTimeSaleHours,
    newTimeSaleMinutes, setNewTimeSaleMinutes,
    newTimeSaleDiscountPrice, setNewTimeSaleDiscountPrice,
    newTimeSaleDiscountRate, setNewTimeSaleDiscountRate,
    newTimeSaleStartMonth, setNewTimeSaleStartMonth,
    newTimeSaleStartDay, setNewTimeSaleStartDay,
    newTimeSaleStartAmpm, setNewTimeSaleStartAmpm,
    newTimeSaleStartHour, setNewTimeSaleStartHour,
    newTimeSaleStartMinute, setNewTimeSaleStartMinute,
    newTimeSaleEndMonth, setNewTimeSaleEndMonth,
    newTimeSaleEndDay, setNewTimeSaleEndDay,
    newTimeSaleEndAmpm, setNewTimeSaleEndAmpm,
    newTimeSaleEndHour, setNewTimeSaleEndHour,
    newTimeSaleEndMinute, setNewTimeSaleEndMinute,
    editTimeSaleStartMonth, setEditTimeSaleStartMonth,
    editTimeSaleStartDay, setEditTimeSaleStartDay,
    editTimeSaleStartAmpm, setEditTimeSaleStartAmpm,
    editTimeSaleStartHour, setEditTimeSaleStartHour,
    editTimeSaleStartMinute, setEditTimeSaleStartMinute,
    editTimeSaleEndMonth, setEditTimeSaleEndMonth,
    editTimeSaleEndDay, setEditTimeSaleEndDay,
    editTimeSaleEndAmpm, setEditTimeSaleEndAmpm,
    editTimeSaleEndHour, setEditTimeSaleEndHour,
    editTimeSaleEndMinute, setEditTimeSaleEndMinute,
  } = useTimesale(triggerToast);
`;

const triggerToastIdx = content.indexOf(triggerToastFunc);
if (triggerToastIdx === -1) {
  console.log("Could not find triggerToast function.");
  process.exit(1);
}

content = content.slice(0, triggerToastIdx + triggerToastFunc.length) + hookCall + content.slice(triggerToastIdx + triggerToastFunc.length);

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log("Fixed page.tsx perfectly!");
