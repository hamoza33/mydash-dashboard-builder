/**
 * Dashboard HTML builder.
 * Generates a standalone HTML dashboard matching the reference design at
 * https://dash.shopinzo.bond/ with gzip+base64 encoded data payload,
 * full CSS design system, charts, filters, tables, modals, and client-side JS.
 * Output must be under 60KB.
 */

import { gzipSync } from "zlib";

export interface DashboardBuilderConfig {
  productName: string;
  dateFrom: string;
  dateTo: string;
  reconciliationRows: string[][];
  sheetUrl?: string;
  dashboardSlug: string;
  /** Maps tracking number to carrier name (e.g. "ARAMEX", "SMSA") */
  carrierByTracking?: Record<string, string>;
  /** Maps lead_id to extra fields not available in the reconciliation columns */
  extraLeadData?: Record<string, { funnel_url?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}

interface DashboardRow {
  lead_id: string;
  lead_status: string;
  lead_date: string;
  lead_name: string;
  phone: string;
  city: string;
  country: string;
  lead_qty: number;
  lead_price: number;
  currency: string;
  sku: string;
  order_id: string;
  order_status: string;
  order_total: number;
  order_qty: number;
  order_date: string;
  tracking: string;
  track_status: string;
  carrier: string;
  norm_status: string;
  latest_status: string;
  status_detail: string;
  latest_update: string;
  undelivery: string;
  origin_city: string;
  dest_city: string;
  lf_order: string;
  lf_date: string;
  lf_total: number;
  lf_fin_status: string;
  funnel_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function normalizeStatus(raw: string): string {
  if (!raw) return "Not Found";
  const s = raw.toLowerCase().trim();
  if (s === "delivered" || s === "dlv" || s.includes("delivered")) return "Delivered";
  if (s === "returned" || s === "return" || s === "rto" || s.includes("return")) return "Returned";
  if (s === "out_for_delivery" || s === "ofd") return "Out for Delivery";
  if (s === "in_transit" || s === "transit" || s === "shipped" || s === "dispatched" || s.includes("transit")) return "In Transit";
  return "Not Found";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function transformRow(
  row: string[],
  carrierByTracking?: Record<string, string>,
  extraLeadData?: Record<string, { funnel_url?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>
): DashboardRow {
  const firstName = (row[2] || "").trim();
  const lastName = (row[3] || "").trim();
  const leadName = [firstName, lastName].filter(Boolean).join(" ");
  const trackStatus = row[23] || "";
  const normStatus = normalizeStatus(trackStatus);
  const trackingNumber = row[22] || "";
  const leadId = row[0] || "";

  // Look up carrier from tracking data
  const carrier = (trackingNumber && carrierByTracking?.[trackingNumber]) || "";

  // Look up extra lead fields (funnel_url, utm)
  const extra = leadId ? extraLeadData?.[leadId] : undefined;

  return {
    lead_id: leadId,
    lead_status: row[20] || "",
    lead_date: row[1] || "",
    lead_name: leadName,
    phone: row[4] || "",
    city: row[8] || "",
    country: row[7] || "",
    lead_qty: parseNum(row[14]),
    lead_price: parseNum(row[15]),
    currency: row[17] || "",
    sku: row[13] || "",
    order_id: row[0] || "",
    order_status: row[20] || "",
    order_total: parseNum(row[16]),
    order_qty: parseNum(row[14]),
    order_date: row[1] || "",
    tracking: trackingNumber,
    track_status: trackStatus,
    carrier,
    norm_status: normStatus,
    latest_status: trackStatus,
    status_detail: "",
    latest_update: "",
    undelivery: row[27] || "",
    origin_city: "",
    dest_city: "",
    lf_order: row[35] || "",
    lf_date: "",
    lf_total: parseNum(row[16]),
    lf_fin_status: row[36] || "",
    funnel_url: extra?.funnel_url || "",
    utm_source: extra?.utm_source || row[30] || "",
    utm_medium: extra?.utm_medium || "",
    utm_campaign: extra?.utm_campaign || row[31] || "",
  };
}

function getCSS(): string {
  return `:root{--bg:#07080d;--s1:#0f1018;--s2:#161820;--s3:#1e2030;--border:#272a3a;--border2:#343748;--green:#4ade80;--red:#f87171;--amber:#fbbf24;--blue:#60a5fa;--violet:#a78bfa;--cyan:#22d3ee;--text:#e2e4f0;--text2:#9099b8;--text3:#555d7a}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#141726,#07080d 48%);color:var(--text);font-family:'DM Mono',monospace}body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:9999;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px)}h1,h2,.k .v{font-family:'Cabinet Grotesk',Inter,sans-serif}button,select,input{font:inherit}#top{position:sticky;top:0;z-index:20;background:rgba(7,8,13,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);padding:14px 22px}.top1{display:flex;gap:14px;align-items:center;justify-content:space-between}.brand h1{font-size:23px;margin:0;letter-spacing:-.04em}.badge{border:1px solid var(--border2);border-radius:99px;padding:6px 10px;color:var(--cyan);white-space:nowrap}.stats{display:flex;gap:10px;flex-wrap:wrap}.stat{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:7px 10px;color:var(--text2)}.stat b{color:var(--text)}.tabs{display:flex;gap:8px;margin-top:10px}.tab,.reset,.pg button{border:1px solid var(--border2);background:var(--s1);color:var(--text);border-radius:12px;padding:9px 12px;cursor:pointer}.tab.on{background:var(--text);color:var(--bg)}main{padding:18px;max-width:1640px;margin:auto}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.k{border:1px solid var(--border);background:var(--s1);border-radius:18px;padding:15px;position:relative;overflow:hidden}.k:before{content:"";position:absolute;left:0;top:0;width:5px;height:100%;background:var(--bar)}.k .l{color:var(--text2);font-size:11px;text-transform:uppercase}.k .v{font-size:30px;font-weight:900;margin:5px 0}.k .n{color:var(--text3);font-size:12px}.filters{display:grid;grid-template-columns:repeat(12,1fr);gap:8px;border:1px solid var(--border);background:var(--s1);border-radius:18px;padding:12px;margin:14px 0}.filters.ex{grid-template-columns:repeat(11,1fr)}label{display:block;font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px}select,input{width:100%;background:var(--s2);border:1px solid var(--border2);color:var(--text);border-radius:10px;padding:8px}.cnt{align-self:end;color:var(--cyan);font-size:12px}.panel{display:none}.panel.on{display:block}.grid{display:grid;gap:12px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g21{grid-template-columns:2fr 1fr}.card{border:1px solid var(--border);background:rgba(15,16,24,.88);border-radius:20px;padding:15px;min-height:210px;overflow:auto}.card h2{margin:0;font-size:20px}.sub{color:var(--text3);font-size:11px;margin:4px 0 12px}.row{display:grid;grid-template-columns:minmax(90px,1fr) 112px;gap:8px;margin:8px 0;align-items:center}.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);font-size:12px}.bar{height:9px;background:var(--s3);border-radius:99px;overflow:hidden;margin:3px 0}.bar i{display:block;height:100%;border-radius:99px}.num{text-align:right;color:var(--text2);font-size:12px}.funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:end}.trap{clip-path:polygon(10% 0,90% 0,100% 100%,0 100%);min-height:90px;padding:15px 8px;text-align:center;display:grid;place-items:center;color:#07101a;font-weight:900}.matrix,.tbl{width:100%;border-collapse:collapse;font-size:12px}.matrix th,.matrix td,.tbl th,.tbl td{border-bottom:1px solid var(--border);padding:9px;white-space:nowrap}.matrix th,.tbl th{color:var(--text3);font-size:10px;text-transform:uppercase;cursor:pointer;text-align:left}.score,.pill{border-radius:99px;padding:4px 7px;background:var(--s3);font-weight:900}.leader .row{grid-template-columns:1fr 70px}.daily{height:230px;display:flex;gap:4px;align-items:end}.day{flex:1;display:flex;flex-direction:column-reverse;background:var(--s2);border-radius:7px;overflow:hidden}.seg{width:100%}.leg{display:flex;gap:14px;flex-wrap:wrap;color:var(--text2);font-size:11px;margin-top:8px}.dot{width:10px;height:10px;border-radius:99px;display:inline-block;margin-right:5px}.vbars{height:230px;display:flex;gap:8px;align-items:end}.vb{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:2px;align-items:end}.vb i{display:block;border-radius:6px 6px 0 0}.vbl{font-size:10px;color:var(--text3);text-align:center;margin-top:5px;overflow:hidden}.don{display:grid;place-items:center}.don svg{max-width:180px}.pg{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:10px 0}.tbl tr:hover td{background:rgba(96,165,250,.08);cursor:pointer}.modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);z-index:40}.modal.on{display:flex}.box{width:min(880px,94vw);max-height:88vh;overflow:auto;background:var(--s1);border:1px solid var(--border2);border-radius:22px;padding:18px}.mh{display:flex;justify-content:space-between}.x{background:var(--s3);color:var(--text);border:0;border-radius:99px;width:36px}.kv{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kv div{border:1px solid var(--border);background:var(--s2);border-radius:12px;padding:10px;overflow-wrap:anywhere}.kv b{display:block;color:var(--text3);font-size:10px;text-transform:uppercase;margin-bottom:4px}@media(max-width:1100px){.kpis,.g2,.g3,.g21,.filters,.filters.ex{grid-template-columns:1fr 1fr}.top1{display:block}}@media(max-width:680px){.kpis,.g2,.g3,.g21,.filters,.filters.ex,.kv,.funnel{grid-template-columns:1fr}}`;
}

function getClientJS(): string {
  return `let RAW=[],TAB='ana',MS='total',MD=-1,ES='lead_date',ED=-1,P=1;
const $=id=>document.getElementById(id),N=x=>Number(x||0),F=n=>N(n).toLocaleString(),PCT=(a,b)=>b?a/b*100:0,FP=x=>(x||0).toFixed(1)+'%',SAR=x=>'SAR '+N(x).toFixed(0),C=v=>v==null||v===''?'\\u2014':String(v),TR=r=>r.norm_status||'No Data';
function groupMetrics(s){let total=s.length,shipped=s.filter(r=>r.tracking).length,delivered=s.filter(r=>r.norm_status==='Delivered').length,returned=s.filter(r=>r.norm_status==='Returned').length,pending=s.filter(r=>r.tracking&&r.norm_status!=='Delivered'&&r.norm_status!=='Returned').length,confirmed=s.filter(r=>r.lead_status==='Confirmed').length,confR=PCT(confirmed,total),delR=PCT(delivered,shipped),retR=PCT(returned,shipped),pendingR=PCT(pending,shipped),score=confR*.4+delR*.6;return{total,shipped,delivered,returned,pending,confirmed,confR,delR,retR,pendingR,score}}
function colorPct(v){return v>=55?'var(--green)':v>=35?'var(--blue)':v>=18?'var(--amber)':'var(--red)'}function u(k){return[...new Set(RAW.map(r=>k==='norm_status'?TR(r):r[k]).filter(Boolean))].sort()}function ao(a){return a.map(x=>\`<option>\${String(x).replaceAll('<','&lt;')}</option>\`).join('')}function sel(id,l,opts){return\`<div><label>\${l}</label><select id=\${id}><option value="">All</option>\${ao(opts)}</select></div>\`}
function init(){let prices=['All prices','148','178','199','249+'],tot=['All totals','Under 149','149\\u2013199','200\\u2013299','300+'];$('af').innerHTML=sel('a_source','Source',u('utm_source'))+sel('a_campaign','Campaign',u('utm_campaign'))+sel('a_carrier','Carrier',u('carrier'))+sel('a_city','City',u('city'))+sel('a_country','Country',u('country'))+sel('a_status','Lead Status',u('lead_status'))+sel('a_track','Tracking Status',u('norm_status'))+sel('a_url','Funnel URL',u('funnel_url'))+\`<div><label>Price (SAR)</label><select id=a_price>\${prices.map((x,i)=>\`<option value="\${i?x:''}">\${x}</option>\`).join('')}</select></div>\`+sel('a_qty','Order Qty',u('order_qty'))+\`<div><label>Order Total (SAR)</label><select id=a_total>\${tot.map((x,i)=>\`<option value="\${i?x:''}">\${x}</option>\`).join('')}</select></div><button class=reset id=ar>Reset</button><div class=cnt id=ac></div>\`;$('ef').innerHTML=sel('e_status','Lead Status',u('lead_status'))+sel('e_track','Tracking Status',u('norm_status'))+sel('e_city','City',u('city'))+sel('e_country','Country',u('country'))+sel('e_carrier','Carrier',u('carrier'))+sel('e_campaign','Campaign',u('utm_campaign'))+sel('e_url','Funnel URL',u('funnel_url'))+sel('e_qty','Order Qty',u('order_qty'))+\`<div><label>Order Total</label><select id=e_total>\${tot.map((x,i)=>\`<option value="\${i?x:''}">\${x}</option>\`).join('')}</select></div><div><label>Search Name / Phone / Lead ID</label><input id=e_search></div><button class=reset id=er>Reset</button>\`;document.querySelectorAll('select,input').forEach(e=>e.oninput=()=>{P=1;render()});$('ar').onclick=()=>{document.querySelectorAll('#af select').forEach(x=>x.value='');render()};$('er').onclick=()=>{document.querySelectorAll('#ef select,#ef input').forEach(x=>x.value='');P=1;render()};document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');TAB=b.dataset.t;document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));$(TAB).classList.add('on');P=1;render()});$('ps').oninput=()=>{P=1;renderExp()};$('prev').onclick=()=>{P--;renderExp()};$('next').onclick=()=>{P++;renderExp()};$('close').onclick=()=>modal.classList.remove('on');modal.onclick=e=>{if(e.target.id==='modal')modal.classList.remove('on')};onkeydown=e=>{if(e.key==='Escape')modal.classList.remove('on')};render()}
function bucketTotal(r,v){let x=N(r.order_total);return !v||v==='Under 149'&&x<149||v==='149\\u2013199'&&x>=149&&x<=199||v==='200\\u2013299'&&x>=200&&x<=299||v==='300+'&&x>=300}function priceOk(r,v){let x=N(r.lead_price);return !v||v==='249+'&&x>=249||String(x)===v}function filt(p){return RAW.filter(r=>{let g=k=>$(p+'_'+k)?.value||'';if(g('source')&&r.utm_source!==g('source'))return 0;if(g('campaign')&&r.utm_campaign!==g('campaign'))return 0;if(g('carrier')&&r.carrier!==g('carrier'))return 0;if(g('city')&&r.city!==g('city'))return 0;if(g('country')&&r.country!==g('country'))return 0;if(g('status')&&r.lead_status!==g('status'))return 0;if(g('track')&&TR(r)!==g('track'))return 0;if(g('url')&&r.funnel_url!==g('url'))return 0;if(g('qty')&&String(r.order_qty)!==g('qty'))return 0;if(!bucketTotal(r,g('total')))return 0;if(p==='a'&&!priceOk(r,g('price')))return 0;if(p==='e'){let q=g('search').toLowerCase();if(q&&![r.lead_name,r.phone,r.lead_id].some(x=>String(x).toLowerCase().includes(q)))return 0}return 1})}
function header(s){let m=groupMetrics(s),a=s.map(r=>r.order_total).filter(Boolean),aov=a.length?a.reduce((x,y)=>x+y,0)/a.length:0;$('leadBadge').textContent=F(m.total)+' leads';$('qstats').innerHTML=[['Conf %',m.confR],['Del %',m.delR],['Return %',m.retR]].map(x=>\`<span class=stat>\${x[0]} <b>\${FP(x[1])}</b></span>\`).join('')+\`<span class=stat>Avg SAR <b>\${SAR(aov)}</b></span>\`}
function kpis(s){let m=groupMetrics(s),t=s.filter(r=>String(r.utm_source).toLowerCase()==='tiktok').length,it=s.filter(r=>['In Transit','Out for Delivery'].includes(r.norm_status)).length,a=s.map(r=>r.order_total).filter(Boolean),aov=a.length?a.reduce((x,y)=>x+y,0)/a.length:0,ks=[['Total Leads',m.total,F(t)+' TikTok count','--text'],['Confirmed',m.confirmed,FP(m.confR)+' of leads','--blue'],['Delivered',m.delivered,FP(m.delR)+' of shipped','--green'],['Returned',m.returned,FP(m.retR)+' of shipped','--red'],['In Transit / OFD',it,'live count','--amber'],['Avg Order Value',SAR(aov),'SAR per order','--violet']];$('kpis').innerHTML=ks.map(k=>\`<div class=k style="--bar:var(\${k[3]})"><div class=l>\${k[0]}</div><div class=v>\${C(k[1])}</div><div class=n>\${k[2]}</div></div>\`).join('')}
function groups(s,k){let m={};s.forEach(r=>{let x=k==='norm_status'?TR(r):(r[k]||'No Data');(m[x]||(m[x]=[])).push(r)});return Object.entries(m).map(([key,items])=>({key,items,m:groupMetrics(items)}))}function tip(x){return\`Leads: \${F(x.m.total)} | Shipped: \${F(x.m.shipped)} | Delivered: \${F(x.m.delivered)} (\${FP(x.m.delR)}) | Returned: \${F(x.m.returned)} (\${FP(x.m.retR)}) | Pending: \${F(x.m.pending)} (\${FP(x.m.pendingR)}) | Confirmed: \${F(x.m.confirmed)} (\${FP(x.m.confR)})\`}function dual(id,s,k,n,mode,all){n=n||15;mode=mode||'cg';all=all||0;let d=groups(s,k).sort((a,b)=>b.m.total-a.m.total).slice(0,all?999:n);$(id).innerHTML=d.map(x=>{let a=mode==='dr'?x.m.delR:x.m.confR,b=mode==='dr'?x.m.retR:x.m.delR,c=mode==='dr'?x.m.pendingR:0,c1=mode==='dr'?'var(--green)':'var(--blue)',c2=mode==='dr'?'var(--red)':'var(--green)';return\`<div class=row title="\${tip(x)}"><div><div class=name title="\${x.key}">\${x.key}</div><div class=bar><i style="width:\${Math.min(a,100)}%;background:\${c1}"></i></div><div class=bar><i style="width:\${Math.min(b,100)}%;background:\${c2}"></i></div>\${mode==='dr'?\`<div class=bar><i style="width:\${Math.min(c,100)}%;background:var(--amber)"></i></div>\`:''}</div><div class=num>\${F(x.m.total)}<br>\${mode==='dr'?FP(a)+'/'+FP(b)+'/'+FP(c):FP(a)+'/'+FP(b)}</div></div>\`}).join('')+(mode==='dr'?'<p class=sub>Legend: Delivery % / Return % / Pending %</p>':'<p class=sub>Legend: Confirmation % / Delivery %</p>')}
function single(id,d){$(id).innerHTML=d.map(x=>\`<div class=row title="\${x.tip||''}"><div><div class=name title="\${x.k}">\${x.k}</div><div class=bar><i style="width:\${Math.min(x.v,100)}%;background:\${x.c||colorPct(x.v)}"></i></div></div><div class=num>\${x.t||FP(x.v)}</div></div>\`).join('')||'<p class=sub>No data</p>'}
function vgroup(id,d){$(id).innerHTML=\`<div class=vbars>\${d.map(x=>\`<div title="\${x.tip||\`\${x.k}: Conf \${FP(x.c)} / Del \${FP(x.d)} | Leads \${F(x.total||0)} | Shipped \${F(x.shipped||0)}\`}"><div class=vb><i style="height:\${Math.min(x.c,100)*1.5}px;background:var(--blue)"></i><i style="height:\${Math.min(x.d,100)*1.5}px;background:var(--green)"></i></div><div class=vbl>\${x.k}<br>\${FP(x.c)} / \${FP(x.d)}<br>\${F(x.total||0)} leads</div></div>\`).join('')}</div><p class=sub><span class=dot style="background:var(--blue)"></span>Conf % <span class=dot style="background:var(--green)"></span>Del %</p>\`}
function renderAna(){let s=filt('a'),m=groupMetrics(s);header(s);kpis(s);$('ac').textContent=F(s.length)+' rows';dual('camp',s,'utm_campaign',15);dual('car',s,'carrier',99,'dr',1);let cd=groups(s,'city').sort((a,b)=>b.m.total-a.m.total).slice(0,15).map(x=>({k:x.key,v:x.m.delR,t:FP(x.m.delR)+' | '+F(x.m.total)+' orders',tip:tip(x)}));single('city',cd);$('fun').innerHTML=\`<div class=funnel>\${[['Total Leads',m.total,100,'--blue','100%'],['Confirmed',m.confirmed,m.confR,'--blue',FP(m.confR)],['Shipped',m.shipped,PCT(m.shipped,m.total),'--amber',FP(PCT(m.shipped,m.total))],['Delivered',m.delivered,m.delR,'--green',FP(m.delR)+' of shipped']].map(x=>\`<div class=trap title="\${x[0]}: \${F(x[1])} \\u00b7 \${x[4]}" style="height:\${90+x[2]}px;background:var(\${x[3]})"><div>\${x[0]}<br>\${F(x[1])}<br>\${x[4]}</div></div>\`).join('')}</div>\`;let rr={};s.filter(r=>r.undelivery).forEach(r=>rr[r.undelivery]=(rr[r.undelivery]||0)+1);single('ret',Object.entries(rr).sort((a,b)=>b[1]-a[1]).map(x=>({k:x[0],v:x[1],t:F(x[1]),c:'var(--red)',tip:x[0]+': '+F(x[1])+' returns'})));matrix(s);topc(s);daily(s);vgroup('price',groups(s,'lead_price').sort((a,b)=>N(a.key)-N(b.key)).map(x=>({k:x.key,c:x.m.confR,d:x.m.delR,total:x.m.total,shipped:x.m.shipped,tip:tip(x)})));donut(s);vgroup('qty',groups(s,'order_qty').sort((a,b)=>N(a.key)-N(b.key)).map(x=>({k:x.key,c:x.m.confR,d:x.m.delR,total:x.m.total,shipped:x.m.shipped,tip:tip(x)})));dual('country',s,'country',10);dual('url',s,'funnel_url',10);dual('src',s,'utm_source',99)}
function matrix(s){let d=groups(s,'utm_campaign').map(x=>{let vals=x.items.map(r=>r.order_total).filter(Boolean),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return{Campaign:x.key,Leads:x.m.total,Conf:x.m.confR,Del:x.m.delR,Ret:x.m.retR,Avg:avg,Score:x.m.score}});d.sort((a,b)=>{let A=a[MS],B=b[MS];return(typeof A==='string'?A.localeCompare(B):A-B)*MD});let hs=[['Campaign','Campaign'],['Leads','Leads'],['Conf','Conf%'],['Del','Del%'],['Ret','Ret%'],['Avg','Avg SAR'],['Score','Score']];$('mat').innerHTML='<tr>'+hs.map(h=>\`<th data-k=\${h[0]}>\${h[1]}</th>\`).join('')+'</tr>'+d.map(x=>\`<tr><td>\${x.Campaign}</td><td>\${F(x.Leads)}</td><td>\${FP(x.Conf)}</td><td>\${FP(x.Del)}</td><td>\${FP(x.Ret)}</td><td>\${SAR(x.Avg)}</td><td><span class=score style="color:\${colorPct(x.Score)}">\${FP(x.Score)}</span></td></tr>\`).join('');document.querySelectorAll('#mat th').forEach(th=>th.onclick=()=>{let k=th.dataset.k;if(MS===k)MD*=-1;else{MS=k;MD=k==='Campaign'?1:-1}matrix(s)})}
function topc(s){$('topc').innerHTML=groups(s,'utm_campaign').sort((a,b)=>b.m.score-a.m.score).slice(0,10).map((x,i)=>\`<div class=row><div class=name>#\${i+1} \${x.key}</div><span class=score style="color:\${colorPct(x.m.score)}">\${FP(x.m.score)}</span></div>\`).join('')}
function daily(s){let dates=[...new Set(s.map(r=>r.lead_date).filter(Boolean))].sort().slice(-35),mx=Math.max(1,...dates.map(d=>s.filter(r=>r.lead_date===d).length));$('daily').innerHTML=\`<div class=daily>\${dates.map(d=>{let ds=s.filter(r=>r.lead_date===d),tot=ds.length,c={Confirmed:0,Cancelled:0,Expired:0,Other:0};ds.forEach(r=>{let z=r.lead_status;c[z==='Confirmed'?'Confirmed':z==='Cancelled'?'Cancelled':z==='Expired'?'Expired':'Other']++});let tt=\`\${d} | Total \${F(tot)} | Confirmed \${F(c.Confirmed)} (\${FP(PCT(c.Confirmed,tot))}) | Cancelled \${F(c.Cancelled)} (\${FP(PCT(c.Cancelled,tot))}) | Expired \${F(c.Expired)} (\${FP(PCT(c.Expired,tot))}) | Wrong/Other \${F(c.Other)} (\${FP(PCT(c.Other,tot))})\`;return\`<div title="\${tt}"><div class=day>\${[['Confirmed','--green'],['Cancelled','--red'],['Expired','--text3'],['Other','--amber']].map(x=>c[x[0]]?\`<i class=seg style="height:\${c[x[0]]/mx*160}px;background:var(\${x[1]})"></i>\`:'').join('')}</div><div class=vbl>\${d.slice(5)}<br>\${F(tot)}<br>\${FP(PCT(c.Confirmed,tot))}</div></div>\`}).join('')}</div><div class=leg><span><i class=dot style="background:var(--green)"></i>Confirmed</span><span><i class=dot style="background:var(--red)"></i>Cancelled</span><span><i class=dot style="background:var(--text3)"></i>Expired</span><span><i class=dot style="background:var(--amber)"></i>Wrong/Other</span></div>\`}
function donut(s){let m=groupMetrics(s),cats=[['Delivered','--green',s.filter(r=>r.norm_status==='Delivered').length],['Returned','--red',s.filter(r=>r.norm_status==='Returned').length],['In Transit','--amber',s.filter(r=>r.norm_status==='In Transit').length],['Out for Delivery','--cyan',s.filter(r=>r.norm_status==='Out for Delivery').length],['No Data','--text3',s.filter(r=>!r.norm_status||r.norm_status==='Not Found').length]],tot=Math.max(1,cats.reduce((a,x)=>a+x[2],0)),a=0,segs='';cats.forEach(c=>{let p=c[2]/tot*100;segs+=\`<circle r=70 cx=90 cy=90 fill=none stroke="var(\${c[1]})" stroke-width=28 stroke-dasharray="\${p} \${100-p}" stroke-dashoffset="\${-a}" pathLength=100/>\`;a+=p});$('mix').innerHTML=\`<div class=don><svg viewBox="0 0 180 180">\${segs}<circle r=48 cx=90 cy=90 fill="var(--s1)"/><text x=90 y=96 text-anchor=middle fill="\${colorPct(m.delR)}" font-size=22 font-weight=900>\${FP(m.delR)}</text></svg></div><div class=leg>\${cats.map(c=>\`<span><i class=dot style="background:var(\${c[1]})"></i>\${c[0]} \${F(c[2])}</span>\`).join('')}</div>\`}
function renderExp(){let s=filt('e');header(s);kpis(s);$('ecnt').textContent=F(s.length)+' leads';s.sort((a,b)=>{let A=a[ES],B=b[ES];return(typeof A==='number'?A-B:String(A).localeCompare(String(B)))*ED});let ps=N($('ps').value),pages=Math.max(1,Math.ceil(s.length/ps));P=Math.max(1,Math.min(P,pages));let rows=s.slice((P-1)*ps,P*ps),cols=[['lead_id','Lead ID'],['lead_name','Name'],['phone','Phone'],['city','City'],['lead_qty','Qty'],['lead_price','Price SAR'],['order_qty','Ord Qty'],['order_total','Ord Total'],['lead_status','Lead Status'],['tracking','Tracking #'],['norm_status','Tracking Status'],['lead_date','Date']];$('lt').innerHTML='<tr>'+cols.map(c=>\`<th data-k=\${c[0]}>\${c[1]}</th>\`).join('')+'</tr>'+rows.map(r=>\`<tr data-id="\${r.lead_id}">\${cols.map(c=>{let v=c[0]==='norm_status'?TR(r):r[c[0]],cls=c[0].includes('status')?'pill':'';return\`<td><span class="\${cls}" style="\${cls?pill(v):''}">\${C(v)}</span></td>\`}).join('')}</tr>\`).join('');document.querySelectorAll('#lt th').forEach(th=>th.onclick=()=>{let k=th.dataset.k;if(ES===k)ED*=-1;else{ES=k;ED=-1}renderExp()});document.querySelectorAll('#lt tr[data-id]').forEach(tr=>tr.onclick=()=>modalOpen(s.find(r=>r.lead_id===tr.dataset.id)));$('pi').textContent=P+' / '+pages;$('prev').disabled=P<=1;$('next').disabled=P>=pages}
function pill(v){let c=String(v);let bg=c==='Confirmed'||c==='Delivered'?'--green':c==='Cancelled'||c==='Returned'?'--red':c==='Wrong'||c==='In Transit'||c==='Out for Delivery'?'--amber':c==='Expired'||c==='No Data'||c==='Not Found'?'--text3':'--s3';return\`background:var(\${bg});color:#07101a\`}
function modalOpen(r){let fs=[['Lead ID','lead_id'],['Lead Date','lead_date'],['Lead Name','lead_name'],['Phone','phone'],['City','city'],['Country','country'],['Lead Status','lead_status'],['Lead Price (SAR)','lead_price'],['Lead Qty','lead_qty'],['SKU','sku'],['Order ID','order_id'],['Order Status','order_status'],['Order Total','order_total'],['Order Date','order_date'],['Tracking #','tracking'],['Carrier','carrier'],['Norm. Status','norm_status'],['Undelivery Reason','undelivery'],['LF Order #','lf_order'],['Funnel URL','funnel_url'],['UTM Campaign','utm_campaign'],['UTM Source','utm_source']];$('details').innerHTML=fs.map(f=>\`<div><b>\${f[0]}</b>\${C(r[f[1]])}</div>\`).join('');modal.classList.add('on')}
function render(){TAB==='ana'?renderAna():renderExp()}async function boot(){let b=Uint8Array.from(atob(PAY),c=>c.charCodeAt(0)),txt=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();RAW=JSON.parse(txt);init()}boot();`;
}

/**
 * Builds a complete standalone HTML dashboard page matching the reference design.
 * Includes gzip+base64 encoded data payload, full CSS, charts, filters, tables, modals.
 * Self-contained with inline CSS/JS, under 60KB.
 */
export function buildDashboardHtml(config: DashboardBuilderConfig): string {
  const { productName, dateFrom, dateTo, reconciliationRows, sheetUrl, dashboardSlug, carrierByTracking, extraLeadData } = config;

  // Transform rows to dashboard JSON format
  const dashboardData: DashboardRow[] = reconciliationRows.map(
    (row) => transformRow(row, carrierByTracking, extraLeadData)
  );

  // Gzip + base64 encode
  const jsonStr = JSON.stringify(dashboardData);
  const compressed = gzipSync(Buffer.from(jsonStr, "utf-8"), { level: 9 });
  const payloadBase64 = Buffer.from(compressed).toString("base64");

  // Format date range for display
  const fmtDate = (d: string): string => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    } catch {
      return d;
    }
  };
  const dateRange = `${fmtDate(dateFrom)} \u2013 ${fmtDate(dateTo)}`;

  const safeTitle = escapeHtml(productName);

  const css = getCSS();
  const clientJS = getClientJS();

  return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${safeTitle}</title><link rel=preconnect href=https://fonts.googleapis.com><link rel=preconnect href=https://fonts.gstatic.com crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel=stylesheet><style>\n${css}\n</style><script>\nwindow.DASHBOARD_DATA_API="/data/${dashboardSlug}";\nwindow.DASHBOARD_SHEET_URL=${JSON.stringify(sheetUrl || "")};\n(function(){\n  var api=window.DASHBOARD_DATA_API;\n  var interval=30000;\n  function poll(){\n    fetch(api).then(function(r){return r.json()}).then(function(d){\n      window.DASHBOARD_LIVE_DATA=d;\n      window.dispatchEvent(new CustomEvent('dashboard-data-update',{detail:d}));\n    }).catch(function(){});\n  }\n  poll();\n  setInterval(poll,interval);\n})();\n</script></head><body><header id=top><div class=top1><div class=brand><h1>${safeTitle}</h1><div class=muted>${dateRange}</div></div><span class=badge id=leadBadge>0 leads</span><div class=stats id=qstats></div></div><div class=tabs><button class="tab on" data-t=ana>\ud83d\udcca Analytics</button><button class=tab data-t=exp>\ud83d\udccb Lead Explorer</button></div></header><main><section id=kpis class=kpis></section><section id=ana class="panel on"><div id=af class=filters></div><div class="grid g2"><div class=card><h2>Campaign Performance</h2><p class=sub>Conf % vs Delivery % \u00b7 sorted by volume</p><div id=camp></div></div><div class=card><h2>Carrier Performance</h2><p class=sub>Delivery vs Return rate per carrier</p><div id=car></div></div></div><div class="grid g3" style="margin-top:12px"><div class=card><h2>City Performance</h2><p class=sub>Delivery % by destination</p><div id=city></div></div><div class=card><h2>Lead \u2192 Delivery Funnel</h2><p class=sub>Drop-off at each stage</p><div id=fun></div></div><div class=card><h2>Return Reasons</h2><p class=sub>Why shipments failed</p><div id=ret></div></div></div><div class="grid g21" style="margin-top:12px"><div class=card><h2>Campaign \u00d7 Metrics Matrix</h2><p class=sub>Full stats \u2014 click header to sort</p><table id=mat class=matrix></table></div><div class=card><h2>Top Campaigns</h2><p class=sub>Score = 40% Conf + 60% Del</p><div id=topc class=leader></div></div></div><div class=card style="margin-top:12px"><h2>Daily Lead Volume</h2><p class=sub>Stacked by status \u2014 last 35 active days</p><div id=daily></div></div><div class="grid g3" style="margin-top:12px"><div class=card><h2>Price Tier Analysis</h2><p class=sub>Conf % / Del % per price point</p><div id=price></div></div><div class=card><h2>Tracking Status Mix</h2><p class=sub>Live status of all shipped orders</p><div id=mix></div></div><div class=card><h2>Order Qty Distribution</h2><p class=sub>Conf % / Del % by quantity ordered</p><div id=qty></div></div></div><div class="grid g3" style="margin-top:12px"><div class=card><h2>Country Performance</h2><p class=sub>Conf % / Del % by order country</p><div id=country></div></div><div class=card><h2>Funnel URL Performance</h2><p class=sub>Conf % / Del % per landing page</p><div id=url></div></div><div class=card><h2>UTM Source Breakdown</h2><p class=sub>Leads & rates per traffic source</p><div id=src></div></div></div></section><section id=exp class=panel><div id=ef class="filters ex"></div><div class=card><div class=pg><span id=ecnt></span><select id=ps><option>10</option><option selected>25</option><option>50</option></select><button id=prev>Prev</button><span id=pi></span><button id=next>Next</button></div><table id=lt class=tbl></table></div></section></main><div id=modal class=modal><div class=box><div class=mh><h2>Lead Detail</h2><button class=x id=close>\u2715</button></div><div id=details class=kv></div></div></div><script>\nconst PAY='${payloadBase64}';\n${clientJS}\n</script></body></html>`;
}
