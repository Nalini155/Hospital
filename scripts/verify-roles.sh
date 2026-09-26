#!/usr/bin/env bash
set -u
cd /home/z/my-project

pkill -9 -f next 2>/dev/null
sleep 2
rm -f dev.log
setsid bash -c 'node_modules/.bin/next dev -p 3000 > dev.log 2>&1' </dev/null >/dev/null 2>&1 &
for i in $(seq 1 40); do
  curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null && break
  sleep 1
done
echo "server up: $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:3000/)"
# seed demo + hospital data
curl -s -o /dev/null -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@careflow.health","password":"careflow123"}' -c /tmp/cf.txt
curl -s -o /dev/null -X POST http://localhost:3000/api/data/historical -b /tmp/cf.txt

AB="agent-browser"
$AB close >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB network requests --clear >/dev/null 2>&1
$AB set viewport 1280 820 >/dev/null 2>&1

echo ""
echo "=== 1. Demo Reception login → simplified dashboard ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
# Fill demo reception creds via native setter
$AB eval "((sel,val)=>{const i=document.querySelector(sel);const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,val);i.dispatchEvent(new Event('input',{bubbles:true}));return i.value})('input[type=email]','reception@careflow.health')" >/dev/null 2>&1
$AB eval "((sel,val)=>{const i=document.querySelector(sel);const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,val);i.dispatchEvent(new Event('input',{bubbles:true}));return i.value})('input[type=password]','reception123')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 9000 >/dev/null 2>&1
$AB screenshot /tmp/role-reception-dashboard.png >/dev/null 2>&1
echo "page state: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('reception dashboard'))return 'RECEPTION DASHBOARD ✓';if(t.includes('ward occupancy'))return 'FULL DASHBOARD (WRONG)';return 'other: '+t.slice(0,60)})()" 2>/dev/null)"
echo "sidebar items: $($AB eval "Array.from(document.querySelectorAll('aside nav button, aside nav div')).map(e=>e.textContent.trim()).filter(Boolean).join(' | ')" 2>/dev/null)"
echo ""
echo "--- Reception dashboard content checks ---"
echo "Today overview heading: $($AB eval "document.body.innerText.toLowerCase().includes(\"today\") && document.body.innerText.toLowerCase().includes('overview') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "Ward Occupancy card: $($AB eval "document.body.innerText.includes('Ward Occupancy') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "ICU Occupancy card: $($AB eval "document.body.innerText.includes('ICU Occupancy') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "Available Beds card: $($AB eval "document.body.innerText.includes('Available Beds') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "Available ICU Beds card: $($AB eval "document.body.innerText.toLowerCase().includes('available icu') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "Quick check-in table: $($AB eval "document.body.innerText.toLowerCase().includes('quick patient check-in') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "Dept rows: $($AB eval "document.querySelectorAll('table tbody tr').length + ' rows'" 2>/dev/null)"
echo "Chart surfaces (should be 0): $($AB eval "document.querySelectorAll('.recharts-surface').length" 2>/dev/null)"
echo "No Regenerate button: $($AB eval "document.body.innerText.toLowerCase().includes('regenerate data') ? 'NO (found, wrong)' : 'YES (absent) ✓'" 2>/dev/null)"
echo "No forecast/sim/what-if nav: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).map(e=>e.textContent.trim()).join(',') || 'only div items'" 2>/dev/null)"
echo "network:"
$AB network requests 2>&1 | grep -iE "auth/me|auth/login|reception|dashboard" | head -8

echo ""
echo "=== 2. Reception logout ==="
$AB find role button click --name "User account menu" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB find role menuitem click --name "Sign out" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB find role button click --name "Sign out" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
echo "after logout: $($AB eval "document.body.innerText.includes('Welcome back') ? 'on auth ✓' : 'NOT on auth ✗'" 2>/dev/null)"

echo ""
echo "=== 3. Admin login → full dashboard ==="
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 10000 >/dev/null 2>&1
$AB screenshot /tmp/role-admin-dashboard.png >/dev/null 2>&1
echo "admin page state: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy')&&t.includes('resource gap'))return 'FULL DASHBOARD ✓';return 'other: '+t.slice(0,60)})()" 2>/dev/null)"
echo "admin sidebar items: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).map(e=>e.textContent.trim()).filter(Boolean).join(' | ')" 2>/dev/null)"
echo "admin charts: $($AB eval "document.querySelectorAll('.recharts-surface').length + ' surfaces'" 2>/dev/null)"
echo "admin has forecast nav: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).some(b=>b.textContent.trim()==='Forecast') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "admin has Regenerate: $($AB eval "document.body.innerText.toLowerCase().includes('regenerate data') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 4. Console errors ==="
$AB errors 2>&1 | head -5

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
