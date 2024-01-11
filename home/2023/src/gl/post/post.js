import { RenderTarget } from "ogl";
import Quad from "./quad.js";

export default class {
  constructor(gl) {
    this.gl = gl;
    this.isActive = true;

    this.rt = new RenderTarget(this.gl, {});
    this.quad = new Quad(this.gl);
    this.quad.program.texture = this.rt.texture;
  }

  resize(vp) {
    this.vp = vp;

    this.rt = new RenderTarget(this.gl, {});
    this.quad.resize(vp);
  }

  render(t) {
    this.quad.program.texture = this.rt.texture;
    this.quad.render(t);
  }
}

/*
  renderPost(t) {
    // 1. render scene to rt
    this.renderer.render({
      scene: this.scene,
      camera: this.camera,
      target: this.post.rt,
    });

    // 2. move time in post
    this.post.render(t);

    // 3. render post to quad
    this.renderer.render({
      scene: this.post.quad,
      camera: this.camera,
    });
  }
*/
