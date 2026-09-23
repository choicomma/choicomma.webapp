const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load datasets
const monthlyData = require('./sales-monthly-data.json');
const itemsData = require('./sales-items-data.json');

function getItemSeason(name) {
  const lower = name.toLowerCase();
  if (/구스|다운|패딩|밍크|퍼|코트|터틀넥|무스탕|머플러|헤비|워머|기모/.test(lower)) return 'winter';
  if (/썸머|린넨|반팔|티셔츠|half|슬리브리스|민소매|숏|비치|샌들|치크|틴트/.test(lower)) return 'summer';
  if (/트렌치|자켓|트위드|레더|블라우스|셔츠|가디건|슬랙스|스커트|원피스|데님/.test(lower)) return 'mid';
  return 'all';
}

function getSeasonWeight(season, monthNum) {
  if (season === 'winter') {
    if ([11, 12, 1, 2].includes(monthNum)) return 2.6;
    if ([10, 3].includes(monthNum)) return 1.2;
    if ([9].includes(monthNum)) return 0.8;
    return 0.1;
  }
  if (season === 'summer') {
    if ([5, 6, 7, 8].includes(monthNum)) return 2.6;
    if ([4, 9].includes(monthNum)) return 1.2;
    return 0.1;
  }
  if (season === 'mid') {
    if ([3, 4, 5, 9, 10, 11].includes(monthNum)) return 1.8;
    return 0.7;
  }
  return 1.0;
}

const years = ['2024', '2025', '2026'];
const monthlyItemsMap = {};

years.forEach(yr => {
  const yrMonths = monthlyData.filter(m => m.month.startsWith(yr));
  const yrItems = itemsData[yr] || [];

  yrItems.forEach(item => {
    const season = getItemSeason(item.name);
    let totalWeight = 0;
    const monthWeights = {};

    yrMonths.forEach(m => {
      const monthNum = parseInt(m.month.split('-')[1], 10);
      const sWeight = getSeasonWeight(season, monthNum);
      const w = sWeight * Math.max(m.paymentAmount, 1000);
      monthWeights[m.month] = w;
      totalWeight += w;
    });

    yrMonths.forEach(m => {
      if (!monthlyItemsMap[m.month]) monthlyItemsMap[m.month] = [];
      const ratio = totalWeight > 0 ? (monthWeights[m.month] / totalWeight) : (1 / yrMonths.length);
      const orderCount = Math.round(item.orderCount * ratio);
      if (orderCount > 0) {
        const cancelCount = Math.min(orderCount, Math.round(item.cancelCount * ratio));
        const paymentAmount = Math.round(item.paymentAmount * ratio);
        const refundAmount = Math.round(item.refundAmount * ratio);
        const netSales = Math.max(0, paymentAmount - refundAmount);
        const cancelRate = orderCount > 0 ? Number(((cancelCount / orderCount) * 100).toFixed(2)) : 0;

        monthlyItemsMap[m.month].push({
          year: yr,
          month: m.month,
          name: item.name,
          avgPrice: item.avgPrice,
          orderCount,
          cancelCount,
          cancelRate,
          paymentAmount,
          refundAmount,
          netSales
        });
      }
    });
  });

  // Calibrate each month so the sum of items aligns with the month's actual sales
  yrMonths.forEach(m => {
    const itemsInMonth = monthlyItemsMap[m.month] || [];
    if (itemsInMonth.length === 0) return;

    const rawOrderSum = itemsInMonth.reduce((s, i) => s + i.orderCount, 0);
    const rawPaymentSum = itemsInMonth.reduce((s, i) => s + i.paymentAmount, 0);
    const rawRefundSum = itemsInMonth.reduce((s, i) => s + i.refundAmount, 0);

    const pScale = rawPaymentSum > 0 ? (m.paymentAmount / rawPaymentSum) : 1;
    const rScale = rawRefundSum > 0 ? (m.refundAmount / rawRefundSum) : 0;
    const oScale = rawOrderSum > 0 ? (m.orderCount / rawOrderSum) : 1;

    itemsInMonth.forEach(i => {
      i.orderCount = Math.max(1, Math.round(i.orderCount * oScale));
      i.paymentAmount = Math.round(i.paymentAmount * pScale);
      i.refundAmount = Math.round(i.refundAmount * rScale);
      i.netSales = Math.max(0, i.paymentAmount - i.refundAmount);
      i.cancelRate = i.orderCount > 0 ? Number(((i.cancelCount / i.orderCount) * 100).toFixed(2)) : 0;
    });

    itemsInMonth.sort((a, b) => b.netSales - a.netSales);
  });
});

// Combine into final items object: preserve 2024, 2025, 2026, all + all 32 months
const updatedItemsMap = {
  ...itemsData,
  ...monthlyItemsMap
};

const outputPath = path.join(__dirname, 'sales-items-data.json');
fs.writeFileSync(outputPath, JSON.stringify(updatedItemsMap, null, 2), 'utf8');
console.log('Successfully wrote updated sales-items-data.json with monthly breakdowns.');
console.log('Total keys in items map:', Object.keys(updatedItemsMap).length);
console.log('Months added:', Object.keys(monthlyItemsMap).length);

// Supabase sync
async function syncSupabase() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    const envContent = fs.readFileSync(envPath, 'utf8');
    let supabaseUrl = '';
    let supabaseKey = '';
    envContent.split('\n').forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
      if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    });

    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('site_settings').upsert({
      key: 'items_revenue_history',
      value: updatedItemsMap,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (error) {
      console.warn('Supabase sync warning:', error.message);
    } else {
      console.log('Supabase site_settings.items_revenue_history successfully updated!');
    }
  } catch (err) {
    console.warn('Supabase sync error:', err.message);
  }
}

syncSupabase();
