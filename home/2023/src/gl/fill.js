import { Plane, Mesh } from "ogl";
import Material from "./mat/fill";

const UISCALE = [1, 0.6763948498];

export class Fill extends Mesh {
  constructor(
    gl,
    {
      size = [1, 1],
      pos = [0, 0, 0],
      alt = 0,
      t1 = null,
      col_1 = [0, 0, 0],
      col_2 = col_1,
      col_1a = col_1,
      col_2a = col_1a,
      col_g = [0, 0],
      col_ctrl = 0,
      ctrl = [0, 1],
      background = null,
      background2 = background,
      ctrl_bg = 0,
      mask = null,
    } = {}
  ) {
    super(gl, {
      geometry: new Plane(gl, {
        width: size[0],
        height: size[1],
      }),
      program: new Material(gl, {
        t1,
        res: [UISCALE[0] * size[0], UISCALE[1] * size[1]],
        alt,
        col_1,
        col_2,
        col_g,
        ctrl,
        col_1a,
        col_2a,
        col_ctrl,
        background,
        background2,
        ctrl_bg,
        mask,
      }),
    });

    this.pos = pos.map((p, i) => (i < 1 ? p * 0.5 : p));

    const factor = 0.5;
    this.position.set(pos[0] * factor, pos[1] * factor, pos[2]);
  }

  resize() {}

  render(t) {
    this.program.time = t;
  }

  // ANIMATION
}
