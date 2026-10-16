// ================================================================== PROJECT (one per carousel)
// Everything the engine needs to know about this carousel. Slide count = slides.length.
const PROJECT = {
  brand: 'Ember & Bun',            // shown in the preview page header
  title: 'The Inferno',            // campaign / carousel name
  loop: 8,                         // seconds per slide loop (4, 6 or 8 = whole bars at 120 BPM)
  floor: 1100,                     // y of the shared floor line across all slides
  slides: ['Hook', 'The build', 'Layers', 'The sauce', 'The reveal', 'Call to action'],          // preview UI names
  counters: ['THE TEASE', 'THE BUILD', 'THE LAYERS', 'THE SAUCE', 'THE REVEAL', 'THE DROP'],    // small on-slide counter
  mark: 'EMBER & BUN',             // small top-left brand mark on the slides
};
