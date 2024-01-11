import { Transform } from "ogl";
import Tween from "gsap";

import { Fill } from "./fill";
import { Trigger } from "./trigger";

export class Ui extends Transform {
  constructor(gl) {
    super();
    this.gl = gl;

    this.position.x = -0.12;
    this.position.z = 0.02;
    const scale = 1.35;
    this.scale.set(1 * scale, 0.6763948498 * scale, 1);
  }

  async load(loader, index) {
    this.assets = await loader.load2(index);

    this.create();
  }

  create() {
    const { fills, uis, blue, int } = this.arrays;
    this.triggerCount = int.length;

    this.glob = {
      depth: 0.04,
    };

    this.fills = new Transform();
    fills.map((fill, i) => {
      const f = new Fill(this.gl, fill);
      const factor = i * this.glob.depth;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.scaleFactor = 1 - factor;

      f.setParent(this.fills);
      f.inAnimation = null;
      return f;
    });
    this.fills.setParent(this);

    this.uis = new Transform();
    uis.map((fill, i) => {
      const f = new Fill(this.gl, {
        ...fill,
        t1: this.assets.ui[i],
        size: [
          this.assets.ui[i].r[0] * 0.6763948498 * fill.size,
          this.assets.ui[i].r[1] * 1 * fill.size,
        ],
      });
      const factor = 0.02 + i * this.glob.depth;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.scaleFactor = 1 - factor;

      f.setParent(this.uis);
      f.inAnimation = null;
      return f;
    });
    this.uis.setParent(this);

    // ** BLUE DIV QUADS
    this.blue = new Transform();
    blue.map((fill, i) => {
      const f = new Fill(this.gl, {
        ...fill,
        t1: this.assets.bl[i],
        size: [
          this.assets.bl[i].r[0] * 0.6763948498 * fill.size,
          this.assets.bl[i].r[1] * 1 * fill.size,
        ],
      });
      const factor = 0.08 + i * this.glob.depth;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.scaleFactor = 1 - factor;
      f.setParent(this.blue);
      f.inAnimation = null;
      return f;
    });
    this.blue.setParent(this);

    this.saveInt = int;
    this.createInt();

    this.createModel();
  }

  createInt() {
    this.int = new Transform();
    this.saveInt.map((fill, i) => {
      const f = new Trigger(this.gl, {
        ...fill,
        t1: this.assets.inter[i],
        size: [
          this.assets.inter[i].r[0] * 0.6763948498 * fill.size * 0.8,
          this.assets.inter[i].r[1] * 1 * fill.size * 0.8,
        ],
      });
      const factor = 0.5 + i * 0.02;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.setParent(this.int);
      f.inAnimation = null;
      return f;
    });
    this.int.setParent(this);
    this.isOn = true;
  }

  render(t) {
    if (!this.isOn) return;
    this.renderScene(t);

    if (this.int) {
      this.int.children.forEach((child) => {
        child.program.time = -t;
      });
    }
  }

  resize() {}

  /** ----- Animation */
  animateIn(isIn = true) {
    this.animateIn2(isIn);
    this.isAnimating = true;

    return new Promise((resolve) => {
      this.blue.children.forEach((child, i) => {
        if (child.inAnimation) child.inAnimation.kill();
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: 0 + i * 0.1,
          duration: isIn ? 1.4 : 0.8,
          ease: isIn ? "back.out" : "expo.in",
        });
      });

      this.fills.children.forEach((child, i) => {
        if (child.inAnimation) child.inAnimation.kill();
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: 0.3 + i * 0.1,
          duration: 1.2,
          ease: "expo.out",
          onComplete: () => resolve(),
        });
      });

      this.uis.children.forEach((child, i) => {
        if (child.inAnimation) child.inAnimation.kill();
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: isIn ? 0.6 + i * 0.1 : 0.1 + i * 0.1,
          duration: isIn ? 1.5 : 0.8,
          ease: "expo.out",
        });
      });

      this.int.children.forEach((child, i) => {
        if (child.inAnimation) child.inAnimation.kill();
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: isIn ? 1.2 + i * 0.2 : 0,
          duration: isIn ? 1.8 : 0.3,
          ease: isIn ? "back.out" : "expo.in",
          onComplete: () => (this.isAnimating = false),
        });
      });
    });
  }

  decreaseCount() {
    this.triggerCount--;

    if (this.triggerCount === 0) {
      setTimeout(() => {
        window.app.gl.scene.transitionScene();
      }, 800);
    }
  }

  reset() {
    this.position.z = 0.02;
    this.createInt();
    this.triggerCount = this.int.children.length;
    this.reset2();
  }
}
