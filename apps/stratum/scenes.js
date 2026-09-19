/* Stratum - the 3D scenes. Each builder returns { destroy } plus its own
   controls, and renders through gl.js. No libraries, no network. */
import {
  M4, V3, ll2xyz, program, mesh, uvSphere, heightGrid, layeredCylinder,
  sphereLines, graticule, polyhedron, orbit, host, picker, idColor,
} from './gl.js';
import { COASTS, PLATES, PLATE_KINDS, QUAKES, CORE_LAYERS, CRYSTALS } from './geodata.js';

const HEAD = '#version 300 es\nprecision highp float;\n';

/* Reads a CSS custom property as a 0-1 rgb triple so the scenes follow
   the page theme instead of hard-coding colour. */
export function cssRGB(name, fallback = [0.5, 0.5, 0.5]){
  try{
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (/^#([0-9a-f]{6})$/i.test(v)){
      const n = parseInt(v.slice(1), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }
    const m = v.match(/-?[\d.]+/g);
    if (m && m.length >= 3) return [m[0] / 255, m[1] / 255, m[2] / 255];
  }catch(e){}
  return fallback;
}
const isDark = () => {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

/* ============================================================== GLOBE === */
export function tectonicGlobe(container, { onSelect, showQuakes = true, showPlates = true } = {}){
  let sphereProg, lineProg, ptProg, sphereMesh, coastMesh, gratMesh, plateMesh, quakeMesh;
  let hoverQuake = -1, hoverPlate = -1;
  const plateVerts = [];   // {p:[x,y,z], i} for CPU picking
  let mvp = M4.ident(), view = M4.ident(), proj = M4.ident();
  let gl;
  const H = host(container, { draw, init });
  if (!H) return { destroy(){} };

  const cam = orbit(H.canvas, { lat:14, lon:70, dist:2.55, minDist:1.35, maxDist:6 });

  function init(st){ gl = st.gl;
    sphereProg = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm;
      layout(location=2) in vec2 aUv;
      uniform mat4 uMVP, uModel; out vec3 vN; out vec3 vW; out vec2 vUv;
      void main(){ vN = mat3(uModel)*aNorm; vW = (uModel*vec4(aPos,1.)).xyz; vUv = aUv;
        gl_Position = uMVP*vec4(aPos,1.); }`,
      HEAD + `
      in vec3 vN; in vec3 vW; in vec2 vUv; out vec4 o;
      uniform vec3 uEye, uOcean, uRim, uLight; uniform float uT;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(uEye - vW);
        float lam = max(dot(N, normalize(uLight)), 0.);
        float fres = pow(1. - max(dot(N, V), 0.), 2.6);
        vec3 c = uOcean * (0.34 + 0.66*lam);
        c += uRim * fres * 0.95;
        o = vec4(c, 1.);
      }`);

    lineProg = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=3) in vec3 aCol;
      uniform mat4 uMVP; uniform float uLift;
      out vec3 vC; out vec3 vP;
      void main(){ vC = aCol; vP = normalize(aPos);
        gl_Position = uMVP*vec4(aPos*uLift,1.); }`,
      HEAD + `
      in vec3 vC; in vec3 vP; out vec4 o;
      uniform vec3 uEye; uniform float uAlpha;
      void main(){
        vec3 V = normalize(uEye);
        float facing = dot(normalize(vP), normalize(V));
        // lines on the far hemisphere stay visible but recede
        float a = facing > 0. ? 1.0 : 0.16;
        o = vec4(vC, uAlpha*a);
      }`);

    ptProg = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=3) in vec3 aMeta;
      uniform mat4 uMVP; uniform float uScale, uT, uHover;
      out float vMag; out float vFace; out float vHot;
      void main(){
        vMag = aMeta.x; vHot = (abs(aMeta.y-uHover) < .5) ? 1.0 : 0.0;
        vFace = dot(normalize(aPos), normalize(vec3(0.)-vec3(0.)+aPos));
        float pulse = 1.0 + 0.18*sin(uT*2.0 + aMeta.y);
        gl_Position = uMVP*vec4(aPos*1.006,1.);
        gl_PointSize = uScale * (3.0 + (vMag-6.0)*2.6) * pulse * (1.0 + vHot*0.7);
      }`,
      HEAD + `
      in float vMag; in float vHot; out vec4 o;
      uniform vec3 uCol, uHotCol;
      void main(){
        vec2 d = gl_PointCoord - 0.5; float r = length(d);
        if (r > 0.5) discard;
        float core = smoothstep(0.30, 0.10, r);
        float ring = smoothstep(0.50, 0.42, r) - smoothstep(0.42, 0.34, r);
        vec3 c = mix(uCol, uHotCol, vHot);
        float a = core*0.95 + ring*0.85;
        o = vec4(c, a);
      }`);

    sphereMesh = mesh(gl, { ...uvSphere(40, 80, 1), mode: gl.TRIANGLES });

    const ink = isDark() ? [0.80, 0.86, 0.90] : [0.99, 0.99, 0.97];
    coastMesh = mesh(gl, { ...sphereLines(COASTS.map(p => ({ pts:p, col:ink })), 1), mode: gl.LINES });
    const faint = isDark() ? [0.26, 0.32, 0.38] : [0.62, 0.70, 0.76];
    const g = graticule(30, 30, 1);
    gratMesh = mesh(gl, { pos:g.pos, extra:g.pos.map((_, i) => faint[i % 3]), mode: gl.LINES });

    const paths = PLATES.map((p, i) => {
      p.pts.forEach(pt => plateVerts.push({ p: ll2xyz(pt[0], pt[1], 1), i }));
      return { pts:p.pts, col: PLATE_KINDS[p.kind].col };
    });
    plateMesh = mesh(gl, { ...sphereLines(paths, 1), mode: gl.LINES });

    const qp = [], qm = [];
    QUAKES.forEach((q, i) => { qp.push(...ll2xyz(q.lat, q.lon, 1)); qm.push(q.mag, i, 0); });
    quakeMesh = mesh(gl, { pos: qp, extra: qm, mode: gl.POINTS });

    gl.enable(gl.DEPTH_TEST);
  }

  /* project a unit-sphere point to canvas pixels */
  function project(p){
    const m = mvp;
    const w = m[3]*p[0] + m[7]*p[1] + m[11]*p[2] + m[15];
    if (w <= 0) return null;
    const x = (m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12]) / w;
    const y = (m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13]) / w;
    return [(x * .5 + .5) * H.canvas.clientWidth, (1 - (y * .5 + .5)) * H.canvas.clientHeight];
  }
  const frontFacing = p => V3.dot(V3.norm(p), V3.norm(cam.eye())) > 0.02;

  function hitTest(mx, my){
    let bestQ = -1, bestQd = 22;
    QUAKES.forEach((q, i) => {
      const p = ll2xyz(q.lat, q.lon, 1);
      if (!frontFacing(p)) return;
      const s = project(p); if (!s) return;
      const d = Math.hypot(s[0] - mx, s[1] - my);
      if (d < bestQd){ bestQd = d; bestQ = i; }
    });
    if (bestQ >= 0) return { type:'quake', i:bestQ };
    let bestP = -1, bestPd = 14;
    for (const v of plateVerts){
      if (!frontFacing(v.p)) continue;
      const s = project(v.p); if (!s) continue;
      const d = Math.hypot(s[0] - mx, s[1] - my);
      if (d < bestPd){ bestPd = d; bestP = v.i; }
    }
    if (bestP >= 0) return { type:'plate', i:bestP };
    return null;
  }

  const onMove = e => {
    const r = H.canvas.getBoundingClientRect();
    const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
    hoverQuake = hit && hit.type === 'quake' ? hit.i : -1;
    hoverPlate = hit && hit.type === 'plate' ? hit.i : -1;
    H.canvas.style.cursor = hit ? 'pointer' : (cam.dragging ? 'grabbing' : 'grab');
  };
  const onClick = e => {
    if (cam.moved > 6) return;                 // a drag, not a click
    const r = H.canvas.getBoundingClientRect();
    const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (hit && onSelect) onSelect(hit.type === 'quake'
      ? { type:'quake', data: QUAKES[hit.i] }
      : { type:'plate', data: PLATES[hit.i], kind: PLATE_KINDS[PLATES[hit.i].kind] });
    else if (onSelect) onSelect(null);
  };
  H.canvas.addEventListener('pointermove', onMove);
  H.canvas.addEventListener('click', onClick);

  function draw(s){
    const dark = isDark();
    const ocean = dark ? [0.055, 0.105, 0.145] : [0.44, 0.56, 0.64];
    const rim   = cssRGB('--azurite', [0.35, 0.62, 0.85]);
    const bg    = cssRGB('--surface', dark ? [0.08,0.11,0.13] : [1,1,1]);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // idle auto-rotation, disabled for reduced-motion users
    if (!cam.dragging && !s.reduced && performance.now() - cam.idleSince > 2600) cam.lon += 0.06;

    const eye = cam.eye();
    proj = M4.persp(0.86, s.w / s.h, 0.1, 40);
    view = M4.lookAt(eye, [0,0,0], [0,1,0]);
    const model = M4.ident();
    mvp = M4.mul(proj, view);

    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    sphereProg.use();
    gl.uniformMatrix4fv(sphereProg.u.uMVP, false, mvp);
    gl.uniformMatrix4fv(sphereProg.u.uModel, false, model);
    gl.uniform3fv(sphereProg.u.uEye, eye);
    gl.uniform3fv(sphereProg.u.uOcean, ocean);
    gl.uniform3fv(sphereProg.u.uRim, rim);
    gl.uniform3fv(sphereProg.u.uLight, V3.norm([Math.sin(s.t * 0.12) * 0.8, 0.45, Math.cos(s.t * 0.12) * 0.8]));
    gl.uniform1f(sphereProg.u.uT, s.t);
    sphereMesh.draw();

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    lineProg.use();
    gl.uniformMatrix4fv(lineProg.u.uMVP, false, mvp);
    gl.uniform3fv(lineProg.u.uEye, eye);

    gl.uniform1f(lineProg.u.uLift, 1.001);
    gl.uniform1f(lineProg.u.uAlpha, 0.30); gratMesh.draw();
    gl.uniform1f(lineProg.u.uLift, 1.003);
    gl.uniform1f(lineProg.u.uAlpha, 0.95); coastMesh.draw();
    if (showPlates){
      gl.uniform1f(lineProg.u.uLift, 1.008);
      gl.uniform1f(lineProg.u.uAlpha, 1.0); plateMesh.draw();
    }
    if (showQuakes){
      ptProg.use();
      gl.uniformMatrix4fv(ptProg.u.uMVP, false, mvp);
      gl.uniform1f(ptProg.u.uScale, s.dpr * 1.6);
      gl.uniform1f(ptProg.u.uT, s.reduced ? 0 : s.t);
      gl.uniform1f(ptProg.u.uHover, hoverQuake);
      gl.uniform3fv(ptProg.u.uCol, cssRGB('--cinnabar', [0.85,0.35,0.28]));
      gl.uniform3fv(ptProg.u.uHotCol, cssRGB('--sulfur', [0.9,0.75,0.2]));
      quakeMesh.draw();
    }
    gl.depthMask(true);
  }

  return {
    destroy(){
      H.canvas.removeEventListener('pointermove', onMove);
      H.canvas.removeEventListener('click', onClick);
      cam.destroy(); H.destroy();
    },
    flyTo(lat, lon){ cam.lat = lat; cam.lon = -lon; cam.idleSince = performance.now() + 4000; },
    set showQuakes(v){ showQuakes = v; }, set showPlates(v){ showPlates = v; },
  };
}

/* =============================================================== CORE === */
export function coreColumn(container, { onSelect } = {}){
  let prog, pickProg, core, pick, selected = -1, hover = -1;
  const layers = CORE_LAYERS;
  let gl;
  const H = host(container, { draw, init });
  if (!H) return { destroy(){} };
  const cam = orbit(H.canvas, { lat:6, lon:24, dist:3.9, minDist:2.4, maxDist:8 });

  function init(st){ gl = st.gl;
    prog = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm;
      layout(location=2) in vec2 aUv;  layout(location=3) in vec3 aMeta;
      uniform mat4 uMVP, uModel; out vec3 vN; out vec3 vW; out vec2 vUv; out float vL;
      void main(){ vN = mat3(uModel)*aNorm; vW=(uModel*vec4(aPos,1.)).xyz;
        vUv=aUv; vL=aMeta.x; gl_Position=uMVP*vec4(aPos,1.); }`,
      HEAD + `
      in vec3 vN; in vec3 vW; in vec2 vUv; in float vL; out vec4 o;
      uniform vec3 uEye; uniform vec3 uCols[8]; uniform float uSel, uHover;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*43758.5453); }
      void main(){
        int li = int(vL + 0.5);
        vec3 base = uCols[li];
        // grain: a little per-layer noise so the bands read as rock
        float g = hash(floor(vec2(vUv.x*180., vUv.y*90. + vL*37.)));
        base *= 0.86 + 0.28*g;
        vec3 N = normalize(vN); vec3 V = normalize(uEye - vW);
        vec3 L = normalize(vec3(0.55, 0.8, 0.7));
        float lam = max(dot(N,L), 0.);
        float rim = pow(1.-max(dot(N,V),0.), 3.0);
        vec3 c = base*(0.34 + 0.72*lam) + rim*0.22;
        float isSel = (abs(vL-uSel) < .5) ? 1.0 : 0.0;
        float isHov = (abs(vL-uHover) < .5) ? 1.0 : 0.0;
        c = mix(c, c*1.28 + 0.10, max(isSel, isHov*0.55));
        // dim everything else once a layer is chosen
        if (uSel >= 0. && isSel < .5) c = mix(c, vec3(dot(c, vec3(.33)))*0.62, 0.62);
        o = vec4(c, 1.);
      }`);
    pickProg = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=3) in vec3 aMeta;
      uniform mat4 uMVP; out float vL;
      void main(){ vL = aMeta.x; gl_Position = uMVP*vec4(aPos,1.); }`,
      HEAD + `
      in float vL; out vec4 o;
      void main(){ int i = int(vL+0.5)+1;
        o = vec4(float(i&255)/255., float((i>>8)&255)/255., float((i>>16)&255)/255., 1.); }`);
    core = mesh(gl, { ...layeredCylinder(layers), mode: gl.TRIANGLES });
    pick = picker(gl);
    gl.enable(gl.DEPTH_TEST);
  }

  let mvp = M4.ident();
  function idAt(mx, my){
    const s = H.state;
    const x = Math.round(mx * s.dpr), y = Math.round(my * s.dpr);
    if (x < 0 || y < 0 || x >= s.w || y >= s.h) return -1;
    return pick.read(s.w, s.h, x, y, () => {
      pickProg.use();
      gl.uniformMatrix4fv(pickProg.u.uMVP, false, mvp);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      core.draw();
    });
  }
  const onMove = e => {
    const r = H.canvas.getBoundingClientRect();
    hover = idAt(e.clientX - r.left, e.clientY - r.top);
    H.canvas.style.cursor = hover >= 0 ? 'pointer' : 'grab';
  };
  const onClick = e => {
    if (cam.moved > 6) return;
    const r = H.canvas.getBoundingClientRect();
    const id = idAt(e.clientX - r.left, e.clientY - r.top);
    selected = (id === selected) ? -1 : id;
    onSelect && onSelect(selected >= 0 ? { i:selected, layer:layers[selected] } : null);
  };
  H.canvas.addEventListener('pointermove', onMove);
  H.canvas.addEventListener('click', onClick);

  function draw(s){
    const bg = cssRGB('--surface', isDark() ? [0.08,0.11,0.13] : [1,1,1]);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!cam.dragging && !s.reduced && performance.now() - cam.idleSince > 2600) cam.lon += 0.09;
    const eye = cam.eye();
    mvp = M4.mul(M4.persp(0.8, s.w / s.h, 0.1, 40), M4.lookAt(eye, [0,0,0], [0,1,0]));
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    prog.use();
    gl.uniformMatrix4fv(prog.u.uMVP, false, mvp);
    gl.uniformMatrix4fv(prog.u.uModel, false, M4.ident());
    gl.uniform3fv(prog.u.uEye, eye);
    gl.uniform3fv(prog.u.uCols, new Float32Array(layers.flatMap(l => l.col).concat([0,0,0])));
    gl.uniform1f(prog.u.uSel, selected);
    gl.uniform1f(prog.u.uHover, hover);
    core.draw();
  }

  return {
    destroy(){
      H.canvas.removeEventListener('pointermove', onMove);
      H.canvas.removeEventListener('click', onClick);
      cam.destroy(); H.destroy();
    },
    select(i){ selected = i; onSelect && onSelect(i >= 0 ? { i, layer:layers[i] } : null); },
  };
}

/* ============================================================ TERRAIN === */
/* One deterministic DEM, rendered five ways. The point is that the data
   never changes; only the raster product derived from it does. */
function hash2(x, y){
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
export function demHeight(u, v){
  let h = 0, amp = 0.55, f = 1.7;
  for (let o = 0; o < 4; o++){ h += vnoise(u * f, v * f) * amp; amp *= 0.42; f *= 2.13; }
  // a ridge running NE plus a valley, so the surface has real landform
  const ridge  = Math.exp(-Math.pow((u - v + 0.18) * 3.0, 2)) * 0.40;
  const valley = Math.exp(-Math.pow((u + v - 1.30) * 2.6, 2)) * 0.22;
  return (h - 0.45) * 0.52 + ridge - valley;
}

export function terrainLab(container, { layer = 'hillshade' } = {}){
  let prog, grid, mode = layer;
  const MODES = { hillshade:0, elevation:1, slope:2, aspect:3, contour:4 };
  let gl;
  const H = host(container, { draw, init });
  if (!H) return { destroy(){}, setLayer(){} };
  const cam = orbit(H.canvas, { lat:30, lon:26, dist:2.45, minDist:1.6, maxDist:6 });

  function init(st){ gl = st.gl;
    prog = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm;
      layout(location=2) in vec2 aUv;
      uniform mat4 uMVP, uModel; out vec3 vN; out vec3 vW; out vec2 vUv; out float vH;
      void main(){ vN=mat3(uModel)*aNorm; vW=(uModel*vec4(aPos,1.)).xyz; vUv=aUv; vH=aPos.y;
        gl_Position=uMVP*vec4(aPos,1.); }`,
      HEAD + `
      in vec3 vN; in vec3 vW; in vec2 vUv; in float vH; out vec4 o;
      uniform int uMode; uniform vec3 uEye, uRamp; uniform float uMin, uMax;
      vec3 hsv2rgb(vec3 c){
        vec4 K = vec4(1.,2./3.,1./3.,3.);
        vec3 p = abs(fract(c.xxx+K.xyz)*6.-K.www);
        return c.z*mix(K.xxx, clamp(p-K.xxx,0.,1.), c.y);
      }
      void main(){
        vec3 N = normalize(vN);
        float t = clamp((vH-uMin)/(uMax-uMin), 0., 1.);
        vec3 c;
        if (uMode == 0){                                  // hillshade
          vec3 L = normalize(vec3(-0.6, 0.72, -0.6));     // NW, 45 degrees
          float lam = max(dot(N,L), 0.);
          c = vec3(0.14 + 0.94*pow(lam, 0.85));
        } else if (uMode == 1){                           // elevation ramp
          c = mix(vec3(0.97,0.97,0.95), uRamp*0.55, pow(t,0.85));
          c = mix(c, uRamp*0.22, smoothstep(0.75,1.0,t));
        } else if (uMode == 2){                           // slope
          float slope = 1.0 - clamp(N.y, 0., 1.);
          c = mix(vec3(0.95,0.95,0.92), vec3(0.72,0.20,0.13), pow(slope*1.7, 0.8));
        } else if (uMode == 3){                           // aspect, cyclic
          float ang = atan(N.z, N.x)/6.2831853 + 0.5;
          float flatness = smoothstep(0.02, 0.14, 1.0-N.y);
          c = mix(vec3(0.85), hsv2rgb(vec3(ang, 0.52, 0.92)), flatness);
        } else {                                          // contours
          vec3 L = normalize(vec3(-0.6, 0.72, -0.6));
          float base = 0.80 + 0.18*max(dot(N,L),0.);
          float iv = vH*28.0;
          float d = abs(fract(iv)-0.5)/max(fwidth(iv),1e-4);
          float line = 1.0 - smoothstep(0.6, 1.4, d);
          float idx = abs(fract(vH*5.6)-0.5)/max(fwidth(vH*5.6),1e-4);
          float index = 1.0 - smoothstep(0.5, 1.2, idx);
          c = mix(vec3(base), vec3(0.42,0.27,0.16), max(line*0.7, index));
        }
        float fres = pow(1.-max(dot(N, normalize(uEye-vW)),0.), 3.);
        o = vec4(c + fres*0.06, 1.);
      }`);
    grid = mesh(gl, { ...heightGrid(148, demHeight, 2.2), mode: gl.TRIANGLES });
    gl.enable(gl.DEPTH_TEST);
  }

  function draw(s){
    const bg = cssRGB('--surface', isDark() ? [0.08,0.11,0.13] : [1,1,1]);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!cam.dragging && !s.reduced && performance.now() - cam.idleSince > 3200) cam.lon += 0.05;
    const eye = cam.eye();
    const mvp = M4.mul(M4.persp(0.8, s.w / s.h, 0.1, 40), M4.lookAt(eye, [0,0,0], [0,1,0]));
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    prog.use();
    gl.uniformMatrix4fv(prog.u.uMVP, false, mvp);
    gl.uniformMatrix4fv(prog.u.uModel, false, M4.ident());
    gl.uniform3fv(prog.u.uEye, eye);
    gl.uniform3fv(prog.u.uRamp, cssRGB('--azurite', [0.2,0.45,0.72]));
    gl.uniform1i(prog.u.uMode, MODES[mode] ?? 0);
    gl.uniform1f(prog.u.uMin, -0.22);
    gl.uniform1f(prog.u.uMax, 0.42);
    grid.draw();
  }

  return {
    destroy(){ cam.destroy(); H.destroy(); },
    setLayer(id){ mode = id; },
  };
}

/* ============================================================ CRYSTAL === */
function crystalGeom(c){
  const { a, b, cc = c.c, shear = c.shear, form } = { ...c, cc: c.c };
  if (form === 'hex' || form === 'rhomb'){
    const n = 6, verts = [], faces = [];
    const half = form === 'rhomb' ? cc * 0.40 : cc * 0.5;
    for (let i = 0; i < n; i++){
      const ang = i / n * Math.PI * 2 + Math.PI / 6;
      verts.push([Math.cos(ang) * a, -half, Math.sin(ang) * a]);
    }
    for (let i = 0; i < n; i++){
      const ang = i / n * Math.PI * 2 + Math.PI / 6;
      verts.push([Math.cos(ang) * a, half, Math.sin(ang) * a]);
    }
    if (form === 'rhomb'){
      // quartz habit: prism with a pyramidal termination at each end
      verts.push([0, cc * 0.92, 0]); verts.push([0, -cc * 0.92, 0]);
      const apexT = verts.length - 2, apexB = verts.length - 1;
      for (let i = 0; i < n; i++){
        const j = (i + 1) % n;
        faces.push([i, j, n + j, n + i]);
        faces.push([n + i, n + j, apexT]);
        faces.push([j, i, apexB]);
      }
    } else {
      for (let i = 0; i < n; i++){
        const j = (i + 1) % n;
        faces.push([i, j, n + j, n + i]);
      }
      faces.push([n, n+1, n+2, n+3, n+4, n+5]);
      faces.push([5, 4, 3, 2, 1, 0]);
    }
    return polyhedron(verts, faces);
  }
  // parallelepiped: shear tilts the vertical axis to make oblique systems read
  const hx = a * .5, hy = cc * .5, hz = b * .5;
  const sh = shear || 0;
  const V = [];
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) for (const sx of [-1, 1])
    V.push([sx * hx + sy * sh * hx, sy * hy, sz * hz + sy * sh * hz * 0.55]);
  // index layout: y-,z-,x-/x+ ; y-,z+,x-/x+ ; y+,z-,... etc
  const F = [
    [0,1,3,2], [4,6,7,5],        // bottom, top
    [0,2,6,4], [1,5,7,3],        // z- , z+
    [0,4,5,1], [2,3,7,6],        // x- , x+
  ];
  return polyhedron(V, F);
}

export function crystalViewer(container, { index = 0 } = {}){
  let prog, meshes = [], cur = index;
  let gl;
  const H = host(container, { draw, init });
  if (!H) return { destroy(){}, show(){} };
  const cam = orbit(H.canvas, { lat:16, lon:32, dist:4.0, minDist:2.4, maxDist:7 });

  function init(st){ gl = st.gl;
    prog = program(gl, HEAD + `
      layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm;
      uniform mat4 uMVP, uModel; out vec3 vN; out vec3 vW;
      void main(){ vN=mat3(uModel)*aNorm; vW=(uModel*vec4(aPos,1.)).xyz;
        gl_Position=uMVP*vec4(aPos,1.); }`,
      HEAD + `
      in vec3 vN; in vec3 vW; out vec4 o;
      uniform vec3 uEye, uTint;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(uEye-vW);
        vec3 L1 = normalize(vec3(0.7,0.9,0.5)), L2 = normalize(vec3(-0.6,0.2,-0.7));
        float d1 = max(dot(N,L1),0.), d2 = max(dot(N,L2),0.)*0.45;
        vec3 Hh = normalize(L1+V);
        float spec = pow(max(dot(N,Hh),0.), 46.);
        float fres = pow(1.-max(dot(N,V),0.), 2.2);
        vec3 c = uTint*(0.22 + 0.72*d1 + d2) + spec*0.55 + fres*uTint*0.75;
        o = vec4(c, 0.90);
      }`);
    meshes = CRYSTALS.map(c => mesh(gl, { ...crystalGeom(c), mode: gl.TRIANGLES }));
    gl.enable(gl.DEPTH_TEST);
  }

  function draw(s){
    const bg = cssRGB('--surface', isDark() ? [0.08,0.11,0.13] : [1,1,1]);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!cam.dragging && !s.reduced) cam.lon += 0.16;
    const eye = cam.eye();
    const mvp = M4.mul(M4.persp(0.8, s.w / s.h, 0.1, 40), M4.lookAt(eye, [0,0,0], [0,1,0]));
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    prog.use();
    gl.uniformMatrix4fv(prog.u.uMVP, false, mvp);
    gl.uniformMatrix4fv(prog.u.uModel, false, M4.ident());
    gl.uniform3fv(prog.u.uEye, eye);
    gl.uniform3fv(prog.u.uTint, cssRGB('--azurite', [0.3,0.6,0.85]));
    meshes[cur] && meshes[cur].draw();
    gl.disable(gl.BLEND);
  }

  return {
    destroy(){ cam.destroy(); H.destroy(); },
    show(i){ cur = i; },
  };
}
