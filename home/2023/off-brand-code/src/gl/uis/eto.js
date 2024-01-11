import { Geometry, Transform, Mesh, Plane } from "ogl";
import { Ui } from "../Ui.js";
import Tween from "gsap";

import PPMAt from "../mat/pp/index.js";
import SkyMat from "../mat/sky/index.js";

/** ++++++++++  Ui 3 : Eto */
export class Eto extends Ui {
  constructor(gl) {
    super(gl);
  }

  get params() {
    // params

    const { ui_tx, ui_mask } = window.app.gl.scene.assets2;

    const color = [0.29411764705882354, 0.6235294117647059, 0.8941176470588236];

    return {
      texture: ui_tx,
      mask: ui_mask,
      color,
    };
  }

  createTar() {
    this.toTexture = new Transform();
    this.create3D();

    const skytx = window.app.gl.scene.assets2.additional[2];

    this.sky = new Mesh(this.gl, {
      geometry: new Geometry(this.gl, {
        ...new Plane(this.gl).attributes,
        a_data: {
          size: 4,
          // prettier-ignore
          data: new Float32Array([
            0, (Math.random() * 2)-1 , 0, 0,
            1, (Math.random() * 2)-1, 1, 0,
            2, (Math.random() * 2)-1, 2, 0,
            3, (Math.random() * 2)-1, 0, 1,
            4, (Math.random() * 2)-1, 1, 1,
            5, (Math.random() * 2)-1, 2, 1,
            6, (Math.random() * 2)-1, 0, 2,
            7, (Math.random() * 2)-1, 1, 2,
            8, (Math.random() * 2)-1, 2, 2,
          ]),
          instanced: 1,
        },
      }),
      program: new SkyMat(this.gl, {
        t1: skytx,
      }),
    });
    // console.log();

    this.sky.setParent(this.toTexture);

    // this.animateIn();
  }

  async create3D() {
    console.time("3d");

    const model = window.app.gl.scene.assets2.additional[0];
    const tx = window.app.gl.scene.assets2.additional[1];
    tx.flipY = false;
    this.model = model.scene[0];
    this.model.setParent(this);
    this.model.children[0].program = new PPMAt(this.gl, { t1: tx });

    this.model.ctrl = {
      scale: 0,
      x: 0,
      y: -0.3,
      z: 0.0,
      rx: 0,
      ry: -1.5,
      rz: 0,
      rotFac: 1,
      base: {
        x: 0,
        y: -0.2,
        z: 0.8,
        ry: 1.9,
        rz: 0.3,
        rx: 0,
        scale: 0.4,
      },
    };

    console.timeEnd("3d");
    // this.animateIn2();
  }

  renderScene() {
    const { time } = window.app.gl;

    if (this.sky) {
      this.sky.program.time = time;
    }

    if (this.model) {
      this.model.scale.set(
        this.model.ctrl.scale,
        this.model.ctrl.scale,
        this.model.ctrl.scale
      );
      this.model.position.x = this.model.ctrl.x;
      this.model.position.y = this.model.ctrl.y;
      this.model.position.z = this.model.ctrl.z;
      this.model.rotation.x = this.model.ctrl.rx + Math.sin(time * 0.02) * 0.15;
      this.model.rotation.y = this.model.ctrl.ry + Math.cos(time * 0.05) * 0.13;
      this.model.rotation.z = this.model.ctrl.rz + Math.atan(time * 0.03) * 0.1;
    }
  }

  animateQuickstack2() {
    Tween.to([this.model.ctrl.base, this.model.ctrl], {
      x: 0.45,
      y: -0.2,
      // delay: 0.1,
      ease: "expo.out",
      duration: 1.2,
    });
  }

  // animations
  animateIn2() {
    Tween.to(this.model.ctrl, {
      x: this.model.ctrl.base.x,
      z: 1.8,
      duration: 1.5,
      ease: "expo.out",
    });

    Tween.to(this.model.ctrl, {
      scale: this.model.ctrl.base.scale,
      y: this.model.ctrl.base.y,
      ry: this.model.ctrl.base.ry,
      rz: this.model.ctrl.base.rz,
      duration: 1,
      delay: 0.4,
      ease: "slow.out",
    });

    Tween.to(this.model.ctrl, {
      z: this.model.ctrl.base.z,
      duration: 1.5,
      delay: 1,
      ease: "slow.in",
    });
  }

  animatePublish2(isIn) {
    // if (isIn) {
    //   this.model.setParent(this.toTexture);
    // } else {
    //   this.model.setParent(this);
    // }

    Tween.to(this.model.ctrl, {
      // ry: isIn ? -3 : this.model.ctrl.base.ry,
      x: isIn ? 0.1 : this.model.ctrl.base.x,
      y: isIn ? 0 : this.model.ctrl.base.y,
      z: isIn ? 1.9 : this.model.ctrl.base.z,
      rz: isIn ? 0.3 : this.model.ctrl.base.rz,
      ry: isIn ? 2.9 : this.model.ctrl.base.ry,
      scale: isIn ? 0.2 : this.model.ctrl.base.scale,
      duration: 1.2,
      delay: 0,
      ease: "expo.out",
    });
  }

  animateMobile2(isIn) {
    Tween.to(this.model.ctrl, {
      // ry: isIn ? -3 : this.model.ctrl.base.ry,
      x: isIn ? 0.1 : this.model.ctrl.base.x,
      y: isIn ? -0.05 : this.model.ctrl.base.y,
      z: isIn ? 1.9 : this.model.ctrl.base.z,
      rz: isIn ? 0 : this.model.ctrl.base.rz,
      ry: isIn ? 1.5 : this.model.ctrl.base.ry,
      scale: isIn ? 0.2 : this.model.ctrl.base.scale,
      duration: 1.2,
      delay: 0,
      ease: "expo.out",
    });
  }

  animateCMS2(isIn) {
    Tween.to(this.model.ctrl, {
      z: isIn ? 0.1 : this.model.ctrl.base.z,
      y: isIn ? 0 : this.model.ctrl.base.y,
      x: isIn ? 0 : this.model.ctrl.base.x,
      scale: isIn ? 0.0 : this.model.ctrl.base.scale,
      duration: 1.2,
      delay: 0,
      ease: "expo.out",
    });
  }
}
