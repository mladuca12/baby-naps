import { Service, signal } from '@angular/core';

const SCHEDULE_SETTINGS_STORAGE_KEY = 'baby-naps.scheduleSettings';

export const MIN_NAPS = 1;
export const MAX_NAPS = 6;
export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 480;

export interface NapSettings {
  // Wake window leading up to this nap.
  awakeBeforeMinutes: number;
  durationMinutes: number;
}

export interface ScheduleConfig {
  naps: NapSettings[];
  // Wake window after the last nap, before the bedtime routine starts.
  awakeBeforeBedMinutes: number;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  naps: [
    { awakeBeforeMinutes: 75, durationMinutes: 90 },
    { awakeBeforeMinutes: 105, durationMinutes: 120 },
    { awakeBeforeMinutes: 120, durationMinutes: 45 },
  ],
  awakeBeforeBedMinutes: 135,
};

export function isValidDurationMinutes(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_DURATION_MINUTES &&
    value <= MAX_DURATION_MINUTES
  );
}

function isValidNap(value: unknown): value is NapSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const nap = value as Partial<NapSettings>;
  return (
    isValidDurationMinutes(nap.awakeBeforeMinutes) && isValidDurationMinutes(nap.durationMinutes)
  );
}

function isValidConfig(value: unknown): value is ScheduleConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { naps, awakeBeforeBedMinutes } = value as Partial<ScheduleConfig>;
  return (
    Array.isArray(naps) &&
    naps.length >= MIN_NAPS &&
    naps.length <= MAX_NAPS &&
    naps.every(isValidNap) &&
    isValidDurationMinutes(awakeBeforeBedMinutes)
  );
}

function readStoredConfig(): ScheduleConfig {
  const stored = localStorage.getItem(SCHEDULE_SETTINGS_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_SCHEDULE_CONFIG;
  }
  try {
    const parsed = JSON.parse(stored);
    return isValidConfig(parsed) ? parsed : DEFAULT_SCHEDULE_CONFIG;
  } catch {
    return DEFAULT_SCHEDULE_CONFIG;
  }
}

// User-configurable shape of the day (number of naps, nap lengths and wake
// windows), shared by the schedule and settings pages. Invalid updates are
// ignored so the stored config is always usable.
@Service()
export class ScheduleSettings {
  private readonly state = signal(readStoredConfig());
  readonly config = this.state.asReadonly();

  setNapCount(count: number): void {
    const { naps } = this.state();
    if (!Number.isInteger(count) || count < MIN_NAPS || count > MAX_NAPS) {
      return;
    }
    // New naps start as a copy of the current last nap.
    const lastNap = naps[naps.length - 1];
    const nextNaps =
      count <= naps.length
        ? naps.slice(0, count)
        : [...naps, ...Array.from({ length: count - naps.length }, () => ({ ...lastNap }))];
    this.save({ ...this.state(), naps: nextNaps });
  }

  updateNap(index: number, changes: Partial<NapSettings>): void {
    const { naps } = this.state();
    const nap = naps[index];
    const updated = { ...nap, ...changes };
    if (!nap || !isValidNap(updated)) {
      return;
    }
    this.save({
      ...this.state(),
      naps: naps.map((current, i) => (i === index ? updated : current)),
    });
  }

  setAwakeBeforeBed(minutes: number): void {
    if (!isValidDurationMinutes(minutes)) {
      return;
    }
    this.save({ ...this.state(), awakeBeforeBedMinutes: minutes });
  }

  restoreDefaults(): void {
    localStorage.removeItem(SCHEDULE_SETTINGS_STORAGE_KEY);
    this.state.set(DEFAULT_SCHEDULE_CONFIG);
  }

  private save(config: ScheduleConfig): void {
    this.state.set(config);
    localStorage.setItem(SCHEDULE_SETTINGS_STORAGE_KEY, JSON.stringify(config));
  }
}
