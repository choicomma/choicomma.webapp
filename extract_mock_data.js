const fs = require('fs');
const { execSync } = require('child_process');
const headContent = execSync('git show HEAD:app/admin/page.tsx').toString('utf8');
const initialStart = headContent.indexOf('const initialShipments: any[] = [');
const initialEnd = headContent.indexOf('// Revenue Management State');
if (initialStart !== -1 && initialEnd !== -1) {
  const dataLines = headContent.slice(initialStart, initialEnd);
  const lastBracket = dataLines.lastIndexOf('];');
  if (lastBracket !== -1) {
    const dataString = dataLines.slice(0, lastBracket + 2).replace('const initialShipments: any[] =', 'export const initialShipments: any[] =');
    if (!fs.existsSync('lib/sfcc/mock')) fs.mkdirSync('lib/sfcc/mock', { recursive: true });
    fs.writeFileSync('lib/sfcc/mock/shipments-data.ts', dataString, 'utf8');
    console.log("Extracted shipments-data.ts");
  }
}
