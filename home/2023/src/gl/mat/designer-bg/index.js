import { Program } from "ogl";
import vertex from "./vertex.vert";
import fragment from "./fragment.frag";

export default class extends Program {
  constructor(gl, opt = {}) {
    super(gl, {
      vertex: vertex,
      fragment: fragment,
      transparent: true,
      cullFace: null,
      // depthTest: false,
      // depthWrite: false,
    });

    this.uniforms = {
      u_time: { value: 0 },
      // u_diff: { value: opt.diff || null },
      // u_t1: { value: opt.t1 || new Texture(gl) },
    };
  }

  set time(t) {
    this.uniforms.u_time.value = t;
  }
}
