import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flame, Coffee, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const FocusTimer: React.FC = () => {
  const { success, info } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [sprintsCount, setSprintsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('devbrain_sprints_today');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play a gentle notification sound when sprint completes
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();

            if (mode === 'focus') {
              const newCount = sprintsCount + 1;
              setSprintsCount(newCount);
              localStorage.setItem('devbrain_sprints_today', newCount.toString());
              success('🎉 25-minute deep focus sprint complete! Take a well-deserved 5m breather.', 'Sprint Logged');
              setMode('break');
              return 5 * 60;
            } else {
              info('☕ Break finished! Ready to dive into the next revision concept?', 'Break Ended');
              setMode('focus');
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, sprintsCount, success, info]);

  const toggleRun = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="relative">
      {/* Navbar trigger pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          isRunning
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20 animate-pulse'
            : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
        }`}
        title="Deep Focus Revision Timer"
      >
        <Flame className={`w-3.5 h-3.5 ${isRunning ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
        <span className="font-mono font-bold tracking-tight">{formattedTime}</span>
        {sprintsCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-900 border border-amber-500/30 text-[10px] text-amber-400 font-bold">
            {sprintsCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-72 p-4 rounded-2xl bg-slate-900/98 border border-slate-700/90 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Exam Sprint Timer</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => switchMode('focus')}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'focus'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Deep Work (25m)</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('break')}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'break'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coffee className="w-3 h-3" />
              <span>Breather (5m)</span>
            </button>
          </div>

          {/* Large Time Display */}
          <div className="text-center py-2 mb-3">
            <div className="text-4xl font-extrabold font-mono tracking-tight text-white mb-1">
              {formattedTime}
            </div>
            <p className="text-[11px] text-slate-400">
              {mode === 'focus' ? 'Keep your phone away & lock in on core logic' : 'Hydrate, stretch, and let concepts consolidate'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRun}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                isRunning
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Sprint</span>
                </>
              )}
            </button>

            <button
              onClick={resetTimer}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sprints footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sprints completed today:</span>
            <span className="font-bold text-amber-400">🔥 {sprintsCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};
