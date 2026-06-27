import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Book, WordSearchPuzzle } from '../types';
import { generateWordSearch } from './puzzle';

// Helper to convert inches to points
const IN_TO_PT = 72;

function sanitizeForWinAnsi(text: any): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, '-')             // en/em dashes
    .replace(/[\u2022\u2219]/g, '|')             // bullet points
    .replace(/[\u2026]/g, '...')                 // ellipsis
    .replace(/[\u2713]/g, '[x]')                 // checkmark
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');     // western european and ASCII only
}

export async function generateKDPInterior(inputBook: Book, watermark: boolean = false): Promise<Uint8Array> {
  // Normalize puzzles on the fly to avoid crashing on incomplete books
  const normalizedPuzzles = (inputBook.details.puzzles || []).map((p, idx) => {
    if (p && p.grid && p.grid.length > 0) {
      return p;
    }
    const fallbackCategory = (p as any)?.category || `Thematic Grid ${idx + 1}`;
    const wordBank = (p as any)?.wordBank || [
      'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 
      'ENERGY', 'PEACE', 'SOUND', 'NATURE', 'JOURNEY', 'CREATIVE'
    ];
    const generated = generateWordSearch(
      fallbackCategory,
      wordBank,
      inputBook.details.settings?.difficulty || 'medium',
      inputBook.details.settings?.largePrint ? 14 : 15
    );
    return {
      id: `puz_fallback_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      ...generated,
      funFact: (p as any)?.funFact || `An elegant word search puzzle celebrating ${fallbackCategory}.`,
      definition: (p as any)?.definition || `Vocabulary words representing ${fallbackCategory}.`
    } as WordSearchPuzzle;
  });

  const book: Book = {
    ...inputBook,
    details: {
      ...inputBook.details,
      puzzles: normalizedPuzzles,
      glossary: inputBook.details.glossary || [],
      funFacts: inputBook.details.funFacts || []
    }
  };

  const pdfDoc = await PDFDocument.create();
  
  // Wrap addPage to sanitize text for WinAnsi automatically
  const originalAddPage = pdfDoc.addPage.bind(pdfDoc);
  pdfDoc.addPage = ((pageOption?: any): any => {
    const page = originalAddPage(pageOption);
    const originalDrawText = page.drawText.bind(page);
    page.drawText = (text: string, options?: any) => {
      return originalDrawText(sanitizeForWinAnsi(text), options);
    };
    return page;
  }) as any;

  // Wrap embedFont to automatically sanitize text for widthOfTextAtSize
  const originalEmbedFont = pdfDoc.embedFont.bind(pdfDoc);
  pdfDoc.embedFont = (async (font: any, options?: any) => {
    const embeddedFont = await originalEmbedFont(font, options);
    const originalWidthOfTextAtSize = embeddedFont.widthOfTextAtSize.bind(embeddedFont);
    embeddedFont.widthOfTextAtSize = (text: string, size: number) => {
      return originalWidthOfTextAtSize(sanitizeForWinAnsi(text), size);
    };
    return embeddedFont;
  }) as any;
  
  // Set sizes based on trim size
  let widthIn = 8.5;
  let heightIn = 11.0;
  
  if (book.details.settings.trimSize === '8x10') {
    widthIn = 8.0;
    heightIn = 10.0;
  } else if (book.details.settings.trimSize === '6x9') {
    widthIn = 6.0;
    heightIn = 9.0;
  }
  
  const width = widthIn * IN_TO_PT;
  const height = heightIn * IN_TO_PT;
  
  // Embed Fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Common styles
  const margin = 0.75 * IN_TO_PT;
  const primaryColor = rgb(0.1, 0.1, 0.1);
  const accentColor = rgb(0.5, 0.1, 0.1); // Warm red accent
  const lightGray = rgb(0.95, 0.95, 0.95);
  const darkGray = rgb(0.4, 0.4, 0.4);

  let pageNum = 1;

  // Helper to add standard page with headers & footers
  const createPage = () => {
    const page = pdfDoc.addPage([width, height]);
    if (watermark) {
      page.drawText('PREVIEW | RIDDIMROOM PUBLISHER AI | WATERMARKED', {
        x: 60,
        y: 100,
        size: 24,
        font: helveticaBold,
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.18,
        rotate: degrees(52),
      });
    }
    return page;
  };

  const drawHeaderFooter = (page: any, titleText: string, currentPage: number) => {
    // Top border line
    page.drawLine({
      start: { x: margin, y: height - 50 },
      end: { x: width - margin, y: height - 50 },
      thickness: 0.5,
      color: darkGray,
    });

    // Header Title
    page.drawText(titleText.toUpperCase(), {
      x: margin,
      y: height - 42,
      size: 8,
      font: helveticaBold,
      color: darkGray,
    });

    // Running tag
    page.drawText('RiddimRoom Publisher AI', {
      x: width - margin - 110,
      y: height - 42,
      size: 8,
      font: helvetica,
      color: darkGray,
    });

    // Bottom border line
    page.drawLine({
      start: { x: margin, y: 50 },
      end: { x: width - margin, y: 50 },
      thickness: 0.5,
      color: darkGray,
    });

    // Page Number
    const pageNumStr = `Page ${currentPage}`;
    const pageNumWidth = helvetica.widthOfTextAtSize(pageNumStr, 9);
    page.drawText(pageNumStr, {
      x: width / 2 - pageNumWidth / 2,
      y: 35,
      size: 9,
      font: helvetica,
      color: primaryColor,
    });
  };

  // ==========================================
  // PAGE 1: TITLE PAGE
  // ==========================================
  {
    const page = pdfDoc.addPage([width, height]);
    
    // Decorative border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: accentColor,
      borderWidth: 2,
    });

    page.drawRectangle({
      x: 35,
      y: 35,
      width: width - 70,
      height: height - 70,
      borderColor: primaryColor,
      borderWidth: 0.5,
    });

    const title = book.title || 'Word Search Puzzle Book';
    const subtitle = book.details.amazonListing?.subtitle || `A Collection of Interactive Word Finds on ${book.topic}`;

    const titleFontSize = widthIn > 7 ? 28 : 22;
    const titleWidth = helveticaBold.widthOfTextAtSize(title, titleFontSize);
    page.drawText(title, {
      x: width / 2 - titleWidth / 2,
      y: height * 0.65,
      size: titleFontSize,
      font: helveticaBold,
      color: primaryColor,
    });

    // Subtitle
    const subFontSize = widthIn > 7 ? 13 : 11;
    const subWords = subtitle.split(' ');
    let line = '';
    let currentY = height * 0.58;
    for (const word of subWords) {
      if (helvetica.widthOfTextAtSize(line + ' ' + word, subFontSize) > width - margin * 2) {
        const lineWidth = helvetica.widthOfTextAtSize(line, subFontSize);
        page.drawText(line, {
          x: width / 2 - lineWidth / 2,
          y: currentY,
          size: subFontSize,
          font: helvetica,
          color: darkGray,
        });
        line = word;
        currentY -= 18;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) {
      const lineWidth = helvetica.widthOfTextAtSize(line, subFontSize);
      page.drawText(line, {
        x: width / 2 - lineWidth / 2,
        y: currentY,
        size: subFontSize,
        font: helvetica,
        color: darkGray,
      });
    }

    // Author
    const authorStr = 'Generated & Published by RiddimRoom Publisher AI';
    const authWidth = helvetica.widthOfTextAtSize(authorStr, 11);
    page.drawText(authorStr, {
      x: width / 2 - authWidth / 2,
      y: 120,
      size: 11,
      font: helveticaBold,
      color: primaryColor,
    });

    const brandStr = 'Create Beautiful KDP Books with AI';
    const brandWidth = helvetica.widthOfTextAtSize(brandStr, 9);
    page.drawText(brandStr, {
      x: width / 2 - brandWidth / 2,
      y: 95,
      size: 9,
      font: helvetica,
      color: darkGray,
    });
  }

  // ==========================================
  // PAGE 2: COPYRIGHT
  // ==========================================
  {
    const page = pdfDoc.addPage([width, height]);
    const currentY = height - 100;

    page.drawText('Copyright & Publisher Details', {
      x: margin,
      y: currentY,
      size: 18,
      font: helveticaBold,
      color: primaryColor,
    });

    const textLines = [
      'RiddimRoom Publisher AI - Puzzle Book Creator Series',
      `Title: ${book.title}`,
      `Topic: ${book.topic}`,
      `Audience: ${book.details.settings.audience.toUpperCase()}`,
      `Difficulty: ${book.details.settings.difficulty.toUpperCase()}`,
      '',
      `Copyright © ${new Date().getFullYear()} by RiddimRoom Publisher AI.`,
      'All rights reserved. No part of this publication may be reproduced, distributed,',
      'or transmitted in any form or by any means, including photocopying, recording,',
      'or other electronic or mechanical methods, without the prior written permission',
      'of the publisher, except in the case of brief quotations embodied in reviews.',
      '',
      'KDP Publisher interior specifications compiled automatically.',
      'Printed with high-density grids suited for optimal grayscale Amazon paper.',
      '',
      'First Edition',
      '',
      'For licensing, wholesale purchases, or commercial custom puzzle book requests,',
      'please contact: publisher@riddimroom.ai',
    ];

    let lineY = currentY - 40;
    for (const textLine of textLines) {
      page.drawText(textLine, {
        x: margin,
        y: lineY,
        size: 10,
        font: textLine.startsWith('Title') || textLine.startsWith('Copyright') ? helveticaBold : helvetica,
        color: primaryColor,
      });
      lineY -= 16;
    }
  }

  // ==========================================
  // PAGE 3: INTRODUCTION / TABLE OF CONTENTS
  // ==========================================
  {
    const page = createPage();
    pageNum++;
    drawHeaderFooter(page, 'Table of Contents & Introduction', pageNum);

    page.drawText('Welcome and Book Highlights', {
      x: margin,
      y: height - 85,
      size: 18,
      font: helveticaBold,
      color: accentColor,
    });

    // Table of contents blocks
    const tocItems = [
      { name: 'Introduction & Topic Overview', page: 'Page 3' },
      { name: 'Glossary & Key Vocabulary', page: 'Page 4' },
      { name: 'Amazing Fun Facts', page: 'Page 5' },
    ];

    // Add puzzles dynamically to TOC
    book.details.puzzles.forEach((p, idx) => {
      tocItems.push({ name: `Puzzle ${idx + 1}: ${p.category}`, page: `Page ${6 + idx}` });
    });

    const ansStart = 6 + book.details.puzzles.length;
    tocItems.push({ name: 'Solutions & Answers Keys', page: `Page ${ansStart}` });
    tocItems.push({ name: 'About the Author & Publisher', page: `Page ${ansStart + 1}` });

    let tocY = height - 120;
    page.drawText('TABLE OF CONTENTS', {
      x: margin,
      y: tocY,
      size: 11,
      font: helveticaBold,
      color: primaryColor,
    });
    tocY -= 20;

    // We list TOC in a neat list (max 12 items to fit nicely, otherwise we summarize)
    const showToc = tocItems.slice(0, 16);
    for (const item of showToc) {
      page.drawText(item.name, {
        x: margin + 10,
        y: tocY,
        size: 9,
        font: helvetica,
        color: primaryColor,
      });

      // Dot leaders
      const dotsWidth = width - margin * 2 - 50 - helvetica.widthOfTextAtSize(item.name, 9);
      let dots = '.'.repeat(Math.max(10, Math.floor(dotsWidth / 4)));
      page.drawText(dots, {
        x: margin + 15 + helvetica.widthOfTextAtSize(item.name, 9),
        y: tocY,
        size: 9,
        font: helvetica,
        color: darkGray,
      });

      page.drawText(item.page, {
        x: width - margin - 40,
        y: tocY,
        size: 9,
        font: helveticaBold,
        color: primaryColor,
      });
      tocY -= 15;
    }

    if (tocItems.length > 16) {
      page.drawText(`... and ${tocItems.length - 16} more chapters and word lists`, {
        x: margin + 10,
        y: tocY,
        size: 9,
        font: helvetica,
        color: darkGray,
      });
    }

    // Brief Introduction under it
    let introY = tocY - 30;
    page.drawText('INTRODUCTION', {
      x: margin,
      y: introY,
      size: 11,
      font: helveticaBold,
      color: primaryColor,
    });
    introY -= 18;

    const introText = book.details.introduction || `This word search book explores the vibrant topic of "${book.topic}". Specially calibrated for ${book.details.settings.audience}, this collection has been compiled with precision, featuring clear readability levels and robust puzzles. Challenge your mind, expand your vocabulary, and enjoy the educational glossary and fun facts embedded inside. Happy puzzling!`;
    const introParagraphs = introText.split('\n');

    for (const pText of introParagraphs) {
      if (!pText.trim()) continue;
      const words = pText.split(' ');
      let textLine = '';
      for (const w of words) {
        if (helvetica.widthOfTextAtSize(textLine + ' ' + w, 9.5) > width - margin * 2) {
          page.drawText(textLine, { x: margin, y: introY, size: 9.5, font: helvetica, color: primaryColor });
          textLine = w;
          introY -= 14;
        } else {
          textLine = textLine ? textLine + ' ' + w : w;
        }
      }
      if (textLine) {
        page.drawText(textLine, { x: margin, y: introY, size: 9.5, font: helvetica, color: primaryColor });
        introY -= 20;
      }
    }
  }

  // ==========================================
  // PAGE 4: GLOSSARY / VOCABULARY LIST
  // ==========================================
  {
    const page = createPage();
    pageNum++;
    drawHeaderFooter(page, 'Glossary & Terms definitions', pageNum);

    page.drawText('Glossary of Key Terms', {
      x: margin,
      y: height - 85,
      size: 18,
      font: helveticaBold,
      color: accentColor,
    });

    let glossY = height - 110;
    const itemsToShow = book.details.glossary.slice(0, 10); // Display top 10

    for (const item of itemsToShow) {
      if (glossY < 120) break;
      
      // Bold Term
      page.drawText(`${item.word.toUpperCase()}:`, {
        x: margin,
        y: glossY,
        size: 10,
        font: helveticaBold,
        color: primaryColor,
      });

      // Definition
      const defLine = item.definition;
      const defWidth = width - margin * 2 - 20;
      const defWords = defLine.split(' ');
      let line = '';
      let firstLine = true;
      
      for (const w of defWords) {
        const offset = firstLine ? helveticaBold.widthOfTextAtSize(`${item.word.toUpperCase()}: `, 10) + 10 : 20;
        if (helvetica.widthOfTextAtSize(line + ' ' + w, 9) > defWidth - offset) {
          page.drawText(line, {
            x: margin + offset,
            y: glossY,
            size: 9,
            font: helvetica,
            color: primaryColor,
          });
          line = w;
          glossY -= 13;
          firstLine = false;
        } else {
          line = line ? line + ' ' + w : w;
        }
      }
      if (line) {
        const offset = firstLine ? helveticaBold.widthOfTextAtSize(`${item.word.toUpperCase()}: `, 10) + 10 : 20;
        page.drawText(line, {
          x: margin + offset,
          y: glossY,
          size: 9,
          font: helvetica,
          color: primaryColor,
        });
        glossY -= 13;
      }

      // Example sentence
      if (item.example) {
        page.drawText(`Example: "${item.example}"`, {
          x: margin + 20,
          y: glossY,
          size: 8.5,
          font: helvetica,
          color: darkGray,
        });
        glossY -= 18;
      } else {
        glossY -= 8;
      }
    }
  }

  // ==========================================
  // PAGE 5: FUN FACTS
  // ==========================================
  {
    const page = createPage();
    pageNum++;
    drawHeaderFooter(page, 'Amazing Fun Facts', pageNum);

    page.drawText('Did You Know?', {
      x: margin,
      y: height - 85,
      size: 18,
      font: helveticaBold,
      color: accentColor,
    });

    let factY = height - 120;
    const facts = book.details.funFacts.length > 0 ? book.details.funFacts : [
      'Puzzles improve short-term memory and problem solving.',
      'The first word search puzzle was designed by Norman E. Gibat in Oklahoma in 1968.',
      'Word searches provide incredible cognitive stimulation and vocabulary enlargement for all ages.',
    ];

    facts.forEach((fact, i) => {
      if (factY < 100) return;

      // Card Background for each fact
      page.drawRectangle({
        x: margin,
        y: factY - 50,
        width: width - margin * 2,
        height: 60,
        color: lightGray,
        borderColor: accentColor,
        borderWidth: 0.5,
      });

      // Fact Icon Number
      page.drawText(`Fact #${i + 1}`, {
        x: margin + 15,
        y: factY - 12,
        size: 9,
        font: helveticaBold,
        color: accentColor,
      });

      // Fact text wrapping
      const fWords = fact.split(' ');
      let line = '';
      let lineY = factY - 26;
      for (const w of fWords) {
        if (helvetica.widthOfTextAtSize(line + ' ' + w, 9) > width - margin * 2 - 40) {
          page.drawText(line, {
            x: margin + 15,
            y: lineY,
            size: 9,
            font: helvetica,
            color: primaryColor,
          });
          line = w;
          lineY -= 12;
        } else {
          line = line ? line + ' ' + w : w;
        }
      }
      if (line) {
        page.drawText(line, {
          x: margin + 15,
          y: lineY,
          size: 9,
          font: helvetica,
          color: primaryColor,
        });
      }

      factY -= 80;
    });
  }

  // ==========================================
  // PAGES 6+: PUZZLES
  // ==========================================
  for (let pIdx = 0; pIdx < book.details.puzzles.length; pIdx++) {
    const puzzle = book.details.puzzles[pIdx];
    const page = createPage();
    pageNum++;
    drawHeaderFooter(page, `Puzzle ${pIdx + 1}: ${puzzle.category}`, pageNum);

    // Decorative Header Box
    page.drawRectangle({
      x: margin,
      y: height - 100,
      width: width - margin * 2,
      height: 35,
      color: lightGray,
    });

    page.drawText(`PUZZLE #${pIdx + 1}: ${puzzle.category.toUpperCase()}`, {
      x: margin + 15,
      y: height - 88,
      size: 13,
      font: helveticaBold,
      color: primaryColor,
    });

    // Word count / size label
    const infoStr = `${puzzle.wordBank.length} Words to find | ${puzzle.grid.length}x${puzzle.grid.length} Grids`;
    page.drawText(infoStr, {
      x: width - margin - helvetica.widthOfTextAtSize(infoStr, 9) - 15,
      y: height - 88,
      size: 9,
      font: helvetica,
      color: accentColor,
    });

    // =====================================
    // DRAW THE PUZZLE GRID (Center of page)
    // =====================================
    const gridSize = puzzle.grid.length;
    
    // Grid box geometry
    let cellSize = 18;
    if (gridSize > 15) cellSize = 15;
    if (gridSize > 18) cellSize = 12;
    if (book.details.settings.largePrint) cellSize = 20;

    const gridWidth = gridSize * cellSize;
    const gridHeight = gridSize * cellSize;
    
    // Start drawing from bottom-left offset
    const startX = width / 2 - gridWidth / 2;
    const startY = height / 2 - gridHeight / 2 + 10;

    // Draw background boundary card
    page.drawRectangle({
      x: startX - 8,
      y: startY - 8,
      width: gridWidth + 16,
      height: gridHeight + 16,
      borderColor: primaryColor,
      borderWidth: 1.5,
    });

    // Draw Letters
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const char = puzzle.grid[r][c];
        
        // Coordinates from bottom-left
        // Rows in wordsearch typically indexed top-to-bottom
        const xPos = startX + c * cellSize;
        const yPos = startY + (gridSize - 1 - r) * cellSize;

        // Draw character centered
        const charWidth = courierBold.widthOfTextAtSize(char, cellSize * 0.65);
        const charHeight = cellSize * 0.5;

        page.drawText(char, {
          x: xPos + (cellSize / 2) - (charWidth / 2),
          y: yPos + (cellSize / 2) - (charHeight / 2) + 1,
          size: cellSize * 0.75,
          font: courierBold,
          color: primaryColor,
        });

        // Draw light grid cells
        page.drawRectangle({
          x: xPos,
          y: yPos,
          width: cellSize,
          height: cellSize,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5,
        });
      }
    }

    // =====================================
    // DRAW THE WORD BANK (Bottom of page)
    // =====================================
    let bankY = startY - 30;
    page.drawText('FIND THESE WORDS:', {
      x: margin,
      y: bankY,
      size: 9.5,
      font: helveticaBold,
      color: accentColor,
    });
    
    bankY -= 15;
    const cols = 3;
    const colWidth = (width - margin * 2) / cols;

    puzzle.wordBank.forEach((word, wordIdx) => {
      const colIdx = wordIdx % cols;
      const rowIdx = Math.floor(wordIdx / cols);
      const cellY = bankY - rowIdx * 14;

      if (cellY > 60) {
        page.drawText(`[ ] ${word.toUpperCase()}`, {
          x: margin + colIdx * colWidth,
          y: cellY,
          size: 9,
          font: helvetica,
          color: primaryColor,
        });
      }
    });
  }

  // ==========================================
  // PAGE LAST - 1: ANSWER KEYS
  // ==========================================
  {
    const page = createPage();
    pageNum++;
    drawHeaderFooter(page, 'Answer Keys & Solutions', pageNum);

    page.drawText('Answer Keys / Solutions', {
      x: margin,
      y: height - 85,
      size: 18,
      font: helveticaBold,
      color: accentColor,
    });

    let ansY = height - 120;
    
    // We draw 2 puzzle answer solutions here side by side or stacked to save paper
    const puzzlesToDraw = book.details.puzzles.slice(0, 4); // Show solutions for first 4 or list all

    puzzlesToDraw.forEach((p, pIdx) => {
      const side = (pIdx % 2);
      const row = Math.floor(pIdx / 2);

      const cellW = 10;
      const size = p.grid.length;
      const pGridW = size * cellW;
      
      const xOffset = margin + side * ((width - margin * 2) / 2) + 10;
      const yOffset = ansY - row * 240 - 20;

      if (yOffset < 80) return;

      page.drawText(`PUZZLE #${pIdx + 1} SOLUTIONS`, {
        x: xOffset,
        y: yOffset + pGridW + 15,
        size: 9,
        font: helveticaBold,
        color: primaryColor,
      });

      // Draw minimal grid box
      page.drawRectangle({
        x: xOffset - 4,
        y: yOffset - 4,
        width: pGridW + 8,
        height: pGridW + 8,
        borderColor: primaryColor,
        borderWidth: 1,
      });

      // Draw Letters
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const char = p.grid[r][c];
          const xChar = xOffset + c * cellW;
          const yChar = yOffset + (size - 1 - r) * cellW;

          // Check if this cell is part of any solution word to highlight it
          let isSolution = false;
          for (const sol of p.solutions) {
            // Check if cell is in line
            if (isPointOnLine(r, c, sol.startRow, sol.startCol, sol.endRow, sol.endCol)) {
              isSolution = true;
              break;
            }
          }

          // Highlight solution with soft background rectangle
          if (isSolution) {
            page.drawRectangle({
              x: xOffset + c * cellW,
              y: yOffset + (size - 1 - r) * cellW,
              width: cellW,
              height: cellW,
              color: rgb(0.9, 0.9, 0.2), // Soft yellow marker
            });
          }

          page.drawText(char, {
            x: xChar + 2,
            y: yChar + 2,
            size: 6.5,
            font: courierBold,
            color: isSolution ? accentColor : darkGray,
          });
        }
      }
    });
  }

  // ==========================================
  // PAGE LAST: ABOUT PUBLISHER / AUTHORS
  // ==========================================
  {
    const page = createPage();
    pageNum++;
    drawHeaderFooter(page, 'About Author & Publisher', pageNum);

    const titleY = height - 100;
    page.drawText('About the Author', {
      x: margin,
      y: titleY,
      size: 16,
      font: helveticaBold,
      color: accentColor,
    });

    let currentY = titleY - 20;
    const authorBio = book.details.authorAbout || `Author is an enthusiast of "${book.topic}" who strives to educate and entertain audiences of all backgrounds through meticulously designed puzzles, crosswords, and logic games. Each puzzle is vetted for optimal density and quality.`;
    
    // Draw bio paragraph
    const words = authorBio.split(' ');
    let line = '';
    for (const w of words) {
      if (helvetica.widthOfTextAtSize(line + ' ' + w, 10) > width - margin * 2) {
        page.drawText(line, { x: margin, y: currentY, size: 10, font: helvetica, color: primaryColor });
        line = w;
        currentY -= 15;
      } else {
        line = line ? line + ' ' + w : w;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y: currentY, size: 10, font: helvetica, color: primaryColor });
      currentY -= 30;
    }

    // Publisher details
    page.drawText('About RiddimRoom Publisher AI', {
      x: margin,
      y: currentY,
      size: 16,
      font: helveticaBold,
      color: accentColor,
    });

    currentY -= 20;
    const pubBio = book.details.publisherAbout || 'RiddimRoom Publisher AI is an automated visual-to-print solution for indie publishers, Kindle Direct Publishing enthusiasts, and educators. By leveraging top-tier AI systems, RiddimRoom creates publication-ready interiors, grids, cover wrappers, and marketing copy in seconds. Streamlining the path from topic to royalties!';
    
    const pwords = pubBio.split(' ');
    line = '';
    for (const w of pwords) {
      if (helvetica.widthOfTextAtSize(line + ' ' + w, 10) > width - margin * 2) {
        page.drawText(line, { x: margin, y: currentY, size: 10, font: helvetica, color: primaryColor });
        line = w;
        currentY -= 15;
      } else {
        line = line ? line + ' ' + w : w;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y: currentY, size: 10, font: helvetica, color: primaryColor });
      currentY -= 40;
    }

    // Decorative callout box
    page.drawRectangle({
      x: margin,
      y: currentY - 50,
      width: width - margin * 2,
      height: 60,
      color: lightGray,
      borderColor: primaryColor,
      borderWidth: 1,
    });

    page.drawText('CREATE YOUR NEXT PUZZLE BOOK TODAY', {
      x: margin + 15,
      y: currentY - 18,
      size: 10,
      font: helveticaBold,
      color: accentColor,
    });

    page.drawText('RiddimRoom Publisher AI | https://riddimroom.ai', {
      x: margin + 15,
      y: currentY - 34,
      size: 9,
      font: helvetica,
      color: primaryColor,
    });
  }

  // Pad the interior pages to at least 24 pages for KDP paperback compatibility
  let actualPageCount = pageNum;
  if (actualPageCount < 24) {
    const padCount = 24 - actualPageCount;
    for (let i = 0; i < padCount; i++) {
      const page = createPage();
      pageNum++;
      drawHeaderFooter(page, 'Notes', pageNum);
      
      const titleY = height - 100;
      page.drawText('Notes', {
        x: margin,
        y: titleY,
        size: 16,
        font: helveticaBold,
        color: accentColor,
      });

      // Draw horizontal lined notes lines
      let noteY = titleY - 40;
      while (noteY > 100) {
        page.drawLine({
          start: { x: margin, y: noteY },
          end: { x: width - margin, y: noteY },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
        noteY -= 24;
      }
    }
  }

  return await pdfDoc.save();
}

export async function generateKDPCover(inputBook: Book): Promise<Uint8Array> {
  // Normalize puzzles on the fly to avoid crashing on incomplete books
  const normalizedPuzzles = (inputBook.details.puzzles || []).map((p, idx) => {
    if (p && p.grid && p.grid.length > 0) {
      return p;
    }
    const fallbackCategory = (p as any)?.category || `Thematic Grid ${idx + 1}`;
    const wordBank = (p as any)?.wordBank || [
      'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 
      'ENERGY', 'PEACE', 'SOUND', 'NATURE', 'JOURNEY', 'CREATIVE'
    ];
    const generated = generateWordSearch(
      fallbackCategory,
      wordBank,
      inputBook.details.settings?.difficulty || 'medium',
      inputBook.details.settings?.largePrint ? 14 : 15
    );
    return {
      id: `puz_fallback_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      ...generated,
      funFact: (p as any)?.funFact || `An elegant word search puzzle celebrating ${fallbackCategory}.`,
      definition: (p as any)?.definition || `Vocabulary words representing ${fallbackCategory}.`
    } as WordSearchPuzzle;
  });

  const book: Book = {
    ...inputBook,
    details: {
      ...inputBook.details,
      puzzles: normalizedPuzzles,
      glossary: inputBook.details.glossary || [],
      funFacts: inputBook.details.funFacts || []
    }
  };

  const pdfDoc = await PDFDocument.create();
  
  // Wrap addPage to sanitize text for WinAnsi automatically
  const originalAddPage = pdfDoc.addPage.bind(pdfDoc);
  pdfDoc.addPage = ((pageOption?: any): any => {
    const page = originalAddPage(pageOption);
    const originalDrawText = page.drawText.bind(page);
    page.drawText = (text: string, options?: any) => {
      return originalDrawText(sanitizeForWinAnsi(text), options);
    };
    return page;
  }) as any;

  // Wrap embedFont to automatically sanitize text for widthOfTextAtSize
  const originalEmbedFont = pdfDoc.embedFont.bind(pdfDoc);
  pdfDoc.embedFont = (async (font: any, options?: any) => {
    const embeddedFont = await originalEmbedFont(font, options);
    const originalWidthOfTextAtSize = embeddedFont.widthOfTextAtSize.bind(embeddedFont);
    embeddedFont.widthOfTextAtSize = (text: string, size: number) => {
      return originalWidthOfTextAtSize(sanitizeForWinAnsi(text), size);
    };
    return embeddedFont;
  }) as any;
  
  // Set sizes based on trim size
  let widthIn = 8.5;
  let heightIn = 11.0;
  
  if (book.details.settings.trimSize === '8x10') {
    widthIn = 8.0;
    heightIn = 10.0;
  } else if (book.details.settings.trimSize === '6x9') {
    widthIn = 6.0;
    heightIn = 9.0;
  }

  // Calculate pages inside interior to find spine thickness
  // Our interior generates:
  // 1 (Title) + 1 (Copyright) + 1 (TOC) + 1 (Glossary) + 1 (Fact) + Puzzles Count + 1 (Ans Key) + 1 (About)
  // Plus any NOTES pages we append to reach the KDP-required 24 page paperback minimum.
  const pageCount = Math.max(24, 7 + book.details.puzzles.length);
  
  // Spine thickness typically 0.00225 inches per page (White paper)
  const spineWidthIn = pageCount * 0.00225;
  const wrapMarginIn = 0.125; // 0.125" bleed wrapping around the entire layout

  // Wide cover dimension
  const totalWidthIn = widthIn * 2 + spineWidthIn + wrapMarginIn * 2;
  const totalHeightIn = heightIn + wrapMarginIn * 2;

  const width = totalWidthIn * IN_TO_PT;
  const height = totalHeightIn * IN_TO_PT;

  const page = pdfDoc.addPage([width, height]);

  // Embed standard Helvetica
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Background cover colors based on style choice
  let bgR = 0.1, bgG = 0.1, bgB = 0.2; // default professional dark blue
  let accentR = 0.9, accentG = 0.7, accentB = 0.1;

  if (book.details.cover.style === 'kids') {
    bgR = 0.9; bgG = 0.3; bgB = 0.3; // playful red
    accentR = 0.9; accentG = 0.9; accentB = 0.2;
  } else if (book.details.cover.style === 'caribbean') {
    bgR = 0.05; bgG = 0.5; bgB = 0.55; // turquoise / teal
    accentR = 0.95; accentG = 0.75; accentB = 0.1;
  } else if (book.details.cover.style === 'vintage') {
    bgR = 0.35; bgG = 0.25; bgB = 0.15; // vintage brown / tan
    accentR = 0.85; accentG = 0.65; accentB = 0.45;
  } else if (book.details.cover.style === 'educational') {
    bgR = 0.15; bgG = 0.35; bgB = 0.2; // green forest
    accentR = 0.9; accentG = 0.85; accentB = 0.2;
  } else if (book.details.cover.style === 'modern') {
    bgR = 0.12; bgG = 0.12; bgB = 0.12; // deep charcoal
    accentR = 0.0; accentG = 0.75; accentB = 0.95;
  }

  // Helper function to parse hex to decimal RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  };

  // Override with custom background color if available
  if (book.details.cover.backgroundColor) {
    const customBg = hexToRgb(book.details.cover.backgroundColor);
    if (customBg) {
      bgR = customBg.r;
      bgG = customBg.g;
      bgB = customBg.b;
    }
  }

  // Calculate dynamic contrast based on background luminance
  const isBgLight = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) > 0.5;
  const textColor = isBgLight ? rgb(0.08, 0.08, 0.08) : rgb(0.96, 0.96, 0.96);
  const mutedTextColor = isBgLight ? rgb(0.32, 0.32, 0.32) : rgb(0.82, 0.82, 0.82);

  // Set up custom Title & Subtitle colors
  let titleR = 1.0, titleG = 1.0, titleB = 1.0;
  if (book.details.cover.titleColor) {
    const customTitle = hexToRgb(book.details.cover.titleColor);
    if (customTitle) {
      titleR = customTitle.r;
      titleG = customTitle.g;
      titleB = customTitle.b;
    }
  }

  let subtitleR = 0.8, subtitleG = 0.8, subtitleB = 0.8;
  if (book.details.cover.subtitleColor) {
    const customSub = hexToRgb(book.details.cover.subtitleColor);
    if (customSub) {
      subtitleR = customSub.r;
      subtitleG = customSub.g;
      subtitleB = customSub.b;
    }
  }

  // Draw Full Canvas background color or Full Uploaded Background Image
  let fullBgImageDrawn = false;
  let embeddedCoverImage: any = null;
  let coverImgUrl = book.details.cover.uploadedImageUrl;

  // Auto-crop if image is a mobile screenshot (ratio < 0.65) to remove status and nav bars
  if (coverImgUrl && coverImgUrl.startsWith('data:image/')) {
    try {
      const img = new window.Image();
      img.src = coverImgUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      if (img.width > 0 && img.height > 0) {
        const aspect = img.width / img.height;
        if (aspect < 0.65) {
          console.log(`[Auto-Trimmer in PDF] Detected phone screenshot with aspect ratio ${aspect}. Trimming top/bottom black bars...`);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const cropTopPx = Math.floor(img.height * 0.16);
            const cropBottomPx = Math.floor(img.height * 0.14);
            const targetHeight = img.height - cropTopPx - cropBottomPx;

            if (targetHeight > 0) {
              canvas.width = img.width;
              canvas.height = targetHeight;
              ctx.drawImage(
                img,
                0, cropTopPx, img.width, targetHeight,
                0, 0, img.width, targetHeight
              );
              coverImgUrl = canvas.toDataURL('image/jpeg', 0.95);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to auto-crop screenshot in PDF generator:', e);
    }
  }

  if (coverImgUrl && coverImgUrl.startsWith('data:image/')) {
    try {
      const matches = coverImgUrl.match(/^data:image\/([a-zA-Z0-9\-\+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const type = matches[1];
        const base64Data = matches[2];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        if (type.toLowerCase().includes('png')) {
          embeddedCoverImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedCoverImage = await pdfDoc.embedJpg(imageBytes);
        }
      }
    } catch (imageErr) {
      console.error('Failed to embed uploaded cover image inside PDF:', imageErr);
    }
  }

  const layoutStyle = book.details.cover.imageLayout || 'full-wrap';

  if (embeddedCoverImage && layoutStyle === 'full-wrap') {
    page.drawImage(embeddedCoverImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
    fullBgImageDrawn = true;
  }

  if (!fullBgImageDrawn) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(bgR, bgG, bgB),
    });
  }

  // Calculate offsets (bleed wrapping)
  const wrapMargin = wrapMarginIn * IN_TO_PT;
  const pageW = widthIn * IN_TO_PT;
  const pageH = heightIn * IN_TO_PT;
  const spineW = spineWidthIn * IN_TO_PT;

  const backX = wrapMargin;
  const spineX = wrapMargin + pageW;
  const frontX = wrapMargin + pageW + spineW;
  const contentY = wrapMargin;

  // ==========================================
  // FRONT COVER (Right half)
  // ==========================================
  {
    const frontCenter = frontX + (pageW / 2);

    // If layout is 'front-bg', draw the image covering the entire front cover with proper bleed scaling
    if (embeddedCoverImage && layoutStyle === 'front-bg') {
      page.drawImage(embeddedCoverImage, {
        x: frontX,
        y: 0,
        width: width - frontX,
        height: height,
      });
    }

    const hasFrontBg = fullBgImageDrawn || (embeddedCoverImage && layoutStyle === 'front-bg');

    // Draw beautiful decorative border on front cover only if no full wrap or front background image is drawn
    if (!hasFrontBg) {
      page.drawRectangle({
        x: frontX + 20,
        y: contentY + 20,
        width: pageW - 40,
        height: pageH - 40,
        borderColor: rgb(accentR, accentG, accentB),
        borderWidth: 2,
      });
    }

    // Front Cover Title, Subtitle, and Tagline Overlays (Amazon KDP Ready)
    const titleStr = book.title || 'Word Search';
    const titleSize = 24;
    const titleWidth = helveticaBold.widthOfTextAtSize(titleStr, titleSize);

    const subStr = book.details.amazonListing?.subtitle || 'Complete Word Search Puzzles';
    const subSize = 9.5;
    const subWidth = helvetica.widthOfTextAtSize(subStr, subSize);

    // If we have an uploaded front/full image background, draw a highly readable, elegant white plate
    if (hasFrontBg) {
      page.drawRectangle({
        x: frontCenter - (pageW - 80) / 2,
        y: contentY + pageH * 0.60,
        width: pageW - 80,
        height: 70,
        color: rgb(0.98, 0.98, 0.98),
        opacity: 0.85,
      });

      // Royal publishing colors for excellent contrast over artwork
      page.drawText(titleStr, {
        x: frontCenter - titleWidth / 2,
        y: contentY + pageH * 0.65,
        size: titleSize,
        font: helveticaBold,
        color: rgb(0.04, 0.29, 0.53), // Elegant publishing blue
      });

      page.drawText(subStr, {
        x: frontCenter - subWidth / 2,
        y: contentY + pageH * 0.62,
        size: subSize,
        font: helvetica,
        color: rgb(0.75, 0.1, 0.1), // Rich contrast red
      });
    } else {
      // Standard themed direct text layout
      page.drawText(titleStr, {
        x: frontCenter - titleWidth / 2,
        y: contentY + pageH * 0.72,
        size: titleSize,
        font: helveticaBold,
        color: rgb(titleR, titleG, titleB),
      });

      page.drawText(subStr, {
        x: frontCenter - subWidth / 2,
        y: contentY + pageH * 0.67,
        size: subSize,
        font: helvetica,
        color: rgb(subtitleR, subtitleG, subtitleB),
      });
    }

    // Draw center accent box if layout is standard OR explicitly set to centered
    if (!hasFrontBg || layoutStyle === 'front-centered') {
      page.drawRectangle({
        x: frontCenter - 75,
        y: contentY + pageH * 0.28,
        width: 150,
        height: 150,
        color: rgb(1, 1, 1),
        borderColor: rgb(accentR, accentG, accentB),
        borderWidth: 3,
      });

      let imageDrawn = false;
      if (embeddedCoverImage && layoutStyle === 'front-centered') {
        page.drawImage(embeddedCoverImage, {
          x: frontCenter - 72,
          y: contentY + pageH * 0.28 + 3,
          width: 144,
          height: 144,
        });
        imageDrawn = true;
      }

      if (!imageDrawn) {
        page.drawText('W O R D S', {
          x: frontCenter - 50,
          y: contentY + pageH * 0.42,
          size: 16,
          font: helveticaBold,
          color: textColor,
        });

        page.drawText('PUZZLE BOOK', {
          x: frontCenter - 54,
          y: contentY + pageH * 0.38,
          size: 11,
          font: helvetica,
          color: textColor,
        });
      }
    }

    // Always overlay KDP selling points/features bullets at the bottom left of the front cover
    const tag1 = `${book.details.puzzles.length} Fully Solved Puzzles`;
    const tag2 = `Large Print Readable Grids`;
    const tag3 = `Vocabulary Glossary & Fun Facts`;

    if (hasFrontBg) {
      // Subtle dark translucent support panel for bullet list readability
      page.drawRectangle({
        x: frontX + 30,
        y: contentY + pageH * 0.08,
        width: pageW - 60,
        height: 72,
        color: rgb(0, 0, 0),
        opacity: 0.4,
      });
    }

    const tagTextColor = hasFrontBg ? rgb(1, 1, 1) : textColor;
    const tagBulletColor = rgb(accentR, accentG, accentB);

    // Bullet checkboxes
    page.drawRectangle({
      x: frontX + 40,
      y: contentY + pageH * 0.16 + 2,
      width: 5,
      height: 5,
      color: tagBulletColor,
    });
    page.drawRectangle({
      x: frontX + 40,
      y: contentY + pageH * 0.12 + 2,
      width: 5,
      height: 5,
      color: tagBulletColor,
    });
    page.drawRectangle({
      x: frontX + 40,
      y: contentY + pageH * 0.08 + 2,
      width: 5,
      height: 5,
      color: tagBulletColor,
    });

    page.drawText(tag1, { x: frontX + 52, y: contentY + pageH * 0.16, size: 9.5, font: helveticaBold, color: tagTextColor });
    page.drawText(tag2, { x: frontX + 52, y: contentY + pageH * 0.12, size: 9.5, font: helveticaBold, color: tagTextColor });
    page.drawText(tag3, { x: frontX + 52, y: contentY + pageH * 0.08, size: 9.5, font: helveticaBold, color: tagTextColor });
  }

  // ==========================================
  // BACK COVER (Left half)
  // ==========================================
  {
    if (!fullBgImageDrawn) {
      page.drawRectangle({
        x: backX + 20,
        y: contentY + 20,
        width: pageW - 40,
        height: pageH - 40,
        borderColor: isBgLight ? rgb(0.7, 0.7, 0.7) : rgb(accentR * 0.8, accentG * 0.8, accentB * 0.8),
        borderWidth: 1,
      });
    }

    // Back cover readability background if we have full wrap image
    if (fullBgImageDrawn) {
      page.drawRectangle({
        x: backX + 30,
        y: contentY + pageH * 0.15,
        width: pageW - 60,
        height: pageH * 0.65,
        color: rgb(0, 0, 0),
        opacity: 0.45,
      });
    }

    // Determine contrast-safe text colors for the back cover
    const backTitleColor = fullBgImageDrawn ? rgb(1, 1, 1) : textColor;
    const backDescColor = fullBgImageDrawn ? rgb(0.9, 0.9, 0.9) : mutedTextColor;

    // Back cover title
    const backTitle = 'Explore Word Finds';
    const backTitleWidth = helveticaBold.widthOfTextAtSize(backTitle, 14);
    page.drawText(backTitle, {
      x: backX + (pageW / 2) - backTitleWidth / 2,
      y: contentY + pageH * 0.82,
      size: 14,
      font: helveticaBold,
      color: backTitleColor,
    });

    // Back Cover Description text wrapping
    const backDesc = book.details.backCoverText || `A high-quality collection of interactive word searches customized around "${book.topic}". Built with proper sizing, optimized line heights, and extensive margins suitable for Kindle Direct Publishing (KDP). Inside you will find unique vocabulary groupings, detailed glossaries, amazing fun facts, and a complete answer key at the back. Crafted beautifully with RiddimRoom Publisher AI!`;
    const backWords = backDesc.split(' ');
    let line = '';
    let backY = contentY + pageH * 0.74;

    for (const w of backWords) {
      if (helvetica.widthOfTextAtSize(line + ' ' + w, 9) > pageW - 80) {
        page.drawText(line, {
          x: backX + 40,
          y: backY,
          size: 9,
          font: helvetica,
          color: backDescColor,
        });
        line = w;
        backY -= 13;
      } else {
        line = line ? line + ' ' + w : w;
      }
    }
    if (line) {
      page.drawText(line, {
        x: backX + 40,
        y: backY,
        size: 9,
        font: helvetica,
        color: backDescColor,
      });
    }

    const brandColor1 = fullBgImageDrawn ? rgb(1, 1, 1) : textColor;
    const brandColor2 = fullBgImageDrawn ? rgb(0.8, 0.8, 0.8) : mutedTextColor;

    // Author brand sign off
    page.drawText('Published by RiddimRoom Publisher AI', {
      x: backX + pageW - 200,
      y: contentY + 60,
      size: 8,
      font: helveticaBold,
      color: brandColor1,
    });
    
    page.drawText('https://riddimroom.ai', {
      x: backX + pageW - 200,
      y: contentY + 48,
      size: 7.5,
      font: helvetica,
      color: brandColor2,
    });
  }

  // ==========================================
  // SPINE (Center vertical column)
  // ==========================================
  {
    // Draw spine box background extending fully through top/bottom bleed to avoid printing gaps
    if (!fullBgImageDrawn) {
      page.drawRectangle({
        x: spineX,
        y: 0,
        width: spineW,
        height,
        color: isBgLight ? rgb(0.92, 0.92, 0.92) : rgb(bgR * 0.85, bgG * 0.85, bgB * 0.85), // matching contrasting spine color
      });
    } else {
      // Draw a subtle translucent spine container to hold the spine text nicely
      page.drawRectangle({
        x: spineX,
        y: 0,
        width: spineW,
        height,
        color: rgb(0, 0, 0),
        opacity: 0.25,
      });
    }

    // Draw visual guides for spine folding (very helpful for publishing preview!)
    page.drawLine({
      start: { x: spineX, y: 0 },
      end: { x: spineX, y: height },
      thickness: 0.5,
      color: isBgLight ? rgb(0.8, 0.8, 0.8) : rgb(0.2, 0.2, 0.2),
    });
    page.drawLine({
      start: { x: spineX + spineW, y: 0 },
      end: { x: spineX + spineW, y: height },
      thickness: 0.5,
      color: isBgLight ? rgb(0.8, 0.8, 0.8) : rgb(0.2, 0.2, 0.2),
    });

    // If spine is thick enough to hold text in a small font (spine width >= 3 points)
    // Centering text vertically on the spine is standard publishing practice!
    if (spineW >= 3) {
      const spineTitle = (book.title || 'Word Search').toUpperCase();
      const spineTitleSize = Math.max(3.5, Math.min(8, spineW - 1));
      const spineTextColor = (fullBgImageDrawn || !isBgLight) ? rgb(1, 1, 1) : rgb(0.1, 0.1, 0.1);
      const spineAccentColor = (fullBgImageDrawn || !isBgLight) ? rgb(accentR, accentG, accentB) : rgb(bgR * 0.4, bgG * 0.4, bgB * 0.4);
      
      const spineTitleWidth = helveticaBold.widthOfTextAtSize(spineTitle, spineTitleSize);
      // Center the title vertically along the height of the printable spine
      const spineTextY = contentY + (pageH / 2) + (spineTitleWidth / 2);

      // Rotated text: rotate -90 degrees
      page.drawText(spineTitle, {
        x: spineX + (spineW / 2) - (spineTitleSize / 3) + 0.5,
        y: Math.min(contentY + pageH - 40, Math.max(contentY + 40, spineTextY)),
        size: spineTitleSize,
        font: helveticaBold,
        color: spineTextColor,
        rotate: degrees(-90),
      });

      // Draw short publisher brand name at the bottom of the spine if space permits
      if (pageH > 300) {
        page.drawText('RIDDIMROOM AI', {
          x: spineX + (spineW / 2) - (spineTitleSize / 3) + 0.5,
          y: contentY + 120,
          size: Math.max(3, spineTitleSize * 0.8),
          font: helvetica,
          color: spineAccentColor,
          rotate: degrees(-90),
        });
      }
    }
  }

  return await pdfDoc.save();
}

// Utility to check if a grid cell lies on the line segment connecting start to end
function isPointOnLine(
  r: number,
  c: number,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): boolean {
  const dRow = endRow - startRow;
  const dCol = endCol - startCol;
  
  const len = Math.max(Math.abs(dRow), Math.abs(dCol));
  
  const stepRow = len === 0 ? 0 : dRow / len;
  const stepCol = len === 0 ? 0 : dCol / len;
  
  for (let i = 0; i <= len; i++) {
    const curR = Math.round(startRow + i * stepRow);
    const curC = Math.round(startCol + i * stepCol);
    if (curR === r && curC === c) {
      return true;
    }
  }
  
  return false;
}
