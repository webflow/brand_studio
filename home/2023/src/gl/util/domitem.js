export function domSize(
  it,
  { viewRatio: ratio, w: scw, h: sch, scrollx = 0, scrolly = 0 }
) {
  const { x, y, width: w, height: h } = it.getBoundingClientRect();

  return {
    x: (-scw / 2 + x + w / 2) * ratio,
    y: (-sch / 2 + y + h / 2) * ratio,
    w: w * ratio,
    h: h * ratio,
  };
}
