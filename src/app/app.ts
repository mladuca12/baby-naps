import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const RISE_TIME_STORAGE_KEY = 'baby-naps.riseTime';
const ACTIVE_INDEX_STORAGE_KEY = 'baby-naps.activeIndex';

function readStoredRiseTime(): string {
  const stored = localStorage.getItem(RISE_TIME_STORAGE_KEY);
  return stored && /^\d{2}:\d{2}$/.test(stored) ? stored : '07:00';
}

function readStoredActiveIndex(): number {
  const stored = Number(localStorage.getItem(ACTIVE_INDEX_STORAGE_KEY));
  if (!Number.isInteger(stored) || stored < 0) {
    return 0;
  }
  return Math.min(stored, SCHEDULE_TEMPLATE.length - 1);
}

type SegmentKind = 'event' | 'nap' | 'awake';

interface ScheduleTemplateItem {
  id: string;
  kind: SegmentKind;
  label: string;
  icon: string;
  durationMinutes: number;
  // Overrides durationMinutes for display only, e.g. a wake window whose
  // final minutes are shown separately as a "Get ready for bed" card.
  labelDurationMinutes?: number;
}

interface ScheduleSegment extends ScheduleTemplateItem {
  startMinutes: number;
  endMinutes: number;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  displayLabel: string;
}

// Fixed "4 nap day" template: wake windows and nap lengths stay constant,
// only the clock times shift based on the morning rise time.
const SCHEDULE_TEMPLATE: ScheduleTemplateItem[] = [
  { id: 'rise', kind: 'event', label: 'Morning rise', icon: '☀️', durationMinutes: 0 },
  { id: 'awake1', kind: 'awake', label: 'Awake', icon: '', durationMinutes: 75 },
  { id: 'nap1', kind: 'nap', label: 'Nap 1', icon: '💤', durationMinutes: 75 },
  { id: 'awake2', kind: 'awake', label: 'Awake', icon: '', durationMinutes: 90 },
  { id: 'nap2', kind: 'nap', label: 'Nap 2', icon: '💤', durationMinutes: 90 },
  { id: 'awake3', kind: 'awake', label: 'Awake', icon: '', durationMinutes: 105 },
  { id: 'nap3', kind: 'nap', label: 'Nap 3', icon: '💤', durationMinutes: 75 },
  { id: 'awake4', kind: 'awake', label: 'Awake', icon: '', durationMinutes: 105 },
  { id: 'nap4', kind: 'nap', label: 'Nap 4', icon: '💤', durationMinutes: 30 },
  { id: 'awake5', kind: 'awake', label: 'Awake', icon: '', durationMinutes: 90, labelDurationMinutes: 120 },
  { id: 'bedtime', kind: 'event', label: 'Get ready for bed', icon: '🌙', durationMinutes: 30 },
  { id: 'asleep', kind: 'event', label: 'Asleep', icon: '🛏️', durationMinutes: 0 },
];

function formatTime(totalMinutesRaw: number): string {
  const minutesInDay = 24 * 60;
  const totalMinutes = ((totalMinutesRaw % minutesInDay) + minutesInDay) % minutesInDay;
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours === 1 ? '1hr' : `${hours}hrs`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  return parts.length > 0 ? parts.join(' ') : '0m';
}

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly riseTime = signal(readStoredRiseTime());
  protected readonly activeIndex = signal(readStoredActiveIndex());

  constructor() {
    effect(() => localStorage.setItem(RISE_TIME_STORAGE_KEY, this.riseTime()));
    effect(() => localStorage.setItem(ACTIVE_INDEX_STORAGE_KEY, String(this.activeIndex())));
  }

  protected readonly segments = computed<ScheduleSegment[]>(() => {
    const [hours, minutes] = this.riseTime().split(':').map(Number);
    let cursor = (hours || 0) * 60 + (minutes || 0);

    return SCHEDULE_TEMPLATE.map((item) => {
      const startMinutes = cursor;
      const endMinutes = startMinutes + item.durationMinutes;
      cursor = endMinutes;

      const durationLabel = formatDuration(item.labelDurationMinutes ?? item.durationMinutes);
      return {
        ...item,
        startMinutes,
        endMinutes,
        startLabel: formatTime(startMinutes),
        endLabel: formatTime(endMinutes),
        durationLabel,
        displayLabel: item.kind === 'awake' ? `Awake ${durationLabel}` : item.label,
      };
    });
  });

  protected readonly currentSegment = computed(() => this.segments()[this.activeIndex()]);
  protected readonly nextSegment = computed(() => this.segments()[this.activeIndex() + 1] ?? null);
  protected readonly isFirst = computed(() => this.activeIndex() === 0);
  protected readonly isLast = computed(() => this.activeIndex() === this.segments().length - 1);

  protected onRiseTimeChange(value: string): void {
    this.riseTime.set(value);
  }

  protected next(): void {
    this.activeIndex.update((i) => Math.min(i + 1, this.segments().length - 1));
  }

  protected previous(): void {
    this.activeIndex.update((i) => Math.max(i - 1, 0));
  }

  protected reset(): void {
    this.activeIndex.set(0);
  }

  protected jumpTo(index: number): void {
    this.activeIndex.set(index);
  }
}
