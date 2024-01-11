import { Renderer } from "ogl";
import Cam from "./_camera.js";
import Scene from "./_scene.js";
import { Track } from "./util/dom.js";

function lerp(a, b, alpha) {
  return a + alpha * (b - a);
}

export class Gl {
  constructor() {
    this.wrapper = document.querySelector("[data-gl='c']");

    this.vp = {
      dpr: Math.min(window.devicePixelRatio, 2),
    };

    this.renderer = new Renderer({
      dpr: 2,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });

    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);

    this.wrapper.appendChild(this.gl.canvas);

    this.camera = new Cam(this.gl, {});
    this.camera.position.set(0, 0, 3.5);

    this.mouse = {
      x: 0,
      y: 0,
      ex: 0,
      ey: 0,
      sx: 0,
      sy: 0,
      evt: { x: null, y: null },
    };
    this.resize();

    this.scene = new Scene(this.gl);
    this.time = 0;

    this.initEvents();
    this.resize();

    this.render();

    // this.controls = new Orbit(this.camera, {
    //   target: new Vec3(0, 0, 0),
    // });
  }

  render() {
    window.requestAnimationFrame(this.render.bind(this));
    if (!this.track.flag) return;

    this.time += 0.2;

    this.mouse.ex = lerp(this.mouse.ex, this.mouse.sx, 0.05);
    this.mouse.ey = lerp(this.mouse.ey, this.mouse.sy, 0.05);
    this.scene?.moveRaycast(this.mouse.evt);

    this.track?.render();
    this.controls?.update();
    this.scene?.render(this.time);

    this.renderer.render({
      scene: this.scene,
      camera: this.camera,
    });
  }

  initEvents() {
    // resize
    new ResizeObserver((entry) => this.resize(entry[0].contentRect)).observe(
      this.wrapper
    );

    const damp = 0.2;
    // mouse
    window.addEventListener("mousemove", (e) => {
      this.mouse.evt = e;
      this.mouse.x = (e.clientX / this.vp.w) * 2 - 1;
      this.mouse.y = (e.clientY / this.vp.h) * 2 - 1;
      this.mouse.sx = this.mouse.x * damp;
      this.mouse.sy = this.mouse.y * damp;
    });

    this.wrapper.addEventListener("click", this.clicked.bind(this));

    this.track = new Track({
      element: document.querySelector("[data-gl='scroll']"),
    });
  }

  clicked() {
    this.scene?.moveRaycast(this.mouse.evt, true);
  }

  resize(entry) {
    const cw = entry ? entry.width : this.wrapper.clientWidth;
    const ch = entry ? entry.height : this.wrapper.clientHeight;

    this.vp.w = cw;
    this.vp.h = ch;
    this.vp.ratio = cw / ch;
    this.vp.viewSize = this.camera.getViewSize(this.vp.ratio);
    this.vp.viewRatio = this.vp.viewSize.w / this.vp.w;

    this.renderer.setSize(this.vp.w, this.vp.h);

    this.camera.perspective({
      aspect: this.vp.ratio,
    });

    this.scene?.resize(this.vp);
  }
}
