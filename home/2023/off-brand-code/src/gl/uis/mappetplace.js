import { Transform, Cylinder, NormalProgram, Mesh } from "ogl";
import { Ui } from "../Ui.js";
// import Tween from "gsap";

// import CCMat from "../mat/cc";
// import { loadTexture, loadModel, ASSETS } from "../util/loader.js";

/** ++++++++++  Ui 1 : MAPPETPLACE */
export class Mappetplace extends Ui {
  constructor(gl) {
    super(gl);
  }

  get params() {
    // params

    const { ui_tx, ui_mask } = window.app.gl.scene.assets2;

    const color = [
      0.00392156862745098, 0.00784313725490196, 0.07450980392156863,
    ];

    return {
      texture: ui_tx,
      mask: ui_mask,
      color,
    };
  }

  createTar() {
    this.toTexture = new Transform();

    const m = new Mesh(this.gl, {
      geometry: new Cylinder(this.gl, {
        radialSegments: 24,
        heightSegments: 1,
      }),
      program: new NormalProgram(this.gl),
    });

    m.rotation.x = Math.PI / 4;
    m.scale.set(0.8, 0.8, 0.8);
    // m.position.x = 1;

    m.setParent(this.toTexture);

    // this.animateIn();
  }
}
