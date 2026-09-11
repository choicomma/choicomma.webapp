const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const startTarget = '  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {';
const endTarget = '  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");\n';

const startIndex = content.indexOf(startTarget);
let endIndex = content.indexOf(endTarget);

if (startIndex !== -1 && endIndex !== -1) {
  endIndex += endTarget.length;
  const beforeStr = content.slice(0, startIndex);
  const afterStr = content.slice(endIndex);

  content = beforeStr + afterStr;
  fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
  console.log("Successfully removed duplicated timesale block.");
} else {
  console.log("Could not find start or end target for duplicated timesale block.");
  console.log("start:", startIndex, "end:", endIndex);
}
