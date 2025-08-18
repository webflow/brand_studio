# Video Library

A lightweight, accessible video library for lazy loading, play/pause controls, and responsive video management.

## Features

- **Lazy Loading**: Videos load only when they come into viewport
- **Accessibility**: Respects `prefers-reduced-motion` setting
- **Play/Pause Controls**: Easy-to-implement button controls
- **Scroll Triggers**: Play videos when specific elements come into view
- **Responsive**: Automatically removes desktop-only videos on mobile
- **Clean API**: Simple programmatic control over videos

## Quick Start

1. Include the library in your HTML from the CDN:

```html
<script src="https://cdn.jsdelivr.net/gh/webflow/brand_studio@latest/global-brand-code/custom-components/video-library.min.js"></script>
```

2. Add videos with the required data attributes:

```html
<video data-video="my-video" muted loop>
  <source data-src="path/to/video.mp4" type="video/mp4" />
</video>
```

3. The library auto-initializes when the DOM is ready!

## HTML Markup

### Basic Video

```html
<video data-video="unique-id" muted loop poster="poster.jpg">
  <source data-src="video.mp4" type="video/mp4" />
</video>
```

### Play/Pause Controls

```html
<div class="features_video-playback-position">
  <video data-video="controlled-video"></video>
  <button data-video-playback="play">Play</button>
  <button data-video-playback="pause">Pause</button>
</div>
```

### Scroll-In-Play Video

```html
<!-- Video that plays when it comes into view and pauses when it leaves -->
<video data-video="scroll-video" data-video-scroll-in-play="true" muted loop>
  <source data-src="video.mp4" type="video/mp4" />
</video>
```

### Autoplay Video

```html
<!-- Video that plays immediately when loaded (default behavior) -->
<video data-video="autoplay-video" data-video-scroll-in-play="false" muted loop>
  <source data-src="video.mp4" type="video/mp4" />
</video>
```

### Desktop-Only Video

```html
<!-- Video hidden on mobile (poster remains visible) -->
<video
  data-video="desktop-video"
  data-video-desktop-only="true"
  muted
  loop
  poster="poster.jpg"
>
  <source data-src="video.mp4" type="video/mp4" />
</video>
```

## JavaScript API

### Initialization

The library auto-initializes, but you can also manually create an instance:

```javascript
const videoLib = new VideoLibrary({
  rootMargin: "300px", // Lazy loading trigger distance
  threshold: 0, // Intersection threshold for lazy loading
  scrollTriggerThreshold: 0.5, // Threshold for scroll triggers
});
```

### Methods

```javascript
// Play a specific video
window.videoLibrary.playVideo("video-id");

// Pause a specific video
window.videoLibrary.pauseVideo("video-id");

// Pause all videos
window.videoLibrary.pauseAllVideos();

// Reinitialize after DOM changes
window.videoLibrary.reinitialize();

// Clean up observers
window.videoLibrary.destroy();
```

## Data Attributes

| Attribute                          | Element    | Values     | Purpose                                   |
| ---------------------------------- | ---------- | ---------- | ----------------------------------------- |
| `data-video="id"`                  | `<video>`  | string     | Unique identifier for the video           |
| `data-src="url"`                   | `<source>` | string     | Video URL for lazy loading                |
| `data-video-playback="play"`       | `<button>` | -          | Play button                               |
| `data-video-playback="pause"`      | `<button>` | -          | Pause button                              |
| `data-video-desktop-only="true"`   | `<video>`  | true/false | Hide video and controls on mobile         |
| `data-video-scroll-in-play="true"` | `<video>`  | true/false | Play when in view, pause when out of view |

## Accessibility

The library automatically:

- Respects `prefers-reduced-motion` setting
- Prevents auto-play when reduced motion is preferred
- Still lazy loads videos for poster display
- Maintains video controls functionality

## Browser Support

- Modern browsers with IntersectionObserver support
- Graceful degradation for older browsers
- Mobile-responsive design

## Examples

See `video-library-example.html` for complete working examples of all features.

## Integration with Existing Code

If you're migrating from the original `bg-video.js`, simply:

1. Include `video-library.js` before your existing scripts
2. Replace the old initialization with the new simplified version
3. Keep your existing HTML markup (it's compatible!)

The new library maintains the same data attribute structure while providing a cleaner, more maintainable codebase.
