import { Plane, Mesh, NormalProgram } from "ogl";
import Material from "./mat/designer";
import BackgroundProgram from "./mat/designer-bg";
import Tween from "gsap";

export default class extends Mesh {
  constructor(gl) {
    super(gl);
    this.gl = gl;

    const { designer_main } = window.app.gl.scene.assets;

    this.geometry = new Plane(this.gl);
    this.program = new Material(this.gl, {
      t1: designer_main,
    });

    this.position.z = -0.01;
    this.scale.set(designer_main.info_ratio, 1, 1);

    // this.createBg();
  }

  createBg() {
    this.bg = new Mesh(this.gl, {
      geometry: new Plane(this.gl),
      program: new BackgroundProgram(this.gl),
    });
    this.bg.scale.set(1.1, 1.5, 1);
    this.bg.position.z -= 0.3;
    this.bg.setParent(this);
  }

  /** Animation */
  animateIn(isIn = true, { duration = 1.2, delay = 0.3 } = {}) {
    Tween.to(this.program.uniforms.u_a_in, {
      value: isIn ? 1 : 0,
      delay,
      duration,
      ease: "expo.out",
    });
  }

  animatePublish(isIn = true, { duration = 1.2 } = {}) {
    // console.log("publish");
    // true : in / false : out
    Tween.to(this.program.uniforms.u_a_publish, {
      value: isIn ? 1 : 0,
      duration,
      delay: isIn ? 0 : 2.5,
      ease: "expo.out",
    });
  }

  resize() {}

  render(t) {
    // console.log(t);
    this.program.time = t;
    // this.bg?.program.time = t;
  }
}
