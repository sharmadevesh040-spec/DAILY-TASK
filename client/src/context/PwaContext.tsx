import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  isIos: boolean;
  showPrompt: boolean;
  promptInstall: () => Promise<void>;
  dismissPrompt: () => void;
  openInstallPrompt: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://') ||
    localStorage.getItem('pwa_installed') === 'true'
  );
}

function checkIsIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalone());
  const [isIos] = useState<boolean>(() => checkIsIos());
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // If already installed, never show prompt and don't listen
    if (checkIsStandalone()) {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    // 1. Listen for standard beforeinstallprompt (Chromium browsers: Chrome, Edge, Brave, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      const dismissed = sessionStorage.getItem('pwa_install_dismissed');
      if (!checkIsStandalone() && dismissed !== 'true') {
        setShowPrompt(true);
      }
    };

    // 2. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. iOS handling: beforeinstallprompt is not supported on iOS Safari
    if (checkIsIos() && !checkIsStandalone()) {
      setIsInstallable(true);
      const dismissed = sessionStorage.getItem('pwa_install_dismissed');
      if (dismissed !== 'true') {
        // Show after a gentle 1.5s delay on iOS so initial render is smooth
        const timer = setTimeout(() => {
          if (!checkIsStandalone()) {
            setShowPrompt(true);
          }
        }, 1500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setShowPrompt(false);
          setDeferredPrompt(null);
          localStorage.setItem('pwa_installed', 'true');
        } else {
          setShowPrompt(false);
          sessionStorage.setItem('pwa_install_dismissed', 'true');
        }
      } catch (err) {
        console.error('Error invoking install prompt:', err);
      }
    } else if (isIos) {
      // Ensure popup is visible so the iOS user can see the Share -> Add to Home Screen guide
      setShowPrompt(true);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_install_dismissed', 'true');
  };

  const openInstallPrompt = () => {
    if (!isInstalled) {
      setShowPrompt(true);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isIos,
        showPrompt,
        promptInstall,
        dismissPrompt,
        openInstallPrompt,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
}
