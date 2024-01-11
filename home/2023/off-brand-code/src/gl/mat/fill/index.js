import { Program, Texture } from "ogl";

import vertex from "./vertex.vert";
import vert_fill from "./vert-fill.vert";

import frag_tx from "./frag-tx.frag";
import frag_bg from "./frag-bg.frag";
import frag_mask from "./frag-mask.frag";
import frag_mask_bg from "./frag-mask-bg.frag";
import fragment from "./fragment.frag";

export default class extends Program {
  constructor(gl, opt = {}) {
    // if (opt.mask) console.log("has mask");

    let pickedFrag = opt.t1 ? frag_tx : fragment;
    pickedFrag = opt.background ? frag_bg : pickedFrag;
    pickedFrag = opt.mask ? frag_mask : pickedFrag;

    if (opt.mask && opt.background) {
      pickedFrag = frag_mask_bg;
      opt.background2 = opt.mask;
    }

    super(gl, {
      vertex: opt.t1 ? vertex : vert_fill,
      fragment: pickedFrag,
      transparent: true,
      cullFace: gl.BACK,
      depthTest: opt.t1 ? false : true,
      depthWrite: opt.t1 ? false : true,
    });

    this.uniforms = {
      u_time: { value: 0 },
      u_scale: { value: opt.scale || [1, 1] },
      u_res: { value: opt.res || [1, 1] },
      ...(opt.t1
        ? {
            u_t1: { value: opt.t1 },
          }
        : {
            u_col1: { value: opt.col_1 },
            u_col2: { value: opt.col_2 },
            u_colg: { value: opt.col_g },
            u_a_col: { value: 0 },
            u_col_1a: { value: opt.col_1a },
            u_col_2a: { value: opt.col_2a },
            u_col_ctrl: { value: opt.col_ctrl },
            u_bg: { value: opt.background || opt.mask },
            u_bg2: { value: opt.background2 || opt.mask },
            u_a_bgc: { value: opt.ctrl_bg },
          }),
      u_a_in: { value: 0 },
      a_ctrl: { value: opt.ctrl || [0, 0] },
      u_a_op: { value: 1 },
    };
  }

  set time(t) {
    this.uniforms.u_time.value = t;
  }
}
