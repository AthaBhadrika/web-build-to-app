'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, Loader2, Globe, AlertCircle, CheckCircle2,
  History, Layers, Cpu, Code, Copy, Check, Moon, Sun,
  Smartphone, Zap, Shield, ArrowRight, X
} from 'lucide-react';

interface HistoryItem {
  id: string;
  appName: string;
  websiteUrl: string;
  date: number;
  status: string;
  androidUrl?: string | null;
  iosUrl?: string | null;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function useTypewriter(texts: string[], speed = 55, pause = 2200) {
  const [display, setDisplay] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    let timeout: NodeJS.Timeout;
    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx(c => c + 1), speed);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), speed / 2);
    } else {
      setDeleting(false);
      setIdx(i => (i + 1) % texts.length);
    }
    setDisplay(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, idx, texts, speed, pause]);

  return display;
}

export default function Home() {
  const [appName, setAppName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<any>(null);
  const [isDone, setIsDone] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastBuildTime, setLastBuildTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  const typewriterText = useTypewriter([
    'Android & iOS apps',
    'native mobile bundles',
    'zero-code packages',
    'seamless app wrappers',
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('web2native_history');
    if (saved) { try { setHistory(JSON.parse(saved)); } catch {} }
    const lastTime = localStorage.getItem('web2native_last_build');
    if (lastTime) setLastBuildTime(Number(lastTime));
    const savedDark = localStorage.getItem('web2native_dark');
    if (savedDark === 'true') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (!lastBuildTime) return;
    const check = () => {
      const diff = Date.now() - lastBuildTime;
      const oneDay = 86400000;
      if (diff < oneDay) {
        const rem = oneDay - diff;
        const h = Math.floor(rem / 3600000);
        const m = Math.floor((rem % 3600000) / 60000);
        const s = Math.floor((rem % 60000) / 1000);
        setTimeRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else {
        setTimeRemaining(null);
      }
    };
    check();
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [lastBuildTime]);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem('web2native_history', JSON.stringify(items));
  };

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    setHistory(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem('web2native_history', JSON.stringify(next));
      return next;
    });
  };

  const clearHistory = () => {
    showToast('History dihapus', 'info');
    saveHistory([]);
  };

  const copyRequestId = () => {
    if (!requestId) return;
    navigator.clipboard.writeText(requestId);
    setCopied(true);
    showToast('Request ID tersalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!appName || !websiteUrl) {
      showToast('App Name dan URL wajib diisi!', 'error');
      setError('App Name and Website URL are required.');
      return;
    }
    if (lastBuildTime && Date.now() - lastBuildTime < 86400000) {
      const rem = 86400000 - (Date.now() - lastBuildTime);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      const fmt = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      showToast(`Rate limit aktif. Tunggu ${fmt} lagi.`, 'error');
      setError(`Rate limit aktif — tunggu ${fmt} lagi.`);
      return;
    }
    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'https://' + formattedUrl;
    setIsLoading(true);
    setError(null);
    setBuildStatus(null);
    setIsDone(false);
    setRequestId(null);
    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, websiteUrl: formattedUrl }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Build failed.');
      const newId = result.data.requestId;
      setRequestId(newId);
      const now = Date.now();
      setLastBuildTime(now);
      localStorage.setItem('web2native_last_build', now.toString());
      saveHistory([{ id: newId, appName, websiteUrl: formattedUrl, date: now, status: 'PROCESSING' }, ...history]);
      showToast('Build dimulai! Sedang kompilasi...', 'success');
    } catch (err: any) {
      showToast(err.message || 'System error.', 'error');
      setError(err.message || 'System error occurred.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkStatus = async () => {
      if (!requestId) return;
      try {
        const res = await fetch(`/api/status?requestId=${requestId}`);
        const result = await res.json();
        if (res.ok && result.success) {
          const data = result.data;
          setBuildStatus(data);
          if (data.isDone) {
            setIsDone(true);
            setIsLoading(false);
            clearInterval(interval);
            updateHistoryItem(requestId, { status: 'DONE', androidUrl: data.android_url, iosUrl: data.ios_url });
            showToast('Build selesai! Siap download 🎉', 'success');
          }
        }
      } catch {}
    };
    if (requestId && !isDone) {
      checkStatus();
      interval = setInterval(checkStatus, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [requestId, isDone]);

  const rainDrops = useMemo(() =>
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: `${(i * 1.82).toFixed(1)}%`,
      size: `${(i % 3) + 2}px`,
      duration: `${((i % 28) / 10 + 2.5).toFixed(1)}s`,
      delay: `-${((i * 0.11) % 6).toFixed(1)}s`,
    })), []
  );

  const dm = darkMode;

  return (
    <div className={`min-h-screen font-sans flex flex-col items-center relative overflow-hidden transition-colors duration-500 ${dm ? 'bg-[#060f09] text-white' : 'bg-[#f0fdf4] text-[#064e3b]'}`}>

      {/* Ambient glow */}
      <div className={`fixed top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none z-0 transition-opacity duration-500 ${dm ? 'bg-green-900/30 opacity-100' : 'bg-green-200/60 opacity-100'}`} />

      {/* Rain drops */}
      {rainDrops.map((drop) => (
        <span key={drop.id} className="rain-drop" style={{ left: drop.left, width: drop.size, height: drop.size, animationDuration: drop.duration, animationDelay: drop.delay }} />
      ))}

      {/* Toast */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2.5 pointer-events-auto border ${
                t.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400/50' :
                t.type === 'error' ? 'bg-red-500/95 text-white border-red-400/50' :
                'bg-white/95 text-emerald-800 border-emerald-200'
              }`}>
              {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : t.type === 'error' ? <X className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── HEADER ── */}
      <header className="w-full max-w-2xl mx-auto flex justify-between items-center px-6 py-5 relative z-10">
        <button className="flex items-center gap-3 group" onClick={() => setShowHistory(false)}>
          <div className="relative w-9 h-9 flex items-center justify-center">
            <span className="absolute inset-0 rounded-xl bg-emerald-500/20 animate-ping" />
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center relative z-10 border ${dm ? 'bg-emerald-900/60 border-emerald-700/40' : 'bg-emerald-100 border-emerald-200'}`}>
              <Smartphone className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="text-left">
            <div className="font-black text-base tracking-tight leading-none">ScrapeNative</div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500">Pro Builder</div>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setDarkMode(d => { const n = !d; localStorage.setItem('web2native_dark', String(n)); return n; })}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${dm ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/70 border-emerald-100 hover:bg-white'}`}>
            {dm ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border relative ${dm ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/70 border-emerald-100 hover:bg-white'}`}>
            <History className="w-4 h-4 text-emerald-600" />
            {history.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{history.length}</span>}
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 pb-16 relative z-10">
        <AnimatePresence mode="wait">

          {/* ── HISTORY VIEW ── */}
          {showHistory ? (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Recent Builds</h2>
                  <p className={`text-xs mt-0.5 ${dm ? 'text-white/40' : 'text-emerald-700/50'}`}>{history.length} build tersimpan</p>
                </div>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs font-bold text-red-500 hover:text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all">Hapus Semua</button>
                )}
              </div>

              {history.length === 0 ? (
                <div className={`rounded-2xl p-12 text-center flex flex-col items-center border ${dm ? 'bg-white/3 border-white/8' : 'bg-white/60 border-emerald-100'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dm ? 'bg-white/5' : 'bg-emerald-50'}`}>
                    <History className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="font-bold text-sm opacity-40">Belum ada build tersimpan</p>
                  <p className="text-xs opacity-25 mt-1">Build pertama kamu akan muncul di sini</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl p-5 border transition-all ${dm ? 'bg-white/4 border-white/8 hover:bg-white/6' : 'bg-white/80 border-emerald-100 hover:border-emerald-200 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-base leading-tight truncate">{item.appName}</h3>
                          <p className={`text-xs mt-1 flex items-center gap-1 truncate ${dm ? 'text-white/35' : 'text-emerald-700/40'}`}>
                            <Globe className="w-3 h-3 shrink-0" />{item.websiteUrl}
                          </p>
                        </div>
                        <span className={`ml-3 text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider shrink-0 ${item.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {item.status === 'DONE' ? (
                          <>
                            {item.androidUrl && <a href={item.androidUrl} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"><Download className="w-3.5 h-3.5" /> Android</a>}
                            {item.iosUrl && <a href={item.iosUrl} target="_blank" rel="noreferrer" className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${dm ? 'border-white/15 hover:bg-white/8' : 'border-emerald-200 bg-white hover:bg-emerald-50'}`}><Download className="w-3.5 h-3.5" /> iOS</a>}
                          </>
                        ) : (
                          <div className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border ${dm ? 'border-white/10 text-white/30' : 'border-emerald-100 text-emerald-700/40'}`}>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sedang dikompilasi...
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

          ) : (

            /* ── BUILDER VIEW ── */
            <motion.div key="builder" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-8 pt-4">

              {/* Hero */}
              <div className="text-center px-2">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full border mb-5 ${dm ? 'border-emerald-700/40 bg-emerald-900/30 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
                    <Zap className="w-3 h-3" /> Web to Native App Builder
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-4">
                    Build your{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                      {typewriterText}<span className="opacity-60">|</span>
                    </span>
                  </h1>
                  <p className={`text-sm font-medium max-w-md mx-auto leading-relaxed ${dm ? 'text-white/40' : 'text-emerald-800/50'}`}>
                    Wrap website kamu menjadi aplikasi Android & iOS native dalam hitungan menit. Tanpa coding, tanpa ribet.
                  </p>
                </motion.div>
              </div>

              {/* Stats strip */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className={`flex items-center justify-center gap-6 py-3.5 px-5 rounded-2xl border text-center ${dm ? 'bg-white/3 border-white/8' : 'bg-white/70 border-emerald-100 shadow-sm'}`}>
                {[
                  { icon: <Smartphone className="w-3.5 h-3.5" />, val: 'Android + iOS', label: 'Platform' },
                  { icon: <Zap className="w-3.5 h-3.5" />, val: '~2 Menit', label: 'Build Time' },
                  { icon: <Shield className="w-3.5 h-3.5" />, val: 'Zero Code', label: 'Required' },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                    <div className={`flex items-center gap-1 text-emerald-500 mb-0.5`}>{s.icon}</div>
                    <div className="text-xs font-black">{s.val}</div>
                    <div className={`text-[9px] font-semibold uppercase tracking-wider ${dm ? 'text-white/30' : 'text-emerald-700/40'}`}>{s.label}</div>
                  </div>
                ))}
              </motion.div>

              {/* ── FORM CARD ── */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`rounded-3xl overflow-hidden border backdrop-blur-xl ${dm ? 'bg-white/4 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)]' : 'bg-white/75 border-emerald-100 shadow-[0_20px_60px_rgba(5,150,105,0.1)]'}`}
              >
                {/* Card header bar */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${dm ? 'border-white/8 bg-white/3' : 'border-emerald-100/80 bg-emerald-50/50'}`}>
                  <span className={`text-xs font-bold uppercase tracking-widest ${dm ? 'text-white/40' : 'text-emerald-600/60'}`}>App Configuration</span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  {/* App Name */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${dm ? 'text-white/40' : 'text-emerald-700/50'}`}>
                      <Code className="w-3 h-3" /> App Name
                    </label>
                    <input type="text" placeholder="My Awesome App"
                      value={appName} onChange={(e) => setAppName(e.target.value)}
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                      className={`w-full rounded-2xl px-5 py-4 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all disabled:opacity-40 placeholder:opacity-30 border ${dm ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-emerald-100 text-emerald-900 shadow-inner'}`}
                    />
                  </div>

                  {/* Website URL */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${dm ? 'text-white/40' : 'text-emerald-700/50'}`}>
                      <Globe className="w-3 h-3" /> Website URL
                    </label>
                    <div className="relative">
                      <Globe className={`absolute left-5 top-[50%] -translate-y-1/2 w-4 h-4 ${dm ? 'text-white/25' : 'text-emerald-400/50'}`} />
                      <input type="text" placeholder="example.com"
                        value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                        disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                        className={`w-full rounded-2xl pl-12 pr-5 py-4 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all disabled:opacity-40 placeholder:opacity-30 border ${dm ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-emerald-100 text-emerald-900 shadow-inner'}`}
                      />
                    </div>
                  </div>

                  {/* Errors */}
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2.5 text-red-600 bg-red-50 border border-red-100 p-4 rounded-2xl text-xs font-semibold leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p>
                      </motion.div>
                    )}
                    {timeRemaining && !error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-xs font-bold text-center">
                        <AlertCircle className="w-5 h-5" />
                        <p>Rate limit 1 build/hari. Coba lagi dalam <span className="font-mono text-sm bg-amber-100 px-2 py-0.5 rounded-lg">{timeRemaining}</span></p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Build button */}
                  {!requestId && !isDone && (
                    <button onClick={handleSubmit} disabled={isLoading || !!timeRemaining}
                      className="relative w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-[0_8px_32px_rgba(16,185,129,0.4)] text-[15px] overflow-hidden group mt-1">
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      {timeRemaining
                        ? <><AlertCircle className="w-5 h-5" /> Rate Limit Aktif</>
                        : isLoading
                          ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses Build...</>
                          : <><Zap className="w-5 h-5" /> Build Native App <ArrowRight className="w-4 h-4 ml-1" /></>
                      }
                    </button>
                  )}

                  {/* Build status panel */}
                  <AnimatePresence>
                    {(requestId || isLoading || isDone) && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-3 overflow-hidden">
                        {/* Status bar */}
                        <div className={`flex items-center justify-between p-5 rounded-2xl border ${dm ? 'bg-emerald-900/40 border-emerald-700/30' : 'bg-emerald-500 border-emerald-400'}`}>
                          <div>
                            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mb-1">Build Status</p>
                            <p className="text-[15px] font-black text-white flex items-center gap-2">
                              {isDone
                                ? <><CheckCircle2 className="w-5 h-5 text-emerald-200" /> Selesai & Siap Download</>
                                : <><Loader2 className="w-5 h-5 animate-spin text-emerald-200" /> Kompilasi Berjalan...</>
                              }
                            </p>
                          </div>
                          {requestId && (
                            <button onClick={copyRequestId} className="flex items-center gap-1.5 text-[11px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all border border-white/20">
                              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied ? 'Copied!' : 'Copy ID'}
                            </button>
                          )}
                        </div>

                        {/* Platform status */}
                        {buildStatus && (
                          <div className={`rounded-2xl border overflow-hidden ${dm ? 'bg-white/4 border-white/8' : 'bg-emerald-50/60 border-emerald-100'}`}>
                            {[
                              { label: 'Android', status: buildStatus.android_status },
                              { label: 'iOS', status: buildStatus.ios_status },
                            ].map((p, i) => (
                              <div key={i}>
                                {i > 0 && <div className={`h-px ${dm ? 'bg-white/6' : 'bg-emerald-100'}`} />}
                                <div className="flex justify-between items-center px-5 py-3.5">
                                  <span className={`text-xs font-bold ${dm ? 'text-white/50' : 'text-emerald-700/60'}`}>{p.label} Generation</span>
                                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${p.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'text-amber-500 bg-amber-50 animate-pulse'}`}>{p.status || 'WAITING'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Download buttons */}
                        {isDone && buildStatus && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2.5 pt-1">
                            {buildStatus.android_url && (
                              <a href={buildStatus.android_url} target="_blank" rel="noreferrer"
                                className="relative w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[15px] shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition-all overflow-hidden group">
                                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                <Download className="w-5 h-5" /> Download Android APK
                              </a>
                            )}
                            {buildStatus.ios_url && (
                              <a href={buildStatus.ios_url} target="_blank" rel="noreferrer"
                                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[15px] transition-all border-2 ${dm ? 'border-white/15 text-white hover:bg-white/8' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                                <Download className="w-5 h-5" /> Download iOS IPA
                              </a>
                            )}
                            <button onClick={() => { setIsDone(false); setBuildStatus(null); setRequestId(null); setAppName(''); setWebsiteUrl(''); }}
                              className={`py-2.5 text-xs font-bold uppercase tracking-widest text-center w-full rounded-2xl transition-all ${dm ? 'text-white/25 hover:text-white/50 hover:bg-white/5' : 'text-emerald-600/40 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                              + Build Baru
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* ── HOW IT WORKS ── */}
              <div>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${dm ? 'text-white/30' : 'text-emerald-700/40'}`}>Cara Kerja</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: <Code className="w-5 h-5 text-emerald-500" />, num: '01', title: 'Input Detail App', desc: 'Masukkan nama app dan URL website yang ingin kamu wrap. Pastikan website mobile-friendly.' },
                    { icon: <Layers className="w-5 h-5 text-emerald-500" />, num: '02', title: 'Native Wrapping', desc: 'Sistem membuat konfigurasi native Android & iOS dengan modul WebToNative otomatis.' },
                    { icon: <Cpu className="w-5 h-5 text-emerald-500" />, num: '03', title: 'Cloud Compilation', desc: 'Server cloud sign, compile, dan siapkan APK & IPA siap install dalam ~2 menit.' },
                  ].map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                      className={`flex gap-4 p-5 rounded-2xl border transition-all ${dm ? 'bg-white/3 border-white/8 hover:bg-white/5' : 'bg-white/70 border-emerald-100 hover:border-emerald-200 shadow-sm'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${dm ? 'bg-emerald-900/40 border-emerald-700/30' : 'bg-emerald-50 border-emerald-100'}`}>
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black tracking-widest ${dm ? 'text-emerald-500/60' : 'text-emerald-400'}`}>{step.num}</span>
                          <h4 className="text-[13px] font-black">{step.title}</h4>
                        </div>
                        <p className={`text-xs leading-relaxed ${dm ? 'text-white/35' : 'text-emerald-800/45'}`}>{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── TECH PILLS ── */}
              <div className={`rounded-2xl border p-5 ${dm ? 'bg-white/3 border-white/8' : 'bg-white/70 border-emerald-100 shadow-sm'}`}>
                <div className="flex flex-wrap gap-2 justify-center mb-5">
                  {['TypeScript', 'Next.js 15', 'Tailwind CSS', 'Motion'].map((t, i) => (
                    <span key={i} className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${dm ? 'bg-white/6 border-white/12 text-white/60' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>{t}</span>
                  ))}
                </div>
                <div className={`h-px mb-5 ${dm ? 'bg-white/8' : 'bg-emerald-100'}`} />
                {/* Dev credit */}
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${dm ? 'text-white/20' : 'text-emerald-700/30'}`}>Crafted by</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-black tracking-tight bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                      THA404_DEV
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
