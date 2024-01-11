import { Program } from "ogl";
import vertex from "./vertex.vert";
import fragment from "./fragment.frag";

export default class extends Program {
  constructor(gl, options = {}) {
    super(gl, {
      vertex: vertex,
      fragment: fragment,
    });

    // console.log(this.uniforms);
    this.transparent = null;
    this.cullFace = null;

    this.uniforms = {
      u_time: { value: 0 },
      u_texture: { value: null },
    };
  }

  set time(t) {
    this.uniforms.u_time.value = t;
  }

  set texture(texture) {
    this.uniforms.u_texture.value = texture;
  }
}
