/**
 * Alarm Sound & Phone Notification Service
 * Uses Web Audio API for offline, zero-dependency, high-fidelity synthesizer alarms,
 * and the Navigator Vibration API for phone haptics.
 */

class AlarmService {
  private audioCtx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private currentStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private loopInterval: ReturnType<typeof setInterval> | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Unlock AudioContext on mobile (iOS/Android require a user gesture)
   */
  public unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Phone Vibration Haptics
   */
  public vibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Some browsers or webviews restrict vibration without user gesture
      }
    }
  }

  /**
   * Stop any currently sounding alarm
   */
  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.currentStopTimeout) {
      clearTimeout(this.currentStopTimeout);
      this.currentStopTimeout = null;
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.vibrate(0); // Stop vibration
  }

  /**
   * Play an energetic Task Start chime/fanfare
   * Ascending arpeggio (C5 -> E5 -> G5 -> C6) repeated twice
   */
  public playTaskStartSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopAlarm();
    this.isAlarmPlaying = true;
    this.vibrate([300, 150, 300, 150, 500]);

    const playNotes = (startTime: number) => {
      // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + index * 0.12);

        gain.gain.setValueAtTime(0, startTime + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.35, startTime + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + index * 0.12 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + index * 0.12);
        osc.stop(startTime + index * 0.12 + 0.3);
      });
    };

    const now = ctx.currentTime;
    playNotes(now);
    playNotes(now + 0.6);

    this.currentStopTimeout = setTimeout(() => {
      this.isAlarmPlaying = false;
    }, 1500);
  }

  /**
   * Play an urgent Task Deadline Alarm
   * Repeating double-beep alarm pulses (880Hz / 660Hz)
   */
  public playDeadlineAlarm(loop = true) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopAlarm();
    this.isAlarmPlaying = true;
    this.vibrate([500, 200, 500, 200, 500]);

    const playBeepPair = () => {
      if (!this.isAlarmPlaying) return;
      const now = ctx.currentTime;

      // Beep 1 (High tone 880Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Beep 2 (Slightly higher 988Hz - B5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.22);
      gain2.gain.setValueAtTime(0, now + 0.22);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.24);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.44);

      this.vibrate([300, 100, 300]);
    };

    playBeepPair();

    if (loop) {
      let count = 0;
      this.loopInterval = setInterval(() => {
        count++;
        if (count >= 12) {
          // Auto-silence after ~18 seconds
          this.stopAlarm();
          return;
        }
        playBeepPair();
      }, 1500);
    }
  }

  /**
   * Request system notification with alarm tag
   */
  public async showSystemAlarmNotification(title: string, body: string, tag = 'task-alarm') {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag,
          requireInteraction: true,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        // Fallback for browsers that don't support new Notification in window scope
      }
    }
  }
}

export const alarmService = new AlarmService();
