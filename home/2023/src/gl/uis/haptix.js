import { Transform, Cylinder, NormalProgram, Sphere, Mesh } from "ogl";
import { Ui } from "../Ui.js";
import Tween from "gsap";

import CCMat from "../mat/cc";
// import { loadTexture, loadModel, ASSETS } from "../util/loader.js";

/** ++++++++++  Ui 2 : haptix */
export class Haptix extends Ui {
  constructor(gl) {
    super(gl);
  }

  get params() {
    const { ui_tx, ui_mask } = window.app.gl.scene.assets2;

    const color = [0.9, 0.9, 0.9];

    return {
      texture: ui_tx,
      mask: ui_mask,
      color,
    };
  }

  async createTar() {
    this.isReady = false;
    this.toTexture = new Transform();
    await this.create3D();
    this.isReady = true;

    // const m = new Mesh(this.gl, {
    //   geometry: new Sphere(this.gl),
    //   program: new NormalProgram(this.gl),
    //   mode: this.gl.LINES,
    // });

    // m.scale.set(2, 2, 2);
    // m.position.x = 0.9;
    // m.position.y = 0.3;

    // m.setParent(this.toTexture);
  }

  async create3D() {
    // console.time("3d");

    const model = window.app.gl.scene.assets2.additional[0];
    const tx = window.app.gl.scene.assets2.additional[1];
    const mtc = window.app.gl.scene.assets2.additional[2];
    tx.flipY = false;
    this.model = model.scene[0].children[0];
    this.model.program = new CCMat(this.gl, { t1: tx, mtc });

    // console.log(this.model);
    // console.log(tx);

    this.model.ctrl = {
      scale: 0.3,
      x: 0.3,
      y: 0,
      z: 0.4,
      rx: 0,
      ry: 0,
      rz: 0,
      rotFac: 1,
      base: {
        x: 0.3,
        y: 0,
        z: 0.4,
        scale: 0.3,
      },
    };

    this.model.scale.set(0, 0, 0);
    this.model.position.x = this.model.ctrl.x;
    this.model.position.y = this.model.ctrl.y;
    this.model.position.z = this.model.ctrl.z;

    this.model.setParent(this);

    // console.timeEnd("3d");
  }

  renderScene() {
    const { time } = window.app.gl;
    // console.l = og("rendering");
    if (this.model) {
      this.model.rotation.x = Math.sin(time * 0.02) * this.model.ctrl.rotFac;
      this.model.rotation.y =
        Math.cos(time * 0.01) * 0.05 * this.model.ctrl.rotFac * 3;

      this.model.rotation.z = 0.9 + Math.atan(time * 0.002);

      this.model.position.x = this.model.ctrl.x + window.app.gl.mouse.ex * 0.1;
      this.model.position.y = this.model.ctrl.y;
      this.model.position.z = this.model.ctrl.z;
      // this.model.position.y = window.app.gl.mouse.ey;
    }
  }

  // animations
  animateIn2() {
    Tween.to(this.model.scale, {
      x: this.model.ctrl.scale,
      y: this.model.ctrl.scale,
      z: this.model.ctrl.scale,
      // delay: 0.5,
      duration: 2,
      ease: "elastic.out",
    });
  }

  animateMobile2(isIn) {
    const params = {
      duration: 1.2,
      ease: "expo.out",
    };

    const paramsCtrl = {
      x: isIn ? 0 : this.model.ctrl.base.x,
      y: isIn ? 0.1 : this.model.ctrl.base.y,
      z: isIn ? 0.3 : this.model.ctrl.base.x,
      // rotFac: isIn ? 1.5 : 1,
      ...params,
    };

    const paramsScale = {
      x: isIn ? 0.15 : this.model.ctrl.base.scale,
      y: isIn ? 0.15 : this.model.ctrl.base.scale,
      z: isIn ? 0.15 : this.model.ctrl.base.scale,
      ...params,
    };

    Tween.to(this.model.scale, {
      ...paramsScale,
      ...params,
      ease: "elastic.out",
    });

    Tween.to(this.model.ctrl, {
      ...paramsCtrl,
      ...params,
    });

    // if (isIn) {
    //   this.model.setParent(this.toTexture);
    // } else {
    //   this.model.setParent(this);
    // }
  }

  animateCMS2(isIn) {
    const params = {
      duration: 1.2,
      ease: "expo.out",
    };

    const paramsCtrl = {
      x: isIn ? -0.25 : this.model.ctrl.base.x,
      y: isIn ? -0.1 : this.model.ctrl.base.y,
      z: isIn ? 0.3 : this.model.ctrl.base.z,
      rotFac: isIn ? 0.1 : 1,
    };

    const paramsScale = {
      x: isIn ? 0.2 : this.model.ctrl.base.scale,
      y: isIn ? 0.2 : this.model.ctrl.base.scale,
      z: isIn ? 0.2 : this.model.ctrl.base.scale,
    };

    Tween.to(this.model.scale, {
      ...paramsScale,
      ...params,
    });

    Tween.to(this.model.ctrl, {
      ...paramsCtrl,
      ...params,
    });

    Tween.to(this.model.program.uniforms.u_a_cms, {
      value: isIn ? 1 : 0,
      ...params,
    });
  }

  animatePublish2(isIn) {
    const params = {
      duration: 1.2,
      ease: "expo.out",
    };

    const paramsCtrl = {
      x: isIn ? this.model.ctrl.base.x + 0.1 : this.model.ctrl.base.x,
      y: isIn ? 0.01 : this.model.ctrl.base.y,
      z: isIn ? 1 : this.model.ctrl.base.z,
      rotFac: isIn ? 3 : 1,
    };

    const paramsScale = {
      x: isIn ? 0.25 : this.model.ctrl.base.scale,
      y: isIn ? 0.25 : this.model.ctrl.base.scale,
      z: isIn ? 0.25 : this.model.ctrl.base.scale,
    };

    Tween.to(this.model.scale, {
      ...paramsScale,
      ...params,
    });

    Tween.to(this.model.ctrl, {
      ...paramsCtrl,
      ...params,
    });

    // if (isIn) {
    //   this.model.setParent(this.toTexture);
    // } else {
    //   this.model.setParent(this);
    // }
  }
}
