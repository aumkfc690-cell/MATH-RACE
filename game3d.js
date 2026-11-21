// ฉาก 3 มิติแบบ voxel: สนาม 60 ช่อง ตัวละครกระโดด และลูกเต๋าโยน (Three.js r128)
window.Scene3D=(()=>{
const T=THREE,S=2.3,COLS=6,HOP=360;
const COL={start:"#6fcf8d",finish:"#ffd36b",question:"#6fb4f5",shop:"#ff8fb0",bonus:"#ffd24d",penalty:"#a78bfa",event:"#4fd1b5",normal:"#f6f1e6"};
const ICON={start:"🚩",finish:"🏁",question:"❓",shop:"🛍️",bonus:"💰",penalty:"⚡",event:"⭐",normal:""};
const SKIN=["#e84a3f","#ff7aa8","#8b5a3c","#ff9a3c"],OFF=[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]];
let R,sc,cam,toks=[],ready=false,focus=0,camT=new T.Vector3(),marker,cont;
let dR,dS,dC,dice,dShadow,dBusy=false;
const mat=c=>new T.MeshLambertMaterial({color:c});
const box=(w,h,d,c,x,y,z,p)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);if(p)p.add(m);return m;};
const tilePos=i=>{const r=Math.floor(i/COLS),k=i%COLS;return new T.Vector3((r%2?COLS-1-k:k)*S,0,-r*S);};
const tp=(i,id)=>{const v=tilePos(i);v.x+=OFF[id][0];v.z+=OFF[id][1];v.y=.25;return v;};

function tileTex(type,i){const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");
 g.fillStyle=COL[type];g.fillRect(0,0,128,128);g.fillStyle="rgba(255,255,255,.4)";g.fillRect(0,0,128,10);
 g.textAlign="center";g.textBaseline="middle";g.font="54px sans-serif";g.fillText(ICON[type],64,68);
 g.font="bold 24px Kanit,sans-serif";g.fillStyle="#2b4a63";g.fillText(i+1,26,20);return new T.CanvasTexture(c);}

function buildWorld(tiles){
 sc.add(new T.HemisphereLight(0xffffff,0x88aa66,.85));const sun=new T.DirectionalLight(0xffffff,.55);sun.position.set(-8,20,10);sc.add(sun);
 const gc=document.createElement("canvas");gc.width=gc.height=2;const gg=gc.getContext("2d");gg.fillStyle="#8fd45e";gg.fillRect(0,0,2,2);gg.fillStyle="#7fc84f";gg.fillRect(0,0,1,1);gg.fillRect(1,1,1,1);
 const gt=new T.CanvasTexture(gc);gt.magFilter=T.NearestFilter;gt.wrapS=gt.wrapT=T.RepeatWrapping;gt.repeat.set(16,16);
 const ground=new T.Mesh(new T.PlaneGeometry(128,128),new T.MeshLambertMaterial({map:gt}));ground.rotation.x=-Math.PI/2;ground.position.set(7,-.3,-12);sc.add(ground);
 [-9,23].forEach(x=>box(3.2,.2,70,"#5ec3f0",x,-.2,-12,sc));
 tiles.forEach((type,i)=>{const side=mat(new T.Color(COL[type]).multiplyScalar(.7));
  const m=new T.Mesh(new T.BoxGeometry(2,.5,2),[side,side,new T.MeshLambertMaterial({map:tileTex(type,i)}),side,side,side]);m.position.copy(tilePos(i));sc.add(m);});
 let n=0;for(let z=6;z>-32;z-=5){[-5.5,-13,19,26.5].forEach((x,k)=>{n++;const g=new T.Group();g.position.set(x+((n*7)%3),0,z+((n*5)%3));
  if((n+k)%3===0){box(3,2.4,3,"#ff9bb8",0,1,0,g);box(3.6,.8,3.6,"#e8607f",0,2.5,0,g);box(.8,1.2,.1,"#ffe28a",0,.6,1.55,g);}
  else{box(.6,1.6,.6,"#8a5a34",0,.6,0,g);box(2,2,2,"#4fb04f",0,2,0,g);box(1.2,1,1.2,"#6cc85c",0,3.3,0,g);}
  sc.add(g);});}
}

function mkChar(c){const g=new T.Group(),m=new T.Group();g.add(m);m.scale.setScalar(.7);
 box(.35,.5,.35,"#3b4a66",-.22,.25,0,m);box(.35,.5,.35,"#3b4a66",.22,.25,0,m);box(.95,.8,.55,c,0,.9,0,m);
 box(.25,.7,.3,c,-.62,.9,0,m);box(.25,.7,.3,c,.62,.9,0,m);box(.9,.85,.85,"#ffd9b0",0,1.75,0,m);box(1,.3,.95,c,0,2.3,0,m);
 box(.12,.16,.05,"#222",-.2,1.8,.43,m);box(.12,.16,.05,"#222",.2,1.8,.43,m);
 const sh=new T.Mesh(new T.CircleGeometry(.6,16),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.25}));sh.rotation.x=-Math.PI/2;sh.position.y=.02;g.add(sh);
 return {g,m,sh};}

function updTok(tk,now){
 if(!tk.hop&&tk.q.length)tk.hop={from:tk.tile,to:tk.q.shift(),t0:now};
 const base=tp(tk.tile,tk.id);
 if(tk.hop){const h=tk.hop,u=Math.min(1,(now-h.t0)/HOP),a=tp(h.from,tk.id),b=tp(h.to,tk.id);
  tk.g.position.lerpVectors(a,b,u);tk.g.position.y=.25+Math.sin(Math.PI*u)*1.5;
  tk.m.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);tk.m.scale.set(.7,.7*(1+.18*Math.sin(Math.PI*u)),.7);tk.sh.position.y=.02-(tk.g.position.y-.25);
  if(u>=1){tk.tile=h.to;tk.hop=null;tk.land=now;}}
 else{tk.g.position.copy(base);const s=Math.max(0,1-(now-(tk.land||0))/220);tk.m.scale.set(.7*(1+.15*s),.7*(1-.25*s),.7*(1+.15*s));tk.sh.position.y=.02;}
 if(!tk.hop&&!tk.q.length&&tk.w.length)tk.w.splice(0).forEach(f=>f());
}

function sync(players,cur){
 if(!ready)return;focus=players[cur].id;
 players.forEach(p=>{const tk=toks[p.id];const last=tk.q.length?tk.q[tk.q.length-1]:(tk.hop?tk.hop.to:tk.tile);
  if(p.pos>last){for(let i=last+1;i<=p.pos;i++)tk.q.push(i);}
  else if(p.pos<last){tk.q=[];tk.hop=null;tk.tile=p.pos;}});
}
const whenIdle=id=>{const tk=toks[id];return (!tk||(!tk.hop&&!tk.q.length))?Promise.resolve():new Promise(r=>tk.w.push(r));};

function resize(){if(!cont)return;const w=cont.clientWidth,h=cont.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
 if(dR){const dw=dR.domElement.parentNode.clientWidth,dh=dR.domElement.parentNode.clientHeight;if(dw&&dh){dR.setSize(dw,dh,false);dC.aspect=dw/dh;dC.updateProjectionMatrix();}}}

function pipTex(n){const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");g.fillStyle="#fffdf5";g.fillRect(0,0,128,128);g.strokeStyle="#e5dcc5";g.lineWidth=6;g.strokeRect(3,3,122,122);
 const P={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]};
 g.fillStyle=n===1?"#e8453c":"#2b3a55";P[n].forEach(([x,y])=>{g.beginPath();g.arc(30+x*34,30+y*34,10,0,7);g.fill();});return new T.CanvasTexture(c);}
const FACE_N={1:[0,1,0],6:[0,-1,0],3:[1,0,0],4:[-1,0,0],2:[0,0,1],5:[0,0,-1]};
function faceQ(v,yaw){const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(...FACE_N[v]),new T.Vector3(0,1,0));return q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw));}

function initDice(el){
 dR=new T.WebGLRenderer({antialias:true,alpha:true});dR.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(dR.domElement);
 dS=new T.Scene();dC=new T.PerspectiveCamera(35,2,.1,50);dC.position.set(0,7.5,6.5);dC.lookAt(0,.3,0);
 dS.add(new T.HemisphereLight(0xffffff,0xccbb99,.95));const l=new T.DirectionalLight(0xffffff,.5);l.position.set(3,8,4);dS.add(l);
 dice=new T.Mesh(new T.BoxGeometry(1.8,1.8,1.8),[3,4,1,6,2,5].map(n=>new T.MeshLambertMaterial({map:pipTex(n)})));dice.position.y=.9;dice.quaternion.copy(faceQ(1,.5));dS.add(dice);
 dShadow=new T.Mesh(new T.CircleGeometry(1.1,20),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.2}));dShadow.rotation.x=-Math.PI/2;dShadow.position.y=.01;dS.add(dShadow);
}
function throwDice(v){
 return new Promise(res=>{if(!ready||dBusy){res();return;}dBusy=true;
  const qf=faceQ(v,Math.random()*6.28),axis=new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),spin=Math.PI*2*(3+Math.random()*2),dur=1500,t0=performance.now(),x0=-2.6;
  const step=now=>{const u=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-u,3);
   dice.quaternion.setFromAxisAngle(axis,spin*(1-e)).multiply(qf);
   dice.position.set(x0*(1-e),.9+Math.abs(Math.sin(u*Math.PI*3))*Math.pow(1-u,1.5)*3.4,0);
   dShadow.scale.setScalar(1/(1+(dice.position.y-.9)*.5));
   if(u<1)requestAnimationFrame(step);else{dice.quaternion.copy(qf);dice.position.set(0,.9,0);dBusy=false;res();}};
  requestAnimationFrame(step);});
}

function loop(now){requestAnimationFrame(loop);if(!ready||!cont.clientWidth)return;
 toks.forEach(tk=>updTok(tk,now));
 const f=toks[focus];camT.lerp(f.g.position,.05);cam.position.set(camT.x-7,11.5,camT.z+12.5);cam.lookAt(camT.x,0,camT.z-2.5);
 marker.position.set(f.g.position.x,f.g.position.y+2.6+Math.sin(now/220)*.2,f.g.position.z);marker.rotation.y=now/400;
 R.render(sc,cam);dR.render(dS,dC);}

function init(el,tiles,players,diceEl){
 if(ready)return;cont=el;
 R=new T.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(R.domElement);
 sc=new T.Scene();sc.background=new T.Color("#bfeaf5");sc.fog=new T.Fog("#bfeaf5",35,75);cam=new T.PerspectiveCamera(42,1.5,.1,200);
 buildWorld(tiles);
 players.forEach(p=>{const c=mkChar(SKIN[p.id]);sc.add(c.g);toks[p.id]={id:p.id,g:c.g,m:c.m,sh:c.sh,tile:0,q:[],hop:null,w:[],land:0};});
 marker=box(.45,.45,.45,"#ffd23f",0,0,0,sc);marker.rotation.x=Math.PI/4;
 initDice(diceEl);ready=true;resize();new ResizeObserver(resize).observe(el);requestAnimationFrame(loop);
}
function reset(){if(!ready)return;toks.forEach(tk=>{tk.q=[];tk.hop=null;tk.tile=0;tk.w.splice(0).forEach(f=>f());});focus=0;camT.copy(tp(0,0));resize();}
return {init,reset,sync,whenIdle,throwDice};
})();
