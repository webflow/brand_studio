import { Transform, Raycast, Vec2 } from "ogl";
import Tween from "gsap";
import { Loader } from "./util/loader.js";
import { Powerlines } from "./powerlines.js";

import Designer from "./designer.js";
import { Observe } from "./util/dom.js";

import { Purifier } from "./ui_purifier.js";
import { Card } from "./ui_card.js";
import { Plane } from "./ui_plane.js";

const UI_INDEX = 0;

function getUi(index) {
  switch (index) {
    case 0:
      return Card;
    case 1:
      return Purifier;
    case 2:
      return Plane;
    default:
      return Purifier;
  }
}

export default class extends Transform {
  constructor(gl) {
    super();
    this.gl = gl;

    this.createPowerLines();
    if (window.isTabletOrBelow) return;
    this.create();
  }

  async create() {
    this.group = new Transform();
    this.group.targetScale = 1.15;
    this.group.targetScaleFactor = 0.9;
    this.group.scale.set(
      this.group.targetScale * this.group.targetScaleFactor,
      this.group.targetScale * this.group.targetScaleFactor,
      this.group.targetScale * this.group.targetScaleFactor
    );
    this.group.setParent(this);

    const loader = new Loader(this.gl);

    this.assets = await loader.load();
    this.designer = new Designer(this.gl);
    this.designer.setParent(this.group);

    window.trackingTriggers = [
      ...document.querySelector("[data-hotspot-triggers]").children,
    ];

    this.isOn = true;

    this.index = UI_INDEX;
    this.currentUi = UI_INDEX;

    const ui = getUi(this.index);
    this.ui1 = new ui(this.gl);
    this.ui = this.ui1;

    this.ui.setParent(this.group);
    await this.ui.load(loader, this.index);

    this.initTarget();
    this.initRaycast();
    this.initLifeCycle(loader);
  }

  async transitionScene() {
    let pui = null;
    this.currentUi += 1;

    setTimeout(() => {
      if (this.currentUi === 1) {
        pui = this.ui1;
        this.ui2.setParent(this.group);

        this.ui = this.ui2;
        this.ui.animateIn();
      } else if (this.currentUi === 2) {
        pui = this.ui2;
        this.ui3.setParent(this.group);

        this.ui = this.ui3;
        this.ui.animateIn();
      } else if (this.currentUi === 3) {
        pui = this.ui3;
        this.ui1.setParent(this.group);

        this.ui = this.ui1;
        this.ui.animateIn();

        this.currentUi = 0;
      }
    }, 200);

    Tween.to(this.ui.position, {
      z: -0.5,
      duration: 0.8,
      ease: "expo.out",
    });

    await this.ui.animateIn(false);
    pui.setParent(null);
    pui.reset();
  }

  async initLifeCycle(loader) {
    this.index++;
    if (this.index > 2) this.index = 0;

    const ui2 = getUi(this.index);
    this.ui2 = new ui2(this.gl);
    await this.ui2.load(loader, this.index);

    this.index++;
    if (this.index > 2) this.index = 0;

    const ui3 = getUi(this.index);
    this.ui3 = new ui3(this.gl);

    await this.ui3.load(loader, this.index);
  }

  initRaycast() {
    this.mouse = new Vec2();
    this.ray = new Raycast(this.gl);
    this.canCast = true;
  }

  moveRaycast({ x, y }, isClick = false) {
    if (!this.canCast) return;

    this.mouse.set(
      2.0 * (x / window.app.gl.renderer.width) - 1.0,
      2.0 * (1.0 - y / window.app.gl.renderer.height) - 1.0
    );

    this.ray.castMouse(window.app.gl.camera, this.mouse);
    const hits = this.ray.intersectBounds(this.ui.int.children);
    if (hits.length) {
      hits[0].hovered();
      if (isClick) hits[0].clicked();
    } else {
      this.ui.int.children.map((c) => c.unhovered());
    }
  }

  createPowerLines() {
    this.powerlines = new Powerlines(this.gl);
    this.powerlines.setParent(this);
    if (window.isTabletOrBelow) {
      setTimeout(() => {
        this.isOn = true;
        this.render();
      }, 10);
    }
  }

  initTarget() {
    const params = {
      delay: 0.25,
      duration: 1.2,
      ease: "back.inOut",
    };

    const animateIn = () => {
      if (this.uiIn) return;
      this.uiIn = true;

      this.designer?.animateIn();
      this.ui?.animateIn();

      Tween.to(this.group.scale, {
        x: this.group.targetScale,
        y: this.group.targetScale,
        z: this.group.targetScale,
        ...params,
      });
    };

    const animateOut = () => {
      if (!this.uiIn) return;
      this.uiIn = false;

      this.designer?.animateIn(false);
      this.ui?.animateIn(false);

      Tween.to(this.group.scale, {
        x: this.group.targetScale * this.group.targetScaleFactor,
        y: this.group.targetScale * this.group.targetScaleFactor,
        z: this.group.targetScale * this.group.targetScaleFactor,
        ...params,
      });
    };

    this.obs = new Observe({
      element: document.querySelector("[data-gl='ain']"),
      cb: {
        in: animateIn,
        out: animateOut,
      },
    });
  }

  render(t) {
    if (!this.isOn) return;

    if (!window.isTabletOrBelow) {
      this.position.y = -1 + window.app.gl.track.value;
    } else {
      this.position.y = -1;
    }

    if (this.ui) {
      this.designer.render(t);
      this.ui.render(t);

      this.designer.rotation.y = window.app.gl.mouse.ex;
      this.designer.rotation.x = window.app.gl.mouse.ey;
      this.ui.rotation.y = window.app.gl.mouse.ex;
      this.ui.rotation.x = window.app.gl.mouse.ey;
    }

    if (this.powerlines) {
      this.powerlines.render(t);
    }
  }

  resize(vp) {
    this.vp = vp;
    if (this.designer) this.designer.resize(vp);
    if (this.ui) this.ui.resize(vp);
  }

  sizechanged() {
    if (!window.isTabletOrBelow) {
      this.ui.visible = true;
      this.designer.visible = true;
    } else {
      this.ui.visible = false;
      this.designer.visible = false;
    }
  }
}
