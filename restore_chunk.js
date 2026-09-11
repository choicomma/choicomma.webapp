const fs = require('fs');
const { execSync } = require('child_process');

// 1. Get HEAD content
const headContent = execSync('git show HEAD:app/admin/page.tsx').toString('utf8');

// 2. Extract the missing chunk from HEAD
const startAnchor = 'stock: calculateTotalStock(prod.colors';
const endAnchor = '  const [mainSelectMode, setMainSelectMode] = useState<"hero" | "bottom">("hero");';

const headStartIndex = headContent.indexOf(startAnchor);
const headEndIndex = headContent.indexOf(endAnchor);

if (headStartIndex === -1 || headEndIndex === -1) {
  console.log("Anchors not found in HEAD");
  process.exit(1);
}

const chunkToRestore = headContent.slice(headStartIndex, headEndIndex);

// 3. Replace in current file
let currentContent = fs.readFileSync('app/admin/page.tsx', 'utf8');

const currStartIndex = currentContent.indexOf(startAnchor);
const currEndIndex = currentContent.indexOf(endAnchor);

if (currStartIndex === -1 || currEndIndex === -1) {
  console.log("Anchors not found in current file");
  process.exit(1);
}

// Slice before and after, then inject the restored chunk
const beforeStr = currentContent.slice(0, currStartIndex);
const afterStr = currentContent.slice(currEndIndex);

currentContent = beforeStr + chunkToRestore + afterStr;
fs.writeFileSync('app/admin/page.tsx', currentContent, 'utf8');
console.log("Restored chunk from HEAD successfully.");
