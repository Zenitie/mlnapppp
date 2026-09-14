import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <Smartphone size={16} />
        Zainstaluj Aplikację
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
        >
          <Smartphone size={14} />
          Zainstaluj na iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-neutral-900 p-6 shadow-2xl border border-neutral-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Instalacja na iOS</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-neutral-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
                1. Stuknij ikonę <strong>Udostępnij (Share)</strong> na pasku narzędzi Safari.<br /><br />
                2. Przewiń w dół i stuknij opcję <strong>Do ekranu początkowego (Add to Home Screen)</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-neutral-800 py-3 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                Zamknij instrukcję
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
