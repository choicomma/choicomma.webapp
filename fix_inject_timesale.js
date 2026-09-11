const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

// Block 1
const start1 = '  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState("14");';
const end1 = '  const [secretSalesList, setSecretSalesList] = useState<any[]>(() => {';
const end1b = '  }, [secretSalesList]);\n';

const idx1 = content.indexOf(start1);
const idxEnd1_start = content.indexOf(end1);
const idxEnd1 = content.indexOf(end1b, idxEnd1_start);

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
  } = useTimesale(triggerToast);\n` + content.slice(idxEnd1 + end1b.length);
  console.log("Block 1 fixed");
} else {
  console.log("Block 1 failed", idx1, idxEnd1);
}

// Block 2
const start2 = '  // Time sale states for new product modal';
const end2 = '  const [newTimeSaleDiscountRate, setNewTimeSaleDiscountRate] = useState("35");\n';
const idx2 = content.indexOf(start2);
const idxEnd2 = content.indexOf(end2);
if (idx2 !== -1 && idxEnd2 !== -1) {
  content = content.slice(0, idx2) + content.slice(idxEnd2 + end2.length);
  console.log("Block 2 fixed");
} else {
  console.log("Block 2 failed", idx2, idxEnd2);
}

// Block 3
const start3 = '  const [productTimeSaleSettings, setProductTimeSaleSettings] = useState<Record<string, {';
const endFunc3 = '  const handleDeleteTimeSale = (productId: string) => {';
const idx3 = content.indexOf(start3);
const idxEndFunc3 = content.indexOf(endFunc3, idx3);
if (idx3 !== -1 && idxEndFunc3 !== -1) {
  const nextLine = content.indexOf('\n', idxEndFunc3);
  const endIdx3 = content.indexOf('  };\n', nextLine);
  if (endIdx3 !== -1) {
    content = content.slice(0, idx3) + content.slice(endIdx3 + 5);
    console.log("Block 3 fixed");
  } else {
    console.log("Block 3 endIdx3 failed");
  }
} else {
  console.log("Block 3 failed", idx3, idxEndFunc3);
}

// Block 4
const start4 = '  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {';
const end4 = '  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");\n';
const idx4 = content.indexOf(start4);
const idxEnd4 = content.indexOf(end4);
if (idx4 !== -1 && idxEnd4 !== -1) {
  content = content.slice(0, idx4) + content.slice(idxEnd4 + end4.length);
  console.log("Block 4 fixed");
} else {
  console.log("Block 4 failed", idx4, idxEnd4);
}

if (!content.includes('import { useTimesale }')) {
  content = content.replace('import { useShipments }', 'import { useShipments }\nimport { useTimesale } from "@/hooks/admin/useTimesale";');
}

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log("Timesale blocks script completed");
