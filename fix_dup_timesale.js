const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const targetStart = '  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {';
const targetEnd = '  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");';

const idxStart = content.lastIndexOf(targetStart);
const idxEnd = content.lastIndexOf(targetEnd);

if (idxStart !== -1 && idxEnd !== -1 && idxEnd > idxStart) {
  // Find the end of the targetEnd line
  const endOfLine = content.indexOf('\n', idxEnd);
  const endSlice = endOfLine !== -1 ? endOfLine + 1 : idxEnd + targetEnd.length;
  
  content = content.slice(0, idxStart) + content.slice(endSlice);
  fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
  console.log("Fixed duplicate timesale block");
} else {
  console.log("Could not find start or end for duplicate timesale block");
  console.log("start:", idxStart, "end:", idxEnd);
}
