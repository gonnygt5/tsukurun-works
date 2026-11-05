import{At as e,Kt as t,Mt as n,Nt as r,Qt as i,Ut as a,X as o,a as s,gt as c,mt as l,p as u,q as d,rt as ee,t as f,vt as te}from"./asset-CbO5k37n.js";import{t as ne}from"./Backdrop-D_4hYVfo.js";var p=1807,m=1368,h={hq:[.5072,.56],kiryu:[.713,.5629],takasaki:[.4591,.618],ota:[.7388,.6879]},g=[{key:`paint`,name:`PAINT`,ch:`rgb(255,0,0)`},{key:`wire`,name:`WIRE`,ch:`rgb(0,255,0)`},{key:`pixel`,name:`PIXEL`,ch:`rgb(0,0,255)`}],_=[`l1`,`l4`,`l4b`],re=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uBase; uniform sampler2D uL1; uniform sampler2D uL2; uniform sampler2D uL3;
uniform sampler2D uInk;
uniform vec2 uInkTexel;  // 1 / ink canvas size
uniform vec2 uSize;      // css px of the map box
uniform float uT;
uniform float uIntro;    // 1 → 0: the entrance scramble
uniform float uKick;     // 0..1, a short jolt when the material changes
uniform float uBurst;    // 0..1 while an idle glitch burst runs
uniform float uSeed;
uniform float uFeather;  // half-width of the ink's soft edge (in ink units)
uniform float uBlur;     // how far the ink is spread sideways before the edge is cut (ink texels)
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), f.x), f.y);
}
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * (vn(p) - 0.5); p = p * 2.03 + 7.1; a *= 0.5; } return s * 2.0; }
vec4 L(int i, vec2 uv){
  vec4 c = i == 0 ? texture2D(uBase, uv) : i == 1 ? texture2D(uL1, uv) : i == 2 ? texture2D(uL2, uv) : texture2D(uL3, uv);
  return vec4(c.rgb * c.a, c.a);
}
float inkAt(vec2 uv){ vec3 k = texture2D(uInk, uv).rgb; return max(k.r, max(k.g, k.b)); }
// the ink spread out: a ring of taps round the point, so the edge falls off slowly across the stroke as well as along it
vec3 inkSoft(vec2 uv){
  vec3 k = texture2D(uInk, uv).rgb * 0.2;
  if (uBlur <= 0.0) return k * 5.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 o = vec2(cos(a), sin(a)) * uInkTexel;
    k += texture2D(uInk, uv + o * uBlur * 0.5).rgb * 0.05 + texture2D(uInk, uv + o * uBlur).rgb * 0.05;
  }
  return k;
}
void main(){
  vec2 uv = vUv;
  float bpx = max(4.0, uSize.x / 110.0);                 // one glitch block (entrance / bursts only)
  vec2 cell = floor(uv * uSize / bpx);
  float tick = floor(uT * 12.0);

  // the resting glass, with the entrance scramble and the idle bursts' stray blocks
  int sel = 0;
  if (uBurst > 0.0 && h(cell * 1.31 + uSeed + tick) > 0.985) sel = 1 + int(h(cell + 9.0) * 2.99);
  float it = floor(uT * 14.0);
  if (h(cell + it * 0.11) < uIntro) sel = int(h(cell * 0.7 + it) * 3.99);
  // row tears + chroma split while it jolts (entrance, material change, burst)
  float g = max(uIntro, max(uKick * 0.5, uBurst * 0.4));
  float row = floor(uv.y * uSize.y / (bpx * 0.6));
  vec2 suv = uv;
  if (h(vec2(row * 1.7, tick)) < g * 0.3) suv.x += (h(vec2(row, tick)) - 0.5) * 0.08 * g;
  vec4 base = L(sel, suv);
  if (g > 0.01) {
    base.r = L(sel, suv + vec2(0.005 * g, 0.0)).r;
    base.b = L(sel, suv - vec2(0.005 * g, 0.0)).b;
  }

  // the ink, like the title: a soft field with an organic, wet edge (no blocks)
  vec3 ink = inkSoft(uv);
  float d = max(ink.r, max(ink.g, ink.b));
  vec2 p = vec2(uv.x * uSize.x / uSize.y, uv.y);
  float field = d + fbm(p * 5.0 + vec2(uT * 0.05, -uT * 0.04)) * 0.14;
  float w = max(fwidth(field) * 1.2 + 0.004, uFeather);
  float m = smoothstep(0.34 - w, 0.34 + w, field) * smoothstep(0.04, 0.1, d);   // (the 8-bit fade leaves a faint residue: keep it inert)
  vec4 col = base;
  if (m > 0.0) {
    int id = ink.r >= ink.g && ink.r >= ink.b ? 1 : ink.g >= ink.b ? 2 : 3;
    vec2 gr = vec2(inkAt(uv + vec2(uInkTexel.x, 0.0)) - inkAt(uv - vec2(uInkTexel.x, 0.0)),
                   inkAt(uv + vec2(0.0, uInkTexel.y)) - inkAt(uv - vec2(0.0, uInkTexel.y)));
    float rim = smoothstep(0.0, 0.5, m) * (1.0 - smoothstep(0.5, 1.0, m));
    // a little refraction near the edge, a slight chromatic split at the meniscus
    vec2 lu = suv - gr * 0.02 * (1.0 - smoothstep(0.3, 1.0, d));
    vec4 rev = L(id, lu);
    float ca = rim * 0.003;
    rev.r = L(id, lu + vec2(ca, 0.0)).r;
    rev.b = L(id, lu - vec2(ca, 0.0)).b;
    col = mix(base, rev, m);
    // a wet lip where the ink meets the glass
    vec2 Ld = normalize(vec2(-0.6, 0.8));
    float spec = pow(max(dot(normalize(gr + 1e-5), -Ld), 0.0), 6.0) * rim * clamp(length(gr) * 40.0, 0.0, 1.0);
    col.rgb += spec * 0.3 * col.a;
  }
  gl_FragColor = col;
}`,ie=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uBase; uniform sampler2D uL1; uniform sampler2D uL2; uniform sampler2D uL3;
uniform sampler2D uInk;
uniform vec2 uSize;      // css px of the map box
uniform float uT;
uniform float uIntro;    // 1 → 0: the entrance scramble
uniform float uKick;     // 0..1, a short jolt when the material changes
uniform float uBurst;    // 0..1 while an idle glitch burst runs
uniform float uSeed;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec4 L(int i, vec2 uv){
  vec4 c = i == 0 ? texture2D(uBase, uv) : i == 1 ? texture2D(uL1, uv) : i == 2 ? texture2D(uL2, uv) : texture2D(uL3, uv);
  return vec4(c.rgb * c.a, c.a);
}
void main(){
  vec2 uv = vUv;
  float bpx = max(4.0, uSize.x / 110.0);                 // one glitch block
  vec2 cell = floor(uv * uSize / bpx);
  vec2 cuv = (cell + 0.5) * bpx / uSize;
  float tick = floor(uT * 12.0);
  // the ink under this block, with a jagged, flickering edge
  vec3 ink = texture2D(uInk, cuv).rgb;
  float v = max(ink.r, max(ink.g, ink.b));
  float jag = (h(cell + uSeed) - 0.5) * 0.22 + (h(cell + tick) - 0.5) * 0.12;
  int sel = 0;
  float th = 0.32;
  if (v + jag > th) sel = ink.r >= ink.g && ink.r >= ink.b ? 1 : ink.g >= ink.b ? 2 : 3;
  // the band round the ink's edge glitches: blocks blink between the two materials
  // (the 8-bit fade leaves a faint residue below ~0.05: keep it inert)
  float edge = smoothstep(0.14, 0.28, v) * (1.0 - smoothstep(0.42, 0.7, v));
  bool tear = edge > 0.0 && h(cell * 0.73 + tick) < edge * 0.55;
  if (tear) sel = sel == 0 ? (ink.r >= ink.g && ink.r >= ink.b ? 1 : ink.g >= ink.b ? 2 : 3) : 0;
  // a few stray blocks on the resting glass during an idle burst
  if (sel == 0 && uBurst > 0.0 && h(cell * 1.31 + uSeed + tick) > 0.985) sel = 1 + int(h(cell + 9.0) * 2.99);
  // the entrance: every block a random material, settling
  float it = floor(uT * 14.0);
  if (h(cell + it * 0.11) < uIntro) sel = int(h(cell * 0.7 + it) * 3.99);
  // row tears + chroma split: always a little at the ink's edge, all over while it jolts
  float g = max(uIntro, max(uKick * 0.7, uBurst * 0.4));
  float row = floor(uv.y * uSize.y / (bpx * 0.6));
  vec2 suv = uv;
  float rr = h(vec2(row * 1.7, tick));
  if (rr < g * 0.3) suv.x += (h(vec2(row, tick)) - 0.5) * 0.08 * g;
  if (tear) suv.x += (h(cell + tick * 0.3) - 0.5) * bpx * 1.6 / uSize.x;
  vec4 c = L(sel, suv);
  float ca = max(g, tear ? 0.6 : 0.0);
  if (ca > 0.01) {
    c.r = L(sel, suv + vec2(0.005 * ca, 0.0)).r;
    c.b = L(sel, suv - vec2(0.005 * ca, 0.0)).b;
  }
  gl_FragColor = c;
}`,ae=class{constructor(e,{base:i=`l1`,edge:a=`soft`,onMaterial:c=()=>{}}={}){this.canvas=e,this.onMaterial=c,this.renderer=new s({canvas:e,alpha:!0,premultipliedAlpha:!0,antialias:!1}),this.renderer.outputColorSpace=o,this.renderer.setClearColor(0,0),this.scene=new n,this.cam=new l(-1,1,1,-1,0,1),this.ink=document.createElement(`canvas`),this.ictx=this.ink.getContext(`2d`),this.inkTex=new u(this.ink),this.inkTex.colorSpace=``,this.inkTex.generateMipmaps=!1,this.inkTex.minFilter=this.inkTex.magFilter=d,this.u={uBase:{value:null},uL1:{value:null},uL2:{value:null},uL3:{value:null},uInk:{value:this.inkTex},uInkTexel:{value:new t(1,1)},uSize:{value:new t(1,1)},uT:{value:0},uIntro:{value:1},uKick:{value:0},uBurst:{value:0},uSeed:{value:0},uFeather:{value:.16},uBlur:{value:12}};let f=new r({uniforms:this.u,fragmentShader:a===`blocks`?ie:re,transparent:!0,depthTest:!1,vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`});this.scene.add(new ee(new te(2,2),f)),this.radius=.11,this.bases={},this.base=i,this.mat=0,this.travel=0,this.lastInk=-1e9,this.ptr=null,this.prev=null,this.idle=0,this.auto=!0,this.next=4,this.burstT=-1}load(){let e=new a,t=t=>new Promise((n,r)=>e.load(f(`/map3d/v05f/${t}.webp`),e=>{e.colorSpace=``,n(e)},void 0,()=>r(Error(`failed to load `+t)))),n=Promise.all([t(`base_${this.base}`),...g.map(e=>t(e.key))]).then(([e,...t])=>{this.bases[this.base]=e,this.u.uBase.value=e,[this.u.uL1.value,this.u.uL2.value,this.u.uL3.value]=t});return n.then(()=>_.filter(e=>e!==this.base).forEach(e=>t(`base_${e}`).then(t=>{this.bases[e]=t},e=>console.warn(`[MapTrace]`,e.message)))),n}setBase(e){return this.bases[e]?(this.base=e,this.u.uBase.value=this.bases[e],this.u.uKick.value=1,!0):!1}get material(){return g[this.mat]}resize(e,t,n){this.renderer.setPixelRatio(n),this.renderer.setSize(e,t,!1),this.u.uSize.value.set(e,t),this.ink.width=Math.max(32,Math.round(e/4)),this.ink.height=Math.max(20,Math.round(t/4)),this.ictx.fillStyle=`#000`,this.ictx.fillRect(0,0,this.ink.width,this.ink.height),this.u.uInkTexel.value.set(1/this.ink.width,1/this.ink.height),this.inkTex.dispose(),this.inkTex.needsUpdate=!0}pointer(e,t,n,r=!0){if(!n){this.ptr=null,this.prev=null;return}let i=performance.now();r&&i-this.lastInk>900&&this.travel>.25&&this._next(),this.ptr={x:e,y:t,t:i},r&&(this.idle=0)}_next(){this.mat=(this.mat+1)%g.length,this.travel=0,this.u.uKick.value=1,this.onMaterial(this.mat,g[this.mat])}_stamp(e,t){let n=this.ictx,r=this.ink.width,i=this.ink.height,a=i*this.radius,o=(t.x-e.x)*r,s=(t.y-e.y)*i,c=Math.max(1,Math.ceil(Math.hypot(o,s)/(a*.35)));n.globalCompositeOperation=`lighter`;for(let o=1;o<=c;o++){let s=(e.x+(t.x-e.x)*o/c)*r,l=(e.y+(t.y-e.y)*o/c)*i,u=n.createRadialGradient(s,l,0,s,l,a),d=this.material.ch;u.addColorStop(0,d.replace(`rgb`,`rgba`).replace(`)`,`,0.5)`)),u.addColorStop(1,d.replace(`rgb`,`rgba`).replace(`)`,`,0)`)),n.fillStyle=u,n.fillRect(s-a,l-a,a*2,a*2)}n.globalCompositeOperation=`source-over`,this.travel+=Math.hypot((t.x-e.x)*r/i,t.y-e.y)}_autoPath(e){return{x:.5+.3*Math.sin(e*.37)+.06*Math.sin(e*1.3),y:.52+.2*Math.sin(e*.53+1.1)+.05*Math.cos(e*1.7)}}update(e,t,n){let r=this.u;if(r.uIntro.value=t,!n){r.uT.value+=e;let n=performance.now();this.idle+=e;let i=this.ptr&&n-this.ptr.t<80?this.ptr:null;if(i||(this.prev=this.ptr?this.prev:null),!i&&this.auto&&t<=0&&this.idle>4&&(this.idle-e<=4&&(this.prev=null,this._next()),i=this._autoPath(r.uT.value)),i&&((!this.prev||Math.hypot(i.x-this.prev.x,i.y-this.prev.y)>.002)&&(this.prev&&this._stamp(this.prev,i),this.prev={x:i.x,y:i.y},this.lastInk=n),this.travel>2.4&&this._next()),this.dry=(this.dry||0)+e,this.dry>=.05){let e=this.ictx;e.fillStyle=`rgba(0,0,0,${Math.min(1,this.dry*.8).toFixed(3)})`,e.fillRect(0,0,this.ink.width,this.ink.height),this.dry=0}this.inkTex.needsUpdate=!0,r.uKick.value=Math.max(0,r.uKick.value-e*3.5),t<=0&&(this.next-=e)<=0&&(this.burstT=0,this.next=4+Math.random()*3),this.burstT>=0&&(this.burstT+=e,r.uBurst.value=+(this.burstT<.28),this.burstT>=.28&&(this.burstT=-1,r.uSeed.value=Math.floor(Math.random()*1e3)))}this.renderer.render(this.scene,this.cam)}},v=(e,t=document)=>t.querySelector(e),y=(e,t,n)=>Math.min(n,Math.max(t,e)),oe=e=>1-(1-y(e,0,1))**3,b=new URLSearchParams(location.search),x=document.documentElement.dataset.bg,S=b.get(`still`)===`1`,C=S||b.get(`show`)===`all`,w=matchMedia(`(prefers-reduced-motion: reduce)`).matches;document.documentElement.classList.add(`is-mix`,`no-wire`);var T=_.includes(b.get(`base`))?b.get(`base`):`l1`,se=(b.get(`edge`)||document.documentElement.dataset.edge)===`blocks`?`blocks`:`soft`;(S||w)&&document.documentElement.classList.add(`is-still`);var E=[{id:`hq`,group:`main`,word:null,place:`前橋`,at:.04,line:150,dx:120},{id:`kiryu`,group:`main`,word:`KIRYU`,place:`桐生`,at:.14,line:60,dx:0},{id:`takasaki`,group:`main`,word:`TAKASAKI`,place:`高崎`,at:.24,line:34,dx:-110},{id:`ota`,group:`main`,word:`OTA`,place:`太田`,at:.34,line:44,dx:10},{id:`takajo`,group:`sat`,word:`TAKAJO`,place:`高崎女子高等学校`},{id:`itaka`,group:`sat`,word:`ITAKA`,place:`伊勢崎高等学校`},{id:`agatsuma`,group:`sat`,word:`AGATSUMA`,place:`吾妻中央高等学校`}],D=E.filter(e=>e.group===`main`),ce=e=>e.word?e.group===`sat`?`<span class="jm__tagword">${e.word}</span>`:`<span class="jm__mark">${i}<span class="jm__tagword">${e.word}</span></span>`:`<span class="jm__mark">${i}</span>`;for(let e of E){let t=document.createElement(`li`);t.className=`jm__row ${e.id===`hq`?`jm__row--hq`:``} ${e.group===`sat`?`jm__row--sat`:``}`,t.innerHTML=`${ce(e)}<span class="jm__place">${e.place}</span>`,v(`[data-list="${e.group}"]`).appendChild(t),e.row=t}var le=v(`.jm__tags`);for(let e of D){let t=document.createElement(`div`);t.className=`jm-tag ${e.id===`hq`?`jm-tag--hq`:``}`,t.innerHTML=`<span class="jm-tag__dot"></span><span class="jm-tag__line"></span><span class="jm-tag__pill">${i}<span>${e.place}</span></span>`,le.appendChild(t),e.tag=t;let n=t=>{e.row.classList.toggle(`is-hot`,t),e.tag.classList.toggle(`is-hot`,t&&G)};e.row.addEventListener(`pointerenter`,()=>{n(!0),$()}),e.row.addEventListener(`pointerleave`,()=>{n(!1),$()})}var ue=v(`.jm__gl`),O=new s({canvas:ue,antialias:!1,powerPreference:`high-performance`});O.toneMapping=7,O.outputColorSpace=e;var k=new n,A=new c(30,1,.1,200);A.position.set(0,0,12);var j=new ne({mode:x});k.add(j.object),j.setMode(x).apply(O,k);var M=v(`.jm__sticky`),N=v(`.mc-map`),de=v(`.mc-glow`),P=v(`.mt-mat__name`),F=new ae(v(`.mc-mix`),{base:T,edge:se,onMaterial:(e,t)=>{P.textContent=t.name}});F.auto=b.get(`auto`)!==`0`&&!w;var I=e=>{let t=parseFloat(b.get(e)??document.documentElement.dataset[e]);return Number.isFinite(t)?Math.max(0,t):null};I(`feather`)!==null&&(F.u.uFeather.value=I(`feather`)),I(`blur`)!==null&&(F.u.uBlur.value=I(`blur`)),I(`brush`)!==null&&(F.radius=I(`brush`)),P.textContent=F.material.name;var fe=(e,t)=>new Promise((n,r)=>{e.onload=n,e.onerror=()=>r(Error(`failed to load `+t)),e.src=t}),pe=F.load();x!==`black`&&fe(de,f(`/map3d/v05f/glow.webp`)).catch(e=>console.warn(`[map05f]`,e.message));var L=[...document.querySelectorAll(`[data-base]`)];function R(e){if(!F.setBase(e))return;for(let t of L)t.classList.toggle(`is-on`,t.dataset.base===e);let t=new URL(location.href);t.searchParams.set(`base`,e),history.replaceState(null,``,t)}for(let e of L)e.classList.toggle(`is-on`,e.dataset.base===T),e.addEventListener(`click`,()=>R(e.dataset.base));addEventListener(`keydown`,e=>{(e.key===`b`||e.key===`B`)&&R(_[(_.indexOf(F.base)+1)%_.length])});var z={x:0,y:0,w:1,h:1},B=!1,V=1,H=1;function U(){q=0,V=M.clientWidth,H=M.clientHeight,B=V<=H;let e=B?{x:.02*V,y:.05*H,w:.96*V,h:.5*H}:{x:.33*V,y:.06*H,w:.66*V,h:.9*H},t=Math.min(e.w/p,e.h/m);z.w=p*t,z.h=m*t,z.x=e.x+(e.w-z.w)/2,z.y=e.y+(e.h-z.h)/2,Object.assign(N.style,{left:`${z.x}px`,top:`${z.y}px`,width:`${z.w}px`,height:`${z.h}px`}),F.resize(z.w,z.h,Math.min(devicePixelRatio||1,2));let n=Math.min(devicePixelRatio||1,B?1.5:2);O.setPixelRatio(n),O.setSize(V,H,!1),A.aspect=V/H,A.updateProjectionMatrix(),j.resize(H*n,12);let r=B?[.5,.35]:[1,1];for(let e of D)e.lineNow=Math.round(e.line*r[0]),e.dxNow=e.dx*r[1],e.pillW=0,e.tag.style.setProperty(`--line`,`${e.lineNow}px`);me()}function me(){for(let e of D){let[t,n]=h[e.id],r=z.x+t*z.w,i=z.y+n*z.h;e.tag.style.transform=`translate3d(${r.toFixed(1)}px, ${i.toFixed(1)}px, 0)`,e.pillW||=e.tag.querySelector(`.jm-tag__pill`).offsetWidth||120;let a=e.pillW/2+10,o=y(r+e.dxNow,a,V-a);e.tag.style.setProperty(`--dx`,`${(o-r).toFixed(1)}px`)}}var W=!1,G=!1,K=0,q=0,J=1,Y=2.6,X=1.5;function he(){if(!W){if(W=!0,S||w){ge();return}K=performance.now(),N.classList.add(`is-in`)}}function ge(){G=!0,N.classList.add(`is-in`,`is-settled`),N.style.transform=``,$()}function _e(e){let t=(e-K)/1e3,n=oe(t/Y);N.style.transform=`perspective(1400px) rotateX(${(1-n)*10}deg) rotateZ(${(1-n)*-5}deg) scale(${1+(1-n)*.12})`,N.style.filter=t<X?`saturate(${1+(1-t/X)*.8}) brightness(${1+(1-t/X)*.25})`:``,J=Math.max(0,1-t/X)**1.5,t>=Y&&ge()}var ve=v(`.jm`),Z=0,Q=0;function $(){let e=ve.getBoundingClientRect();Z=y(-e.top/Math.max(1,e.height-M.clientHeight),0,1);let t=G?D.filter(e=>C||Z>=e.at):[],n=t[t.length-1];for(let e of D){let r=t.includes(e);e.tag.classList.toggle(`is-on`,r||G&&e.row.classList.contains(`is-hot`)),e.tag.classList.toggle(`is-quiet`,!C&&B&&r&&e.id!==`hq`&&e!==n&&!e.row.classList.contains(`is-hot`)),e.row.classList.toggle(`is-on`,r)}for(let e of E)e.group===`sat`&&e.row.classList.toggle(`is-on`,G)}addEventListener(`scroll`,$,{passive:!0}),M.addEventListener(`pointermove`,e=>{if(e.pointerType===`touch`&&e.buttons===0||e.target.closest?.(`button`))return;let t=N.getBoundingClientRect(),n=(e.clientX-t.left)/t.width,r=(e.clientY-t.top)/t.height;F.pointer(n,r,G&&n>-.05&&n<1.05&&r>-.05&&r<1.05)});for(let e of[`pointerleave`,`pointerup`,`pointercancel`])M.addEventListener(e,()=>F.pointer(0,0,!1));addEventListener(`resize`,()=>{U(),$()});var ye=!1;new IntersectionObserver(e=>{for(let t of e)Q=t.intersectionRatio,ye&&Q>=.35&&he()},{threshold:[0,.35,.6,1]}).observe(M),pe.then(()=>{ye=!0,document.documentElement.classList.add(`is-ready`),(S||Q>=.35)&&he()}).catch(e=>console.error(`[map05f]`,e));var be=performance.now();function xe(e){let t=Math.min(.05,(e-be)/1e3);be=e,W&&!G&&_e(e),G&&(J=0),W&&Q>0&&!(S&&q>20)&&F.update(t,J,S||w),Q>0&&!(S&&++q>20)&&(j.update(S||w?0:t,A),O.render(k,A)),requestAnimationFrame(xe)}U(),$(),requestAnimationFrame(xe),window.__mc={get settled(){return G},get progress(){return Z},ANCHORS:h,mix:F,pickBase:R};