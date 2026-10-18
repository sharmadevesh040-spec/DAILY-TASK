import { useState } from 'react';
import { usePwa } from '../context/PwaContext';
import {
  Download,
  X,
  Share,
  PlusSquare,
  Sparkles,
  Zap,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';

export default function InstallPromptModal() {
  const { isInstalled, isInstallable, isIos, showPrompt, promptInstall, dismissPrompt } = usePwa();
  const [isInstalling, setIsInstalling] = useState(false);

  // Requirement: Do not show popup if app is already installed
  if (isInstalled || !showPrompt || !isInstallable) {
    return null;
  }

  async function handleInstall() {
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header with accent bar & close button ───────────────────────── */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 px-5 pt-5 pb-6 text-white">
          <button
            onClick={dismissPrompt}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white/90 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md p-1.5 flex items-center justify-center shrink-0">
              <img
                src="/icons/icon-192x192.png"
                alt="Daily Task Manager"
                className="w-full h-full rounded-xl object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0 pr-6">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white mb-1">
                <Sparkles className="w-3 h-3" /> Progressive Web App
              </span>
              <h2 id="install-modal-title" className="text-lg font-bold text-white leading-tight truncate">
                Install Daily Task Manager
              </h2>
              <p className="text-xs text-primary-100 mt-0.5 truncate">
                Fast, offline-ready & standalone
              </p>
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="p-5 space-y-4">
          {/* iOS Safari Instructions */}
          {isIos ? (
            <div className="space-y-3">
              <div className="p-3 bg-primary-50/70 border border-primary-100 rounded-xl text-xs text-gray-700 leading-relaxed">
                <p className="font-semibold text-primary-900 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-primary-600" />
                  Install on your iPhone or iPad:
                </p>
                To install this web app on iOS Safari, follow these 3 quick steps:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    Tap the <strong className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded font-medium text-gray-900 mx-1"><Share className="w-3 h-3 text-primary-600 inline" /> Share</strong> button in Safari toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    Scroll down and select <strong className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded font-medium text-gray-900 mx-1"><PlusSquare className="w-3 h-3 text-primary-600 inline" /> Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    Tap <strong className="font-semibold text-gray-900">Add</strong> in the top-right corner to place Daily Tasks on your home screen.
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={dismissPrompt}
                  className="btn-primary w-full py-2.5 text-sm"
                >
                  Got it
                </button>
              </div>
            </div>
          ) : (
            /* Standard beforeinstallprompt for Android / Desktop */
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Install Daily Task Manager on your device for a lightning-fast native app experience with zero app store downloads.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-700">
                  <Zap className="w-4 h-4 text-primary-600 shrink-0" />
                  <span>Instant load times</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Works offline</span>
                </div>
              </div>

              {/* Action Buttons: Install & Not now */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={dismissPrompt}
                  className="btn-secondary flex-1 text-sm font-medium py-2.5"
                >
                  Not now
                </button>

                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="btn-primary flex-1 text-sm font-medium py-2.5 shadow-sm"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{isInstalling ? 'Installing...' : 'Install'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
