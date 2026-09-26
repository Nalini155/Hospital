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
curl -s -o /dev/null -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@careflow.health","password":"careflow123"}' -c /tmp/cf.txt
curl -s -o /dev/null -X POST http://localhost:3000/api/data/historical -b /tmp/cf.txt

AB="agent-browser"
$AB close >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB set viewport 1280 820 >/dev/null 2>&1
$AB open http://localhost:3000/ >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1

SET='((sel,val)=>{const i=document.querySelector(sel);const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;s.call(i,val);i.dispatchEvent(new Event("input",{bubbles:true}))})'

# hero → Get Started → auth
$AB eval "(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Get Started'));if(b)b.click()})()" >/dev/null 2>&1
$AB wait 1500 >/dev/null 2>&1
$AB eval "$SET('input[type=email]','reception@careflow.health')" >/dev/null 2>&1
$AB eval "$SET('input[type=password]','reception123')" >/dev/null 2>&1
$AB wait 400 >/dev/null 2>&1
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 8000 >/dev/null 2>&1

echo "logged in: $($AB eval "document.body.innerText.toLowerCase().includes('reception dashboard') ? 'YES' : 'NO'" 2>/dev/null)"
echo ""
echo "=== snapshot to find sidebar refs ==="
$AB snapshot -i 2>&1 | grep -iE "Dashboard|Update|Daily" | head -8
echo ""
echo "=== click Update Beds via text match ==="
$AB eval "(()=>{const b=Array.from(document.querySelectorAll('aside nav button')).find(b=>b.textContent.trim()==='Update Beds');if(b){b.click();return 'clicked Update Beds'}return 'not found'})()" 2>/dev/null
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/fin-update-beds-real.png >/dev/null 2>&1
echo "header after click: $($AB eval "document.querySelector('h1')?.textContent" 2>/dev/null)"
echo "view content (first 200): $($AB eval "document.body.innerText.slice(0,200)" 2>/dev/null)"
echo ""
echo "=== click Update ICU ==="
$AB eval "(()=>{const b=Array.from(document.querySelectorAll('aside nav button')).find(b=>b.textContent.trim()==='Update ICU');if(b){b.click();return 'clicked'}})()" 2>/dev/null
$AB wait --load networkidle >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
$AB screenshot /tmp/fin-update-icu-real.png >/dev/null 2>&1
echo "header after click: $($AB eval "document.querySelector('h1')?.textContent" 2>/dev/null)"
echo ""
echo "=== click Daily Entry ==="
$AB eval "(()=>{const b=Array.from(document.querySelectorAll('aside nav button')).find(b=>b.textContent.trim()==='Daily Entry');if(b){b.click();return 'clicked'}})()" 2>/dev/null
$AB wait 2000 >/dev/null 2>&1
$AB screenshot /tmp/fin-daily-entry-real.png >/dev/null 2>&1
echo "header after click: $($AB eval "document.querySelector('h1')?.textContent" 2>/dev/null)"
echo ""
echo "=== go back to Update Beds and actually submit a change ==="
$AB eval "Array.from(document.querySelectorAll('aside nav button')).find(b=>b.textContent.trim()==='Update Beds').click()" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
echo "current dept row: $($AB eval "document.body.innerText.split('\\n').filter(l=>l.includes('Emergency')||l.includes('General')).slice(0,3).join(' | ')" 2>/dev/null)"
# Change total beds for Emergency via the input
echo "inputs on page: $($AB eval "document.querySelectorAll('input[type=number]').length" 2>/dev/null)"
# Fill total beds (first number input) = 70, occupied (second) = 60
$AB eval "$SET('input[type=number]:nth-of-type(1)','70')" >/dev/null 2>&1
$AB eval "$SET('input[type=number]:nth-of-type(2)','60')" >/dev/null 2>&1
$AB wait 500 >/dev/null 2>&1
echo "after fill — total: $($AB eval "document.querySelectorAll('input[type=number]')[0].value" 2>/dev/null) / occ: $($AB eval "document.querySelectorAll('input[type=number]')[1].value" 2>/dev/null)"
$AB eval "document.querySelector('form button[type=submit]').click()" >/dev/null 2>&1
$AB wait 3000 >/dev/null 2>&1
echo "after save: $($AB eval "document.body.innerText.toLowerCase().includes('emergency beds updated')||document.body.innerText.toLowerCase().includes('saved') ? 'toast shown' : 'check'" 2>/dev/null)"
echo ""
echo "=== console errors ==="
$AB errors 2>&1 | head -5
echo "=== DONE ==="
$AB close >/dev/null 2>&1 || true
