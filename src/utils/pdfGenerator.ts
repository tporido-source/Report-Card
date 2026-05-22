/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Student } from '../types.ts';
import QRCode from 'qrcode';

// Code 39 lookup table
const CODE39_PATTERNS: Record<string, string> = {
  '0': 'NNNWWNWNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
  '4': 'NNNWWNNNW', '5': 'WNNWWNNNN', '6': 'NNWWWNNNN', '7': 'NNNWNNWNW',
  '8': 'WNNWNNWNN', '9': 'NNWWNNWNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
  'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
  'G': 'NNNNNWWNW', 'H': 'WNNNNWWNN', 'I': 'NNWNNWWNN', 'J': 'NNNNWWWNN',
  'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
  'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
  'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
  'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
  '-': 'NWNNNNWNW', '.': 'WWNNNNWNN', ' ': 'NWWNNNWNN', '*': 'NWNNWNNWN',
};

// Draw a native vector Code 39 barcode in the PDF
function drawPdfBarcode(doc: jsPDF, x: number, y: number, value: string, height: number, scaleWidth: number) {
  const formatted = value.toUpperCase().trim();
  // Filter barcode input
  let filtered = '';
  for (let idx = 0; idx < formatted.length; idx++) {
    const char = formatted[idx];
    if (CODE39_PATTERNS[char] !== undefined) {
      filtered += char;
    } else {
      filtered += '-';
    }
  }
  const code = `*${filtered}*`;
  
  const narrow = 0.22 * scaleWidth;
  const wide = 0.65 * scaleWidth;
  const interGap = 0.3 * scaleWidth;
  
  let curX = x;
  doc.setFillColor(0, 0, 0); // Black

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const pat = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const bit = pat[j];
      const w = bit === 'W' ? wide : narrow;
      if (isBar) {
        doc.rect(curX, y, w, height, 'F');
      }
      curX += w;
    }
    curX += interGap;
  }
}

// Generate the cells and lay the calendar grid out in vector PDF coordinates (fully scalable)
function drawCalendarPdf(
  doc: jsPDF, 
  x: number, 
  y: number, 
  monthName: string, 
  startDayOfWeek: number, 
  totalDays: number, 
  cellW = 3.2, 
  cellH = 2.6
) {
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const scale = cellW / 4.8;
  
  // Set month title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5 * scale);
  doc.setTextColor(30, 27, 75); // Indigo index text
  doc.text(`${monthName.toUpperCase()} 2026`, x + (7 * cellW) / 2, y + 2.0 * scale, { align: 'center' });
  
  // Underline for month title
  doc.setDrawColor(218, 222, 229);
  doc.setLineWidth(0.2);
  doc.line(x, y + 3.0 * scale, x + (7 * cellW), y + 3.0 * scale);
  
  // Draw weekdays letters
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0 * scale);
  doc.setTextColor(140, 145, 155);
  
  for (let dIdx = 0; dIdx < 7; dIdx++) {
    doc.text(daysOfWeek[dIdx], x + dIdx * cellW + cellW / 2 + 0.3, y + 5.2 * scale, { align: 'center' });
  }
  
  // Render grid numbers
  // Mon-indexed start days padding
  const padding = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  let cellXIdx = padding;
  let cellYIdx = 0;
  
  for (let curDay = 1; curDay <= totalDays; curDay++) {
    const rx = x + cellXIdx * cellW;
    const ry = y + (6.5 * scale) + cellYIdx * cellH;
    
    const dIndex = (startDayOfWeek - 1 + curDay - 1) % 7;
    const isWeekend = dIndex === 5 || dIndex === 6;

    // Draw tiny light border cell with weekend highlight backgrounds
    if (isWeekend) {
      doc.setFillColor(254, 251, 243); // Subtle warm weekend bg
      doc.setDrawColor(238, 230, 215);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(240, 242, 244);
    }
    
    doc.setLineWidth(0.12);
    doc.roundedRect(rx + 0.2, ry + 0.2, cellW - 0.4, cellH - 0.4, 0.4, 0.4, 'FD');
    
    // Print day number (offset slightly to leave space for checkboxes)
    doc.setFont('courier', 'bold');
    doc.setFontSize(5.0 * scale);
    doc.setTextColor(40, 45, 55);
    doc.text(curDay.toString(), rx + 0.6 * scale, ry + 1.8 * scale);
    
    // Draw one single, exquisite empty checkbox representing the tracking punch space
    doc.setLineWidth(0.08);
    doc.setDrawColor(180, 185, 190);
    doc.rect(rx + 1.6 * scale, ry + 2.1 * scale, 1.6 * scale, 1.4 * scale, 'S');
    
    // Increment indices
    cellXIdx++;
    if (cellXIdx >= 7) {
      cellXIdx = 0;
      cellYIdx++;
    }
  }
}

// Draw the front of the student card in vector PDF format
function drawCardFrontPdf(
  doc: jsPDF, 
  x: number, 
  y: number, 
  student: Student, 
  cw: number, 
  ch: number, 
  logoBase64?: string | null,
  qrBase64?: string | null
) {
  const serialNo = `SPSSN-2026-${(student.adminNo || student.id || "0000").replace(/[^0-9]/g, "").slice(0, 5).padStart(5, "0")}`;
  
  // Set Card stroke color and gradient configuration
  let r1 = 12, g1 = 11, b1 = 37;      // Brand dark blue
  let r2 = 37, g2 = 32, b2 = 110;     // Brand purple navy
  
  if (student.isCleared) {
    doc.setDrawColor(16, 185, 129); // emerald-500
    r1 = 6; g1 = 78; b1 = 59;        // emerald-900 / dark green
    r2 = 16; g2 = 185; b2 = 129;     // emerald-500 / emerald
  } else {
    doc.setDrawColor(30, 27, 75); // Dark brand navy/indigo #1E1B4B
    r1 = 12; g1 = 11; b1 = 37;
    r2 = 37; g2 = 32; b2 = 110;
  }
  
  // 1. Draw solid rounded border card base
  doc.setLineWidth(1.6);
  doc.roundedRect(x, y, cw, ch, 3.5, 3.5, 'D');
  
  // 2. Clear border card headers gradient ribbon color overlay
  // Rounded corners base with color 1 on left and color 2 on right
  doc.setFillColor(r1, g1, b1);
  doc.roundedRect(x + 0.5, y + 0.5, 8.0, 9.5, 3.5, 3.5, 'F');
  doc.rect(x + 0.5, y + 6.0, 8.0, 4.5, 'F');
  
  doc.setFillColor(r2, g2, b2);
  doc.roundedRect(x + cw - 8.5, y + 0.5, 8.0, 9.5, 3.5, 3.5, 'F');
  doc.rect(x + cw - 8.5, y + 6.0, 8.0, 4.5, 'F');
  
  // Transition gradient slices in the flat middle section (from x+4.0 to x+cw-4.0)
  const gStartX = x + 4.0;
  const gWidth = cw - 8.0;
  const steps = 30;
  const stepW = gWidth / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const gr = Math.round(r1 + (r2 - r1) * t);
    const gg = Math.round(g1 + (g2 - g1) * t);
    const gb = Math.round(b1 + (b2 - b1) * t);
    doc.setFillColor(gr, gg, gb);
    doc.rect(gStartX + i * stepW, y + 0.5, stepW + 0.1, 10.5, 'F');
  }
  
  // Draw school logo icon
  let hasImageDrawn = false;
  if (logoBase64) {
    try {
      const isSvg = logoBase64.includes('svg+xml');
      doc.addImage(logoBase64, isSvg ? 'SVG' : 'PNG', x + 3.5, y + 1.8, 6.4, 6.4);
      hasImageDrawn = true;
    } catch (e) {
      console.warn("Could not draw logoBase64 directly via addImage, using fallback:", e);
    }
  }

  if (!hasImageDrawn) {
    doc.setFillColor(19, 15, 60);
    doc.roundedRect(x + 3.3, y + 1.6, 6.8, 6.8, 1.4, 1.4, 'F');
    doc.setFillColor(124, 58, 45);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.24);
    doc.triangle(x + 3.6, y + 2.0, x + 9.8, y + 2.0, x + 6.7, y + 8.1, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(19, 15, 60);
    doc.setLineWidth(0.12);
    doc.triangle(x + 4.2, y + 2.8, x + 9.2, y + 2.8, x + 6.7, y + 7.3, 'FD');
  }
  
  // Card title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ST. PAUL SECONDARY SCHOOL, NASUTI', x + 11.2, y + 4.8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.text('P.O.BOX 678, NASUTI IGANGA • "God is My Guide"', x + 11.2, y + 7.8);
  
  // White right badge on Header: "TERM 2, 2026"
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(x + cw - 24, y + 2.2, 20.5, 4.6, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(255, 255, 255);
  doc.text('TERM 2, 2026', x + cw - 23, y + 5.5);

  // 3. Faint watermark logo behind text in content layer
  // 2.5 Dynamic Parallel Security Guilloche Lines and Concentric Rings (Extremely Subtle/Faint)
  doc.setLineWidth(0.08);
  doc.setDrawColor(248, 250, 253);
  // Diagonal parallel security lines
  for (let d = -45; d < cw + 30; d += 5.5) {
    doc.line(x + d, y + 10.5, x + d + 25.0, y + ch - 4.5);
  }
  // Circular secure rings centered around middle
  doc.setDrawColor(247, 249, 252);
  doc.setLineWidth(0.12);
  doc.ellipse(x + cw / 2, y + ch / 2, 22.0, 22.0, 'S');
  doc.ellipse(x + cw / 2, y + ch / 2, 32.0, 32.0, 'S');
  doc.ellipse(x + cw / 2, y + ch / 2, 42.0, 42.0, 'S');

  doc.setLineWidth(0.12);
  doc.setDrawColor(250, 251, 253);
  doc.setFillColor(252, 253, 255);
  doc.triangle(x + 46, y + 15, x + 74, y + 15, x + 60, y + 36, 'FD');
  doc.setDrawColor(241, 243, 246);
  doc.line(x + 60, y + 15, x + 60, y + 36);

  // 4. PHOTO ON LEFT-HAND SIDE (15-20% boost, rounded edges, white shadow borders)
  const picX = x + 4.5;
  const picY = y + 11.2;
  const picW = 21.5;
  const picH = 25.0;

  // Thin outer border/mask representing card framing
  doc.setDrawColor(220, 224, 230);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.15);
  doc.roundedRect(picX, picY, picW, picH, 1.0, 1.0, 'FD');
  
  let hasStudentPhotoDrawn = false;
  if (student.photo) {
    try {
      const fmtMatch = student.photo.match(/^data:image\/([a-zA-Z]+);base64,/);
      const format = fmtMatch ? fmtMatch[1].toUpperCase() : 'JPEG';
      doc.addImage(student.photo, format, picX + 0.3, picY + 0.3, picW - 0.6, picH - 0.6);
      hasStudentPhotoDrawn = true;
    } catch (e) {
      console.warn("Could not draw student passport photo, falling back to vector body:", e);
    }
  }

  if (!hasStudentPhotoDrawn) {
    doc.setLineWidth(0.35);
    doc.setDrawColor(160, 170, 180);
    doc.ellipse(picX + picW / 2, picY + 8, 2.8, 2.8); // Head
    doc.ellipse(picX + picW / 2, picY + 17, 6.2, 3.0, 'S'); // Shoulders
  }

  // Draw safe luxury white frame outline over photo
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(picX + 0.1, picY + 0.1, picW - 0.2, picH - 0.2, 0.9, 0.9, 'D');
  
  // 5. QR CODE ON LEFT-HAND SIDE centered beneath the passport photo
  const qrW = 11.2;
  const qrH = 11.2;
  const qrX = picX + (picW - qrW) / 2; // Center QR horizontally relative to image above
  const qrY = y + 36.6;

  doc.setDrawColor(215, 220, 225);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.12);
  doc.roundedRect(qrX, qrY, qrW, qrH, 0.6, 0.6, 'FD');
  
  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', qrX + 0.3, qrY + 0.3, qrW - 0.6, qrH - 0.6);
    } catch (e) {
      console.error("Could not draw QR code on card front PDF:", e);
    }
  } else {
    doc.setFillColor(30, 30, 30);
    doc.rect(qrX + 1.6, qrY + 1.6, 2.8, 2.8, 'F');
    doc.rect(qrX + 6.8, qrY + 1.6, 2.8, 2.8, 'F');
    doc.rect(qrX + 1.6, qrY + 6.8, 2.8, 2.8, 'F');
  }

  // Add small label SCAN TO VERIFY below front QR code (User specified)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(110, 115, 125);
  doc.text('SCAN TO VERIFY', qrX + qrW / 2, qrY + qrH + 1.1, { align: 'center' });

  // 6. Right Details Panel (Symmetric start at x + 31, extending to 85)
  const dtX = x + 31;
  const dtW = 54;
  
  // Badge: STUDENT CLEARANCE CARD
  doc.setFillColor(242, 244, 247);
  doc.roundedRect(dtX, y + 11.2, 33, 4.2, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(30, 41, 59);
  doc.text('STUDENT CLEARANCE CARD', dtX + 1.5, y + 14.1);

  // Boarder status badge mapping
  const isBoarder = student.boardingStatus === 'Boarder';
  const boardingLabel = isBoarder ? 'HOSTELER' : 'DAY SCHOLAR';
  doc.setFillColor(242, 244, 247);
  doc.roundedRect(dtX + 34.5, y + 11.2, 19.5, 4.2, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(100, 110, 125);
  doc.text(boardingLabel, dtX + 35.5, y + 14.1);

  // NAME dotted input line (Perfect horizontal alignment)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(140, 145, 155);
  doc.text('NAME:', dtX, y + 19.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 25, 35);
  doc.text(student.name.toUpperCase(), dtX + 13.5, y + 19.85);

  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.12);
  doc.line(dtX + 13.5, y + 20.3, dtX + dtW, y + 20.3); // Underline row

  // CLASS dotted input line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(140, 145, 155);
  doc.text('CLASS:', dtX, y + 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 25, 35);
  doc.text(student.gradeClass.toUpperCase(), dtX + 11.5, y + 25.92);

  doc.line(dtX + 11.5, y + 26.3, dtX + 28.0, y + 26.3); // Underline class label

  // GENDER dotted input line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(140, 145, 155);
  doc.text('GENDER:', dtX + 29.5, y + 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 25, 35);
  doc.text((student.gender || 'Male').toUpperCase(), dtX + 43.5, y + 25.92);

  doc.line(dtX + 43.5, y + 26.3, dtX + dtW, y + 26.3); // Underline gender label
  
  // 7. Card Footer band containing return instructions text (User specified)
  doc.setDrawColor(235, 240, 245);
  doc.setFillColor(248, 249, 250);
  doc.setLineWidth(0.1);
  doc.line(x, y + ch - 4.5, x + cw, y + ch - 4.5);
  doc.rect(x + 0.3, y + ch - 4.5, cw - 0.6, 4.3, 'F');
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 110, 120);
  doc.text('If found, please return to the above address.', x + cw / 2, y + ch - 1.6, { align: 'center' });
}

// Draw the back of the student card in vector PDF format
function drawCardBackPdf(doc: jsPDF, x: number, y: number, student: Student, cw: number, ch: number, logoBase64?: string | null) {
  const serialNo = `SPSSN-2026-${(student.adminNo || student.id || "0000").replace(/[^0-9]/g, "").slice(0, 5).padStart(5, "0")}`;

  // 1. Base rectangle border for BACK card
  doc.setLineWidth(1.6);
  doc.setDrawColor(30, 27, 75); // Indigo border #1E1B4B
  doc.roundedRect(x, y, cw, ch, 3.5, 3.5, 'D');
  
  // 2. Add header ribbon
  const bgR1 = 12, bgG1 = 11, bgB1 = 37;      // Brand dark blue
  const bgR2 = 37, bgG2 = 32, bgB2 = 110;     // Brand purple navy

  doc.setFillColor(bgR1, bgG1, bgB1);
  doc.roundedRect(x + 0.5, y + 0.5, 8.0, 8.5, 3.5, 3.5, 'F');
  doc.rect(x + 0.5, y + 5.0, 8.0, 4.0, 'F');
  
  doc.setFillColor(bgR2, bgG2, bgB2);
  doc.roundedRect(x + cw - 8.5, y + 0.5, 8.0, 8.5, 3.5, 3.5, 'F');
  doc.rect(x + cw - 8.5, y + 5.0, 8.0, 4.0, 'F');
  
  // Transition gradient slices in the flat middle section (from x+4.0 to x+cw-4.0)
  const gStartXBack = x + 4.0;
  const gWidthBack = cw - 8.0;
  const stepsBack = 30;
  const stepWBack = gWidthBack / stepsBack;
  for (let i = 0; i < stepsBack; i++) {
    const t = i / (stepsBack - 1);
    const gr = Math.round(bgR1 + (bgR2 - bgR1) * t);
    const gg = Math.round(bgG1 + (bgG2 - bgG1) * t);
    const gb = Math.round(bgB1 + (bgB2 - bgB1) * t);
    doc.setFillColor(gr, gg, gb);
    doc.rect(gStartXBack + i * stepWBack, y + 0.5, stepWBack + 0.1, 8.5, 'F');
  }

  // 2.5 Dynamic Parallel Security Guilloche Lines and Concentric Rings (Extremely Subtle/Faint)
  doc.setLineWidth(0.08);
  doc.setDrawColor(248, 250, 253);
  // Diagonal parallel security lines
  for (let d = -45; d < cw + 30; d += 5.5) {
    doc.line(x + d, y + 8.5, x + d + 25.0, y + ch - 8.5);
  }
  // Circular secure rings centered around middle
  doc.setDrawColor(247, 249, 252);
  doc.setLineWidth(0.12);
  doc.ellipse(x + cw / 2, y + ch / 2, 22.0, 22.0, 'S');
  doc.ellipse(x + cw / 2, y + ch / 2, 32.0, 32.0, 'S');
  doc.ellipse(x + cw / 2, y + ch / 2, 42.0, 42.0, 'S');
  
  // Draw school logo
  let hasImageDrawn = false;
  if (logoBase64) {
    try {
      const isSvg = logoBase64.includes('svg+xml');
      doc.addImage(logoBase64, isSvg ? 'SVG' : 'PNG', x + 3.5, y + 1.4, 6.0, 6.0);
      hasImageDrawn = true;
    } catch (e) {
      console.error("Error drawing custom logo in back PDF:", e);
    }
  }

  if (!hasImageDrawn) {
    doc.setFillColor(245, 158, 11);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.12);
    doc.roundedRect(x + 3.5, y + 1.4, 5.0, 5.0, 0.8, 0.8, 'FD');
    doc.setFillColor(153, 27, 27);
    doc.triangle(x + 4.1, y + 2.4, x + 7.9, y + 2.4, x + 6.0, y + 5.5, 'FD');
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(255, 255, 255);
  doc.text('ST. PAUL SECONDARY SCHOOL, NASUTI', x + 10.5, y + 4.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.3);
  doc.text('P.O.BOX 678, NASUTI • "God is My Guide"', x + 10.5, y + 7.2);

  // MEAL CARD high visibility right badge (Strict specification)
  doc.setFillColor(79, 70, 229); // Indigo-600 background for MEAL CARD tag
  doc.roundedRect(x + cw - 24, y + 1.8, 20.5, 4.6, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(255, 255, 255);
  doc.text('MEALS', x + cw - 19.5, y + 5.1);

  // 3. Upgraded Student Details Bar right below the header
  doc.setFillColor(243, 244, 246);
  doc.rect(x + 0.5, y + 9.0, cw - 1.0, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(30, 27, 75);
  doc.text(`NAME: ${(student.name || '').toUpperCase()}`, x + 3.0, y + 11.4);
  doc.text(`CLASS: ${(student.gradeClass || '').toUpperCase()}`, x + cw - 38.0, y + 11.4);
  doc.text(`ID: ${(student.adminNo || '').toUpperCase()}`, x + cw - 15.0, y + 11.4);
  
  // 4. Render calendars for June and July shifted down slightly to accommodate bar
  // June: Starts Monday (1), 30 days
  drawCalendarPdf(doc, x + 3.2, y + 13.0, 'June', 1, 30, 5.5, 4.2);
  
  // July: Starts Wednesday (3), 31 days
  doc.setFont('helvetica', 'bold');
  drawCalendarPdf(doc, x + cw - 41.7, y + 13.0, 'July', 3, 31, 5.5, 4.2);
  
  // 5. Draw footer box with stamps signoff
  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(248, 249, 250);
  doc.setLineWidth(0.1);
  doc.line(x, y + ch - 7.5, x + cw, y + ch - 7.5);
  doc.rect(x + 0.3, y + ch - 7.5, cw - 0.6, 7.3, 'F');
  
  // Stamps row removed (Bursar Stamp removed)

  // Sub row: Motto, Serial, Contact
  doc.setFont('times', 'italic', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(110, 115, 125);
  doc.text('Motto: "God is My Guide"', x + 3.0, y + ch - 1.6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(140, 145, 150);
  doc.text(serialNo, x + cw / 2, y + ch - 1.6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.2);
  doc.setTextColor(120, 125, 135);
  doc.text('Contact: info@spssn.edu', x + cw - 3.0, y + ch - 1.6, { align: 'right' });
}

// Draw the payment mode page in vector PDF format
function drawCardPaymentPdf(doc: jsPDF, x: number, y: number, student: Student, cw: number, ch: number, logoBase64?: string | null) {
  const serialNo = `SPSSN-2026-${(student.adminNo || student.id || "0000").replace(/[^0-9]/g, "").slice(0, 5).padStart(5, "0")}`;

  // 1. Base rectangle border for PAYMENT card
  doc.setLineWidth(1.6);
  doc.setDrawColor(30, 27, 75); // Indigo border #1E1B4B
  doc.roundedRect(x, y, cw, ch, 3.5, 3.5, 'D');

  // 2. Clear background patterns
  doc.setLineWidth(0.08);
  doc.setDrawColor(248, 250, 253);
  for (let d = -45; d < cw + 30; d += 5.5) {
    doc.line(x + d, y + 8.5, x + d + 25.0, y + ch - 8.5);
  }

  // 3. Header Gradient
  const bgR1 = 12, bgG1 = 11, bgB1 = 37;      // Brand dark blue
  const bgR2 = 37, bgG2 = 32, bgB2 = 110;     // Brand purple navy

  doc.setFillColor(bgR1, bgG1, bgB1);
  doc.roundedRect(x + 0.5, y + 0.5, 8.0, 8.5, 3.5, 3.5, 'F');
  doc.rect(x + 0.5, y + 5.0, 8.0, 4.0, 'F');
  
  doc.setFillColor(bgR2, bgG2, bgB2);
  doc.roundedRect(x + cw - 8.5, y + 0.5, 8.0, 8.5, 3.5, 3.5, 'F');
  doc.rect(x + cw - 8.5, y + 5.0, 8.0, 4.0, 'F');

  // Horizontal gradient Transition slices
  const gStartXBack = x + 4.0;
  const gWidthBack = cw - 8.0;
  const stepsBack = 30;
  const stepWBack = gWidthBack / stepsBack;
  for (let i = 0; i < stepsBack; i++) {
    const t = i / (stepsBack - 1);
    const gr = Math.round(bgR1 + (bgR2 - bgR1) * t);
    const gg = Math.round(bgG1 + (bgG2 - bgG1) * t);
    const gb = Math.round(bgB1 + (bgB2 - bgB1) * t);
    doc.setFillColor(gr, gg, gb);
    doc.rect(gStartXBack + i * stepWBack, y + 0.5, stepWBack + 0.1, 8.5, 'F');
  }

  // Draw school logo icon
  let hasImageDrawn = false;
  if (logoBase64) {
    try {
      const isSvg = logoBase64.includes('svg+xml');
      doc.addImage(logoBase64, isSvg ? 'SVG' : 'PNG', x + 3.5, y + 1.4, 6.0, 6.0);
      hasImageDrawn = true;
    } catch (e) {
      console.error("Error drawing logo in payment card:", e);
    }
  }

  if (!hasImageDrawn) {
    doc.setFillColor(245, 158, 11);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.12);
    doc.roundedRect(x + 3.5, y + 1.4, 5.0, 5.0, 0.8, 0.8, 'FD');
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(255, 255, 255);
  doc.text('ST. PAUL SECONDARY SCHOOL, NASUTI', x + 10.5, y + 4.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.3);
  doc.text('P.O.BOX 678, NASUTI • "God is My Guide"', x + 10.5, y + 7.2);

  // Badge: PAYMENT MODE Right Side Tag
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(x + cw - 24, y + 1.8, 20.5, 4.6, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT', x + cw - 21.0, y + 5.1);

  // 4. Student Metadata Row
  doc.setFillColor(243, 244, 246);
  doc.rect(x + 0.5, y + 9.0, cw - 1.0, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(30, 27, 75);
  doc.text(`NAME: ${(student.name || '').toUpperCase()}`, x + 3.0, y + 11.4);
  doc.text(`CLASS: ${(student.gradeClass || '').toUpperCase()}`, x + cw - 38.0, y + 11.4);
  doc.text(`ID: ${(student.adminNo || '').toUpperCase()}`, x + cw - 14.5, y + 11.4);

  // 5. Draw the table structure at center, stretching entire card width (Excellent spacing)
  const ty = y + 13.5;
  const th = 4.4; // Header row
  const trh = 5.8; // Row height

  // Table widths matching precisely
  const colW1 = 25.0; // Installment
  const colW2 = 20.0; // Amount paid
  const colW3 = 18.0; // Balance
  const colW4 = 18.0; // Remarks / Sign
  const tableW = colW1 + colW2 + colW3 + colW4; // 81 mm width
  const tx = x + 4.5; // Table start X

  // Header background
  doc.setFillColor(243, 244, 246);
  doc.rect(tx, ty, tableW, th, 'F');

  // Draw table outline & grids
  doc.setLineWidth(0.12);
  doc.setDrawColor(180, 185, 190);
  doc.rect(tx, ty, tableW, th + 3 * trh, 'D');

  // Column vertical grid lines
  doc.line(tx + colW1, ty, tx + colW1, ty + th + 3 * trh);
  doc.line(tx + colW1 + colW2, ty, tx + colW1 + colW2, ty + th + 3 * trh);
  doc.line(tx + colW1 + colW2 + colW3, ty, tx + colW1 + colW2 + colW3, ty + th + 3 * trh);

  // Row horizontal lines
  doc.line(tx, ty + th, tx + tableW, ty + th);
  doc.line(tx, ty + th + trh, tx + tableW, ty + th + trh);
  doc.line(tx, ty + th + 2 * trh, tx + tableW, ty + th + 2 * trh);

  // Header labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(60, 65, 75);
  doc.text('INSTALLMENT', tx + colW1 / 2, ty + 3.2, { align: 'center' });
  doc.text('AMOUNT (UGX)', tx + colW1 + colW2 / 2, ty + 3.2, { align: 'center' });
  doc.text('BAL (UGX)', tx + colW1 + colW2 + colW3 / 2, ty + 3.2, { align: 'center' });
  doc.text('BURSAR SIGN', tx + colW1 + colW2 + colW3 + colW4 / 2, ty + 3.2, { align: 'center' });

  // Rows Content (Installment labels)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.0);
  doc.setTextColor(40, 45, 50);
  doc.text('1st Installment', tx + 1.8, ty + th + 4.2);
  doc.text('2nd Installment', tx + 1.8, ty + th + trh + 4.2);
  doc.text('3rd Installment', tx + 1.8, ty + th + 2 * trh + 4.2);

  // 6. Signatures block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(110, 115, 125);
  doc.text('DATE: _________________', x + 5.0, y + 42.2);
  doc.text('BURSAR SIGN: _________________', x + 48.0, y + 42.2);

  // 7. Gray Footer Band
  doc.setDrawColor(235, 240, 245);
  doc.setFillColor(248, 249, 250);
  doc.setLineWidth(0.1);
  doc.line(x, y + ch - 5.5, x + cw, y + ch - 5.5);
  doc.rect(x + 0.3, y + ch - 5.5, cw - 0.6, 5.3, 'F');

  // Motto, Serial, Contact
  doc.setFont('times', 'italic', 'bold');
  doc.setFontSize(4.2);
  doc.setTextColor(100, 105, 115);
  doc.text('Motto: "God is My Guide"', x + 3.0, y + ch - 1.8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(4.2);
  doc.text(serialNo, x + cw / 2, y + ch - 1.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.0);
  doc.text('Contact: info@spssn.edu', x + cw - 3.0, y + ch - 1.8, { align: 'right' });
}

// Draw the August meal card page in vector PDF format
function drawCardAugustPdf(doc: jsPDF, x: number, y: number, student: Student, cw: number, ch: number, logoBase64?: string | null) {
  const serialNo = `SPSSN-2026-${(student.adminNo || student.id || "0000").replace(/[^0-9]/g, "").slice(0, 5).padStart(5, "0")}`;

  // 1. Base rectangle border for AUGUST card
  doc.setLineWidth(1.6);
  doc.setDrawColor(30, 27, 75); // Indigo border #1E1B4B
  doc.roundedRect(x, y, cw, ch, 3.5, 3.5, 'D');

  // 2. Clear background patterns
  doc.setLineWidth(0.08);
  doc.setDrawColor(248, 250, 253);
  for (let d = -45; d < cw + 30; d += 5.5) {
    doc.line(x + d, y + 8.5, x + d + 25.0, y + ch - 8.5);
  }

  // 3. Header Gradient
  const bgR1 = 12, bgG1 = 11, bgB1 = 37;      // Brand dark blue
  const bgR2 = 37, bgG2 = 32, bgB2 = 110;     // Brand purple navy

  doc.setFillColor(bgR1, bgG1, bgB1);
  doc.roundedRect(x + 0.5, y + 0.5, 8.0, 8.5, 3.5, 3.5, 'F');
  doc.rect(x + 0.5, y + 5.0, 8.0, 4.0, 'F');
  
  doc.setFillColor(bgR2, bgG2, bgB2);
  doc.roundedRect(x + cw - 8.5, y + 0.5, 8.0, 8.5, 3.5, 3.5, 'F');
  doc.rect(x + cw - 8.5, y + 5.0, 8.0, 4.0, 'F');

  // Gradient transitions
  const gStartXBack = x + 4.0;
  const gWidthBack = cw - 8.0;
  const stepsBack = 30;
  const stepWBack = gWidthBack / stepsBack;
  for (let i = 0; i < stepsBack; i++) {
    const t = i / (stepsBack - 1);
    const gr = Math.round(bgR1 + (bgR2 - bgR1) * t);
    const gg = Math.round(bgG1 + (bgG2 - bgG1) * t);
    const gb = Math.round(bgB1 + (bgB2 - bgB1) * t);
    doc.setFillColor(gr, gg, gb);
    doc.rect(gStartXBack + i * stepWBack, y + 0.5, stepWBack + 0.1, 8.5, 'F');
  }

  // Draw school logo icon
  let hasImageDrawn = false;
  if (logoBase64) {
    try {
      const isSvg = logoBase64.includes('svg+xml');
      doc.addImage(logoBase64, isSvg ? 'SVG' : 'PNG', x + 3.5, y + 1.4, 6.0, 6.0);
      hasImageDrawn = true;
    } catch (e) {
      console.error("Error drawing logo in payment card:", e);
    }
  }

  if (!hasImageDrawn) {
    doc.setFillColor(245, 158, 11);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.12);
    doc.roundedRect(x + 3.5, y + 1.4, 5.0, 5.0, 0.8, 0.8, 'FD');
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(255, 255, 255);
  doc.text('ST. PAUL SECONDARY SCHOOL, NASUTI', x + 10.5, y + 4.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.3);
  doc.text('P.O.BOX 678, NASUTI • "God is My Guide"', x + 10.5, y + 7.2);

  // Badge: AUGUST MEALS Right Side Tag
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(x + cw - 24, y + 1.8, 20.5, 4.6, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.setTextColor(255, 255, 255);
  doc.text('MEALS', x + cw - 20.0, y + 5.1);

  // 4. Student Metadata Row
  doc.setFillColor(243, 244, 246);
  doc.rect(x + 0.5, y + 9.0, cw - 1.0, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(30, 27, 75);
  doc.text(`NAME: ${(student.name || '').toUpperCase()}`, x + 3.0, y + 11.4);
  doc.text(`CLASS: ${(student.gradeClass || '').toUpperCase()}`, x + cw - 38.0, y + 11.4);
  doc.text(`ID: ${(student.adminNo || '').toUpperCase()}`, x + cw - 14.5, y + 11.4);

  // 5. Main Area: August Calendar on left (Saturday start, 31 days) and Cafeteria notes on right
  drawCalendarPdf(doc, x + 3.5, y + 13.0, 'August', 6, 31, 4.4, 3.4);

  // Cafeteria Rules Box on Right
  const bx = x + 37.0;
  const by = y + 13.0;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(218, 222, 230);
  doc.setLineWidth(0.12);
  doc.roundedRect(bx, by, 48.5, 29.0, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(30, 27, 75);
  doc.text('CAFETERIA GUIDE', bx + 2.0, by + 4.0);

  doc.setLineWidth(0.12);
  doc.setDrawColor(220, 225, 230);
  doc.line(bx + 2.0, by + 5.2, bx + 46.5, by + 5.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.0);
  doc.setTextColor(80, 85, 95);
  doc.text('• Present card at serving points on request.', bx + 2.0, by + 9.0);
  doc.text('• Card is strictly non-transferable to others.', bx + 2.0, by + 13.0);
  doc.text('• Loss of card must be reported instantly.', bx + 2.0, by + 17.0);

  // CAFETERIA STAMP
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.1);
  doc.rect(bx + 2.0, by + 20.0, 44.5, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(150, 155, 165);
  doc.text('CAFETERIA RECTOR STAMP / TOKEN', bx + 24.2, by + 24.8, { align: 'center' });

  // 6. Gray Footer Band at very bottom
  doc.setDrawColor(235, 240, 245);
  doc.setFillColor(248, 249, 250);
  doc.setLineWidth(0.1);
  doc.line(x, y + ch - 5.5, x + cw, y + ch - 5.5);
  doc.rect(x + 0.3, y + ch - 5.5, cw - 0.6, 5.3, 'F');

  // Motto, Serial, Contact
  doc.setFont('times', 'italic', 'bold');
  doc.setFontSize(4.2);
  doc.setTextColor(100, 105, 115);
  doc.text('Motto: "God is My Guide"', x + 3.0, y + ch - 1.8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(4.2);
  doc.text(serialNo, x + cw / 2, y + ch - 1.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.0);
  doc.text('Contact: info@spssn.edu', x + cw - 3.0, y + ch - 1.8, { align: 'right' });
}

// Layout modes supported for easy PDF exports
export interface PdfExportOptions {
  layoutMode: 'front-back-paired' | 'printable-grid';
  students: Student[];
  onProgress?: (index: number, total: number) => void;
  schoolLogoBase64?: string | null;
}

export async function generateClearancePdf({ layoutMode, students, onProgress, schoolLogoBase64 }: PdfExportOptions): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardW = 90;
  const cardH = 55;
  const marginX = 10;
  const marginY = 12;
  const spacingX = 10;
  const spacingY = 12;

  // Pre-generate scannable QR Code data URLs for each student in parallel (highly performant)
  const qrMap: Record<string, string> = {};
  await Promise.all(
    students.map(async (student) => {
      const codeData = student.adminNo || student.id;
      try {
        qrMap[student.id] = await QRCode.toDataURL(codeData, { margin: 1, width: 140 });
      } catch (e) {
        console.error("Failed to generate QR base64 for student", student.id, e);
        qrMap[student.id] = '';
      }
    })
  );

  if (layoutMode === 'front-back-paired') {
    // Mode 1: Front and Back side-by-side and stacked below
    // Fits 2 students complete card sets per A4 page!
    // Row A: Front Clearance Card (Left) & Back Calendar Meal Card (Right)
    // Row B: Back Payment Mode (Left) & Back August Meal Card (Right)
    let studentCounter = 0;
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (onProgress) onProgress(i + 1, students.length);

      const rowIdx = studentCounter % 2;
      const py = marginY + rowIdx * (2 * cardH + 16);

      // Row A: Clearance Card & Meal Card
      drawCardFrontPdf(doc, marginX, py, student, cardW, cardH, schoolLogoBase64, qrMap[student.id]);
      drawCardBackPdf(doc, marginX + cardW + spacingX, py, student, cardW, cardH, schoolLogoBase64);

      // Row B: Payment Card & August Meal Card
      drawCardPaymentPdf(doc, marginX, py + cardH + 6.0, student, cardW, cardH, schoolLogoBase64);
      drawCardAugustPdf(doc, marginX + cardW + spacingX, py + cardH + 6.0, student, cardW, cardH, schoolLogoBase64);

      studentCounter++;

      // Start new page every 2 students
      if (studentCounter % 2 === 0 && i < students.length - 1) {
        doc.addPage();
      }
    }
  } else {
    // Mode 2: Printable Duplex Grid (4 Students per Page, fully complete duplex output pairs)
    // Fits 4 students' complete double-sided cards (8 fronts on Page 1, 8 backs on Page 2)
    const studentsPerPage = 4;
    const totalPagesNeeded = Math.ceil(students.length / studentsPerPage);

    for (let pageIdx = 0; pageIdx < totalPagesNeeded; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage();
      }

      const startIndex = pageIdx * studentsPerPage;
      const pageStudents = students.slice(startIndex, startIndex + studentsPerPage);

      // PAGE A: Front Cards Grid (Page 1)
      // Standard layout: Col 0: Clearance, Col 1: Meal Card (June/July)
      for (let sIdx = 0; sIdx < pageStudents.length; sIdx++) {
        const student = pageStudents[sIdx];
        const globalIdx = startIndex + sIdx;
        if (onProgress) onProgress(globalIdx + 1, students.length);

        const row = sIdx;
        const py = marginY + row * (cardH + spacingY);

        // Col 0: Clearance Card (Front 1)
        drawCardFrontPdf(doc, marginX, py, student, cardW, cardH, schoolLogoBase64, qrMap[student.id]);
        
        // Col 1: Meal Card (Front 2)
        drawCardBackPdf(doc, marginX + cardW + spacingX, py, student, cardW, cardH, schoolLogoBase64);
      }

      // PAGE B: Back Cards Grid (Page 2 - mirrored column layout for perfect double-sided alignment!)
      // Back layout: Col 0: August Meal Card, Col 1: Payment Card
      doc.addPage();
      for (let sIdx = 0; sIdx < pageStudents.length; sIdx++) {
        const student = pageStudents[sIdx];

        const row = sIdx;
        const py = marginY + row * (cardH + spacingY);

        // Col 0: August Card (printed on back of Front 2 which is Meal Card)
        drawCardAugustPdf(doc, marginX, py, student, cardW, cardH, schoolLogoBase64);

        // Col 1: Payment Card (printed on back of Front 1 which is Clearance Card)
        drawCardPaymentPdf(doc, marginX + cardW + spacingX, py, student, cardW, cardH, schoolLogoBase64);
      }
    }
  }

  return doc;
}
