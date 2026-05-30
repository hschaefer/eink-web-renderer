const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const cron = require('node-cron');

// 1. Read environment variables with robust defaults
const TARGET_URL = process.env.TARGET_URL || 'https://example.com';
const CRON_JOB = process.env.CRON_JOB || '*/1 * * * *';
const RENDERING_TIMEOUT = parseInt(process.env.RENDERING_TIMEOUT, 10) || 30000;
const RENDERING_DELAY = parseInt(process.env.RENDERING_DELAY, 10) || 1000;
const RENDERING_SCREEN_WIDTH = parseInt(process.env.RENDERING_SCREEN_WIDTH, 10) || 1200;
const RENDERING_SCREEN_HEIGHT = parseInt(process.env.RENDERING_SCREEN_HEIGHT, 10) || 825;
const GRAYSCALE_DEPTH = parseInt(process.env.GRAYSCALE_DEPTH, 10) || 8;

const OUTPUT_FILE = path.join(__dirname, 'eink.png');
let isRendering = false;

console.log('--- Configuration Loaded ---');
console.log(`TARGET_URL: ${TARGET_URL}`);
console.log(`CRON_JOB: ${CRON_JOB}`);
console.log(`RENDERING_TIMEOUT: ${RENDERING_TIMEOUT}ms`);
console.log(`RENDERING_DELAY: ${RENDERING_DELAY}ms`);
console.log(`RENDERING_SCREEN_WIDTH: ${RENDERING_SCREEN_WIDTH}px`);
console.log(`RENDERING_SCREEN_HEIGHT: ${RENDERING_SCREEN_HEIGHT}px`);
console.log(`GRAYSCALE_DEPTH: ${GRAYSCALE_DEPTH}-bit`);
console.log('-----------------------------');

// 2. Core Screenshot and Image Processing Logic
async function captureScreenshot() {
  if (isRendering) {
    console.log(`[${new Date().toISOString()}] Screenshot capture already in progress. Skipping duplicate run.`);
    return;
  }

  isRendering = true;
  console.log(`[${new Date().toISOString()}] Starting screenshot capture from ${TARGET_URL}...`);
  let browser;

  try {
    // Launch Puppeteer with optimal Docker options
    browser = await puppeteer.launch({
      headless: 'shell',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--hide-scrollbars',
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport dimensions
    await page.setViewport({
      width: RENDERING_SCREEN_WIDTH,
      height: RENDERING_SCREEN_HEIGHT,
      deviceScaleFactor: 1,
    });

    console.log(`Navigating to target URL: ${TARGET_URL}`);
    // Navigate and wait until there are no more than 2 network connections for at least 500ms
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: RENDERING_TIMEOUT,
    });

    // Additional post-load rendering delay (for animations or dynamic data to settle)
    if (RENDERING_DELAY > 0) {
      console.log(`Waiting for RENDERING_DELAY (${RENDERING_DELAY}ms)...`);
      await new Promise((resolve) => setTimeout(resolve, RENDERING_DELAY));
    }

    console.log('Capturing viewport screenshot...');
    const rawBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    console.log('Processing image with Sharp...');
    let sharpPipeline = sharp(rawBuffer).grayscale();

    // Dynamically handle requested grayscale bit depths
    let colorPaletteCount = 256;
    if (GRAYSCALE_DEPTH === 1) {
      console.log('Applying binary threshold filter (1-bit grayscale)...');
      sharpPipeline = sharpPipeline.threshold(128);
      colorPaletteCount = 2;
    } else if (GRAYSCALE_DEPTH === 4) {
      console.log('Applying posterization filter (4-bit grayscale)...');
      sharpPipeline = sharpPipeline.posterize(16);
      colorPaletteCount = 16;
    } else {
      console.log('Applying standard 8-bit grayscale...');
    }

    // Save final optimized PNG
    await sharpPipeline
      .png({
        colors: colorPaletteCount,
        palette: true,
        compressionLevel: 9,
      })
      .toFile(OUTPUT_FILE);

    console.log(`[${new Date().toISOString()}] Successfully updated e-ink image: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error capturing screenshot:`, error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    isRendering = false;
  }
}

// 3. Web Server Logic using Express
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
  if (fs.existsSync(OUTPUT_FILE)) {
    // Explicitly prevent any aggressive caching on the client/browser
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'image/png');
    
    res.sendFile(OUTPUT_FILE, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).send('Error reading e-ink image from disk.');
        }
      }
    });
  } else {
    // Standard temporary fallback status before first capture finishes
    res.status(503)
       .setHeader('Content-Type', 'text/plain')
       .send('E-ink image is currently generating. Please try again in a few seconds.');
  }
});

// Start Web Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server listening on http://0.0.0.0:${PORT}`);
});

// 4. Initial Run & Cron Job Scheduling
(async () => {
  // Capture screenshot immediately on startup
  console.log('Executing immediate startup screenshot capture...');
  await captureScreenshot();

  // Validate and schedule recurring cron job
  if (cron.validate(CRON_JOB)) {
    cron.schedule(CRON_JOB, async () => {
      console.log(`[${new Date().toISOString()}] Cron job triggered (${CRON_JOB})`);
      await captureScreenshot();
    });
    console.log(`Cron job scheduled with pattern: "${CRON_JOB}"`);
  } else {
    console.error(`ERROR: "${CRON_JOB}" is not a valid cron expression. Chronological scheduling disabled.`);
  }
})();
