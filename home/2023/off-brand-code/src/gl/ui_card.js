import { Transform } from "ogl";
import Tween from "gsap";

import { Ui } from "./ui.js";
import { Fill } from "./fill";

import ModelMaterial from "./mat/model";

const UISCALE = [1, 0.6763948498];

export class Card extends Ui {
  constructor(gl) {
    super(gl);
  }

  get arrays() {
    this.createMore();

    return {
      fills: [
        /* Background */ {
          size: [1, 1],
          pos: [0, 0, 0],
          col_1: [
            0.043137254901960784, 0.09019607843137255, 0.023529411764705882,
          ],
          col_2: [
            0.10588235294117647, 0.12941176470588237, 0.08235294117647059,
          ],
          col_1a: [
            0.10196078431372549, 0.06666666666666667, 0.11372549019607843,
          ],
          col_1b: [
            0.19215686274509805, 0.1803921568627451, 0.17254901960784313,
          ],
          col_g: [0.5, 0.5],
          ctrl: [1, 0],
        },
        /* Image */ {
          size: [UISCALE[1] * 0.6, 0.7139364303 * 0.6],
          pos: [-0.52, -0.5, 0],
          col_1: [
            0.13725490196078433, 0.16862745098039217, 0.13725490196078433,
          ],
          col_2: [0.20392156862745098, 0.2980392156862745, 0.22745098039215686],
          col_g: [0.5, 0.5],
          ctrl: [1, 0],
          background: this.assets.other[0],
          background2: this.assets.other[1],
          ctrl_bg: 0,
        },
        /* stat */ {
          size: [UISCALE[1] * 0.8253424658 * 0.45, 1 * 0.45],
          pos: [0.13, -0.5, 0],
          col_1: [0.7803921568627451, 0.7411764705882353, 0.6352941176470588],
          ctrl: [1, 0],
        },
        /* card */ {
          size: [UISCALE[1] * 0.5525362319 * 0.8, 1 * 0.8],
          pos: [0.65, -0.2, 0],
          col_1: [0.5137254901960784, 0.5019607843137255, 0.47058823529411764],
          col_2: [0.9607843137254902, 0.9450980392156862, 0.8980392156862745],
          ctrl: [1, 0],
        },
      ],
      uis: [
        /*Nav */ {
          size: 1.4,
          pos: [0, 0.8, 0],
        },
        /*Title*/ {
          size: 0.7,
          pos: [-0.47, 0.3, 0],
        },
        /*Card2*/ {
          size: 0.6,
          pos: [-0.5, -0.48, 0],
        },
        /*stats*/ {
          size: 0.48,
          pos: [0.13, -0.5, 0],
        },
        /*CTA*/ {
          size: 0.43,
          pos: [0.639, -0.765, 0],
        },
        /*Colors*/ {
          size: 0.43,
          pos: [0.635, -0.55, 0],
        },
      ],
      blue: [
        {
          size: 0.7,
          pos: [-0.5, 0.35, 0],
        },
        {
          size: 0.7,
          pos: [0.6, 0.18, 0],
        },
        {
          size: 0.7,
          pos: [-0.489, -0.45, 0],
        },
      ],
      int: [
        {
          size: 0.7,
          pos: [-0.1, -0.2, 0],
          callback: () => this.animateColor(),
        },
        {
          size: 0.7,
          pos: [1, 0.6, 0],
          callback: () => this.animatePublish(),
        },
      ],
    };
  }

  createMore() {
    // console.log(this.assets.other[2]);

    this.more = new Transform();
    const more = [
      /*Nav */ {
        size: 1.485,
        pos: [0, 1, 0],
      },
      /*Export */ {
        size: 1,
        pos: [0.7, 0, 0],
      },
    ];

    more.map((fill, i) => {
      const f = new Fill(this.gl, {
        ...fill,
        t1: this.assets.other[2 + i],
        size: [
          this.assets.other[2 + i].r[0] * 0.6763948498 * fill.size,
          this.assets.other[2 + i].r[1] * 1 * fill.size,
        ],
      });
      const factor = 0 + i * 0.4;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.scaleFactor = 1 - factor;

      f.setParent(this.more);
      f.inAnimation = null;
      return f;
    });

    this.more.setParent(this);
  }

  renderScene(t) {
    if (this.model) {
      this.model.position.y = Math.sin(t * 0.07) * 0.02 + 0.05;
      this.model.position.x =
        this.model.c.addx + 0.25 + Math.cos(t * 0.08) * 0.02 + 0.05;

      this.model.children[0].rotation.y =
        this.model.c.rc + Math.sin(t * 0.02) * 0.05 + 0.1;
      this.model.children[0].rotation.z =
        window.app.gl.mouse.ey * 1.2 + 0.8 + Math.cos(t * 0.07) * 0.05 + 0.1;
      this.model.children[0].rotation.x =
        window.app.gl.mouse.ex * 1.2 - 0.3 + Math.cos(t * 0.07) * 0.05 + 0.1;
    }
  }

  createModel(loaded, offset) {
    // ** 3D MODEL

    this.model = new Transform();
    this.assets.model[0].scene[0].children[0].setParent(this.model);
    this.model.c = { scale: 0.25, xscale: 0.25 * UISCALE[1], rc: 0, addx: 0 };
    this.model.setParent(this);

    this.model.scale.set(
      this.model.c.xscale,
      this.model.c.scale,
      this.model.c.scale
    );

    this.model.position.z = 0.4;
    this.model.position.x = 0.25;
    this.model.position.y = 0.1;
    this.model.children[0].rotation.z = 0.8;
    this.model.children[0].rotation.x = -0.3;

    this.model.children[0].scale.set(0, 0, 0);

    this.modelMaterial = new ModelMaterial(this.gl, {
      t1: this.assets.model[1],
      mtc: this.assets.model[2],
      col: [0.34901960784313724, 0.3803921568627451, 0.3843137254901961],
      col2: [0.14901960784313725, 0.1607843137254902, 0.16470588235294117],
    });

    this.model.children[0].program = this.modelMaterial;

    this.isOn = true;
  }

  animateIn2(isIn) {
    if (this.cardAnimateIn) this.cardAnimateIn.kill();
    this.cardAnimateIn = Tween.to(this.model.children[0].scale, {
      x: isIn ? 1 : 0,
      y: isIn ? 1 : 0,
      z: isIn ? 1 : 0,
      duration: isIn ? 1.2 : 0.6,
      ease: "expo.out",
      delay: isIn ? 1 : 0.1,
    });
  }

  async animateColor() {
    window.trackingTriggers[0].click();
    // this.fills.children[1].program.uniforms.u_bg.value = this.assets.other[1];

    return new Promise((resolve) => {
      Tween.to(this.fills.children[0].program.uniforms.u_col_ctrl, {
        value: 1,
        duration: 1,
        ease: "back.inOut",
        onComplete: () => {
          this.decreaseCount();
          resolve();
        },
      });

      Tween.to(this.fills.children[1].program.uniforms.u_a_bgc, {
        value: 1,
        duration: 1.2,
        ease: "slow.in",
      });

      Tween.to(this.modelMaterial.uniforms.u_a_col, {
        value: 1,
        duration: 1,
        ease: "expo.out",
      });
    });
  }

  async animatePublish() {
    window.trackingTriggers[1].click();
    const returnDelay = 2;

    const animIn = async () => {
      return new Promise((resolve) => {
        window.app.gl.scene.designer.animatePublish(true);

        Tween.to(this.position, {
          z: 0.1,
          x: 0,
          delay: 0.5,
          duration: 1.2,
          ease: "expo.out",
          onComplete: resolve,
        });

        Tween.to(this.more.children[0].program.uniforms.u_a_in, {
          value: 1,
          delay: 0.5,
          duration: 0.4,
          ease: "expo.out",
        });

        // code
        Tween.to(this.more.children[1].program.uniforms.u_a_in, {
          value: 1,
          delay: 0.5,
          duration: 0.4,
          ease: "expo.out",
        });

        this.blue.children.forEach((child, i) => {
          Tween.to(child.program.uniforms.u_a_in, {
            value: 0,
            duration: 0.5,
            delay: i * 0.08,
            ease: "power3.out",
          });
        });

        this.int.children.forEach((child, i) => {
          Tween.to(child.program.uniforms.u_a_in, {
            value: 0,
            duration: 0.5,
            delay: i * 0.08,
            ease: "power3.out",
          });
        });

        // model
        Tween.to(this.model.c, {
          rc: 6,
          duration: 1.8,
          delay: 0.2,
          ease: "back.out",
        });
        Tween.to(this.model.position, {
          z: 0.5,
          duration: 1.2,
          delay: 0.3,
          ease: "expo.out",
        });
      });
    };

    const animOut = async () => {
      return new Promise((resolve) => {
        window.app.gl.scene.designer.animatePublish(false);
        // model
        Tween.to(this.model.c, {
          rc: 12.56,
          duration: 1.6,
          delay: returnDelay * 0.8,
          ease: "back.out",
        });
        Tween.to(this.model.position, {
          z: 0.4,
          duration: 1.2,
          delay: returnDelay * 0.9,
          ease: "slow.out",
        });

        Tween.to(this.position, {
          z: 0.02,
          x: -0.12,
          duration: 1.2,
          ease: "expo.inOut",
          delay: returnDelay,
        });

        Tween.to(this.more.children[0].program.uniforms.u_a_in, {
          value: 0,
          delay: returnDelay * 1.2,
          duration: 0.2,
          ease: "power2.in",
        });

        // code
        Tween.to(this.more.children[1].program.uniforms.u_a_in, {
          value: 0,
          delay: returnDelay * 0.65,
          duration: 0.4,
          ease: "expo.in",
        });

        this.blue.children.forEach((child, i) => {
          Tween.to(child.program.uniforms.u_a_in, {
            value: 1,
            duration: 1.3,

            delay: returnDelay * 1.2 + i * 0.2,
            ease: "expo.out",
          });
        });

        this.int.children.forEach((child, i) => {
          Tween.to(child.program.uniforms.u_a_in, {
            value: 1,
            duration: 1.2,
            delay: returnDelay * 1.2 + i * 0.2,

            ease: "expo.out",
            onComplete: resolve,
          });
        });
      });
    };

    return new Promise(async (resolve) => {
      await animIn();
      await animOut();

      resolve();
      this.decreaseCount();
    });
  }

  reset2() {
    this.fills.children[0].program.uniforms.u_col_ctrl.value = 0;
    this.fills.children[1].program.uniforms.u_bg.value = this.assets.other[0];
    this.fills.children[1].program.uniforms.u_a_bgc.value = 0;
    this.modelMaterial.uniforms.u_a_col.value = 0;
  }
}
