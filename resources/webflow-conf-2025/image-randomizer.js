// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Animation timing configuration (in seconds)
const timingConfig = {
  fadeInDuration: 0.4, // Duration for fade-in animation
  fadeOutDuration: 0.4, // Duration for fade-out animation
  visibleDelay: 1.5, // How long to hold image visible before fading out
  staggerDelay: 0.15, // Delay between animations when multiple cells are triggered
  minInterval: 1.0, // Minimum time between animation cycles (seconds)
  maxInterval: 3.0, // Maximum time between animation cycles (seconds)
  initialDelay: 1.0, // Delay before starting animations on page load
};

// Configuration for random animation counts per group
const groupConfig = {
  // Default configuration for all groups
  default: {
    minCells: 1, // Minimum number of cells to animate at once
    maxCells: 2, // Maximum number of cells to animate at once
  },
  // Group-specific configurations (overrides defaults)
  logos: {
    minCells: 5, // Show at least 2 cells for "logos" group
    maxCells: 6, // Show up to 4 cells for "logos" group
  },
  // Add more group configurations as needed
};

// Create a queue to track recently shown images for each group
const recentlyShownImagesByGroup = {};
const maxQueueLength = 10;

// Store the current displayed image for each cell
const cellImages = new Map();

// Function to get a random image from the matching data-random-img group that hasn't been recently shown
function getRandomImage(group, excludeSrc = null) {
  // Initialize the queue for this group if it doesn't exist
  if (!recentlyShownImagesByGroup[group]) {
    recentlyShownImagesByGroup[group] = [];
  }

  const recentlyShownImages = recentlyShownImagesByGroup[group];
  const images = document.querySelectorAll(`[data-random-img="${group}"]`);
  const totalImages = images.length;

  if (totalImages === 0) {
    console.warn(`No images found with data-random-img="${group}"`);
    return null;
  }

  // If we have fewer than maxQueueLength images total, use a simpler approach to just avoid the last image
  if (totalImages <= maxQueueLength) {
    let availableImages = Array.from(images).filter(
      (img) => img.src !== excludeSrc
    );

    // If somehow we still have no available images, just use any image
    if (availableImages.length === 0) {
      availableImages = Array.from(images);
    }

    // Always select a random image from available ones
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const selectedImage = availableImages[randomIndex].cloneNode(true);

    // Update recently shown queue
    recentlyShownImages.push(selectedImage.src);
    // Keep queue at max length
    if (recentlyShownImages.length > maxQueueLength) {
      recentlyShownImages.shift();
    }

    return selectedImage;
  }

  // For larger sets of images, use a modified queue system that ensures we always get an image
  let availableImages = Array.from(images);

  // First try to get an image that's not the excluded one and not recently shown
  let filteredImages = availableImages.filter(
    (img) => img.src !== excludeSrc && !recentlyShownImages.includes(img.src)
  );

  // If no images pass the filter, try just avoiding the excluded one
  if (filteredImages.length === 0) {
    filteredImages = availableImages.filter((img) => img.src !== excludeSrc);
  }

  // If still no images, use any image
  if (filteredImages.length === 0) {
    filteredImages = availableImages;
  }

  // Select random image from filtered list
  const randomIndex = Math.floor(Math.random() * filteredImages.length);
  const selectedImage = filteredImages[randomIndex];

  // Update recently shown queue
  recentlyShownImages.push(selectedImage.src);
  // Keep queue at max length
  if (recentlyShownImages.length > maxQueueLength) {
    recentlyShownImages.shift();
  }

  return selectedImage.cloneNode(true);
}

// Find all unique groups of random cells
const randomCells = document.querySelectorAll("[data-random-cell]");
const cellGroups = new Set();
randomCells.forEach((cell) => {
  const group = cell.getAttribute("data-random-cell");
  if (group) {
    cellGroups.add(group);
  }
});

// Keep track of the last selected image for each cell
const lastSelectedImages = {};

// Track active animations for auto-triggering
const activeAutoAnimations = new Map();

// Helper function to clear any existing images in a cell
function clearExistingImages(cell) {
  // Remove any existing image elements
  const existingImages = cell.querySelectorAll("img");
  existingImages.forEach((img) => {
    // If GSAP is animating this element, kill the animation
    if (gsap) {
      gsap.killTweensOf(img);
    }
    img.remove();
  });

  // Clear the cell from the active animations map
  activeAutoAnimations.delete(cell.id);

  // Clear the cell from the cellImages map
  cellImages.delete(cell.id);
}

// Function to show an image in a cell
function showImageInCell(cell) {
  const group = cell.getAttribute("data-random-cell");

  // Skip if the cell already has an animation in progress
  if (activeAutoAnimations.has(cell.id)) {
    return;
  }

  // Get a random image from the matching group
  const randomImage = getRandomImage(group, lastSelectedImages[cell.id]);
  if (!randomImage) return; // Skip if no matching images found

  // Update the last selected image for this cell
  lastSelectedImages[cell.id] = randomImage.src;

  // Mark this cell as having an active animation
  activeAutoAnimations.set(cell.id, true);

  // Append the new image to the cell
  const currentImage = randomImage;
  cell.appendChild(currentImage);

  // Store reference to this image in our map
  cellImages.set(cell.id, currentImage);

  if (prefersReducedMotion) {
    // For reduced motion, just show the image immediately
    gsap.set(currentImage, { opacity: 1, x: 0 });

    // Hide image after a delay
    setTimeout(() => {
      // Only remove if it's still the current image for this cell
      if (cellImages.get(cell.id) === currentImage) {
        currentImage.remove();
        activeAutoAnimations.delete(cell.id);
        cellImages.delete(cell.id);
      }
    }, timingConfig.fadeInDuration * 1000);
  } else {
    // Set initial styles for the image
    gsap.set(currentImage, { opacity: 0, x: 0 }); // Move the image slightly to the left

    // Animate the image to fade in and move slightly to the right
    gsap.to(currentImage, {
      opacity: 1,
      x: 0,
      duration: timingConfig.fadeInDuration,
      onComplete: () => {
        // Animate the image to fade out after a brief pause
        gsap.to(currentImage, {
          opacity: 0,
          duration: timingConfig.fadeOutDuration,
          delay: timingConfig.visibleDelay, // Keep visible for a moment
          onComplete: () => {
            // Only remove if it's still the current image for this cell
            if (cellImages.get(cell.id) === currentImage) {
              currentImage.remove();
              activeAutoAnimations.delete(cell.id);
              cellImages.delete(cell.id);
            }
          },
        });
      },
    });
  }
}

// Initialize cells with IDs for tracking
randomCells.forEach((cell) => {
  // Create a unique ID for this cell if it doesn't have one
  if (!cell.id) {
    cell.id = `random-cell-${Math.random().toString(36).substr(2, 9)}`;
  }
});

// Function to trigger a random animation
function triggerRandomAnimation() {
  // Get all cells that don't currently have an active animation
  const availableCells = Array.from(randomCells).filter(
    (cell) => !activeAutoAnimations.has(cell.id)
  );

  // Ensure we continue even if no cells are available right now
  if (availableCells.length === 0) {
    // Schedule the next animation attempt anyway
    const nextInterval =
      Math.random() *
        ((timingConfig.maxInterval - timingConfig.minInterval) * 1000) +
      timingConfig.minInterval * 1000;
    setTimeout(triggerRandomAnimation, nextInterval);
    return;
  }

  // Group cells by their group attribute
  const cellsByGroup = {};
  availableCells.forEach((cell) => {
    const group = cell.getAttribute("data-random-cell");
    if (!cellsByGroup[group]) {
      cellsByGroup[group] = [];
    }
    cellsByGroup[group].push(cell);
  });

  // Track all selected cells across groups
  const selectedCells = [];

  // Process each group separately to respect group-specific configurations
  Object.entries(cellsByGroup).forEach(([group, cells]) => {
    // Get configuration for this group, fallback to default if not specified
    const config = groupConfig[group] || groupConfig.default;

    // Randomly decide how many cells to animate based on group configuration
    const minCells = config.minCells;
    const maxCells = config.maxCells;
    const cellCount = Math.min(
      Math.floor(Math.random() * (maxCells - minCells + 1)) + minCells,
      cells.length
    );

    // Select random cells from this group
    const groupSelectedCells = [];
    const availableGroupCells = [...cells]; // Create a copy to modify

    for (let i = 0; i < cellCount; i++) {
      if (availableGroupCells.length === 0) break;

      // Pick a random cell from remaining available cells in this group
      const randomIndex = Math.floor(
        Math.random() * availableGroupCells.length
      );
      const randomCell = availableGroupCells[randomIndex];

      // Add to selected cells and remove from available pool
      groupSelectedCells.push(randomCell);
      availableGroupCells.splice(randomIndex, 1);
    }

    // Add this group's selected cells to the overall selection
    selectedCells.push(...groupSelectedCells);
  });

  // Animate each selected cell
  selectedCells.forEach((cell, index) => {
    // Slight staggered delay for multiple cells
    setTimeout(() => {
      // Clear any existing images first
      clearExistingImages(cell);

      // Then show the new image
      showImageInCell(cell);
    }, index * (timingConfig.staggerDelay * 1000)); // Stagger delay between animations
  });

  // Schedule the next animation with a random interval
  const nextInterval =
    Math.random() *
      ((timingConfig.maxInterval - timingConfig.minInterval) * 1000) +
    timingConfig.minInterval * 1000; // Random time between min and max interval
  setTimeout(triggerRandomAnimation, nextInterval);
}

// Start the automatic triggering with random intervals
if (randomCells.length > 0) {
  // Initial delay before starting the auto-animations
  setTimeout(() => {
    triggerRandomAnimation(); // This will schedule the next animation with a random interval
  }, timingConfig.initialDelay * 1000); // Initial delay before starting animations
}
