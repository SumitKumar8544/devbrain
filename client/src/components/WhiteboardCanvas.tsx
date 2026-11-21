import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  Eraser,
  RotateCcw,
  Trash2,
  Download,
  Check,
  X,
  Palette
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface WhiteboardCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDrawing?: (file: File) => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  isOpen,
  onClose,
  onSaveDrawing,
}) => {
  const { success, warning } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#38bdf8'); // cyan default
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState<ImageData[]>([]);

  const colors = [
    { label: 'Cyan', value: '#38bdf8' },
    { label: 'Emerald', value: '#34d399' },
    { label: 'Amber', value: '#fbbf24' },
    { label: 'Rose', value: '#fb7185' },
    { label: 'Purple', value: '#c084fc' },
    { label: 'White', value: '#ffffff' },
  ];

  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill with dark blackboard background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save initial state
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#090d16' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
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

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setHistory((prev) => [...prev.slice(-15), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleUndo = () => {
    if (history.length <= 1) {
      warning('Nothing left to undo!');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const previousState = newHistory[newHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `devbrain-diagram-${Date.now()}.png`;
    a.click();
    success('Diagram downloaded successfully!');
  };

  const handleAttachToNote = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `handwritten-diagram-${Date.now()}.png`, { type: 'image/png' });
      if (onSaveDrawing) {
        onSaveDrawing(file);
        success('Diagram attached to note successfully!');
      } else {
        handleDownload();
      }
      onClose();
    }, 'image/png');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 leading-tight">Handwritten Canvas & Sketchpad</h3>
              <p className="text-[11px] text-slate-400">Sketch algorithm trees, system diagrams, or math logic</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 px-2.5"
              title="Download PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PNG</span>
            </button>

            {onSaveDrawing && (
              <button
                onClick={handleAttachToNote}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/30"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Attach to Note</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tools Sub-bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/80 bg-slate-900/90 text-xs">
          {/* Tool switch */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                tool === 'pen' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                tool === 'eraser' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Color Palettes (visible when pen is active) */}
          {tool === 'pen' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Color:
              </span>
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    color === c.value ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          )}

          {/* Line Width */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Size:</span>
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setLineWidth(w)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                  lineWidth === w
                    ? 'bg-slate-700 border-cyan-400 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {w === 2 ? 'Thin' : w === 4 ? 'Med' : 'Thick'}
              </button>
            ))}
          </div>

          {/* Undo / Clear Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs flex items-center gap-1"
              title="Clear entire canvas"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-3 overflow-hidden select-none touch-none">
          <canvas
            ref={canvasRef}
            width={1200}
            height={700}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-auto max-h-[65vh] object-contain rounded-xl border border-slate-800/80 shadow-inner cursor-crosshair bg-[#090d16]"
          />
        </div>
      </div>
    </div>
  );
};
