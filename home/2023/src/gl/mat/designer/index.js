import { Program } from "ogl";
import { Texture } from "three";
import vertex from "./vertex.vert";
import fragment from "./fragment.frag";

export default class extends Program {
  constructor(gl, opt = {}) {
    super(gl, {
      vertex: vertex,
      fragment: fragment,
      transparent: true,
    });

    this.uniforms = {
      u_time: { value: 0 },
      u_diff: { value: opt.diff || null },
      u_t1: { value: opt.t1 || new Texture(gl) },
      u_a_publish: { value: 0 },
      u_a_in: { value: 0 },
    };
  }

  set time(t) {
    this.uniforms.u_time.value = t;
  }
}
