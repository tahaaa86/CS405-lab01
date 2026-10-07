// CS405 Â· Lab 1 â€” your first triangle in WebGPU (starter)
// Work through the TODOs in order. After each one, check the matching
// checkpoint on the lab slides. The reference solution is in ../lab1-solution/.

const canvas = document.querySelector('canvas');
if (!navigator.gpu) throw new Error('WebGPU not available');

const adapter = await navigator.gpu.requestAdapter();
const device  = await adapter.requestDevice();

const ctx = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({ device, format, alphaMode: 'opaque' });
console.log('WebGPU ready:', format);

const SHADER = `
  struct U {time: f32, aspect: f32, mouse: vec2f};
  @group(0) @binding(0) var<uniform> u: U;

  struct VSOut {
    @builtin(position) pos: vec4f,
    @location(0) colour: vec4f
  };


  @vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {

    // two triangels for square
    var p = array<vec2f, 6>(
      vec2f(-0.25, -0.25), vec2f( 0.25, -0.25), vec2f( 0.25,  0.25),
      vec2f(-0.25, -0.25), vec2f( 0.25,  0.25), vec2f(-0.25,  0.25));
    var c = array<vec3f, 6>(
      vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0),
      vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(1.0, 1.0, 0.0));


    let a = u.time;
    var q = vec2f(p[i].x * cos(a) - p[i].y * sin(a), p[i].x * sin(a) + p[i].y * cos(a)); // changed to var in order to modify it
    
    q.x = q.x / u.aspect;
    q = q + u.mouse;

    var out: VSOut;
    out.pos = vec4f(q, 0.0,1.0);
    out.colour = vec4f(c[i], 1.0);
    return out;
  }
  @fragment fn fs(in: VSOut) -> @location(0) vec4f {
    return in.colour;
  }` ;

const module = device.createShaderModule({ code: SHADER });

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs' },
  fragment: { module, entryPoint: 'fs', targets: [{ format }] }
});


const ubuf = device.createBuffer({
  size: 16,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});

const bind = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: ubuf } }]
});

const t0 = performance.now();

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
}
window.addEventListener('resize', resize);
resize();

// mouse follow
const mouse = [0, 0];
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse[0] =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  mouse[1] = -(((e.clientY - r.top) / r.height) * 2 - 1);
});

function frame() {

  const t = (performance.now() - t0) * 0.001;

  device.queue.writeBuffer(ubuf, 0, new Float32Array([t, canvas.width / canvas.height, mouse[0], mouse[1]]));

  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({ colorAttachments: [{
    view: ctx.getCurrentTexture().createView(),
    clearValue: { r: 0.19, g: 0.2, b: 0.6, a: 1 },
    loadOp: 'clear', storeOp: 'store' }] });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bind);
  pass.draw(6);
  pass.end();

  device.queue.submit([enc.finish()]);

  requestAnimationFrame(frame);
}
frame();