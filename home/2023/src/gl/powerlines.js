import { Transform, Geometry, Mesh, Plane } from "ogl";
import { loadModel } from "./util/model-loader";
import Material from "./mat/pline/index.js";

export class Powerlines extends Transform {
  constructor(gl) {
    super();
    this.gl = gl;

    this.load();
  }

  async load() {
    const loaded = await loadModel(
      this.gl,
      "https://uploads-ssl.webflow.com/64fb1bf4f4bc13f2455ef257/651028226b7ad57df2fddc53_plines.glb.txt"
    );

    this.geometry = new Geometry(this.gl, {
      ...loaded.meshes[0].primitives[0].geometry.attributes,
      a_offset: {
        size: 1,
        instanced: 1,
        data: new Float32Array([0, 1, 2, 3]),
      },
      a_rot: {
        size: 1,
        instanced: 1,
        data: new Float32Array([-0.1, 0, 0.1, 0.3]),
      },
      a_rand: {
        size: 1,
        instanced: 1,
        data: new Float32Array([
          Math.random(),
          Math.random(),
          Math.random(),
          Math.random(),
        ]),
      },
    });

    this.model = new Mesh(this.gl, {
      geometry: this.geometry,
      program: new Material(this.gl),
    });

    this.model.position.y = 1.2;
    this.model.position.z = -1.6;
    this.model.position.x = -0.2;

    this.model.rotation.x = 0.3;

    this.model.setParent(this);
  }

  render(t) {
    if (this.model) {
      this.model.program.time = -t * 0.003;
      if (!window.isTabletOrBelow) {
        this.model.position.y = 1.2 + window.app.gl.track.value * 0.2;
      }
    }
  }
}
