// Globe initialization and animation
(function () {
  // Check if globe is already initialized
  if (window.globeInitialized) {
    return;
  }
  window.globeInitialized = true;
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  // Settings object for GUI controls
  const settings = {
    rotation: {
      base: prefersReducedMotion ? 0.0005 : 0.0013, // Slower rotation for reduced motion
      max: prefersReducedMotion ? 0.0005 : 0.025, // No speed-up for reduced motion
      easing: 0.2,
    },
    animation: {
      duration: 1000,
      cooldown: 0,
    },
    dots: {
      clusterProbability: 0.85,
      spreadMultiplier: 1.7,
      count: 400,
    },
    pipes: {
      thickness: 0.0063,
      brightness: 0.16,
    },
  };

  // Set up scene, camera, and renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp",
    stencil: false,
    depth: true,
    logarithmicDepthBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById("three-container").appendChild(renderer.domElement);

  // Function to get color from CSS variable
  function getCSSColor(variableName) {
    const rawValue = getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();

    if (!rawValue) {
      return new THREE.Color(0x383838);
    }

    try {
      return new THREE.Color(rawValue);
    } catch (e) {
      try {
        const div = document.createElement("div");
        div.style.color = rawValue;
        document.body.appendChild(div);
        const computedColor = getComputedStyle(div).color;
        document.body.removeChild(div);

        const rgb = computedColor.match(/\d+/g);
        if (!rgb) {
          return new THREE.Color(0x383838);
        }
        return new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      } catch (err) {
        return new THREE.Color(0x383838);
      }
    }
  }

  // Create sphere geometry
  const radius = 5;
  const segments = 64;
  const geometry = new THREE.SphereGeometry(radius, segments, segments);

  // Initialize materials with default colors
  const material = new THREE.MeshBasicMaterial({
    color: 0x383838,
    wireframe: false,
  });

  const tubeMaterial = new THREE.MeshBasicMaterial({
    color: 0x383838,
    transparent: true,
    opacity: 1.0,
  });

  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0x146ef5,
    transparent: true,
    opacity: 1,
  });

  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // Function to calculate outline scale
  function calculateOutlineScale() {
    const container = document.getElementById("three-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const fov = camera.fov * (Math.PI / 180);
    const distance = camera.position.z;
    const pixelSize =
      (2 * Math.tan(fov / 2) * distance) /
      Math.min(containerWidth, containerHeight);
    return 1 + (pixelSize / radius) * 0.7; // Increased from 0.5 to 0.7 for thicker outline
  }

  // Add outline effect
  let outlineScale = calculateOutlineScale();
  const outlineGeometry = new THREE.SphereGeometry(radius, segments, segments);
  const outlineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x383838) },
    },
    vertexShader: `
            void main() {
                vec3 pos = position * ${outlineScale};
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
    fragmentShader: `
            uniform vec3 color;
            void main() {
                gl_FragColor = vec4(color, 1.0);
            }
        `,
    side: THREE.BackSide,
  });
  const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
  sphere.add(outlineMesh);

  // Set up color synchronization
  let colorUpdateTimeout;

  // Function to debounce color updates
  function debouncedColorUpdate() {
    clearTimeout(colorUpdateTimeout);
    colorUpdateTimeout = setTimeout(updateColors, 100);
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", debouncedColorUpdate);
  } else {
    debouncedColorUpdate();
  }

  // Watch for CSS variable changes
  const observer = new MutationObserver(debouncedColorUpdate);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  // Update on window load
  window.addEventListener("load", debouncedColorUpdate);

  const gridOffset = 0.003;
  const tubeSegments = 96;
  const tubeRadialSegments = 12;

  // Function to calculate responsive tube radius
  function calculateTubeRadius() {
    const container = document.getElementById("three-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const fov = camera.fov * (Math.PI / 180);
    const distance = camera.position.z;
    const pixelSize =
      (2 * Math.tan(fov / 2) * distance) /
      Math.min(containerWidth, containerHeight);
    return pixelSize * 0.35; // Increased from 0.25 to 0.35 for thicker lines
  }

  // Initialize tube radius
  let tubeRadius = calculateTubeRadius();

  // Latitude lines using tubes
  for (let i = -9; i <= 9; i++) {
    const points = [];
    const segments = 100;
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      const radius_at_latitude =
        (radius + gridOffset) * Math.cos((i * 10 * Math.PI) / 180);
      const x = radius_at_latitude * Math.cos(theta);
      const y = (radius + gridOffset) * Math.sin((i * 10 * Math.PI) / 180);
      const z = radius_at_latitude * Math.sin(theta);
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      tubeSegments,
      tubeRadius,
      tubeRadialSegments,
      true
    );
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    sphere.add(tube);
  }

  // Longitude lines using tubes
  for (let i = 0; i < 24; i++) {
    const points = [];
    for (let j = 0; j <= 180; j++) {
      const phi = (j * Math.PI) / 180;
      const x =
        (radius + gridOffset) *
        Math.sin(phi) *
        Math.cos((i * 15 * Math.PI) / 180);
      const y = (radius + gridOffset) * Math.cos(phi);
      const z =
        (radius + gridOffset) *
        Math.sin(phi) *
        Math.sin((i * 15 * Math.PI) / 180);
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      tubeSegments,
      tubeRadius,
      tubeRadialSegments,
      false
    );
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    sphere.add(tube);
  }

  // Add dots
  const dotRadius = 0.045;
  const dotSegments = 12;
  const dotGeometry = new THREE.SphereGeometry(
    dotRadius,
    dotSegments,
    dotSegments
  );

  // Define population centers for continents
  const populationCenters = [
    { lat: 30, lng: 116, spread: 35 }, // East Asia
    { lat: 20, lng: 78, spread: 32 }, // South Asia
    { lat: 45, lng: 10, spread: 28 }, // Europe
    { lat: 35, lng: -98, spread: 32 }, // North America
    { lat: -10, lng: -55, spread: 28 }, // South America
    { lat: 25, lng: 45, spread: 25 }, // Middle East
    { lat: 5, lng: 15, spread: 30 }, // Africa
    { lat: -25, lng: 135, spread: 25 }, // Australia
  ];

  // Generate dots with population-based distribution
  for (let i = 0; i < settings.dots.count; i++) {
    let lat, lng;

    if (Math.random() < settings.dots.clusterProbability) {
      // Pick a random population center
      const center =
        populationCenters[Math.floor(Math.random() * populationCenters.length)];

      // Generate point near the population center using moderate normal distribution
      const spreadFactor = center.spread * (0.4 + Math.random() * 0.45); // Middle ground spread multiplier
      lat = center.lat + (Math.random() - 0.5) * spreadFactor;
      lng = center.lng + (Math.random() - 0.5) * spreadFactor;

      // Clamp latitude to valid range
      lat = Math.max(-60, Math.min(60, lat));
    } else {
      // Random points for the remaining 30%, but weighted towards equator
      lng = Math.random() * 360 - 180;
      // Use moderate power (2.2) to concentrate around equator
      lat = (Math.asin(Math.pow(Math.random(), 2.2) * 2 - 1) * 180) / Math.PI;
    }

    // Convert to spherical coordinates
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((180 + lng) * Math.PI) / 180;

    const dotOffset = 0.035;
    const x = (radius + dotOffset) * Math.sin(phi) * Math.cos(theta);
    const y = (radius + dotOffset) * Math.cos(phi);
    const z = (radius + dotOffset) * Math.sin(phi) * Math.sin(theta);

    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(x, y, z);

    const normal = new THREE.Vector3(x, y, z).normalize();
    dot.position.copy(normal.multiplyScalar(radius + dotOffset));
    dot.lookAt(dot.position.clone().add(normal));

    sphere.add(dot);
  }

  // Position camera and look down at the globe
  camera.position.z = 12;
  camera.position.y = 0;
  camera.fov = 45;
  camera.lookAt(0, 0, 0);

  // Create a container for the sphere to handle multiple rotations
  const container = new THREE.Object3D();
  scene.add(container);
  container.add(sphere);

  // Remove left tilt to keep globe centered
  container.rotation.z = 0;

  // Animation variables
  let currentRotationSpeed = settings.rotation.base;
  let targetRotationSpeed = settings.rotation.base;
  let isHovered = false;
  let canAnimate = true;
  let isMouseDown = false;

  // Animation function
  function triggerAnimation() {
    if (!canAnimate || prefersReducedMotion) return;

    // Always start from current position with initial velocity
    targetRotationSpeed = settings.rotation.max;

    canAnimate = false;

    // Start returning rotation to base speed after delay
    setTimeout(() => {
      if (!isMouseDown) {
        // Only return to base if mouse isn't held
        targetRotationSpeed = settings.rotation.base;
      }

      // Allow new animations after a short cooldown
      setTimeout(() => {
        canAnimate = true;
      }, settings.animation.cooldown);
    }, settings.animation.duration);
  }

  // Update event listeners to use container instead of window
  container.addEventListener("mouseenter", () => {
    if (!isHovered) {
      isHovered = true;
      if (!isMouseDown && !prefersReducedMotion) {
        triggerAnimation();
      }
    }
  });

  container.addEventListener("mouseleave", () => {
    isHovered = false;
    if (!isMouseDown) {
      targetRotationSpeed = settings.rotation.base;
    }
  });

  // Update mouse events
  const canvas = renderer.domElement;
  canvas.style.pointerEvents = "auto";
  canvas.addEventListener("mousedown", () => {
    isMouseDown = true;
    if (!prefersReducedMotion) {
      triggerAnimation();
    }
  });

  canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
    targetRotationSpeed = settings.rotation.base;
  });

  // Add click interaction (now just for touch devices)
  canvas.addEventListener("click", (e) => {
    // Prevent click from firing on mouse up
    if (e.pointerType === "mouse" || prefersReducedMotion) return;
    triggerAnimation();
  });

  // Add rotation and bounce animation
  function animate() {
    requestAnimationFrame(animate);

    // Apply easing to rotation speed
    currentRotationSpeed +=
      (targetRotationSpeed - currentRotationSpeed) * settings.rotation.easing;
    sphere.rotation.y += currentRotationSpeed;

    renderer.render(scene, camera);
  }

  // Handle window resizing
  function onWindowResize() {
    const container = document.getElementById("three-container");
    camera.aspect = container.clientWidth / container.clientHeight;

    // Calculate camera position to maintain globe size at 80% of height
    const vFov = (camera.fov * Math.PI) / 180;
    const desiredHeight = radius * 2; // Globe diameter
    const distance = (desiredHeight / 2 / Math.tan(vFov / 2)) * 1.25; // 80% of height
    camera.position.z = distance;

    // Recalculate tube radius
    tubeRadius = calculateTubeRadius();

    // Recalculate outline scale
    outlineScale = calculateOutlineScale();
    outlineMesh.material.vertexShader = `
            void main() {
                vec3 pos = position * ${outlineScale};
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;
    outlineMesh.material.needsUpdate = true;

    // Update existing tubes
    sphere.children.forEach((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.TubeGeometry
      ) {
        const curve = child.geometry.parameters.path;
        child.geometry.dispose();
        child.geometry = new THREE.TubeGeometry(
          curve,
          tubeSegments,
          tubeRadius,
          tubeRadialSegments,
          curve.closed
        );
      }
    });

    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  }

  // Initial size setup
  onWindowResize();

  animate();

  // Function to update pipe appearance
  function updatePipes() {
    const brightness = Math.floor(settings.pipes.brightness * 255);
    const color = (brightness << 16) | (brightness << 8) | brightness;
    tubeMaterial.color.setHex(color);

    // Regenerate tubes with new thickness
    sphere.children.forEach((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.TubeGeometry
      ) {
        const curve = child.geometry.parameters.path;
        child.geometry.dispose();
        child.geometry = new THREE.TubeGeometry(
          curve,
          tubeSegments,
          settings.pipes.thickness,
          tubeRadialSegments,
          curve.closed
        );
      }
    });
  }

  // Function to regenerate dots with current settings
  function regenerateDots() {
    // Remove existing dots
    sphere.children = sphere.children.filter(
      (child) =>
        !(
          child.geometry instanceof THREE.SphereGeometry &&
          child.material === dotMaterial
        )
    );
    // Generate new dots with current settings
    for (let i = 0; i < settings.dots.count; i++) {
      let lat, lng;

      if (Math.random() < settings.dots.clusterProbability) {
        const center =
          populationCenters[
            Math.floor(Math.random() * populationCenters.length)
          ];
        const spreadFactor =
          center.spread *
          (0.4 + Math.random() * 0.45) *
          settings.dots.spreadMultiplier;
        lat = center.lat + (Math.random() - 0.5) * spreadFactor;
        lng = center.lng + (Math.random() - 0.5) * spreadFactor;
        lat = Math.max(-60, Math.min(60, lat));
      } else {
        lng = Math.random() * 360 - 180;
        lat = (Math.asin(Math.pow(Math.random(), 2.2) * 2 - 1) * 180) / Math.PI;
      }

      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = ((180 + lng) * Math.PI) / 180;

      const dotOffset = 0.035;
      const x = (radius + dotOffset) * Math.sin(phi) * Math.cos(theta);
      const y = (radius + dotOffset) * Math.cos(phi);
      const z = (radius + dotOffset) * Math.sin(phi) * Math.sin(theta);

      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, z);

      const normal = new THREE.Vector3(x, y, z).normalize();
      dot.position.copy(normal.multiplyScalar(radius + dotOffset));
      dot.lookAt(dot.position.clone().add(normal));

      sphere.add(dot);
    }
  }

  // Function to update colors when CSS variables change
  function updateColors() {
    const bgColor = getCSSColor("--_webflow-conf-2025---background-secondary");
    const gridColor = getCSSColor("--_webflow-conf-2025---grid-border");
    const dotColor = getCSSColor("--_webflow-conf-2025---brand-primary");

    material.color.copy(bgColor);
    tubeMaterial.color.copy(gridColor);
    dotMaterial.color.copy(dotColor);
    outlineMaterial.uniforms.color.value.copy(gridColor);
  }

  // Listen for changes to the reduced motion preference
  window
    .matchMedia("(prefers-reduced-motion: reduce)")
    .addEventListener("change", (event) => {
      const newPrefersReducedMotion = event.matches;

      // Update settings based on new preference
      settings.rotation.base = newPrefersReducedMotion ? 0.0005 : 0.0013;
      settings.rotation.max = newPrefersReducedMotion ? 0.0005 : 0.025;

      // Reset current speed to base speed
      targetRotationSpeed = settings.rotation.base;
      currentRotationSpeed = settings.rotation.base;
    });

  // Ensure the globe is responsive to window resizing
  window.addEventListener("resize", onWindowResize);
})();
