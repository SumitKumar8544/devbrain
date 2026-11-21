import React from 'react';
import { X, Download, ExternalLink, FileText, Maximize2 } from 'lucide-react';

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  pdfName: string;
  pdfSize?: number;
}

export const PDFModal: React.FC<PDFModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  pdfName,
  pdfSize,
}) => {
  if (!isOpen || !pdfUrl) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90 flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate" title={pdfName}>
                {pdfName}
              </h4>
              {pdfSize && <span className="text-[10px] text-slate-400 font-mono">{formatSize(pdfSize)}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={pdfUrl}
              download={pdfName}
              className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer */}
        <div className="flex-1 w-full bg-slate-950 overflow-hidden relative">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            title={pdfName}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
