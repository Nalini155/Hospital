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
$AB network requests --clear >/dev/null 2>&1
$AB set viewport 1280 820 >/dev/null 2>&1

echo ""
echo "=== 1. Redesigned login page (desktop) ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2500 >/dev/null 2>&1
$AB screenshot /tmp/v2-01-login-desktop.png >/dev/null 2>&1
$AB eval "(()=>{const t=document.body.innerText;return{appName:t.includes('CareFlow Intelligence'),tagline:t.includes('Hospital Resource Forecasting'),tabs:document.querySelectorAll('[role=tab]').length,email:!!document.querySelector('input[type=email]'),pw:!!document.querySelector('input[type=password]'),forgot:t.includes('Forgot password'),disclaimer:t.includes('not medical diagnosis'),demo:t.includes('Demo account')}})()" 2>/dev/null

echo ""
echo "=== 2. Wrong password → inline error banner ==="
# refs from snapshot: e8=email, e9=password
$AB fill @e8 "admin@careflow.health" >/dev/null 2>&1
$AB fill @e9 "wrongpass" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
echo "email val: $($AB get value @e8 2>/dev/null)"
echo "pw val: $($AB get value @e9 2>/dev/null)"
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/v2-02-wrongpw-error.png >/dev/null 2>&1
echo "inline error banner:"
$AB eval "(()=>{const el=document.querySelector('[role=alert]'); return el ? 'PRESENT ✓: '+el.innerText.slice(0,110) : 'ABSENT'})()" 2>/dev/null
echo "network login:"
$AB network requests 2>&1 | grep -iE "login" | head

echo ""
echo "=== 3. No account (nonexistent email) ==="
$AB eval "document.querySelector('input[type=email]').value='nobody@nowhere.com'; document.querySelector('input[type=email]').dispatchEvent(new Event('input',{bubbles:true}))" >/dev/null 2>&1
$AB eval "document.querySelector('input[type=password]').value='whatever'; document.querySelector('input[type=password]').dispatchEvent(new Event('input',{bubbles:true}))" >/dev/null 2>&1
$AB wait 300 >/dev/null 2>&1
# Use real typing to satisfy react-hook-form
$AB fill @e8 "nobody@nowhere.com" >/dev/null 2>&1
$AB fill @e9 "whatever" >/dev/null 2>&1
$AB wait 300 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/v2-03-no-account.png >/dev/null 2>&1
echo "inline error:"
$AB eval "(()=>{const el=document.querySelector('[role=alert]'); return el ? el.innerText.slice(0,110) : 'ABSENT'})()" 2>/dev/null

echo ""
echo "=== 4. Demo admin login (correct creds) ==="
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB find text "autofill" click >/dev/null 2>&1
$AB wait 500 >/dev/null 2>&1
echo "email prefilled: $($AB eval "document.querySelector('input[type=email]').value" 2>/dev/null)"
echo "pw prefilled: $($AB eval "document.querySelector('input[type=password]').value" 2>/dev/null)"
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 6000 >/dev/null 2>&1
$AB screenshot /tmp/v2-04-dashboard.png >/dev/null 2>&1
echo "dashboard loaded:"
$AB eval "(()=>{const t=document.body.innerText.toLowerCase();return t.includes('ward occupancy')&&t.includes('resource gap')?'YES ✓':'NO: '+(t.includes('dashboard')?'shell only':'auth')})()" 2>/dev/null

echo ""
echo "=== 5. Mobile responsive (375x812) ==="
$AB set viewport 375 812 >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/v2-05-mobile.png >/dev/null 2>&1
echo "mobile elements:"
$AB eval "(()=>{const t=document.body.innerText;return{appName:t.includes('CareFlow Intelligence'),tagline:t.includes('Hospital Resource Forecasting'),email:!!document.querySelector('input[type=email]'),disclaimer:t.includes('not medical diagnosis')}})()" 2>/dev/null

echo ""
echo "=== 6. Console errors ==="
$AB errors 2>&1 | head -10

echo ""
echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
