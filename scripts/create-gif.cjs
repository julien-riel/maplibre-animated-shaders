/**
 * Script to create GIF from PNG frames
 * Usage: node scripts/create-gif.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const GIFEncoder = require('gif-encoder-2');

const FRAMES_DIR = path.join(__dirname, '../.playwright-mcp');
const OUTPUT_FILE = path.join(__dirname, '../assets/demo.gif');

async function createGif() {
  // Get all frame files
  const frameFiles = fs.readdirSync(FRAMES_DIR)
    .filter(f => f.startsWith('frame-') && f.endsWith('.png'))
    .sort();

  if (frameFiles.length === 0) {
    console.error('No frame files found in', FRAMES_DIR);
    process.exit(1);
  }

  console.log(`Found ${frameFiles.length} frames`);

  // Read first frame to get dimensions
  const firstFrame = PNG.sync.read(fs.readFileSync(path.join(FRAMES_DIR, frameFiles[0])));
  const { width, height } = firstFrame;

  console.log(`Frame dimensions: ${width}x${height}`);

  // Create GIF encoder
  const encoder = new GIFEncoder(width, height, 'neuquant', true);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create write stream
  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  encoder.createReadStream().pipe(writeStream);

  // Start encoding
  encoder.start();
  encoder.setDelay(200); // 200ms between frames (5 FPS)
  encoder.setRepeat(0);  // Loop forever
  encoder.setQuality(10); // Best quality

  // Add each frame
  for (const frameFile of frameFiles) {
    const framePath = path.join(FRAMES_DIR, frameFile);
    console.log(`Processing ${frameFile}...`);

    const png = PNG.sync.read(fs.readFileSync(framePath));
    encoder.addFrame(png.data);
  }

  // Finish encoding
  encoder.finish();

  console.log(`GIF created: ${OUTPUT_FILE}`);
}

createGif().catch(console.error);
