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
echo "=== 1. Hero landing (enhanced) ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot --full /tmp/g-01-hero-full.png >/dev/null 2>&1
echo "Get Started: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Get Started')) ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "stats row (Forecast horizon / Departments / Days / CI): $($AB eval "document.body.innerText.includes('Forecast horizon') && document.body.innerText.includes('CI coverage') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "How it works section: $($AB eval "document.body.innerText.includes('How it works') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "trust badges (JWT / Role-based / Real-time): $($AB eval "document.body.innerText.includes('JWT-secured') && document.body.innerText.includes('Role-based') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "secondary CTA 'I already have an account': $($AB eval "document.body.innerText.includes('already have an account') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 2. Click Get Started → auth card with Google button ==="
$AB find role button click --name "Get Started" >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/g-02-auth-card.png >/dev/null 2>&1
echo "Continue with Google button: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Continue with Google')) ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "divider: $($AB eval "document.body.innerText.toLowerCase().includes('or continue with email') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 3. Click Continue with Google → account chooser opens ==="
$AB find role button click --name "Continue with Google" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/g-03-chooser.png >/dev/null 2>&1
echo "chooser dialog: $($AB eval "document.body.innerText.toLowerCase().includes('sign in with google') && document.body.innerText.toLowerCase().includes('choose an account') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "accounts listed: $($AB eval "document.body.innerText.includes('Dr. Admin') && document.body.innerText.includes('Reception Desk') && document.body.innerText.includes('Google User') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 4. Click 'Dr. Admin' account → code step (demo code shown) ==="
$AB eval "(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Dr. Admin'));if(b){b.click();return 'clicked'}return 'not found'})()" 2>/dev/null
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/g-04-code-step.png >/dev/null 2>&1
echo "code step: $($AB eval "document.body.innerText.toLowerCase().includes('enter the verification code') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "demo code banner: $($AB eval "document.body.innerText.toLowerCase().includes('demo verification code') ? 'YES ✓' : 'NO'" 2>/dev/null)"
# Extract the demo code from the page
DEMO=$($AB eval "(()=>{const m=document.body.innerText.match(/Demo verification code[\\s\\S]{0,40}?([0-9]{6})/);return m?m[1]:'none'})()" 2>/dev/null)
echo "demo code extracted: $DEMO"

echo ""
echo "=== 5. Enter the demo code + verify → dashboard ==="
# Fill the code input
$AB eval "((sel,val)=>{const i=document.querySelector(sel);const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,val);i.dispatchEvent(new Event('input',{bubbles:true}))})('input[id=g-code]','$DEMO')" >/dev/null 2>&1
$AB wait 500 >/dev/null 2>&1
echo "code input value: $($AB eval "document.querySelector('input[id=g-code]')?.value" 2>/dev/null)"
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1
$AB screenshot /tmp/g-05-after-google-login.png >/dev/null 2>&1
echo "logged in: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy')||t.includes('reception dashboard')||t.includes('admin dashboard'))return 'YES — dashboard ✓';return 'NO: '+t.slice(0,60)})()" 2>/dev/null)"
echo "user name visible: $($AB eval "document.body.innerText.includes('Dr. Admin') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 6. Console errors ==="
$AB errors 2>&1 | head -5

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
