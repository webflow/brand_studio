import { Transform, Box, Mesh, NormalProgram } from "ogl";
import { Ui } from "../Ui.js";
import Tween from "gsap";

import PuriMat from "../mat/puri/index.js";
import BoxMat from "../mat/box/index.js";

/** ++++++++++  Ui 4 : Otru */
export class Otru extends Ui {
  constructor(gl) {
    super(gl);
  }

  get params() {
    // params

    const { ui_tx, ui_mask } = window.app.gl.scene.assets2;

    const color = [
      0.25098039215686274, 0.058823529411764705, 0.03137254901960784,
    ];

    return {
      texture: ui_tx,
      mask: ui_mask,
      color,
    };
  }

  createTar() {
    this.toTexture = new Transform();
    this.create3D();

    this.box = new Mesh(this.gl, {
      geometry: new Box(this.gl),
      program: new BoxMat(this.gl),
    });
    //
    // m.rotation.x = 0.4;
    this.box.rotation.y = Math.PI / 4;
    this.box.position.y = 0.5;
    this.box.scale.set(2.5, 2.5, 2.5);
    // m.scale.set(1, 1, 1);
    // m.position.x = 1;

    this.box.setParent(this.toTexture);

    // this.animateIn();
  }

  async create3D() {
    console.time("3d");

    const model = window.app.gl.scene.assets2.additional[0];
    const tx = window.app.gl.scene.assets2.additional[1];
    tx.flipY = false;
    this.model = model.scene[0];
    this.model.setParent(this);
    this.model.children[0].program = new PuriMat(this.gl, { t1: tx });

    this.model.ctrl = {
      scale: 0,
      x: 0,
      y: 0,
      z: 0.4,
      rx: 0,
      ry: 0,
      rz: 0,
      rotFac: 1,
      base: {
        x: 0,
        y: 0,
        z: 0.4,
        rx: 0,
        ry: 0,
        rz: 0,
        scale: 0.8,
      },
    };

    console.timeEnd("3d");
    // this.animateIn2();
  }

  renderScene() {
    const { time } = window.app.gl;
    // console.l = og("rendering");
    if (this.model) {
      this.model.scale.set(
        this.model.ctrl.scale,
        this.model.ctrl.scale,
        this.model.ctrl.scale
      );
      this.model.position.x = this.model.ctrl.x;
      this.model.position.y =
        this.model.ctrl.y +
        Math.sin(time * 0.05) * 0.03 * this.model.ctrl.rotFac;
      this.model.position.z =
        this.model.ctrl.z +
        Math.cos(time * 0.05) * 0.03 * this.model.ctrl.rotFac;
      this.model.rotation.x = this.model.ctrl.rx;
      this.model.rotation.y = this.model.ctrl.ry + time * 0.02;
      this.model.rotation.z = this.model.ctrl.rz;

      this.box.rotation.y = 0.5 + window.app.gl.mouse.ex * 3;
    }
  }

  // animations
  animateIn2() {
    Tween.to(this.model.ctrl, {
      scale: this.model.ctrl.base.scale,
      // delay: 0.5,
      duration: 1.8,
      ease: "back.out",
    });
  }

  animateMobile2(isIn) {
    // if (isIn) {
    //   this.model.setParent(this.toTexture);
    // } else {
    //   // setTimeout(() => {
    //   this.model.setParent(this);
    //   // }, 600);
    //   // this.model.setParent(this);
    // }

    Tween.to(this.model.ctrl, {
      scale: isIn ? 0.32 : this.model.ctrl.base.scale,
      y: isIn ? -0.14 : this.model.ctrl.base.y,
      x: isIn ? 0.015 : this.model.ctrl.base.x,
      rotFac: isIn ? 0 : 1,
      // delay: 0.5,
      duration: 0.8,
      ease: "expo.out",
    });
  }

  animateCMS2(isIn) {
    // if (isIn) {
    //   this.model.setParent(this.toTexture);
    // } else {
    //   this.model.setParent(this);
    // }

    Tween.to(this.model.ctrl, {
      scale: isIn ? 0.5 : this.model.ctrl.base.scale,
      y: isIn ? -0.15 : this.model.ctrl.base.y,
      rotFac: isIn ? 0 : 1,
      // delay: 0.5,
      duration: 1.2,
      ease: "expo.out",
    });
  }

  animatePublish2(isIn) {
    // if (isIn) {
    //   this.model.setParent(this.toTexture);
    // } else {
    //   this.model.setParent(this);
    // }

    // console.log(isIn);

    Tween.to(this.model.ctrl, {
      // scale: isIn ? 0.6 : this.model.ctrl.base.scale,
      z: isIn ? 1 : this.model.ctrl.base.z,
      rx: isIn ? -0.2 : this.model.ctrl.base.rx,
      ry: isIn ? 0.2 : this.model.ctrl.base.ry,
      rotFac: isIn ? 2 : 1,
      // delay: 0.5,
      duration: 1.2,
      ease: "expo.out",
    });
  }
}
