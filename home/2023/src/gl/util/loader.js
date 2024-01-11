import { loadTexture } from "./texture-loader";
import { loadModel } from "./model-loader.js";
export { loadTexture, loadModel };

import { as } from "../../../__files/asset";

export class Loader {
  constructor(gl) {
    this.gl = gl;
  }

  async load() {
    // console.time("#1");
    const [designer_main, ripples] = await Promise.all([
      loadTexture(this.gl, as.designer_tx),
      loadTexture(this.gl, as.ripple_mask),
    ]);

    designer_main.info_ratio = 1.6952941176;

    // console.timeEnd("#1");

    return {
      designer_main,
      ripples,
    };
  }

  async load2(uiIndex) {
    const tx = [
      {
        ui: as.u2_tx.map((t) => loadTexture(this.gl, t, true)),
        b: as.u2_b.map((t) => loadTexture(this.gl, t, true)),
        i: as.u2_i.map((t) => loadTexture(this.gl, t, true)),
        adds: as.u2_adds.map((t) => loadTexture(this.gl, t, true)),
      },
      {
        ui: as.u1_tx.map((t) => loadTexture(this.gl, t, true)),
        b: as.u1_b.map((t) => loadTexture(this.gl, t, true)),
        i: as.u1_i.map((t) => loadTexture(this.gl, t, true)),
        adds: as.u1_adds.map((t) => loadTexture(this.gl, t, true)),
      },
      {
        ui: as.u3_tx.map((t) => loadTexture(this.gl, t, true)),
        b: as.u3_b.map((t) => loadTexture(this.gl, t, true)),
        i: as.u3_i.map((t) => loadTexture(this.gl, t, true)),
        adds: as.u3_adds.map((t) => loadTexture(this.gl, t, true)),
      },
    ];

    const adds = [
      [
        loadModel(this.gl, as.m_credit),
        loadTexture(this.gl, as.m_credit_tx),
        loadTexture(this.gl, as.m_metal_mtc),
      ],
      [
        loadModel(this.gl, as.m_purifier),
        loadTexture(this.gl, as.m_purifier_tx),
        loadTexture(this.gl, as.m_metal_mtc),
      ],

      [
        loadModel(this.gl, as.m_plane),
        loadTexture(this.gl, as.m_plane_tx),
        loadTexture(this.gl, as.m_metal_mtc),
      ],
    ];

    // console.time("#2");
    const [ui, bl, inter, model, other, mask] = await Promise.all([
      Promise.all(tx[uiIndex].ui),
      Promise.all(tx[uiIndex].b),
      Promise.all(tx[uiIndex].i),
      Promise.all(adds[uiIndex]),
      Promise.all(tx[uiIndex].adds),
      // Promise.all(tx[uiIndex].mask),
    ]);

    // console.timeEnd("#2");
    return {
      ui,
      bl,
      inter,
      model,
      other,
      mask,
    };
  }

  async load3() {
    // console.time("#3");
    const [] = await Promise.all([
      // loadTexture(this.gl, designer_ui_tx),
    ]);

    // console.timeEnd("#3");
    return {};
  }
}
