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
echo "=== 1. Login page: hero landing with Get Started ==="
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/fin-01-hero.png >/dev/null 2>&1
echo "hero visible: $($AB eval "document.body.innerText.includes('CareFlow Intelligence') && document.body.innerText.includes('Get Started') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "Get Started button present: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Get Started')) ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 2. Click Get Started → auth card ==="
$AB find role button click --name "Get Started" >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/fin-02-auth-card.png >/dev/null 2>&1
echo "auth card visible: $($AB eval "document.body.innerText.toLowerCase().includes('continue with google') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "google button present: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Continue with Google')) ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "divider 'or continue with email': $($AB eval "document.body.innerText.toLowerCase().includes('or continue with email') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "sign in/up tabs: $($AB eval "document.body.innerText.includes('Sign in') && document.body.innerText.includes('Sign up') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "email field: $($AB eval "!!document.querySelector('input[type=email]') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 3. Click Continue with Google (mock → demo admin login) ==="
$AB find role button click --name "Continue with Google" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1
$AB screenshot /tmp/fin-03-google-login.png >/dev/null 2>&1
echo "after google login: $($AB eval "(()=>{const t=document.body.innerText.toLowerCase();if(t.includes('ward occupancy')||t.includes('reception dashboard')||t.includes('admin dashboard'))return 'LOGGED IN ✓';return 'NOT logged in: '+t.slice(0,60)})()" 2>/dev/null)"

echo ""
echo "=== 4. Logout, then login as Reception ==="
$AB find role button click --name "User account menu" >/dev/null 2>&1
$AB wait 700 >/dev/null 2>&1
$AB find role menuitem click --name "Sign out" >/dev/null 2>&1
$AB wait 800 >/dev/null 2>&1
$AB find role button click --name "Sign out" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
# Should be back on hero or auth
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
# If on hero, click Get Started
$AB eval "(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Get Started'));if(b){b.click();return 'clicked Get Started'}return 'no hero'})()" 2>/dev/null
$AB wait 1500 >/dev/null 2>&1
# Fill reception login
$AB eval "$SET('input[type=email]','reception@careflow.health')" >/dev/null 2>&1
$AB eval "$SET('input[type=password]','reception123')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1
$AB screenshot /tmp/fin-04-reception-dashboard.png >/dev/null 2>&1
echo "reception logged in: $($AB eval "document.body.innerText.toLowerCase().includes('reception dashboard') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "reception sidebar items: $($AB eval "Array.from(document.querySelectorAll('aside nav button')).map(e=>e.textContent.trim()).filter(Boolean).join(' | ')" 2>/dev/null)"

echo ""
echo "=== 5. Reception: Update Beds ==="
$AB find role button click --name "Update Beds" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/fin-05-update-beds.png >/dev/null 2>&1
echo "update beds view: $($AB eval "document.body.innerText.toLowerCase().includes('update beds') && document.body.innerText.toLowerCase().includes('bed entry form') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "department dropdown: $($AB eval "document.body.innerText.includes('Emergency') && document.body.innerText.includes('General Ward') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "total beds input: $($AB eval "!!document.querySelector('input[type=number]') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "save button: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Save bed update')) ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 6. Reception: Update ICU ==="
$AB find role button click --name "Update ICU" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/fin-06-update-icu.png >/dev/null 2>&1
echo "update icu view: $($AB eval "document.body.innerText.toLowerCase().includes('update icu') && document.body.innerText.toLowerCase().includes('icu entry form') ? 'YES ✓' : 'NO'" 2>/dev/null)"
echo "save icu button: $($AB eval "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Save ICU update')) ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 7. Reception: Daily Entry (combined) ==="
$AB find role button click --name "Daily Entry" >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/fin-07-daily-entry.png >/dev/null 2>&1
echo "daily entry view: $($AB eval "document.body.innerText.toLowerCase().includes('daily entry') ? 'YES ✓' : 'NO'" 2>/dev/null)"

echo ""
echo "=== 8. Console errors ==="
$AB errors 2>&1 | head -5

echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
