#!/usr/bin/env bash
set -u
cd /home/z/my-project

# Start fresh: wipe hospital data to simulate the broken state, then verify
# the dashboard auto-reseeds and loads after login WITHOUT manual regenerate.
echo "### Wiping hospital data to simulate empty/broken state..."
bun run scripts/wipe-hospital-data.ts 2>&1 | grep -v "^prisma:query" | tail -3

pkill -9 -f next 2>/dev/null
sleep 2
rm -f dev.log
setsid bash -c 'node_modules/.bin/next dev -p 3000 > dev.log 2>&1' </dev/null >/dev/null 2>&1 &
for i in $(seq 1 30); do
  curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null && break
  sleep 1
done
echo "server up: $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:3000/)"

AB="agent-browser"
$AB close >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB network requests --clear >/dev/null 2>&1
$AB set viewport 1280 820 >/dev/null 2>&1

echo ""
echo "### 1. Login via autofill (NO manual regenerate) ###"
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 600 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1
$AB screenshot /tmp/db-01-dashboard.png >/dev/null 2>&1

echo "error state shown? $($AB eval "document.body.innerText.includes('Failed to load') ? 'YES (BAD)' : 'NO (GOOD)'" 2>/dev/null)"
echo "dashboard data present?"
$AB eval "(()=>{const t=document.body.innerText.toLowerCase();const has=t.includes('ward occupancy')&&t.includes('icu occupancy')&&t.includes('available beds')&&t.includes('resource gap');return has ? 'YES ✓ — dashboard auto-loaded with data' : 'NO: '+(t.includes('dashboard')?'shell only, data missing':'auth')})()" 2>/dev/null
echo "alert banner present? $($AB eval "document.body.innerText.toLowerCase().includes('capacity pressure') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "charts rendered? $($AB eval "document.querySelectorAll('.recharts-surface').length + ' surfaces'" 2>/dev/null)"
echo "network dashboard request: $($AB network requests 2>&1 | grep -iE 'dashboard' | head -1)"

echo ""
echo "### 2. Navigate to Forecast view (verify data loads there too) ###"
$AB find role button click --name "Forecast" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/db-02-forecast.png >/dev/null 2>&1
echo "forecast view: $($AB eval "document.body.innerText.toLowerCase().includes('demand forecast') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "forecast table rows: $($AB eval "document.querySelectorAll('table tbody tr').length" 2>/dev/null)"

echo ""
echo "### 3. Navigate to Departments view ###"
$AB find role button click --name "Departments" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/db-03-departments.png >/dev/null 2>&1
echo "depts present: $($AB eval "['Emergency','ICU','General Ward','Pediatrics'].filter(d=>document.body.innerText.includes(d)).join(',')" 2>/dev/null)"

echo ""
echo "### 4. Navigate to Alerts view ###"
$AB find role button click --name "Alerts" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/db-04-alerts.png >/dev/null 2>&1
echo "alerts view: $($AB eval "document.body.innerText.toLowerCase().includes('capacity alert')||document.body.innerText.includes('No capacity alerts') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "### 5. Regenerate button still works (manual) ###"
$AB find role button click --name "Dashboard" >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB find role button click --name "Regenerate data" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/db-05-after-regenerate.png >/dev/null 2>&1
echo "after regenerate: $($AB eval "document.body.innerText.toLowerCase().includes('ward occupancy') ? 'dashboard still loaded ✓' : 'BROKEN'" 2>/dev/null)"

echo ""
echo "### 6. Console errors ###"
$AB errors 2>&1 | head -5

echo ""
echo "### 7. DB final state ###"
bun -e "const {db}=require('./src/lib/db');(async()=>{console.log('hospitalDaily:',await db.hospitalDaily.count());console.log('departmentDaily:',await db.departmentDaily.count());process.exit(0)})()" 2>&1 | grep -E "hospitalDaily|departmentDaily"

echo ""
echo "### DONE ###"
$AB close >/dev/null 2>&1 || true
