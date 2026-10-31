import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  ArrowUpRight,
  Square,
  Circle,
  Highlighter,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Check,
  X,
  Palette,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { AnnotationItem } from '@/models/incident';

export interface ImageAnnotationEditorProps {
  initialImage: string; // Base64 or object URL of original image
  onSave: (annotatedImageUrl: string, originalImageUrl: string, annotations: AnnotationItem[]) => void;
  onCancel: () => void;
  title?: string;
}

type ToolType = 'pen' | 'arrow' | 'rect' | 'circle' | 'highlighter' | 'text';

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Amber/Yellow
  '#10b981', // Green
  '#0284c7', // Sky Blue
  '#8b5cf6', // Violet
  '#ffffff', // White
  '#000000', // Black
];

export const ImageAnnotationEditor: React.FC<ImageAnnotationEditorProps> = ({
  initialImage,
  onSave,
  onCancel,
  title = 'Anotar Evidencia / Captura',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('arrow');
  const [strokeColor, setStrokeColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);

  const [history, setHistory] = useState<AnnotationItem[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<AnnotationItem | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; text: string }>({
    x: 0,
    y: 0,
    visible: false,
    text: '',
  });

  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<number>(1);

  // Load initial image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = initialImage;
    img.onload = () => {
      // Calculate responsive dimensions
      const maxW = 1200;
      const maxH = 800;
      let w = img.width;
      let h = img.height;

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      setImageSize({ width: w, height: h });
      setImgElement(img);
    };
  }, [initialImage]);

  const currentAnnotations = history[historyIndex] || [];

  // Redraw canvas whenever annotations, current dynamic drawing or image changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    const drawSingleAnnotation = (item: AnnotationItem) => {
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = item.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.type === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = item.strokeWidth * 3;
      }

      switch (item.type) {
        case 'pen':
        case 'highlighter':
          if (item.points && item.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(item.points[0].x, item.points[0].y);
            for (let i = 1; i < item.points.length; i++) {
              ctx.lineTo(item.points[i].x, item.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'arrow':
          if (
            item.startX !== undefined &&
            item.startY !== undefined &&
            item.endX !== undefined &&
            item.endY !== undefined
          ) {
            const headLength = Math.max(15, item.strokeWidth * 3.5);
            const dx = item.endX - item.startX;
            const dy = item.endY - item.startY;
            const angle = Math.atan2(dy, dx);

            // Shaft
            ctx.beginPath();
            ctx.moveTo(item.startX, item.startY);
            ctx.lineTo(item.endX, item.endY);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(item.endX, item.endY);
            ctx.lineTo(
              item.endX - headLength * Math.cos(angle - Math.PI / 6),
              item.endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              item.endX - headLength * Math.cos(angle + Math.PI / 6),
              item.endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;

        case 'rect':
          if (
            item.startX !== undefined &&
            item.startY !== undefined &&
            item.endX !== undefined &&
            item.endY !== undefined
          ) {
            const w = item.endX - item.startX;
            const h = item.endY - item.startY;
            ctx.strokeRect(item.startX, item.startY, w, h);
          }
          break;

        case 'circle':
          if (
            item.startX !== undefined &&
            item.startY !== undefined &&
            item.endX !== undefined &&
            item.endY !== undefined
          ) {
            const radiusX = Math.abs(item.endX - item.startX) / 2;
            const radiusY = Math.abs(item.endY - item.startY) / 2;
            const centerX = Math.min(item.startX, item.endX) + radiusX;
            const centerY = Math.min(item.startY, item.endY) + radiusY;

            ctx.beginPath();
            ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'text':
          if (item.startX !== undefined && item.startY !== undefined && item.text) {
            const fontSize = item.fontSize || 18;
            ctx.font = `bold ${fontSize}px sans-serif`;
            // Background box for high legibility
            const metrics = ctx.measureText(item.text);
            const textWidth = metrics.width;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(item.startX - 6, item.startY - fontSize, textWidth + 12, fontSize + 8);

            ctx.fillStyle = item.color;
            ctx.fillText(item.text, item.startX, item.startY);
          }
          break;
      }
      ctx.restore();
    };

    // Draw committed annotations
    currentAnnotations.forEach(drawSingleAnnotation);

    // Draw active drawing shape
    if (currentAnnotation) {
      drawSingleAnnotation(currentAnnotation);
    }
  }, [currentAnnotations, currentAnnotation, imgElement]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer coordinate calculation relative to actual canvas resolution
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'text') {
      setTextInput({
        x,
        y,
        visible: true,
        text: '',
      });
      return;
    }

    setIsDrawing(true);

    const newAnnotation: AnnotationItem = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: activeTool,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      points: activeTool === 'pen' || activeTool === 'highlighter' ? [{ x, y }] : undefined,
      color: strokeColor,
      strokeWidth,
    };

    setCurrentAnnotation(newAnnotation);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    const { x, y } = getCanvasCoords(e);

    if (currentAnnotation.type === 'pen' || currentAnnotation.type === 'highlighter') {
      const updatedPoints = [...(currentAnnotation.points || []), { x, y }];
      setCurrentAnnotation({
        ...currentAnnotation,
        points: updatedPoints,
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        endX: x,
        endY: y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    setIsDrawing(false);

    // Commit annotation to history stack
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...currentAnnotations, currentAnnotation]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentAnnotation(null);
  };

  const handleAddText = () => {
    if (!textInput.text.trim()) {
      setTextInput({ ...textInput, visible: false });
      return;
    }

    const textAnn: AnnotationItem = {
      id: `ann-text-${Date.now()}`,
      type: 'text',
      startX: textInput.x,
      startY: textInput.y,
      color: strokeColor,
      strokeWidth,
      text: textInput.text.trim(),
      fontSize: Math.max(16, strokeWidth * 4.5),
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...currentAnnotations, textAnn]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setTextInput({ x: 0, y: 0, visible: false, text: '' });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleClear = () => {
    if (currentAnnotations.length === 0) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const annotatedDataUrl = canvas.toDataURL('image/png', 0.95);
    onSave(annotatedDataUrl, initialImage, currentAnnotations);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-between p-2 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Top Header & Action Bar */}
      <header className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xl text-white">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-brand-500/20 text-brand-400 rounded-lg">
            <Highlighter className="w-4 h-4" />
          </span>
          <h2 className="font-semibold text-sm sm:text-base truncate">{title}</h2>
          <span className="text-xs text-slate-400 hidden sm:inline-block">
            ({currentAnnotations.length} anotaciones)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Descartar</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow transition"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Anotaciones</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Workspace */}
      <main
        ref={containerRef}
        className="relative flex-1 w-full max-w-5xl my-2 flex items-center justify-center overflow-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800/80 shadow-inner"
      >
        <div className="relative inline-block touch-none shadow-2xl rounded-lg overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            width={imageSize.width}
            height={imageSize.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-crosshair block max-h-[72vh] max-w-full object-contain"
            style={{
              touchAction: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          />

          {/* Floating Text Input Box */}
          {textInput.visible && (
            <div
              className="absolute z-30 p-2 bg-slate-900 border border-brand-500 rounded-lg shadow-2xl flex items-center gap-2"
              style={{
                left: `${Math.min(textInput.x, imageSize.width - 240)}px`,
                top: `${Math.min(textInput.y, imageSize.height - 60)}px`,
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Escribe texto explicativo..."
                value={textInput.text}
                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddText();
                  if (e.key === 'Escape') setTextInput({ ...textInput, visible: false });
                }}
                className="bg-slate-800 text-white text-xs sm:text-sm px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                onClick={handleAddText}
                className="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextInput({ ...textInput, visible: false })}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Toolbar (Optimized for Mobile & Desktop) */}
      <footer className="w-full max-w-5xl bg-slate-900/95 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xl text-white">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTool('arrow')}
            title="Flecha direccional"
            className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
              activeTool === 'arrow' ? 'bg-brand-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span className="hidden md:inline">Flecha</span>
          </button>

          <button
            onClick={() => setActiveTool('pen')}
            title="Trazado a mano alzada"
            className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
              activeTool === 'pen' ? 'bg-brand-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Pen className="w-4 h-4" />
            <span className="hidden md:inline">Lápiz</span>
          </button>

          <button
            onClick={() => setActiveTool('rect')}
            title="Rectángulo de enfoque"
            className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
              activeTool === 'rect' ? 'bg-brand-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Square className="w-4 h-4" />
            <span className="hidden md:inline">Rectángulo</span>
          </button>

          <button
            onClick={() => setActiveTool('circle')}
            title="Círculo de atención"
            className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
              activeTool === 'circle' ? 'bg-brand-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Circle className="w-4 h-4" />
            <span className="hidden md:inline">Círculo</span>
          </button>

          <button
            onClick={() => setActiveTool('highlighter')}
            title="Resaltador traslúcido"
            className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
              activeTool === 'highlighter' ? 'bg-brand-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden md:inline">Resaltar</span>
          </button>

          <button
            onClick={() => setActiveTool('text')}
            title="Texto explicativo"
            className={`p-2 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
              activeTool === 'text' ? 'bg-brand-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="hidden md:inline">Texto</span>
          </button>
        </div>

        {/* Colors Palette & Stroke Width */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition transform ${
                  strokeColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                }`}
                title={color}
              />
            ))}
          </div>

          {/* Stroke Width Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  strokeWidth === w ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {w === 2 ? 'Fino' : w === 4 ? 'Medio' : 'Grueso'}
              </button>
            ))}
          </div>
        </div>

        {/* Undo / Redo / Clear / Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Deshacer (Ctrl+Z)"
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded-lg transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Rehacer (Ctrl+Y)"
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded-lg transition"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={currentAnnotations.length === 0}
            title="Limpiar todas las anotaciones"
            className="p-2 bg-slate-800 hover:bg-rose-900/60 disabled:opacity-40 text-slate-200 hover:text-rose-300 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
