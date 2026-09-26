#!/usr/bin/env bash
set -u
cd /home/z/my-project

pkill -9 -f next 2>/dev/null
sleep 2
rm -f dev.log
setsid bash -c 'node_modules/.bin/next dev -p 3000 > dev.log 2>&1' </dev/null >/dev/null 2>&1 &
for i in $(seq 1 30); do
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
$AB set viewport 1280 820 >/dev/null 2>&1

echo ""
echo "=== 1. Login → dashboard (first attempt, no retry) ==="
$AB network requests --clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 600 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 9000 >/dev/null 2>&1
$AB screenshot /tmp/auth-01-dashboard.png >/dev/null 2>&1
echo "page state: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy'))return 'DASHBOARD loaded ✓ (no 401)';if(t.includes('unauthorized'))return 'UNAUTHORIZED ✗';if(t.includes('failed to load'))return 'FAILED TO LOAD ✗';return 'other'})()" 2>/dev/null)"
echo "network (login flow):"
$AB network requests 2>&1 | grep -iE "auth/me|auth/login|dashboard" | head -8

echo ""
echo "=== 2. Refresh → dashboard (cookie persistence) ==="
$AB network requests --clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 7000 >/dev/null 2>&1
echo "page state: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy'))return 'DASHBOARD after refresh ✓';if(t.includes('unauthorized'))return 'UNAUTHORIZED ✗';return 'other'})()" 2>/dev/null)"
echo "network (refresh):"
$AB network requests 2>&1 | grep -iE "auth/me|dashboard" | head -4

echo ""
echo "=== 3. Logout → re-login → dashboard ==="
$AB find role button click --name "User account menu" >/dev/null 2>&1
$AB wait 700 >/dev/null 2>&1
$AB find role menuitem click --name "Sign out" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB find role button click --name "Sign out" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
echo "after logout: $($AB eval "document.body.innerText.includes('Welcome back') ? 'on auth ✓' : 'NOT on auth'" 2>/dev/null)"
$AB network requests --clear >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 600 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 9000 >/dev/null 2>&1
echo "after re-login: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy'))return 'DASHBOARD ✓ (no 401)';if(t.includes('unauthorized'))return 'UNAUTHORIZED ✗';return 'other'})()" 2>/dev/null)"
echo "network (re-login):"
$AB network requests 2>&1 | grep -iE "auth/me|login|dashboard" | head -8

echo ""
echo "=== 4. Navigate other views (all need auth) ==="
$AB find role button click --name "Forecast" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
echo "Forecast: $($AB eval "document.body.innerText.toLowerCase().includes('demand forecast') ? 'OK ✓' : 'FAILED'" 2>/dev/null)"
$AB find role button click --name "Departments" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
echo "Departments: $($AB eval "document.body.innerText.includes('Emergency') ? 'OK ✓' : 'FAILED'" 2>/dev/null)"
$AB find role button click --name "Alerts" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
echo "Alerts: $($AB eval "document.body.innerText.toLowerCase().includes('capacity alert')||document.body.innerText.includes('No capacity alerts') ? 'OK ✓' : 'FAILED'" 2>/dev/null)"

echo ""
echo "=== 5. Console errors ==="
$AB errors 2>&1 | head -5

echo ""
echo "=== 6. Server log — auth traces ==="
grep -iE "\[auth\]" dev.log | tail -20

echo ""
echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
