(() => {
const $ = id => document.getElementById(id);
const screens = {menu:$("menuScreen"),game:$("gameScreen")};
const TYPES = {
 question:{label:"คำถาม",icon:"❓",cls:"question"},
 shop:{label:"ร้านค้า",icon:"🛍️",cls:"shop"},
 bonus:{label:"โบนัส",icon:"💰",cls:"bonus"},
 penalty:{label:"เหตุการณ์",icon:"⚡",cls:"penalty"},
 event:{label:"พิเศษ",icon:"⭐",cls:"event"},
 normal:{label:"ทางเดิน",icon:"·",cls:"normal"}
};
const TOTAL=60,ROLL_MAX=6;
const BASE=["question","normal","bonus","question","shop","normal","penalty","question","normal","bonus","question","normal","shop","event","question","penalty","normal","bonus","question","shop","normal","question","penalty","normal","question","bonus","normal","question"];
const tiles=Array.from({length:TOTAL},(_,i)=>i===0?"start":i===TOTAL-1?"finish":BASE[(i-1)%BASE.length]);
const items = [
 {id:"shield",name:"โล่ป้องกัน",icon:"🛡️",price:150,desc:"ป้องกันผลเสียจากช่องบทลงโทษ 1 ครั้ง",effect:"shield"},
 {id:"reroll",name:"ลูกเต๋าวิเศษ",icon:"🎲",price:200,desc:"ทอยลูกเต๋าใหม่ได้ 1 ครั้งในเทิร์นของคุณ",effect:"reroll"},
 {id:"pass",name:"บัตรผ่าน",icon:"🎟️",price:250,desc:"ข้ามผลของช่องบทลงโทษครั้งถัดไป",effect:"pass"},
 {id:"clover",name:"ใบโคลเวอร์",icon:"🍀",price:180,desc:"ตัดตัวเลือกที่ผิดออก 2 ตัวเลือกในคำถามถัดไป",effect:"clover"},
 {id:"coupon",name:"คูปองส่วนลด",icon:"🏷️",price:120,desc:"ลดราคาไอเทมชิ้นถัดไป 50%",effect:"coupon"},
 {id:"slow",name:"นาฬิกาหน่วง",icon:"⏳",price:300,desc:"ทำให้คู่แข่งที่นำอยู่หยุดเดิน 1 เทิร์น",effect:"slow"}
];
const players = [
 {id:0,name:"คุณ",avatar:"🧑‍🚀",color:"#f14c4c",pos:0,money:500,inventory:[],level:"คุณ",human:true,shield:0,skip:0},
 {id:1,name:"บอท ครูกาน",avatar:"👩🏼‍✈️",color:"#eb6bab",pos:0,money:500,inventory:[],level:"ง่าย",skill:.48,shield:0,skip:0},
 {id:2,name:"บอท ครูเอ๋",avatar:"👩🏼‍🏫",color:"#e09854",pos:0,money:500,inventory:[],level:"ปานกลาง",skill:.68,shield:0,skip:0},
 {id:3,name:"บอท ครูหน่อง",avatar:"🐶",color:"#f1a761",pos:0,money:500,inventory:[],level:"ยาก",skill:.88,shield:0,skip:0}
];

let current=0,rolling=false,gameOver=false,questionPool=[],soundOn=true,turns=0,questionLocked=false,playerReroll=false;

// Original sound effects generated with Web Audio (no external audio files required).
let sfxContext=null, sfxNoiseBuffer=null;
function audioReady(){
 if(!soundOn)return null;
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx)return null;
 if(!sfxContext)sfxContext=new AudioCtx();
 if(sfxContext.state==="suspended")sfxContext.resume();
 return sfxContext;
}
function tone(ctx,frequency,start,duration,volume,type="sine",endFrequency=null){
 const osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type;osc.frequency.setValueAtTime(frequency,start);
 if(endFrequency!==null)osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),start+duration);
 gain.gain.setValueAtTime(.0001,start);
 gain.gain.exponentialRampToValueAtTime(Math.min(volume*3,0.9),start+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);
}
function noiseHit(ctx,start,duration,volume,filterFreq=1500){
 if(!sfxNoiseBuffer){
  const length=Math.floor(ctx.sampleRate*.25),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
  sfxNoiseBuffer=buffer;
 }
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 source.buffer=sfxNoiseBuffer;filter.type="lowpass";filter.frequency.setValueAtTime(filterFreq,start);
 gain.gain.setValueAtTime(Math.min(volume*3,0.9),start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(start);source.stop(start+duration);
}
function playSfx(kind){
 const ctx=audioReady();if(!ctx)return;
 const now=ctx.currentTime;
 if(kind==="click"){
  tone(ctx,620,now,.07,.045,"triangle",880);
  tone(ctx,920,now+.045,.08,.025,"sine",1120);
 }else if(kind==="enter"){
  tone(ctx,440,now,.12,.045,"sine",660);
  tone(ctx,660,now+.09,.16,.05,"sine",990);
  tone(ctx,990,now+.21,.22,.04,"sine",1320);
 }else if(kind==="diceRoll"){
  // A short sequence of soft rattles timed to the 3D dice animation.
  for(let i=0;i<8;i++){
   const t=now+i*.17;
   noiseHit(ctx,t,.055,.055,900+Math.random()*1500);
   tone(ctx,180+Math.random()*100,t,.07,.018,"triangle",90);
  }
 }else if(kind==="diceStop"){
  noiseHit(ctx,now,.11,.09,1100);
  tone(ctx,260,now,.12,.055,"triangle",170);
  tone(ctx,660,now+.07,.13,.045,"sine",880);
  tone(ctx,990,now+.16,.2,.035,"sine",1180);
 }
}

const modal = (html) => { $("modalContent").innerHTML=html; $("modalBackdrop").classList.remove("hidden"); };
const closeModal = () => $("modalBackdrop").classList.add("hidden");
const log = msg => {const el=$("gameLog");el.innerHTML=`<div>• ${msg}</div>`+el.innerHTML;};
const shuffle = arr => [...arr].sort(()=>Math.random()-.5);
function showScreen(name){screens.menu.classList.toggle("hidden",name!=="menu");screens.game.classList.toggle("hidden",name!=="game");}
function resetGame(){
 players.forEach(p=>{p.pos=0;p.money=500;p.inventory=[];p.shield=0;p.skip=0;});
 current=0;rolling=false;gameOver=false;turns=0;questionLocked=false;playerReroll=false;
 questionPool=shuffle(window.PERCENT_QUESTIONS||[]);
 $("diceFace").textContent="?";$("turnHint").textContent="กดทอยเพื่อเริ่มเดิน";$("rollBtn").disabled=false;
 $("gameLog").textContent="เริ่มการแข่งขันได้เลย!";
 showScreen("game");Scene3D.init($("board"),tiles,players,$("diceBox"));Scene3D.reset();render();log("การแข่งขันเริ่มต้นแล้ว!");
}
function render(){
 renderBoard();renderStatus();renderLeaderboard();renderInventory();
 $("turnLabel").textContent=players[current].human?"ตาของคุณ":`ตาของ${players[current].name}`;
 $("rollBtn").disabled=rolling||gameOver||!players[current].human;
}
function renderStatus(){
 $("playerStatus").innerHTML=players.map((p,i)=>`<div class="player-card ${i===current&&!gameOver?"active":""}">
 <div class="avatar" style="background:${p.color}">${p.avatar}</div><div class="player-meta"><div class="player-name">${p.name}</div><div class="player-detail">ช่อง ${p.pos+1}/60 · ${p.money} เหรียญ</div></div></div>`).join("");
}
function renderBoard(){Scene3D.sync(players,current);}
function renderLeaderboard(){
 const sorted=[...players].sort((a,b)=>b.pos-a.pos||b.money-a.money);
 $("leaderboard").innerHTML=sorted.map((p,i)=>`<div class="rank-row"><span class="rank">${i+1}.</span><span class="rank-avatar">${p.avatar}</span><span class="rank-name">${p.name}</span><strong>${p.pos+1}/60</strong></div>`).join("");
}
function renderInventory(){
 const p=players[0];
 $("inventory").innerHTML=p.inventory.length?`<div class="inventory-list">${p.inventory.map((id,i)=>{const item=items.find(x=>x.id===id);return `<div class="inventory-item"><span>${item.icon} ${item.name}</span><button data-use="${i}">ใช้ไอเทม</button></div>`}).join("")}</div>`:"<div class='inventory-empty'>ยังไม่มีไอเทม</div>";
 $("inventory").querySelectorAll("[data-use]").forEach(b=>b.addEventListener("click",()=>useItem(Number(b.dataset.use))));
}
function nextTurn(){
 if(gameOver)return;
 current=(current+1)%players.length;
 render();
 if(!players[current].human){rolling=true;$("rollBtn").disabled=true;$("turnHint").textContent=`${players[current].name} กำลังคิด...`;setTimeout(botTurn,850+Math.random()*700);}
 else{$("turnHint").textContent="ถึงตาคุณแล้ว กดทอยลูกเต๋า";log("ถึงตาของคุณ");}
}
function rollFor(p){return 1+Math.floor(Math.random()*ROLL_MAX);}
function move(p,steps){
 rolling=true;
 p.pos=Math.min(TOTAL-1,p.pos+steps);
 $("diceFace").textContent=steps;
 log(`${p.name} เดิน ${steps} ช่อง ไปยังช่อง ${p.pos+1}`);
 render();
 Scene3D.whenIdle(p.id).then(()=>{rolling=false;if(p.pos>=TOTAL-1){finishGame(p);return;}resolveTile(p);});
}
function playerRoll(){
 if(rolling||gameOver||current!==0)return;
 rolling=true;$("rollBtn").disabled=true;
 let steps=rollFor(players[0]);
 if(playerReroll){const second=rollFor(players[0]);steps=Math.max(steps,second);playerReroll=false;log(`ใช้ลูกเต๋าวิเศษ เลือกผลที่ดีกว่า (${steps})`);}
 $("diceFace").textContent="…";
 playSfx("diceRoll");Scene3D.throwDice(steps).then(()=>{playSfx("diceStop");rolling=false;move(players[0],steps);});
}
function resolveTile(p){
 const type=tiles[p.pos];
 if(type==="question"){if(p.human)askQuestion(p);else botQuestion(p);}
 else if(type==="shop"){if(p.human){openShop(true);}else{botShop(p);if(!gameOver)setTimeout(nextTurn,650);}}
 else if(type==="bonus"){const gain=100+Math.floor(Math.random()*101);p.money+=gain;log(`${p.name} ได้โบนัส ${gain} เหรียญ`);render();if(!p.human)setTimeout(nextTurn,700);else nextTurn();}
 else if(type==="penalty"){if(p.shield>0){p.shield--;log(`${p.name} ใช้โล่ป้องกันผลเสีย`);}else if(p.inventory.includes("pass")){p.inventory.splice(p.inventory.indexOf("pass"),1);log(`${p.name} ใช้บัตรผ่าน ข้ามบทลงโทษ`);}else{const loss=Math.min(p.money,100);p.money-=loss;log(`${p.name} เสียค่าปรับ ${loss} เหรียญ`);}render();if(!p.human)setTimeout(nextTurn,750);else nextTurn();}
 else if(type==="event"){const events=[()=>{p.money+=80;log(`${p.name} ได้รับเงินพิเศษ 80 เหรียญ`)},()=>{const loss=Math.min(p.money,50);p.money-=loss;log(`${p.name} จ่ายค่าธรรมเนียม 50 เหรียญ`)},()=>{p.pos=Math.min(TOTAL-2,p.pos+1);log(`${p.name} ได้ขยับเพิ่ม 1 ช่อง`)}];events[Math.floor(Math.random()*events.length)]();render();if(!p.human)setTimeout(nextTurn,750);else nextTurn();}
 else {if(p.human)nextTurn();else setTimeout(nextTurn,550);}
}
function getQuestion(){if(!questionPool.length)questionPool=shuffle(window.PERCENT_QUESTIONS||[]);return questionPool.pop();}
function askQuestion(p){
 const q=getQuestion();questionLocked=false;
 let choices=q.a.map((a,i)=>({a,i}));
 if(p.inventory.includes("clover")){p.inventory.splice(p.inventory.indexOf("clover"),1);const wrong=shuffle(choices.filter(x=>x.i!==q.correct)).slice(0,2).map(x=>x.i);choices=choices.filter(x=>!wrong.includes(x.i));log("ใช้ใบโคลเวอร์ ตัดตัวเลือกผิด 2 ข้อ");}
 modal(`<span class="question-tag">โจทย์ร้อยละ · รับรางวัล 200 เหรียญ</span><h2 id="modalTitle">ตอบคำถามให้ถูก!</h2><p class="question-text">${q.q}</p><div class="answer-options">${choices.map(x=>`<button class="answer-option" data-answer="${x.i}">${["A","B","C","D"][x.i]}. ${x.a}</button>`).join("")}</div><div id="answerFeedback"></div>`);
 document.querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",()=>{if(questionLocked)return;questionLocked=true;const correct=Number(btn.dataset.answer)===q.correct;document.querySelectorAll("[data-answer]").forEach(b=>b.disabled=true);if(correct){p.money+=200;$("answerFeedback").innerHTML=`<div class="feedback good">✓ ถูกต้อง! ได้รับ 200 เหรียญ<br>${q.explain}</div>`;}else{$("answerFeedback").innerHTML=`<div class="feedback bad">ยังไม่ถูกต้อง ไม่ได้รับเงิน<br>คำตอบที่ถูก: ${q.a[q.correct]}<br>${q.explain}</div>`;}render();const next=document.createElement("button");next.className="btn primary";next.style.width="100%";next.style.marginTop="14px";next.textContent="ไปต่อ";next.onclick=()=>{closeModal();nextTurn();};$("answerFeedback").appendChild(next);}));
}
function botQuestion(p){
 const q=getQuestion();const correct=Math.random()<p.skill;
 if(correct){p.money+=200;log(`${p.name} ตอบคำถามถูก ได้ 200 เหรียญ`);}else{log(`${p.name} ตอบคำถามผิด`);}
 render();setTimeout(nextTurn,750);
}
function openShop(fromTile=false){
 const p=players[0];const coupon=p.inventory.includes("coupon");const discount=coupon?.5:1;
 modal(`<span class="question-tag">SHOP · ร้านค้า</span><h2 id="modalTitle">เลือกไอเทมช่วยวางแผน</h2><p>เงินของคุณ: <strong>${p.money} เหรียญ</strong>${coupon?" · มีคูปองลด 50%":""}</p><div class="shop-grid">${items.map(it=>{const price=Math.floor(it.price*discount);return `<div class="shop-item"><div class="item-icon">${it.icon}</div><h4>${it.name}</h4><p>${it.desc}</p><button data-buy="${it.id}" ${p.money<price?"disabled":""}>ซื้อ ${price} เหรียญ</button></div>`}).join("")}</div><div class="modal-actions"><button class="btn secondary" id="shopDone">${fromTile?"เสร็จแล้ว":"ปิดร้านค้า"}</button></div>`);
 document.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>{const it=items.find(x=>x.id===b.dataset.buy);const price=Math.floor(it.price*(coupon?.5:1));if(p.money<price)return;p.money-=price;p.inventory.push(it.id);if(coupon){p.inventory.splice(p.inventory.indexOf("coupon"),1);}log(`คุณซื้อ${it.name} ราคา ${price} เหรียญ`);render();openShop(fromTile);}));
 $("shopDone").onclick=()=>{closeModal();if(fromTile&&current===0)nextTurn();};
}
function botShop(p){
 const affordable=items.filter(it=>p.money>=it.price);
 if(affordable.length&&Math.random()<(p.skill*.75)){const it=affordable.sort((a,b)=>b.price-a.price)[0];p.money-=it.price;p.inventory.push(it.id);log(`${p.name} ซื้อ${it.name}`);render();}
}
function useItem(index){
 const p=players[0],id=p.inventory[index];if(!id)return;
 if(id==="shield"){p.shield++;log("คุณเตรียมโล่ป้องกันไว้แล้ว");}
 else if(id==="pass"){log("บัตรผ่านจะทำงานเมื่อเจอช่องบทลงโทษ");}
 else if(id==="coupon"){log("คูปองจะลดราคาไอเทมครั้งถัดไป");}
 else if(id==="clover"){log("ใบโคลเวอร์จะใช้ในคำถามถัดไป");}
 else if(id==="reroll"){playerReroll=true;log("เตรียมลูกเต๋าวิเศษไว้แล้ว เทิร์นถัดไปจะทอย 2 ครั้งและเลือกผลที่ดีกว่า");}
 else if(id==="slow"){const leader=[...players].filter(x=>!x.human).sort((a,b)=>b.pos-a.pos)[0];if(leader&&leader.pos>p.pos){leader.skip++;log(`ใช้${items.find(x=>x.id===id).name} ทำให้${leader.name}หยุด 1 เทิร์น`);}else{log("ยังไม่มีคู่แข่งที่นำอยู่ ไอเทมยังไม่ถูกใช้");return;}}
 p.inventory.splice(index,1);render();
}
function botTurn(){
 if(gameOver)return;const p=players[current];
 if(p.skip>0){p.skip--;log(`${p.name} ถูกหน่วง ต้องข้ามเทิร์นนี้`);rolling=false;setTimeout(nextTurn,650);return;}
 const steps=rollFor(p);$("diceFace").textContent="…";playSfx("diceRoll");Scene3D.throwDice(steps).then(()=>{playSfx("diceStop");rolling=false;move(p,steps);});
}
function finishGame(winner){
 gameOver=true;rolling=true;render();$("rollBtn").disabled=true;
 const sorted=[...players].sort((a,b)=>b.pos-a.pos);
 modal(`<div class="winner"><div class="trophy">🏆</div><span class="question-tag">การแข่งขันสิ้นสุด</span><h2 id="modalTitle">${winner.human?"คุณชนะแล้ว!":winner.name+" ชนะการแข่งขัน!"}</h2><p class="winner-score">${winner.avatar} ${winner.name} เข้าเส้นชัยเป็นคนแรก</p><div class="leaderboard" style="text-align:left;margin:18px 0">${sorted.map((p,i)=>`<div class="rank-row"><span class="rank">${i+1}.</span><span class="rank-avatar">${p.avatar}</span><span class="rank-name">${p.name}</span><strong>${p.money} เหรียญ</strong></div>`).join("")}</div><button class="btn primary" id="againBtn" style="width:100%">เล่นอีกครั้ง</button><button class="btn secondary" id="menuAgainBtn" style="width:100%;margin-top:9px">กลับหน้าแรก</button></div>`);
 $("againBtn").onclick=()=>{closeModal();resetGame();};$("menuAgainBtn").onclick=()=>{closeModal();showScreen("menu");};
}
function showRules(){modal(`<h2 id="modalTitle">วิธีเล่น MATH RACE</h2><ol class="rule-list"><li>ผู้เล่น 1 คน แข่งกับบอท 3 ตัว</li><li>แต่ละเทิร์นทอยลูกเต๋า เดิน 1–6 ช่อง</li><li>ช่องคำถาม: ตอบโจทย์ร้อยละถูก รับ 200 เหรียญ</li><li>ช่องร้านค้า: ใช้เงินซื้อไอเทมช่วยวางแผน</li><li>ช่องโบนัสรับเงิน ส่วนช่องเหตุการณ์อาจได้หรือเสียเงิน</li><li>ใครเดินถึงช่องเส้นชัยเป็นคนแรกชนะ</li></ol><button class="btn primary" id="rulesOk" style="width:100%">เข้าใจแล้ว</button>`);$("rulesOk").onclick=closeModal;}
function showSettings(){modal(`<h2 id="modalTitle">ตั้งค่า</h2><p>เสียงเอฟเฟกต์: ${soundOn?"เปิด":"ปิด"}</p><button class="btn secondary" id="soundToggle" style="width:100%">${soundOn?"ปิดเสียง":"เปิดเสียง"}</button><p>เวอร์ชันเริ่มต้น: PERCENT RACE 1.0</p>`);$("soundToggle").onclick=()=>{soundOn=!soundOn;showSettings();if(soundOn)playSfx("click");};}
$("playBtn").addEventListener("click",()=>{playSfx("enter");resetGame();});$("rulesBtn").addEventListener("click",()=>{playSfx("click");showRules();});$("settingsBtn").addEventListener("click",()=>{playSfx("click");showSettings();});
$("rulesInGame").addEventListener("click",()=>{playSfx("click");showRules();});$("homeBtn").addEventListener("click",()=>{playSfx("click");if(confirm("กลับหน้าแรก? ความคืบหน้าเกมนี้จะหายไป"))showScreen("menu");});
$("rollBtn").addEventListener("click",()=>{playSfx("click");playerRoll();});$("shopBtn").addEventListener("click",()=>{playSfx("click");openShop(false);});
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("modalBackdrop").classList.contains("hidden"))closeModal();});
showScreen("menu");
})();