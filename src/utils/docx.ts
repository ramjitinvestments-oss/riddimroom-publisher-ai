import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, HeadingLevel } from 'docx';
import { Book } from '../types';

export async function generateKDPInteriorDocx(book: Book): Promise<Blob> {
  const puzzles = book.details.puzzles || [];
  
  const sections: any[] = [];
  
  // 1. Title Page
  const titleChildren: any[] = [
    new Paragraph({ text: "", spacing: { before: 2000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: book.title || "Word Search Puzzle Book",
          bold: true,
          size: 72, // 36pt
          color: "111827",
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { before: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: book.details.amazonListing?.subtitle || `A Collection of Interactive Puzzles on ${book.topic}`,
          italics: true,
          size: 24, // 12pt
          color: "4B5563",
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { before: 4000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Generated & Published by RiddimRoom Publisher AI",
          bold: true,
          size: 22,
          color: "111827",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Create Beautiful KDP Books with AI",
          size: 18,
          color: "6B7280",
        }),
      ],
    }),
  ];
  
  sections.push({
    properties: {},
    children: titleChildren,
  });

  // Helper for Page Break
  const pageBreakParagraph = () => new Paragraph({ text: "", pageBreakBefore: true });

  // 2. Copyright Page
  const copyrightChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Copyright & Publisher Details",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({ text: "RiddimRoom Publisher AI - Puzzle Book Creator Series", spacing: { after: 200 } }),
    new Paragraph({ text: `Title: ${book.title}`, spacing: { after: 200 } }),
    new Paragraph({ text: `Topic: ${book.topic}`, spacing: { after: 200 } }),
    new Paragraph({ text: `Audience: ${book.details.settings.audience.toUpperCase()}`, spacing: { after: 200 } }),
    new Paragraph({ text: `Difficulty: ${book.details.settings.difficulty.toUpperCase()}`, spacing: { after: 200 } }),
    new Paragraph({ text: "", spacing: { after: 400 } }),
    new Paragraph({ text: `Copyright © ${new Date().getFullYear()} by RiddimRoom Publisher AI.`, spacing: { after: 200 } }),
    new Paragraph({ text: "All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher.", spacing: { after: 200 } }),
    new Paragraph({ text: "", spacing: { after: 400 } }),
    new Paragraph({ text: "KDP Publisher interior specifications compiled automatically.", spacing: { after: 200 } }),
    new Paragraph({ text: "Printed with high-density grids suited for optimal grayscale Amazon paper.", spacing: { after: 200 } }),
    new Paragraph({ text: "", spacing: { after: 400 } }),
    new Paragraph({ text: "First Edition", spacing: { after: 200 } }),
    new Paragraph({ text: "For licensing, wholesale purchases, or commercial custom puzzle book requests, please contact: publisher@riddimroom.ai", spacing: { after: 200 } }),
  ];

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...copyrightChildren],
  });

  // 3. Table of Contents & Introduction
  const tocChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Welcome & Table of Contents",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "TABLE OF CONTENTS",
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  // Populate TOC
  tocChildren.push(new Paragraph({ text: "1. Introduction & Topic Overview ................................................................ Page 3" }));
  tocChildren.push(new Paragraph({ text: "2. How To Play / Instructions .......................................................................... Page 4" }));
  tocChildren.push(new Paragraph({ text: "3. Glossary & Key Vocabulary ....................................................................... Page 5" }));
  tocChildren.push(new Paragraph({ text: "4. Amazing Fun Facts ...................................................................................... Page 6" }));

  puzzles.forEach((p, idx) => {
    tocChildren.push(
      new Paragraph({
        text: `${idx + 5}. Puzzle ${idx + 1}: ${p.category} ......................................................................... Page ${idx + 7}`,
      })
    );
  });

  const ansStart = puzzles.length + 7;
  tocChildren.push(new Paragraph({ text: `${puzzles.length + 5}. Solutions & Answer Keys ........................................................................... Page ${ansStart}` }));
  tocChildren.push(new Paragraph({ text: `${puzzles.length + 6}. About the Author & Publisher .................................................................. Page ${ansStart + 1}` }));

  tocChildren.push(new Paragraph({ text: "", spacing: { before: 400 } }));
  tocChildren.push(new Paragraph({
    children: [
      new TextRun({
        text: "INTRODUCTION",
        bold: true,
        size: 24,
      }),
    ],
    spacing: { after: 200 },
  }));

  const introText = book.details.introduction || `This activity book explores the vibrant topic of "${book.topic}". Specially calibrated for ${book.details.settings.audience}, this collection features clear readability levels and robust puzzles.`;
  tocChildren.push(new Paragraph({ text: introText }));

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...tocChildren],
  });

  // 4. Instructions Page
  const instructionsChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "How to Play & Instructions",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({ text: "Here is how to play and get the most out of each puzzle type in this book:", spacing: { after: 300 } }),
    
    new Paragraph({ children: [new TextRun({ text: "Word Search: ", bold: true }), new TextRun({ text: "Find the list of words hidden in the letter grid. They can be horizontal, vertical, diagonal, or backwards." })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Crossword: ", bold: true }), new TextRun({ text: "Solve the clues and fill in the corresponding numbered cells in the grid, across or down." })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Trivia: ", bold: true }), new TextRun({ text: "Read the questions carefully. Choose the correct answer from the multiple choices, True/False, or write down the answer for fill-in-the-blanks." })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Coloring: ", bold: true }), new TextRun({ text: "Relax your mind and color the unique procedural designs. Use markers or pencils for beautiful shading." })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Maze Labyrinths: ", bold: true }), new TextRun({ text: "Navigate from the Entrance 'S' to the Exit 'E' without hitting any dead ends." })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Sudoku Logic Grid: ", bold: true }), new TextRun({ text: "Fill the empty cells so that every row, column, and 3x3 block contains the digits 1 through 9 exactly once." })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Cryptogram Substitution: ", bold: true }), new TextRun({ text: "De-code the substituted letters of the alphabet to reveal the hidden quote or phrase. Frequency analysis is key!" })], spacing: { after: 150 } }),
    new Paragraph({ children: [new TextRun({ text: "Word Scramble: ", bold: true }), new TextRun({ text: "Unscramble the jumbled letters to restore the original words." })], spacing: { after: 150 } }),
  ];

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...instructionsChildren],
  });

  // 5. Glossary
  const glossaryChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Glossary & Key Vocabulary",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
  ];

  book.details.glossary.forEach((item) => {
    glossaryChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${item.word.toUpperCase()}: `, bold: true }),
          new TextRun({ text: item.definition }),
        ],
        spacing: { after: 100 },
      })
    );
    if (item.example) {
      glossaryChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Example: "${item.example}"`, italics: true, color: "6B7280" }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  });

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...glossaryChildren],
  });

  // 6. Fun Facts
  const funFactsChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Amazing Did You Know Facts",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
  ];

  const facts = book.details.funFacts || [];
  facts.forEach((fact, i) => {
    funFactsChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Fact #${i + 1}: `, bold: true, color: "D4AF37" }),
          new TextRun({ text: fact }),
        ],
        spacing: { after: 300 },
      })
    );
  });

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...funFactsChildren],
  });

  // 7. Puzzles (Pages 7+)
  puzzles.forEach((puzzle, idx) => {
    const puzzleType = (puzzle as any).bookType || "wordsearch";
    const puzzleChildren: any[] = [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `PUZZLE #${idx + 1}: ${puzzle.category.toUpperCase()}`,
            bold: true,
            size: 32,
            color: "111827",
          }),
        ],
        spacing: { after: 200 },
      }),
    ];

    if (puzzle.definition) {
      puzzleChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: puzzle.definition, italics: true, color: "4B5563" }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // Grid / Puzzle Rendering
    if (puzzleType === "wordsearch") {
      const tableRows: any[] = [];
      const size = puzzle.grid.length;
      for (let r = 0; r < size; r++) {
        const cells: any[] = [];
        for (let c = 0; c < size; c++) {
          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: puzzle.grid[r][c],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 300, type: WidthType.DXA },
            })
          );
        }
        tableRows.push(new TableRow({ children: cells }));
      }
      
      puzzleChildren.push(
        new Table({
          rows: tableRows,
          alignment: AlignmentType.CENTER,
        })
      );

      puzzleChildren.push(new Paragraph({ text: "", spacing: { before: 300 } }));
      puzzleChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "WORD BANK:", bold: true, color: "D4AF37" })],
          spacing: { after: 150 },
        })
      );

      const wordsText = puzzle.wordBank.join(", ");
      puzzleChildren.push(new Paragraph({ text: wordsText }));

    } else if (puzzleType === "crossword") {
      const tableRows: any[] = [];
      const size = puzzle.grid.length;
      for (let r = 0; r < size; r++) {
        const cells: any[] = [];
        for (let c = 0; c < size; c++) {
          const char = puzzle.grid[r][c];
          const isWall = char === "#";
          
          const matchingClue = (puzzle.clues || []).find(
            cl => cl.startRow === r && cl.startCol === c
          );
          const cellText = matchingClue ? String(matchingClue.number) : "";

          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: cellText,
                  alignment: AlignmentType.LEFT,
                }),
              ],
              shading: isWall ? { fill: "111827" } : undefined,
              width: { size: 300, type: WidthType.DXA },
            })
          );
        }
        tableRows.push(new TableRow({ children: cells }));
      }

      puzzleChildren.push(
        new Table({
          rows: tableRows,
          alignment: AlignmentType.CENTER,
        })
      );

      puzzleChildren.push(new Paragraph({ text: "", spacing: { before: 300 } }));
      puzzleChildren.push(new Paragraph({ children: [new TextRun({ text: "CLUES:", bold: true })] }));
      
      const across = (puzzle.clues || []).filter(cl => cl.direction === "across");
      const down = (puzzle.clues || []).filter(cl => cl.direction === "down");

      puzzleChildren.push(new Paragraph({ children: [new TextRun({ text: "ACROSS:", bold: true, size: 18 })], spacing: { before: 100 } }));
      across.forEach(cl => {
        puzzleChildren.push(new Paragraph({ text: `${cl.number}. ${cl.clue}` }));
      });

      puzzleChildren.push(new Paragraph({ children: [new TextRun({ text: "DOWN:", bold: true, size: 18 })], spacing: { before: 100 } }));
      down.forEach(cl => {
        puzzleChildren.push(new Paragraph({ text: `${cl.number}. ${cl.clue}` }));
      });

    } else if (puzzleType === "trivia") {
      const questions = puzzle.questions || [];
      questions.forEach((q, qIdx) => {
        puzzleChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${qIdx + 1}. ${q.question}`, bold: true }),
            ],
            spacing: { before: 150, after: 100 },
          })
        );

        if (q.questionType === "tf") {
          puzzleChildren.push(new Paragraph({ text: "[  ] True      [  ] False" }));
        } else if (q.questionType === "fill") {
          puzzleChildren.push(new Paragraph({ text: "Answer: __________________________________" }));
        } else if (q.questionType === "matching") {
          puzzleChildren.push(new Paragraph({ text: "Match with correct terms below." }));
        } else {
          (q.options || []).forEach(opt => {
            puzzleChildren.push(new Paragraph({ text: `[  ]  ${opt}` }));
          });
        }
      });

    } else if (puzzleType === "maze") {
      const size = puzzle.grid.length;
      const tableRows: any[] = [];
      for (let r = 0; r < size; r++) {
        const cells: any[] = [];
        for (let c = 0; c < size; c++) {
          const char = puzzle.grid[r][c];
          const isWall = char === "#";
          
          let cellChar = "";
          if (r === 0 && c === 1) cellChar = "S";
          if (r === size - 1 && c === size - 2) cellChar = "E";

          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: cellChar,
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: isWall ? { fill: "374151" } : undefined,
              width: { size: 250, type: WidthType.DXA },
            })
          );
        }
        tableRows.push(new TableRow({ children: cells }));
      }

      puzzleChildren.push(
        new Table({
          rows: tableRows,
          alignment: AlignmentType.CENTER,
        })
      );
      puzzleChildren.push(new Paragraph({ text: "", spacing: { before: 200 } }));
      puzzleChildren.push(new Paragraph({ text: "Instructions: Start at S (Top) and find your way to E (Bottom) without hitting walls." }));

    } else if (puzzleType === "sudoku") {
      const tableRows: any[] = [];
      const board = puzzle.sudokuGrid?.grid || Array(9).fill(null).map(() => Array(9).fill(0));
      for (let r = 0; r < 9; r++) {
        const cells: any[] = [];
        for (let c = 0; c < 9; c++) {
          const val = board[r][c];
          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: val === 0 ? "" : String(val),
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 400, type: WidthType.DXA },
            })
          );
        }
        tableRows.push(new TableRow({ children: cells }));
      }

      puzzleChildren.push(
        new Table({
          rows: tableRows,
          alignment: AlignmentType.CENTER,
        })
      );

    } else if (puzzleType === "cryptogram") {
      const data = puzzle.cryptogramData;
      if (data) {
        puzzleChildren.push(new Paragraph({ text: "CIPHER TEXT:", spacing: { after: 150 } }));
        puzzleChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: data.cipherText, bold: true, size: 28, font: "Courier New" }),
            ],
            spacing: { after: 300 },
          })
        );
        puzzleChildren.push(new Paragraph({ children: [new TextRun({ text: "HINT: ", bold: true }), new TextRun({ text: data.hint })] }));
      }

    } else if (puzzleType === "wordscramble") {
      const data = puzzle.wordScrambleData || [];
      data.forEach((item, sIdx) => {
        puzzleChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${sIdx + 1}. Scrambled: `, bold: true }),
              new TextRun({ text: item.scrambled, bold: true, color: "111827" }),
            ],
            spacing: { before: 100 },
          })
        );
        puzzleChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `   Hint: ${item.hint}`, italics: true, color: "4B5563" }),
            ],
            spacing: { after: 100 },
          })
        );
      });

    } else if (puzzleType === "coloring") {
      puzzleChildren.push(
        new Paragraph({
          text: `Coloring Page: [${(puzzle as any).coloringType || "Geometric"}] Design Theme`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000, after: 300 },
        })
      );
      puzzleChildren.push(
        new Paragraph({
          text: "Use colored pencils or crayons to shade this beautiful geometric composition.",
          alignment: AlignmentType.CENTER,
        })
      );
    }

    if (puzzle.funFact) {
      puzzleChildren.push(new Paragraph({ text: "", spacing: { before: 200 } }));
      puzzleChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "DID YOU KNOW? ", bold: true, color: "D4AF37" }),
            new TextRun({ text: puzzle.funFact, italics: true }),
          ],
        })
      );
    }

    sections.push({
      properties: {},
      children: [pageBreakParagraph(), ...puzzleChildren],
    });
  });

  // 8. Answer Keys Section
  const answerChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: "SOLUTIONS & ANSWER KEYS",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
  ];

  puzzles.forEach((puzzle, idx) => {
    const puzzleType = (puzzle as any).bookType || "wordsearch";
    answerChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `PUZZLE #${idx + 1} ANSWERS (${puzzle.category.toUpperCase()}):`, bold: true }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    if (puzzleType === "wordsearch") {
      const answersList = puzzle.solutions.map(sol => `${sol.word} (from [${sol.startRow},${sol.startCol}] to [${sol.endRow},${sol.endCol}])`).join("; ");
      answerChildren.push(new Paragraph({ text: answersList }));
    } else if (puzzleType === "crossword") {
      const answersList = (puzzle.clues || []).map(cl => `${cl.number} ${cl.direction.toUpperCase()}: ${cl.answer}`).join(", ");
      answerChildren.push(new Paragraph({ text: answersList }));
    } else if (puzzleType === "trivia") {
      const answersList = (puzzle.questions || []).map((q, qIdx) => `${qIdx + 1}. ${q.answer}`).join(", ");
      answerChildren.push(new Paragraph({ text: answersList }));
    } else if (puzzleType === "maze") {
      const pathText = puzzle.mazeGrid?.path ? puzzle.mazeGrid.path.map(([r, c]) => `[${r},${c}]`).join(" -> ") : "DFS Solved Path";
      answerChildren.push(new Paragraph({ text: pathText.substring(0, 500) + "..." }));
    } else if (puzzleType === "sudoku") {
      const solutionGrid = puzzle.sudokuGrid?.solution;
      if (solutionGrid) {
        const textGrid = solutionGrid.map(row => row.join(" ")).join("\n");
        answerChildren.push(new Paragraph({
          children: [
            new TextRun({ text: textGrid, font: "Courier New" })
          ]
        }));
      }
    } else if (puzzleType === "cryptogram") {
      answerChildren.push(new Paragraph({ text: puzzle.cryptogramData?.plainText || "Plaintext decoded" }));
    } else if (puzzleType === "wordscramble") {
      const answersList = (puzzle.wordScrambleData || []).map(item => `${item.scrambled} -> ${item.original}`).join(", ");
      answerChildren.push(new Paragraph({ text: answersList }));
    } else if (puzzleType === "coloring") {
      answerChildren.push(new Paragraph({ text: "Coloring sheets do not have correct or incorrect solutions. Express your creativity!" }));
    }
  });

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...answerChildren],
  });

  // 9. About Author
  const authorChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: "About Author & Publisher",
          bold: true,
          size: 48,
          color: "111827",
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({ children: [new TextRun({ text: "About the Author:", bold: true })], spacing: { after: 100 } }),
    new Paragraph({ text: book.details.authorAbout || "A passionate workbook creator and educational designer.", spacing: { after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: "About the Publisher:", bold: true })], spacing: { after: 100 } }),
    new Paragraph({ text: book.details.publisherAbout || "RiddimRoom Publisher AI is a cloud service specializing in KDP printable puzzle interior generation.", spacing: { after: 300 } }),
  ];

  sections.push({
    properties: {},
    children: [pageBreakParagraph(), ...authorChildren],
  });

  const doc = new Document({
    sections,
  });

  return await Packer.toBlob(doc);
}
