import{At as e,Kt as t,Nt as n,T as r,Ut as i,bt as a,et as o,f as s,g as c,h as l,k as u,kt as d,lt as f,qt as p,rt as m,vt as h,y as g}from"./asset-CbO5k37n.js";var _=`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
`,v=`
precision highp float;
uniform float uTime;
uniform float uMode;     // 0 dark, 1 pastel
uniform vec2 uPan;       // camera yaw / pitch, so the sky shifts a little with the view
uniform vec2 uRes;
uniform sampler2D uPhoto;   // the photo plate (dark mode only)
uniform sampler2D uPhotoB;  // the next slide, cross-faded in by uPhotoMix
uniform float uPhotoMix;
uniform float uPhotoOn;
uniform float uPhotoAsp;    // image width / height
uniform vec3 uPhotoTint;
uniform float uPhotoAmt;    // how much of the tint lies over the photo (0.6 = the brief)
uniform float uPhotoDim;    // overall level of the plate, so the dots and the logo still lead
uniform float uPhotoGrain;  // film grain strength (0 = none)
uniform sampler2D uGrain;   // a film-grain tile, one texel per device pixel
uniform float uGrainSize;   // the tile's size in device pixels (256 for the made-in-JS tile)
uniform float uGrainDrift;
uniform float uPhotoFade;   // 0..1: the photo plate and its grain come up together (the intro)
uniform float uFineGrain;   // the first, per-pixel fine grain (added in linear light, as before)
uniform float uFineSpeed;   // how often it changes (cross-fades), per second — slow  // 0 = still; otherwise fresh grain cross-fades in this many times per second (very slow)
varying vec2 vUv;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float f = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { f += a * vn(p); p = p * 2.02 + 7.1; a *= 0.5; } return f; }
// water caustics (iterated warp): bright filaments where light gathers
float caustic(vec2 p, float t){
  vec2 i = p; float c = 1.0; float inten = 0.0048;
  for (int n = 0; n < 5; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return min(pow(clamp(c, 0.0, 1.2), 8.0), 1.5);
}
void main(){
  float asp = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vUv; vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5) + uPan;
  float g = (h2(gl_FragCoord.xy + fract(uTime * 7.0) * 61.0) - 0.5);   // film grain
  if (uMode < 0.5) {
    // dark: almost black, a faint deep-blue haze behind the middle, darker to the corners
    float r = length(p * vec2(0.8, 1.1) - vec2(0.05, 0.12));
    float haze = exp(-r * r * 2.6);
    float neb = fbm(p * 1.6 + vec2(uTime * 0.01, 0.0));
    vec3 c = vec3(0.0012, 0.0014, 0.0022);
    c += vec3(0.0012, 0.002, 0.0055) * haze * (0.6 + neb * 0.8);
    c *= 1.0 - smoothstep(0.5, 1.3, length(vec2((uv.x - 0.5) * asp, uv.y - 0.5))) * 0.6;
    if (uPhotoOn > 0.5) {
      // the photo, cover-fitted, panning a little with the view; the blue laid over it; the haze on top
      vec2 fit = asp > uPhotoAsp ? vec2(1.0, uPhotoAsp / asp) : vec2(asp / uPhotoAsp, 1.0);
      vec2 puv = (uv - 0.5) * fit * 0.92 + 0.5 + uPan * 0.05;
      // the navy is laid over the photo like a layer in a design tool: normal blend at uPhotoAmt, in display colour
      vec3 ps = mix(texture2D(uPhoto, puv).rgb, texture2D(uPhotoB, puv).rgb, uPhotoMix);
      vec3 ts = pow(uPhotoTint, vec3(1.0 / 2.2));
      vec3 ph = pow(mix(ps, ts, uPhotoAmt), vec3(2.2)) * uPhotoDim * uPhotoFade;
      ph *= 1.0 - smoothstep(0.4, 1.25, length(vec2((uv.x - 0.5) * asp, uv.y - 0.5))) * 0.6;
      c = ph + c * 1.4;
      if (uFineGrain > 0.0) {   // fine grain: one value per pixel, cross-fading slowly to a fresh one
        float fp = uTime * uFineSpeed, fn = floor(fp), fk = smoothstep(0.0, 1.0, fract(fp));
        float fa = h2(gl_FragCoord.xy + fn * 61.7) - 0.5, fb = h2(gl_FragCoord.xy + (fn + 1.0) * 61.7) - 0.5;
        c += (fa * (1.0 - fk) + fb * fk) / sqrt(fk * fk + (1.0 - fk) * (1.0 - fk)) * uFineGrain * uPhotoFade;
      }
      // film grain (still, or a very slow drift)
      vec2 gp = gl_FragCoord.xy / uGrainSize;
      float fg = texture2D(uGrain, gp).r * 2.0 - 1.0;
      if (uGrainDrift > 0.0) {   // two offsets of the same tile, cross-faded; the mix keeps the grain's strength even
        float ph = uTime * uGrainDrift, n = floor(ph), k = smoothstep(0.0, 1.0, fract(ph));
        vec2 o1 = vec2(h2(vec2(n, 1.7)), h2(vec2(n, 5.3))), o2 = vec2(h2(vec2(n + 1.0, 1.7)), h2(vec2(n + 1.0, 5.3)));
        float a = texture2D(uGrain, gp + o1).r * 2.0 - 1.0, b = texture2D(uGrain, gp + o2).r * 2.0 - 1.0;
        fg = (a * (1.0 - k) + b * k) / sqrt(k * k + (1.0 - k) * (1.0 - k));
      }
      // laid on in display space like an overlay layer (a linear multiply vanished on the dark navy), a little
      // less in the deepest shadows
      vec3 cs = pow(max(c, 0.0), vec3(1.0 / 2.2));
      float lum = dot(cs, vec3(0.299, 0.587, 0.114));
      cs += fg * uPhotoGrain * uPhotoFade * (0.45 + 0.55 * smoothstep(0.02, 0.35, lum));
      c = pow(max(cs, 0.0), vec3(2.2));
      gl_FragColor = vec4(max(c, 0.0), 1.0);
      #include <colorspace_fragment>
      return;
    }
    gl_FragColor = vec4(c + g * 0.006, 1.0);
  } else {
    // pastel: soft clouds of colour that flow into each other
    float t = uTime * 0.035;
    vec2 q = p * 1.25;
    vec2 w = vec2(fbm(q + vec2(t, -t * 0.7)), fbm(q + vec2(-t * 0.6, t) + 5.2));
    float n1 = fbm(q * 1.1 + w * 1.6 + vec2(t * 0.4, 0.0));
    float n2 = fbm(q * 0.8 - w * 1.2 + 11.0 - vec2(0.0, t * 0.3));
    vec3 base = vec3(0.965, 0.962, 0.985);
    vec3 lav = vec3(0.58, 0.48, 0.98), pink = vec3(1.0, 0.52, 0.8), mint = vec3(0.5, 0.92, 0.82), sky = vec3(0.45, 0.72, 1.0), cream = vec3(1.0, 0.88, 0.58);
    vec3 c = base;
    c = mix(c, lav, smoothstep(0.36, 0.74, n1) * 0.78);
    c = mix(c, pink, smoothstep(0.42, 0.78, n2) * 0.72);
    c = mix(c, sky, smoothstep(0.4, 0.76, fbm(q * 0.9 + w + 23.0)) * 0.7);
    c = mix(c, mint, smoothstep(0.5, 0.8, fbm(q * 1.3 - w * 0.8 + 41.0)) * 0.5);
    c = mix(c, cream, smoothstep(0.6, 0.9, n1 * n2 * 1.8) * 0.3);
    // prismatic caustics: each colour channel sees the pattern slightly shifted (dispersion), drifting slowly
    vec2 cp = p * 3.2 + w * 0.9 + vec2(uTime * 0.02, -uTime * 0.012);
    float ct = uTime * 0.18 + 23.0;
    vec3 cs = vec3(caustic(cp * 6.2832 + vec2(0.06, 0.0), ct), caustic(cp * 6.2832, ct), caustic(cp * 6.2832 - vec2(0.06, 0.02), ct));
    float band = smoothstep(0.3, 0.65, fbm(p * 0.9 + vec2(-t, t * 0.5) + 3.0));   // the light comes and goes in patches
    vec3 prism = 0.5 + 0.5 * cos(6.2832 * (p.x * 0.6 + p.y * 0.4 + uTime * 0.03 + vec3(0.0, 0.33, 0.67)));
    c += cs * mix(vec3(1.0), prism, 0.75) * 0.55 * band;
    // a soft light from the upper left, a little deeper towards the bottom right
    c *= 1.0 - smoothstep(0.2, 1.4, length(p - vec2(-0.45, 0.35))) * 0.07;
    gl_FragColor = vec4(clamp(c + g * 0.012, 0.0, 1.0), 1.0);
  }
  #include <colorspace_fragment>
}
`,y=`
attribute float aSize;
attribute float aSeed;
attribute vec3 aTint;
uniform float uScale;
uniform float uTime;
uniform float uFocus;
uniform float uWorld;
varying float vAlpha;
varying float vSoft;
varying vec3 vTint;
void main(){
  vec3 p = position * uWorld;
  p.y += sin(uTime * 0.2 + aSeed * 6.28) * 0.08 * aSeed * uWorld;
  p.x += cos(uTime * 0.13 + aSeed * 9.1) * 0.05 * aSeed * uWorld;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float z = -mv.z;
  float blur = clamp(abs(z - uFocus) / (uFocus * 1.4), 0.0, 1.0);
  gl_PointSize = aSize * uWorld * uScale * (1.0 + blur * 3.0) / max(z, 0.1);
  vSoft = blur; vTint = aTint;
  vAlpha = (1.0 - smoothstep(uFocus * 1.2, uFocus * 5.5, z)) * (1.0 - blur * 0.75) * smoothstep(0.4 * uWorld, 2.0 * uWorld, z);
  gl_Position = projectionMatrix * mv;
}
`,b=`
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTintAmt;
varying float vAlpha;
varying float vSoft;
varying vec3 vTint;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = 1.0 - smoothstep(mix(0.35, 0.0, vSoft), 1.0, d);
  // bokeh rim: out-of-focus dots get a faint brighter edge, as a lens would draw them
  a *= mix(1.0, 0.75 + 0.5 * smoothstep(0.55, 0.95, d), vSoft);
  gl_FragColor = vec4(mix(uColor, vTint, uTintAmt), a * vAlpha * uAlpha);
  #include <colorspace_fragment>
}
`,x={dark:{clear:131845,exposure:1,env:1,dots:10465480,dotAlpha:.32,dustAlpha:.3,tint:.15,blend:2,light:!1},pastel:{clear:16053242,exposure:1,env:1,dots:16777215,dotAlpha:.75,dustAlpha:.8,tint:.55,blend:1,light:!0},black:{clear:0,exposure:1.05,env:1,light:!1}};function S(e=256){let t=new Float32Array(e*e);for(let e=0;e<t.length;e++){let n=0;for(let e=0;e<4;e++)n+=Math.random();t[e]=(n-2)/.577}let n=new Float32Array(e*e);for(let r=0;r<e;r++)for(let i=0;i<e;i++){let a=0;for(let n=-1;n<=1;n++)for(let o=-1;o<=1;o++)a+=t[(r+n+e)%e*e+(i+o+e)%e]*(o||n?1:2);n[r*e+i]=t[r*e+i]*.6+a/10*.9}let r=new Uint8Array(e*e*4);for(let t=0;t<e*e;t++){let e=Math.max(0,Math.min(255,Math.round(128+n[t]*38)));r[t*4]=r[t*4+1]=r[t*4+2]=e,r[t*4+3]=255}let i=new g(r,e,e);return i.wrapS=i.wrapT=d,i.magFilter=i.minFilter=f,i.needsUpdate=!0,i}var C=[16757728,13023487,11135231,16773296,12121564].map(e=>new c(e)),w=class{constructor({mode:e=`dark`,scale:i=1}={}){this.scale=i,this.object=new u,this.object.name=`backdrop`,this.time=Math.random()*100,this.skyMat=new n({vertexShader:_,fragmentShader:v,depthTest:!1,depthWrite:!1,uniforms:{uTime:{value:0},uMode:{value:0},uPan:{value:new t},uRes:{value:new t(1,1)},uPhoto:{value:null},uPhotoB:{value:null},uPhotoMix:{value:0},uPhotoOn:{value:0},uPhotoAsp:{value:16/9},uPhotoTint:{value:new c(1522816)},uPhotoAmt:{value:.6},uPhotoDim:{value:.32},uPhotoGrain:{value:0},uGrain:{value:S()},uGrainSize:{value:256},uGrainDrift:{value:0},uFineGrain:{value:0},uFineSpeed:{value:.5},uPhotoFade:{value:1}}}),this.sky=new m(new h(2,2),this.skyMat),this.sky.frustumCulled=!1,this.sky.renderOrder=-100,this.object.add(this.sky);let o=e=>new n({vertexShader:y,fragmentShader:b,transparent:!0,depthWrite:!1,uniforms:{uScale:{value:300},uTime:{value:0},uFocus:{value:16},uWorld:{value:i},uColor:{value:new c},uAlpha:{value:e},uTintAmt:{value:0}}}),l=(e,t,n,i)=>{let c=new s;c.setAttribute(`position`,new r(e,3)),c.setAttribute(`aSize`,new r(t,1)),c.setAttribute(`aSeed`,new r(n,1));let l=[];for(let e=0;e<t.length;e++){let t=C[e%C.length];l.push(t.r,t.g,t.b)}c.setAttribute(`aTint`,new r(l,3));let u=new a(c,o(i));return u.frustumCulled=!1,u},d=[],f=[],g=[],x=2.2;for(let e=-14;e<=14;e++)for(let t=-8;t<=8;t++)for(let n=-16;n<=3;n++)Math.abs(e)<3&&Math.abs(t)<2&&Math.abs(n)<2||(d.push(e*x,t*x,n*x),f.push(.045),g.push(0));this.lattice=l(d,f,g,.4);let w=[],T=[],E=[];for(let e=0;e<1400;e++){let e=3+Math.random()**.7*40,t=Math.random()*Math.PI*2,n=(Math.random()-.5)*Math.PI*.8;w.push(Math.cos(t)*Math.cos(n)*e,Math.sin(n)*e*.6,Math.sin(t)*Math.cos(n)*e-6),T.push(.03+Math.random()*.11),E.push(Math.random())}this.dust=l(w,T,E,.3),this.object.add(this.lattice,this.dust),this._fwd=new p,this.setMode(e)}setMode(e){x[e]||(e=`dark`),this.mode=e;let t=x[e];return this.light=t.light,this.object.visible=e!==`black`,this.skyMat.uniforms.uMode.value=+(e===`pastel`),e!==`black`&&([[this.lattice,t.dotAlpha],[this.dust,t.dustAlpha]].forEach(([e,n])=>{let r=e.material.uniforms;r.uColor.value.set(t.dots),r.uAlpha.value=n,r.uTintAmt.value=t.tint,e.material.blending=t.blend,e.material.needsUpdate=!0}),this.lattice.visible=e===`dark`),this}setGrainTile(e){return!e||e===this.grainUrl?this:(this.grainUrl=e,new i().load(e,t=>{if(this.grainUrl!==e){t.dispose();return}t.colorSpace=``,t.wrapS=t.wrapT=d,t.magFilter=t.minFilter=f,t.generateMipmaps=!1;let n=this.skyMat.uniforms;n.uGrain.value=t,n.uGrainSize.value=t.image.width}),this)}setPhoto(t,{tint:n,amount:r,dim:a,grain:o,drift:s,tile:c,fine:u,fineSpeed:d}={}){let f=this.skyMat.uniforms;if(u!==void 0&&(f.uFineGrain.value=u),d!==void 0&&(f.uFineSpeed.value=d),c&&this.setGrainTile(c),s!==void 0&&(f.uGrainDrift.value=s),n!==void 0&&f.uPhotoTint.value.set(n),r!==void 0&&(f.uPhotoAmt.value=r),a!==void 0&&(f.uPhotoDim.value=a,this.photoDim=a),o!==void 0&&(f.uPhotoGrain.value=o),!t)return f.uPhotoOn.value=0,this;let p=Array.isArray(t)?t:[t],m=p.join(`|`);if(m===this.photoUrl)return f.uPhotoOn.value=1,this;this.photoUrl=m,this.slides={urls:p,tex:[],i:0,t:0,interval:3,fade:1,mixing:!1};let h=new i;return p.forEach((t,n)=>h.load(t,t=>{if(this.photoUrl!==m){t.dispose();return}t.colorSpace=e,t.wrapS=t.wrapT=l,t.anisotropy=4,this.slides.tex[n]=t,n===0&&(f.uPhoto.value=t,f.uPhotoB.value=t,f.uPhotoMix.value=0,f.uPhotoAsp.value=t.image.width/t.image.height,f.uPhotoOn.value=1)})),this}setSlideshow({interval:e,fade:t}={}){return this.slides?(e!==void 0&&(this.slides.interval=e),t!==void 0&&(this.slides.fade=t),this):this}_slides(e){let t=this.slides,n=this.skyMat.uniforms;if(!t||t.urls.length<2||!n.uPhotoOn.value)return;if(t.t+=e,!t.mixing){if(t.t<t.interval)return;let e=(t.i+1)%t.urls.length;if(!t.tex[e])return;n.uPhotoB.value=t.tex[e],t.next=e,t.mixing=!0,t.t=0}let r=Math.min(1,t.t/t.fade);n.uPhotoMix.value=r*r*(3-2*r),r>=1&&(n.uPhoto.value=t.tex[t.next],n.uPhotoMix.value=0,t.i=t.next,t.mixing=!1,t.t=0)}apply(e,t){let n=x[this.mode];return e.setClearColor(n.clear,1),e.toneMappingExposure=n.exposure,t&&(t.environmentIntensity=n.env),this}get clearColor(){return x[this.mode].clear}resize(e,t=16){this.skyMat.uniforms.uRes.value.set(e*16/9,e),[this.lattice,this.dust].forEach(n=>{n.material.uniforms.uScale.value=e*.5,n.material.uniforms.uFocus.value=t})}update(e,t){this.time+=e,this._slides(e);let n=this.skyMat.uniforms;n.uTime.value=this.time,this.lattice.material.uniforms.uTime.value=this.time,this.dust.material.uniforms.uTime.value=this.time,t&&(t.aspect&&n.uRes.value.set(n.uRes.value.y*t.aspect,n.uRes.value.y),t.getWorldDirection(this._fwd),n.uPan.value.set(Math.atan2(this._fwd.x,-this._fwd.z)*.35,Math.asin(o.clamp(this._fwd.y,-1,1))*.35))}dispose(){this.object.traverse(e=>{e.geometry?.dispose(),e.material?.dispose()}),this.object.removeFromParent()}};export{w as t};