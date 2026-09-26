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
echo "=== 1. Hero landing (enhanced Get Started page) ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot --full /tmp/final-01-hero.png >/dev/null 2>&1
echo "Get Started button: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Get Started')) ? 'YES' : 'NO'" 2>/dev/null)"
echo "stats row (case-insensitive): $($AB eval "document.body.innerText.toLowerCase().includes('forecast horizon') ? 'YES' : 'NO'" 2>/dev/null)"
echo "how it works: $($AB eval "document.body.innerText.toLowerCase().includes('how it works') ? 'YES' : 'NO'" 2>/dev/null)"
echo "trust badges: $($AB eval "document.body.innerText.toLowerCase().includes('jwt-secured') ? 'YES' : 'NO'" 2>/dev/null)"
echo "secondary CTA: $($AB eval "document.body.innerText.toLowerCase().includes('already have an account') ? 'YES' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 2. Get Started → auth card → Continue with Google ==="
$AB find role button click --name "Get Started" >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/final-02-auth-card.png >/dev/null 2>&1
echo "Continue with Google: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Continue with Google')) ? 'YES' : 'NO'" 2>/dev/null)"
echo "divider: $($AB eval "document.body.innerText.toLowerCase().includes('or continue with email') ? 'YES' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 3. Click Continue with Google → account chooser ==="
$AB find role button click --name "Continue with Google" >/dev/null 2>&1
$AB wait 3500 >/dev/null 2>&1
$AB screenshot /tmp/final-03-chooser.png >/dev/null 2>&1
echo "chooser heading: $($AB eval "document.body.innerText.toLowerCase().includes('choose an account') ? 'YES' : 'NO'" 2>/dev/null)"
echo "accounts: $($AB eval "document.body.innerText.includes('Dr. Admin') && document.body.innerText.includes('Reception Desk') && document.body.innerText.includes('Google User') ? 'YES' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 4. Choose 'Dr. Admin' → code step ==="
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Dr. Admin'))?.click()" 2>/dev/null
$AB wait 4000 >/dev/null 2>&1
$AB screenshot /tmp/final-04-code-step.png >/dev/null 2>&1
echo "code step heading: $($AB eval "document.body.innerText.toLowerCase().includes('enter the verification code') ? 'YES' : 'NO'" 2>/dev/null)"
echo "demo code banner: $($AB eval "document.body.innerText.toLowerCase().includes('demo verification code') ? 'YES' : 'NO'" 2>/dev/null)"
# Extract the 6-digit code from the mono font paragraph
DEMO=$($AB eval "(()=>{const els=document.querySelectorAll('p.font-mono');for(const e of els){const m=e.textContent.match(/[0-9]{6}/);if(m)return m[0]}return ''})()" 2>/dev/null)
echo "demo code extracted: $DEMO"

echo ""
echo "=== 5. Find code input via aria-label + fill with agent-browser ==="
# Use the snapshot to find the code input by its aria-label
CODE_REF=$($AB snapshot -i 2>&1 | grep -iE "Google verification code" | head -1 | grep -oE '@e[0-9]+' | head -1)
echo "code input ref: $CODE_REF"
if [ -z "$CODE_REF" ]; then
  # fallback: find by placeholder text
  CODE_REF=$($AB snapshot -i 2>&1 | grep -iE "6-digit code" | head -1 | grep -oE '@e[0-9]+' | head -1)
  echo "fallback ref: $CODE_REF"
fi
if [ -n "$CODE_REF" ]; then
  $AB fill $CODE_REF "$DEMO" >/dev/null 2>&1
  $AB wait 600 >/dev/null 2>&1
fi
echo "input value after fill: $($AB eval "document.querySelector('input[aria-label=\"Google verification code\"]')?.value" 2>/dev/null)"

echo ""
echo "=== 6. Click Verify → dashboard ==="
$AB network requests --clear >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 9000 >/dev/null 2>&1
$AB screenshot /tmp/final-05-after-google-login.png >/dev/null 2>&1
echo "verify network: $($AB network requests 2>&1 | grep -iE 'google/verify' | head -1)"
echo "logged in: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy')||t.includes('reception dashboard')||t.includes('admin dashboard'))return 'YES — dashboard ✓';if(t.includes('enter the verification'))return 'still on code step (verify failed)';return 'other: '+t.slice(0,60)})()" 2>/dev/null)"
echo "localStorage token: $($AB eval "localStorage.getItem('careflow_token') ? 'PRESENT ✓' : 'NONE'" 2>/dev/null)"
echo "user visible: $($AB eval "document.body.innerText.includes('Dr. Admin') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 7. Console errors ==="
$AB errors 2>&1 | head -5

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
