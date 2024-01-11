import { Transform } from "ogl";
import Tween from "gsap";

import { Ui } from "./ui.js";
import { Fill } from "./fill";

import ModelMaterial from "./mat/model";

const UISCALE = [1, 0.6763948498];

export class Plane extends Ui {
  constructor(gl) {
    super(gl);
  }

  get arrays() {
    this.createMore();

    return {
      fills: [
        {
          size: [1, 1],
          pos: [0, 0, 0],
          col_1: [
            0.03529411764705882, 0.16862745098039217, 0.20784313725490197,
          ],
        },
        /*Main Card*/ {
          size: [UISCALE[1] * 0.9614643545 * 0.7, 1 * 0.7],
          pos: [-0.45, -0.1, 0],
          ctrl: [1, 0],
          background: this.assets.other[5],
          col_1: [
            0.03529411764705882, 0.16862745098039217, 0.20784313725490197,
          ],
          mask: this.assets.other[6],
        },
      ],
      uis: [
        /*Nav*/ {
          size: 1.35,
          pos: [0, 0.8, 0],
        },
        /*main card*/ {
          size: 0.7,
          pos: [-0.45, -0.1, 0],
        },
        /*temp qs*/ {
          size: 0.75,
          pos: [0.44, -0.1, 0],
        },
      ],
      blue: [
        /* Stacked Cards */ {
          size: 0.8,
          pos: [0.45, -0.08, 0],
        },
        /* Nav */ {
          size: 1.5,
          pos: [0, 0.75, 0],
        },
        /* Stacked Cards */ {
          size: 0.5,
          pos: [0.9, -0.73, 0],
        },
      ],
      int: [
        {
          size: 0.7,
          pos: [0.4, -0.18, 0],
          callback: () => this.animateQuick(),
        },
        {
          size: 0.7,
          pos: [0, 0.8, 0],
          callback: () => this.animateMobile(),
        },
      ],
    };
  }

  createMore() {
    const fills = [
      /*Sphere Card*/ {
        size: [UISCALE[1] * 0.68, 0.5922330097 * 0.68],
        pos: [0.44, 0.19, 0],
        background: this.assets.other[0],
        col_1: [0.03529411764705882, 0.16862745098039217, 0.20784313725490197],
        mask: this.assets.other[6],
      },
      /*Small Card*/ {
        size: [UISCALE[1] * 0.34, 0.8235294118 * 0.34],
        pos: [0.223, -0.48, 0],
        col_1: [0.2549019607843137, 0.3803921568627451, 0.43529411764705883],
        col_2: [0.03529411764705882, 0.16862745098039217, 0.20784313725490197],
        mask: this.assets.other[8],
      },
      /*Small Card*/ {
        size: [UISCALE[1] * 0.35, 0.8235294118 * 0.35],
        pos: [0.653, -0.475, 0],
        col_1: [0.047058823529411764, 0.10196078431372549, 0.12156862745098039],
        col_2: [0.03529411764705882, 0.16862745098039217, 0.20784313725490197],
        mask: this.assets.other[8],
      },
    ];

    this.morefills = new Transform();
    fills.map((fill, i) => {
      const f = new Fill(this.gl, fill);
      const factor = 0.06 + i * 0.04;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.setParent(this.morefills);
      f.inAnimation = null;
      return f;
    });
    this.morefills.setParent(this);

    const uis = [
      /*sphere card*/ {
        size: 0.75 * 0.9,
        pos: [0.44, 0.19, 0],
      },
      /*small 1*/ {
        size: 0.36 * 0.9,
        pos: [0.223, -0.46, 0],
      },
      /*small 2 */ {
        size: 0.37 * 0.9,
        pos: [0.653, -0.473, 0],
      },
    ];

    this.moreuis = new Transform();
    uis.map((fill, i) => {
      const f = new Fill(this.gl, {
        ...fill,
        t1: this.assets.other[i + 1],
        size: [
          this.assets.other[i + 1].r[0] * 0.6763948498 * fill.size,
          this.assets.other[i + 1].r[1] * 1 * fill.size,
        ],
      });
      const factor = 0.1 + i * 0.04;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.setParent(this.moreuis);
      f.inAnimation = null;
      return f;
    });
    this.moreuis.setParent(this);

    const mobile = [
      /*sphere card*/ {
        size: 0.4,
        pos: [0, 0.7, 0],
      },
    ];

    this.mobileuis = new Transform();
    mobile.map((fill, i) => {
      const f = new Fill(this.gl, {
        ...fill,
        t1: this.assets.other[i + 4],
        size: [
          this.assets.other[i + 4].r[0] * 0.6763948498 * fill.size,
          this.assets.other[i + 4].r[1] * 1 * fill.size,
        ],
      });
      const factor = 0.1 + i * 0.04;
      f.position.z += factor;
      f.scale.set(1 - factor, 1 - factor, 1);
      f.setParent(this.mobileuis);
      f.inAnimation = null;
      return f;
    });
    this.mobileuis.setParent(this);
  }

  renderScene(t) {
    if (this.model) {
      this.model.position.y =
        this.model.c.addy - 0.35 + Math.sin(t * 0.1) * 0.02;
      this.model.position.z = 0.5 + Math.sin(t * 0.1) * 0.02;
      this.model.children[0].rotation.y = this.model.c.ry;
    }
  }

  createModel() {
    this.model = new Transform();
    this.assets.model[0].scene[0].children[0].setParent(this.model);
    this.model.c = {
      scale: 0.2,
      scalex: 0.22 * UISCALE[1],
      savex: 0.5,
      addy: 0,
      ry: Math.PI / 1.5,
    };
    this.model.setParent(this);

    this.model.scale.set(0, 0, 0);

    this.model.children[0].rotation.z = 0.5;

    this.model.position.x = this.model.c.savex;

    this.modelMaterial = new ModelMaterial(this.gl, {
      t1: this.assets.model[1],
      mtc: this.assets.model[2],
      col: [0.2, 0.2, 0.2],
      col2: [0.6, 0.6, 0.6],
    });

    this.model.children[0].program = this.modelMaterial;

    this.isOn = true;
  }

  animateIn2(isIn) {
    Tween.to(this.model.scale, {
      x: isIn ? this.model.c.scalex : 0,
      y: isIn ? this.model.c.scale : 0,
      z: isIn ? this.model.c.scale : 0,
      duration: 1.2,
      ease: "expo.out",
      delay: isIn ? 1 : 0,
    });

    if (this.isQsAnimated) {
      const isIn = false;
      this.morefills.children.forEach((child, i) => {
        if (child.inAnimation) child.inAnimation.kill();
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: isIn ? 0 + i * 0.2 : i * 0.05,
          duration: isIn ? 0.8 : 0.3,
          ease: isIn ? "expo.out" : "expo.in",
        });
      });

      this.moreuis.children.forEach((child, i) => {
        if (child.inAnimation) child.inAnimation.kill();
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: isIn ? 0 + i * 0.3 : i * 0.06,
          duration: isIn ? 0.8 : 0.3,
          ease: isIn ? "expo.out" : "expo.in",
        });
      });
    }
  }

  async animateQuick() {
    window.trackingTriggers[4].click();

    return new Promise((resolve) => {
      this.isQsAnimated = true;

      Tween.to(this.model.position, {
        x: -0.3,
        duration: 1.2,
        ease: "expo.out",
        delay: 0.1,
      });

      this.model.c.savex = -0.3;

      // blue one that moes with the airplane ?? hopefully
      Tween.to(this.blue.children[2].position, {
        x: -0.3,
        duration: 1.3,
        ease: "expo.out",
        delay: 0,
      });

      Tween.to(this.uis.children[2].program.uniforms.u_a_in, {
        value: 0,
        ease: "circ.out",
        duration: 0.4,
      });

      const isIn = true;
      this.morefills.children.forEach((child, i) => {
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: 0 + i * 0.2,
          duration: isIn ? 0.8 : 0.8,
          ease: isIn ? "expo.out" : "expo.in",
        });
      });

      this.moreuis.children.forEach((child, i) => {
        child.inAnimation = Tween.to(child.program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          delay: 0 + i * 0.3,
          duration: isIn ? 0.8 : 0.8,
          ease: isIn ? "expo.out" : "expo.in",
          onComplete: () => {
            if (i === this.moreuis.children.length - 1) {
              resolve();
              this.decreaseCount();
            }
          },
        });
      });
    });
  }

  async animateMobile() {
    window.trackingTriggers[5].click();

    const animateIn = async (isIn = true) => {
      return new Promise((resolve) => {
        const params = {
          ease: "expo.out",
          duration: 1.2,
          delay: 0.3,
        };

        // removed unwanted elements
        Tween.to(
          [
            this.blue.children[1].program.uniforms.u_a_in,
            this.uis.children[0].program.uniforms.u_a_in,
          ],
          {
            value: isIn ? 0 : 1,
            duration: isIn ? 0.6 : 0.6,
            delay: isIn ? 0 : 0.6,
            stagger: {
              each: 0.1,
            },
            ease: isIn ? "expo.out" : "expo.out",
          }
        );

        if (this.isQsAnimated) {
          this.model.savex = -0.3;
          this.morefills.children.forEach((child, i) => {
            Tween.to(child.program.uniforms.u_a_in, {
              value: isIn ? 0 : 1,
              delay: isIn ? 0.05 + i * 0.1 : 1 + i * 0.1,
              duration: isIn ? 0.3 : 0.6,
              ease: isIn ? "expo.in" : "expo.out",
            });
          });

          this.moreuis.children.forEach((child, i) => {
            Tween.to(child.program.uniforms.u_a_in, {
              value: isIn ? 0 : 1,
              delay: isIn ? i * 0.1 : 1 + i * 0.2,
              duration: isIn ? 0.3 : 0.6,
              ease: isIn ? "expo.in" : "expo.out",
              onComplete: () => {
                if (!isIn) {
                  resolve();
                  this.decreaseCount();
                }
              },
            });
          });
        } else {
          Tween.to(this.uis.children[2].program.uniforms.u_a_in, {
            value: isIn ? 0 : 1,
            ease: isIn ? "expo.in" : "expo.out",
            delay: isIn ? 0 : 0.6,
            duration: isIn ? 0.4 : 1.2,
            onComplete: () => {
              if (!isIn) {
                resolve();
                this.decreaseCount();
              }
            },
          });
        }

        // background scale
        Tween.to(this.fills.children[0].scale, {
          x: isIn ? 0.3 : 1,
          y: isIn ? 0.9 : 1,
          ...params,
          delay: isIn ? params.delay + 0.1 : params.delay - 0.2,
          onComplete: () => {
            if (isIn) {
              resolve();
            }
          },
        });

        // card bg scale and position
        Tween.to(this.fills.children[1].scale, {
          x: isIn ? 0.6 : this.fills.children[1].scaleFactor,
          delay: isIn ? params.delay + 0.02 : params.delay - 0.1,
          ...params,
        });

        Tween.to(this.fills.children[1].position, {
          x: isIn ? 0 : this.fills.children[1].pos[0],
          delay: isIn ? params.delay + 0.05 : params.delay - 0.05,
          ...params,
        });

        // text scale
        Tween.to(this.uis.children[1].scale, {
          x: isIn ? 0.6 : this.uis.children[1].scaleFactor,
          y: isIn ? 0.6 : this.uis.children[1].scaleFactor,
          ...params,
        });

        Tween.to(this.uis.children[1].position, {
          x: isIn ? 0 : this.uis.children[1].pos[0],
          y: isIn ? 0.05 : this.uis.children[1].pos[1],
          ...params,
        });

        // nav in
        Tween.to(this.mobileuis.children[0].program.uniforms.u_a_in, {
          value: isIn ? 1 : 0,
          ...params,
          delay: isIn ? params.delay : params.delay - 0.1,
        });

        // blue move
        Tween.to(this.blue.children[0].program.uniforms.u_a_in, {
          value: isIn ? 0 : 1,
          ...params,
        });

        Tween.to(this.model.position, {
          x: isIn ? -0 : this.model.c.savex,
          duration: 1.2,
          ease: "expo.out",
          delay: 0.1,
        });

        Tween.to(this.model.c, {
          addy: isIn ? 0.1 : 0,
          ry: isIn ? 0.5 : Math.PI / 1.5,
          duration: 1.2,
          ease: "back.out",
          delay: 0.1,
        });
        // Tween.to(this.model.c, {
        //   addy: isIn ? 0.1 : 0,
        //   duration: 1.2,
        //   ease: "slow.out",
        //   delay: 0.1,
        // });

        Tween.to(this.blue.children[2].program.uniforms.u_a_in, {
          value: isIn ? 0 : 1,
          duration: 1.3,
          ease: "expo.out",
          delay: 0,
        });
      });
    };

    await animateIn();
    await animateIn(false);
  }

  reset2() {
    this.isQsAnimated = false;
    this.model.position.x = 0.5;
    this.blue.children[2].position.x = this.blue.children[2].pos[0];
    this.model.c.savex = 0.5;
    this.model.children[0].rotation.y = this.model.c.ry = Math.PI / 1.5;
  }
}
