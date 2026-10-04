// Script to generate high-quality PNG icons for PWA using pure Node.js + built-in zlib
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const toCrc = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(toCrc);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);

    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPNG(width, height, pixelDrawer) {
    // 1. Signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // 2. IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // 8 bits per channel
    ihdrData[9] = 6; // RGBA
    ihdrData[10] = 0; // Deflate
    ihdrData[11] = 0; // Filter method
    ihdrData[12] = 0; // No interlace
    const ihdrChunk = makeChunk('IHDR', ihdrData);

    // 3. Raw Scanlines
    const rawScanlines = Buffer.alloc(height * (1 + width * 4));
    let offset = 0;

    for (let y = 0; y < height; y++) {
        rawScanlines[offset++] = 0; // Filter type 0 (None)
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = pixelDrawer(x, y, width, height);
            rawScanlines[offset++] = r;
            rawScanlines[offset++] = g;
            rawScanlines[offset++] = b;
            rawScanlines[offset++] = a;
        }
    }

    // 4. IDAT
    const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
    const idatChunk = makeChunk('IDAT', compressed);

    // 5. IEND
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawAppIconPixel(x, y, w, h) {
    // Normalized coordinates [0, 1]
    const nx = x / w;
    const ny = y / h;

    // Rounded rectangle check for icon container (corner radius 0.22)
    const cornerRadius = 0.22;
    let inCard = false;
    let distCorner = 0;

    const dx = Math.abs(nx - 0.5);
    const dy = Math.abs(ny - 0.5);
    const halfWidth = 0.46;
    const halfHeight = 0.46;

    if (dx <= halfWidth && dy <= halfHeight) {
        const cx = halfWidth - cornerRadius;
        const cy = halfHeight - cornerRadius;
        if (dx <= cx || dy <= cy) {
            inCard = true;
        } else {
            const d = Math.hypot(dx - cx, dy - cy);
            if (d <= cornerRadius) {
                inCard = true;
            }
        }
    }

    if (!inCard) {
        return [0, 0, 0, 0]; // Transparent background
    }

    // Background gradient: Deep Slate (#0f172a to #1e293b)
    const t = (nx + ny) / 2;
    let r = Math.round(15 + t * (30 - 15));
    let g = Math.round(23 + t * (41 - 23));
    let b = Math.round(42 + t * (59 - 42));

    // Book spine and pages area
    // Center at nx = 0.5, ny = 0.55
    const bx = (nx - 0.5) * 2; // [-1, 1]
    const by = (ny - 0.55) * 2; // [-1, 1]

    // Check if inside book
    if (Math.abs(bx) < 0.72 && by > -0.55 && by < 0.55) {
        // Book base
        if (bx < 0) {
            // Left page: Pedagogical lines
            r = 248; g = 250; b = 252;
            // Draw text lines
            const lineY = (by + 0.55) * 5;
            const lineFrac = lineY - Math.floor(lineY);
            if (bx > -0.6 && bx < -0.1 && lineFrac > 0.35 && lineFrac < 0.65) {
                r = 148; g = 163; b = 184; // Line color
            }
        } else {
            // Right page: Sociogram constellation
            r = 248; g = 250; b = 252;

            // Nodes
            const n1 = Math.hypot(bx - 0.35, by - (-0.18)); // Leader
            const n2 = Math.hypot(bx - 0.18, by - 0.18);
            const n3 = Math.hypot(bx - 0.52, by - 0.12);
            const n4 = Math.hypot(bx - 0.40, by - 0.38);

            if (n1 < 0.11) {
                r = 2; g = 132; b = 199; // Cyan/Blue Leader
            } else if (n2 < 0.08) {
                r = 16; g = 185; b = 129; // Green
            } else if (n3 < 0.085) {
                r = 245; g = 158; b = 11; // Amber
            } else if (n4 < 0.075) {
                r = 139; g = 92; b = 246; // Purple
            } else if (n1 < 0.13 || n2 < 0.10 || n3 < 0.105 || n4 < 0.095) {
                r = 255; g = 255; b = 255; // White border
            }
        }

        // Spine shadow
        if (Math.abs(bx) < 0.03) {
            r = 2; g = 132; b = 199;
        }
    }

    // Top Star (Golden)
    const starDist = Math.hypot(nx - 0.5, ny - 0.18);
    if (starDist < 0.08) {
        r = 250; g = 204; b = 21;
    }

    return [r, g, b, 255];
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192
const png192 = createPNG(192, 192, drawAppIconPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('icon-192.png generated successfully.');

// Generate 512x512
const png512 = createPNG(512, 512, drawAppIconPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('icon-512.png generated successfully.');
