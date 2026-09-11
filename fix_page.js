const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// Find the index of "stock: calculateTotalStock(prod.colors"
const startIndex = content.indexOf('stock: calculateTotalStock(prod.colors');
// Find the index of "const [mainSelectMode, setMainSelectMode]"
const endIndex = content.indexOf('const [mainSelectMode, setMainSelectMode]');

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index.");
  process.exit(1);
}

const beforeStr = content.slice(0, startIndex);
const afterStr = content.slice(endIndex);

const replacement = `stock: calculateTotalStock(prod.colors || ["BLACK"], prod.sizes || ["FREE"], updatedStockMap),
            };
          }
          return prod;
        })
      );
      triggerToast(\`입고 완료! '\${targetItem.productTitle}' 수량(+\${targetItem.quantity}개)이 실시간 재고에 자동 연동되었습니다.\`);
    } else {
      triggerToast(\`입고 상태가 [\${nextText}] (으)로 변경되었습니다.\`);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [productSortOrder, setProductSortOrder] = useState<"productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom">("productNoDesc");
  const [topSellerFilter, setTopSellerFilter] = useState<"all" | "topSeller" | "normal">("all");
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

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

fs.writeFileSync('app/admin/page.tsx', beforeStr + replacement + afterStr, 'utf8');
console.log("Successfully fixed app/admin/page.tsx");
