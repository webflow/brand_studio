import { Program } from "ogl";
import vertex from "./vertex.vert";
import fragment from "./fragment.frag";

export default class extends Program {
  constructor(gl, options = {}) {
    options.t1.flipY = false;

    super(gl, {
      vertex: vertex,
      fragment: fragment,
      transparent: true,
      cullFace: null,

      uniforms: {
        u_time: { value: 0 },
        u_t1: { value: options.t1 },
        u_mtc: { value: options.mtc },
        u_col: { value: options.col },
        u_col2: { value: options.col2 },
        u_a_col: { value: 0 },
      },
    });
  }

  set time(t) {
    this.uniforms.u_time.value = t;
  }
}
