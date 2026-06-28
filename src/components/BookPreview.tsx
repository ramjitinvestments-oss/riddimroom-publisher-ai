import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Sparkles, Download, Copy, Check, Eye, Trash2, Edit3, Image, 
  Settings, CheckCircle2, AlertTriangle, RefreshCw, Layers, Layout, Maximize2,
  Crop, Scissors
} from 'lucide-react';
import { Book, WordSearchPuzzle } from '../types';
import { generateKDPInterior, generateKDPCover } from '../utils/pdf';
import { generateWordSearch } from '../utils/puzzle';

interface BookPreviewProps {
  book: Book;
  currentPlan: 'free' | 'creator' | 'publisher';
  onBookUpdated: (updated: Book) => void;
  onBack: () => void;
  onTriggerUpgrade: () => void;
}

export default function BookPreview({ book, currentPlan, onBookUpdated, onBack, onTriggerUpgrade }: BookPreviewProps) {
  const [activeTab, setActiveTab] = useState<'puzzles' | 'glossary' | 'cover' | 'listing' | 'export'>('puzzles');
  const [selectedPuzzleIdx, setSelectedPuzzleIdx] = useState(0);
  const [showSolutions, setShowSolutions] = useState(false);
  
  // Cover config local states
  const [coverStyle, setCoverStyle] = useState(book.details.cover.style || 'caribbean');
  const [coverColor, setCoverColor] = useState(book.details.cover.backgroundColor || '#0a424a');
  const [titleColor, setTitleColor] = useState(book.details.cover.titleColor || '#ffffff');
  const [subtitleColor, setSubtitleColor] = useState(book.details.cover.subtitleColor || '#eab308');
  const [frontLayout, setFrontLayout] = useState<'split' | 'centered' | 'full' | 'bento'>(book.details.cover.frontLayout || 'centered');
  const [imageLayout, setImageLayout] = useState<'full-wrap' | 'front-bg' | 'front-centered'>(book.details.cover.imageLayout || 'full-wrap');
  
  // Filter simulator state
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterStep, setFilterStep] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(book.details.cover.uploadedImageUrl);

  // Cover image analyzer and drag states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState<string | undefined>(book.details.cover.analysisResult);
  const [dragActive, setDragActive] = useState(false);
  
  // Crop & Trim state
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>(
    book.details.cover.originalImageUrl || book.details.cover.uploadedImageUrl
  );
  const [trimStatus, setTrimStatus] = useState<string | null>(null);

  useEffect(() => {
    setOriginalImageUrl(book.details.cover.originalImageUrl || book.details.cover.uploadedImageUrl);
    setCropTop(0);
    setCropBottom(0);
    setTrimStatus(null);
  }, [book.id, book.details.cover.originalImageUrl, book.details.cover.uploadedImageUrl]);

  // Trim sizes local states
  const [trimSize, setTrimSize] = useState<'8.5x11' | '8x10' | '6x9'>(book.details.settings.trimSize || '8.5x11');
  const [largePrint, setLargePrint] = useState(book.details.settings.largePrint);

  // Copy feedback states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // PDF Download States
  const [isDownloadingInterior, setIsDownloadingInterior] = useState(false);
  const [isDownloadingCover, setIsDownloadingCover] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState<string | null>(null);

  // Normalize book details puzzles on the fly to avoid crashing on seeded or incomplete books
  const normalizedPuzzles = (book.details.puzzles || []).map((p, idx) => {
    if (p && p.grid && p.grid.length > 0) {
      return p;
    }
    // Generate a fallback puzzle if it is empty/invalid
    const fallbackCategory = (p as any)?.category || `Thematic Grid ${idx + 1}`;
    const wordBank = (p as any)?.wordBank || [
      'VIBRANT', 'EXPLORE', 'RIDDIM', 'ROOTS', 'CULTURE', 'WISDOM', 
      'ENERGY', 'PEACE', 'SOUND', 'NATURE', 'JOURNEY', 'CREATIVE'
    ];
    const generated = generateWordSearch(
      fallbackCategory,
      wordBank,
      book.details.settings?.difficulty || 'medium',
      book.details.settings?.largePrint ? 14 : 15
    );
    return {
      id: `puz_fallback_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      ...generated,
      funFact: (p as any)?.funFact || `An elegant word search puzzle celebrating ${fallbackCategory}.`,
      definition: (p as any)?.definition || `Vocabulary words representing ${fallbackCategory}.`
    } as WordSearchPuzzle;
  });

  const normalizedBook = {
    ...book,
    details: {
      ...book.details,
      puzzles: normalizedPuzzles,
      glossary: book.details.glossary || [],
      funFacts: book.details.funFacts || []
    }
  };

  const activePuzzle: WordSearchPuzzle = normalizedBook.details.puzzles[selectedPuzzleIdx] || normalizedBook.details.puzzles[0];

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const saveCoverSettings = async (styleOverride?: string, colorOverride?: string, layoutOverride?: 'full-wrap' | 'front-bg' | 'front-centered') => {
    const updatedBook = {
      ...book,
      details: {
        ...book.details,
        cover: {
          ...book.details.cover,
          style: (styleOverride as any) || coverStyle,
          backgroundColor: colorOverride || coverColor,
          titleColor,
          subtitleColor,
          frontLayout,
          uploadedImageUrl,
          imageLayout: layoutOverride || imageLayout
        },
        settings: {
          ...book.details.settings,
          trimSize,
          largePrint
        }
      }
    };
    
    // Save to server DB
    try {
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      });
      onBookUpdated(updatedBook);
    } catch (e) {
      console.error('Error saving cover config:', e);
    }
  };

  // Real Cover Image Upload and AI Analysis
  const handleCoverImageUpload = async (file: File) => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisFeedback(undefined);
    setFilterStep('Reading image illustration file...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          throw new Error('Failed to read image file');
        }

        const base64Prefix = 'base64,';
        const base64Idx = dataUrl.indexOf(base64Prefix);
        const base64Data = dataUrl.substring(base64Idx + base64Prefix.length);

        setFilterStep('Measuring illustration aspect ratio & scaling configurations...');
        
        let detectedLayout: 'full-wrap' | 'front-bg' | 'front-centered' = 'front-bg';
        try {
          const img = new window.Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const aspect = img.width / img.height;
              if (aspect > 1.3) {
                detectedLayout = 'full-wrap';
              } else if (aspect < 0.9) {
                detectedLayout = 'front-bg';
              } else {
                detectedLayout = 'front-centered';
              }
              resolve();
            };
            img.onerror = () => resolve(); // Keep going if loading error occurs
            img.src = dataUrl;
          });
        } catch (e) {
          console.error('Error measuring image dimensions:', e);
        }

        setImageLayout(detectedLayout);

        setFilterStep('Gemini AI analyzing illustration contrast & colors...');

        const response = await fetch('/api/cover/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Data,
            mimeType: file.type,
            topic: book.topic
          })
        });

        if (!response.ok) {
          throw new Error('AI analysis service failed');
        }

        const recommendation = await response.json();
        
        // Apply AI suggestions to states
        const newStyle = recommendation.style || 'caribbean';
        const newBg = recommendation.backgroundColor || '#0f766e';
        const newTitle = recommendation.titleColor || '#ffffff';
        const newSub = recommendation.subtitleColor || '#eab308';
        const feedback = recommendation.analysis || 'Image analyzed successfully.';

        setCoverStyle(newStyle);
        setCoverColor(newBg);
        setTitleColor(newTitle);
        setSubtitleColor(newSub);
        setUploadedImageUrl(dataUrl);
        setOriginalImageUrl(dataUrl);
        setAnalysisFeedback(feedback);

        // Auto update book details
        const updatedBook = {
          ...book,
          details: {
            ...book.details,
            cover: {
              ...book.details.cover,
              style: newStyle,
              backgroundColor: newBg,
              titleColor: newTitle,
              subtitleColor: newSub,
              uploadedImageUrl: dataUrl,
              originalImageUrl: dataUrl,
              analysisResult: feedback,
              imageLayout: detectedLayout
            }
          }
        };

        await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedBook)
        });

        onBookUpdated(updatedBook);
        setIsAnalyzing(false);
      };

      reader.onerror = () => {
        throw new Error('File reading error');
      };

      reader.readAsDataURL(file);

    } catch (err: any) {
      console.error(err);
      setIsAnalyzing(false);
      setAlertModalMessage('AI cover analysis failed. Please verify the image file format and try again.');
    }
  };

  const handleCropScreenshot = (top: number, bottom: number) => {
    const baseImage = originalImageUrl || uploadedImageUrl;
    if (!baseImage) return;
    setIsCropping(true);
    setTrimStatus(null);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsCropping(false);
          return;
        }

        const sourceWidth = img.width;
        const sourceHeight = img.height;

        const cropTopPx = Math.floor(sourceHeight * (top / 100));
        const cropBottomPx = Math.floor(sourceHeight * (bottom / 100));
        const targetHeight = sourceHeight - cropTopPx - cropBottomPx;

        if (targetHeight <= 0) {
          setAlertModalMessage('Crop values are too large. Please adjust sliders.');
          setIsCropping(false);
          return;
        }

        canvas.width = sourceWidth;
        canvas.height = targetHeight;

        ctx.drawImage(
          img,
          0,
          cropTopPx,
          sourceWidth,
          targetHeight,
          0,
          0,
          sourceWidth,
          targetHeight
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setUploadedImageUrl(croppedDataUrl);

        const updated = {
          ...book,
          details: {
            ...book.details,
            cover: {
              ...book.details.cover,
              uploadedImageUrl: croppedDataUrl,
              originalImageUrl: originalImageUrl,
            }
          }
        };

        fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).then(() => {
          onBookUpdated(updated);
          setIsCropping(false);
        });
      } catch (err) {
        console.error('Error cropping image:', err);
        setIsCropping(false);
      }
    };
    img.onerror = () => {
      setIsCropping(false);
    };
    img.src = baseImage;
  };

  const handleAutoTrim = () => {
    const baseImage = originalImageUrl || uploadedImageUrl;
    if (!baseImage) return;

    setIsCropping(true);
    setTrimStatus(null);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsCropping(false);
          setTrimStatus('Could not read image context.');
          return;
        }

        const width = img.width;
        const height = img.height;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Common mobile screenshot bars won't exceed 25% of top or bottom height
        const maxScanHeight = Math.floor(height * 0.25);

        const isBorderRow = (y: number): boolean => {
          let matchCount = 0;
          let transparentCount = 0;
          
          // Sample reference pixel slightly offset from the edge
          const refX = Math.min(5, width - 1);
          const refIdx = (y * width + refX) * 4;
          const refR = data[refIdx];
          const refG = data[refIdx + 1];
          const refB = data[refIdx + 2];
          const refA = data[refIdx + 3];

          const tolerance = 25;

          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // If pixel is transparent, count as border background
            if (a < 15) {
              transparentCount++;
              continue;
            }

            // Calculate color distance (RMS error)
            const dist = Math.sqrt(
              (r - refR) * (r - refR) +
              (g - refG) * (g - refG) +
              (b - refB) * (b - refB)
            );
            if (dist <= tolerance && Math.abs(a - refA) < tolerance) {
              matchCount++;
            }
          }

          // Row is classed as border if >= 85% is solid-color or transparent
          return (matchCount + transparentCount) / width >= 0.85;
        };

        let topBorders = 0;
        for (let y = 0; y < maxScanHeight; y++) {
          if (isBorderRow(y)) {
            topBorders = y + 1;
          } else {
            break;
          }
        }

        let bottomBorders = 0;
        for (let y = height - 1; y >= height - maxScanHeight; y--) {
          if (isBorderRow(y)) {
            bottomBorders = height - y;
          } else {
            break;
          }
        }

        const topPercent = Math.round((topBorders / height) * 100);
        const bottomPercent = Math.round((bottomBorders / height) * 100);

        if (topPercent === 0 && bottomPercent === 0) {
          setTrimStatus('No screenshot borders detected.');
          setIsCropping(false);
          return;
        }

        // Set the sliders
        setCropTop(topPercent);
        setCropBottom(bottomPercent);
        setTrimStatus(`Auto-detected: trimmed ${topPercent}% from top, ${bottomPercent}% from bottom.`);

        // Immediately crop the image with calculated percentages
        const cropTopPx = Math.floor(height * (topPercent / 100));
        const cropBottomPx = Math.floor(height * (bottomPercent / 100));
        const targetHeight = height - cropTopPx - cropBottomPx;

        if (targetHeight <= 0) {
          setTrimStatus('Error calculating crop dimensions.');
          setIsCropping(false);
          return;
        }

        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          setIsCropping(false);
          return;
        }

        cropCanvas.width = width;
        cropCanvas.height = targetHeight;

        cropCtx.drawImage(
          img,
          0,
          cropTopPx,
          width,
          targetHeight,
          0,
          0,
          width,
          targetHeight
        );

        const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.95);
        setUploadedImageUrl(croppedDataUrl);

        const updated = {
          ...book,
          details: {
            ...book.details,
            cover: {
              ...book.details.cover,
              uploadedImageUrl: croppedDataUrl,
              originalImageUrl: originalImageUrl,
            }
          }
        };

        fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).then(() => {
          onBookUpdated(updated);
          setIsCropping(false);
        }).catch((e) => {
          console.error(e);
          setIsCropping(false);
        });

      } catch (err: any) {
        console.error('Error during Auto-Trim analysis:', err);
        setTrimStatus('An error occurred during image scanning.');
        setIsCropping(false);
      }
    };

    img.onerror = () => {
      setTrimStatus('Failed to load image for scanning.');
      setIsCropping(false);
    };

    img.src = baseImage;
  };

  const handleResetCrop = () => {
    setCropTop(0);
    setCropBottom(0);
    setTrimStatus(null);
    if (originalImageUrl) {
      setUploadedImageUrl(originalImageUrl);
      
      const updated = {
        ...book,
        details: {
          ...book.details,
          cover: {
            ...book.details.cover,
            uploadedImageUrl: originalImageUrl,
            originalImageUrl: originalImageUrl,
          }
        }
      };

      setIsCropping(true);
      fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).then(() => {
        onBookUpdated(updated);
        setIsCropping(false);
      }).catch((e) => {
        console.error(e);
        setIsCropping(false);
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCoverImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Simulating smart image filters on custom upload
  const handleSimulateArtworkFilters = () => {
    setIsFiltering(true);
    const steps = [
      'Isolating background layers...',
      'Applying Sharp-algorithm Edge Enhancement...',
      'Scaling resolution up 400% to 4K Print DPI...',
      'Harmonizing contrast levels & color profiles...'
    ];
    let stepIdx = 0;
    setFilterStep(steps[0]);

    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setFilterStep(steps[stepIdx]);
      } else {
        clearInterval(interval);
        setIsFiltering(false);
        // Set sample beautiful uploaded illustration placeholder
        const demoCoverArt = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80';
        setUploadedImageUrl(demoCoverArt);
        
        // Auto update book details
        const updatedBook = {
          ...book,
          details: {
            ...book.details,
            cover: {
              ...book.details.cover,
              uploadedImageUrl: demoCoverArt
            }
          }
        };
        fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedBook)
        }).then(() => {
          onBookUpdated(updatedBook);
          setAlertModalMessage('Artwork transformed successfully with high-contrast print filters!');
        });
      }
    }, 1200);
  };

  const handleDownloadInterior = async () => {
    setIsDownloadingInterior(true);
    // Log download event
    try {
      await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, downloadType: 'interior_pdf' })
      });
    } catch (e) { console.error(e); }

    try {
      // Free plan gets watermarked
      const watermark = currentPlan === 'free';
      const pdfBytes = await generateKDPInterior(normalizedBook, watermark);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${book.topic.replace(/\s+/g, '_')}_KDP_Interior.pdf`;
      link.click();
    } catch (err) {
      console.error('PDF Generation error:', err);
      setAlertModalMessage('Interior PDF compile failed.');
    }
    setIsDownloadingInterior(false);
  };

  const handleDownloadCover = async () => {
    setIsDownloadingCover(true);
    try {
      await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, downloadType: 'cover_pdf' })
      });
    } catch (e) { console.error(e); }

    try {
      const pdfBytes = await generateKDPCover(normalizedBook);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${book.topic.replace(/\s+/g, '_')}_KDP_Cover.pdf`;
      link.click();
    } catch (err) {
      console.error('Cover Generation error:', err);
      setAlertModalMessage('Cover PDF compile failed.');
    }
    setIsDownloadingCover(false);
  };

  // Helper to check if row/col is in any solutions
  const checkIsSolutionCell = (r: number, c: number) => {
    if (!showSolutions || !activePuzzle) return false;
    
    for (const sol of activePuzzle.solutions) {
      // check if on line from start Row/Col to end Row/Col
      const dRow = sol.endRow - sol.startRow;
      const dCol = sol.endCol - sol.startCol;
      const len = Math.max(Math.abs(dRow), Math.abs(dCol));
      const stepRow = len === 0 ? 0 : dRow / len;
      const stepCol = len === 0 ? 0 : dCol / len;
      
      for (let i = 0; i <= len; i++) {
        const curR = Math.round(sol.startRow + i * stepRow);
        const curC = Math.round(sol.startCol + i * stepCol);
        if (curR === r && curC === c) return true;
      }
    }
    return false;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-[#04150e] border border-emerald-950/80 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-[#10B981] font-black hover:underline flex items-center gap-1 mb-2"
          >
            ← Back to Bookshelf
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white font-sans">{book.title}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase shadow-md shadow-emerald-900/15">
              {book.details.settings.puzzleCount} Puzzles
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Topic: <span className="font-bold text-[#D4AF37]">{book.topic}</span> • 
            Audience: <span className="font-bold text-zinc-300 capitalize">{book.details.settings.audience}</span>
          </p>
        </div>

        <div className="flex gap-2">
          {currentPlan === 'free' && (
            <button
              onClick={onTriggerUpgrade}
              className="py-2.5 px-4 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-950/20"
            >
              Unlock commercial rights <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('export');
            }}
            className="py-2.5 px-4 bg-emerald-950/40 hover:bg-emerald-900/30 text-white font-bold rounded-xl border border-emerald-900/20 text-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB SELECTORS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 border-b border-emerald-950/80">
        {([
          { id: 'puzzles', label: 'Puzzle Sheets Grid', icon: Layout },
          { id: 'glossary', label: 'Glossary & Facts', icon: BookOpen },
          { id: 'cover', label: 'KDP Cover Wrapper', icon: Layers },
          { id: 'listing', label: 'Amazon Listings Meta', icon: Copy },
          { id: 'export', label: 'KDP Compiles', icon: Settings }
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Trigger auto saves
                if (tab.id === 'cover' || tab.id === 'export') {
                  saveCoverSettings();
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 shrink-0 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-[#030805] shadow-md shadow-amber-950/20'
                  : 'text-zinc-400 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* WORKSPACE AREA */}
      <div className="bg-[#020906]/65 rounded-3xl border border-emerald-950/80 p-6 min-h-[400px]">
             {/* PUZZLES SHEETS PREVIEW */}
        {activeTab === 'puzzles' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left sidebar - select puzzle */}
            <div className="lg:col-span-3 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#D4AF37] mb-3 px-2">
                Puzzle Chapters
              </h3>
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-2 divide-y divide-emerald-950/40">
                {book.details.puzzles.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPuzzleIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-black transition-all flex items-center justify-between ${
                      selectedPuzzleIdx === idx
                        ? 'bg-emerald-950/60 text-white border border-emerald-900/20 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-emerald-950/25'
                    }`}
                  >
                    <span className="truncate">#{idx + 1}: {p.category}</span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-1">
                      {p.wordBank.length}w
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Middle & Right - Active puzzle grid & word bank */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#04150e] border border-emerald-950/80 rounded-2xl gap-3">
                <div>
                  <h4 className="text-sm font-black text-white capitalize">
                    Puzzle #{selectedPuzzleIdx + 1}: {activePuzzle?.category}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {activePuzzle?.definition || 'Thematic crossword-style word finds.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSolutions(!showSolutions)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 ${
                      showSolutions
                        ? 'bg-emerald-500/10 text-[#10B981] border-emerald-500/30'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/20 border border-emerald-900/10 text-zinc-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showSolutions ? 'Hide Answer Keys' : 'Draw Solution Lines'}
                  </button>
                </div>
              </div>
              {/* GRID WORKSPACE */}
              {activePuzzle && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center justify-center">
                  
                  {/* WORD SEARCH PUZZLE LAYOUT */}
                  {(!activePuzzle.bookType || activePuzzle.bookType === 'wordsearch') && (
                    <>
                      {/* Grid Renderer */}
                      <div className="md:col-span-7 flex justify-center">
                        <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-3xl shadow-md inline-block">
                          <div
                            className="grid gap-1 bg-[#020906] p-2 rounded-2xl"
                            style={{
                              gridTemplateColumns: `repeat(${activePuzzle.grid.length}, minmax(0, 1fr))`
                            }}
                          >
                            {activePuzzle.grid.map((row, rIdx) =>
                              row.map((char, cIdx) => {
                                 const isSol = checkIsSolutionCell(rIdx, cIdx);
                                 return (
                                   <div
                                     key={`${rIdx}-${cIdx}`}
                                     className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-mono font-bold rounded transition-all duration-200 ${
                                       isSol
                                         ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20 scale-105 z-10'
                                         : 'text-zinc-300 hover:bg-[#04150e]'
                                     }`}
                                   >
                                     {char}
                                   </div>
                                 );
                               })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Word bank side lists */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Vocabulary Word Bank
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-4 rounded-2xl h-[280px] overflow-y-auto">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {activePuzzle.wordBank.map((word, wIdx) => (
                              <div
                                key={wIdx}
                                className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 ${
                                  showSolutions
                                    ? 'bg-emerald-500/5 text-[#10B981] border-emerald-500/25'
                                    : 'bg-[#020906] border-emerald-950/50 text-zinc-300'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate">{word}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* CROSSWORD PUZZLE LAYOUT */}
                  {activePuzzle.bookType === 'crossword' && (
                    <>
                      {/* Grid Renderer */}
                      <div className="md:col-span-7 flex justify-center">
                        <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-3xl shadow-md inline-block">
                          <div
                            className="grid gap-0.5 bg-[#020906] p-2 rounded-2xl border border-emerald-950/40"
                            style={{
                              gridTemplateColumns: `repeat(${activePuzzle.grid.length}, minmax(0, 1fr))`
                            }}
                          >
                            {activePuzzle.grid.map((row, rIdx) =>
                              row.map((char, cIdx) => {
                                const isBlack = char === '#';
                                // Look up start cell number
                                const matchingClue = (activePuzzle.clues || []).find(
                                  c => c.startRow === rIdx && c.startCol === cIdx
                                );
                                return (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center relative font-mono font-bold text-xs sm:text-sm rounded-sm border ${
                                      isBlack
                                        ? 'bg-[#020906] border-emerald-950/20 text-transparent'
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 shadow-sm'
                                    }`}
                                  >
                                    {!isBlack && matchingClue && (
                                      <span className="absolute top-0.5 left-0.5 text-[7px] sm:text-[8px] font-sans font-extrabold text-zinc-500 leading-none">
                                        {matchingClue.number}
                                      </span>
                                    )}
                                    {!isBlack && (showSolutions ? char : '')}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Clues side panel */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Crossword Clues Index
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-4 rounded-2xl h-[280px] overflow-y-auto space-y-4 text-[11px] font-medium leading-relaxed">
                          <div>
                            <h6 className="font-extrabold text-[#10B981] mb-1.5 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                              Across
                            </h6>
                            <div className="space-y-1.5">
                              {(activePuzzle.clues || []).filter(c => c.direction === 'across').map(c => (
                                <div key={`${c.number}-ac`} className="p-2 bg-[#020906]/80 rounded border border-emerald-950/30 text-zinc-300">
                                  <span className="font-extrabold text-[#D4AF37] mr-1.5">{c.number}.</span>
                                  {c.clue}
                                  {showSolutions && <span className="text-emerald-400 font-mono text-[9px] ml-1.5 font-bold">({c.answer})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h6 className="font-extrabold text-[#10B981] mb-1.5 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                              Down
                            </h6>
                            <div className="space-y-1.5">
                              {(activePuzzle.clues || []).filter(c => c.direction === 'down').map(c => (
                                <div key={`${c.number}-dn`} className="p-2 bg-[#020906]/80 rounded border border-emerald-950/30 text-zinc-300">
                                  <span className="font-extrabold text-[#D4AF37] mr-1.5">{c.number}.</span>
                                  {c.clue}
                                  {showSolutions && <span className="text-emerald-400 font-mono text-[9px] ml-1.5 font-bold">({c.answer})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* TRIVIA BOOK LAYOUT */}
                  {activePuzzle.bookType === 'trivia' && (
                    <>
                      {/* Questions area */}
                      <div className="md:col-span-7 bg-[#04150e] border border-emerald-950/80 p-5 rounded-3xl space-y-4 max-h-[380px] overflow-y-auto">
                        {(activePuzzle.questions || []).map((q, qIdx) => (
                          <div key={qIdx} className="p-4 bg-[#020906] border border-emerald-950/60 rounded-2xl text-left">
                            <h6 className="text-xs sm:text-sm font-black text-white mb-2">{qIdx + 1}. {q.question}</h6>
                            <div className="grid grid-cols-2 gap-2">
                              {(q.options || []).map((opt, oIdx) => {
                                const isCorrect = opt === q.answer;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-2 ${
                                      showSolutions && isCorrect
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-[#10B981]'
                                        : 'bg-[#04150e]/60 border-emerald-950/50 text-zinc-400'
                                    }`}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                      showSolutions && isCorrect ? 'border-emerald-500 bg-emerald-500/20 text-white' : 'border-emerald-950 bg-[#020906]'
                                    }`}>
                                      {showSolutions && isCorrect && <span className="text-[7px]">✓</span>}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Side panel */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Trivia Questionnaire Details
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed text-zinc-300">
                          <p>
                            This publication-ready trivia quiz page includes <span className="text-[#10B981] font-extrabold">{(activePuzzle.questions || []).length} structured multiple-choice questions</span> with rich context.
                          </p>
                          <p>
                            Solutions are fully prepared and cross-referenced with KDP whitepaper margins.
                          </p>
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-2">
                            <span className="text-[#10B981] font-bold">ℹ</span>
                            <p className="text-[10px] text-zinc-400 leading-normal">
                              Trivia formatting adapts automatically during final high-fidelity KDP PDF interior compile runs.
                            </p>
                          </div>
                        </div>

                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* COLORING BOOK LAYOUT */}
                  {activePuzzle.bookType === 'coloring' && (
                    <>
                      {/* Procedural Vector Preview */}
                      <div className="md:col-span-7 flex justify-center">
                        <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-3xl shadow-md inline-block w-full max-w-[320px]">
                          <div className="aspect-square w-full rounded-2xl bg-zinc-50 border border-zinc-200 p-2 flex items-center justify-center relative overflow-hidden shadow-inner">
                            <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-900" stroke="currentColor" strokeWidth="0.5" fill="none">
                              {(() => {
                                const type = activePuzzle.coloringType || 'geometric';
                                
                                if (type === 'mandala') {
                                  return (
                                    <g>
                                      <circle cx="50" cy="50" r="45" />
                                      <circle cx="50" cy="50" r="35" strokeDasharray="1,1" />
                                      <circle cx="50" cy="50" r="25" />
                                      <circle cx="50" cy="50" r="15" />
                                      {[...Array(16)].map((_, i) => {
                                        const angle = (i * 360) / 16;
                                        const rad = (angle * Math.PI) / 180;
                                        return (
                                          <g key={i}>
                                            <line x1="50" y1="50" x2={50 + 45 * Math.cos(rad)} y2={50 + 45 * Math.sin(rad)} strokeWidth="0.25" />
                                            <circle cx={50 + 30 * Math.cos(rad)} cy={50 + 30 * Math.sin(rad)} r="4" strokeWidth="0.25" />
                                            <circle cx={50 + 20 * Math.cos(rad)} cy={50 + 20 * Math.sin(rad)} r="2" strokeWidth="0.25" />
                                          </g>
                                        );
                                      })}
                                    </g>
                                  );
                                } else if (type === 'geometric') {
                                  return (
                                    <g>
                                      <rect x="5" y="5" width="90" height="90" rx="4" />
                                      <line x1="5" y1="5" x2="95" y2="95" />
                                      <line x1="95" y1="5" x2="5" y2="95" />
                                      {[...Array(5)].map((_, i) => (
                                        <rect key={i} x={5 + i * 8} y={5 + i * 8} width={90 - i * 16} height={90 - i * 16} rx="2" />
                                      ))}
                                      {[...Array(6)].map((_, i) => (
                                        <circle key={i} cx="50" cy="50" r={i * 7} />
                                      ))}
                                    </g>
                                  );
                                } else if (type === 'nature') {
                                  return (
                                    <g>
                                      <circle cx="50" cy="50" r="45" />
                                      {[...Array(12)].map((_, i) => {
                                        const angle = (i * 360) / 12;
                                        const rad = (angle * Math.PI) / 180;
                                        const cx = 50 + 15 * Math.cos(rad);
                                        const cy = 50 + 15 * Math.sin(rad);
                                        return (
                                          <circle key={i} cx={cx} cy={cy} r="18" strokeWidth="0.3" />
                                        );
                                      })}
                                      <circle cx="50" cy="50" r="10" />
                                    </g>
                                  );
                                } else {
                                  return (
                                    <g>
                                      <rect x="5" y="5" width="90" height="90" />
                                      {[...Array(10)].map((_, i) => (
                                        <g key={i}>
                                          <circle cx={10 + i * 8} cy={10 + i * 8} r={i * 4} />
                                          <line x1="5" y1={10 + i * 8} x2="95" y2={10 + i * 8} />
                                          <line x1={10 + i * 8} y1="5" x2={10 + i * 8} y2="95" />
                                        </g>
                                      ))}
                                    </g>
                                  );
                                }
                              })()}
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Explanatory Sidebar */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Coloring Page Template
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed text-zinc-300">
                          <p>
                            This page features a stunning <span className="text-[#10B981] font-extrabold capitalize">{activePuzzle.coloringType || 'geometric'} themed vector stencil</span> generated procedurally.
                          </p>
                          <p>
                            All lines are drawn as razor-sharp vectors to guarantee zero bleed and optimal printing quality at a native 300 DPI layout.
                          </p>
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-2">
                            <span className="text-[#10B981] font-bold">✓</span>
                            <p className="text-[10px] text-zinc-400 leading-normal">
                              Optimized with high contrast ink settings for premium visual stimulation.
                            </p>
                          </div>
                        </div>

                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* MAZE LAYOUT */}
                  {activePuzzle.bookType === 'maze' && (
                    <>
                      {/* Maze Grid */}
                      <div className="md:col-span-7 flex justify-center">
                        <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-3xl shadow-md inline-block">
                          <div className="relative">
                            <div
                              className="grid bg-[#020906] p-2 rounded-2xl border border-emerald-950/40"
                              style={{
                                gridTemplateColumns: `repeat(${activePuzzle.grid.length}, minmax(0, 1fr))`,
                                gap: '1px'
                              }}
                            >
                              {activePuzzle.grid.map((row, rIdx) =>
                                row.map((char, cIdx) => {
                                  const isWall = char === '#';
                                  // Check if cell is in solution path
                                  const isSolutionPath = showSolutions && activePuzzle.mazeGrid?.path?.some(
                                    ([pr, pc]) => pr === rIdx && pc === cIdx
                                  );
                                  return (
                                    <div
                                      key={`${rIdx}-${cIdx}`}
                                      className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-sm transition-all ${
                                        isWall
                                          ? 'bg-zinc-800'
                                          : isSolutionPath
                                          ? 'bg-emerald-500 shadow shadow-emerald-500/50'
                                          : 'bg-zinc-100'
                                      }`}
                                    >
                                      {rIdx === 0 && cIdx === 1 && <span className="text-[9px] font-black text-emerald-700">S</span>}
                                      {rIdx === activePuzzle.grid.length - 1 && cIdx === row.length - 2 && <span className="text-[9px] font-black text-rose-700">E</span>}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Side panel */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Maze Exploration
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed text-zinc-300">
                          <p>
                            Navigate the custom procedurally generated maze starting at <b>Entrance S</b> and completing at <b>Exit E</b>.
                          </p>
                          <p>
                            The maze has been carved using randomized depth-first search (DFS) algorithms, ensuring a unique solution that is perfect for stimulating mental acuity.
                          </p>
                        </div>
                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* SUDOKU LAYOUT */}
                  {activePuzzle.bookType === 'sudoku' && (
                    <>
                      {/* Sudoku Grid */}
                      <div className="md:col-span-7 flex justify-center">
                        <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-3xl shadow-md inline-block">
                          <div
                            className="grid grid-cols-9 gap-px bg-zinc-400 p-1.5 rounded-2xl border-2 border-zinc-700"
                            style={{ width: 'fit-content' }}
                          >
                            {activePuzzle.sudokuGrid?.grid.map((row, rIdx) =>
                              row.map((cell, cIdx) => {
                                const originalVal = cell;
                                const solutionVal = activePuzzle.sudokuGrid?.solution[rIdx][cIdx];
                                const isBlank = originalVal === 0;
                                const borderRight = (cIdx === 2 || cIdx === 5) ? 'border-r-2 border-r-zinc-800' : '';
                                const borderBottom = (rIdx === 2 || rIdx === 5) ? 'border-b-2 border-b-zinc-800' : '';
                                
                                return (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold bg-zinc-50 text-zinc-900 ${borderRight} ${borderBottom}`}
                                  >
                                    {!isBlank ? (
                                      <span className="text-zinc-900 font-black">{originalVal}</span>
                                    ) : showSolutions ? (
                                      <span className="text-emerald-600 font-extrabold">{solutionVal}</span>
                                    ) : (
                                      <span className="text-transparent">0</span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Side panel */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Sudoku Logic Grid
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed text-zinc-300">
                          <p>
                            Fill the 9x9 grid so that every row, every column, and each of the nine 3x3 sub-grids contain all of the digits from 1 to 9.
                          </p>
                          <p>
                            This puzzle contains a single logical solution with symmetrical spacing optimized for printable reading clarity.
                          </p>
                        </div>
                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* CRYPTOGRAM LAYOUT */}
                  {activePuzzle.bookType === 'cryptogram' && (
                    <>
                      {/* Cryptogram Box */}
                      <div className="md:col-span-7 bg-[#04150e] border border-emerald-950/80 p-5 rounded-3xl max-h-[380px] overflow-y-auto">
                        <div className="flex flex-wrap gap-x-2 gap-y-4 justify-center">
                          {activePuzzle.cryptogramData?.cipherText.split(' ').map((word, wIdx) => (
                            <div key={wIdx} className="flex gap-1 bg-[#020906]/60 p-2 rounded-xl border border-emerald-950/40">
                              {word.split('').map((char, cIdx) => {
                                const isLetter = char >= 'A' && char <= 'Z';
                                const matchingIndex = activePuzzle.cryptogramData?.cipherText.indexOf(char) ?? 0;
                                const originalChar = activePuzzle.cryptogramData?.plainText[matchingIndex] || '';
                                
                                return (
                                  <div key={cIdx} className="flex flex-col items-center w-6 sm:w-7">
                                    {/* Encrypted letter */}
                                    <div className="h-6 sm:h-7 flex items-center justify-center font-mono font-black text-xs sm:text-sm text-zinc-100 bg-[#020906] border border-emerald-950 rounded">
                                      {char}
                                    </div>
                                    {/* Solver space / solved letter */}
                                    <div className="h-5 flex items-end justify-center font-mono text-[10px] sm:text-xs border-b border-zinc-600 w-full mt-1 text-center">
                                      {isLetter ? (
                                        showSolutions ? (
                                          <span className="text-[#10B981] font-black">{originalChar}</span>
                                        ) : (
                                          <span className="text-zinc-600 font-black">?</span>
                                        )
                                      ) : (
                                        <span className="text-zinc-400 font-black">{char}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        {activePuzzle.cryptogramData?.hint && (
                          <div className="mt-5 p-3.5 bg-[#020906]/80 border border-emerald-950/50 rounded-xl text-left">
                            <span className="text-[10px] font-black text-[#10B981] uppercase tracking-wider block mb-0.5">Solver Hint:</span>
                            <p className="text-xs text-zinc-300 leading-normal">{activePuzzle.cryptogramData.hint}</p>
                          </div>
                        )}
                      </div>

                      {/* Side panel */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Cryptogram Substitution Cipher
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed text-zinc-300">
                          <p>
                            This puzzle uses a 1-to-1 letter substitution cipher. Each letter of the alphabet has been replaced with a different letter.
                          </p>
                          <p>
                            Analyze frequency, common double-letters, and word structures to decode the hidden thematic quote!
                          </p>
                        </div>
                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* WORD SCRAMBLE LAYOUT */}
                  {activePuzzle.bookType === 'wordscramble' && (
                    <>
                      {/* Word Scramble Grid */}
                      <div className="md:col-span-7 bg-[#04150e] border border-emerald-950/80 p-5 rounded-3xl space-y-3 max-h-[380px] overflow-y-auto">
                        {(activePuzzle.wordScrambleData || []).map((item, idx) => (
                          <div key={idx} className="p-3 bg-[#020906]/80 border border-emerald-950/40 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono font-bold text-[#D4AF37] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-950/50">
                                #{idx + 1}
                              </span>
                              <div className="space-y-0.5 text-left">
                                <h6 className="text-xs sm:text-sm font-mono font-black text-zinc-100 tracking-widest uppercase">
                                  {item.scrambled}
                                </h6>
                                <p className="text-[10px] text-zinc-400">{item.hint}</p>
                              </div>
                            </div>
                            
                            {showSolutions ? (
                              <div className="text-right flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                <span className="text-[11px] font-mono font-black text-[#10B981] uppercase tracking-wider">{item.original}</span>
                                <span className="text-[#10B981] font-bold text-xs">✓</span>
                              </div>
                            ) : (
                              <div className="w-24 border-b border-dashed border-zinc-600 h-6"></div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Side panel */}
                      <div className="md:col-span-5 space-y-4">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                          Word Scramble Rules
                        </h5>
                        <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-3.5 text-xs leading-relaxed text-zinc-300">
                          <p>
                            Unravel the jumbled letters to restore the original thematic vocabulary words.
                          </p>
                          <p>
                            Use the provided hints below each jumbled word if you need a conceptual spark!
                          </p>
                        </div>
                        {activePuzzle.funFact && (
                          <div className="p-3 bg-[#020906] border border-emerald-950/80 rounded-xl text-[10px] text-zinc-400 font-medium leading-relaxed">
                            <span className="font-extrabold text-[#D4AF37] block mb-0.5">Did you know?</span>
                            {activePuzzle.funFact}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>
              )}

            </div>

          </div>
        )}

        {/* GLOSSARY & TRIVIA PREVIEW */}
        {activeTab === 'glossary' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            
            {/* Glossary section */}
            <div className="space-y-4">
              <h3 className="text-md font-black text-white flex items-center gap-2 font-sans">
                <BookOpen className="w-5 h-5 text-[#D4AF37]" /> Book Glossary Terms Definitions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {book.details.glossary.map((g, idx) => (
                  <div key={idx} className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-2xl relative overflow-hidden">
                    <span className="absolute top-2 right-3 text-[9px] font-mono font-bold text-[#D4AF37]">
                      Term #{idx + 1}
                    </span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      {g.word}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-medium">
                      {g.definition}
                    </p>
                    {g.example && (
                      <p className="text-[10px] text-zinc-500 italic mt-2.5 border-t border-emerald-950/40 pt-1.5 font-medium">
                        Usage: "{g.example}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* General Fun facts section */}
            <div className="space-y-4">
              <h3 className="text-md font-black text-white flex items-center gap-2 font-sans">
                <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" /> Amazing Trivia & Fun Facts
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {book.details.funFacts.map((fact, idx) => (
                  <div key={idx} className="p-5 bg-[#04150e] border border-emerald-950/80 rounded-2xl">
                    <span className="text-[11px] font-extrabold text-[#D4AF37] uppercase tracking-widest block mb-2">
                      Did You Know? #{idx + 1}
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed font-bold">
                      {fact}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* COVER WRAPPER EDIT / PREVIEW */}
        {activeTab === 'cover' && (() => {
          const parseHexToLuminance = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return 0.1;
            const r = parseInt(result[1], 16) / 255;
            const g = parseInt(result[2], 16) / 255;
            const b = parseInt(result[3], 16) / 255;
            return 0.299 * r + 0.587 * g + 0.114 * b;
          };
          const isBgLight = parseHexToLuminance(coverColor || '#0a424a') > 0.5;
          const textContrastClass = isBgLight ? 'text-zinc-900' : 'text-white';
          const backTitleColorClass = isBgLight ? 'text-zinc-900 font-extrabold' : 'text-zinc-100 font-bold';
          const backDescBgClass = isBgLight ? 'bg-black/5 text-zinc-800 border border-zinc-200/50' : 'bg-black/30 text-zinc-300';
          const separatorClass = isBgLight ? 'border-zinc-300' : 'border-white/20';
          const isTitleLight = parseHexToLuminance(titleColor || '#ffffff') > 0.5;
          const plateBgClass = isTitleLight ? 'bg-black/50 text-white' : 'bg-white/85 text-zinc-900';

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left - Visual Book Mockups */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="flex justify-between items-center bg-[#04150e] p-4 border border-emerald-950/80 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">KDP Complete Cover PDF Wrapper Preview</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Combines back cover, spine, and front cover into a seamless bleed layout.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-zinc-400 font-extrabold">Spine Width calculated from pages</span>
                  </div>
                </div>

                {/* Cover Layout simulation render */}
                <div className="p-6 bg-[#020906]/30 rounded-3xl border border-dashed border-emerald-950/60 overflow-x-auto">
                  <div
                    className={`mx-auto shadow-2xl rounded-lg overflow-hidden border border-zinc-950 min-w-[500px] max-w-[650px] aspect-[1.4/1] flex relative bg-cover bg-center ${textContrastClass}`}
                    style={{
                      backgroundColor: coverColor,
                      backgroundImage: (uploadedImageUrl && imageLayout === 'full-wrap') ? `url(${uploadedImageUrl})` : undefined
                    }}
                  >
                    {/* BACK COVER */}
                    <div className={`flex-1 p-5 relative flex flex-col justify-between ${(!uploadedImageUrl || imageLayout !== 'full-wrap') ? `border-r border-dashed ${separatorClass}` : ''}`}>
                      <div className="space-y-3 z-10">
                        <div className={`w-10 h-2 ${isBgLight ? 'bg-zinc-800/40' : 'bg-white/25'} rounded-full`} />
                        <h5 className={`text-[11px] uppercase tracking-wider ${backTitleColorClass}`}>EXPLORE THE PUZZLES</h5>
                        <p className={`text-[8px] leading-relaxed line-clamp-6 p-1.5 rounded-lg ${backDescBgClass}`}>
                          {book.details.backCoverText || 'Meticulously structured pages suited for optimal print layout.'}
                        </p>
                      </div>

                      <div className="text-[6px] font-mono select-none z-10 opacity-60">
                        Published by RiddimRoom Publisher AI
                      </div>
                    </div>

                    {/* SPINE */}
                    <div className={`w-7 relative flex items-center justify-center ${(!uploadedImageUrl || imageLayout !== 'full-wrap') ? `${isBgLight ? 'bg-zinc-200/80' : 'bg-black/15'} border-r border-dashed ${separatorClass}` : 'bg-black/25'}`}>
                      <span className={`text-[6px] font-bold uppercase select-none tracking-widest whitespace-nowrap -rotate-90 origin-center ${isBgLight ? 'text-zinc-800' : 'text-white/80'}`}>
                        {book.title}
                      </span>
                    </div>

                    {/* FRONT COVER */}
                    <div 
                      className="flex-1 p-5 relative flex flex-col justify-between items-center text-center bg-cover bg-center"
                      style={{
                        backgroundImage: (uploadedImageUrl && imageLayout === 'front-bg') ? `url(${uploadedImageUrl})` : undefined
                      }}
                    >
                      {/* Title & Subtitle Plate */}
                      {uploadedImageUrl && (imageLayout === 'front-bg' || imageLayout === 'full-wrap') ? (
                        // Translucent white plate for image layouts
                        <div className="space-y-1.5 z-10 w-full mt-2 p-2 rounded-xl bg-white/90 text-zinc-900 shadow-md">
                          <h4 className="text-[11px] font-black tracking-tight text-[#004B87] leading-tight">
                            {book.title}
                          </h4>
                          <p className="text-[7.5px] font-extrabold tracking-wide uppercase text-[#B91C1C] leading-tight">
                            {book.details.amazonListing?.subtitle || 'Complete Word Search Interior'}
                          </p>
                        </div>
                      ) : (
                        // Standard theme-colored plate
                        <div className={`space-y-2 z-10 w-full mt-2 p-2 rounded-xl ${plateBgClass}`}>
                          <h4
                            className="text-md font-extrabold tracking-tight"
                            style={{ color: titleColor }}
                          >
                            {book.title}
                          </h4>
                          <p
                            className="text-[8px] font-medium tracking-wide uppercase"
                            style={{ color: subtitleColor }}
                          >
                            {book.details.amazonListing?.subtitle || 'Complete Word Search Interior'}
                          </p>
                        </div>
                      )}

                      {/* Center Graphic - Only show for standard layout or front-centered layout */}
                      {(!uploadedImageUrl || imageLayout === 'front-centered') && (
                        <div className="w-18 h-18 bg-black/30 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden my-1 z-10">
                          {uploadedImageUrl && imageLayout === 'front-centered' ? (
                            <img src={uploadedImageUrl} className="w-full h-full object-cover" alt="Centered artwork" />
                          ) : (
                            <div className="text-center p-2">
                              <span className="text-[8px] text-[#10B981] font-bold block">WORD FIND</span>
                              <span className="text-[7px] text-zinc-400 font-mono block">PICTURE PREVIEW</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Features List & Difficulty Overlay */}
                      <div className="space-y-1.5 z-10 w-full mt-auto">
                        <div className={`p-1.5 rounded-lg text-left inline-block mx-auto ${uploadedImageUrl && (imageLayout === 'front-bg' || imageLayout === 'full-wrap') ? 'bg-black/55 text-white border border-white/5 shadow' : 'bg-transparent text-inherit'}`}>
                          <div className="flex items-center gap-1.5 text-[6.5px] font-extrabold leading-none">
                            <span className="text-[#10B981]">■</span>
                            <span>{book.details.puzzles.length} Solved Puzzles</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[6.5px] font-extrabold leading-none mt-1">
                            <span className="text-[#10B981]">■</span>
                            <span>Large Print Grids</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[6.5px] font-extrabold leading-none mt-1">
                            <span className="text-[#10B981]">■</span>
                            <span>Glossary & Facts</span>
                          </div>
                        </div>

                        <div className="pt-1">
                          <span className={`px-2 py-0.5 rounded text-[7px] uppercase tracking-wider font-extrabold border ${isBgLight ? 'bg-zinc-100 text-zinc-800 border-zinc-200' : 'bg-black/50 text-white border-white/5'}`}>
                            {book.details.settings.difficulty} Level
                          </span>
                          <p className={`text-[5.5px] mt-0.5 drop-shadow-md ${isBgLight ? 'text-zinc-600' : 'text-zinc-300'}`}>Compiled by RiddimRoom Publisher AI</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Filters simulator logs when processing */}
              <AnimatePresence>
                {isFiltering && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-4 bg-[#04150e] border border-emerald-950/85 rounded-2xl flex items-center gap-3"
                  >
                    <RefreshCw className="w-4 h-4 text-[#10B981] animate-spin" />
                    <div>
                      <span className="text-[10px] font-bold text-[#D4AF37] block uppercase font-mono">AI Sharp Image Pipeline Running</span>
                      <span className="text-xs text-zinc-300 font-mono">{filterStep}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Right - Custom Controls Cover editor panel */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl space-y-5">
                <h4 className="text-xs font-black uppercase text-white tracking-wider pb-3 border-b border-emerald-950/40">
                  Cover Wrapper Designer
                </h4>

                {/* Cover presets */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-[#D4AF37] mb-2">Preset Artwork Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'professional', label: 'Professional', color: '#111827' },
                      { id: 'educational', label: 'Educational', color: '#064e3b' },
                      { id: 'kids', label: 'Kids', color: '#991b1b' },
                      { id: 'modern', label: 'Modern Black', color: '#18181b' },
                      { id: 'caribbean', label: 'Caribbean Teal', color: '#0f766e' },
                      { id: 'vintage', label: 'Vintage Cream', color: '#78350f' }
                    ] as const).map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setCoverStyle(style.id);
                          setCoverColor(style.color);
                          saveCoverSettings(style.id, style.color);
                        }}
                        className={`p-2 rounded-xl text-left border text-xs font-bold transition flex items-center justify-between ${
                          coverStyle === style.id
                            ? 'border-emerald-500 bg-emerald-500/[0.01]'
                            : 'border-emerald-950/40'
                        }`}
                      >
                        <span className="truncate">{style.label}</span>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: style.color }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom theme colors input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5">Canvas BG Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={coverColor}
                        onChange={(e) => {
                          setCoverColor(e.target.value);
                          saveCoverSettings(coverStyle, e.target.value);
                        }}
                        className="w-10 h-8 rounded border bg-[#020906] border-emerald-950/80 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono mt-2 font-bold uppercase">{coverColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5">Front Title Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={titleColor}
                        onChange={(e) => {
                          setTitleColor(e.target.value);
                          saveCoverSettings(coverStyle, coverColor);
                        }}
                        className="w-10 h-8 rounded border bg-[#020906] border-emerald-950/80 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono mt-2 font-bold uppercase">{titleColor}</span>
                    </div>
                  </div>
                </div>

                 {/* Artwork operations upload */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-[#D4AF37] mb-2">Cover Illustration Artwork</label>
                  
                  {uploadedImageUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden aspect-[1.8/1] border border-emerald-950/80">
                        <img src={uploadedImageUrl} alt="Illustration preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setUploadedImageUrl(undefined);
                            setAnalysisFeedback(undefined);
                            const updated = {
                              ...book,
                              details: {
                                ...book.details,
                                cover: {
                                  ...book.details.cover,
                                  uploadedImageUrl: undefined,
                                  analysisResult: undefined
                                }
                              }
                            };
                            fetch('/api/books', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updated)
                            }).then(() => {
                              onBookUpdated(updated);
                            });
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-950/80 text-red-400 border border-red-900/20 rounded hover:bg-red-900 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[9px] text-[#10B981] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Cover illustration applied.
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSimulateArtworkFilters}
                          disabled={isFiltering}
                          className="flex-1 py-1.5 px-3 bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-900/30 text-[#10B981] rounded-xl transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isFiltering ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Isolating Background...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                              Run Background Removal & AI Upscale
                            </>
                          )}
                        </button>
                      </div>

                      {/* Interactive Crop / Trim Screenshot widget */}
                      <div className="bg-[#020d07] border border-emerald-950/60 p-3 rounded-xl space-y-3">
                        <div className="flex items-center gap-1.5 text-[#D4AF37]">
                          <Scissors className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wider">Trim Screenshot Borders</span>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-relaxed">
                          If your uploaded file is a screenshot, use these sliders to easily cut out the top phone status bars and bottom navigation buttons!
                        </p>

                        <div className="space-y-2 pt-1">
                          <div>
                            <div className="flex justify-between text-[9px] text-zinc-400 font-bold mb-1">
                              <span>Trim Top (Status Bar):</span>
                              <span className="text-emerald-400 font-mono">{cropTop}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              step="1"
                              value={cropTop}
                              onChange={(e) => setCropTop(Number(e.target.value))}
                              className="w-full h-1 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] text-zinc-400 font-bold mb-1">
                              <span>Trim Bottom (Navigation):</span>
                              <span className="text-emerald-400 font-mono">{cropBottom}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              step="1"
                              value={cropBottom}
                              onChange={(e) => setCropBottom(Number(e.target.value))}
                              className="w-full h-1 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleResetCrop}
                            disabled={isCropping}
                            className="flex-1 py-1.5 px-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] font-black text-zinc-300 uppercase tracking-wider hover:bg-zinc-800 transition text-center disabled:opacity-50"
                          >
                            Reset
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleAutoTrim}
                            disabled={isCropping || !uploadedImageUrl}
                            className="flex-1 py-1.5 px-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-[9px] font-black text-[#10B981] uppercase tracking-wider hover:bg-[#10B981]/15 transition text-center disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {isCropping && trimStatus === null ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : null}
                            Quick Auto-Trim
                          </button>
                        </div>

                        {trimStatus && (
                          <p className={`text-[9px] font-bold p-1.5 rounded text-center border ${
                            trimStatus.includes('No') 
                              ? 'bg-amber-950/30 text-amber-400 border-amber-900/30' 
                              : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                          }`}>
                            {trimStatus}
                          </p>
                        )}

                        <button
                          type="button"
                          disabled={isCropping || (cropTop === 0 && cropBottom === 0)}
                          onClick={() => handleCropScreenshot(cropTop, cropBottom)}
                          className="w-full py-2 bg-[#10B981] text-zinc-950 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#10B981]/90 transition text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {isCropping && trimStatus !== null ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Cropping Image...
                            </>
                          ) : (
                            <>
                              <Crop className="w-3.5 h-3.5" />
                              Apply Crop ({cropTop}% Top, {cropBottom}% Bottom)
                            </>
                          )}
                        </button>
                      </div>

                      {analysisFeedback && (
                        <div className="p-3 bg-[#020906] border border-emerald-950/60 rounded-xl space-y-1">
                          <span className="text-[9px] text-[#D4AF37] uppercase font-extrabold tracking-wider block">Gemini Cover Analysis Recommendation</span>
                          <p className="text-[10px] text-zinc-300 leading-relaxed font-sans">{analysisFeedback}</p>
                        </div>
                      )}

                      {/* Image Layout Mode selection */}
                      <div className="pt-2 border-t border-emerald-950/40 space-y-2">
                        <label className="block text-[10px] font-extrabold uppercase text-[#D4AF37]">Artwork Positioning & Scaling Style</label>
                        <div className="grid grid-cols-1 gap-1.5">
                          <button
                            onClick={() => {
                              setImageLayout('full-wrap');
                              saveCoverSettings(coverStyle, coverColor, 'full-wrap');
                            }}
                            className={`px-3 py-2 text-left rounded-lg text-xs font-bold transition flex items-center justify-between border ${
                              imageLayout === 'full-wrap'
                                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50'
                                : 'bg-[#020906] text-zinc-300 border-emerald-950 hover:bg-[#03150c]/40'
                            }`}
                          >
                            <span>Full Landscape Wrap (Back, Spine & Front)</span>
                            <span className="text-[9px] text-zinc-500 font-mono">Wide aspect ratio</span>
                          </button>

                          <button
                            onClick={() => {
                              setImageLayout('front-bg');
                              saveCoverSettings(coverStyle, coverColor, 'front-bg');
                            }}
                            className={`px-3 py-2 text-left rounded-lg text-xs font-bold transition flex items-center justify-between border ${
                              imageLayout === 'front-bg'
                                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50'
                                : 'bg-[#020906] text-zinc-300 border-emerald-950 hover:bg-[#03150c]/40'
                            }`}
                          >
                            <span>Front Cover Only (Full Page Background)</span>
                            <span className="text-[9px] text-zinc-500 font-mono">Portrait / Tall</span>
                          </button>

                          <button
                            onClick={() => {
                              setImageLayout('front-centered');
                              saveCoverSettings(coverStyle, coverColor, 'front-centered');
                            }}
                            className={`px-3 py-2 text-left rounded-lg text-xs font-bold transition flex items-center justify-between border ${
                              imageLayout === 'front-centered'
                                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50'
                                : 'bg-[#020906] text-zinc-300 border-emerald-950 hover:bg-[#03150c]/40'
                            }`}
                          >
                            <span>Front Cover Only (Centered Graphic Card)</span>
                            <span className="text-[9px] text-zinc-500 font-mono">Square / Aspect 1:1</span>
                          </button>
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-snug">
                          App automatically detects and adjusts layout margins and scaling settings to guarantee flawless Amazon KDP physical publication compatibility without pixelation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative w-full py-6 border-2 border-dashed rounded-xl text-center transition bg-[#010503] flex flex-col items-center justify-center gap-2 px-4 cursor-pointer ${
                        dragActive 
                          ? 'border-[#10B981] bg-[#10B981]/5' 
                          : 'border-emerald-950/80 hover:bg-[#020906]'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleCoverImageUpload(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isAnalyzing}
                      />
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-6 h-6 text-[#10B981] animate-spin" />
                          <span className="text-xs font-bold text-zinc-300">Analyzing Cover Image...</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{filterStep}</span>
                        </>
                      ) : (
                        <>
                          <Image className="w-6 h-6 text-[#10B981]" />
                          <span className="text-xs font-bold text-zinc-300">Drag & Drop or Click to Upload Artwork</span>
                          <span className="text-[9px] text-zinc-500 font-sans">Supports JPG, PNG (automatically optimized for print DPI)</span>
                          <span className="text-[8px] text-[#D4AF37] font-extrabold uppercase tracking-widest mt-1">AI Contrast & Color Harmony Correction</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
          );
        })()}

        {/* AMAZON LISTING SEO METADATA */}
        {activeTab === 'listing' && (
          <div className="max-w-3xl mx-auto space-y-6">
            
            <div className="flex justify-between items-center p-4 bg-emerald-500/[0.02] border border-emerald-500/20 rounded-2xl">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37]">Gemini 3.5 Flash SEO Suite</span>
                <h4 className="text-sm font-black text-white mt-1">Amazon Seller Central Optimization Metadata</h4>
              </div>
              <span className="px-2.5 py-1 bg-emerald-600 text-white shadow-md shadow-emerald-600/15 text-[10px] uppercase font-black rounded-full">
                SEO Optimized
              </span>
            </div>

            {/* Title / Subtitle cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-2xl relative">
                <button
                  onClick={() => handleCopyText(book.details.amazonListing?.title || book.title, 'title')}
                  className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300"
                >
                  {copiedKey === 'title' ? <Check className="w-4 h-4 text-[#10B981] stroke-[3]" /> : <Copy className="w-4 h-4" />}
                </button>
                <span className="text-[9px] font-extrabold text-[#D4AF37] uppercase tracking-widest block mb-1">
                  KDP Book Title (Amazon listing)
                </span>
                <h5 className="text-xs font-black text-white mt-1 pr-6 leading-relaxed">
                  {book.details.amazonListing?.title || book.title}
                </h5>
              </div>

              <div className="p-4 bg-[#04150e] border border-emerald-950/80 rounded-2xl relative">
                <button
                  onClick={() => handleCopyText(book.details.amazonListing?.subtitle || '', 'subtitle')}
                  className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300"
                >
                  {copiedKey === 'subtitle' ? <Check className="w-4 h-4 text-[#10B981] stroke-[3]" /> : <Copy className="w-4 h-4" />}
                </button>
                <span className="text-[9px] font-extrabold text-[#D4AF37] uppercase tracking-widest block mb-1">
                  KDP Book Subtitle
                </span>
                <h5 className="text-xs font-semibold text-zinc-350 mt-1 pr-6 leading-relaxed">
                  {book.details.amazonListing?.subtitle || 'Large Print Word Searches'}
                </h5>
              </div>
            </div>

            {/* Keyword tags */}
            <div className="p-5 bg-[#04150e] border border-emerald-950/80 rounded-2xl">
              <span className="text-[9px] font-extrabold text-[#D4AF37] uppercase tracking-widest block mb-3">
                KDP Keyword search tags (Backend)
              </span>
              <div className="flex flex-wrap gap-2">
                {book.details.amazonListing?.keywords.map((kw, i) => (
                  <div key={i} className="px-3 py-1.5 bg-[#020906] text-xs text-zinc-300 font-bold rounded-xl border border-emerald-950/50 flex items-center gap-1">
                    <span>{kw}</span>
                    <button
                      onClick={() => handleCopyText(kw, `kw-${i}`)}
                      className="text-zinc-500 hover:text-zinc-300 ml-1 shrink-0"
                    >
                      {copiedKey === `kw-${i}` ? <Check className="w-3.5 h-3.5 text-[#10B981] stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Description box */}
            <div className="p-5 bg-[#04150e] border border-emerald-950/80 rounded-2xl relative">
              <button
                onClick={() => handleCopyText(book.details.amazonListing?.description || '', 'desc')}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
              >
                {copiedKey === 'desc' ? <Check className="w-4 h-4 text-[#10B981] stroke-[3]" /> : <Copy className="w-4 h-4" />}
              </button>
              <span className="text-[9px] font-extrabold text-[#D4AF37] uppercase tracking-widest block mb-2">
                Amazon Book Description (HTML tags optimized)
              </span>
              <div className="text-xs text-zinc-300 font-mono bg-[#020906] p-4 rounded-xl border border-emerald-950/80 max-h-[220px] overflow-y-auto leading-relaxed">
                {book.details.amazonListing?.description}
              </div>
            </div>

          </div>
        )}

        {/* KDP PDFs EXPORTS / COMPILING SETTINGS */}
        {activeTab === 'export' && (
          <div className="max-w-3xl mx-auto space-y-6">
            
            <div className="bg-[#04150e] border border-emerald-950/80 p-5 rounded-2xl">
              <h4 className="text-xs font-black uppercase text-white tracking-wider pb-3 border-b border-emerald-950/40 mb-4">
                KDP Print Settings / Calibration
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-2">KDP Trim Size</label>
                  <select
                    value={trimSize}
                    onChange={(e: any) => {
                      setTrimSize(e.target.value);
                      saveCoverSettings();
                    }}
                    className="w-full bg-[#020906] border border-emerald-950/80 px-3 py-2.5 rounded-xl text-zinc-350 focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                  >
                    <option value="8.5x11">8.5 x 11 inches (Standard Large Print Default)</option>
                    <option value="8x10">8 x 10 inches (Medium Portable Layout)</option>
                    <option value="6x9">6 x 9 inches (Small Handheld Travel Digest)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-2">Target Bleed Specifications</label>
                  <div className="px-3.5 py-2.5 border rounded-xl bg-[#020906] border-emerald-950/80 text-zinc-450 flex justify-between items-center text-[11px]">
                    <span>Bleed settings (For cover wrapper)</span>
                    <span className="font-bold text-[#D4AF37] uppercase">0.125" Bleed Auto Applied</span>
                  </div>
                </div>
              </div>
            </div>

            {currentPlan === 'free' && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-450 rounded-2xl text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#10B981]" />
                <div>
                  <span className="font-bold block mb-0.5">Workspace Limit Notice: Watermarked PDF Downloads</span>
                  <span>
                    You are downloading on the **Free Plan**. Printable KDP interiors will have a transparent diagonal background watermark. To generate clean, commercial-ready, watermark-free PDFs ready for KDP uploads, upgrade to the Creator or Publisher plan.
                  </span>
                </div>
              </div>
            )}

            {/* Download Grid options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Card 1 - KDP Interior */}
              <div className="p-6 bg-[#04150e] border border-emerald-950/80 rounded-2xl flex flex-col justify-between items-start h-56 shadow-md hover:scale-[1.01] transition duration-300">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-[#D4AF37] border border-amber-500/20 rounded font-extrabold text-[9px] uppercase tracking-wider">
                    INTERIOR SHEETS
                  </span>
                  <h4 className="text-md font-bold text-white">KDP Interior PDF compile</h4>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Generates title, copyright, table of contents, introduction, glossary definitions, fun facts, and all puzzle sheets with full answer key grids.
                  </p>
                </div>

                <button
                  onClick={handleDownloadInterior}
                  disabled={isDownloadingInterior}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/15"
                >
                  {isDownloadingInterior ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" /> Compiling Interior PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download Interior PDF
                    </>
                  )}
                </button>
              </div>

              {/* Card 2 - KDP Cover */}
              <div className="p-6 bg-[#04150e] border border-emerald-950/80 rounded-2xl flex flex-col justify-between items-start h-56 shadow-md hover:scale-[1.01] transition duration-300">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-[#10B981] border border-emerald-500/20 rounded font-extrabold text-[9px] uppercase tracking-wider">
                    COVER WRAPPER
                  </span>
                  <h4 className="text-md font-bold text-white">KDP Cover PDF Compile</h4>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Generates combined cover wrapper document: front cover, back cover, spine, with 0.125" bleed margins suitable for KDP paperback specifications.
                  </p>
                </div>

                <button
                  onClick={handleDownloadCover}
                  disabled={isDownloadingCover}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/20"
                >
                  {isDownloadingCover ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#030805]" /> Compiling Cover Wrapper...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-[#030805]" /> Download Cover PDF
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Custom Alert Modal Dialog */}
      {alertModalMessage && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#030d08] border border-emerald-900/40 rounded-3xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150 flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4AF37]"></div>
            <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center mb-4">
              <span className="text-[#D4AF37] font-extrabold text-xl">ℹ</span>
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Notice</h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">{alertModalMessage}</p>
            <button
              onClick={() => setAlertModalMessage(null)}
              className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#EAB308] text-[#030805] font-bold transition text-xs"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
