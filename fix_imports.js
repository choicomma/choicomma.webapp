const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const imports = `import { useInquiries } from "@/hooks/admin/useInquiries";
import { useRevenue } from "@/hooks/admin/useRevenue";
import { useInboundSchedules } from "@/hooks/admin/useInboundSchedules";
import { useLiveChat } from "@/hooks/admin/useLiveChat";
import { useCustomers } from "@/hooks/admin/useCustomers";
import { useTimesale } from "@/hooks/admin/useTimesale";
import { useShipments } from "@/hooks/admin/useShipments";`;

if (!content.includes('import { useInquiries }')) {
  content = content.replace('import Link from "next/link";', 'import Link from "next/link";\n' + imports);
}

// Remove remaining TimeSale declarations
content = content.replace(/  const \[timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter\] = useState\("all"\);\r?\n/g, '');
content = content.replace(/  const handleSaveTimeSaleDetailSettings = \(e: React\.FormEvent\) => \{[\s\S]*?  \};\r?\n/g, '');
content = content.replace(/  const handleToggleTimeSaleProduct = \(pId: string\) => \{[\s\S]*?  \};\r?\n/g, '');

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('Fixed imports and lingering variables.');
