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
curl -s -o /dev/null -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@careflow.health","password":"careflow123"}' -c /tmp/cf.txt
curl -s -o /dev/null -X POST http://localhost:3000/api/data/historical -b /tmp/cf.txt

AB="agent-browser"
$AB close >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB set viewport 1280 820 >/dev/null 2>&1

SET='((sel,val)=>{const i=document.querySelector(sel);if(!i)return"NO";const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;s.call(i,val);i.dispatchEvent(new Event("input",{bubbles:true}));return i.value})'

echo ""
echo "=== 1. Login page screenshot (desktop) ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
$AB screenshot /tmp/v2-01-login.png >/dev/null 2>&1
echo "saved ($(ls -la /tmp/v2-01-login.png | awk '{print $5}') bytes)"

echo ""
echo "=== 2. Wrong password (existing admin) → inline error ==="
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 700 >/dev/null 2>&1
$AB eval "$SET('input[type=password]','wrongpass')" >/dev/null 2>&1
$AB wait 300 >/dev/null 2>&1
echo "email: $($AB eval "document.querySelector('input[type=email]').value" 2>/dev/null) / pw: $($AB eval "document.querySelector('input[type=password]').value" 2>/dev/null)"
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/v2-02-wrongpw.png >/dev/null 2>&1
echo "inline error: $($AB eval "(()=>{const el=document.querySelector('[role=alert]'); return el ? 'PRESENT ✓: '+el.innerText : 'ABSENT'})()" 2>/dev/null)"
$AB network requests 2>&1 | grep -iE 'POST.*login' | tail -1

echo ""
echo "=== 3. No account (nonexistent email) ==="
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB eval "$SET('input[type=email]','nobody@nowhere.com')" >/dev/null 2>&1
$AB eval "$SET('input[type=password]','anything123')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/v2-03-no-account.png >/dev/null 2>&1
echo "inline error: $($AB eval "(()=>{const el=document.querySelector('[role=alert]'); return el ? el.innerText.slice(0,130) : 'ABSENT'})()" 2>/dev/null)"
$AB network requests 2>&1 | grep -iE 'POST.*login' | tail -1

echo ""
echo "=== 4. Demo admin login (correct creds) → dashboard ==="
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 500 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 7000 >/dev/null 2>&1
$AB screenshot /tmp/v2-04-admin-dashboard.png >/dev/null 2>&1
echo "dashboard: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();return t.includes('ward occupancy')&&t.includes('resource gap')?'YES ✓':'partial'})()" 2>/dev/null)"
echo "charts: $($AB eval "document.querySelectorAll('.recharts-surface').length + ' surfaces'" 2>/dev/null)"

echo ""
echo "=== 5. Fresh signup → dashboard ==="
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Sign up').click()" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB screenshot /tmp/v2-05-signup-form.png >/dev/null 2>&1
FRESH="e2e_$(date +%s)@test.com"
echo "fresh email: $FRESH"
$AB eval "$SET('input[placeholder=\"Dr. Jane Doe\"]','E2E Tester')" >/dev/null 2>&1
$AB eval "$SET('input[type=email]','$FRESH')" >/dev/null 2>&1
$AB eval "$SET('input[type=password]','e2etest123456')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
echo "name: $($AB eval "document.querySelectorAll('form input')[0].value" 2>/dev/null) / email: $($AB eval "document.querySelectorAll('form input')[1].value" 2>/dev/null) / pw: $($AB eval "document.querySelectorAll('form input')[2].value" 2>/dev/null)"
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 6000 >/dev/null 2>&1
$AB screenshot /tmp/v2-06-signup-success.png >/dev/null 2>&1
echo "after signup: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();return t.includes('ward occupancy')?'DASHBOARD ✓ (signup succeeded)':'NOT dashboard'})()" 2>/dev/null)"
$AB network requests 2>&1 | grep -iE 'POST.*signup' | tail -1

echo ""
echo "=== 6. Logout → auth ==="
$AB find role button click --name "User account menu" >/dev/null 2>&1
$AB wait 700 >/dev/null 2>&1
$AB find role menuitem click --name "Sign out" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB screenshot /tmp/v2-07-logout-dialog.png >/dev/null 2>&1
echo "logout dialog: $($AB eval "document.body.innerText.includes('Sign out of CareFlow') ? 'PRESENT ✓' : 'ABSENT'" 2>/dev/null)"
$AB find role button click --name "Sign out" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
echo "after logout: $($AB eval "document.body.innerText.includes('CareFlow Intelligence') ? 'AUTH ✓' : 'other'" 2>/dev/null)"

echo ""
echo "=== 7. Login back with fresh account ==="
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB eval "$SET('input[type=email]','$FRESH')" >/dev/null 2>&1
$AB eval "$SET('input[type=password]','e2etest123456')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 6000 >/dev/null 2>&1
$AB screenshot /tmp/v2-08-login-back.png >/dev/null 2>&1
echo "login back: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();return t.includes('ward occupancy')?'DASHBOARD ✓ (login back works)':'FAILED'})()" 2>/dev/null)"

echo ""
echo "=== 8. Mobile (375x812) ==="
$AB set viewport 375 812 >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/v2-09-mobile.png >/dev/null 2>&1
echo "mobile: $($AB eval "(()=>{const t=document.body.innerText;return{appName:t.includes('CareFlow Intelligence'),tagline:t.includes('Hospital Resource Forecasting'),email:!!document.querySelector('input[type=email]'),disclaimer:t.includes('not medical diagnosis')}})()" 2>/dev/null)"

echo ""
echo "=== 9. Console errors ==="
$AB errors 2>&1 | head -5

echo ""
echo "=== DB users (fresh account persisted) ==="
bun run scripts/check-users.ts 2>&1 | grep -E "count:|e2e_" | head -3

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
