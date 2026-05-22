/**
 * Advanced image processing utility for stripping and cleaning logo backgrounds in the browser.
 */

/**
 * Strips the solid white or off-white background from a Base64 image.
 * Uses a border-initiated flood-fill (BFS) to preserve inner white areas (like white shields or open books)
 * while smoothly feathering the edges to make the logo look incredibly crisp assets on dark backgrounds.
 * 
 * @param base64Src The source Base64 image data string.
 * @param tolerance Value between 0 and 255 representing white sensitivity (typically 30-45 works best).
 * @returns A promise that resolves to the transparent-background PNG Base64 data string.
 */
export function removeLogoBackground(base64Src: string, tolerance: number = 40): Promise<string> {
  // If it's already the default SVG (starts with data:image/svg+xml), it is already fully vector and transparent
  if (base64Src.startsWith('data:image/svg+xml')) {
    return Promise.resolve(base64Src);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Src);
          return;
        }
        
        // Draw image initially
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Visited array to track flood-fill traversal
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];
        
        // Definition: target white color threshold (e.g. RGB components all greater than 255 - tolerance)
        const isNearWhite = (idx: number) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          
          if (a < 15) return false; // Already highly transparent
          
          const threshold = 255 - tolerance;
          return r > threshold && g > threshold && b > threshold;
        };
        
        // Initialize border pixels (top/bottom) into the BFS queue
        for (let x = 0; x < width; x++) {
          // Top row
          const idxTop = (0 * width + x) * 4;
          if (isNearWhite(idxTop)) {
            queue.push(x, 0);
            visited[0 * width + x] = 1;
          }
          // Bottom row
          const idxBottom = ((height - 1) * width + x) * 4;
          if (isNearWhite(idxBottom)) {
            queue.push(x, height - 1);
            visited[(height - 1) * width + x] = 1;
          }
        }
        
        // Initialize border pixels (left/right) into the BFS queue
        for (let y = 0; y < height; y++) {
          // Left column
          const idxLeft = (y * width + 0) * 4;
          if (isNearWhite(idxLeft) && !visited[y * width + 0]) {
            queue.push(0, y);
            visited[y * width + 0] = 1;
          }
          // Right column
          const idxRight = (y * width + (width - 1)) * 4;
          if (isNearWhite(idxRight) && !visited[y * width + (width - 1)]) {
            queue.push(width - 1, y);
            visited[y * width + (width - 1)] = 1;
          }
        }
        
        // Run BFS search to clear entire outer bounding boundary of white background
        let head = 0;
        while (head < queue.length) {
          const cx = queue[head++];
          const cy = queue[head++];
          
          const currentIdx = (cy * width + cx) * 4;
          // Set alpha of this outer background pixel to 0 (completely transparent)
          data[currentIdx + 3] = 0;
          
          // Connect 4 directions
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1]
          ];
          
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const visitIdx = ny * width + nx;
              if (!visited[visitIdx]) {
                const dataIdx = visitIdx * 4;
                if (isNearWhite(dataIdx)) {
                  visited[visitIdx] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }
        
        // Fine Feathering: Smooth and blend transitional pixels to prevent jagged edge outlines
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            // If the pixel is opaque, check if it borders any transparent pixel
            if (data[idx + 3] > 15) {
              const leftAlpha = data[(y * width + (x - 1)) * 4 + 3];
              const rightAlpha = data[(y * width + (x + 1)) * 4 + 3];
              const topAlpha = data[((y - 1) * width + x) * 4 + 3];
              const bottomAlpha = data[((y + 1) * width + x) * 4 + 3];
              
              if (leftAlpha < 50 || rightAlpha < 50 || topAlpha < 50 || bottomAlpha < 50) {
                // Determine brightness to scale opacity smoothly
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness > 120) {
                  const factor = (brightness - 120) / 135; // 0.0 to 1.0 based on lightness
                  data[idx + 3] = Math.round(data[idx + 3] * (1 - factor * 0.85)); // Blend seamlessly
                }
              }
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error("Error removing logo background:", e);
        resolve(base64Src);
      }
    };
    
    img.onerror = () => {
      resolve(base64Src);
    };
    
    img.src = base64Src;
  });
}
