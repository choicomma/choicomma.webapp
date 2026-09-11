const fs = require('fs');
const { execSync } = require('child_process');

const headContent = execSync('git show HEAD:app/admin/page.tsx').toString('utf8');
const startAnchor = '  const handleOpenNewShipmentPostcode = () => {';
const startIndex = headContent.indexOf(startAnchor);
const returnStr = '  return (';
const endIndex = headContent.indexOf(returnStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const missingChunk = headContent.slice(startIndex, endIndex);
  fs.writeFileSync('missing_chunk.ts', missingChunk, 'utf8');
  console.log("Extracted missing chunk successfully");
} else {
  console.log("Could not find anchors");
}
