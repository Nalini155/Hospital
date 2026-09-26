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

# Full Google flow in one server session (code store is in-memory)
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1

echo "=== 1. Hero ==="
echo "Get Started: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Get Started')) ? 'YES' : 'NO'" 2>/dev/null)"
echo "stats/howitworks/trust: $($AB eval "document.body.innerText.toLowerCase().includes('forecast horizon') && document.body.innerText.toLowerCase().includes('how it works') && document.body.innerText.toLowerCase().includes('jwt-secured') ? 'YES' : 'NO'" 2>/dev/null)"
$AB screenshot --full /tmp/v2-hero.png >/dev/null 2>&1

echo ""
echo "=== 2. Get Started → Continue with Google ==="
$AB find role button click --name "Get Started" >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB find role button click --name "Continue with Google" >/dev/null 2>&1
$AB wait 3500 >/dev/null 2>&1
echo "chooser: $($AB eval "document.body.innerText.toLowerCase().includes('choose an account') && document.body.innerText.includes('Dr. Admin') && document.body.innerText.includes('Reception Desk') && document.body.innerText.includes('Google User') ? 'YES' : 'NO'" 2>/dev/null)"
$AB screenshot /tmp/v2-chooser.png >/dev/null 2>&1

echo ""
echo "=== 3. Choose Dr. Admin → code step ==="
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Dr. Admin'))?.click()" 2>/dev/null
$AB wait 4000 >/dev/null 2>&1
echo "code step: $($AB eval "document.body.innerText.toLowerCase().includes('enter the verification code') && document.body.innerText.toLowerCase().includes('demo verification code') ? 'YES' : 'NO'" 2>/dev/null)"
$AB screenshot /tmp/v2-code-step.png >/dev/null 2>&1

# Extract the fresh demo code
DEMO=$($AB eval "(()=>{const els=document.querySelectorAll('p.font-mono');for(const e of els){const m=e.textContent.match(/[0-9]{6}/);if(m)return m[0]}return ''})()" 2>/dev/null)
echo "fresh demo code: $DEMO"

echo ""
echo "=== 4. Fill code via ref + verify ==="
# Find the code input ref via aria-label
CODE_REF=$($AB snapshot -i 2>&1 | grep -iE "Google verification code" | head -1 | grep -oE '@e[0-9]+' | head -1)
echo "code input ref: $CODE_REF"
if [ -n "$CODE_REF" ]; then
  $AB fill $CODE_REF "$DEMO" >/dev/null 2>&1
  $AB wait 800 >/dev/null 2>&1
fi
echo "input value: $($AB eval "document.getElementById('g-code')?.value" 2>/dev/null)"

$AB network requests --clear >/dev/null 2>&1
# Click the DIALOG's submit button (not the login form's)
$AB eval "document.querySelector('[role=dialog] form button[type=submit]').click()" 2>/dev/null
$AB wait 9000 >/dev/null 2>&1
$AB screenshot /tmp/v2-after-google-login.png >/dev/null 2>&1
echo "verify req: $($AB network requests 2>&1 | grep -iE 'google/verify' | head -1)"
echo "logged in: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy')||t.includes('reception dashboard')||t.includes('admin dashboard'))return 'YES — dashboard ✓';if(t.includes('enter the verification'))return 'still code step (verify failed)';return 'other: '+t.slice(0,50)})()" 2>/dev/null)"
echo "token: $($AB eval "localStorage.getItem('careflow_token') ? 'PRESENT ✓' : 'NONE'" 2>/dev/null)"
echo "user: $($AB eval "document.body.innerText.includes('Dr. Admin') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 5. Console errors ==="
$AB errors 2>&1 | head -5

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
