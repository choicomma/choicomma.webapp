const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// Block 1
const start1 = '  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState("");';
const end1 = '  const [secretSalesList, setSecretSalesList] = useState<any[]>([]);';
const idx1 = content.indexOf(start1);
const idxEnd1 = content.indexOf(end1) + end1.length;
if (idx1 !== -1 && idxEnd1 !== -1) {
  content = content.slice(0, idx1) + `  const {
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
  } = useTimesale(triggerToast);` + content.slice(idxEnd1);
}

// Block 2
const start2 = '  const [newIsTimeSale, setNewIsTimeSale] = useState(false);';
const end2 = '  const [newTimeSaleDiscountRate, setNewTimeSaleDiscountRate] = useState("");';
const idx2 = content.indexOf(start2);
const idxEnd2 = content.indexOf(end2) + end2.length;
if (idx2 !== -1 && idxEnd2 !== -1) {
  content = content.slice(0, idx2) + content.slice(idxEnd2);
}

// Block 3
const start3 = '  const [productTimeSaleSettings, setProductTimeSaleSettings] = useState<Record<string, any>>({});';
const end3 = '  };';
// Wait, the end of Block 3 is handleDeleteTimeSale
const idx3 = content.indexOf(start3);
const endFunc3 = '  const handleDeleteTimeSale = (productId: string) => {';
const endFuncIdx3 = content.indexOf(endFunc3, idx3);
if (idx3 !== -1 && endFuncIdx3 !== -1) {
  const nextLine = content.indexOf('\n', endFuncIdx3);
  // find the end of the function
  const endIdx3 = content.indexOf('  };\n', nextLine) + 5;
  content = content.slice(0, idx3) + content.slice(endIdx3);
}

// Block 4
const start4 = '  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {';
const end4 = '  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");\n';
const idx4 = content.indexOf(start4);
const endIdx4 = content.indexOf(end4) + end4.length;
if (idx4 !== -1 && endIdx4 !== -1) {
  content = content.slice(0, idx4) + content.slice(endIdx4);
}

if (!content.includes('import { useTimesale }')) {
  content = content.replace('import { useShipments }', 'import { useShipments }\nimport { useTimesale } from "@/hooks/admin/useTimesale";');
}

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log("Timesale blocks replaced");
