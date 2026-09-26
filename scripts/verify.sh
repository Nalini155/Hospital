#!/usr/bin/env bash
set -u
cd /home/z/my-project

echo "### Starting dev server"
pkill -9 -f next 2>/dev/null
sleep 2
rm -f dev.log
setsid bash -c 'node_modules/.bin/next dev -p 3000 > dev.log 2>&1' </dev/null >/dev/null 2>&1 &
READY=0
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "ready after ${i}s"; READY=1; break
  fi
  sleep 1
done
[ "$READY" = "1" ] || { echo "SERVER NOT READY"; tail -20 dev.log; exit 1; }

echo "### Seeding demo data"
curl -s -o /dev/null -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@careflow.health","password":"careflow123"}' -c /tmp/cf_cookies.txt
curl -s -o /dev/null -X POST http://localhost:3000/api/data/historical -b /tmp/cf_cookies.txt
echo "seeded"

AB="agent-browser"
$AB close >/dev/null 2>&1 || true
$AB set viewport 1280 820 >/dev/null 2>&1

echo "### 1. Open login page"
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB screenshot /tmp/01-login.png >/dev/null 2>&1
$AB snapshot -i -c > /tmp/snap1.txt 2>&1
echo "--- login page h1:"; $AB eval "document.querySelector('h1,h2')?.textContent" 2>/dev/null
echo "--- has email input:"; $AB eval "!!document.querySelector('input[type=email]')" 2>/dev/null
echo "--- has password input:"; $AB eval "!!document.querySelector('input[type=password]')" 2>/dev/null

echo "### 2. Autofill demo creds + sign in"
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 500 >/dev/null 2>&1
$AB eval "document.querySelector('button[type=submit]').click()" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
$AB screenshot /tmp/02-dashboard.png >/dev/null 2>&1
echo "--- post-login h1:"; $AB eval "document.querySelector('h1')?.textContent" 2>/dev/null
echo "--- KPI labels:"; $AB eval "Array.from(document.querySelectorAll('p')).map(p=>p.textContent).filter(t=>/Occupancy|Available|Expected|Admissions/.test(t)).join(' | ')" 2>/dev/null
echo "--- alert cards:"; $AB eval "document.body.innerText.includes('capacity pressure') ? 'PRESENT' : 'none'" 2>/dev/null
echo "--- resource gap rows:"; $AB eval "document.querySelectorAll('table tbody tr').length" 2>/dev/null

echo "### 3. Forecast view"
$AB find role button click --name "Forecast" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/03-forecast.png >/dev/null 2>&1
echo "--- forecast h1:"; $AB eval "document.querySelector('h1')?.textContent" 2>/dev/null
echo "--- forecast tabs present:"; $AB eval "Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent).join(',')" 2>/dev/null
echo "--- forecast detail rows:"; $AB eval "document.querySelectorAll('table tbody tr').length" 2>/dev/null

echo "### 4. Departments view"
$AB find role button click --name "Departments" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/04-departments.png >/dev/null 2>&1
echo "--- depts h1:"; $AB eval "document.querySelector('h1')?.textContent" 2>/dev/null
echo "--- dept names present:"; $AB eval "['Emergency','ICU','General Ward','Pediatrics'].filter(d=>document.body.innerText.includes(d)).join(',')" 2>/dev/null

echo "### 5. Alerts view"
$AB find role button click --name "Alerts" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB screenshot /tmp/05-alerts.png >/dev/null 2>&1
echo "--- alerts h1:"; $AB eval "document.querySelector('h1')?.textContent" 2>/dev/null
echo "--- alert/allclear:"; $AB eval "document.body.innerText.includes('capacity alert') || document.body.innerText.includes('No capacity alerts') ? 'PRESENT' : 'missing'" 2>/dev/null

echo "### 6. What-If simulation view"
$AB find role button click --name "What-If" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/06a-simulation-initial.png >/dev/null 2>&1
echo "--- sim h1:"; $AB eval "document.querySelector('h1')?.textContent" 2>/dev/null
echo "--- sliders present:"; $AB eval "document.querySelectorAll('[role=slider]').length" 2>/dev/null
# adjust a slider via keyboard then run
$AB find role button click --name "Run simulation" >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB screenshot /tmp/06b-simulation-run.png >/dev/null 2>&1
echo "--- sim scenario tiles:"; $AB eval "document.body.innerText.includes('Scenario impact') ? 'PRESENT' : 'missing'" 2>/dev/null
echo "--- affected depts table:"; $AB eval "document.querySelectorAll('table tbody tr').length" 2>/dev/null

echo "### 7. Settings view"
$AB find role button click --name "Settings" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB screenshot /tmp/07-settings.png >/dev/null 2>&1
echo "--- settings h1:"; $AB eval "document.querySelector('h1')?.textContent" 2>/dev/null
echo "--- disclaimer present:"; $AB eval "document.body.innerText.includes('not medical diagnosis') ? 'PRESENT' : 'missing'" 2>/dev/null
echo "--- regenerate btn present:"; $AB eval "document.body.innerText.includes('Regenerate dataset') ? 'PRESENT' : 'missing'" 2>/dev/null

echo "### 8. Logout flow (from Dashboard)"
$AB find role button click --name "Dashboard" >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB find role button click --name "User account menu" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB screenshot /tmp/08a-user-menu.png >/dev/null 2>&1
$AB find role menuitem click --name "Sign out" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB screenshot /tmp/08b-logout-dialog.png >/dev/null 2>&1
echo "--- dialog open:"; $AB eval "document.body.innerText.includes('Sign out of CareFlow') ? 'PRESENT' : 'missing'" 2>/dev/null
$AB find role button click --name "Sign out" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/08c-after-logout.png >/dev/null 2>&1
echo "--- back to auth:"; $AB eval "document.body.innerText.includes('Welcome back') ? 'PRESENT' : 'missing'" 2>/dev/null

echo "### 9. Console errors during session"
$AB errors 2>&1 | head -30 || echo "none"

echo "### 10. Mobile responsive (375x812) + sticky footer"
$AB set viewport 375 812 >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB screenshot /tmp/09-mobile-auth.png >/dev/null 2>&1
echo "--- mobile auth centered card:"; $AB eval "document.querySelector('input[type=email]') ? 'PRESENT' : 'missing'" 2>/dev/null
echo "--- footer disclaimer on mobile:"; $AB eval "document.body.innerText.includes('not medical diagnosis') ? 'PRESENT' : 'missing'" 2>/dev/null

echo "### 11. Server log tail"
tail -15 dev.log

echo "### DONE"
$AB close >/dev/null 2>&1 || true
