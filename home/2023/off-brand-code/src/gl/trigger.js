import { Plane, Mesh, Geometry } from "ogl";
import Material from "./mat/trigger";
import Tween from "gsap";

const UISCALE = [1, 0.6763948498];

export class Trigger extends Mesh {
  constructor(
    gl,
    {
      size = [1, 1],
      pos = [0, 0, 0],
      alt = 0,
      t1 = null,
      col_ctrl = 0,
      callback,
      ctrl = [0, 1],
    } = {}
  ) {
    // attributes
    const att = new Float32Array([0, 0, 0, 0, 1, Math.random() * 3, 0, 0]);
    super(gl, {
      geometry: new Geometry(gl, {
        ...new Plane(gl, {
          width: size[0],
          height: size[1],
        }).attributes,
        a_ctrl: { size: 2, data: att, instanced: 1 },
      }),
      program: new Material(gl, {
        t1,
        res: [UISCALE[0] * size[0], UISCALE[1] * size[1]],
        alt,
        ctrl,
        col_ctrl,
        mask: window.app.gl.scene.assets.ripples,
      }),
    });

    this.pos = pos.map((p, i) => (i < 1 ? p * 0.5 : p));
    this.position.set(pos[0] * 0.5, pos[1] * 0.5, pos[2]);

    if (callback) {
      this.triggercount = 0;
      this.callback = callback;
    }
  }

  hovered() {
    if (this.isDone) return;

    document.documentElement.style.cursor = "pointer";

    if (this.isHovered) return;
    this.isHovered = true;

    if (this.hoveredAnim) this.hoveredAnim.kill();
    this.hoveredAnim = Tween.to(this.scale, {
      x: 0.55,
      y: 0.55,
      duration: 1.2,
      ease: "expo.out",
    });
  }

  unhovered() {
    if (this.isDone) return;
    this.isHovered = false;
    document.documentElement.style.cursor = "inherit";

    if (this.hoveredAnim) this.hoveredAnim.kill();
    this.hoveredAnim = Tween.to(this.scale, {
      x: 0.5,
      y: 0.5,
      duration: 0.8,
      ease: "expo.out",
    });
  }

  async clicked() {
    if (window.app.gl.scene.ui.isAnimating) return;
    window.app.gl.scene.ui.isAnimating = true;

    this.isDone = true;
    this.isHovered = true;

    if (this.hoveredAnim) this.hoveredAnim.kill();

    Tween.to(this.scale, {
      x: 0,
      y: 0,
      duration: 0.4,
      ease: "expo.out",
    });

    await this.callback();

    // console.log("final");
    this.setParent(null);
    window.app.gl.scene.ui.isAnimating = false;
  }

  // create() {}

  resize() {}

  render(t) {
    this.program.time = t;
  }

  // ANIMATION
}
