const fs = require('fs');

// 1. Fix initialShipments mock data
const pageContent = fs.readFileSync('app/admin/page.tsx', 'utf8');
const initialStart = pageContent.indexOf('const initialShipments: any[] = [');
const initialEnd = pageContent.indexOf('// Revenue Management State');
if (initialStart !== -1 && initialEnd !== -1) {
  const dataLines = pageContent.slice(initialStart, initialEnd);
  // find the end of the array `];\n`
  const lastBracket = dataLines.lastIndexOf('];');
  if (lastBracket !== -1) {
    const dataString = dataLines.slice(0, lastBracket + 2).replace('const initialShipments: any[] =', 'export const initialShipments: any[] =');
    if (!fs.existsSync('lib/sfcc/mock')) fs.mkdirSync('lib/sfcc/mock', { recursive: true });
    fs.writeFileSync('lib/sfcc/mock/shipments-data.ts', dataString, 'utf8');
  }
}

// 2. Fix useShipments.ts missing functions and exports
let hookContent = fs.readFileSync('hooks/admin/useShipments.ts', 'utf8');

// Change import to .ts
hookContent = hookContent.replace('import initialShipments from "@/lib/sfcc/mock/shipments-data.json";', 'import { initialShipments } from "@/lib/sfcc/mock/shipments-data";');

const missingChunk = fs.readFileSync('missing_chunk.ts', 'utf8');

// The missing functions need to be inserted before the return statement
const returnIndex = hookContent.indexOf('  return {');
if (returnIndex !== -1) {
  const beforeReturn = hookContent.slice(0, returnIndex);
  const afterReturn = hookContent.slice(returnIndex);
  
  // Add missing exports to the return object
  const newExports = `
    handleOpenNewShipmentPostcode,
    handleOpenEditShipment,
    handleSaveEditShipment,`;
  
  const modifiedReturn = afterReturn.replace('    handleDeleteShipment,', `    handleDeleteShipment,${newExports}`);
  
  hookContent = beforeReturn + missingChunk + modifiedReturn;
  fs.writeFileSync('hooks/admin/useShipments.ts', hookContent, 'utf8');
}

// 3. Fix page.tsx destructuring
let pageNewContent = fs.readFileSync('app/admin/page.tsx', 'utf8');
const pageDestructuringStr = `    handleDeleteShipment,`;
const newPageDestructuringStr = `    handleDeleteShipment,
    handleOpenNewShipmentPostcode,
    handleOpenEditShipment,
    handleSaveEditShipment,`;

pageNewContent = pageNewContent.replace(pageDestructuringStr, newPageDestructuringStr);
fs.writeFileSync('app/admin/page.tsx', pageNewContent, 'utf8');

console.log("Fixed all shipment issues");
