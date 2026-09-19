/* Stratum - minimal WebGL2 engine. No dependencies, no network.
   Covers: mat4/vec3 math, program + mesh helpers, geometry builders,
   an orbit camera with pointer/touch/wheel, colour-ID picking, and a
   render loop that idles when the canvas is off screen. */

/* ------------------------------------------------------------------ math */
export const M4 = {
  ident: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  mul(a, b){
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++){
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  },
  persp(fovy, aspect, near, far){
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  },
  lookAt(eye, at, up){
    const z = V3.norm(V3.sub(eye, at));
    const x = V3.norm(V3.cross(up, z));
    const y = V3.cross(z, x);
    return new Float32Array([
      x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -V3.dot(x,eye), -V3.dot(y,eye), -V3.dot(z,eye), 1]);
  },
  rotY(a){ const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); },
  rotX(a){ const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); },
  trans(x, y, z){ const m = M4.ident(); m[12]=x; m[13]=y; m[14]=z; return m; },
  scale(x, y, z){ const m = M4.ident(); m[0]=x; m[5]=y===undefined?x:y; m[10]=z===undefined?x:z; return m; },
};
export const V3 = {
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm(a){ const l = V3.len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; },
  scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
};
/* lat/lon in degrees -> unit sphere xyz (y up, 0 lon toward +z) */
export function ll2xyz(lat, lon, r = 1){
  const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
  return [r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l)];
}

/* --------------------------------------------------------------- program */
export function program(gl, vs, fs){
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = new Proxy({}, { get:(c, k) => (k in c ? c[k] : (c[k] = gl.getUniformLocation(p, k))) });
  return { p, u, use(){ gl.useProgram(p); return this; } };
}

/* ------------------------------------------------------------------ mesh */
export function mesh(gl, { pos, norm, uv, extra, idx, mode = gl.TRIANGLES }){
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = (data, loc, size) => {
    if (!data) return;
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  buf(pos, 0, 3); buf(norm, 1, 3); buf(uv, 2, 2); buf(extra, 3, 3);
  let count = pos.length / 3;
  if (idx){
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    // the type must follow the array we actually built, not the index count:
    // a mesh can have >65535 indices while every index still fits in 16 bits
    const big = count > 65535;
    const arr = big ? new Uint32Array(idx) : new Uint16Array(idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    count = idx.length;
    var type = big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
  }
  gl.bindVertexArray(null);
  return {
    vao, count, mode, indexed: !!idx, type,
    draw(){
      gl.bindVertexArray(vao);
      if (this.indexed) gl.drawElements(mode, count, type, 0);
      else gl.drawArrays(mode, 0, count);
    },
  };
}

/* ------------------------------------------------------------- geometry */
export function uvSphere(rows = 48, cols = 96, r = 1){
  const pos = [], norm = [], uv = [], idx = [];
  for (let i = 0; i <= rows; i++){
    const v = i / rows, phi = v * Math.PI - Math.PI / 2;
    for (let j = 0; j <= cols; j++){
      const u = j / cols, lam = u * Math.PI * 2 - Math.PI;
      const x = Math.cos(phi) * Math.sin(lam), y = Math.sin(phi), z = Math.cos(phi) * Math.cos(lam);
      pos.push(x * r, y * r, z * r); norm.push(x, y, z); uv.push(u, v);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++){
    const a = i * (cols + 1) + j, b = a + cols + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { pos, norm, uv, idx };
}

/* A grid whose heights come from a callback: used for the terrain lab. */
export function heightGrid(n, fn, size = 2){
  const pos = [], norm = [], uv = [], idx = [];
  const H = (i, j) => fn(i / n, j / n);
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++){
    const u = i / n, v = j / n;
    pos.push((u - .5) * size, H(i, j), (v - .5) * size);
    uv.push(u, v);
    const e = 1 / n * size;
    const hL = H(Math.max(0, i - 1), j), hR = H(Math.min(n, i + 1), j);
    const hD = H(i, Math.max(0, j - 1)), hU = H(i, Math.min(n, j + 1));
    norm.push(...V3.norm([hL - hR, 2 * e, hD - hU]));
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){
    const a = i * (n + 1) + j, b = a + n + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { pos, norm, uv, idx };
}

/* A stack of cylinder segments, one per stratigraphic layer. `extra`
   carries a per-vertex layer index so one draw call can pick a colour
   and a pick-id per band. */
export function layeredCylinder(layers, seg = 56, r = .42, targetH = 2.5){
  const pos = [], norm = [], uv = [], extra = [], idx = [];
  const raw = layers.reduce((s, l) => s + l.thick, 0);
  const k = targetH / raw;
  let y = -targetH / 2;
  layers.forEach((L, li) => {
    const t = L.thick * k;
    const y0 = y, y1 = y + t; y = y1;
    const start = pos.length / 3;
    for (let s = 0; s <= seg; s++){
      const a = s / seg * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
      for (const yy of [y0, y1]){
        pos.push(cx * r, yy, cz * r); norm.push(cx, 0, cz);
        uv.push(s / seg, (yy - y0) / t); extra.push(li, 0, 0);
      }
    }
    for (let s = 0; s < seg; s++){
      const a = start + s * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    // cap each end of the whole core
    if (li === 0 || li === layers.length - 1){
      const capY = li === 0 ? y0 : y1, ny = li === 0 ? -1 : 1;
      const c = pos.length / 3;
      pos.push(0, capY, 0); norm.push(0, ny, 0); uv.push(.5, .5); extra.push(li, 0, 0);
      for (let s = 0; s <= seg; s++){
        const a = s / seg * Math.PI * 2;
        pos.push(Math.cos(a) * r, capY, Math.sin(a) * r);
        norm.push(0, ny, 0); uv.push(0, 0); extra.push(li, 0, 0);
      }
      for (let s = 0; s < seg; s++){
        if (ny > 0) idx.push(c, c + 1 + s, c + 2 + s);
        else idx.push(c, c + 2 + s, c + 1 + s);
      }
    }
  });
  return { pos, norm, uv, extra, idx };
}

/* Polyline set on a sphere, emitted as GL_LINES. */
export function sphereLines(paths, r = 1, tint = [1,1,1]){
  const pos = [], extra = [];
  for (const path of paths){
    const pts = path.pts || path;
    const col = path.col || tint;
    for (let i = 0; i < pts.length - 1; i++){
      const a = ll2xyz(pts[i][0], pts[i][1], r);
      const b = ll2xyz(pts[i + 1][0], pts[i + 1][1], r);
      // subdivide so long segments hug the sphere
      const steps = Math.max(1, Math.ceil(V3.len(V3.sub(b, a)) * 24));
      for (let s = 0; s < steps; s++){
        const p0 = V3.scale(V3.norm(lerp3(a, b, s / steps)), r);
        const p1 = V3.scale(V3.norm(lerp3(a, b, (s + 1) / steps)), r);
        pos.push(...p0, ...p1); extra.push(...col, ...col);
      }
    }
  }
  return { pos, extra, norm: null, uv: null };
}
const lerp3 = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

/* Lat/lon graticule. */
export function graticule(stepLat = 30, stepLon = 30, r = 1){
  const paths = [];
  for (let la = -60; la <= 60; la += stepLat){
    const p = []; for (let lo = -180; lo <= 180; lo += 5) p.push([la, lo]);
    paths.push(p);
  }
  for (let lo = -180; lo < 180; lo += stepLon){
    const p = []; for (let la = -90; la <= 90; la += 5) p.push([la, lo]);
    paths.push(p);
  }
  return sphereLines(paths, r);
}

/* Convex polyhedron from a vertex list + face list (crystal systems). */
export function polyhedron(verts, faces){
  const pos = [], norm = [];
  for (const f of faces){
    for (let i = 1; i < f.length - 1; i++){
      const a = verts[f[0]], b = verts[f[i]], c = verts[f[i + 1]];
      const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a)));
      pos.push(...a, ...b, ...c); norm.push(...n, ...n, ...n);
    }
  }
  return { pos, norm, uv: null, idx: null };
}

/* --------------------------------------------------------------- orbit */
export function orbit(el, { onChange, lat = 18, lon = 20, dist = 3.1, minDist = 1.6, maxDist = 7, autoSpin = 0 } = {}){
  const st = { lat, lon, dist, autoSpin, dragging:false, idleSince: performance.now() };
  let px = 0, py = 0, pinch = 0;
  const clamp = () => {
    st.lat = Math.max(-85, Math.min(85, st.lat));
    st.dist = Math.max(minDist, Math.min(maxDist, st.dist));
  };
  const down = e => {
    if (e.button !== undefined && e.button !== 0) return;
    st.dragging = true; st.moved = 0;
    px = e.clientX; py = e.clientY;
    el.setPointerCapture?.(e.pointerId);
  };
  const move = e => {
    if (!st.dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    st.moved += Math.abs(dx) + Math.abs(dy);
    st.lon -= dx * .5; st.lat += dy * .5; clamp();
    st.idleSince = performance.now();
    onChange && onChange(st);
  };
  const up = e => { st.dragging = false; el.releasePointerCapture?.(e.pointerId); };
  const wheel = e => {
    e.preventDefault();
    st.dist *= 1 + Math.sign(e.deltaY) * .1; clamp();
    st.idleSince = performance.now();
  };
  const touchMove = e => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                         e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) { st.dist *= pinch / d; clamp(); }
    pinch = d;
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive:false });
  el.addEventListener('touchmove', touchMove, { passive:false });
  el.addEventListener('touchend', () => { pinch = 0; });
  st.eye = () => {
    const p = st.lat * Math.PI / 180, l = st.lon * Math.PI / 180;
    return [st.dist * Math.cos(p) * Math.sin(l), st.dist * Math.sin(p), st.dist * Math.cos(p) * Math.cos(l)];
  };
  st.destroy = () => {
    el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    el.removeEventListener('wheel', wheel); el.removeEventListener('touchmove', touchMove);
  };
  return st;
}

/* ----------------------------------------------------------- scene host */
/* Creates the canvas, sizes it to the container with a DPR cap, runs the
   loop only while visible, and honours prefers-reduced-motion. */
export function host(container, { draw, init, alpha = true } = {}){
  const canvas = document.createElement('canvas');
  // absolute so the canvas never feeds its own size back into layout:
  // with a percentage height in an auto-height parent it grows every frame
  canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  container.append(canvas);
  const gl = canvas.getContext('webgl2', { antialias:true, alpha, premultipliedAlpha:false });
  if (!gl){
    canvas.remove();
    container.append(Object.assign(document.createElement('div'), {
      className:'empty',
      textContent:'This view needs WebGL, which this browser has turned off. Every other part of the app works without it.' }));
    return null;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { gl, canvas, w:1, h:1, dpr:1, t:0, reduced, visible:true };

  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
    state.w = w; state.h = h; state.dpr = dpr;
    gl.viewport(0, 0, w, h);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(es => { state.visible = es[0].isIntersecting; },
    { threshold: 0.01 });
  io.observe(canvas);

  init && init(state);
  resize();

  let raf = 0, t0 = performance.now(), stopped = false;
  function frame(now){
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    if (!state.visible || document.hidden) return;
    state.t = (now - t0) / 1000;
    resize();
    draw(state);
  }
  raf = requestAnimationFrame(frame);

  return {
    canvas, gl, state,
    destroy(){
      if (stopped) return;
      stopped = true; cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      const lose = gl.getExtension('WEBGL_lose_context');
      lose && lose.loseContext();
      canvas.remove();
    },
  };
}

/* --------------------------------------------------------- pick support */
/* Renders ids into an offscreen target and reads one pixel back. */
export function picker(gl){
  const fb = gl.createFramebuffer();
  const tex = gl.createTexture();
  const rb = gl.createRenderbuffer();
  let W = 0, H = 0;
  function size(w, h){
    if (w === W && h === H) return;
    W = w; H = h;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  return {
    read(w, h, x, y, renderIds){
      size(w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      renderIds();
      const px = new Uint8Array(4);
      gl.readPixels(x, h - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      return px[3] === 0 ? -1 : (px[0] | (px[1] << 8) | (px[2] << 16));
    },
  };
}
export const idColor = i => [((i + 1) & 255) / 255, (((i + 1) >> 8) & 255) / 255, (((i + 1) >> 16) & 255) / 255];
