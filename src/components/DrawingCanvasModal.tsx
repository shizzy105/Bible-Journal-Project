import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, RotateCw, Trash2, Eraser, Edit3, Palette } from 'lucide-react';
import { DrawingBlock } from '../types/journal';

interface DrawingCanvasModalProps {
  onClose: () => void;
  onSaveDrawing: (drawingBlock: DrawingBlock) => void;
  initialDataUrl?: string;
}

const PEN_COLORS = [
  '#dc2626', // Crimson Red
  '#2563eb', // Royal Blue
  '#059669', // Forest Green
  '#d97706', // Warm Amber
  '#1e293b', // Slate Charcoal
  '#ffffff', // White
];

export const DrawingCanvasModal: React.FC<DrawingCanvasModalProps> = ({
  onClose,
  onSaveDrawing,
  initialDataUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [color, setColor] = useState<string>('#dc2626');
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high quality resolution
    canvas.width = 600;
    canvas.height = 400;

    // Draw clean light background for paper feel
    ctx.fillStyle = '#fef3c7'; // Cream light yellow paper
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveState();
      };
      img.src = initialDataUrl;
    } else {
      saveState();
    }
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#fef3c7' : color;
    ctx.lineWidth = isEraser ? lineWidth * 3 : lineWidth;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[prevStep], 0, 0);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[nextStep], 0, 0);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const drawingBlock: DrawingBlock = {
      id: `draw-${Date.now()}`,
      type: 'drawing',
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      createdAt: new Date().toISOString(),
    };

    onSaveDrawing(drawingBlock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-white">Prayer Sketch & Drawing</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Board Container */}
        <div className="p-3 bg-stone-950 flex justify-center items-center">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full max-w-[560px] h-[300px] sm:h-[350px] rounded-2xl shadow-inner cursor-crosshair touch-none border border-amber-200/20"
          />
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 flex flex-col gap-3">
          {/* Colors & Pen Size */}
          <div className="flex items-center justify-between gap-3">
            {/* Color Palette */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setIsEraser(false);
                  }}
                  className={`w-7 h-7 rounded-full transition-transform border ${
                    !isEraser && color === c ? 'scale-125 border-white ring-2 ring-red-500' : 'border-stone-700'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`p-1.5 rounded-full border transition-all ${
                  isEraser ? 'bg-red-600 text-white border-white scale-110' : 'bg-stone-800 text-stone-400 border-stone-700'
                }`}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            {/* Thickness Slider */}
            <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0">
              <span>Size:</span>
              <input
                type="range"
                min="2"
                max="16"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-20 accent-red-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyStep <= 0}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-stone-800 text-stone-300 text-xs flex items-center gap-1 font-medium transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-stone-800 text-stone-300 text-xs flex items-center gap-1 font-medium transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">Redo</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1 font-medium transition-colors"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Save Sketch</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
