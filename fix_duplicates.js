const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const target1 = `  const handleDeleteInboundSchedule = (id: string) => {
    if (!window.confirm("정말로 해당 입고 일정을 삭제하시겠습니까?")) return;
    setInboundSchedulesList(inboundSchedulesList.filter((item) => item.id !== id));
    if (selectedInboundItem?.id === id) setSelectedInboundItem(null);
    triggerToast("입고 일정이 삭제되었습니다.");
  };\n`;

// Fuzzy replace for handleDeleteInboundSchedule
const idx1 = content.lastIndexOf('  const handleDeleteInboundSchedule = (id: string) => {');
if (idx1 !== -1) {
  // Find the end of this function. It ends at `  };\n` before `  const [ordersList`
  const endIdx1 = content.indexOf('  };\n', idx1);
  if (endIdx1 !== -1) {
    content = content.slice(0, idx1) + content.slice(endIdx1 + 5);
  }
}

// target2: Duplicate timesale block
const target2Start = '  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {';
const target2End = '  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");\n';
const idx2 = content.lastIndexOf(target2Start);
const endIdx2 = content.lastIndexOf(target2End);

if (idx2 !== -1 && endIdx2 !== -1 && endIdx2 > idx2) {
  content = content.slice(0, idx2) + content.slice(endIdx2 + target2End.length);
}

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log("Fixed duplicates");
