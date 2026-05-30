# E-Ink Web Renderer

A lightweight Node.js microservice designed to render web content for E-Ink displays. It periodically takes screenshots of a target web page using Puppeteer, converts them to grayscale with customizable bit depths (1-bit, 4-bit, or 8-bit) using Sharp, and serves the optimized image over a fast Express HTTP server.

Ideal for integration with [HomePlate](https://github.com/lanrat/homeplate).
I am using this to render my [React eInk dashboard](https://github.com/hschaefer/e-ink-dashboard).

---

## Environment Variables

Configure the renderer's behavior using the following environment variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `TARGET_URL` | `https://example.com` | The web page or dashboard URL to capture. |
| `CRON_JOB` | `*/1 * * * *` | Standard cron pattern. Default runs every minute. |
| `RENDERING_TIMEOUT` | `30000` | Max milliseconds to wait for the web page to load (`networkidle2`). |
| `RENDERING_DELAY` | `1000` | Settle delay in milliseconds after load (to let animations or APIs finish rendering). |
| `RENDERING_SCREEN_WIDTH` | `1200` | Viewport and output width in pixels. |
| `RENDERING_SCREEN_HEIGHT` | `825` | Viewport and output height in pixels. |
| `GRAYSCALE_DEPTH` | `8` | Grayscale bit depth. Supported options: `1` (binary), `4` (16 shades), `8` (256 shades). |

---

## Quick Start

### Option 1: Using Docker Compose (Recommended)

Docker Compose is the easiest way to run the service as all Chromium dependencies and Puppeteer sandboxing parameters are fully handled for you.

1. **Clone the repository** (if you haven't already).
2. **Launch the container**:
   ```bash
   docker-compose up -d --build
   ```
3. **Verify running state**:
   ```bash
   docker logs eink-web-renderer
   ```
4. **Access the image**:
   Open `http://localhost:8080/` in your browser.

### Option 2: Running Locally with Node.js

You can also run this directly on your host system if Node.js is installed.

> **Note**: Your system must have the necessary dependencies to run Chromium headless (see [Puppeteer troubleshooting](https://pptr.dev/troubleshooting)).

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start the Service**:
   ```bash
   # Run with custom environment variables
   TARGET_URL="https://news.ycombinator.com" GRAYSCALE_DEPTH=4 npm start
   ```
3. **Fetch Render**:
   - `GET http://localhost:8080/`

---
