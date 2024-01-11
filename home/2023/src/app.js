import { Gl } from "./gl/gl.js";

class App {
  constructor() {
    // console.time("##");

    this.init();
  }

  init() {
    const ui = 1;
    this.gl = new Gl(ui);
  }
}

const tabletMediaQuery = window.matchMedia("(max-width: 991px)");
window.isTabletOrBelow = tabletMediaQuery.matches;
tabletMediaQuery.addEventListener("change", (event) => {
  window.isTabletOrBelow = event.matches;

  if (window.app) window.app.gl.scene.sizechanged();
});

window.app = new App();
