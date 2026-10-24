const D = window.__D;
const FORM_URL = (D.config&&D.config.formulario_url)||""; // se edita en datos/config.json
/* guardar archivos: en claude.ai usa la capacidad de descargas; en el sitio web, descarga normal del navegador */
async function getSaver(){
  try{ if(window.claude&&window.claude.use){ const dl=await window.claude.use("downloads"); if(dl) return dl; } }catch(e){}
  return {save:async({filename,data})=>{ const u=URL.createObjectURL(data), a=document.createElement("a"); a.href=u; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); }};
}
const YEARS = (()=>{ const s=new Set(); try{ for(const k in D.police) for(const c in D.police[k].m) for(const y in D.police[k].m[c]) s.add(String(y)); }catch(e){} const a=[...s].filter(y=>/^\d{4}$/.test(y)).sort(); return a.length?a:["2019","2020","2021","2022","2023","2024","2025","2026"]; })();
const POL_RANGE=`${YEARS[0]}–${YEARS[YEARS.length-1]}`, CUR_YEAR=YEARS[YEARS.length-1];
const IND = [
  {id:"dupla", n:1, label:"Reporte departamental DUPLA", tab:"Reporte DUPLA", src:"dupla", field:"total", what:"atenciones de la Dupla Violeta"},
  {id:"fisica", n:1, label:"Violencia física", src:"dupla", field:"fisica", what:"atenciones por violencia física"},
  {id:"psico", n:1, label:"Violencia psicológica", src:"dupla", field:"psico", what:"atenciones por violencia psicológica"},
  {id:"sexual", n:1, label:"Violencia sexual", src:"police", key:"sexual", alt:"sexual", what:"casos de delitos sexuales"},
  {id:"feminicidio", n:1, label:"Feminicidio", src:"police", key:"feminicidio", what:"feminicidios"},
  {id:"lesiones", n:1, label:"Lesiones personales", src:"police", key:"lesiones", what:"casos de lesiones personales"},
  {id:"vif", n:1, label:"Violencia intrafamiliar", src:"police", key:"vif", what:"casos de violencia intrafamiliar"},
  {id:"homicidio", label:"Homicidios", src:"police", key:"homicidio", what:"homicidios"},
  {id:"amenazas", label:"Amenazas", src:"police", key:"amenazas", what:"amenazas"},
  {id:"extorsion", label:"Extorsión", src:"police", key:"extorsion", what:"extorsiones"},
  {id:"secuestro", label:"Secuestro", src:"police", key:"secuestro", what:"secuestros"},
  {id:"hurto_personas", label:"Hurto a personas", src:"police", key:"hurto_personas", what:"hurtos a personas"},
  {id:"hurto_motos", label:"Hurto de motocicletas", src:"police", key:"hurto_motos", what:"hurtos de motocicletas"},
  {id:"hurto_autos", label:"Hurto de automotores", src:"police", key:"hurto_autos", what:"hurtos de automotores"},
];
const dupRecs=()=>D.dup.r.filter(r=>S.year==="all"||String(r[1])===S.year);
let DUP={m:{},corr:{},sinMuni:0};
function duplaAgg(){ const m={}, corr={}; let sinMuni=0;
  for(const r of dupRecs()){ if(r[0]<0){ sinMuni++; continue; } const code=MUN[r[0]].code, e=m[code]||(m[code]={total:0,psico:0,fisica:0,sexual:0,eco:0,intento:0,femi:0}), b=r[5];
    e.total++; if(b&1)e.psico++; if(b&2)e.fisica++; if(b&4)e.sexual++; if(b&8)e.eco++; if(b&16)e.intento++; if(b&32)e.femi++;
    if(r[10]>=0){ const k=D.dup.corr[r[10]]; corr[k]=(corr[k]||0)+1; } }
  return {m,corr,sinMuni}; }
const S = {ind:"dupla", src:null, year:"all", measure:"casos", view:"muni", heat:false, subLines:true, labels:false, grat:true, sel:null, sort:"casos", focus:true, locTab:"barrio", layers:{corregimientos:false,comunas:false,barrios:false,veredas:false}, inst:{com:false,fis:false,ins:false,cj:false}};
try{ const s=JSON.parse(localStorage.getItem("segis-vbg2")||"{}"); for(const k of ["ind","year","measure","view","heat","subLines","labels","grat"]) if(k in s) S[k]=s[k]; }catch(e){}
/* La tasa por 100.000 mujeres queda desactivada por ahora: el geovisor muestra número de casos. */
const SHOW_RATE=false; if(!SHOW_RATE) S.measure="casos";
function save(){ try{ localStorage.setItem("segis-vbg2",JSON.stringify(S)); }catch(e){} }

const $=s=>document.querySelector(s);
const fmt=(v,d=0)=>v==null||isNaN(v)?"—":v.toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MUN=D.munis, BY=Object.fromEntries(MUN.map(m=>[m.code,m]));
const SUBS=[...new Set(MUN.map(m=>m.sub))].sort((a,b)=>a.localeCompare(b,"es"));

/* ---------- datos ---------- */
const ind=()=>IND.find(i=>i.id===S.ind);
const isDupla=()=>{ const I=ind(); return I.src==="dupla" || (I.alt && S.src==="dupla"); };
function casesFor(code){
  const I=ind();
  if(isDupla()){ const r=DUP.m[code]; return r ? (r[I.alt?I.alt:I.field]||0) : 0; }
  const r=D.police[I.key].m[code]||{};
  return S.year==="all" ? Object.values(r).reduce((a,b)=>a+b,0) : (r[S.year]||0);
}
function seriesFor(codes){ const I=ind(); return YEARS.map(y=>codes.reduce((a,c)=>a+((D.police[I.key].m[c]||{})[y]||0),0)); }
function units(view=S.view){
  const list = view==="sub"
    ? SUBS.map(s=>({id:s,name:s,codes:MUN.filter(m=>m.sub===s).map(m=>m.code)}))
    : MUN.map(m=>({id:m.code,name:m.name,codes:[m.code],sub:m.sub}));
  for(const u of list){ u.casos=u.codes.reduce((a,c)=>a+casesFor(c),0); u.pop=u.codes.reduce((a,c)=>a+BY[c].popm,0); u.rate=u.casos/u.pop*1e5; u.v=S.measure==="tasa"?u.rate:u.casos; }
  return list;
}
const periodLabel=()=>isDupla()?(S.year==="all"?`${DUP_YEARS[0]}–${DUP_YEARS[DUP_YEARS.length-1]} (todas las matrices)`:`${S.year} · ${D.dup.cobertura[S.year]}`):(S.year==="all"?POL_RANGE+" (acumulado)":(S.year===CUR_YEAR?CUR_YEAR+" (año en curso)":S.year));
const measureLabel=()=>S.measure==="tasa"?((S.year==="all"&&!isDupla())?"Tasa acumulada por 100.000 mujeres":"Tasa por 100.000 mujeres"):"Número de casos";
const sourceLabel=()=>isDupla()?"Dupla Violeta · Secretaría de Equidad de Género":"Policía Nacional · víctimas mujeres";
function deptTotals(){ const tot=MUN.reduce((a,m)=>a+casesFor(m.code),0), pop=MUN.reduce((a,m)=>a+m.popm,0); return {tot,pop,rate:tot/pop*1e5}; }

/* ---------- clasificación ---------- */
const RAMPV=["--r1","--r2","--r3","--r4","--r5"];
const PALS={"dupla": ["#E4D8F4", "#C2A8E6", "#9673CF", "#6A42AE", "#3E1F78"], "fisica": ["#F3DCEF", "#E2ADDB", "#C774BE", "#9E4398", "#6B1F68"], "psico": ["#E0E0F6", "#B8B9EA", "#8A8BD3", "#5E5DB0", "#37357A"], "sexual": ["#F2D9E6", "#DFA6C6", "#C26C9F", "#943E78", "#5E1A4C"], "feminicidio": ["#EFD5DC", "#D69CAD", "#B05B78", "#7E2B4E", "#4A0F2C"], "lesiones": ["#EDE0EC", "#D3B6D0", "#B28AAE", "#87618A", "#5A3D60"], "vif": ["#FBDCEA", "#F4A9CB", "#E26FA6", "#BC3F80", "#7D1D55"], "otros": ["#E6E3EC", "#C7C1D3", "#A097B3", "#776C8E", "#4E4663"]};
let PALK="dupla"; const palKey=()=>{ const I=ind(); return PALS[I.id]?I.id:(isDupla()?"dupla":"otros"); };
const palP=()=>PALS[PALK]||PALS.dupla;
const RAMP_PRINT=new Proxy([],{get:(o,i)=>palP()[i]});
function breaks(vals){
  const nz=vals.filter(v=>v>0).sort((a,b)=>a-b); if(!nz.length) return [];
  const uniq=[...new Set(nz)]; if(uniq.length<=5) return uniq.map(v=>[v,v]);
  const q=[]; for(let i=1;i<=5;i++) q.push(nz[Math.min(nz.length-1,Math.ceil(i/5*nz.length)-1)]);
  const b=[]; let lo=nz[0]; for(const hi of [...new Set(q)]){ b.push([lo,hi]); lo=hi; } return b;
}
const classOf=(v,b)=>{ if(!(v>0)) return -1; for(let i=0;i<b.length;i++) if(v<=b[i][1]+1e-9) return i; return b.length-1; };
const rampIdx=(i,n)=>n>=5?i:(n===1?3:Math.round(i*4/Math.max(1,n-1)));
const colorVar=(i,n)=>i<0?"var(--nodata)":`var(${RAMPV[rampIdx(i,n)]})`;
const colorPrint=(i,n)=>i<0?"#ECE9F1":RAMP_PRINT[rampIdx(i,n)];
const rangeTxt=r=>{ const d=S.measure==="tasa"?1:0; return r[0]===r[1]?fmt(r[0],d):`${fmt(r[0],d)} – ${fmt(r[1],d)}`; };

/* ---------- geometría ---------- */
const X=lon=>(lon+80)*100, Y=lat=>(3.2-lat)*100;
const KM_PER_UNIT=1.1132; // 1 unidad = 0,01° ≈ 1,113 km a esta latitud
const pathOf=polys=>{ let d=""; for(const P of polys) for(const r of P) d+="M"+r.map(p=>X(p[0]).toFixed(2)+","+Y(p[1]).toFixed(2)).join("L")+"Z"; return d; };
const lineOf=pts=>"M"+pts.map(p=>X(p[0]).toFixed(2)+","+Y(p[1]).toFixed(2)).join("L");
const NS="http://www.w3.org/2000/svg", svg=$("#map");
function el(tag,attrs,parent){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }
let bx=[1e9,1e9,-1e9,-1e9];
for(const m of MUN) for(const P of m.g) for(const p of P[0]){ const x=X(p[0]),y=Y(p[1]); bx=[Math.min(bx[0],x),Math.min(bx[1],y),Math.max(bx[2],x),Math.max(bx[3],y)]; }
const HOME={x:bx[0]-10,y:bx[1]-8,w:bx[2]-bx[0]+20,h:bx[3]-bx[1]+16};
let vb={...HOME};

const gCtx=el("g",{},svg), gGrat=el("g",{},svg), gMun=el("g",{},svg), gHeat=el("g",{},svg), gSub=el("g",{},svg), gDept=el("g",{},svg), gPasto=el("g",{},svg), gLab=el("g",{},svg);
for(const c of D.ctx) el("path",{d:pathOf(c.g),class:"ctx"},gCtx);
const CTXL=[["CAUCA",-77.35,2.55],["PUTUMAYO",-76.75,0.95],["ECUADOR",-78.3,0.75],["OCÉANO PACÍFICO",-79.3,2.15]];
const ctxText=CTXL.map(([t,lo,la])=>{ const e=el("text",{x:X(lo),y:Y(la),class:"ctxlabel","text-anchor":"middle"},gCtx); e.textContent=t; return e; });
const gratText=[];
for(let lon=-80;lon<=-76;lon+=0.5){ el("path",{d:`M${X(lon)},${Y(4)}L${X(lon)},${Y(-0.5)}`,class:"grat"},gGrat); }
for(let lat=0;lat<=3.5;lat+=0.5){ el("path",{d:`M${X(-80.5)},${Y(lat)}L${X(-75.5)},${Y(lat)}`,class:"grat"},gGrat); }
const muniEl={};
for(const m of MUN) muniEl[m.code]=el("path",{d:pathOf(m.g),class:"muni","data-code":m.code},gMun);
for(const l of D.sublines) el("path",{d:lineOf(l),class:"subline"},gSub);
for(const l of D.deptline) el("path",{d:lineOf(l),class:"deptline"},gDept);
const mlabels=MUN.map(m=>{ const t=el("text",{x:X(m.c[0]),y:Y(m.c[1]),class:"mlabel","text-anchor":"middle","dominant-baseline":"middle"},gLab); t.textContent=m.name; return t; });
function subCenter(s){ const ms=MUN.filter(m=>m.sub===s); let w=0,x=0,y=0; for(const m of ms){ const a=m.area||1; w+=a; x+=m.c[0]*a; y+=m.c[1]*a; } return [x/w,y/w]; }
const SUBC=Object.fromEntries(SUBS.map(s=>[s,subCenter(s)]));
const slabels=SUBS.map(s=>{ const t=el("text",{x:X(SUBC[s][0]),y:Y(SUBC[s][1]),class:"slabel","text-anchor":"middle","dominant-baseline":"middle"},gLab); t.textContent=s; return t; });

function pxScale(){ const r=svg.getBoundingClientRect(); return Math.max(vb.w/(r.width||800), vb.h/(r.height||600)); }
function applyVB(){
  svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const k=pxScale();
  const sz=(arr,f,s)=>{ for(const t of arr){ t.setAttribute("font-size",(f*k).toFixed(3)); t.setAttribute("stroke-width",(s*k).toFixed(3)); } };
  sz(mlabels,10.5,3); sz(slabels,12.5,3.5); sz(ctxText,11,3); sz(gLay.querySelectorAll("text"),10.5,3); gLay.classList.toggle("far",vb.w>HOME.w*0.15); gLay.classList.toggle("deep",vb.w<HOME.w*0.05); try{ scaleMarks(k); }catch(e){} updateOverview();
  // escala gráfica
  const nice=[1,2,5,10,20,25,50,100,200]; const kmPerPx=k*KM_PER_UNIT; let km=nice[0]; for(const n of nice) if(n/kmPerPx<=130) km=n;
  $("#scaleb").style.width=(km/kmPerPx).toFixed(1)+"px"; $("#scalet").textContent=`0 · ${km} km`;
}
function zoomAt(f,cx,cy){
  const nw=Math.min(HOME.w*1.8,Math.max(HOME.w/80,vb.w*f)); f=nw/vb.w;
  if(cx==null){ cx=vb.x+vb.w/2; cy=vb.y+vb.h/2; }
  vb={x:cx-(cx-vb.x)*f,y:cy-(cy-vb.y)*f,w:vb.w*f,h:vb.h*f}; applyVB();
}
function toMap(ev){ const r=svg.getBoundingClientRect(); const k=Math.max(vb.w/r.width,vb.h/r.height); const ox=vb.x+(vb.w-r.width*k)/2, oy=vb.y+(vb.h-r.height*k)/2; return [ox+(ev.clientX-r.left)*k, oy+(ev.clientY-r.top)*k]; }
function boundsOf(codes){ let b=[1e9,1e9,-1e9,-1e9]; for(const c of codes) for(const P of BY[c].g) for(const p of P[0]){ const x=X(p[0]),y=Y(p[1]); b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)]; } return b; }
function fitTo(codes,pad=0.25){ const b=boundsOf(codes); const w=b[2]-b[0], h=b[3]-b[1]; vb={x:b[0]-w*pad,y:b[1]-h*pad,w:w*(1+2*pad),h:h*(1+2*pad)}; applyVB(); }
svg.addEventListener("wheel",e=>{ e.preventDefault(); const [x,y]=toMap(e); zoomAt(e.deltaY>0?1.18:1/1.18,x,y); },{passive:false});
const ptrs=new Map(); let drag=null, moved=0, pinch=null;
svg.addEventListener("pointerdown",e=>{ ptrs.set(e.pointerId,e); svg.setPointerCapture(e.pointerId); moved=0;
  if(ptrs.size===1) drag={x:e.clientX,y:e.clientY,vb:{...vb}};
  if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),vb:{...vb}}; drag=null; } });
svg.addEventListener("pointermove",e=>{
  if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId,e);
  if(pinch&&ptrs.size===2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); vb={...pinch.vb}; const [x,y]=toMap({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2}); zoomAt(pinch.d/d,x,y); moved=99; return; }
  if(drag){ const r=svg.getBoundingClientRect(); const k=Math.max(drag.vb.w/r.width,drag.vb.h/r.height); const dx=e.clientX-drag.x, dy=e.clientY-drag.y; moved=Math.max(moved,Math.hypot(dx,dy));
    if(moved>3){ svg.classList.add("dragging"); vb={...drag.vb,x:drag.vb.x-dx*k,y:drag.vb.y-dy*k}; applyVB(); hideTip(); } return; }
  hover(e); });
function endPtr(e){ ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null; if(!ptrs.size){ svg.classList.remove("dragging"); if(drag&&moved<=3) clickAt(document.elementFromPoint(e.clientX,e.clientY)); drag=null; } }
svg.addEventListener("pointerup",endPtr); svg.addEventListener("pointercancel",endPtr); svg.addEventListener("pointerleave",()=>hideTip());
$("#zIn").onclick=()=>zoomAt(1/1.4); $("#zOut").onclick=()=>zoomAt(1.4); $("#zReset").onclick=()=>{ vb={...HOME}; applyVB(); };
window.addEventListener("resize",applyVB);

/* ---------- interacción ---------- */
let U=[], B=[];
const nCasos=(v,w)=>{ w=w||(isDupla()?"atención":"caso"); return fmt(v)+" "+(v===1?w:(w==="atención"?"atenciones":w+"s")); };
const unitOfCode=code=>S.view==="sub"?U.find(u=>u.id===BY[code].sub):U.find(u=>u.id===code);
const tip=$("#tip"); const hideTip=()=>{ tip.hidden=true; };
function showTip(e,html){ const r=$(".mapbox").getBoundingClientRect(); tip.innerHTML=html; tip.style.left=(e.clientX-r.left)+"px"; tip.style.top=(e.clientY-r.top)+"px"; tip.hidden=false; }
function hover(e){ const t=e.target;
  if(t.classList&&t.classList.contains("muni")){ const u=unitOfCode(t.dataset.code); if(t.classList.contains("dim")){ showTip(e,`<b>${esc(BY[t.dataset.code].name)}</b> · <span style="opacity:.75">municipio vecino: tóquelo para verlo</span>`); return; } showTip(e,`<b>${esc(u.name)}</b> · ${S.measure==="tasa"?fmt(u.rate,1)+" por 100 mil":nCasos(u.casos)}`); }
  else if(t.classList&&(t.classList.contains("pl")||t.classList.contains("cp"))) showTip(e,t.dataset.tip); else if(t.closest&&t.closest(".inst")) showTip(e,t.closest(".inst").dataset.tip); else hideTip(); }
function clickAt(t){ const ig=t&&t.closest&&t.closest(".inst"); if(ig){ showInst(+ig.dataset.i); return; } if(t&&t.classList&&t.classList.contains("muni")){ const c=t.dataset.code; S.sel=S.view==="sub"?BY[c].sub:c; render(); if(S.focus) fitTo(focusCodes(),BY[S.sel]?0.35:0.15); } else if(t===svg&&!S.focus){ S.sel=null; render(); } }
const focusCodes=()=>S.sel&&S.focus?(BY[S.sel]?[S.sel]:MUN.filter(m=>m.sub===S.sel).map(m=>m.code)):null;
function fitView(codes,rect,pad){ const b=boundsOf(codes), w=(b[2]-b[0])*(1+2*pad), h=(b[3]-b[1])*(1+2*pad), asp=rect.w/rect.h; let vw=w, vh=h; if(vw/vh<asp) vw=vh*asp; else vh=vw/asp; return {x:(b[0]+b[2])/2-vw/2,y:(b[1]+b[3])/2-vh/2,w:vw,h:vh}; }

/* ---------- mapa de calor ---------- */
const HEAT=[[242,182,50],[236,122,44],[212,42,60]];
function heatCanvas(W){
  const H=Math.round(W*HOME.h/HOME.w), cv=document.createElement("canvas"); cv.width=W; cv.height=H; const cx=cv.getContext("2d");
  const pts=MUN.map(m=>({m,c:casesFor(m.code)})).filter(p=>p.c>0); if(!pts.length) return null;
  const vals=pts.map(p=>S.measure==="tasa"?p.c/p.m.popm*1e5:p.c), mx=Math.max(...vals);
  pts.forEach((p,i)=>{ const w=Math.sqrt(vals[i]/mx), x=(X(p.m.c[0])-HOME.x)/HOME.w*W, y=(Y(p.m.c[1])-HOME.y)/HOME.h*H, rad=W*(0.045+0.06*w);
    const g=cx.createRadialGradient(x,y,0,x,y,rad); const a=0.15+0.85*w; g.addColorStop(0,`rgba(0,0,0,${a})`); g.addColorStop(.5,`rgba(0,0,0,${a*.45})`); g.addColorStop(1,"rgba(0,0,0,0)"); cx.fillStyle=g; cx.fillRect(x-rad,y-rad,rad*2,rad*2); });
  const im=cx.getImageData(0,0,W,H), d=im.data;
  for(let i=0;i<d.length;i+=4){ const t=Math.min(1,d[i+3]/255); if(t<0.04){ d[i+3]=0; continue; } const s=t<.5?0:1, f=t<.5?t/.5:(t-.5)/.5, c0=HEAT[s], c1=HEAT[s+1];
    d[i]=c0[0]+(c1[0]-c0[0])*f; d[i+1]=c0[1]+(c1[1]-c0[1])*f; d[i+2]=c0[2]+(c1[2]-c0[2])*f; d[i+3]=Math.round(60+170*t); }
  cx.putImageData(im,0,0); return cv;
}
/* ---- calor dentro del municipio: casos ubicados por barrio, vereda o centro poblado ---- */
let LOCIDX=null;
function locIndex(){ if(LOCIDX) return LOCIDX; LOCIDX={};
  for(const [kind,type] of [["barrios","barrio"],["veredas","vereda"],["corregimientos","corregimiento"]]){ const L=LAY[kind]; if(!L) continue;
    for(const f of L.features){ if(!f.code) continue; const o=((LOCIDX[f.code]=LOCIDX[f.code]||{})[type]=LOCIDX[f.code][type]||{}); o[locKey(f.name)]=f.c; } }
  return LOCIDX; }
function findLoc(code,type,key){ const I=locIndex()[code]||{}, order=[type,...["barrio","vereda","corregimiento"].filter(x=>x!==type)];
  for(const ty of order){ const o=I[ty]; if(!o) continue; if(o[key]) return o[key]; if(key.length>=5){ const h=Object.keys(o).find(x=>x.length>=5&&(x.startsWith(key+" ")||key.startsWith(x+" "))); if(h) return o[h]; } if(ty===type&&ty==="barrio") break; }
  return null; }
function localHeatPts(codes){ const pts=[]; let tot=0, placed=0;
  for(const code of codes) for(const type of ["barrio","vereda","corregimiento"]){ const C=locCounts(code,type);
    for(const k in C){ tot+=C[k].v; let ll=findLoc(code,type,k);
      if(!ll&&type==="barrio"){ const cb=(D.inst&&D.inst.pts||[]).find(q=>q.t==="ins"&&q.c===code); if(cb) ll=cb.ll; } if(ll){ placed+=C[k].v; pts.push({x:X(ll[0]),y:Y(ll[1]),v:C[k].v}); } } }
  return {pts,tot,placed}; }
let HEATINFO=null;
function heatLocalCanvas(codes,W){
  const {pts,tot,placed}=localHeatPts(codes); HEATINFO={tot,placed,n:pts.length}; if(!pts.length) return null;
  const b=boundsOf(codes), pad=(b[2]-b[0])*.04, bx=[b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad], bw=bx[2]-bx[0], bh=bx[3]-bx[1], H=Math.round(W*bh/bw);
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const cx=cv.getContext("2d"), s=W/bw, mx=Math.max(...pts.map(p=>p.v));
  const rad=Math.max(W*.035,Math.min(W*.09,W*0.6/Math.sqrt(pts.length+4)));
  for(const p of pts){ const w=Math.sqrt(p.v/mx), x=(p.x-bx[0])*s, y=(p.y-bx[1])*s, r=rad*(0.75+0.6*w), a=0.25+0.75*w;
    const g=cx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(0,0,0,${a})`); g.addColorStop(.5,`rgba(0,0,0,${a*.45})`); g.addColorStop(1,"rgba(0,0,0,0)"); cx.fillStyle=g; cx.fillRect(x-r,y-r,2*r,2*r); }
  const im=cx.getImageData(0,0,W,H), d=im.data;
  for(let i=0;i<d.length;i+=4){ const tt=Math.min(1,d[i+3]/255); if(tt<0.04){ d[i+3]=0; continue; } const k=tt<.5?0:1, f=tt<.5?tt/.5:(tt-.5)/.5, c0=HEAT[k], c1=HEAT[k+1];
    d[i]=c0[0]+(c1[0]-c0[0])*f; d[i+1]=c0[1]+(c1[1]-c0[1])*f; d[i+2]=c0[2]+(c1[2]-c0[2])*f; d[i+3]=Math.round(70+170*tt); }
  cx.putImageData(im,0,0);
  // recortar al límite municipal
  cx.globalCompositeOperation="destination-in"; cx.beginPath();
  for(const code of codes) for(const P of BY[code].g) for(const r of P){ r.forEach((q,i)=>{ const x=(X(q[0])-bx[0])*s, y=(Y(q[1])-bx[1])*s; i?cx.lineTo(x,y):cx.moveTo(x,y); }); cx.closePath(); }
  cx.fillStyle="#000"; cx.fill("evenodd"); cx.globalCompositeOperation="source-over";
  return {cv,box:{x:bx[0],y:bx[1],w:bw,h:bh}};
}
function drawHeatLocal(codes){ gHeat.innerHTML=""; const r=heatLocalCanvas(codes,900); if(r) el("image",{href:r.cv.toDataURL(),x:r.box.x,y:r.box.y,width:r.box.w,height:r.box.h,preserveAspectRatio:"none","pointer-events":"none"},gHeat); }
function drawHeat(){ gHeat.innerHTML=""; if(!S.heat) return; const cv=heatCanvas(720); if(cv) el("image",{href:cv.toDataURL(),x:HOME.x,y:HOME.y,width:HOME.w,height:HOME.h,preserveAspectRatio:"none","pointer-events":"none"},gHeat); }

/* ---------- capas de Pasto ---------- */
/* ================= CAPAS TERRITORIALES: corregimientos, comunas, barrios, veredas ================= */
const MIDX=Object.fromEntries(MUN.map((m,i)=>[m.code,i]));
const LKINDS=[["corregimientos","Corregimientos","corregimiento"],["comunas","Comunas",null],["barrios","Barrios","barrio"],["veredas","Veredas","vereda"]];
const LAY={corregimientos:null,comunas:null,barrios:null,veredas:null};
const cap=s=>s[0].toUpperCase()+s.slice(1);
const titleCase=s=>String(s).split(/(\s+|-)/).map((w,i)=>i>0&&/^(de|del|la|las|los|el|y)$/.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join("");
const deacc=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const LOC_PREF=/^(barrio|brr|br|b|urbanizacion|urb|conjunto|conj|sector|asentamiento|vereda|vda|vrda|corregimiento|correg|corr|cto|inspeccion|caserio|resguardo|comuna)\s+(de\s+|del\s+)?/;
function locKey(s){ let k=deacc(s).replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim(); for(let i=0;i<2;i++) k=k.replace(LOC_PREF,"").trim(); return k; }
function comunaKey(s){ const k=locKey(s), m=k.match(/\b(\d{1,2})\b/); if(m) return String(+m[1]); const R={uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12}; for(const w in R) if(new RegExp("\\b"+w+"\\b").test(k)) return String(R[w]); return k; }

/* casos por localidad (Policía: campo «barrio» de la matriz; Dupla: corregimientos de Pasto) */
function locCounts(code,type){
  const out={};
  if(isDupla()){ if(type==="corregimiento"&&code==="52001") for(const k in DUP.corr) out[locKey(k)]={name:k,v:DUP.corr[k]}; return out; }
  const X=((D.loc.x[ind().key]||{})[MIDX[code]])||{}, yi=S.year==="all"?-1:D.loc.years.indexOf(S.year), ti=D.loc.types.indexOf(type);
  for(const k in X){ const a=X[k]; if(a[0]!==ti) continue; const v=yi<0?sum(a.slice(1)):(a[1+yi]||0); if(v>0) out[k]={name:titleCase(k),v}; }
  return out;
}
/* barrio de la matriz -> comuna (capa de barrios de Pasto con su comuna) */
let COMIDX=null;
function comunaOf(code,key){
  if(!LAY.barrios) return null;
  if(!COMIDX){ COMIDX={}; for(const f of LAY.barrios.features) if(f.code&&f.comuna){ (COMIDX[f.code]=COMIDX[f.code]||{})[locKey(f.name)]=comunaKey(f.comuna); } }
  const I=COMIDX[code]; if(!I) return null; if(I[key]) return I[key];
  if(key.length>=5){ const h=Object.keys(I).find(x=>x.length>=5&&(x.startsWith(key+" ")||key.startsWith(x+" "))); if(h) return I[h]; }
  return null;
}
function locGroups(code){
  const urb=Object.entries(locCounts(code,"barrio")).map(([k,x])=>({id:k,name:x.name,v:x.v})).sort((a,b)=>b.v-a.v);
  const rur=["corregimiento","vereda"].flatMap(t=>Object.entries(locCounts(code,t)).map(([k,x])=>({id:k,name:x.name,v:x.v,t}))).sort((a,b)=>b.v-a.v);
  let com=null;
  if(COMIDX!==false&&LAY.barrios&&LAY.barrios.features.some(f=>f.code===code&&f.comuna)){ const g={};
    for(const x of urb){ const c=comunaOf(code,x.id), k=c&&c!=="0"?"Comuna "+c:"Sin comuna"; (g[k]=g[k]||{name:k,v:0,items:[]}); g[k].v+=x.v; g[k].items.push(x); }
    com=Object.values(g).sort((a,b)=>(a.name.startsWith("Sin")?1:0)-(b.name.startsWith("Sin")?1:0)||b.v-a.v); }
  return {urb,rur,com};
}
function locDetail(code){
  const name=BY[code].name, G=locGroups(code), W=isDupla()?"atenciones":"casos";
  const tabs=[{t:"barrio",l:G.com?"Comunas y barrios":"Barrios",n:G.urb.length,arr:G.urb},{t:"rural",l:"Corregimientos y veredas",n:G.rur.length,arr:G.rur}];
  const cur=tabs.find(x=>x.t===S.locTab&&x.n)||tabs.find(x=>x.n)||tabs[0];
  if(!tabs.some(x=>x.n)) return `<div><span class="eyebrow">${esc(name)} · casos por localidad</span><p class="hint">${isDupla()?"Las matrices de la Dupla no registran barrio ni vereda.":"Sin localidad registrada en el periodo."}</p></div>`;
  let body, tot=sum(cur.arr.map(x=>x.v));
  if(cur.t==="barrio"&&G.com){ const mx=Math.max(...G.com.map(g=>g.v));
    body=`<div class="bars">`+G.com.map(g=>`<div class="cgroup">${barsHTML([{id:g.name,name:g.name,v:g.v}],{dec:0,mxv:mx}).replace('<div class="bars">','').replace(/<\/div>$/,'')}<div class="sub">${g.items.slice(0,6).map(x=>`${esc(x.name)} (${fmt(x.v)})`).join(" · ")}${g.items.length>6?` · y ${g.items.length-6} más`:""}</div></div>`).join("")+`</div>`;
    body+=`<p class="hint">${fmt(tot)} ${W} en ${G.urb.length} barrios con registro, agrupados en su comuna según la capa de barrios de Pasto. Active la capa de comunas para verlos en el mapa.</p>`; }
  else { body=barsHTML(cur.arr.slice(0,12).map(x=>({...x,name:x.t==="corregimiento"?x.name+" (correg.)":x.name})),{dec:0})+`<p class="hint">${fmt(tot)} ${W} en ${cur.n} ${cur.l.toLowerCase()} con registro, según el campo «barrio» de la matriz${cur.n>12?"; se muestran los 12 con más casos":""}.${cur.t==="rural"?" Active la capa de corregimientos para verlos en el mapa.":""}</p>`; }
  return `<div class="locbox"><span class="eyebrow">${esc(name)} · casos por localidad</span>
    <div class="seg loctabs" role="tablist">${tabs.map(x=>`<button type="button" data-t="${x.t}" aria-pressed="${x===cur}" ${x.n?"":"disabled"}>${x.l} <span class="num">${x.n}</span></button>`).join("")}</div>${body}</div>`;
}
function locParts(code){ const g=t=>Object.entries(locCounts(code,t)).map(([k,x])=>({id:k,name:x.name,v:x.v})).sort((a,b)=>b.v-a.v); return {corr:g("corregimiento"),bar:g("barrio"),ver:g("vereda")}; }

/* ---- proyecciones (MAGNA-SIRGAS, GRS80) ---- */
const GRS={a:6378137,f:1/298.257222101};
const TM={ "9377":{lat0:4,lon0:-73,k0:0.9992,FE:5000000,FN:2000000,n:"MAGNA-SIRGAS Origen Nacional (EPSG:9377)"},
  "3115":{lat0:4.596200416666666,lon0:-77.07750791666666,k0:1,FE:1000000,FN:1000000,n:"MAGNA-SIRGAS Colombia Oeste (EPSG:3115)"},
  "3116":{lat0:4.596200416666666,lon0:-74.07750791666666,k0:1,FE:1000000,FN:1000000,n:"MAGNA-SIRGAS Colombia Bogotá (EPSG:3116)"},
  "3114":{lat0:4.596200416666666,lon0:-80.07750791666666,k0:1,FE:1000000,FN:1000000,n:"MAGNA-SIRGAS Colombia Oeste Oeste (EPSG:3114)"} };
function tmInverse(x,y,p){
  const a=GRS.a,f=GRS.f,e2=f*(2-f),ep2=e2/(1-e2),d2r=Math.PI/180,phi0=p.lat0*d2r;
  const Mf=ph=>a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*ph-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*ph)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*ph)-(35*e2**3/3072)*Math.sin(6*ph));
  const Mm=Mf(phi0)+(y-p.FN)/p.k0, mu=Mm/(a*(1-e2/4-3*e2*e2/64-5*e2**3/256)), e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
  const s=Math.sin(p1),c=Math.cos(p1),t=Math.tan(p1),C1=ep2*c*c,T1=t*t,N1=a/Math.sqrt(1-e2*s*s),R1=a*(1-e2)/Math.pow(1-e2*s*s,1.5),Dd=(x-p.FE)/(N1*p.k0);
  const lat=p1-(N1*t/R1)*(Dd*Dd/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*Dd**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*Dd**6/720);
  const lon=p.lon0*d2r+(Dd-(1+2*T1+C1)*Dd**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*Dd**5/120)/c;
  return [lon/d2r,lat/d2r];
}
const merc=(x,y)=>[x/6378137*180/Math.PI,(2*Math.atan(Math.exp(y/6378137))-Math.PI/2)*180/Math.PI];
function crsFromText(t){ const s=String(t||"").toUpperCase();
  if(/9377|ORIGEN.?NACIONAL|CTM.?12/.test(s)) return "9377";
  if(/3857|900913|WEB.?MERCATOR|PSEUDO.?MERCATOR|AUXILIARY_SPHERE/.test(s)) return "3857";
  if(/3114|OESTE.?OESTE|FAR_WEST|FAR WEST/.test(s)) return "3114";
  if(/3115|COLOMBIA.?WEST|COLOMBIA_WEST|OESTE/.test(s)) return "3115";
  if(/3116|BOGOTA.?ZONE|COLOMBIA.?BOGOTA|MAGNA.?BOGOTA/.test(s)) return "3116";
  if(/GEOGCS|4686|4326|CRS84/.test(s)&&!/PROJCS/.test(s)) return "4326";
  return null; }
const inNarino=([lo,la])=>lo>-79.6&&lo<-76.4&&la>0.1&&la<3.2;
function pickTransform(sample,hint){
  const cands=[]; if(hint) cands.push(hint); cands.push("4326","9377","3857","3115","3116","3114");
  for(const c of cands){ const fn=transformFor(c); if(fn&&inNarino(fn(sample[0],sample[1]))) return {code:c,fn}; }
  return null;
}
function transformFor(c){ if(c==="4326") return (x,y)=>[x,y]; if(c==="3857") return merc; if(TM[c]) return (x,y)=>tmInverse(x,y,TM[c]); return null; }

/* ---- lector de shapefile en .zip (sin librerías) ---- */
async function unzip(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf); let eocd=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-70000);i--) if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  if(eocd<0) throw new Error("el archivo .zip no es válido");
  const n=dv.getUint16(eocd+10,true); let p=dv.getUint32(eocd+16,true); const files={};
  for(let k=0;k<n;k++){ const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), el_=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl)); p+=46+nl+el_+cl;
    const lnl=dv.getUint16(off+26,true), lel=dv.getUint16(off+28,true), data=u8.subarray(off+30+lnl+lel,off+30+lnl+lel+csize);
    files[name]={method,data}; }
  const get=async(name)=>{ const f=files[name]; if(f.method===0) return f.data.slice().buffer;
    if(f.method!==8) throw new Error("compresión del .zip no soportada");
    const ds=new DecompressionStream("deflate-raw"); const out=await new Response(new Blob([f.data]).stream().pipeThrough(ds)).arrayBuffer(); return out; };
  return {names:Object.keys(files),get};
}
function readDbf(buf){
  const dv=new DataView(buf), n=dv.getUint32(4,true), hl=dv.getUint16(8,true), rl=dv.getUint16(10,true), fields=[]; const u8=new Uint8Array(buf);
  for(let p=32;p<hl-1&&u8[p]!==0x0D;p+=32){ let nm=""; for(let i=0;i<11&&u8[p+i];i++) nm+=String.fromCharCode(u8[p+i]); fields.push({nm,len:u8[p+16]}); }
  let dec; try{ dec=new TextDecoder("utf-8",{fatal:true}); dec.decode(u8.subarray(hl,hl+Math.min(rl*n,20000))); }catch(e){ dec=new TextDecoder("windows-1252"); }
  const rows=[]; for(let r=0;r<n;r++){ let p=hl+r*rl+1; const o={}; for(const f of fields){ o[f.nm]=dec.decode(u8.subarray(p,p+f.len)).trim(); p+=f.len; } rows.push(o); }
  return rows;
}
function readShp(buf){
  const dv=new DataView(buf), out=[]; let p=100;
  while(p+8<=buf.byteLength){ const len=dv.getInt32(p+4,false)*2, t=dv.getInt32(p+8,true);
    if([5,15,25].includes(t)){ const np=dv.getInt32(p+44,true), npt=dv.getInt32(p+48,true), parts=[]; for(let i=0;i<np;i++) parts.push(dv.getInt32(p+52+4*i,true));
      const pb=p+52+4*np, rings=[]; for(let i=0;i<np;i++){ const a=parts[i], b=i+1<np?parts[i+1]:npt, r=[]; for(let j=a;j<b;j++) r.push([dv.getFloat64(pb+16*j,true),dv.getFloat64(pb+16*j+8,true)]); rings.push(r); }
      out.push({type:"Polygon",rings}); } else out.push(null);
    p+=8+len; }
  return out;
}
async function parseLayerFile(file){
  const nm=file.name.toLowerCase();
  if(nm.endsWith(".zip")){
    const z=await unzip(await file.arrayBuffer()), shp=z.names.find(n=>/\.shp$/i.test(n)), dbf=z.names.find(n=>/\.dbf$/i.test(n)), prj=z.names.find(n=>/\.prj$/i.test(n));
    if(!shp||!dbf) throw new Error("el .zip debe contener los archivos .shp y .dbf de la capa");
    const geoms=readShp(await z.get(shp)), rows=readDbf(await z.get(dbf)), prjTxt=prj?new TextDecoder().decode(await z.get(prj)):"";
    return {feats:geoms.map((g,i)=>g?{rings:g.rings,props:rows[i]||{}}:null).filter(Boolean),hint:crsFromText(prjTxt),prjTxt};
  }
  const gj=JSON.parse(await file.text()); const feats=[];
  for(const f of (gj.features||[])){ const g=f.geometry; if(!g) continue;
    if(g.type==="Polygon") feats.push({rings:g.coordinates,props:f.properties||{}});
    else if(g.type==="MultiPolygon") feats.push({rings:g.coordinates.flat(1),props:f.properties||{}}); }
  return {feats,hint:crsFromText(JSON.stringify(gj.crs||""))};
}
const NAME_KEYS=["NOMBRE_VER","NOM_VEREDA","NOMB_VERED","VEREDA","NOM_BARRIO","NOMBRE_BAR","BARRIO","NOM_CORREG","NOMBRE_COR","CORREGIMIE","CORREGIMIENTO","NOM_COMUNA","NOMBRE_COM","NOMBRE","NOM","NAME","Nombre","nombre","name"];
const MUN_KEYS=["DPTOMPIO","MPIO_CCNCT","COD_MPIO","CODMPIO","COD_MUN","MPIO_CDPMP","CODIGO_MUN","MPIO_CNMBR","NOM_MPIO","NOMB_MPIO","MUNICIPIO","Municipio","municipio"];
const COMUNA_KEYS=["COMUNA","NOM_COMUNA","NUM_COMUNA","Comuna","comuna","COD_COMUNA"];
function propOf(props,keys){ for(const k of keys){ const hit=Object.keys(props).find(p=>p.toUpperCase()===k.toUpperCase()); if(hit&&props[hit]!==""&&props[hit]!=null) return String(props[hit]); } return null; }
function pip(pt,ring){ let c=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){ const [x1,y1]=ring[i],[x2,y2]=ring[j]; if((y1>pt[1])!==(y2>pt[1])&&pt[0]<(x2-x1)*(pt[1]-y1)/(y2-y1)+x1) c=!c; } return c; }
function muniOfPoint(pt){ for(const m of MUN) for(const P of m.g) if(pip(pt,P[0])) return m.code; return null; }
function muniOfProps(props){ const v=propOf(props,MUN_KEYS); if(!v) return null; const digits=v.replace(/\D/g,""); if(digits.length===5&&BY[digits]) return digits;
  const k=deacc(v).replace(/[^a-z ]/g," ").trim(); const m=MUN.find(x=>deacc(x.name)===k)||MUN.find(x=>k&&deacc(x.name).includes(k)); return m?m.code:null; }

async function loadTerritorial(kind,file){
  const st=$("#st-"+kind); st.textContent="Leyendo…";
  try{
    const {feats,hint}=await parseLayerFile(file);
    if(!feats.length) throw new Error("no se encontraron polígonos");
    const s0=feats[0].rings[0][0], tr=pickTransform(s0,hint);
    if(!tr) throw new Error("no se reconoce el sistema de coordenadas. Exporte la capa en WGS84 (EPSG:4326) o MAGNA-SIRGAS Origen Nacional (EPSG:9377)");
    const out=[];
    for(const f of feats){
      const rings=f.rings.map(r=>r.map(([x,y])=>tr.fn(x,y)));
      let sx=0,sy=0,n=0,A=0,best=rings[0]; for(const r of rings){ const a=Math.abs(r.reduce((s,p,i)=>{ const q=r[(i+1)%r.length]; return s+p[0]*q[1]-q[0]*p[1]; },0)); if(a>A){ A=a; best=r; } }
      for(const p of best){ sx+=p[0]; sy+=p[1]; n++; } const c=[sx/n,sy/n];
      const name=propOf(f.props,NAME_KEYS)||"(sin nombre)";
      const code=muniOfProps(f.props)||muniOfPoint(c);
      out.push({name,code,comuna:propOf(f.props,COMUNA_KEYS),c,d:"M"+rings.map(r=>r.map(p=>X(p[0]).toFixed(2)+","+Y(p[1]).toFixed(2)).join("L")).join("ZM")+"Z"});
    }
    LAY[kind]={features:out,crs:tr.code,file:file.name}; const src=$("#src-"+kind); if(src) src.textContent="Capa cargada desde «"+file.name+"» (solo en este navegador).";
    const cb=$("#ly-"+kind); cb.disabled=false; cb.checked=true; S.layers[kind]=true;
    render(); const codes=[...new Set(out.map(f=>f.code).filter(Boolean))]; if(codes.length) fitTo(codes,0.08);
  }catch(err){ st.textContent="No se pudo cargar: "+err.message; }
}
function layerValues(kind){
  const L=LAY[kind]; if(!L) return null;
  if(kind==="comunas"){
    const B=LAY.barrios; if(!B||!B.features.some(f=>f.comuna)) return null;
    const bv=layerValues("barrios"), agg={}; B.features.forEach((f,i)=>{ if(f.comuna){ const k=(f.code||"")+"|"+comunaKey(f.comuna); agg[k]=(agg[k]||0)+bv.vals[i]; } });
    return {vals:L.features.map(f=>agg[(f.code||"")+"|"+comunaKey(f.name)]||0),matched:null};
  }
  const type=LKINDS.find(k=>k[0]===kind)[2], cache={}, alt={}, used={}, others=["barrio","vereda","corregimiento"].filter(x=>x!==type);
  const rural=kind!=="barrios";
  const vals=L.features.map(f=>{ if(!f.code) return 0; const C=cache[f.code]||(cache[f.code]=locCounts(f.code,type)); const k=locKey(f.name);
    let hit=C[k]?k:null;
    if(!hit&&k.length>=5) hit=Object.keys(C).find(x=>x.length>=5&&(x===k||x.startsWith(k+" ")||k.startsWith(x+" ")));
    if(hit){ used[f.code+"|"+type+"|"+hit]=1; return C[hit].v; }
    if(rural){ for(const o of others){ const A=(alt[f.code+o])||(alt[f.code+o]=locCounts(f.code,o)); if(A[k]){ used[f.code+"|"+o+"|"+k]=1; return A[k].v; } } }
    return 0; });
  let tot=0, placed=0; for(const code in cache) for(const k in cache[code]){ tot+=cache[code][k].v; if(used[code+"|"+type+"|"+k]) placed+=cache[code][k].v; }
  for(const key in alt){ const code=key.slice(0,5), o=key.slice(5); for(const k in alt[key]) if(used[code+"|"+o+"|"+k]) placed+=alt[key][k].v; }
  return {vals,tot,placed};
}
const gLay=el("g",{},svg); svg.insertBefore(gLay,gLab); const LAYB={};
function drawLayers(){
  gLay.innerHTML=""; svg.classList.toggle("layeron",LKINDS.some(([k])=>LAY[k]&&S.layers[k]));
  for(const [kind,label] of LKINDS){
    const L=LAY[kind], st=$("#st-"+kind);
    if(!st){ LAYB[kind]=null; continue; }
    if(!L){ if(st&&!st.textContent.startsWith("No se")) st.textContent=""; continue; }
    const lv=layerValues(kind), vals=lv?lv.vals:[], b=breaks(vals), withCases=vals.filter(v=>v>0).length; LAYB[kind]=lv&&S.layers[kind]?b:null;
    st.textContent=`${fmt(L.features.length)} ${kind==="corregimientos"?(L.features.length===1?"centro poblado":"centros poblados"):(L.features.length===1?"polígono":"polígonos")} · ${lv?fmt(withCases)+" con casos":"sin datos para cruzar"}`+(lv&&lv.placed?` · ${fmt(lv.placed)} ${isDupla()?"atenciones":"casos"} ubicados`:"")+(kind==="comunas"&&!lv?" (requiere la capa de barrios con su comuna)":"");
    if(!S.layers[kind]) continue;
    const g=el("g",{class:"lay lay-"+kind},gLay), FC=focusCodes(), fs=FC?new Set(FC):null;
    if(kind==="corregimientos"){ drawPoints(g,L,vals,b,fs); continue; }
    L.features.forEach((f,i)=>{ if(fs&&!fs.has(f.code)) return; const v=vals[i]||0, p=el("path",{d:f.d,class:"pl"+(lv?"":" outline"),"fill-rule":"evenodd"},g);
      if(lv) p.style.fill=v>0?colorVar(classOf(v,b),b.length):"transparent";
      p.dataset.tip=`<b>${esc(f.name)}</b>${f.code?" · "+esc(BY[f.code].name):""}${lv?` · ${fmt(v)} ${isDupla()?"atenciones":"casos"}`:""}`; });
    if(kind==="comunas") L.features.forEach(f=>{ if(fs&&!fs.has(f.code)) return; const t=el("text",{x:X(f.c[0]),y:Y(f.c[1]),class:"mlabel laylabel","text-anchor":"middle","dominant-baseline":"middle"},g); t.textContent=f.name; });
  }
  drawInst();
  applyVB();
}
/* centros poblados como puntos: tamaño según casos; nombres solo donde hay casos (todos al acercarse) */
function drawPoints(g,L,vals,b,fs){
  const W=isDupla()?"atención":"caso", mx=Math.max(1,...vals), items=[];
  L.features.forEach((f,i)=>{ if(fs&&!fs.has(f.code)) return; items.push([f,vals[i]||0]); });
  items.sort((a,b2)=>a[1]-b2[1]);
  for(const [f,v] of items){ const x=X(f.c[0]), y=Y(f.c[1]), r=v>0?4.5+7*Math.sqrt(v/mx):2.6;
    const c=el("circle",{cx:x,cy:y,r:r,class:"cp"+(v>0?" hit":" z"),"data-r":r},g); if(v>0) c.style.fill=colorVar(classOf(v,b),b.length);
    c.dataset.tip=`<b>${esc(f.name)}</b>${f.code?" · "+esc(BY[f.code].name):""} · ${v>0?nCasos(v,W):"sin "+(W==="caso"?"casos":"atenciones")+" registrados"}`;
    const t=el("text",{x,y,"data-x":x,"data-y":y,"data-r":r,"data-p":v,class:"mlabel laylabel cpl"+(v>0?"":" lz"),"text-anchor":"start","dominant-baseline":"middle"},g); t.textContent=v>0?`${f.name} (${fmt(v)})`:f.name; }
}
function scaleMarks(k){
  for(const c of gLay.querySelectorAll("circle.cp")) c.setAttribute("r",(+c.dataset.r*k).toFixed(3));
  for(const t of gLay.querySelectorAll("text.cpl")) t.setAttribute("x",(+t.dataset.x+(+t.dataset.r+3)*k).toFixed(3));
  for(const m of gInst.querySelectorAll(".inst")) m.setAttribute("transform",`translate(${(+m.dataset.x+m.dataset.ox*k).toFixed(3)},${(+m.dataset.y+m.dataset.oy*k).toFixed(3)}) scale(${k.toFixed(4)})`);
  // evitar etiquetas encimadas: prioridad a los que tienen más casos
  const deep=vb.w<HOME.w*0.05, far=vb.w>HOME.w*0.15, fs=10.5*k, boxes=[];
  const lab=[...gLay.querySelectorAll("text.laylabel")].map(t=>({t,p:+(t.dataset.p||0),x:+t.getAttribute("x"),y:+t.getAttribute("y"),z:t.classList.contains("lz"),s:t.classList.contains("cpl")}));
  lab.sort((a,b)=>b.p-a.p);
  for(const L of lab){ let show=!(far&&L.z)&&!(L.z&&!deep);
    if(far&&!L.s) show=false;
    if(show){ if(L.x<vb.x||L.x>vb.x+vb.w||L.y<vb.y||L.y>vb.y+vb.h) show=false; }
    if(show){ const w=L.t.textContent.length*fs*0.56, h=fs*1.15, bx=L.s?[L.x,L.y-h/2,L.x+w,L.y+h/2]:[L.x-w/2,L.y-h/2,L.x+w/2,L.y+h/2];
      if(boxes.some(q=>bx[0]<q[2]&&bx[2]>q[0]&&bx[1]<q[3]&&bx[3]>q[1])) show=false; else boxes.push(bx); }
    L.t.style.display=show?"":"none"; }
}

/* ================= PRESENCIA INSTITUCIONAL ================= */
const IKIND={com:{l:"Comisaría de Familia",col:"#0F8B8D",ch:"C"},fis:{l:"Fiscalía",col:"#1F4E9C",ch:"F"},ins:{l:"Inspección de Policía",col:"#B4561B",ch:"I"},cj:{l:"Casa de Justicia",col:"#6B4F2A",ch:"J"}};
const IPTS=(D.inst&&D.inst.pts)||[];
const gInst=el("g",{},svg); svg.insertBefore(gInst,gLab.nextSibling);
const telLink=p=>p?p.split(/\s*\/\s*/).map(x=>{ const d=x.replace(/ext.*$/i,"").replace(/[^\d+]/g,""); return d.length>=7?`<a href="tel:${d}">${esc(x)}</a>`:esc(x); }).join(" · "):"";
function instTip(p){ const K=IKIND[p.t], mn=BY[p.c]?BY[p.c].name:""; return `<b>${esc(p.n)}</b>${p.n.includes(mn)?"":" · "+esc(mn)}${p.p?"<br>Tel. "+esc(p.p):""}<br><span style="opacity:.75">Toque para ver dirección y horario</span>`; }
function drawInst(){
  gInst.innerHTML=""; const FC=focusCodes(), fs=FC?new Set(FC):null; const cnt={};
  { const cb=$("#instCard"); if(cb&&!cb.hidden&&cb.dataset.i){ const q=IPTS[+cb.dataset.i]; if(!S.inst[q.t]||(fs&&!fs.has(q.c))) cb.hidden=true; } }
  // desplazar puntos que comparten sitio para que no se tapen
  const seen={};
  IPTS.forEach((p,i)=>{ cnt[p.t]=cnt[p.t]||{n:0,m:new Set()}; cnt[p.t].n++; cnt[p.t].m.add(p.c);
    if(!S.inst[p.t]||(fs&&!fs.has(p.c))) return;
    let x=X(p.ll[0]), y=Y(p.ll[1]); const key=p.c+"|"+Math.round(x/1.2)+"|"+Math.round(y/1.2), o=seen[key]=(seen[key]||0)+1;
    const K=IKIND[p.t], g=el("g",{class:"inst inst-"+p.t+(p.ap?" ap":""),"data-i":i},gInst);
    const ang=Math.PI*(o-1)*2/3-Math.PI/2, rr=o>1?17*(1+Math.floor((o-2)/3)*0.9):0; g.dataset.x=x; g.dataset.y=y; g.dataset.ox=Math.cos(ang)*rr; g.dataset.oy=Math.sin(ang)*rr;
    if(p.t==="com") el("circle",{r:8,fill:K.col,"stroke-width":1.6},g);
    else if(p.t==="fis") el("rect",{x:-7.5,y:-7.5,width:15,height:15,rx:3,fill:K.col,"stroke-width":1.6},g);
    else if(p.t==="ins") el("path",{d:"M0 -9 L9 0 L0 9 L-9 0Z",fill:K.col,"stroke-width":1.6},g);
    else el("path",{d:"M0 -9 L8 -4.5 L8 4.5 L0 9 L-8 4.5 L-8 -4.5Z",fill:K.col,"stroke-width":1.6},g);
    const tx=el("text",{"text-anchor":"middle","dominant-baseline":"central","font-size":9},g); tx.textContent=K.ch;
    g.dataset.tip=instTip(p); });
  for(const k in IKIND){ const s=$("#ist-"+k); if(!s) continue; const c=cnt[k]; s.textContent=c?`${fmt(c.n)} ${c.n===1?"sede":"sedes"} en ${c.m.size} municipios`+(k==="ins"?" · ubicación de referencia en la cabecera":"" )+(k==="cj"?" · ubicación aproximada":""):""; }
  svg.classList.toggle("insts",Object.values(S.inst).some(Boolean));
}
function showInst(i){ const p=IPTS[i], K=IKIND[p.t], box=$("#instCard");
  box.innerHTML=`<button class="x" type="button" aria-label="Cerrar">×</button><span class="eyebrow" style="color:${K.col}">${esc(K.l)} · ${esc(BY[p.c]?BY[p.c].name:"")}</span><h4>${esc(p.n)}</h4>
   ${p.u&&p.u.length?`<div class="tags">${p.u.map(u=>`<span>${esc(u)}</span>`).join("")}</div>`:""}
   <div class="row"><b>Dirección</b><span>${esc(p.a||"—")}</span></div>
   <div class="row"><b>Teléfono</b><span>${p.p?telLink(p.p):(p.t==="ins"?"Comuníquese con la alcaldía municipal":"No registrado en la fuente")}</span></div>
   ${p.e?`<div class="row"><b>Correo</b><span><a href="mailto:${esc(p.e)}">${esc(p.e)}</a></span></div>`:""}
   ${p.h?`<div class="row"><b>Horario</b><span>${esc(p.h)}</span></div>`:""}
   <div class="row"><b>Líneas</b><span>Línea 155 (orientación a mujeres) · 122 (Fiscalía) · 123 (emergencias)</span></div>
   ${p.ap?`<p class="hint">${p.t==="ins"?"Toda alcaldía tiene Inspección de Policía (Ley 1801 de 2016); el punto marca la cabecera municipal, no la dirección exacta.":"Punto aproximado: la fuente no trae coordenadas verificables."}</p>`:""}
   <p class="hint">Fuente: ${esc(D.inst.src[p.t])}</p>`;
  box.dataset.i=i; box.hidden=false; box.querySelector(".x").onclick=()=>{ box.hidden=true; }; }
function instList(code){
  const list=IPTS.filter(p=>p.c===code), by=k=>list.filter(p=>p.t===k);
  let h=`<div><span class="eyebrow">Presencia institucional · rutas de atención</span><div class="instlist">`;
  for(const k of ["com","fis","ins","cj"]){ const a=by(k); if(!a.length){ if(k!=="cj") h+=`<div class="miss">${k==="fis"?"Sin sede de Fiscalía en el municipio: denuncie en línea 122, en la Comisaría o en la Inspección de Policía.":"Sin "+IKIND[k].l.toLowerCase()+" registrada."}</div>`; continue; }
    for(const p of a) h+=`<div class="it"><i class="ik ik-${k}">${IKIND[k].ch}</i><div><b>${esc(p.n)}</b>${p.u&&p.u.length?`<span class="hint">${esc(p.u.slice(0,4).join(" · "))}</span><br>`:""}${esc(p.a||"")}${p.p?" · "+telLink(p.p):(k==="ins"?" · teléfono: alcaldía municipal":"")}</div></div>`; }
  return h+`</div></div>`;
}
for(const k in IKIND) $("#in-"+k).addEventListener("change",e=>{ S.inst[k]=e.target.checked; if(!e.target.checked) $("#instCard").hidden=true; drawInst(); applyVB(); legend(); });


/* capas oficiales incluidas en el geovisor */
function embedLayers(){
  const C=(D.capas&&D.capas.data)||{};
  for(const [kind] of LKINDS){ const arr=C[kind]; if(!arr||!arr.length) continue;
    const feats=arr.map(([name,code,extra,rings])=>{ let best=rings[0],A=0; for(const r of rings){ const a=Math.abs(r.reduce((s,p,i)=>{ const q=r[(i+1)%r.length]; return s+p[0]*q[1]-q[0]*p[1]; },0)); if(a>A){A=a;best=r;} }
      let sx=0,sy=0; for(const p of best){ sx+=p[0]; sy+=p[1]; }
      return {name:titleCase(String(name).toLowerCase()),code:BY[code]?code:null,comuna:kind==="barrios"&&extra&&extra!=="0"?extra:null,c:[sx/best.length,sy/best.length],d:"M"+rings.map(r=>r.map(p=>X(p[0]).toFixed(2)+","+Y(p[1]).toFixed(2)).join("L")).join("ZM")+"Z"}; });
    LAY[kind]={features:feats,crs:"4326",file:D.capas.src[kind],embedded:true}; const cb=$("#ly-"+kind); if(cb){ cb.disabled=false; cb.checked=!!S.layers[kind]; }
    const src=$("#src-"+kind); if(src) src.textContent="Fuente: "+D.capas.src[kind]; }
}
embedLayers();
/* ---------- vista general y mapa de ubicación ---------- */
const ovSvg=document.getElementById("ovMap");
ovSvg.setAttribute("viewBox",`${HOME.x} ${HOME.y} ${HOME.w} ${HOME.h}`);
for(const m of MUN) el("path",{d:pathOf(m.g),class:"ovm"},ovSvg);
const ovRect=el("rect",{class:"ovr"},ovSvg);
function zoomedIn(){ return vb.w<HOME.w*0.85||Math.abs(vb.x-HOME.x)>HOME.w*0.15||Math.abs(vb.y-HOME.y)>HOME.h*0.15; }
function updateOverview(){
  const z=zoomedIn(); $("#overview").hidden=!z; $("#btnHome").classList.toggle("on",z);
  const r=svg.getBoundingClientRect(), k=Math.max(vb.w/(r.width||1),vb.h/(r.height||1)), w=(r.width||1)*k, h=(r.height||1)*k;
  const x=vb.x+(vb.w-w)/2, y=vb.y+(vb.h-h)/2;
  ovRect.setAttribute("x",x); ovRect.setAttribute("y",y); ovRect.setAttribute("width",w); ovRect.setAttribute("height",h);
}
function goHome(){ vb={...HOME}; applyVB(); }
$("#btnHome").onclick=()=>{ S.sel=null; render(); goHome(); };
ovSvg.addEventListener("click",e=>{ const r=ovSvg.getBoundingClientRect(), k=Math.max(HOME.w/r.width,HOME.h/r.height), ox=HOME.x+(HOME.w-r.width*k)/2, oy=HOME.y+(HOME.h-r.height*k)/2;
  const cx=ox+(e.clientX-r.left)*k, cy=oy+(e.clientY-r.top)*k; vb={...vb,x:cx-vb.w/2,y:cy-vb.h/2}; applyVB(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&[...document.querySelectorAll(".overlay")].every(o=>o.hidden)&&zoomedIn()) goHome(); });
svg.addEventListener("dblclick",e=>{ e.preventDefault(); const [x,y]=toMap(e); zoomAt(1/1.8,x,y); });
for(const [kind] of LKINDS){ if(!$("#ly-"+kind)) continue;
  $("#ly-"+kind).addEventListener("change",e=>{ S.layers[kind]=e.target.checked; drawLayers(); legend(); }); }

/* ---------- render ---------- */
const setPressed=(seg,v)=>{ for(const b of seg.querySelectorAll("button")) b.setAttribute("aria-pressed",String(b.dataset.v===v)); };
function render(){
  const I=ind(), dupla=isDupla();
  { const yrs=dupla?DUP_YEARS.slice().reverse():YEARS.slice().reverse(); if(S.year!=="all"&&!yrs.includes(S.year)) S.year="all";
    const sel=$("#year"); sel.innerHTML=`<option value="all">${dupla?`${DUP_YEARS[0]}–${DUP_YEARS[DUP_YEARS.length-1]} · todas`:POL_RANGE+" · acumulado"}</option>`+yrs.map(y=>`<option value="${y}">${y}${y===CUR_YEAR?" (en curso)":""}</option>`).join(""); }
  DUP=duplaAgg(); PALK=palKey(); document.documentElement.dataset.pal=PALK;
  U=units(); B=breaks(U.map(u=>u.v));
  const FC=focusCodes(), fset=FC?new Set(FC):null;
  for(const m of MUN){ const u=unitOfCode(m.code), p=muniEl[m.code], dim=fset&&!fset.has(m.code);
    p.style.fill=dim?"var(--ctx)":colorVar(classOf(u.v,B),B.length); p.classList.toggle("dim",!!dim);
    const sel=S.sel&&(S.view==="sub"?m.sub===S.sel:m.code===S.sel); p.classList.toggle("sel",!!sel); }
  if(S.view==="sub"&&S.sel){ for(const m of MUN) if(m.sub===S.sel) gMun.appendChild(muniEl[m.code]); } else if(S.sel&&muniEl[S.sel]) gMun.appendChild(muniEl[S.sel]);
  gSub.style.display=(!fset&&(S.subLines||S.view==="sub"))?"":"none"; gGrat.style.display=S.grat?"":"none";
  MUN.forEach((m,i)=>{ const t=mlabels[i]; t.style.display=(fset||(S.labels&&S.view==="muni"))?"":"none"; t.classList.toggle("dimlabel",!!(fset&&!fset.has(m.code))); });
  for(const t of slabels) t.style.display=S.view==="sub"&&!fset?"":"none";
  HEATINFO=null; svg.classList.toggle("heaton",!!S.heat); if(S.heat&&fset) drawHeatLocal(FC); else if(S.heat) drawHeat(); else gHeat.innerHTML=""; drawLayers();
  $("#mapKicker").textContent=isDupla()?"Dupla Violeta · atenciones":(I.n?"Policía Nacional · víctima mujer":"Otros delitos · Policía Nacional");
  $("#mapTitle").textContent=I.label; $("#mapSrc").textContent=`${sourceLabel()} · ${periodLabel()}`;
  for(const b of document.querySelectorAll(".tab")) b.setAttribute("aria-selected",String(b.dataset.id===S.ind||(b.dataset.id==="dupla"&&DUPLA_GROUP.includes(S.ind))));
  $("#duplaSeg").hidden=!DUPLA_GROUP.includes(S.ind); $("#duplaPanel").hidden=!DUPLA_GROUP.includes(S.ind); setPressed($("#duplaSeg"),S.ind);
  $("#tableBox").hidden=!!(S.sel&&!isDupla());
  $("#otherSel").value=I.n?"":I.id;
  $("#srcSeg").hidden=!I.alt; setPressed($("#srcSeg"),dupla?"dupla":"police");
  $("#year").value=S.year;
  setPressed($("#measureSeg"),S.measure); setPressed($("#viewSeg"),S.view);
  $("#lyHeat").checked=S.heat; $("#lySub").checked=S.subLines; $("#lyLabels").checked=S.labels; $("#lyGrat").checked=S.grat; $("#lyLabels").disabled=S.view==="sub";
  for(const k in IKIND) $("#in-"+k).checked=!!S.inst[k];
  $("#lyFocus").checked=S.focus; $("#btnMapPdf").lastChild.textContent=fset?" Imprimir mapa de "+(BY[S.sel]?BY[S.sel].name:S.sel):" Imprimir mapa";
  legend(); ficha(); perfil(); panorama(); table(); save();
}
function legend(){
  const z=U.filter(u=>!(u.v>0)).length;
  let h=`<div><div class="t">${measureLabel()} · ${S.view==="sub"?"subregiones":"municipios"} por clase</div><ul>`;
  B.slice().reverse().forEach((r,ri)=>{ const i=B.length-1-ri, n=U.filter(u=>classOf(u.v,B)===i).length; h+=`<li><span class="sw" style="background:${colorVar(i,B.length)}"></span><span class="num">${rangeTxt(r)}</span><span class="num" style="color:var(--muted)">(${n})</span></li>`; });
  h+=`<li><span class="sw" style="background:var(--nodata)"></span><span>Sin casos reportados</span><span class="num" style="color:var(--muted)">(${z})</span></li></ul></div>`;
  for(const [k,l] of LKINDS){ const b=LAYB[k]; if(!b||!b.length) continue; h+=`<div><div class="t">${k==="corregimientos"?"Centros poblados · casos (tamaño y color)":"Capa de "+l.toLowerCase()+" · casos por polígono"}</div><ul>${b.slice().reverse().map((r,ri)=>`<li><span class="sw" style="background:${colorVar(b.length-1-ri,b.length)}"></span><span class="num">${r[0]===r[1]?fmt(r[0]):fmt(r[0])+" – "+fmt(r[1])}</span></li>`).join("")}<li><span class="sw" style="background:transparent"></span><span>Sin casos</span></li></ul></div>`; }
  { const on=Object.keys(IKIND).filter(k=>S.inst[k]); if(on.length) h+=`<div><div class="t">Presencia institucional</div><ul>${on.map(k=>`<li><i class="ik ik-${k}">${IKIND[k].ch}</i><span>${IKIND[k].l}</span></li>`).join("")}</ul></div>`; }
  if(S.heat) h+=`<div><div class="t">${HEATINFO?"Mapa de calor del municipio":"Mapa de calor"}</div><div class="vbar"></div><div class="vlabels"><span>Alerta</span><span>Reacciona</span><span>Urgente</span></div>${HEATINFO?`<p class="hint">${HEATINFO.placed?`${fmt(HEATINFO.placed)} de ${fmt(HEATINFO.tot)} ${isDupla()?"atenciones":"casos"} con barrio, vereda o corregimiento ubicable en el mapa (los barrios sin capa se ubican en la cabecera municipal).`:"Este municipio no tiene casos con localidad ubicable en el periodo."}</p>`:""}</div>`;
  $("#legend").innerHTML=h;
}
function trendSVG(series,hl){
  const W=320,H=120,pad=18,bw=(W-10)/series.length,mx=Math.max(1,...series);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Casos por año">`;
  series.forEach((v,i)=>{ const h=(H-pad*2)*v/mx, x=5+i*bw+4, y=H-pad-h;
    s+=`<rect class="tb${YEARS[i]===hl?" cur":""}" x="${x}" y="${y}" width="${bw-8}" height="${Math.max(h,v>0?1.5:0)}" rx="2"></rect><text class="tv" x="${x+(bw-8)/2}" y="${y-4}" text-anchor="middle">${fmt(v)}</text><text x="${x+(bw-8)/2}" y="${H-4}" text-anchor="middle">${YEARS[i]}</text>`; });
  return s+"</svg>";
}
function barsHTML(list,{click=false,dec=S.measure==="tasa"?1:0,pk=false,mxv=null,unit=""}={}){
  const mx=mxv??Math.max(0,...list.map(x=>x.v??0)), top=pk?Math.max(...list.map(x=>x.v??-1)):null;
  return `<div class="bars">`+list.map(u=>{ const tag=click?"button":"div";
    if(u.v==null) return `<div class="bar nd" title="${esc(u.name)}: sin dato"><span class="nm">${esc(u.name)}</span><span class="tr"></span><span class="vv">s/d</span></div>`;
    return `<${tag} class="bar${pk&&u.v===top&&u.v>0?" pk":""}" title="${esc(u.name)}: ${fmt(u.v,dec)}${unit?" "+unit:""}" ${click?`type="button" data-sel="${esc(u.id)}"`:""}><span class="nm" title="${esc(u.name)}">${esc(u.name)}</span><span class="tr"><span class="fl" style="width:${mx&&u.v>0?Math.max(1.5,u.v/mx*100):0}%"></span></span><span class="vv">${fmt(u.v,dec)}</span></${tag}>`; }).join("")+`</div>`;
}
function duplaTypes(codes){ const t={psico:0,fisica:0,sexual:0,eco:0,intento:0,femi:0,total:0}; for(const c of codes){ const r=DUP.m[c]; if(r) for(const k in t) t[k]+=r[k]||0; } return t; }
const DTYPES=[["Psicológica","psico"],["Física","fisica"],["Sexual","sexual"],["Económica o patrimonial","eco"],["Intento de feminicidio","intento"],["Feminicidio","femi"]];
function ficha(){
  const I=ind(), dupla=isDupla(), box=$("#ficha"), dt=deptTotals(), sorted=U.slice().sort((a,b)=>b.v-a.v);
  if(!S.sel){
    box.innerHTML=`<div><span class="eyebrow">Departamento de Nariño</span><h3>${esc(I.label)}</h3></div>
      <div class="kpis"><div class="kpi main" style="grid-column:1/-1"><div class="v">${fmt(dt.tot)}</div><div class="l">${I.what} · ${periodLabel()}</div></div>
      <div class="kpi"><div class="v">${U.filter(u=>u.casos>0).length}<span style="font-size:14px;color:var(--muted)"> / ${U.length}</span></div><div class="l">${S.view==="sub"?"subregiones":"municipios"} con casos</div></div></div>
      <div><span class="eyebrow">${S.view==="sub"?"Subregiones":"Municipios"} con ${S.measure==="tasa"?"mayor tasa":"más casos"}</span>${barsHTML(sorted.filter(u=>u.v>0).slice(0,10),{click:true})}</div>
      <p class="note">Toque un municipio en el mapa para ver su ficha.${dupla?` Dupla Violeta: ${DUP_YEARS.map(y=>`${y} (${D.dup.cobertura[y]||"sin mes"})`).join("; ")}.${DUP.sinMuni?` ${DUP.sinMuni} atenciones sin municipio identificable no se ubican en el mapa.`:""}`:""}${S.year===CUR_YEAR&&!dupla?` ${CUR_YEAR} es un año en curso.`:""}</p>`;
  } else {
    const u=U.find(x=>x.id===S.sel); if(!u){ S.sel=null; return ficha(); }
    const rank=sorted.findIndex(x=>x.id===u.id)+1;
    let h=`<div><span class="chip">${S.view==="sub"?"Subregión":"Subregión "+esc(u.sub)}</span><h3 style="margin-top:6px">${esc(u.name)}</h3><button class="linkbtn" type="button" id="backDept">← Ver todo el departamento</button></div>
      <div class="kpis"><div class="kpi main" style="grid-column:1/-1"><div class="v">${fmt(u.casos)}</div><div class="l">${I.what} · ${periodLabel()}</div></div>
      <div class="kpi"><div class="v">${u.v>0?rank+"°":"—"}</div><div class="l">puesto entre ${U.length} ${S.view==="sub"?"subregiones":"municipios"}</div></div>
      <div class="kpi"><div class="v">${fmt(u.pop)}</div><div class="l">mujeres (proyección DANE 2025)</div></div></div>`;
    if(!dupla) h+=`<div class="trend"><span class="eyebrow">Casos por año</span>${trendSVG(seriesFor(u.codes),S.year)}</div>`;
    else { const t=duplaTypes(u.codes); h+=`<div><span class="eyebrow">Tipo de violencia · ${t.total} atenciones</span>${barsHTML(DTYPES.map(([l,k])=>({id:k,name:l,v:t[k]})),{dec:0})}</div>`; }
    if(S.view==="sub"){ const ms=MUN.filter(m=>m.sub===u.id).map(m=>{ const c=casesFor(m.code); return {id:m.code,name:m.name,v:S.measure==="tasa"?c/m.popm*1e5:c}; }).sort((a,b)=>b.v-a.v); h+=`<div><span class="eyebrow">Municipios de la subregión</span>${barsHTML(ms,{click:true})}</div>`; }
    if(BY[u.id]) h+=locDetail(u.id);
    box.innerHTML=h; $("#backDept").onclick=()=>{ S.sel=null; vb={...HOME}; applyVB(); render(); };
  }
  for(const b of box.querySelectorAll("button.bar")) b.onclick=()=>selectUnit(b.dataset.sel);
  for(const b of box.querySelectorAll(".loctabs button")) b.onclick=()=>{ S.locTab=b.dataset.t; ficha(); };
}
function selectUnit(id){ if(BY[id]&&S.view==="sub") S.view="muni"; if(!BY[id]&&S.view==="muni") S.view="sub"; S.sel=id; render(); fitTo(BY[id]?[id]:MUN.filter(m=>m.sub===id).map(m=>m.code),BY[id]?(S.focus?0.35:0.7):0.15); }
function zonaSplit(){ const z=D.police[ind().key].zona, sum=r=>S.year==="all"?Object.values(r||{}).reduce((a,b)=>a+b,0):((r||{})[S.year]||0); const u=sum(z.urbana), r=sum(z.rural); return {u,r,o:Object.keys(z).filter(k=>k!=="urbana"&&k!=="rural").reduce((a,k)=>a+sum(z[k]),0)}; }
function panorama(){
  const dept=!S.sel; $("#panoHead").hidden=!dept; $("#panoBox").hidden=!dept; if(!dept) return;
  const dupla=isDupla(), SU=units("sub").map(u=>({...u})).sort((a,b)=>b.v-a.v);
  $("#panoPeriod").textContent=`${ind().label} · ${periodLabel()}`;
  $("#subTitle").textContent=`Subregiones · ${S.measure==="tasa"?"tasa por 100 mil mujeres":"casos"}`;
  $("#subBars").innerHTML=barsHTML(SU,{click:true});
  for(const b of $("#subBars").querySelectorAll("button.bar")) b.onclick=()=>{ selectUnit(b.dataset.sel); $(".stage").scrollIntoView({behavior:"smooth",block:"start"}); };
  if(dupla){ const t=duplaTypes(Object.keys(DUP.m)); $("#trendTitle").textContent=`Tipo de violencia · ${t.total} atenciones`; $("#panoTrend").innerHTML=barsHTML(DTYPES.map(([l,k])=>({id:k,name:l,v:t[k]})),{dec:0})+`<p class="hint" style="margin-top:8px">Una atención puede registrar varios tipos de violencia.</p>`; }
  else { $("#trendTitle").textContent="Casos por año en el departamento"; $("#panoTrend").innerHTML=trendSVG(seriesFor(MUN.map(m=>m.code)),S.year); }
  if(dupla){ const c=Object.values(DUP.m).reduce((a,r)=>a+r.total,0)||1, p=(DUP.m["52001"]||{}).total||0; $("#splitTitle").textContent="Pasto frente al resto del departamento";
    $("#panoSplit").innerHTML=`<div class="split"><span style="width:${p/c*100}%;background:var(--r4)"></span><span style="width:${(c-p)/c*100}%;background:var(--r2)"></span></div><div class="split-l"><span>Pasto <b class="num">${p}</b> (${fmt(p/c*100)} %)</span><span>Otros municipios <b class="num">${c-p}</b></span></div>`; }
  else { const z=zonaSplit(), t=z.u+z.r+z.o||1; $("#splitTitle").textContent="Zona del hecho";
    $("#panoSplit").innerHTML=`<div class="split"><span style="width:${z.u/t*100}%;background:var(--r4)"></span><span style="width:${z.r/t*100}%;background:var(--r2)"></span></div><div class="split-l"><span>Urbana <b class="num">${fmt(z.u)}</b> (${fmt(z.u/t*100)} %)</span><span>Rural <b class="num">${fmt(z.r)}</b> (${fmt(z.r/t*100)} %)</span></div>`+(z.o?`<p class="hint">${fmt(z.o)} casos sin zona registrada.</p>`:""); }
}
function table(){
  const th=$("#tbl thead"), tb=$("#tbl tbody"), sub=S.view==="sub";
  const cols=[["name","Territorio"],...(sub?[]:[["sub","Subregión"]]),["casos","Casos","n"],["pop","Mujeres","n"],...(SHOW_RATE?[["rate","Tasa ×100 mil","n"]]:[])];
  th.innerHTML="<tr>"+cols.map(c=>`<th class="${c[2]||""}" data-k="${c[0]}">${c[1]}${S.sort===c[0]?" ↓":""}</th>`).join("")+"</tr>";
  const k=cols.some(c=>c[0]===S.sort)?S.sort:"casos", rows=U.slice().sort((a,b)=>typeof a[k]==="string"?a[k].localeCompare(b[k],"es"):b[k]-a[k]);
  tb.innerHTML=rows.map(u=>`<tr><td>${esc(u.name)}</td>${sub?"":`<td>${esc(u.sub)}</td>`}<td class="n">${fmt(u.casos)}</td><td class="n">${fmt(u.pop)}</td>${SHOW_RATE?`<td class="n">${fmt(u.rate,1)}</td>`:""}</tr>`).join("");
  for(const h of th.querySelectorAll("th")) h.onclick=()=>{ S.sort=h.dataset.k; table(); };
}

/* ---------- controles ---------- */
const DUPLA_GROUP=["dupla","fisica","psico"];
const dot=k=>`<span class="dot" style="background:${PALS[k][3]}"></span>`;
$("#tabs").innerHTML=`<button class="tab" role="tab" type="button" data-id="dupla">${dot("dupla")}Dupla Violeta</button>`+IND.filter(i=>i.n&&!DUPLA_GROUP.includes(i.id)).map(I=>`<button class="tab" role="tab" type="button" data-id="${I.id}">${dot(PALS[I.id]?I.id:"otros")}${I.tab||I.label}</button>`).join("")+
  `<select id="otherSel" aria-label="Otros delitos"><option value="">Otros delitos (Policía)…</option>${IND.filter(i=>!i.n).map(I=>`<option value="${I.id}">${I.label}</option>`).join("")}</select>`;
for(const b of document.querySelectorAll(".tab")) b.onclick=()=>{ if(b.dataset.id==="dupla"&&DUPLA_GROUP.includes(S.ind)) return; S.ind=b.dataset.id; S.src=null; render(); };
for(const b of $("#duplaSeg").querySelectorAll("button")){ b.insertAdjacentHTML("afterbegin",dot(b.dataset.v)); }
for(const b of $("#duplaSeg").querySelectorAll("button")) b.onclick=()=>{ S.ind=b.dataset.v; S.src=null; render(); };
$("#otherSel").onchange=e=>{ if(e.target.value){ S.ind=e.target.value; S.src=null; render(); } };
$("#year").innerHTML=`<option value="all">${POL_RANGE} · acumulado</option>`+YEARS.slice().reverse().map(y=>`<option value="${y}">${y}${y===CUR_YEAR?" (en curso)":""}</option>`).join("");
$("#year").onchange=e=>{ S.year=e.target.value; render(); };
for(const [id,key] of [["#measureSeg","measure"],["#viewSeg","view"],["#srcSeg","src"]]) for(const b of $(id).querySelectorAll("button")) b.onclick=()=>{ S[key]=b.dataset.v; if(key==="view") S.sel=null; render(); };
$("#lyHeat").onchange=e=>{ S.heat=e.target.checked; render(); };
$("#lySub").onchange=e=>{ S.subLines=e.target.checked; render(); };
$("#lyLabels").onchange=e=>{ S.labels=e.target.checked; render(); };
$("#lyGrat").onchange=e=>{ S.grat=e.target.checked; render(); };
$("#lyFocus").onchange=e=>{ S.focus=e.target.checked; render(); if(S.sel&&S.focus) fitTo(focusCodes(),0.3); };
$("#btnLayers").onclick=e=>{ e.stopPropagation(); const p=$("#layers"); p.hidden=!p.hidden; $("#btnLayers").setAttribute("aria-expanded",String(!p.hidden)); };
document.addEventListener("click",e=>{ if(!$("#layers").hidden && !e.target.closest(".layersbtn")){ $("#layers").hidden=true; $("#btnLayers").setAttribute("aria-expanded","false"); } });
for(const b of document.querySelectorAll(".copy")) b.onclick=async()=>{ try{ await navigator.clipboard.writeText(b.dataset.copy); b.textContent="Copiado"; }catch(e){ const v=b.parentElement.querySelector(".v"); const r=document.createRange(); r.selectNodeContents(v); const s=getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent="Seleccionado"; } setTimeout(()=>b.textContent="Copiar",1800); };

function openModal(id){ $(id).hidden=false; const c=$(id).querySelector("[data-close]"); c&&c.focus(); }
for(const o of document.querySelectorAll(".overlay")){ o.addEventListener("click",e=>{ if(e.target===o||e.target.closest("[data-close]")) o.hidden=true; }); }
document.addEventListener("keydown",e=>{ if(e.key==="Escape") for(const o of document.querySelectorAll(".overlay")) o.hidden=true; });
$("#btnCase").onclick=()=>{ if(FORM_URL){ $("#cmGo").href=FORM_URL; $("#cmGo").hidden=false; $("#cmState").textContent="Inicie sesión con la cuenta asignada a su entidad."; } else { $("#cmGo").hidden=true; $("#cmState").textContent="El enlace del formulario aún no está configurado. Escriba a la Subsecretaría de Gestión Pública para solicitar su usuario."; } openModal("#caseModal"); };

/* ================= REPORTES (PDF / PNG) ================= */
const PW=2339, PH=1654, M=80; // A4 horizontal a ~200 ppp
const PC={ink:"#20192E",muted:"#5F5872",line:"#D9D2E3",violet:"#4B2A85",band:"#2F1B5E",magenta:"#D93A68",sea:"#E8EFF5",ctx:"#ECEAF0",sunk:"#F1EEF6"};
const F={d:'"Bricolage Grotesque", "Public Sans", Arial, sans-serif', b:'"Public Sans", Arial, sans-serif', m:'"IBM Plex Mono", Menlo, monospace'};
function font(c,w,s,f=F.b){ c.font=`${w} ${s}px ${f}`; }
function wrapText(c,text,x,y,maxW,lh,maxLines=99){ const words=String(text).split(" "); let line="", n=0; for(const w of words){ const t=line?line+" "+w:w; if(c.measureText(t).width>maxW&&line){ c.fillText(line,x,y); y+=lh; line=w; if(++n>=maxLines-1){ } } else line=t; } if(line){ c.fillText(line,x,y); y+=lh; } return y; }
function newPage(){ const cv=document.createElement("canvas"); cv.width=PW; cv.height=PH; const c=cv.getContext("2d"); c.fillStyle="#FFFFFF"; c.fillRect(0,0,PW,PH); c.textBaseline="alphabetic"; return {cv,c}; }
function pageHeader(c,title,sub){
  const l1=$("#logo1"), l2=$("#logo2"), h=96; let x=M;
  const w1=l1.naturalWidth*h/l1.naturalHeight; c.drawImage(l1,x,46,w1,h); x+=w1+40;
  c.fillStyle=PC.line; c.fillRect(x-20,56,2,h-20);
  const w2=l2.naturalWidth*h/l2.naturalHeight; c.drawImage(l2,x,46,w2,h);
  c.textAlign="right"; c.fillStyle=PC.muted; font(c,600,22); c.fillText("GEOVISOR SEGIS · VIOLENCIAS BASADAS EN GÉNERO",PW-M,82);
  font(c,400,22); c.fillText("Departamento de Nariño · "+new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"}),PW-M,116);
  c.textAlign="left"; c.fillStyle=PC.violet; c.fillRect(M,168,PW-2*M,6); c.fillStyle=PC.magenta; c.fillRect(M,168,220,6);
  c.fillStyle=PC.ink; font(c,800,58,F.d); c.fillText(title,M,250);
  c.fillStyle=PC.muted; font(c,400,28); c.fillText(sub,M,296);
}
function pageFooter(c,n,total){
  c.fillStyle=PC.line; c.fillRect(M,PH-92,PW-2*M,2);
  c.fillStyle=PC.muted; font(c,400,19);
  c.fillText("Fuentes: Policía Nacional (víctimas mujeres, "+POL_RANGE+" con corte parcial) · Dupla Violeta, Sec. de Equidad de Género e Inclusión Social · DANE: proyección de población 2025 y Marco Geoestadístico Nacional 2018.",M,PH-58);
  c.fillText("Ruta de atención Dupla Violeta 24/7 · Psicológica 317 820 3923 · Jurídica 300 747 3482 · duplavioleta@narino.gov.co",M,PH-30);
  c.textAlign="right"; font(c,600,19); c.fillText(`Página ${n} de ${total}`,PW-M,PH-30); c.textAlign="left";
}
function drawMapCanvas(c,rect,view){
  const {x:rx,y:ry,w:rw,h:rh}=rect; const k=Math.min(rw/view.w,rh/view.h); const ox=rx+(rw-view.w*k)/2-view.x*k, oy=ry+(rh-view.h*k)/2-view.y*k;
  const P=(lon,lat)=>[ox+X(lon)*k, oy+Y(lat)*k];
  const trace=polys=>{ c.beginPath(); for(const Pl of polys) for(const r of Pl){ r.forEach((p,i)=>{ const [a,b]=P(p[0],p[1]); i?c.lineTo(a,b):c.moveTo(a,b); }); c.closePath(); } };
  c.save(); c.beginPath(); c.rect(rx,ry,rw,rh); c.clip();
  c.fillStyle=PC.sea; c.fillRect(rx,ry,rw,rh);
  for(const g of D.ctx){ trace(g.g); c.fillStyle=PC.ctx; c.fill("evenodd"); c.strokeStyle="#CFC8DA"; c.lineWidth=1.5; c.stroke(); }
  if(S.grat){ c.strokeStyle="#C9C2D6"; c.lineWidth=1.2; c.setLineDash([6,8]); for(let lon=-80;lon<=-76;lon+=.5){ c.beginPath(); const [a,b]=P(lon,4), [a2,b2]=P(lon,-.5); c.moveTo(a,b); c.lineTo(a2,b2); c.stroke(); } for(let lat=0;lat<=3.5;lat+=.5){ c.beginPath(); const [a,b]=P(-80.5,lat), [a2,b2]=P(-75.5,lat); c.moveTo(a,b); c.lineTo(a2,b2); c.stroke(); } c.setLineDash([]); }
  const FC=focusCodes(), fset=FC?new Set(FC):null;
  for(const m of MUN){ const u=unitOfCode(m.code), dim=fset&&!fset.has(m.code); trace(m.g); c.globalAlpha=S.heat?.45:(LKINDS.some(([k])=>LAY[k]&&S.layers[k])&&!dim?.3:1); c.fillStyle=dim?"#F2F0F5":colorPrint(classOf(u.v,B),B.length); c.fill("evenodd"); c.globalAlpha=1; c.strokeStyle=dim?"#CFC8DA":"#FFFFFF"; c.lineWidth=1.4; c.stroke(); }
  if(S.heat&&!fset){ const hc=heatCanvas(1100); if(hc){ const [a,b]=P(HOME.x/100-80,3.2-HOME.y/100); c.drawImage(hc,a,b,HOME.w*k,HOME.h*k); } }
  else if(S.heat&&fset){ const r=heatLocalCanvas(FC,1400); if(r) c.drawImage(r.cv,ox+r.box.x*k,oy+r.box.y*k,r.box.w*k,r.box.h*k); }
  { const FCx=focusCodes(), fsx=FCx?new Set(FCx):null;
    for(const [kind] of LKINDS){ const L=LAY[kind]; if(!L||!S.layers[kind]) continue; const lv=layerValues(kind), vals=lv?lv.vals:[], b=breaks(vals);
      c.save(); c.setTransform(k,0,0,k,ox,oy);
      if(kind==="corregimientos"){ c.restore(); const mx=Math.max(1,...vals), its=[]; L.features.forEach((f,i)=>{ if(!(fsx&&!fsx.has(f.code))) its.push([f,vals[i]||0]); }); its.sort((a,b2)=>a[1]-b2[1]);
        const sc=Math.min(1.6,Math.max(.7,Math.sqrt(HOME.w/view.w)/3)); const labs=[];
        for(const [f,v] of its){ const [a,bq]=P(f.c[0],f.c[1]); if(a<rx||a>rx+rw||bq<ry||bq>ry+rh) continue; const r=(v>0?9+14*Math.sqrt(v/mx):4)*sc; c.beginPath(); c.arc(a,bq,r,0,7); c.fillStyle=v>0?colorPrint(classOf(v,b),b.length):"#FFFFFF"; c.fill(); c.lineWidth=v>0?2:1.4; c.strokeStyle=v>0?"#FFFFFF":"#8A8299"; c.stroke(); if(v>0) labs.push([f.name+" ("+fmt(v)+")",a+r+6,bq,v]); }
        labs.sort((a,b2)=>b2[3]-a[3]); const bx=[]; font(c,600,17,F.b); c.textAlign="left"; c.textBaseline="middle"; c.lineJoin="round";
        for(const [s,a,bq] of labs){ const w=c.measureText(s).width, q=[a,bq-11,a+w,bq+11]; if(bx.some(z=>q[0]<z[2]&&q[2]>z[0]&&q[1]<z[3]&&q[3]>z[1])) continue; bx.push(q); c.strokeStyle="rgba(255,255,255,.92)"; c.lineWidth=5; c.strokeText(s,a,bq); c.fillStyle=PC.ink; c.fillText(s,a,bq); }
        c.textBaseline="alphabetic"; continue; }
      L.features.forEach((f,i)=>{ if(fsx&&!fsx.has(f.code)) return; const p=new Path2D(f.d); const v=vals[i]||0;
        if(lv&&v>0){ c.fillStyle=colorPrint(classOf(v,b),b.length); c.globalAlpha=.9; c.fill(p,"evenodd"); c.globalAlpha=1; }
        c.lineWidth=(kind==="comunas"?2.2:0.9)/k; c.strokeStyle=kind==="comunas"?"#20192E":"rgba(32,25,46,.55)"; c.stroke(p); });
      c.restore(); } }
  const lines=(arr,w,col)=>{ c.strokeStyle=col; c.lineWidth=w; c.lineJoin="round"; for(const l of arr){ c.beginPath(); l.forEach((p,i)=>{ const [a,b]=P(p[0],p[1]); i?c.lineTo(a,b):c.moveTo(a,b); }); c.stroke(); } };
  if(!fset&&(S.subLines||S.view==="sub")) lines(D.sublines,2.6,"rgba(32,25,46,.75)");
  lines(D.deptline,3.2,PC.ink);
  if(S.sel){ const codes=BY[S.sel]?[S.sel]:MUN.filter(m=>m.sub===S.sel).map(m=>m.code); for(const cd of codes){ trace(BY[cd].g); c.strokeStyle=PC.magenta; c.lineWidth=4.5; c.stroke(); } }
  // etiquetas
  c.textAlign="center"; c.textBaseline="middle"; c.lineJoin="round";
  const label=(t,lon,lat,size,weight,fam,col=PC.ink)=>{ const [a,b]=P(lon,lat); if(a<rx||a>rx+rw||b<ry||b>ry+rh) return; font(c,weight,size,fam); c.strokeStyle="rgba(255,255,255,.92)"; c.lineWidth=size*.3; c.strokeText(t,a,b); c.fillStyle=col; c.fillText(t,a,b); };
  for(const [t,lo,la] of CTXL) label(t,lo,la,22,"italic 500",F.b,PC.muted);
  if(fset){ for(const m of MUN) if(!fset.has(m.code)) label(m.name,m.c[0],m.c[1],17,500,F.b,"#8A8299"); for(const cd of FC) label(BY[cd].name,BY[cd].c[0],BY[cd].c[1],FC.length>1?22:30,800,F.d); }
  else if(S.view==="sub") for(const s of SUBS) label(s,SUBC[s][0],SUBC[s][1],24,800,F.d);
  else { const showAll=S.labels||view.w<HOME.w*.6; const top=new Set(U.slice().sort((a,b)=>b.v-a.v).slice(0,8).map(u=>u.id)); for(const m of MUN) if(showAll||top.has(m.code)) label(m.name,m.c[0],m.c[1],showAll?15:19,600,F.b); }
  c.textBaseline="alphabetic"; c.textAlign="left";
  { const sc=Math.min(1.5,Math.max(.8,Math.sqrt(HOME.w/view.w)/2.5)), seen={};
    IPTS.forEach(p=>{ if(!S.inst[p.t]||(fset&&!fset.has(p.c))) return; let [a,bq]=P(p.ll[0],p.ll[1]); if(a<rx||a>rx+rw||bq<ry||bq>ry+rh) return; const key=Math.round(a/14)+"|"+Math.round(bq/14), o=seen[key]=(seen[key]||0)+1; if(o>1){ a+=Math.cos(o*1.6)*18*sc*Math.ceil(o/6); bq+=Math.sin(o*1.6)*18*sc*Math.ceil(o/6); }
      instMark(c,p.t,a,bq,sc); }); }
  c.restore();
  // marco y coordenadas
  c.strokeStyle=PC.ink; c.lineWidth=2; c.strokeRect(rx,ry,rw,rh);
  c.fillStyle=PC.muted; font(c,500,16,F.m);
  for(let lon=-80;lon<=-76;lon+=.5){ const [a]=P(lon,0); if(a>rx+30&&a<rx+rw-30){ c.textAlign="center"; c.fillText(dms(lon,"O"),a,ry+rh+24); c.fillRect(a-1,ry+rh,2,8); } }
  for(let lat=0;lat<=3.5;lat+=.5){ const [,b]=P(-78,lat); if(b>ry+20&&b<ry+rh-20){ c.save(); c.translate(rx-14,b); c.rotate(-Math.PI/2); c.textAlign="center"; c.fillText(dms(lat,"N"),0,0); c.restore(); c.fillRect(rx-8,b-1,8,2); } }
  c.textAlign="left";
  // norte
  const nx=rx+rw-70, ny=ry+30; c.fillStyle=PC.ink; c.beginPath(); c.moveTo(nx,ny); c.lineTo(nx+22,ny+66); c.lineTo(nx,ny+52); c.lineTo(nx-22,ny+66); c.closePath(); c.fill();
  c.fillStyle="#FFFFFF"; c.beginPath(); c.moveTo(nx,ny); c.lineTo(nx,ny+52); c.lineTo(nx-22,ny+66); c.closePath(); c.fill(); c.strokeStyle=PC.ink; c.lineWidth=2; c.stroke();
  c.fillStyle=PC.ink; font(c,800,28,F.d); c.textAlign="center"; c.fillText("N",nx,ny+100); c.textAlign="left";
  // escala
  const kmPx=k/KM_PER_UNIT; const nice=[0.5,1,2,5,10,20,25,50,100]; let km=0.5; for(const n of nice) if(n*kmPx<=rw*.22) km=n;
  const sx=rx+30, sy=ry+rh-46, L=km*kmPx; c.fillStyle="rgba(255,255,255,.85)"; c.fillRect(sx-12,sy-34,L+90,62);
  for(let i=0;i<4;i++){ c.fillStyle=i%2?"#FFFFFF":PC.ink; c.fillRect(sx+i*L/4,sy,L/4,10); } c.strokeStyle=PC.ink; c.lineWidth=1.5; c.strokeRect(sx,sy,L,10);
  c.fillStyle=PC.ink; font(c,500,17,F.m); c.fillText("0",sx-5,sy-10); c.textAlign="center"; c.fillText(String(km/2),sx+L/2,sy-10); c.fillText(km+" km",sx+L+16,sy-10); c.textAlign="left";
  return k;
}
function instMark(c,k,a,b,sc){ const K=IKIND[k], s=11*sc; c.beginPath();
  if(k==="com") c.arc(a,b,s,0,7); else if(k==="fis") c.rect(a-s,b-s,2*s,2*s); else if(k==="ins"){ c.moveTo(a,b-s*1.25); c.lineTo(a+s*1.25,b); c.lineTo(a,b+s*1.25); c.lineTo(a-s*1.25,b); c.closePath(); } else { for(let i=0;i<6;i++){ const an=Math.PI/3*i-Math.PI/2; i?c.lineTo(a+Math.cos(an)*s*1.2,b+Math.sin(an)*s*1.2):c.moveTo(a+Math.cos(an)*s*1.2,b+Math.sin(an)*s*1.2); } c.closePath(); }
  c.fillStyle=K.col; c.fill(); c.lineWidth=2.5; c.strokeStyle="#FFFFFF"; c.stroke(); c.fillStyle="#FFFFFF"; font(c,700,Math.round(13*sc),F.m); c.textAlign="center"; c.textBaseline="middle"; c.fillText(K.ch,a,b+1); c.textAlign="left"; c.textBaseline="alphabetic"; }
const dms=(v,h)=>{ const a=Math.abs(v), d=Math.floor(a), m=Math.round((a-d)*60); return `${d}°${m?String(m).padStart(2,"0")+"'":""} ${h}`; };
function legendBlock(c,x,y,w){
  c.fillStyle=PC.ink; font(c,700,24); y=wrapText(c,measureLabel(),x,y,w,30)+6;
  B.slice().reverse().forEach((r,ri)=>{ const i=B.length-1-ri, n=U.filter(u=>classOf(u.v,B)===i).length;
    c.fillStyle=colorPrint(i,B.length); c.fillRect(x,y-20,44,24); c.strokeStyle=PC.line; c.strokeRect(x,y-20,44,24);
    c.fillStyle=PC.ink; font(c,500,21,F.m); c.fillText(rangeTxt(r),x+60,y); c.fillStyle=PC.muted; c.textAlign="right"; c.fillText(`(${n})`,x+w,y); c.textAlign="left"; y+=38; });
  const z=U.filter(u=>!(u.v>0)).length; c.fillStyle=colorPrint(-1,1); c.fillRect(x,y-20,44,24); c.strokeStyle=PC.line; c.strokeRect(x,y-20,44,24);
  c.fillStyle=PC.ink; font(c,400,21); c.fillText("Sin casos reportados",x+60,y); c.fillStyle=PC.muted; c.textAlign="right"; font(c,500,21,F.m); c.fillText(`(${z})`,x+w,y); c.textAlign="left"; y+=40;
  c.fillStyle=PC.ink; c.fillRect(x,y-12,44,4); font(c,400,19); c.fillStyle=PC.muted; c.fillText("Límite departamental",x+60,y-4); y+=30;
  if(S.subLines||S.view==="sub"){ c.fillStyle="rgba(32,25,46,.75)"; c.fillRect(x,y-12,44,3); c.fillStyle=PC.muted; c.fillText("Límite de subregión",x+60,y-4); y+=30; }
  for(const k of Object.keys(IKIND)) if(S.inst[k]){ instMark(c,k,x+22,y-10,1); c.fillStyle=PC.muted; font(c,400,19); c.fillText(IKIND[k].l,x+60,y-4); y+=34; }
  if(S.heat){ y+=10; const g=c.createLinearGradient(x,0,x+w,0); g.addColorStop(0,"#F2B632"); g.addColorStop(.5,"#EC7A2C"); g.addColorStop(1,"#D42A3C"); c.fillStyle=g; c.fillRect(x,y,w,16); c.fillStyle=PC.muted; font(c,400,17); c.fillText("Alerta",x,y+40); c.textAlign="center"; c.fillText("Reacciona",x+w/2,y+40); c.textAlign="right"; c.fillText("Urgente",x+w,y+40); c.textAlign="left"; y+=64; }
  return y;
}
function mapSheet(n,total){
  const {cv,c}=newPage(), I=ind(), dt=deptTotals();
  const FC=focusCodes();
  pageHeader(c,I.label+(FC?` · ${scopeName()}`:""),`${measureLabel()} · ${periodLabel()} · ${sourceLabel()}`);
  const mrect={x:M+26,y:332,w:1500,h:PH-332-190}, fv=FC?fitView(FC,mrect,0.12):null, view=(fv&&vb.w>=fv.w*0.8)?fv:{...vb};
  drawMapCanvas(c,mrect,view);
  const x=M+26+1500+70, w=PW-M-x; let y=356;
  if(FC){ const u=units(BY[S.sel]?"muni":"sub").find(q=>q.id===S.sel), all=units(BY[S.sel]?"muni":"sub").sort((a,b)=>b.v-a.v), rank=all.findIndex(q=>q.id===S.sel)+1, p=profile(FC);
    c.fillStyle=PC.muted; font(c,600,18); c.fillText(BY[S.sel]?"FICHA MUNICIPAL":"FICHA SUBREGIONAL",x,y); y+=56;
    c.fillStyle=PC.violet; font(c,600,56,F.m); c.fillText(fmt(u.casos),x,y); c.fillStyle=PC.muted; font(c,400,19); y=wrapText(c,`${I.what} · ${periodLabel()}`,x,y+32,w,24)+10;
    const kv=[[u.v>0?rank+"°":"—",`puesto entre ${all.length}`],[fmt(u.pop),"mujeres (DANE 2025)"]];
    for(const [v,l] of kv){ c.fillStyle=PC.ink; font(c,600,30,F.m); c.fillText(v,x,y+20); c.fillStyle=PC.muted; font(c,400,18); c.fillText(l,x+190,y+18); y+=50; }
    y+=14; c.fillStyle=PC.line; c.fillRect(x,y,w,2); y+=40; c.fillStyle=PC.muted; font(c,600,18); c.fillText("PERFIL DEL HECHO",x,y); y+=34;
    for(const [l,v] of facts(p)){ c.fillStyle=PC.muted; font(c,400,17); c.fillText(l,x,y); c.fillStyle=PC.ink; font(c,600,20); y=wrapText(c,v,x,y+26,w,24,2)+12; if(y>mrect.y+mrect.h-120) break; }
    y+=6; c.fillStyle=PC.line; c.fillRect(x,y,w,2); y+=40; c.fillStyle=PC.muted; font(c,600,18); c.fillText("CONVENCIONES",x,y); y+=36;
    const cls=classOf(u.v,B); c.fillStyle=colorPrint(cls,B.length); c.fillRect(x,y-20,44,24); c.fillStyle=PC.ink; font(c,400,19); c.fillText(cls>=0?`Clase ${rangeTxt(B[cls])} (quintiles del depto.)`:"Sin casos reportados",x+60,y); y+=34;
    c.fillStyle="#F2F0F5"; c.fillRect(x,y-20,44,24); c.strokeStyle="#CFC8DA"; c.strokeRect(x,y-20,44,24); c.fillStyle=PC.ink; c.fillText("Municipios vecinos",x+60,y);
    if(S.heat){ y+=34; const g=c.createLinearGradient(x,0,x+44,0); g.addColorStop(0,"#F2B632"); g.addColorStop(.5,"#EC7A2C"); g.addColorStop(1,"#D42A3C"); c.fillStyle=g; c.fillRect(x,y-20,44,24); c.fillStyle=PC.ink; font(c,400,19); c.fillText("Mapa de calor (casos por localidad)",x+60,y); }
    for(const k of Object.keys(IKIND)) if(S.inst[k]){ y+=34; instMark(c,k,x+22,y-8,1); c.fillStyle=PC.ink; font(c,400,19); c.fillText(IKIND[k].l,x+60,y); }
    for(const [lk,ll] of LKINDS){ if(!LAY[lk]||!S.layers[lk]) continue; y+=34; c.fillStyle="#9673CF"; if(lk==="corregimientos"){ c.beginPath(); c.arc(x+22,y-8,11,0,7); c.fill(); } else c.fillRect(x,y-20,44,24); c.fillStyle=PC.ink; font(c,400,19); c.fillText(lk==="corregimientos"?"Centros poblados: casos (tamaño)":`${ll}: casos por polígono`,x+60,y); y+=24; c.fillStyle=PC.muted; font(c,400,15); y=wrapText(c,"Fuente: "+(LAY[lk].embedded?D.capas.src[lk]:LAY[lk].file),x+60,y,w-60,19,2)-19; }
    c.fillStyle=PC.muted; font(c,400,17); c.fillText("Proyección geográfica WGS84 · Límites: DANE, MGN 2018",M+26,mrect.y+mrect.h+58);
    pageFooter(c,n,total); return cv; }
  c.fillStyle=PC.muted; font(c,600,18); c.fillText("CONVENCIONES",x,y); y+=40; y=legendBlock(c,x,y,w)+16;
  c.fillStyle=PC.line; c.fillRect(x,y,w,2); y+=46;
  c.fillStyle=PC.muted; font(c,600,18); c.fillText("RESUMEN DEPARTAMENTAL",x,y); y+=50;
  c.fillStyle=PC.violet; font(c,600,52,F.m); c.fillText(fmt(dt.tot),x,y); c.fillStyle=PC.muted; font(c,400,19); y=wrapText(c,I.what,x,y+30,w,24)+24;
  c.fillStyle=PC.muted; font(c,600,18); c.fillText(S.measure==="tasa"?"MAYOR TASA":"MÁS CASOS",x,y+10); y+=46;
  const top=U.slice().sort((a,b)=>b.v-a.v).filter(u=>u.v>0).slice(0,Math.max(3,Math.min(8,Math.floor((mrect.y+mrect.h-y)/36))));
  for(const [i,u] of top.entries()){ c.fillStyle=PC.ink; font(c,500,21); c.fillText(`${i+1}. ${u.name}`,x,y); font(c,500,20,F.m); c.textAlign="right"; c.fillText(fmt(u.v,S.measure==="tasa"?1:0),x+w,y); c.textAlign="left"; y+=36; }
  c.fillStyle=PC.muted; font(c,400,17); c.fillText("Proyección geográfica WGS84 · Límites: DANE, MGN 2018",M+26,mrect.y+mrect.h+58);
  pageFooter(c,n,total); return cv;
}
function summaryPage(n,total){
  const {cv,c}=newPage(), I=ind(), dt=deptTotals(), dupla=isDupla();
  pageHeader(c,"Resumen del indicador",`${I.label} · ${measureLabel()} · ${periodLabel()}`);
  // KPIs
  const kp=[[fmt(dt.tot),I.what],[`${units("sub").filter(u=>u.casos>0).length} / ${SUBS.length}`,"subregiones con casos"],[`${MUN.filter(m=>casesFor(m.code)>0).length} / 64`,"municipios con casos"],[fmt(dt.pop),"mujeres en Nariño (DANE 2025)"]];
  const kw=(PW-2*M-3*30)/4; kp.forEach(([v,l],i)=>{ const x=M+i*(kw+30); c.fillStyle=i?PC.sunk:PC.violet; c.fillRect(x,340,kw,150); c.fillStyle=i?PC.ink:"#FFFFFF"; font(c,600,50,F.m); c.fillText(v,x+28,415); font(c,400,21); c.fillStyle=i?PC.muted:"#E9E2F7"; wrapText(c,l,x+28,456,kw-56,26,2); });
  // izquierda: tendencia o tipos
  const lx=M, lw=1000; let y=560;
  c.fillStyle=PC.muted; font(c,600,19); c.fillText(dupla?"TIPO DE VIOLENCIA (ATENCIONES)":"CASOS POR AÑO EN EL DEPARTAMENTO",lx,y); y+=30;
  if(!dupla){ const s=seriesFor(MUN.map(m=>m.code)), mx=Math.max(1,...s), ch=330, bw=lw/s.length;
    s.forEach((v,i)=>{ const h=ch*v/mx, x=lx+i*bw+14, by=y+ch+20; c.fillStyle=YEARS[i]===S.year?PC.magenta:palP()[2]; c.fillRect(x,by-h,bw-28,h); c.fillStyle=PC.ink; font(c,500,20,F.m); c.textAlign="center"; c.fillText(fmt(v),x+(bw-28)/2,by-h-10); c.fillStyle=PC.muted; c.fillText(YEARS[i],x+(bw-28)/2,by+30); c.textAlign="left"; });
    y+=ch+80; c.fillStyle=PC.muted; font(c,400,18); c.fillText("2026 corresponde a un año en curso (corte parcial).",lx,y); y+=50;
    const z=zonaSplit(), t=z.u+z.r+z.o||1; c.fillStyle=PC.muted; font(c,600,19); c.fillText("ZONA DEL HECHO",lx,y); y+=24; c.fillStyle=palP()[3]; c.fillRect(lx,y,lw*z.u/t,26); c.fillStyle=palP()[1]; c.fillRect(lx+lw*z.u/t,y,lw*z.r/t,26);
    y+=60; c.fillStyle=PC.ink; font(c,500,21); c.fillText(`Urbana ${fmt(z.u)} (${fmt(z.u/t*100)} %)`,lx,y); c.textAlign="right"; c.fillText(`Rural ${fmt(z.r)} (${fmt(z.r/t*100)} %)`,lx+lw,y); c.textAlign="left";
  } else { const tt=duplaTypes(Object.keys(DUP.m)), mx=Math.max(1,...DTYPES.map(([,k])=>tt[k])); y+=20;
    for(const [l,k] of DTYPES){ c.fillStyle=PC.ink; font(c,500,22); c.fillText(l,lx,y+20); c.fillStyle=PC.sunk; c.fillRect(lx+330,y,lw-430,26); c.fillStyle=palP()[3]; c.fillRect(lx+330,y,(lw-430)*tt[k]/mx,26); font(c,600,22,F.m); c.textAlign="right"; c.fillStyle=PC.ink; c.fillText(tt[k],lx+lw,y+20); c.textAlign="left"; y+=56; }
    c.fillStyle=PC.muted; font(c,400,18); y=wrapText(c,`${tt.total} atenciones · ${periodLabel()}. Una atención puede registrar varios tipos de violencia.`,lx,y+20,lw,26); }
  // derecha: subregiones
  const rx=M+lw+110, rw=PW-M-rx; y=560; c.fillStyle=PC.muted; font(c,600,19); c.fillText("SUBREGIONES",rx,y); y+=40;
  font(c,600,17); c.fillStyle=PC.muted; c.fillText("Subregión",rx,y); c.textAlign="right"; c.fillText("Casos",rx+rw-260,y); c.fillText("Mujeres",rx+rw,y); c.textAlign="left"; y+=14; c.fillStyle=PC.line; c.fillRect(rx,y,rw,2); y+=36;
  for(const u of units("sub").sort((a,b)=>b.v-a.v)){ c.fillStyle=PC.ink; font(c,500,21); c.fillText(u.name,rx,y); font(c,500,20,F.m); c.textAlign="right"; c.fillText(fmt(u.casos),rx+rw-260,y); c.fillText(fmt(u.pop),rx+rw,y); c.textAlign="left"; y+=14; c.fillStyle=PC.line; c.fillRect(rx,y,rw,1); y+=37; }
  c.fillStyle=PC.muted; font(c,400,18); wrapText(c,"El mapa clasifica los municipios por número de casos (quintiles). Población de mujeres: proyección DANE 2025, como referencia.",rx,y+24,rw,26);
  pageFooter(c,n,total); return cv;
}
function tablePage(n,total){
  const {cv,c}=newPage(), I=ind();
  pageHeader(c,"Tabla municipal",`${I.label} · ${periodLabel()} · ordenada por ${S.measure==="tasa"?"tasa":"casos"}`);
  const rows=units("muni").sort((a,b)=>b.v-a.v||a.name.localeCompare(b.name,"es")), colW=(PW-2*M-80)/2, rh=33;
  [rows.slice(0,32),rows.slice(32)].forEach((part,ci)=>{ const x=M+ci*(colW+80); let y=350;
    font(c,600,16); c.fillStyle=PC.muted; c.fillText("#",x,y); c.fillText("MUNICIPIO",x+50,y); c.fillText("SUBREGIÓN",x+430,y); c.textAlign="right"; c.fillText("CASOS",x+colW-170,y); c.fillText("MUJERES",x+colW,y); c.textAlign="left"; y+=12; c.fillStyle=PC.ink; c.fillRect(x,y,colW,2); y+=30;
    part.forEach((u,i)=>{ if(i%2===0){ c.fillStyle=PC.sunk; c.fillRect(x,y-23,colW,rh); } const r=ci*32+i+1; c.fillStyle=PC.muted; font(c,500,18,F.m); c.fillText(u.v>0?r:"—",x+4,y); c.fillStyle=PC.ink; font(c,500,19); c.fillText(u.name,x+50,y); c.fillStyle=PC.muted; font(c,400,18); c.fillText(u.sub,x+430,y); c.fillStyle=PC.ink; font(c,500,18,F.m); c.textAlign="right"; c.fillText(fmt(u.casos),x+colW-170,y); c.fillText(fmt(u.pop),x+colW,y); c.textAlign="left"; y+=rh; }); });
  pageFooter(c,n,total); return cv;
}
function fichaPage(n,total){
  const {cv,c}=newPage(), I=ind(), u=units(BY[S.sel]?"muni":"sub").find(x=>x.id===S.sel), dt=deptTotals(), dupla=isDupla();
  pageHeader(c,`Ficha territorial · ${u.name}`,`${I.label} · ${periodLabel()}${u.sub?" · Subregión "+u.sub:""}`);
  const rk=units(BY[S.sel]?"muni":"sub").sort((a,b)=>b.v-a.v), rpos=rk.findIndex(q=>q.id===u.id)+1;
  const kp=[[fmt(u.casos),I.what],[u.casos>0?rpos+"°":"—",`puesto entre ${rk.length} por número de casos`],[fmt(u.pop),"mujeres (DANE 2025)"]];
  const kw=(PW-2*M-2*30)/3; kp.forEach(([v,l],i)=>{ const x=M+i*(kw+30); c.fillStyle=i?PC.sunk:PC.violet; c.fillRect(x,340,kw,150); c.fillStyle=i?PC.ink:"#FFFFFF"; font(c,600,50,F.m); c.fillText(v,x+28,415); font(c,400,21); c.fillStyle=i?PC.muted:"#E9E2F7"; wrapText(c,l,x+28,456,kw-56,26,2); });
  let y=570; const lx=M, lw=1000;
  if(!dupla){ c.fillStyle=PC.muted; font(c,600,19); c.fillText("CASOS POR AÑO",lx,y); y+=30; const s=seriesFor(u.codes), mx=Math.max(1,...s), ch=250, bw=lw/s.length;
    s.forEach((v,i)=>{ const h=ch*v/mx, x=lx+i*bw+14, by=y+ch+20; c.fillStyle=YEARS[i]===S.year?PC.magenta:palP()[2]; c.fillRect(x,by-h,bw-28,h); c.fillStyle=PC.ink; font(c,500,20,F.m); c.textAlign="center"; c.fillText(fmt(v),x+(bw-28)/2,by-h-10); c.fillStyle=PC.muted; c.fillText(YEARS[i],x+(bw-28)/2,by+30); c.textAlign="left"; }); }
  else { const tt=duplaTypes(u.codes); c.fillStyle=PC.muted; font(c,600,19); c.fillText("TIPO DE VIOLENCIA",lx,y); y+=40; for(const [l,k] of DTYPES){ c.fillStyle=PC.ink; font(c,500,22); c.fillText(`${l}: ${tt[k]}`,lx,y); y+=44; } }
  { const codes=u.codes, b=boundsOf(codes), w=b[2]-b[0], h=b[3]-b[1], pad=.35; const r={x:M+34,y:1000,w:1000-34,h:PH-1000-190};
    c.fillStyle=PC.muted; font(c,600,19); c.fillText("UBICACIÓN",M,968);
    const asp=r.w/r.h; let vw=w*(1+2*pad), vh=h*(1+2*pad); if(vw/vh<asp) vw=vh*asp; else vh=vw/asp;
    drawMapCanvas(c,r,{x:(b[0]+b[2])/2-vw/2,y:(b[1]+b[3])/2-vh/2,w:vw,h:vh}); }
  if(BY[u.id]){ const G=locGroups(u.id), rx=M+lw+110, rw=PW-M-rx, cw=rw/2-30, ymax=PH-210; let yy=570;
    c.fillStyle=PC.muted; font(c,600,19); c.fillText("CORREGIMIENTOS Y VEREDAS",rx,yy); yy+=40;
    if(!G.rur.length){ font(c,400,18); c.fillText("Sin registro rural en el periodo.",rx,yy); }
    for(const x of G.rur){ if(yy>ymax) break; c.fillStyle=PC.ink; font(c,500,19); let nm=x.name; while(c.measureText(nm).width>cw-70&&nm.length>4) nm=nm.slice(0,-1); c.fillText(nm,rx,yy); font(c,500,19,F.m); c.textAlign="right"; c.fillText(fmt(x.v),rx+cw,yy); c.textAlign="left"; yy+=32; }
    const x2=rx+rw/2+20; let y2=570; c.fillStyle=PC.muted; font(c,600,19); c.fillText(G.com?"COMUNAS Y BARRIOS":"BARRIOS CON MÁS CASOS",x2,y2); y2+=40;
    if(G.com){ for(const g of G.com){ if(y2>ymax-20) break; c.fillStyle=PC.ink; font(c,700,20); c.fillText(g.name,x2,y2); font(c,600,20,F.m); c.textAlign="right"; c.fillText(fmt(g.v),x2+cw,y2); c.textAlign="left"; c.fillStyle=PC.muted; font(c,400,15); y2=wrapText(c,g.items.slice(0,4).map(z=>`${z.name} (${z.v})`).join(" · "),x2,y2+22,cw,19,1)+16; } }
    else { if(!G.urb.length){ c.fillStyle=PC.muted; font(c,400,18); c.fillText("Sin barrios registrados en el periodo.",x2,y2); }
      for(const x of G.urb){ if(y2>ymax) break; c.fillStyle=PC.ink; font(c,500,19); let nm=x.name; while(c.measureText(nm).width>cw-70&&nm.length>4) nm=nm.slice(0,-1); c.fillText(nm,x2,y2); font(c,500,19,F.m); c.textAlign="right"; c.fillText(fmt(x.v),x2+cw,y2); c.textAlign="left"; y2+=32; } } }
  pageFooter(c,n,total); return cv;
}

/* ================= PERFIL DEL DELITO ================= */
const MESES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_L=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DIAS_C=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const HORAS=Array.from({length:24},(_,h)=>String(h).padStart(2,"0"));
const CURSO=["Primera infancia (0–5)","Infancia (6–11)","Adolescencia (12–17)","Juventud (18–28)","Adultez (29–59)","Vejez (60 y más)","Sin dato de edad"];
const POBL=["Víctima del conflicto armado","Lideresa","Migrante","Con discapacidad","Población LGBTIQ+"];
const DUP_YEARS=[...new Set(D.dup.r.map(r=>String(r[1])))].sort();
const scopeCodes=()=>S.sel?(BY[S.sel]?[S.sel]:MUN.filter(m=>m.sub===S.sel).map(m=>m.code)):MUN.map(m=>m.code);
const scopeName=()=>S.sel?(BY[S.sel]?BY[S.sel].name:"Subregión "+S.sel):"Departamento de Nariño";
const argmax=a=>a.reduce((bi,v,i)=>v>a[bi]?i:bi,0);
const sum=a=>a.reduce((x,y)=>x+y,0);
const pct=(v,t)=>t?fmt(v/t*100)+" %":"—";
const hh=h=>String(h).padStart(2,"0")+":00";
const srt=(L,V)=>L.map((n,i)=>({id:i,name:n,v:V[i]})).sort((a,b)=>(a.id===L.length-1)-(b.id===L.length-1)||b.v-a.v);

function profile(codes){
  if(isDupla()){
    const set=new Set(codes.map(c=>MUN.findIndex(m=>m.code===c))), DP=D.dup;
    const o={dupla:true,n:0,c:Array(7).fill(0),d:Array(7).fill(0),dk:0,my:Object.fromEntries(DUP_YEARS.map(y=>[y,Array(12).fill(0)])),mNo:0,
      l:Array(DP.lugar.length).fill(0),g:Array(DP.agresor.length).fill(0),e:Array(DP.etnia.length).fill(0),pb:Array(5).fill(0),t:{psico:0,fisica:0,sexual:0,eco:0,intento:0,femi:0},n24:0};
    for(const r of dupRecs()){ if(!set.has(r[0])) continue; o.n++;
      o.c[r[4]]++; if(r[3]>=0){ o.d[r[3]]++; o.dk++; } if(r[2]>0) o.my[String(r[1])][r[2]-1]++; else o.mNo++;
      o.l[r[6]]++; o.g[r[7]]++; o.e[r[8]]++; for(let i=0;i<5;i++) if(r[9]&(1<<i)) o.pb[i]++;
      const b=r[5]; if(b&1)o.t.psico++; if(b&2)o.t.fisica++; if(b&4)o.t.sexual++; if(b&8)o.t.eco++; if(b&16)o.t.intento++; if(b&32)o.t.femi++;
      if(r[11]===0) o.n24++; }
    o.m=Array(12).fill(0); for(const y of DUP_YEARS) o.my[y].forEach((v,i)=>o.m[i]+=v);
    return o;
  }
  const P=D.prof[ind().key], o={dupla:false,z:[0,0,0],m:Array(12).fill(0),c:Array(7).fill(0),d:Array(7).fill(0),dh:Array(168).fill(0),h0:0,s:Array(P.sit.length).fill(0),a:Array(P.arm.length).fill(0),sl:P.sit,al:P.arm};
  for(const code of codes){ const ys=P.x[code]||{};
    for(const y in ys){ if(S.year!=="all"&&y!==S.year) continue; const e=ys[y];
      e.z.forEach((v,i)=>o.z[i]+=v); e.m.forEach((v,i)=>o.m[i]+=v); e.c.forEach((v,i)=>o.c[i]+=v); e.d.forEach((v,i)=>o.d[i]+=v); o.h0+=e.h0;
      for(const k in e.dh) o.dh[+k]+=e.dh[k]; for(const k in e.s) o.s[+k]+=e.s[k]; for(const k in e.a) o.a[+k]+=e.a[k]; } }
  o.n=sum(o.c); o.h=Array(24).fill(0); o.dh.forEach((v,i)=>o.h[i%24]+=v); return o;
}
function facts(p){
  const known=sum(p.c.slice(0,6)), ci=argmax(p.c.slice(0,6));
  if(p.dupla){ const DP=D.dup, li=srt(DP.lugar,p.l).filter(x=>x.id<DP.lugar.length-2), gi=srt(DP.agresor,p.g).filter(x=>x.id<DP.agresor.length-2);
    const lk=sum(p.l.slice(0,-1)), gk=sum(p.g.slice(0,-1));
    return [["Atenciones registradas",fmt(p.n)],["Mes con más atenciones",sum(p.m)?MESES_L[argmax(p.m)]:"—"],["Día con más atenciones",p.dk?DIAS[argmax(p.d)]:"—"],
      ["Curso de vida más afectado",known?`${CURSO[ci]} · ${pct(p.c[ci],known)}`:"—"],["Lugar más frecuente",li[0]&&li[0].v?`${li[0].name} · ${pct(li[0].v,lk)}`:"—"],["Agresor más frecuente",gi[0]&&gi[0].v?`${gi[0].name} · ${pct(gi[0].v,gk)}`:"—"]]; }
  const hk=sum(p.h), si=p.s.slice(0,-1), ai=p.a.slice(0,-1), hm=argmax(p.h);
  return [["Mes con más casos",p.n?MESES_L[argmax(p.m)]:"—"],["Día con más casos",p.n?DIAS[argmax(p.d)]:"—"],["Franja con más casos",sum(franjaVals(p))?franjaNames()[argmax(franjaVals(p))]:"—"],
    ["Curso de vida más afectado",known?`${CURSO[ci]} · ${pct(p.c[ci],known)}`:"—"],["Sitio más frecuente",sum(si)?`${p.sl[argmax(si)]} · ${pct(si[argmax(si)],p.n)}`:"—"],["Arma o medio más frecuente",sum(ai)?`${p.al[argmax(ai)]} · ${pct(ai[argmax(ai)],p.n)}`:"—"]];
}

/* ---- gráficas de barras (SVG) ---- */
const SER_CLS=["l0","l1","l2"];
function niceMax(v){ const raw=Math.max(1,v)/4, p=Math.pow(10,Math.floor(Math.log10(raw))); for(const m of (p<=1?[1,2,5,10]:[1,2,2.5,5,10])) if(m*p>=raw) return 4*m*p; return 40*p; }
const DUP_COV={}; for(const r of D.dup.r) if(r[2]>0){ const y=String(r[1]); (DUP_COV[y]=DUP_COV[y]||[]); if(!DUP_COV[y].includes(r[2])) DUP_COV[y].push(r[2]); } for(const y in DUP_COV) DUP_COV[y].sort((a,b)=>a-b);
const covSeries=(p,y)=>({name:y,vals:p.my[y].map((v,i)=>DUP_COV[y].includes(i+1)?v:null)});
const hourSeries=p=>p.h.map((v,i)=>i===0||i===12?null:v);
const num=a=>a.filter(v=>v!=null);
function lineSVG(labels,series,{H=250,W=900,labelEvery=1,unit="casos"}={}){
  /* gráfica de barras (agrupadas cuando hay varias series); los vacíos (null) = sin dato */
  const L=46,R=10,T=24,Bm=34,iw=W-L-R,ih=H-T-Bm, n=labels.length, ns=series.length, mx=niceMax(Math.max(1,...series.flatMap(s=>num(s.vals))));
  const slot=iw/n, gw=slot*(ns>1?.84:.72), bw=gw/ns, Yv=v=>T+ih-ih*v/mx, x0=i=>L+i*slot+(slot-gw)/2;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(x=>x.name).join(", "))}">`;
  for(let k=0;k<=4;k++){ const v=mx*k/4, y=Yv(v); s+=`<line class="gl" x1="${L}" x2="${W-R}" y1="${y}" y2="${y}"></line><text class="ax" x="${L-8}" y="${y+4}" text-anchor="end">${fmt(v)}</text>`; }
  labels.forEach((lb,i)=>{ if(i%labelEvery===0||i===n-1) s+=`<text class="ax" x="${L+i*slot+slot/2}" y="${H-10}" text-anchor="middle">${lb}</text>`; });
  series.forEach((se,si)=>{ const pk=argmax(se.vals.map(v=>v??-1));
    se.vals.forEach((v,i)=>{ const x=x0(i)+si*bw;
      if(v==null){ s+=`<rect class="nd" x="${x+.5}" y="${T+ih-6}" width="${Math.max(1,bw-1.5)}" height="6"><title>${esc(se.name)} · ${labels[i]}: sin dato</title></rect>`; return; }
      const h=ih*v/mx, one=ns===1; s+=`<rect class="bx ${one?(i===pk&&v>0?"pk":"single"):SER_CLS[si%3]}" x="${x.toFixed(1)}" y="${(T+ih-h).toFixed(1)}" width="${Math.max(1,bw-(ns>1?1.5:0)).toFixed(1)}" height="${Math.max(h,v>0?1.5:0).toFixed(1)}" rx="2"><title>${esc(se.name)} · ${labels[i]}: ${fmt(v)} ${unit}</title></rect>`;
      if(one&&v>0&&(n<=12||i===pk)) s+=`<text class="pkl" x="${(x+bw/2).toFixed(1)}" y="${(T+ih-h-5).toFixed(1)}" text-anchor="middle"${i===pk?"":` style="font-weight:500;fill:var(--muted)"`}>${fmt(v)}</text>`; }); });
  s+="</svg>";
  if(ns>1) s+=`<div class="lleg">${series.map((se,si)=>`<span><i class="${SER_CLS[si%3]}"></i>${esc(se.name)}</span>`).join("")}</div>`;
  return s;
}

/* barras horizontales agrupadas (un renglón por mes, una barra por año) */
function gBarsHTML(labels,series,unit){
  const mx=Math.max(1,...series.flatMap(s=>num(s.vals)));
  let h=`<div class="gbars">`;
  labels.forEach((lb,i)=>{ if(series.every(s=>!(s.vals[i]>0))) return;
    h+=`<div class="gb"><span class="nm">${lb}</span><div class="rows">`+series.map((s,si)=>!(s.vals[i]>0)?"":`<div class="r" title="${esc(s.name)} · ${lb}: ${fmt(s.vals[i])} ${unit}"><span class="tr"><span class="fl ${SER_CLS[si%3]}" style="width:${s.vals[i]>0?Math.max(1.5,s.vals[i]/mx*100):0}%"></span></span><span class="vv">${fmt(s.vals[i])}</span></div>`).join("")+`</div></div>`; });
  h+=`</div>`;
  if(series.length>1) h+=`<div class="lleg">${series.map((se,si)=>`<span><i class="${SER_CLS[si%3]}"></i>${esc(se.name)}</span>`).join("")}</div>`;
  return h;
}
const MESES_N=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const hb=(names,vals,o={})=>barsHTML(names.map((n,i)=>({id:i,name:n,v:vals[i]})),{dec:0,pk:true,...o});
/* franjas horarias (se excluyen las horas 00 y 12, no confiables) */
const FRANJAS=[["Madrugada","0 a 6 h",0,6],["Mañana","6 a 12 h",6,12],["Tarde","12 a 18 h",12,18],["Noche","18 a 24 h",18,24]];
const franjaVals=p=>{ const hs=hourSeries(p); return FRANJAS.map(([,,a,b])=>sum(hs.slice(a,b).map(v=>v||0))); };
const franjaNames=()=>FRANJAS.map(([n,r])=>`${n} (${r})`);
const mesesCon=(vals)=>MESES_N.map((n,i)=>({id:i,name:n,v:vals[i]})).filter(x=>x.v>0);
function hourBars(p){ const hs=hourSeries(p), mx=Math.max(1,...num(hs)), nm=HORAS.map(h=>`${h}:00`);
  return `<div class="hb2">${hb(nm.slice(0,12),hs.slice(0,12),{mxv:mx})}${hb(nm.slice(12),hs.slice(12),{mxv:mx})}</div>`; }
function perfil(){
  const p=profile(scopeCodes()), box=$("#perfil");
  $("#perfScope").textContent=`${scopeName()} · ${ind().label} · ${periodLabel()}`;
  const fx=`<div class="card s6 factsrow">${facts(p).map(([l,v])=>`<div class="fact"><span class="l">${l}</span><span class="v">${esc(v)}</span></div>`).join("")}</div>`;
  if(!p.n){ box.innerHTML=fx+`<div class="card s6"><p class="note">No hay registros para ${esc(scopeName())} en este periodo.</p></div>`; return; }
  const cursoBars=barsHTML(CURSO.slice(0,6).map((n,i)=>({id:i,name:n,v:p.c[i]})),{dec:0})+`<p class="hint">${fmt(p.c[6])} ${p.c[6]===1?"registro":"registros"} sin edad (${pct(p.c[6],p.n)}).</p>`;
  if(p.dupla){
    const DP=D.dup, years=S.year==="all"?DUP_YEARS:[S.year];
    const mSeries=years.map(y=>covSeries(p,y));
    box.innerHTML=fx+
     `<div class="card s4"><span class="eyebrow">Cuándo · atenciones por mes${years.length>1?" y año":""}</span>${mSeries.length?gBarsHTML(MESES_N,mSeries,"atenciones")+`<p class="hint">Solo se muestran los meses con atenciones registradas.</p>`:'<p class="hint">Sin fecha registrada.</p>'}<p class="hint">${fmt(p.mNo)} atenciones sin mes (base consolidada 2026). Cobertura: 2024 ${DP.cobertura["2024"]}; 2025 ${DP.cobertura["2025"]}; 2026 ${DP.cobertura["2026"]}.</p></div>
      <div class="card s2"><span class="eyebrow">A quién afecta · curso de vida</span>${cursoBars}</div>
      <div class="card s3"><span class="eyebrow">Cuándo · día de la semana de la atención</span>${p.dk?hb(DIAS,p.d):'<p class="hint">Sin fechas en este periodo.</p>'}<p class="hint">Basado en ${fmt(p.dk)} atenciones con fecha exacta (${pct(p.dk,p.n)}).</p></div>
      <div class="card s3"><span class="eyebrow">A quién afecta · grupos poblacionales</span>${barsHTML(POBL.map((n,i)=>({id:i,name:n,v:p.pb[i]})),{dec:0})}<span class="eyebrow" style="margin-top:6px">Pertenencia étnica</span>${barsHTML(srt(DP.etnia,p.e),{dec:0})}</div>
      <div class="card s3"><span class="eyebrow">Dónde · lugar de los hechos</span>${barsHTML(srt(DP.lugar,p.l),{dec:0})}</div>
      <div class="card s3"><span class="eyebrow">Quién agrede · relación con la víctima</span>${barsHTML(srt(DP.agresor,p.g),{dec:0})}</div>
      <div class="card s6"><p class="note">La matriz de la Dupla Violeta no registra la hora ni el tipo de arma. El perfil reúne todas las atenciones del territorio, sin importar el tipo de violencia.${p.n24?` La matriz 2024 (${fmt(p.n24)} atenciones en esta vista) no tiene columnas de lugar, agresor, violencia sexual ni económica: esos registros aparecen como «No registra».`:""}</p></div>`;
    return;
  }
  box.innerHTML=fx+
   `<div class="card s2"><span class="eyebrow">Cuándo ocurre · mes${S.year==="all"?" (suma "+POL_RANGE+")":""}</span>${barsHTML(mesesCon(p.m),{dec:0,pk:true})}<p class="hint">Solo se muestran los meses con casos.</p></div>
    <div class="card s2"><span class="eyebrow">Cuándo ocurre · día de la semana</span>${hb(DIAS,p.d)}</div>
    <div class="card s2"><span class="eyebrow">A quién afecta · curso de vida</span>${cursoBars}</div>
    <div class="card s2"><span class="eyebrow">Cuándo ocurre · franja horaria</span>${hb(franjaNames(),franjaVals(p))}<p class="hint">No se cuentan las horas 00 y 12: la matriz casi no registra casos al mediodía y concentra muchos a medianoche (el mediodía se digitó como 00). Son ${fmt(p.h0)} casos (${pct(p.h0,p.n)}) con hora no confiable.</p></div>
    <div class="card s2"><span class="eyebrow">Dónde ocurre · clase de sitio</span>${barsHTML(srt(p.sl,p.s),{dec:0})}</div>
    <div class="card s2"><span class="eyebrow">Con qué · tipo de arma o medio</span>${barsHTML(srt(p.al,p.a),{dec:0})}</div>`;
}

/* ---- dibujo en canvas para el PDF ---- */
const PSER=["#6A42AE","#D93A68","#EC7A2C"];
function cTitle(c,t,x,y){ c.fillStyle=PC.muted; font(c,600,19); c.fillText(t.toUpperCase(),x,y); }
function cBars(c,x,y,w,items,{rowH=40,labelW=420,dec=0,maxRows=12,pk=false,mxv=null}={}){
  const list=items.slice(0,maxRows), mx=mxv??Math.max(1,...list.map(i=>i.v??0)), bw=w-labelW-110, top=pk?Math.max(...list.map(i=>i.v??-1)):null;
  for(const it of list){ const hi=pk&&it.v===top&&it.v>0; c.fillStyle=it.v==null?PC.muted:PC.ink; font(c,hi?700:500,Math.min(21,rowH*.52)); let nm=it.name; while(c.measureText(nm).width>labelW-16&&nm.length>4) nm=nm.slice(0,-2); if(nm!==it.name) nm=nm.slice(0,-1)+"…"; c.fillText(nm,x,y+rowH*.62);
    c.fillStyle=PC.sunk; c.fillRect(x+labelW,y+rowH*.25,bw,rowH*.5); c.fillStyle=hi?PC.magenta:palP()[3]; if(it.v>0) c.fillRect(x+labelW,y+rowH*.25,Math.max(3,bw*it.v/mx),rowH*.5);
    c.fillStyle=it.v==null?PC.muted:PC.ink; font(c,hi?700:500,Math.min(20,rowH*.5),F.m); c.textAlign="right"; c.fillText(it.v==null?"s/d":fmt(it.v,dec),x+w,y+rowH*.62); c.textAlign="left"; y+=rowH; }
  return y;
}
function cGroupBars(c,x,y,w,labels,series,{labelW=170,barH=14,gap=16}={}){
  const mx=Math.max(1,...series.flatMap(s=>num(s.vals))), bw=w-labelW-90;
  labels.forEach((lb,i)=>{ const rows=series.map((s,si)=>[s.vals[i],si]).filter(r=>r[0]>0); if(!rows.length) return;
    c.fillStyle=PC.ink; font(c,600,19); c.fillText(lb,x,y+barH+2);
    rows.forEach(([v,si],k)=>{ const yy=y+k*(barH+5); c.fillStyle=PC.sunk; c.fillRect(x+labelW,yy,bw,barH); c.fillStyle=PSER[si%3]; if(v>0) c.fillRect(x+labelW,yy,Math.max(3,bw*v/mx),barH); c.fillStyle=PC.ink; font(c,500,16,F.m); c.textAlign="right"; c.fillText(fmt(v),x+w,yy+barH-1); c.textAlign="left"; });
    y+=rows.length*(barH+5)+gap; });
  let lx=x; series.forEach((se,si)=>{ c.fillStyle=PSER[si%3]; c.fillRect(lx,y+2,18,18); c.fillStyle=PC.ink; font(c,500,18); c.fillText(se.name,lx+28,y+17); lx+=120; });
  return y+30;
}
function cCols(c,x,y,w,h,labels,vals,hl){
  const bw=w/vals.length, mx=Math.max(1,...vals), base=y+h-34;
  vals.forEach((v,i)=>{ const bh=(h-80)*v/mx, bx=x+i*bw+8; c.fillStyle=i===hl?PC.magenta:palP()[2]; c.fillRect(bx,base-bh,bw-16,bh);
    c.textAlign="center"; if(v>0){ c.fillStyle=PC.ink; font(c,500,19,F.m); c.fillText(fmt(v),bx+(bw-16)/2,base-bh-10); } c.fillStyle=PC.muted; font(c,500,19); c.fillText(labels[i],bx+(bw-16)/2,base+28); c.textAlign="left"; });
}
function cLine(c,x,y,w,h,labels,series,{labelEvery=1}={}){
  /* barras (agrupadas si hay varias series) para el PDF */
  const L=70,R=10,T=34,Bm=46,iw=w-L-R,ih=h-T-Bm,n=labels.length,ns=series.length,mx=niceMax(Math.max(1,...series.flatMap(s=>num(s.vals))));
  const slot=iw/n, gw=slot*(ns>1?.84:.7), bw=gw/ns, Yv=v=>y+T+ih-ih*v/mx, x0=i=>x+L+i*slot+(slot-gw)/2;
  c.lineWidth=1.5; c.strokeStyle="#E3DEEA"; font(c,500,17,F.m); c.fillStyle=PC.muted;
  for(let k=0;k<=4;k++){ const v=mx*k/4, yy=Yv(v); c.beginPath(); c.moveTo(x+L,yy); c.lineTo(x+w-R,yy); c.stroke(); c.textAlign="right"; c.fillText(fmt(v),x+L-12,yy+6); }
  c.textAlign="center"; font(c,500,18); labels.forEach((lb,i)=>{ if(i%labelEvery===0||i===n-1) c.fillText(lb,x+L+i*slot+slot/2,y+h-12); });
  series.forEach((se,si)=>{ const col=ns===1?palP()[2]:PSER[si%3], pk=argmax(se.vals.map(v=>v??-1));
    se.vals.forEach((v,i)=>{ const bx=x0(i)+si*bw;
      if(v==null){ c.setLineDash([5,4]); c.strokeStyle="#C9C2D6"; c.lineWidth=1.5; c.strokeRect(bx+1,y+T+ih-10,bw-3,10); c.setLineDash([]); return; }
      const bh=ih*v/mx; c.fillStyle=ns===1&&i===pk&&v>0?PC.magenta:col; c.fillRect(bx,Yv(v),bw-(ns>1?3:0),Math.max(bh,v>0?2:0));
      if(ns===1&&v>0&&(n<=12||i===pk)){ c.fillStyle=PC.ink; font(c,i===pk?700:500,ns===1&&n>12?17:19,F.m); c.textAlign="center"; c.fillText(fmt(v),bx+bw/2,Yv(v)-10); } }); });
  c.textAlign="left";
  if(ns>1){ let lx=x+L; series.forEach((se,si)=>{ c.fillStyle=PSER[si%3]; c.fillRect(lx,y-2,18,18); c.fillStyle=PC.ink; font(c,500,19); c.fillText(se.name,lx+28,y+13); lx+=130; }); c.fillStyle=PC.muted; font(c,400,16); c.fillText("Recuadro punteado = mes sin matriz (sin dato)",lx+20,y+13); }
}

function cFactsRow(c,list,y,h=120){
  const n=list.length, gap=20, bw=(PW-2*M-gap*(n-1))/n;
  list.forEach(([l,v],i)=>{ const x=M+i*(bw+gap); c.fillStyle=i?PC.sunk:PC.violet; c.fillRect(x,y,bw,h);
    c.fillStyle=i?PC.muted:"#E9E2F7"; font(c,500,17); wrapText(c,l,x+20,y+32,bw-40,20,1); c.fillStyle=i?PC.ink:"#FFFFFF"; font(c,700,22); wrapText(c,v,x+20,y+68,bw-40,26,2); });
  return y+h;
}
function perfilPages(start,total){
  const p=profile(scopeCodes()), I=ind(), sub=`${scopeName()} · ${I.label} · ${periodLabel()}`, out=[];
  const half=(PW-2*M-110)/2, x2=M+half+110;
  if(p.dupla){
    const DP=D.dup, years=S.year==="all"?DUP_YEARS:[S.year], f=facts(p);
    { const {cv,c}=newPage(); pageHeader(c,"¿Cuándo y a quién afecta?",sub); cFactsRow(c,f.slice(0,4),330);
      cTitle(c,`Atenciones por mes${years.length>1?" y año":""}`,M,510); const ms=years.map(y=>covSeries(p,y)); const nrow=MESES.filter((_,i)=>ms.some(s=>s.vals[i]>0)).length, nb=ms.reduce((a,s)=>a+s.vals.filter(v=>v>0).length,0);
      cGroupBars(c,M,530,half,MESES_N,ms,{barH:Math.max(8,Math.min(16,Math.floor((400-nrow*12)/Math.max(1,nb)-5))),gap:12});
      c.fillStyle=PC.muted; font(c,400,17); c.fillText(`${fmt(p.mNo)} atenciones sin mes (base consolidada 2026). Solo meses con atenciones registradas.`,M,985);
      cTitle(c,"Día de la semana de la atención",x2,510); if(p.dk) cBars(c,x2,530,half,DIAS.map((n,i)=>({name:n,v:p.d[i]})),{rowH:56,labelW:260,pk:true}); c.fillStyle=PC.muted; font(c,400,17); c.fillText(`Basado en ${fmt(p.dk)} atenciones con fecha exacta.`,x2,970);
      cTitle(c,"Curso de vida",M,1030); cBars(c,M,1045,half,CURSO.map((n,i)=>({name:n,v:p.c[i]})),{rowH:62});
      cTitle(c,"Grupos poblacionales",x2,1030); cBars(c,x2,1045,half,POBL.map((n,i)=>({name:n,v:p.pb[i]})),{rowH:62});
      pageFooter(c,start,total); out.push(cv); }
    { const {cv,c}=newPage(); pageHeader(c,"¿Dónde ocurre y quién agrede?",sub); cFactsRow(c,f.slice(4).concat([["Atenciones con intento de feminicidio",fmt(p.t.intento)],["Feminicidios registrados",fmt(p.t.femi)]]),330);
      cTitle(c,"Lugar de los hechos",M,510); cBars(c,M,525,half,srt(DP.lugar,p.l),{rowH:50});
      cTitle(c,"Relación de la persona agresora",x2,510); cBars(c,x2,525,half,srt(DP.agresor,p.g),{rowH:50});
      cTitle(c,"Tipo de violencia",M,1030); cBars(c,M,1045,half,DTYPES.map(([l,k])=>({name:l,v:p.t[k]})),{rowH:60});
      cTitle(c,"Pertenencia étnica",x2,1030); cBars(c,x2,1045,half,srt(DP.etnia,p.e),{rowH:60});
      c.fillStyle=PC.muted; font(c,400,17); wrapText(c,"Una atención puede registrar varios tipos de violencia. La matriz 2024 no tiene columnas de lugar, agresor, violencia sexual ni económica.",M,1440,PW-2*M,24);
      pageFooter(c,start+1,total); out.push(cv); }
    return out;
  }
  { const {cv,c}=newPage(); pageHeader(c,"¿Cuándo ocurre?",sub);
    cFactsRow(c,facts(p).slice(0,3).concat([["Casos con hora no confiable (00 y 12)",`${fmt(p.h0)} (${pct(p.h0,p.n)})`]]),330,110);
    cTitle(c,`Casos por mes${S.year==="all"?" (suma "+POL_RANGE+")":""}`,M,500); { const mm=mesesCon(p.m); cBars(c,M,512,half,mm,{rowH:Math.min(56,Math.floor(420/Math.max(1,mm.length))),labelW:230,pk:true}); }
    cTitle(c,"Casos por día de la semana",x2,500); cBars(c,x2,512,half,DIAS.map((n,i)=>({name:n,v:p.d[i]})),{rowH:60,labelW:230,pk:true});
    cTitle(c,"Casos por franja horaria",M,990); cBars(c,M,1010,PW-2*M,franjaNames().map((n,i)=>({name:n,v:franjaVals(p)[i]})),{rowH:90,labelW:520,pk:true});
    c.fillStyle=PC.muted; font(c,400,17); c.fillText("No se cuentan las horas 00 y 12: la matriz casi no registra casos al mediodía y concentra muchos a medianoche (mediodía digitado como 00). Meses: solo los que tienen casos.",M,1400);
    pageFooter(c,start,total); out.push(cv); }
  { const {cv,c}=newPage(); pageHeader(c,"¿A quién afecta y dónde ocurre?",sub);
    const f=facts(p).slice(3), zt=sum(p.z)||1; f.push(["Zona urbana / rural",`${fmt(p.z[0]/zt*100)} % / ${fmt(p.z[1]/zt*100)} %`]);
    cFactsRow(c,f,330);
    cTitle(c,"A quién afecta · curso de vida de la víctima",M,510); let y=cBars(c,M,530,half,CURSO.map((n,i)=>({name:n,v:p.c[i]})),{rowH:46});
    c.fillStyle=PC.muted; font(c,400,17); c.fillText("Cursos de vida según el Ministerio de Salud. Edad 0 o vacía = sin dato.",M,y+20);
    cTitle(c,"Zona del hecho",x2,510); const zw=PW-M-x2; c.fillStyle=palP()[3]; c.fillRect(x2,540,zw*p.z[0]/zt,36); c.fillStyle=palP()[1]; c.fillRect(x2+zw*p.z[0]/zt,540,zw*p.z[1]/zt,36); c.fillStyle="#DDD6E8"; c.fillRect(x2+zw*(p.z[0]+p.z[1])/zt,540,zw*p.z[2]/zt,36);
    c.fillStyle=PC.ink; font(c,500,21); c.fillText(`Urbana ${fmt(p.z[0])}`,x2,612); c.textAlign="right"; c.fillText(`Rural ${fmt(p.z[1])}`,x2+zw,612); c.textAlign="left";
    cTitle(c,"Casos por año",x2,665); const s=seriesFor(scopeCodes()); cBars(c,x2,672,zw,YEARS.map((y,i)=>({name:y+(y===CUR_YEAR?" (en curso)":""),v:s[i]})),{rowH:30,labelW:200});
    cTitle(c,"Dónde ocurre · clase de sitio",M,935); cBars(c,M,950,half,srt(p.sl,p.s),{rowH:54});
    cTitle(c,"Con qué · tipo de arma o medio",x2,935); cBars(c,x2,950,half,srt(p.al,p.a),{rowH:54});
    pageFooter(c,start+1,total); out.push(cv); }
  return out;
}

let PDFPAGES=[], PDFNAME="", PNGNAME="", MAPONLY=false;
async function buildReport(mapOnly){
  MAPONLY=mapOnly; $("#pmStatus").textContent="Preparando…";
  try{ await Promise.all([document.fonts.load('800 40px "Bricolage Grotesque"'),document.fonts.load('400 20px "Public Sans"'),document.fonts.load('600 20px "Public Sans"'),document.fonts.load('500 20px "IBM Plex Mono"')]); }catch(e){}
  const pages=[], hasFicha=!!S.sel, np=2;
  const total=mapOnly?1:(1+np+(hasFicha?1:2));
  pages.push(mapSheet(1,total));
  if(!mapOnly){ pages.push(...perfilPages(2,total)); let n=2+np; if(hasFicha) pages.push(fichaPage(n++,total)); else { pages.push(summaryPage(n++,total)); pages.push(tablePage(n++,total)); } }
  PDFPAGES=pages;
  const slug=(ind().label).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const per=(S.sel?scopeName().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-":"")+(S.year==="all"?(isDupla()?"2024-2026":"2019-2026"):S.year);
  PDFNAME=`${mapOnly?"mapa":"reporte"}-vbg-narino-${slug}-${per}.pdf`; PNGNAME=`mapa-vbg-narino-${slug}-${per}.png`;
  $("#pmKicker").textContent=mapOnly?"Imprimir solo el mapa":"Reporte completo";
  $("#pmTitle").textContent=mapOnly?`Mapa · ${ind().label}`:`Reporte · ${ind().label} (${pages.length} páginas)`;
  $("#pmPages").innerHTML=""; for(const p of pages){ const im=new Image(); im.src=p.toDataURL("image/jpeg",.8); im.alt="Página del reporte"; $("#pmPages").appendChild(im); }
  $("#pmPng").hidden=!mapOnly; $("#pmStatus").textContent=""; openModal("#pdfModal");
}
const toBlob=(cv,type,q)=>new Promise(r=>cv.toBlob(r,type,q));
async function makePdf(){
  if(!window.PDFLib) throw new Error("no se pudo cargar el generador de PDF");
  const doc=await PDFLib.PDFDocument.create(); doc.setTitle(PDFNAME.startsWith("informe-dupla")?"Informe mensual Dupla Violeta":`Geovisor SEGIS · ${ind().label}`); doc.setAuthor("Gobernación de Nariño · Subsecretaría de Gestión Pública"); doc.setCreator("Geovisor SEGIS");
  for(const cv of PDFPAGES){ const b=await toBlob(cv,"image/jpeg",.9); const img=await doc.embedJpg(new Uint8Array(await b.arrayBuffer())); const pg=doc.addPage([841.89,595.28]); pg.drawImage(img,{x:0,y:0,width:841.89,height:595.28}); }
  return new Blob([await doc.save()],{type:"application/pdf"});
}
async function offer(filename,blobPromise){
  const st=$("#pmStatus"); st.textContent="Generando archivo…";
  try{
    const data=await blobPromise; const dl=await getSaver();
    await dl.save({filename,data}); st.textContent="Archivo guardado. Ábralo para imprimir.";
  }catch(e){ const code=e&&e.code; st.textContent=code==="declined"?"Descarga cancelada.":code==="rate_limited"?"Hay otra descarga pendiente; intente en un momento.":"No se pudo generar el archivo: "+(e&&e.message||code||"error"); }
}
$("#btnReportPdf").onclick=()=>buildReport(false);
$("#btnMapPdf").onclick=()=>buildReport(true);
$("#pmPdf").onclick=()=>offer(PDFNAME,makePdf());
$("#pmPng").onclick=()=>offer(PNGNAME,toBlob(PDFPAGES[0],"image/png"));

/* ================= INFORME MENSUAL · DUPLA VIOLETA ================= */
const MES_U=["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const RUTAS=(D.dup.rutas)||["Comisaría de Familia","Fiscalía","Salud","Policía","Defensoría del Pueblo"];
const SRC_LBL={y2024:"Matriz Dupla Violeta 2024",y2025:"Matriz de atención marzo-abril 2025",jun2026_junio:"Reporte geovisor junio 2026",julago2026_julio:"Matriz de atención julio 2026",julago2026_agosto:"Matriz de atención agosto 2026",sep2026_septiembre:"Matriz de atención septiembre 2026"};
function monthsAvail(){ const s=new Map(); for(const r of D.dup.r) if(r[2]>0){ const k=r[1]*100+r[2]; s.set(k,(s.get(k)||0)+1); } return [...s.entries()].sort((a,b)=>b[0]-a[0]).map(([k,n])=>({y:Math.floor(k/100),m:k%100,n})); }
function monthStats(y,m,code){
  const R=D.dup.r.filter(r=>r[1]===y&&r[2]===m&&(!code||(r[0]>=0&&MUN[r[0]].code===code)));
  const o={y,m,n:R.length,R,t:{psico:0,fisica:0,sexual:0,eco:0,intento:0,femi:0},c:Array(7).fill(0),d:Array(7).fill(0),dk:0,l:Array(D.dup.lugar.length).fill(0),g:Array(D.dup.agresor.length).fill(0),e:Array(D.dup.etnia.length).fill(0),pb:Array(5).fill(0),
    mun:{},sinMun:0,rut:Array(5).fill(0),rutAny:0,rutOK:0,src:new Set()};
  for(const r of R){ const b=r[5]; o.t.psico+=b&1?1:0; o.t.fisica+=b&2?1:0; o.t.sexual+=b&4?1:0; o.t.eco+=b&8?1:0; o.t.intento+=b&16?1:0; o.t.femi+=b&32?1:0;
    o.c[r[4]]++; if(r[3]>=0){ o.d[r[3]]++; o.dk++; } o.l[r[6]]++; o.g[r[7]]++; o.e[r[8]]++; for(let i=0;i<5;i++) if(r[9]&(1<<i)) o.pb[i]++;
    o.src.add(D.dup.src[r[11]]);
    if(r[0]<0) o.sinMun++; else { const c=MUN[r[0]].code, x=o.mun[c]||(o.mun[c]={code:c,name:MUN[r[0]].name,sub:MUN[r[0]].sub,n:0,t:[0,0,0,0,0,0],rut:[0,0,0,0,0]}); x.n++; for(let i=0;i<6;i++) if(b&(1<<i)) x.t[i]++; if(r[12]>0) for(let i=0;i<5;i++) if(r[12]&(1<<i)) x.rut[i]++; }
    if(r[12]>=0){ o.rutOK++; if(r[12]>0) o.rutAny++; for(let i=0;i<5;i++) if(r[12]&(1<<i)) o.rut[i]++; } }
  o.noSE=R.length>0&&R.every(r=>D.dup.src[r[11]]==="y2024");
  o.munL=Object.values(o.mun).sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name,"es"));
  const subs={}; for(const x of o.munL) subs[x.sub]=(subs[x.sub]||0)+x.n; o.subL=Object.entries(subs).map(([name,v])=>({name,v})).sort((a,b)=>b.v-a.v);
  return o;
}
const TIPOS=[["Psicológica","psico"],["Física","fisica"],["Sexual","sexual"],["Económica o patrimonial","eco"],["Intento de feminicidio","intento"],["Feminicidio","femi"]];
function monthReading(o,prev,scope){
  const out=[], top=o.munL[0], tt=TIPOS.map(([l,k])=>({l,v:o.t[k]})).sort((a,b)=>b.v-a.v);
  if(prev&&prev.n){ const dd=o.n-prev.n; out.push(`Se registraron ${o.n} atenciones, ${dd===0?"igual número que":dd>0?`${dd} más que`:`${-dd} menos que`} en ${MESES_L[prev.m-1]} de ${prev.y} (${prev.n}).`); }
  else out.push(`Se registraron ${o.n} ${o.n===1?"atención":"atenciones"}${scope?" en "+scope:""} en el mes.`);
  if(!scope&&top) out.push(`${top.name} concentra ${top.n} ${top.n===1?"atención":"atenciones"} (${pct(top.n,o.n)}); hubo atenciones en ${o.munL.length} de los 64 municipios.`);
  if(tt[0].v) out.push(`La violencia ${tt[0].l.toLowerCase()} estuvo presente en ${tt[0].v} atenciones (${pct(tt[0].v,o.n)})${tt[1]&&tt[1].v?`, seguida de la ${tt[1].l.toLowerCase()} (${tt[1].v})`:""}. Una atención puede registrar varios tipos.`);
  if(o.t.intento||o.t.femi) out.push(`Alerta: ${o.t.intento?`${o.t.intento} ${o.t.intento===1?"atención registra":"atenciones registran"} intento de feminicidio`:""}${o.t.intento&&o.t.femi?" y ":""}${o.t.femi?`${o.t.femi} feminicidio${o.t.femi>1?"s":""}`:""}.`);
  const gi=srt(D.dup.agresor,o.g).filter(x=>x.id<D.dup.agresor.length-2&&x.v>0); if(gi[0]) out.push(`Persona agresora más frecuente: ${gi[0].name.toLowerCase()} (${gi[0].v} ${gi[0].v===1?"caso":"casos"}).`);
  if(o.rutOK){ const ri=o.rut.map((v,i)=>({v,n:RUTAS[i]})).sort((a,b)=>b.v-a.v); out.push(`${o.rutAny} de ${o.rutOK} atenciones (${pct(o.rutAny,o.rutOK)}) activaron al menos una ruta; la más usada fue ${ri[0].n} (${ri[0].v}).`); }
  return out;
}
function duplaHeader(c,title,sub){
  const l1=$("#logo1"), l2=$("#logo2"), l3=$("#logo3"), h=96; let x=M;
  const w1=l1.naturalWidth*h/l1.naturalHeight; c.drawImage(l1,x,46,w1,h); x+=w1+40; c.fillStyle=PC.line; c.fillRect(x-20,56,2,h-20);
  const w2=l2.naturalWidth*h/l2.naturalHeight; c.drawImage(l2,x,46,w2,h);
  const h3=110, w3=l3.naturalWidth*h3/l3.naturalHeight; c.save(); const rx=PW-M-w3; c.beginPath(); c.roundRect?c.roundRect(rx,40,w3,h3,14):c.rect(rx,40,w3,h3); c.clip(); c.drawImage(l3,rx,40,w3,h3); c.restore();
  c.fillStyle=PC.violet; c.fillRect(M,168,PW-2*M,6); c.fillStyle=PC.magenta; c.fillRect(M,168,220,6);
  c.fillStyle=PC.ink; font(c,800,58,F.d); c.fillText(title,M,250);
  c.fillStyle=PC.muted; font(c,400,28); c.fillText(sub,M,296);
}
function duplaFooter(c,n,total,srcTxt){
  c.fillStyle=PC.line; c.fillRect(M,PH-92,PW-2*M,2); c.fillStyle=PC.muted; font(c,400,19);
  c.fillText(`Fuente: ${srcTxt}. Dupla Violeta · Secretaría de Equidad de Género e Inclusión Social · Gobernación de Nariño. Datos agregados, sin información que identifique a las personas.`,M,PH-58);
  c.fillText("Ruta de atención Dupla Violeta 24/7 · Psicológica 317 820 3923 · Jurídica 300 747 3482 · duplavioleta@narino.gov.co · Carrera 23 # 18-67, Ed. Versalles, 3er piso, Pasto",M,PH-30);
  c.textAlign="right"; font(c,600,19); c.fillText(`Página ${n} de ${total}`,PW-M,PH-30); c.textAlign="left";
}
function kpiRow(c,list,y,h=150){
  const n=list.length, gap=26, bw=(PW-2*M-gap*(n-1))/n;
  list.forEach(([v,l,s],i)=>{ const x=M+i*(bw+gap); c.fillStyle=i?PC.sunk:PC.violet; c.fillRect(x,y,bw,h);
    c.fillStyle=i?PC.ink:"#FFFFFF"; const numv=/^[\d—]/.test(v); font(c,700,v.length>14?34:numv?50:44,numv?F.m:F.d); wrapText(c,v,x+26,y+(v.length>14?58:66),bw-52,38,2);
    c.fillStyle=i?PC.muted:"#E9E2F7"; font(c,400,20); wrapText(c,l,x+26,y+h-(s?50:28),bw-52,24,2); if(s){ font(c,600,18); c.fillStyle=i?PC.magenta:"#FFD5E2"; c.fillText(s,x+26,y+h-18); } });
}
function monthMap(c,rect,o,code){
  const codes=code?[code]:MUN.map(m=>m.code), b=boundsOf(codes), pad=code?.35:.04;
  const asp=rect.w/rect.h; let vw=(b[2]-b[0])*(1+2*pad), vh=(b[3]-b[1])*(1+2*pad); if(vw/vh<asp) vw=vh*asp; else vh=vw/asp;
  const view={x:(b[0]+b[2])/2-vw/2,y:(b[1]+b[3])/2-vh/2,w:vw,h:vh}, k=Math.min(rect.w/view.w,rect.h/view.h), ox=rect.x+(rect.w-view.w*k)/2-view.x*k, oy=rect.y+(rect.h-view.h*k)/2-view.y*k;
  const P=(lon,lat)=>[ox+X(lon)*k,oy+Y(lat)*k];
  const trace=g=>{ c.beginPath(); for(const Pl of g) for(const r of Pl){ r.forEach((p,i)=>{ const [a,bb]=P(p[0],p[1]); i?c.lineTo(a,bb):c.moveTo(a,bb); }); c.closePath(); } };
  c.save(); c.beginPath(); c.rect(rect.x,rect.y,rect.w,rect.h); c.clip(); c.fillStyle=PC.sea; c.fillRect(rect.x,rect.y,rect.w,rect.h);
  for(const g of D.ctx){ trace(g.g); c.fillStyle=PC.ctx; c.fill("evenodd"); c.strokeStyle="#CFC8DA"; c.lineWidth=1.5; c.stroke(); }
  const vals=MUN.map(m=>(o.mun[m.code]||{}).n||0), B2=breaks(vals);
  for(const [i,m] of MUN.entries()){ trace(m.g); c.fillStyle=colorPrint(classOf(vals[i],B2),B2.length); c.fill("evenodd"); c.strokeStyle="#FFFFFF"; c.lineWidth=1.4; c.stroke(); }
  c.strokeStyle=PC.ink; c.lineWidth=3; c.lineJoin="round"; for(const l of D.deptline){ c.beginPath(); l.forEach((p,i)=>{ const [a,bb]=P(p[0],p[1]); i?c.lineTo(a,bb):c.moveTo(a,bb); }); c.stroke(); }
  if(code){ trace(BY[code].g); c.strokeStyle=PC.magenta; c.lineWidth=4.5; c.stroke(); }
  c.textAlign="center"; c.textBaseline="middle"; c.lineJoin="round";
  { const boxes=[], order=MUN.map((m,i)=>i).filter(i=>code?MUN[i].code===code:vals[i]>0).sort((a,b)=>vals[b]-vals[a]);
    for(const i of order){ const m=MUN[i], [a,bb]=P(m.c[0],m.c[1]), s=`${m.name} · ${vals[i]}`; font(c,700,code?30:17); const w=c.measureText(s).width, h=code?34:21;
      for(const [dx,dy] of [[0,0],[0,-h],[0,h],[w/2+10,0],[-w/2-10,0],[0,-2*h],[0,2*h]]){ const q=[a+dx-w/2-3,bb+dy-h/2,a+dx+w/2+3,bb+dy+h/2]; if(boxes.some(z=>q[0]<z[2]&&q[2]>z[0]&&q[1]<z[3]&&q[3]>z[1])) continue; boxes.push(q);
        if(dx||dy){ c.strokeStyle="rgba(32,25,46,.5)"; c.lineWidth=1.2; c.beginPath(); c.moveTo(a,bb); c.lineTo(a+dx*(1-(w/2)/Math.max(1,Math.abs(dx))),bb+dy*(1-(h/2)/Math.max(1,Math.abs(dy)))); c.stroke(); c.fillStyle=PC.ink; c.beginPath(); c.arc(a,bb,3,0,7); c.fill(); }
        c.strokeStyle="rgba(255,255,255,.92)"; c.lineWidth=5; c.strokeText(s,a+dx,bb+dy); c.fillStyle=PC.ink; c.fillText(s,a+dx,bb+dy); break; } } }
  c.textAlign="left"; c.textBaseline="alphabetic"; c.restore(); c.strokeStyle=PC.ink; c.lineWidth=2; c.strokeRect(rect.x,rect.y,rect.w,rect.h);
  // leyenda
  let lx=rect.x, ly=rect.y+rect.h+40; font(c,600,18); c.fillStyle=PC.muted; c.fillText("Atenciones por municipio:",lx,ly); lx+=250;
  B2.forEach((r,i)=>{ c.fillStyle=colorPrint(i,B2.length); c.fillRect(lx,ly-18,30,22); c.fillStyle=PC.ink; font(c,500,18,F.m); const t=r[0]===r[1]?fmt(r[0]):`${fmt(r[0])}–${fmt(r[1])}`; c.fillText(t,lx+38,ly); lx+=38+c.measureText(t).width+26; });
  c.fillStyle=colorPrint(-1,1); c.fillRect(lx,ly-18,30,22); c.fillStyle=PC.ink; font(c,400,18); c.fillText("Sin atenciones",lx+38,ly);
}
function monthlyPages(y,m,code){ const _pk=PALK; PALK="dupla"; try{ return monthlyPagesInner(y,m,code); } finally{ PALK=_pk; } }
function monthlyPagesInner(y,m,code){
  const o=monthStats(y,m,code), prevM=monthsAvail().find(a=>a.y*100+a.m<y*100+m), prev=prevM?monthStats(prevM.y,prevM.m,code):null;
  const scope=code?BY[code].name:"", mesTxt=`${MES_L_CAP[m-1]} de ${y}`, sub=`${code?scope+" · ":"Departamento de Nariño · "}Atenciones de la Dupla Violeta · ${mesTxt}`;
  const srcTxt=[...o.src].map(s=>SRC_LBL[s]||(String(s).startsWith("carga:")?"Matriz estandarizada "+String(s).slice(6):s)).join(", ")||"Matriz de atención Dupla Violeta";
  const half=(PW-2*M-110)/2, x2=M+half+110, total=3, pages=[];
  const tt=TIPOS.filter(([,k])=>!(o.noSE&&(k==="sexual"||k==="eco"))).map(([l,k])=>({name:l,v:o.t[k]}));
  const topT=tt.slice().sort((a,b)=>b.v-a.v)[0];
  // ---- página 1
  { const {cv,c}=newPage(); duplaHeader(c,`Informe mensual · ${mesTxt}`,sub);
    const dd=prev&&prev.n?o.n-prev.n:null;
    kpiRow(c,[[fmt(o.n),`atenciones${code?" en "+scope:" en el departamento"}`,dd==null?"":`${dd>0?"▲ +"+dd:dd<0?"▼ "+dd:"= igual"} frente a ${MESES_L[prev.m-1]} ${prev.y}`],
      code?[fmt(o.n?o.R.filter(r=>r[3]>=0).length:0),"atenciones con fecha exacta",""]:[`${o.munL.length} / 64`,"municipios con atenciones",o.sinMun?`${o.sinMun} sin municipio identificable`:""],
      [topT&&topT.v?topT.name:"—",topT&&topT.v?`violencia más frecuente · ${topT.v} atenciones (${pct(topT.v,o.n)})`:"violencia más frecuente",""],
      o.rutOK?[`${o.rutAny} (${pct(o.rutAny,o.rutOK)})`,"atenciones con al menos una ruta activada",""]:["—","la matriz de este mes no registra remisiones",""]],330);
    monthMap(c,{x:M,y:530,w:half+60,h:860},o,code);
    let yy=545; cTitle(c,"Tipo de violencia",x2+60,yy); yy=cBars(c,x2+60,yy+14,PW-M-x2-60,tt,{rowH:44,labelW:330,pk:true})+30;
    if(o.noSE){ c.fillStyle=PC.muted; font(c,400,17); c.fillText("La matriz 2024 no registra violencia sexual ni económica.",x2+60,yy-12); yy+=14; }
    cTitle(c,"Lectura del mes",x2+60,yy); yy+=34;
    for(const s of monthReading(o,prev,scope)){ c.fillStyle=PC.magenta; c.fillRect(x2+60,yy-14,8,8); c.fillStyle=PC.ink; font(c,400,21); yy=wrapText(c,s,x2+84,yy,PW-M-x2-84,28)+10; if(yy>PH-140) break; }
    { const hist=monthsAvail().filter(a=>a.y*100+a.m<=y*100+m).slice(0,6).reverse().map(a=>({name:`${MES_L_CAP[a.m-1]} ${a.y}`,v:code?monthStats(a.y,a.m,code).n:a.n,cur:a.y===y&&a.m===m}));
      const room=PH-170-(yy+30); if(hist.length>1&&room>120){ cTitle(c,"Atenciones en los meses con matriz (más recientes)",x2+60,yy+30); const rh=Math.min(40,Math.floor((room-30)/hist.length));
        const mx=Math.max(1,...hist.map(h=>h.v)); let hy=yy+46; for(const h of hist){ c.fillStyle=PC.ink; font(c,h.cur?700:400,Math.min(20,rh*.6)); c.fillText(h.name,x2+60,hy+rh*.65); const bx=x2+60+260, bw=PW-M-bx-90; c.fillStyle=PC.sunk; c.fillRect(bx,hy+rh*.25,bw,rh*.5); c.fillStyle=h.cur?PC.magenta:"#6A42AE"; c.fillRect(bx,hy+rh*.25,bw*h.v/mx,rh*.5); font(c,h.cur?700:500,Math.min(19,rh*.55),F.m); c.fillStyle=PC.ink; c.textAlign="right"; c.fillText(fmt(h.v),PW-M,hy+rh*.65); c.textAlign="left"; hy+=rh; } } }
    duplaFooter(c,1,total,srcTxt); pages.push(cv); }
  // ---- página 2
  { const {cv,c}=newPage(); duplaHeader(c,"¿A quién se atendió y qué ocurrió?",sub);
    let yl=360, yr=360; const blk=(col,title,items,o2={})=>{ const x=col?x2:M; let y0=col?yr:yl; cTitle(c,title,x,y0); let ye;
        if(items.length) ye=cBars(c,x,y0+14,half,items,{rowH:40,labelW:380,...o2}); else { c.fillStyle=PC.muted; font(c,400,19); c.fillText("Sin registros en este mes.",x,y0+46); ye=y0+60; }
        if(col) yr=ye+46; else yl=ye+46; };
    blk(0,"Curso de vida",CURSO.map((n,i)=>({name:n,v:o.c[i]})),{pk:true});
    blk(0,"Lugar de los hechos",srt(D.dup.lugar,o.l).filter(x=>x.v>0),{maxRows:9});
    if(o.dk) blk(0,"Día de la semana de la atención",DIAS.map((n,i)=>({name:n,v:o.d[i]})),{pk:true,rowH:34}); 
    blk(1,"Relación de la persona agresora",srt(D.dup.agresor,o.g).filter(x=>x.v>0),{maxRows:9});
    blk(1,"Pertenencia étnica",srt(D.dup.etnia,o.e).filter(x=>x.v>0));
    blk(1,"Grupos poblacionales",POBL.map((n,i)=>({name:n,v:o.pb[i]})),{rowH:36});
    duplaFooter(c,2,total,srcTxt); pages.push(cv); }
  // ---- página 3
  { const {cv,c}=newPage(); duplaHeader(c,"Rutas activadas y municipios",sub);
    if(o.rutOK){ cTitle(c,"Remisiones a la ruta de atención (una atención puede activar varias)",M,360);
      cBars(c,M,375,half,RUTAS.map((n,i)=>({name:`${n} (${pct(o.rut[i],o.rutOK)})`,v:o.rut[i]})),{rowH:52,labelW:420,pk:true});
      c.fillStyle=PC.muted; font(c,400,19); wrapText(c,`${o.rutOK-o.rutAny} ${o.rutOK-o.rutAny===1?"atención no registra":"atenciones no registran"} remisión a ninguna entidad. Porcentajes sobre ${o.rutOK} atenciones con información de remisión.`,M,700,half,26); }
    else { cTitle(c,"Remisiones a la ruta de atención",M,360); c.fillStyle=PC.muted; font(c,400,21); wrapText(c,"La matriz de este mes no tiene columnas de remisión (Comisaría, Fiscalía, Salud, Policía, Defensoría).",M,410,half,30); }
    cTitle(c,code?"Subregión":"Atenciones por subregión",x2,360); if(!code) cBars(c,x2,375,half,o.subL,{rowH:44,labelW:300,pk:true});
    // tabla municipal
    const cols=[["Municipio",0],["Atenc.",1],["Psico.",1],["Física",1],["Sexual",1],["Econ.",1],["Comis.",1],["Fisc.",1],["Salud",1],["Policía",1],["Defens.",1]];
    const tx=M, tw=PW-2*M, cw0=520, cw=(tw-cw0)/(cols.length-1); let ty=800; cTitle(c,"Atenciones por municipio",tx,ty); ty+=30;
    c.fillStyle=PC.violet; c.fillRect(tx,ty,tw,40); c.fillStyle="#FFFFFF"; font(c,700,18); cols.forEach(([h],i)=>{ const x=i?tx+cw0+(i-1)*cw+cw-12:tx+14; c.textAlign=i?"right":"left"; c.fillText(h,x,ty+27); }); c.textAlign="left"; ty+=40;
    const rows=o.munL, rh=Math.max(26,Math.min(38,Math.floor((PH-200-ty)/Math.max(1,rows.length+1)))), maxR=Math.floor((PH-200-ty)/rh)-1;
    rows.slice(0,maxR).forEach((x,ri)=>{ if(ri%2===0){ c.fillStyle=PC.sunk; c.fillRect(tx,ty,tw,rh); } const v=[x.name,x.n,x.t[0],x.t[1],...(o.noSE?["—","—"]:x.t.slice(2,4)),...(o.rutOK?x.rut:["—","—","—","—","—"])];
      v.forEach((val,i)=>{ c.fillStyle=PC.ink; font(c,i?500:500,Math.min(19,rh*.55),i?F.m:F.b); c.textAlign=i?"right":"left"; c.fillText(i?(val===0?"·":String(val)):String(val),i?tx+cw0+(i-1)*cw+cw-12:tx+14,ty+rh*.7); }); c.textAlign="left"; ty+=rh; });
    c.fillStyle=PC.ink; c.fillRect(tx,ty,tw,2); ty+=rh*.8; font(c,700,19); c.fillText(`Total${o.sinMun?` (incluye ${o.sinMun} sin municipio)`:""}`,tx+14,ty);
    const T=[o.n,o.t.psico,o.t.fisica,...(o.noSE?["—","—"]:[o.t.sexual,o.t.eco]),...(o.rutOK?o.rut:["—","—","—","—","—"])]; T.forEach((v,i)=>{ font(c,700,19,F.m); c.textAlign="right"; c.fillText(String(v),tx+cw0+i*cw+cw-12,ty); }); c.textAlign="left";
    if(rows.length>maxR){ c.fillStyle=PC.muted; font(c,400,17); c.fillText(`Se muestran ${maxR} de ${rows.length} municipios.`,tx,ty+30); }
    duplaFooter(c,3,total,srcTxt); pages.push(cv); }
  return {pages,o};
}
const MES_L_CAP=MESES_L.map(s=>s.charAt(0).toUpperCase()+s.slice(1));
function openMonthly(){
  const sel=$("#mmMonth"), av=monthsAvail(); sel.innerHTML=av.map(a=>`<option value="${a.y}-${a.m}">${MES_L_CAP[a.m-1]} ${a.y} · ${a.n} atenciones</option>`).join("");
  const sc=$("#mmScope"); sc.innerHTML=`<option value="">Todo el departamento</option>`+MUN.slice().sort((a,b)=>a.name.localeCompare(b.name,"es")).map(m=>`<option value="${m.code}">${esc(m.name)}</option>`).join("");
  if(S.sel&&BY[S.sel]) sc.value=S.sel; openModal("#monthModal");
}
async function buildMonthly(){
  const [y,m]=$("#mmMonth").value.split("-").map(Number), code=$("#mmScope").value||null;
  try{ await Promise.all([document.fonts.load('800 40px "Bricolage Grotesque"'),document.fonts.load('400 20px "Public Sans"'),document.fonts.load('500 20px "IBM Plex Mono"')]); }catch(e){}
  const {pages,o}=monthlyPages(y,m,code);
  if(!o.n){ $("#mmStatus").textContent="No hay atenciones para ese municipio en el mes elegido."; return; }
  $("#monthModal").hidden=true; MAPONLY=false; PDFPAGES=pages;
  const slug=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-");
  PDFNAME=`informe-dupla-violeta-${slug(MESES_L[m-1])}-${y}${code?"-"+slug(BY[code].name):""}.pdf`;
  $("#pmKicker").textContent="Informe mensual · Dupla Violeta"; $("#pmTitle").textContent=`${MES_L_CAP[m-1]} de ${y}${code?" · "+BY[code].name:""} (${pages.length} páginas)`;
  $("#pmPages").innerHTML=""; for(const p of pages){ const im=new Image(); im.src=p.toDataURL("image/jpeg",.8); im.alt="Página del informe"; $("#pmPages").appendChild(im); }
  $("#pmPng").hidden=true; $("#pmStatus").textContent=""; openModal("#pdfModal");
}
$("#btnMonthly").onclick=openMonthly; $("#mmGo").onclick=()=>{ $("#mmStatus").textContent=""; buildMonthly(); };

/* ================= CARGA DE LA MATRIZ ESTANDARIZADA (Dupla Violeta) ================= */
const nrm=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const MUN_BY_NAME=Object.fromEntries(MUN.map((m,i)=>[nrm(m.name),i])); MUN_BY_NAME["tumaco"]=MUN.findIndex(m=>m.code==="52835");
const MUN_BY_CODE=Object.fromEntries(MUN.map((m,i)=>[m.code,i]));
const yes=v=>/^(si|s|x|1|true)$/.test(nrm(v));
const ALIAS={"hogar o vivienda":"vivienda","hotel bar o discoteca":"bar discoteca u hotel","lugar de trabajo o institucion":"lugar de trabajo","zona rural":"zona rural finca o campo","familiar":"otro familiar","conocido":"conocido o vecino"};
function idxOf(list,v,fallback){ let k=nrm(v); if(ALIAS[k]&&!list.some(x=>nrm(x)===k)) k=ALIAS[k]; if(!k) return fallback; let i=list.findIndex(x=>nrm(x)===k); if(i<0&&/^(no refiere|no reporta|sin dato)$/.test(k)) i=list.findIndex(x=>nrm(x)==="no registra"); return i<0?fallback:i; }
function toDate(v){ if(v instanceof Date&&!isNaN(v)) return v; if(typeof v==="number"){ const d=new Date(Math.round((v-25569)*864e5)); return isNaN(d)?null:new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()); }
  const m=String(v||"").trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); if(m) return new Date(+m[3],+m[2]-1,+m[1]);
  const m2=String(v||"").trim().match(/^(\d{4})-(\d{2})-(\d{2})/); if(m2) return new Date(+m2[1],+m2[2]-1,+m2[3]); return null; }
const cursoOf=e=>e===""||e==null||isNaN(+e)?6:(+e<=5?0:+e<=11?1:+e<=17?2:+e<=28?3:+e<=59?4:5);
function parseMatrix(rows,fileName){
  // rows: array of objects keyed by header
  const recs=[], errs=[], warns=[]; let srcI=D.dup.src.indexOf("carga:"+fileName); if(srcI<0){ D.dup.src.push("carga:"+fileName); srcI=D.dup.src.length-1; }
  const L=D.dup.lugar, A=D.dup.agresor, E=D.dup.etnia, NR=x=>x.length-1;
  const fm=String(fileName).match(/(20\d{2})[_\-. ]?(0?[1-9]|1[0-2])(?!\d)/), fileYM=fm?[+fm[1],+fm[2]]:null;
  rows.forEach((o0,i)=>{ const o={}; for(const k in o0) o[nrm(k).replace(/ /g,"_")]=o0[k];
    const fila=i+2; const g=k=>o[k]??"";
    const hasData=Object.keys(o).some(k=>!["validacion","codigo_dane","subregion","codigo_caso","anio"].includes(k)&&String(o[k]??"").trim()!=="");
    if(!hasData) return;
    const fecha=toDate(g("fecha_atencion")); const code=String(g("codigo_dane")).trim();
    let mi=MUN_BY_CODE[code]; if(mi==null) mi=MUN_BY_NAME[nrm(g("municipio"))];
    let y0,m0,dow=-1;
    if(fecha){ y0=fecha.getFullYear(); m0=fecha.getMonth()+1; dow=(fecha.getDay()+6)%7; }
    else if(fileYM){ [y0,m0]=fileYM; warns.push(`Fila ${fila}: sin fecha de atención; se asigna a ${MESES_L[m0-1]} de ${y0} por el nombre del archivo`); }
    else { errs.push(`Fila ${fila}: fecha de atención vacía o no válida (o nombre el archivo MATRIZ_DUPLA_AAAA_MM)`); return; }
    if(mi==null){ errs.push(`Fila ${fila}: municipio «${g("municipio")}» no reconocido`); return; }
    const bits=(yes(g("v_psicologica"))?1:0)|(yes(g("v_fisica"))?2:0)|(yes(g("v_sexual"))?4:0)|(yes(g("v_economica"))?8:0)|(yes(g("intento_feminicidio"))?16:0)|(yes(g("feminicidio"))?32:0);
    if(!(bits&15)) warns.push(`Fila ${fila}: no tiene ningún tipo de violencia marcado`);
    const og=nrm(g("orientacion_sexual")), gen=nrm(g("identidad_genero"));
    const lgbt=/lesbiana|gay|homosexual|bisexual|otra/.test(og)||/trans|no binaria/.test(gen);
    const pb=(yes(g("victima_conflicto"))?1:0)|(yes(g("lideresa"))?2:0)|(yes(g("migrante"))?4:0)|(yes(g("discapacidad"))?8:0)|(lgbt?16:0);
    const rut=(yes(g("rem_comisaria"))?1:0)|(yes(g("rem_fiscalia"))?2:0)|(yes(g("rem_salud"))?4:0)|(yes(g("rem_policia"))?8:0)|(yes(g("rem_defensoria"))?16:0);
    let corr=-1; if(MUN[mi].code==="52001"){ for(const col of ["corregimiento","vereda","barrio_vereda_corregimiento"]){ const k=nrm(g(col)); if(k){ corr=D.dup.corr.findIndex(c=>nrm(c)===k); if(corr>=0) break; } } }
    const edad=g("edad"); if(edad!==""&&(+edad<0||+edad>110)) warns.push(`Fila ${fila}: edad fuera de rango`);
    recs.push([mi,y0,m0,dow,cursoOf(edad),bits,idxOf(L,g("lugar_hechos"),NR(L)),idxOf(A,g("agresor"),NR(A)),idxOf(E,g("etnia"),NR(E)),pb,corr,srcI,rut]);
  });
  return {recs,errs,warns};
}
const mesesTxt=ms=>{ const out=[]; let i=0; while(i<ms.length){ let j=i; while(j+1<ms.length&&ms[j+1]===ms[j]+1) j++; out.push(j-i>=2?`${MESES_L[ms[i]-1]} a ${MESES_L[ms[j]-1]}`:ms.slice(i,j+1).map(m=>MESES_L[m-1]).join(", ")); i=j+1; } return out.join(", "); };
let CARGAS=[]; const BASE_R=D.dup.r.slice();
function applyCargas(){
  let r=BASE_R.slice();
  for(const c of CARGAS){ const ms=new Set(c.recs.map(x=>x[1]*100+x[2])); r=r.filter(x=>!(x[2]>0&&ms.has(x[1]*100+x[2]))).concat(c.recs.map(x=>{ const y=x.slice(); let si=D.dup.src.indexOf("carga:"+c.name); if(si<0){ D.dup.src.push("carga:"+c.name); si=D.dup.src.length-1; } y[11]=si; return y; })); }
  D.dup.r=r;
  for(const x of r){ const y=String(x[1]); if(!DUP_YEARS.includes(y)) DUP_YEARS.push(y); if(x[2]>0){ (DUP_COV[y]=DUP_COV[y]||[]); if(!DUP_COV[y].includes(x[2])) DUP_COV[y].push(x[2]); } }
  DUP_YEARS.sort();
  for(const y of DUP_YEARS){ const ms=(DUP_COV[y]||[]).slice().sort((a,b)=>a-b); if(!D.dup.cobertura[y]||CARGAS.length) D.dup.cobertura[y]=(ms.length?mesesTxt(ms):"sin mes")+(ms.length&&r.some(x=>String(x[1])===y&&!(x[2]>0))?", más atenciones sin mes":""); }
  try{ localStorage.setItem("segis-dupla-cargas",JSON.stringify(CARGAS)); }catch(e){}
}
function loadSaved(){ try{ const s=JSON.parse(localStorage.getItem("segis-dupla-cargas")||"[]"); if(Array.isArray(s)&&s.length){ CARGAS=s; applyCargas(); } }catch(e){} }
/* lector .xlsx propio (sin librerías externas): lee la hoja y devuelve filas como objetos por encabezado */
async function readXlsx(buf){
  const z=await unzip(buf), dec=new TextDecoder(), P=new DOMParser();
  const xml=async n=>{ const k=z.names.find(x=>x.toLowerCase()===n.toLowerCase()); return k?P.parseFromString(dec.decode(await z.get(k)),"application/xml"):null; };
  const tags=(d,t)=>[...d.getElementsByTagNameNS("*",t)];
  const wbx=await xml("xl/workbook.xml"), rel=await xml("xl/_rels/workbook.xml.rels");
  if(!wbx) throw new Error("no es un archivo de Excel (.xlsx)");
  const rels={}; if(rel) for(const r of tags(rel,"Relationship")) rels[r.getAttribute("Id")]=r.getAttribute("Target");
  const sheets=tags(wbx,"sheet").map(s=>({name:s.getAttribute("name"),target:rels[s.getAttribute("r:id")||s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id")]}));
  const ssd=await xml("xl/sharedStrings.xml"); const ss=ssd?tags(ssd,"si").map(si=>tags(si,"t").map(t=>t.textContent).join("")):[];
  const colIdx=ref=>{ const m=ref.match(/^[A-Z]+/)[0]; let n=0; for(const ch of m) n=n*26+ch.charCodeAt(0)-64; return n-1; };
  async function rowsOf(sh){
    const path=("xl/"+String(sh.target||"").replace(/^\/?xl\//,"").replace(/^\//,"")).replace("xl/../","");
    const d=await xml(path); if(!d) return [];
    const grid=[];
    for(const r of tags(d,"row")){ const ri=+r.getAttribute("r")-1, row=[];
      for(const c of tags(r,"c")){ const t=c.getAttribute("t"), v=tags(c,"v")[0]; let val="";
        if(t==="s") val=v?ss[+v.textContent]??"":""; else if(t==="inlineStr") val=tags(c,"t").map(x=>x.textContent).join(""); else if(t==="b") val=v&&v.textContent==="1"; else if(t==="str"||t==="e") val=v?v.textContent:""; else val=v?(isNaN(+v.textContent)?v.textContent:+v.textContent):"";
        row[colIdx(c.getAttribute("r"))]=val; }
      grid[ri]=row; }
    const hdr=(grid[0]||[]).map(h=>String(h??"").trim()), out=[];
    for(let i=1;i<grid.length;i++){ const g=grid[i]||[], o={}; hdr.forEach((h,j)=>{ if(h) o[h]=g[j]??""; }); out.push(o); }
    return out;
  }
  return {sheets,rowsOf};
}
async function readMatrixFile(file){
  const st=$("#dpStatus"); st.innerHTML="Leyendo el archivo…";
  try{ const X=await readXlsx(await file.arrayBuffer());
    const sh=X.sheets.find(s=>nrm(s.name)==="matriz")||X.sheets[0];
    const rows=await X.rowsOf(sh);
    if(!rows.length||!("FECHA_ATENCION" in rows[0]||Object.keys(rows[0]).some(k=>nrm(k)==="fecha atencion"))){ st.innerHTML=`<b>El archivo no tiene el formato de la matriz estandarizada.</b> Descargue la plantilla y copie los datos en la hoja MATRIZ.`; return; }
    const {recs,errs,warns}=parseMatrix(rows,file.name);
    if(!recs.length){ st.innerHTML=`<b>No se cargó ninguna atención.</b>`+(errs.length?`<ul>${errs.slice(0,8).map(e=>`<li>${esc(e)}</li>`).join("")}</ul>`:""); return; }
    const months=[...new Set(recs.map(x=>x[1]*100+x[2]))].sort(), rep=months.filter(k=>BASE_R.some(x=>x[1]*100+x[2]===k)||CARGAS.some(c=>c.recs.some(x=>x[1]*100+x[2]===k)));
    CARGAS=CARGAS.filter(c=>!c.recs.some(x=>months.includes(x[1]*100+x[2])));
    CARGAS.push({name:file.name,at:new Date().toISOString(),recs}); applyCargas(); render(); renderDuplaPanel();
    const mt=months.map(k=>`${MES_L_CAP[k%100-1]} ${Math.floor(k/100)}`).join(", ");
    st.innerHTML=`<b>Se cargaron ${recs.length} atenciones (${mt}).</b>${rep.length?` Reemplazan los datos que el geovisor ya tenía para ${rep.map(k=>`${MESES_L[k%100-1]} ${Math.floor(k/100)}`).join(", ")}.`:""} Los mapas y gráficas ya incluyen estos datos.`+
      (errs.length?`<p class="warn">${errs.length} ${errs.length===1?"fila no se cargó":"filas no se cargaron"}:</p><ul>${errs.slice(0,8).map(e=>`<li>${esc(e)}</li>`).join("")}${errs.length>8?`<li>y ${errs.length-8} más</li>`:""}</ul>`:"")+
      (warns.length?`<p class="warn">${warns.length} ${warns.length===1?"advertencia":"advertencias"} (se cargaron, pero conviene corregir la matriz):</p><ul>${warns.slice(0,6).map(e=>`<li>${esc(e)}</li>`).join("")}${warns.length>6?`<li>y ${warns.length-6} más</li>`:""}</ul>`:"");
  }catch(e){ st.innerHTML=`<b>No se pudo leer el archivo:</b> ${esc(e.message||String(e))}`; }
}
function renderDuplaPanel(){
  const box=$("#dpLoaded"); if(!box) return;
  box.innerHTML=CARGAS.length?`<span class="eyebrow">Matrices cargadas en este navegador</span>`+CARGAS.map((c,i)=>{ const ms=[...new Set(c.recs.map(x=>x[1]*100+x[2]))].sort().map(k=>`${MES_L_CAP[k%100-1]} ${Math.floor(k/100)}`).join(", "); return `<div class="dpfile"><span><b>${esc(c.name)}</b> · ${c.recs.length} atenciones · ${ms}</span><button class="linkbtn" type="button" data-i="${i}">Quitar</button></div>`; }).join(""):"";
  for(const b of box.querySelectorAll("button[data-i]")) b.onclick=()=>{ CARGAS.splice(+b.dataset.i,1); D.dup.r=BASE_R.slice(); applyCargas(); render(); renderDuplaPanel(); $("#dpStatus").textContent="Se quitó la matriz cargada."; };
}
$("#dpFile").addEventListener("change",e=>{ const f=e.target.files[0]; if(f) readMatrixFile(f); e.target.value=""; });
$("#dpMonthly").onclick=openMonthly;
$("#dpTemplate").onclick=()=>{ const l=document.createElement("a"); l.href="datos/plantilla/MATRIZ_DUPLA_estandar.xlsx"; l.download="MATRIZ_DUPLA_estandar.xlsx"; document.body.appendChild(l); l.click(); l.remove(); $("#dpStatus").textContent="Descargando la plantilla…"; };
loadSaved(); renderDuplaPanel();

$("#foot").innerHTML=`<b>Fuentes.</b> Policía Nacional — matriz de delitos con víctima mujer, Nariño ${POL_RANGE} (${CUR_YEAR} con corte parcial). Dupla Violeta, Secretaría de Equidad de Género e Inclusión Social — base consolidada de atenciones 2024 (enero a septiembre), 2025 (marzo y abril) y 2026 (junio a septiembre y base sin mes), sin datos que identifiquen a las personas. Población: DANE, proyecciones municipales 2025 (CNPV 2018), mujeres. Cartografía: DANE, Marco Geoestadístico Nacional 2018. Capas territoriales: DANE, veredas (Nivel de Referencia de Veredas 2025), comunas (Comunas y Localidades 2018) y centros poblados (MGN 2025); barrios de Pasto: capa pública «BARRIOS PASTO» en ArcGIS Online (digitalización municipal de 2010). Los casos se ubican en las capas cruzando el nombre del barrio, vereda o corregimiento registrado en la matriz. Subregiones: Plan de Desarrollo Departamental de Nariño.<br><b>Lectura del mapa.</b> Los municipios se clasifican por número de casos en cinco grupos (quintiles).`;

applyVB(); render(); requestAnimationFrame(applyVB);
{ const ld=document.getElementById("loading"); if(ld) ld.remove(); }
