const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

if (!content.includes('import { useShipments }')) {
  const importAnchor = 'import { useLiveChat } from "@/hooks/admin/useLiveChat";';
  if (content.includes(importAnchor)) {
    content = content.replace(importAnchor, importAnchor + '\nimport { useShipments } from "@/hooks/admin/useShipments";');
    fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
    console.log("Added import");
  } else {
    // try useCustomers
    const importAnchor2 = 'import { useCustomers } from "@/hooks/admin/useCustomers";';
    content = content.replace(importAnchor2, importAnchor2 + '\nimport { useShipments } from "@/hooks/admin/useShipments";');
    fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
    console.log("Added import fallback");
  }
}
