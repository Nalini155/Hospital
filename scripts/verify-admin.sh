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

SET='((sel,val)=>{const i=document.querySelector(sel);const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;s.call(i,val);i.dispatchEvent(new Event("input",{bubbles:true}));return i.value})'

echo ""
echo "=== 1. Admin login → full dashboard ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1
echo "logged in: $($AB eval "document.body.innerText.toLowerCase().includes('ward occupancy') ? 'YES (dashboard) ✓' : 'NO'" 2>/dev/null)"
echo "sidebar items (before clicking Admin):"
$AB eval "Array.from(document.querySelectorAll('aside nav button')).map(e=>e.textContent.trim()).filter(Boolean).join(' | ')" 2>/dev/null
echo "Admin nav present: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).some(b=>b.textContent.trim()==='Admin') ? 'YES ✓' : 'NO ✗'" 2>/dev/null)"

echo ""
echo "=== 2. Click Admin sidebar item ==="
$AB find role button click --name "Admin" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/admin-01-admin-view.png >/dev/null 2>&1
echo "page h1: $($AB eval "document.querySelector('h1')?.textContent" 2>/dev/null)"
echo "admin heading present: $($AB eval "document.body.innerText.toLowerCase().includes('admin dashboard') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "system overview heading: $($AB eval "document.body.innerText.includes('System Overview') || document.body.innerText.toLowerCase().includes('total users') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "user management heading: $($AB eval "document.body.innerText.includes('User Management') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "data management heading: $($AB eval "document.body.innerText.includes('Data Management') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "activity log heading: $($AB eval "document.body.innerText.includes('Activity Log') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "KPI 'Total Users' value: $($AB eval "(()=>{const t=document.body.innerText;const m=t.match(/Total Users[\\s\\S]{0,30}?(\d+)/);return m?m[1]:'not found'})()" 2>/dev/null)"
echo "user table rows: $($AB eval "document.querySelectorAll('table tbody tr').length" 2>/dev/null)"
echo "network admin requests:"
$AB network requests 2>&1 | grep -iE "admin/" | head -5

echo ""
echo "=== 3. Change a user role (PATCH) ==="
# Find the first non-admin user's role select and change to RECEPTION
$AB eval "(()=>{const selects=document.querySelectorAll('table tbody tr select, table tbody [role=combobox]'); return 'found '+selects.length+' selects'})()" 2>/dev/null
# Use the first Select trigger in the user table
$AB eval "document.querySelectorAll('table tbody tr button[role=combobox]')[0]?.click()" >/dev/null 2>&1
$AB wait 500 >/dev/null 2>&1
$AB find role option click --name "Reception" >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
echo "toast/feedback: $($AB eval "document.body.innerText.toLowerCase().includes('user updated') ? 'YES ✓' : 'check other'" 2>/dev/null)"

echo ""
echo "=== 4. Regenerate dataset button ==="
$AB find role button click --name "Regenerate dataset" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
echo "after regenerate: $($AB eval "document.body.innerText.toLowerCase().includes('dataset regenerated') ? 'toast shown ✓' : 'no toast (maybe success silent)'" 2>/dev/null)"

echo ""
echo "=== 5. Verify staff user does NOT see Admin nav ==="
# Logout, login as a staff user (use existing e2e tester or signup a staff)
$AB find role button click --name "User account menu" >/dev/null 2>&1
$AB wait 700 >/dev/null 2>&1
$AB find role menuitem click --name "Sign out" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB find role button click --name "Sign out" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
# Login as a STAFF user — use test_1790401948@example.com / test123456 (created earlier)
$AB eval "$SET('input[type=email]','test_1790401948@example.com')" >/dev/null 2>&1
$AB eval "$SET('input[type=password]','test123456')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1
echo "staff logged in: $($AB eval "document.body.innerText.toLowerCase().includes('ward occupancy') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "staff sidebar items: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).map(e=>e.textContent.trim()).filter(Boolean).join(' | ')" 2>/dev/null)"
echo "staff has Admin nav: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).some(b=>b.textContent.trim()==='Admin') ? 'YES (WRONG ✗)' : 'NO (correct ✓)'" 2>/dev/null)"

echo ""
echo "=== 6. Console errors ==="
$AB errors 2>&1 | head -5

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
