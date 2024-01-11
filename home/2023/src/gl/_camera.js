import { Camera } from "ogl";

export default class extends Camera {
  constructor(gl, { fov = 25, near = 0.01, far = 100 }) {
    super({
      fov,
    });

    this.gl = gl;
    this.fov = fov;
    this.near = near;
    this.far = far;

    // console.log(this);
  }

  get fovInRad() {
    return (this.fov * Math.PI) / 180;
  }

  getViewSize(ratio) {
    const height = Math.abs(this.position.z * Math.tan(this.fovInRad / 2) * 2);
    return { w: height * ratio, h: height };
  }
}
