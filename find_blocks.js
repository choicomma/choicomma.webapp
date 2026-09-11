const fs = require('fs');
const lines = fs.readFileSync('app/admin/page.tsx', 'utf8').split('\n');

function findLine(prefix, startIdx = 0) {
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes(prefix)) return i;
  }
  return -1;
}

const b1_start = findLine('  // VIP Customer Inquiry State');
const b1_end = findLine('  // Revenue Management State', b1_start) - 1; // skip empty line

const b2_start = findLine('  // Revenue Management State');
const b2_end = findLine('  const [revenueSearchQuery, setRevenueSearchQuery] = useState("");', b2_start);

const b3_start = findLine('  // Inbound Schedules State');
const b3_end = findLine('  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState', b3_start) - 2;

const b4_start = findLine('  // Customer Management State');
const b4_end = findLine('  // Shipment Management State & Handlers', b4_start) - 2;

const b5_start = findLine('  // Live Chat Admin State & Storage Sync');
const b5_end = findLine('  const [productTimeSaleExpiries, setProductTimeSaleExpiries]', b5_start) - 2;

const b6_start = findLine('  // Shipment Management State & Handlers');
const b6_end = findLine('    paginatedShipments,', b6_start) + 2; 
// Wait, shipments end is not paginatedShipments, paginatedShipments is used in the hook return.
// Let's find exactly the end of the shipments state before whatever is next.

console.log({b1_start, b1_end, b2_start, b2_end, b3_start, b3_end, b4_start, b4_end, b5_start, b5_end, b6_start});
