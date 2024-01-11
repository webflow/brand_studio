import { Transform } from "ogl";
import Tween from "gsap";

import { Ui } from "./ui.js";
import ModelMaterial from "./mat/purifier";

const UISCALE = [1, 0.6763948498];

export class Purifier extends Ui {
  constructor(gl) {
    super(gl);
  }

  get arrays() {
    return {
      fills: [
        /* Background */ {
          size: [1, 1],
          pos: [0, 0, 0],
          col_1: [0.7254901960784313, 0.8117647058823529, 0.8745098039215686],
          col_1a: [0.8274509803921568, 0.8980392156862745, 0.788235294117647],
        },
        /* large horizontal*/ {
          size: [1 * UISCALE[1] * 1.4, 0.6189054726 * 1.4],
          pos: [0, 0, 0],
          col_1: [1, 1, 1],
          col_2: [0.7254901960784313, 0.8117647058823529, 0.8745098039215686],
          col_1a: [1, 1, 1],
          col_2a: [0.8274509803921568, 0.8980392156862745, 0.788235294117647],
          col_g: [1, 0],
          mask: this.assets.other[0],
        },
        /* product bg*/ {
          size: [0.8240418118 * UISCALE[1] * 0.85, 1 * 0.85],
          pos: [-0.425, 0, 0],
          col_1: [0.8705882352941177, 0.8705882352941177, 0.8705882352941177],
          col_2: [1, 1, 1],
          col_1a: [0.8705882352941177, 0.8705882352941177, 0.8705882352941177],
          col_2a: [1, 1, 1],
          mask: this.assets.other[1],
        },
        /* blue bg */ {
          size: [1 * UISCALE[1] * 0.6, 0.4744186047 * 0.6],
          pos: [0.46, -0.5, 0],
          col_1: [
            0.111764705882352941, 0.06274509803921569, 0.13725490196078433,
          ],
          col_1a: [
            0.10196078431372549, 0.1803921568627451, 0.058823529411764705,
          ],
          col_2: [1, 1, 1],
          col_2a: [1, 1, 1],
          // col_g: [1, 0],
          mask: this.assets.other[2],
        },
      ],
      uis: [
        {
          size: 1.3,
          pos: [0, 0.9, 0],
        },
        {
          size: 0.5,
          pos: [0.45, 0.3, 0],
        },
        {
          size: 0.4,
          pos: [-0.4, -0.6, 0],
        },
        {
          size: 0.6,
          pos: [0.48, -0.5, 0],
        },
      ],
      blue: [
        {
          size: 0.5,
          pos: [0.4, 0.4, 0],
        },
        {
          size: 0.7,
          pos: [-0.4, 0.2, 0],
        },
        {
          size: 0.7,
          pos: [0.458, -0.47, 0],
        },
      ],
      int: [
        {
          size: 0.7,
          pos: [0, 0.6, 0],
          callback: this.animateSpline.bind(this),
        },
        {
          size: 0.7,
          pos: [0.5, -0.2, 0],
          callback: this.animateColor.bind(this),
        },
      ],
    };
  }

  createModel(loaded, offset) {
    this.model = new Transform();
    this.assets.model[0].scene[0].setParent(this.model);
    this.model.c = { scale: 0.5 };
    this.model.setParent(this);

    this.model.scale.set(
      this.model.c.scale * UISCALE[1],
      this.model.c.scale,
      this.model.c.scale
    );

    this.model.children[0].scale.set(0, 0, 0);
    this.model.position.x = -0.175;
    this.model.position.z = 0.3;
    this.model.position.y = 0.05;

    this.modelMaterial = new ModelMaterial(this.gl, {
      t1: this.assets.model[1],
      mtc: this.assets.model[2],
      col2: [0.4, 0.4, 0.4],
      col: [1, 1, 1],
    });
    this.model.children[0].children.forEach((child) => {
      child.children[0].program = this.modelMaterial;
    });

    this.isOn = true;
  }

  renderScene(t) {
    this.model.children[0].rotation.y = window.app.gl.mouse.ey * 0.2 + t * 0.1;
    this.model.children[0].rotation.x =
      window.app.gl.mouse.ex + Math.sin(t * 0.05) * 0.1;
    this.model.children[0].rotation.z = Math.cos(t * 0.05) * 0.2;
  }

  animateIn2(isIn) {
    if (this.animationIn2) this.animationIn2.kill();
    this.animationIn2 = Tween.to(this.model.children[0].scale, {
      x: isIn ? 1 : 0,
      y: isIn ? 1 : 0,
      z: isIn ? 1 : 0,
      duration: isIn ? 1.2 : 0.4,
      ease: "expo.out",
      delay: 1,
    });
  }

  async animateSpline() {
    window.trackingTriggers[2].click();

    return new Promise((resolve) => {
      Tween.to(this.model.children[0].position, {
        y: 0.2,
        z: 0.5,
        duration: 1.2,
        ease: "expo.out",
      });

      Tween.to(this.model.children[0].position, {
        y: 0,
        z: 0,
        duration: 1.2,
        delay: 1,
        ease: "slow.out",
      });

      const pieces = this.model.children[0].children;
      pieces.forEach((item, i) => {
        Tween.to(item.position, {
          y: -0.2 * i,
          duration: 1.2,
          ease: "expo.out",
        });

        Tween.to(item.position, {
          y: 0,
          duration: 0.8,
          delay: 1,
          ease: "expo.out",
          onComplete: () => {
            if (i === pieces.length - 1) {
              this.decreaseCount();
              resolve();
            }
          },
        });
      });
    });
  }

  async animateColor() {
    window.trackingTriggers[3].click();

    return new Promise((resolve) => {
      Tween.to(this.fills.children[0].program.uniforms.u_col_ctrl, {
        value: 1,
        duration: 0.5,
        ease: "linear",
      });
      Tween.to(this.fills.children[1].program.uniforms.u_col_ctrl, {
        value: 1,
        duration: 0.5,
        ease: "linear",
      });
      Tween.to(this.fills.children[3].program.uniforms.u_col_ctrl, {
        value: 1,
        duration: 0.5,
        ease: "linear",
      });

      Tween.to(this.modelMaterial.uniforms.u_a_col, {
        value: 1,
        duration: 0.8,
        ease: "linear",
        delay: 0.2,
        onComplete: () => {
          this.decreaseCount();
          resolve();
        },
      });
    });
  }

  reset2() {
    this.fills.children[0].program.uniforms.u_col_ctrl.value = 0;
    this.fills.children[1].program.uniforms.u_col_ctrl.value = 0;
    this.fills.children[3].program.uniforms.u_col_ctrl.value = 0;
    this.modelMaterial.uniforms.u_a_col.value = 0;
  }
}
