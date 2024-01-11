import GUI from "lil-gui";

export function initGui() {
  const gui = new GUI();

  // * animations
  const animationfolder = gui.addFolder("Animation");
  gui.add(animationfolder);

  const animations = {
    publish: () => window.app.gl.scene.ui.animatePublish(),
    mobile: () => window.app.gl.scene.ui.animateMobile(),
    cms: () => window.app.gl.scene.ui.animateCMS(),
    quickstack: () => window.app.gl.scene.ui.animateQuickstack(),
  };

  animationfolder.add(animations, "publish");
  animationfolder.add(animations, "mobile");
  animationfolder.add(animations, "quickstack");
  animationfolder.add(animations, "cms");

  gui.close();
  window.gui = gui;
}
