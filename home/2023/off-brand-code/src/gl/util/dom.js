export const clientRect = (element) => {
  const bounds = element.getBoundingClientRect();

  let scroll = 0;
  scroll = window.app?.scroll?.y || window.pageYOffset;

  return {
    // screen
    top: bounds.top + scroll,
    bottom: bounds.bottom + scroll,
    width: bounds.width,
    height: bounds.height,
    left: bounds.left,
    right: bounds.right,
    wh: window.innerHeight,
    ww: window.innerWidth,
    offset: bounds.top + scroll,
    // centery: bounds.top + scroll + bounds.height / 2, // check if correct
    // centerx: bounds.left + bounds.width / 2, // check if correct
  };
};

// to check
export const clientRectGl = (element, ratio = 1) => {
  const bounds = element.clientRect();

  for (const [key, value] of Object.entries(bounds))
    bounds[key] = value * ratio;

  return bounds;
};

export class Observe {
  constructor({ element, config, addClass, cb }) {
    this.element = element;
    this.config = {
      root: config?.root || null,
      margin: config?.margin || "10px",
      threshold: config?.threshold || 0,
      autoStart: config?.autoStart || true,
    };

    if (cb) this.cb = cb;

    if (addClass !== undefined) this.addClass = addClass;
    this.flag = true;

    this.init();
    this.start();
    // if (this.config.autoStart) this.start();
  }

  init() {
    this.in = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.isIn();
          }
        });
      },
      {
        root: this.config.root,
        rootMargin: this.config.margin,
        threshold: this.config.threshold,
      }
    );

    this.out = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            this.isOut();
          }
        });
      },
      {
        root: this.config.root,
        rootMargin: "0px",
        threshold: 0,
      }
    );
  }

  start() {
    this.in.observe(this.element);
    this.out.observe(this.element);
  }

  stop() {
    this.in.unobserve(this.element);
    this.out.unobserve(this.element);
    // this.off("IN");
    // this.off("OUT");
  }

  isIn() {
    // console.log("in");
    // this.emit("IN");
    this.flag = true;

    if (this.cb?.in) this.cb.in();
    if (this.addClass) this.element.classList.add(this.addClass);
  }

  isOut() {
    // console.log("out");
    // this.emit("OUT");
    this.flag = false;

    if (this.cb?.out) this.cb.out();
    if (this.addClass) this.element.classList.remove(this.addClass);
  }
}

//  -------------- Track
// lerp
export function lerp(v0, v1, t) {
  return v0 * (1 - t) + v1 * t;
}

// map
export function map(value, low1, high1, low2, high2) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

// clamp
export function clamp(min, max, num) {
  return Math.min(Math.max(num, min), max);
}

export class Track extends Observe {
  constructor({ element, config, cb, addClass }) {
    super({ element, config, cb, addClass });
    this.element = element;

    this.config = {
      bounds: [0, 1],
      top: "top",
      bottom: "bottom",
      ...config,
    };

    this.value = 0;
    this.resize();

    // if (window.sscroll) window.sscroll.subscribe(this.render.bind(this));
  }

  resize() {
    this.bounds = computeBounds(this.element, this.config);
  }

  render() {
    this.value = clamp(
      0,
      1,
      map(
        document.documentElement.scrollTop, // value
        this.bounds.top, // low1
        this.bounds.bottom, // high1
        this.config.bounds[0],
        this.config.bounds[1] // low2, high2
      )
    );

    // this.value = lerp(this.value, this.targetvalue, 0.2);

    // console.log(this.value);
  }
}

// ---------
function computeBounds(el, config) {
  const bounds = clientRect(el);

  switch (config.top) {
    case "top":
      bounds.top = bounds.top;
      break;
    case "center":
      bounds.top = bounds.top - bounds.wh / 2;
      break;
    case "bottom":
      bounds.top = bounds.top - bounds.wh;
      break;
  }

  switch (config.bottom) {
    case "top":
      bounds.bottom = bounds.bottom;
      break;
    case "center":
      bounds.bottom = bounds.bottom - bounds.wh / 2;
      break;
    case "bottom":
      bounds.bottom = bounds.bottom - bounds.wh;
      break;
  }

  return { ...bounds };
}
