import { Program } from "ogl";

import vertex from "./vertex.vert";
import frag_tx from "./frag-tx.frag";

export default class extends Program {
  constructor(gl, opt = {}) {
    super(gl, {
      vertex: vertex,
      fragment: frag_tx,
      transparent: true,
      cullFace: gl.BACK,
      depthTest: false,
      depthWrite: false,
    });

    this.uniforms = {
      u_time: { value: 0 },
      u_scale: { value: opt.scale || [1, 1] },
      u_res: { value: opt.res || [1, 1] },
      u_t1: { value: opt.t1 },
      u_mask: { value: opt.mask },
      u_a_in: { value: 0 },
      a_ctrl: { value: opt.ctrl || [0, 0] },
      u_a_op: { value: 1 },
    };
  }

  set time(t) {
    // console.log(t);
    this.uniforms.u_time.value = t;
  }
}
