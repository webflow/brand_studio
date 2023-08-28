// --- ThreeJS Fancy Shit for Globe ---
let toggleRotate = true;

function FsGlobe() {
  let loadCount = 0;
  const manager = new THREE.LoadingManager();
  manager.onLoad = function () {
    document.body.classList.add("three");
  };
  const e = document.querySelector("[fs-3dglobe-element='container']"),
    t = {
      url: e.getAttribute("fs-3dglobe-img") || "https://cdn.finsweet.com/files/globe/earthmap1k.jpg",
    },
    n = document.createElement("div");
  (n.className = "fs-3dglobe-container"), e.appendChild(n);
  const o = document.createElement("canvas");
  (o.className = "canvas-3dglobe-container"), n.appendChild(o);
  const l = [].slice.call(document.querySelectorAll("[fs-3dglobe-element='tooltip']")),
    a = [].slice.call(document.querySelectorAll("[fs-3dglobe-element='pin']")),
    i = new THREE.WebGLRenderer({
      canvas: o,
      alpha: !0,
      antialias: true,
    }),
    r = new THREE.PerspectiveCamera(54, 2, 0.1, 10);
  r.position.z = 2.5;
  const s = new THREE.OrbitControls(r, o);
  (s.enableDamping = !0), (s.enablePan = !1), (s.minDistance = 1.2), (s.maxDistance = 4), (s.autoRotate = !0), (s.domElement.focus = null), (s.autoRotateSpeed = 0.1), s.target.set(0, 0, 0), r.position.set(2.5, 0, 0), (s.enableZoom = !1), s.update();
  const d = new THREE.Scene();
  i.setClearColor(0, 0);
  let c,
    p = !1;
  const m = fetchDataFromCollection("[fs-3dglobe-element='list'] .w-dyn-item"),
    u = new THREE.TextureLoader(manager).load(t.url, H);
  u.needsUpdate = !0;

  //white fill light
  const light = new THREE.AmbientLight(0xffffff, 3);
  //white bottom light
  var pointLight3 = new THREE.DirectionalLight(0xffffff, 3);
  pointLight3.position.set(10, -5, 1);
  //cyan top light
  var pointLight4 = new THREE.DirectionalLight(0xe7ff50, 1);
  pointLight4.position.set(-1, 4, -1);
  //blue right light
  var pointLight = new THREE.DirectionalLight(0x000000, 4);
  pointLight.position.set(10, 4, -2);
  //teal left light
  var pointLight2 = new THREE.DirectionalLight(0xe7ff50, 2);
  pointLight2.position.set(-10, 4, -1);
  //light container
  var lightHolder = new THREE.Group();
  lightHolder.add(pointLight, pointLight2, pointLight3, pointLight4, light);

  d.add(lightHolder);

  const E = new THREE.SphereBufferGeometry(1, 64, 32),
    f = new THREE.MeshPhysicalMaterial({
      map: u,
      side: THREE.DoubleSide,
      color: 0x666666,
      roughness: 0.75,
      metalness: 0.15,
      emissive: 0x000000,
      reflectivity: 0.75,
      clearcoat: 0.5,
      clearcoatRoughness: 0.75,
    }),
    h = new THREE.Mesh(E, f);
  d.add(h),
    (f.map.needsUpdate = !0),
    (function () {
      const e = 1.5 * Math.PI,
        t = Math.PI,
        o = new THREE.Object3D(),
        i = new THREE.Object3D();
      o.add(i);
      const r = new THREE.Object3D();
      (r.position.z = 1), i.add(r);
      const s = document.createElement("div");
      (s.className = "fs-3dglobe-labels"), n.appendChild(s);
      for (const [n, d] of m.entries()) {
        const { lat: c, lon: p, name: m, url: u } = d;
        (o.rotation.y = THREE.MathUtils.degToRad(p) + e), (i.rotation.x = THREE.MathUtils.degToRad(c) + t), r.updateWorldMatrix(!0, !1);
        const E = new THREE.Vector3();
        r.getWorldPosition(E), (d.position = E);
        const f = document.createElement("div"),
          h = document.createElement("div");
        (f.className = "map-container"),
          (h.innerHTML =
            l[n].outerHTML ||
            getInfoBox({
              url: u,
              name: m,
            })),
          (h.className = "fs-3dglobe-info-box"),
          (f.style.cursor = "pointer");
        const g = document.createElement("div");
        if (((g.className = "fs-3dglobe-arrow-box"), a[n])) g.appendChild(a[n]);
        else {
          const e = document.createElement("div");
          e.className = "fs-3dglobe-arrow_box";
          const t = document.createElement("img");
          (t.className = "logo_dot"), (t.position = "relative"), t.setAttribute("alt", m), t.setAttribute("src", u), (t.style.cursor = "pointer"), (t.style.width = "50px"), e.appendChild(t), g.appendChild(e);
        }
        f.appendChild(g), f.appendChild(h), s.appendChild(f), (d.elem = f);
      }
      R();
    })();
  const g = new THREE.Vector3(),
    y = new THREE.Vector3(),
    b = new THREE.Vector3(),
    x = new THREE.Matrix3(),
    v = 20,
    w = -0.08;

  function H() {
    if (toggleRotate) {
      s.autoRotate = true;
    } else {
      s.autoRotate = false;
    }
    lightHolder.quaternion.copy(r.quaternion);
    if (
      ((p = void 0),
      (c = requestAnimationFrame(H)),
      (function (e) {
        const t = e.domElement,
          n = t.clientWidth,
          o = t.clientHeight,
          l = t.width !== n || t.height !== o;
        return l && e.setSize(n, o, !1), l;
      })(i))
    ) {
      const e = i.domElement;
      (r.aspect = e.clientWidth / e.clientHeight), r.updateProjectionMatrix();
    }
    s.update(),
      (function () {
        const e = v * v;
        x.getNormalMatrix(r.matrixWorldInverse), r.getWorldPosition(b);
        for (const t of m) {
          const { position: n, elem: l, area: a } = t;
          if (a < e) {
            (l.style.opacity = ".009"), (l.style.display = "none");
            continue;
          }
          if ((g.copy(n), g.applyMatrix3(x), y.copy(n), y.applyMatrix4(r.matrixWorldInverse).normalize(), g.dot(y) > w)) {
            (l.style.opacity = ".009"), (l.style.display = "none");
            continue;
          }
          (l.style.opacity = "1"), (l.style.display = ""), g.copy(n), g.project(r);
          const i = (0.5 * g.x + 0.5) * o.clientWidth,
            s = (-0.5 * g.y + 0.5) * o.clientHeight;
          (l.style.transform = `translate(-50%, -50%) translate(${i}px,${s}px)`), (l.style.zIndex = (1e5 * (0.5 * -g.z + 0.5)) | 0);
        }
      })(),
      i.render(d, r);
  }

  function R() {
    p || (cancelAnimationFrame(c), (p = !0), (c = requestAnimationFrame(H)));
  }
  H();
  s.addEventListener("change", R), window.addEventListener("resize", R);
}

function getInfoBox({ url: e, name: t, location: n = "N/A", role: o = "N/A" }) {
  return `\n\n  <div style=" border: 1px solid #dadce0; border-radius: 8px; overflow: hidden;">\n    <div class="caption">\n      <img src="${e}" style="height: 200px; max-width:600px;" />\n    </div>\n    <div style="padding:5px 10px">\n      <div>\n        <strong>${t}</strong>\n      </div>\n      <div>Javascript, Node.js</div>\n      <div>${n}</div>\n    </div>\n  </div>\n `;
}

function fetchDataFromCollection(e) {
  return [].slice.call(document.querySelectorAll(e)).map((e) => ({
    name: (e.querySelector("[fs-3dglobe-element='name'") || {}).textContent,
    lat: (e.querySelector("[fs-3dglobe-element='lat'") || {}).textContent,
    lon: (e.querySelector("[fs-3dglobe-element='lon'") || {}).textContent,
    url: (e.querySelector("[fs-3dglobe-element='url'") || {}).textContent,
  }));
}

function LoadSvg(e, t) {
  new THREE.SVGLoader(manager).load(
    e,
    function (e) {
      let n = e.paths,
        o = new THREE.Group();
      o.scale.multiplyScalar(0.011), (o.position.x = -9), (o.rotation.x = Math.PI), (o.position.y = 5), (o.position.z = -3);
      for (let e = 0; e < n.length; e++) {
        let t = n[e],
          l = new THREE.MeshBasicMaterial({
            color: t.color,
            side: THREE.DoubleSide,
            depthWrite: !1,
          }),
          a = t.toShapes(!0);
        for (let e = 0; e < a.length; e++) {
          let t = a[e],
            n = new THREE.ShapeBufferGeometry(t),
            i = new THREE.Mesh(n, l);
          o.add(i);
        }
      }
      t.add(o);
    },
    function (e) {
      console.log((e.loaded / e.total) * 100 + "% loaded");
    },
    function (e) {
      console.log("An error happened");
    }
  );
}
(function () {
  FsGlobe();
  const markers = document.querySelectorAll(".map-container");

  markers.forEach((marker) => {
    marker.addEventListener("mouseover", function () {
      toggleRotate = false;
    });
    marker.addEventListener("mouseleave", function () {
      toggleRotate = true;
    });
  });
})();
