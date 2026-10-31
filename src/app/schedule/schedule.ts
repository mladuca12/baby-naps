import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { formatDuration } from '../format-duration';
import { icons } from '../icons';
import { ScheduleConfig, ScheduleSettings } from '../schedule-settings';

const RISE_TIME_STORAGE_KEY = 'baby-naps.riseTime';
const ACTIVE_INDEX_STORAGE_KEY = 'baby-naps.activeIndex';
const ACTUAL_NAP_TIMES_STORAGE_KEY = 'baby-naps.actualNapTimes';

function readStoredRiseTime(): string {
  const stored = localStorage.getItem(RISE_TIME_STORAGE_KEY);
  return stored && /^\d{2}:\d{2}$/.test(stored) ? stored : '07:00';
}

function readStoredActiveIndex(): number {
  const stored = Number(localStorage.getItem(ACTIVE_INDEX_STORAGE_KEY));
  return Number.isInteger(stored) && stored >= 0 ? stored : 0;
}

// Actual nap start/end times entered by the user, keyed by nap id. When
// present, these override the predicted clock times for that nap and the
// rest of the day's schedule shifts forward from them, while every awake
// (wake window) duration stays the same as the template.
interface NapActualTimes {
  start?: string;
  end?: string;
}

function readStoredActualNapTimes(): Record<string, NapActualTimes> {
  const stored = localStorage.getItem(ACTUAL_NAP_TIMES_STORAGE_KEY);
  if (!stored) {
    return {};
  }
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function parseTimeToMinutes(value: string | undefined): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
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
  // Only set for nap segments: the raw "HH:MM" values currently stored for
  // this nap, used to prefill the actual-time inputs, plus whether any
  // actual time has been entered for it.
  actualStartTime?: string;
  actualEndTime?: string;
  isActual: boolean;
  // How long the nap actually lasted, shown next to its planned length; only
  // known once the nap's actual end has been logged.
  actualDurationLabel?: string;
}

// Builds the day from the configured naps and wake windows; these stay
// constant, only the clock times shift based on the morning rise time.
function buildScheduleTemplate({
  naps,
  awakeBeforeBedMinutes,
}: ScheduleConfig): ScheduleTemplateItem[] {
  return [
    { id: 'rise', kind: 'event', label: 'Morning rise', icon: icons.rise, durationMinutes: 0 },
    ...naps.flatMap((nap, i): ScheduleTemplateItem[] => [
      {
        id: `awake${i + 1}`,
        kind: 'awake',
        label: 'Awake',
        icon: '',
        durationMinutes: nap.awakeBeforeMinutes,
      },
      {
        id: `nap${i + 1}`,
        kind: 'nap',
        label: `Nap ${i + 1}`,
        icon: icons.nap,
        durationMinutes: nap.durationMinutes,
      },
    ]),
    {
      id: `awake${naps.length + 1}`,
      kind: 'awake',
      label: 'Awake',
      icon: '',
      durationMinutes: awakeBeforeBedMinutes,
    },
    {
      id: 'bedtime',
      kind: 'event',
      label: 'Get ready for bed',
      icon: icons.bedtime,
      durationMinutes: 30,
    },
    { id: 'asleep', kind: 'event', label: 'Asleep', icon: icons.asleep, durationMinutes: 0 },
  ];
}

function formatTime(totalMinutesRaw: number): string {
  const minutesInDay = 24 * 60;
  const totalMinutes = ((totalMinutesRaw % minutesInDay) + minutesInDay) % minutesInDay;
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
}

@Component({
  imports: [FormsModule, RouterLink, NgIcon],
  selector: 'app-schedule',
  styleUrl: './schedule.scss',
  templateUrl: './schedule.html',
})
export class Schedule {
  protected readonly icons = icons;
  private readonly scheduleConfig = inject(ScheduleSettings).config;
  private readonly template = computed(() => buildScheduleTemplate(this.scheduleConfig()));
  protected readonly napCount = computed(() => this.scheduleConfig().naps.length);

  protected readonly riseTime = signal(readStoredRiseTime());
  // Clamped so the active step stays valid if naps are removed from the schedule.
  protected readonly activeIndex = linkedSignal<number, number>({
    source: () => this.template().length,
    computation: (length, previous) =>
      Math.min(previous?.value ?? readStoredActiveIndex(), length - 1),
  });
  protected readonly actualNapTimes = signal(readStoredActualNapTimes());

  constructor() {
    effect(() => localStorage.setItem(RISE_TIME_STORAGE_KEY, this.riseTime()));
    effect(() => localStorage.setItem(ACTIVE_INDEX_STORAGE_KEY, String(this.activeIndex())));
    effect(() =>
      localStorage.setItem(ACTUAL_NAP_TIMES_STORAGE_KEY, JSON.stringify(this.actualNapTimes())),
    );
  }

  protected readonly segments = computed<ScheduleSegment[]>(() => {
    const [hours, minutes] = this.riseTime().split(':').map(Number);
    let cursor = (hours || 0) * 60 + (minutes || 0);
    const actuals = this.actualNapTimes();

    return this.template().map((item) => {
      let startMinutes = cursor;
      let endMinutes = startMinutes + item.durationMinutes;
      let isActual = false;

      const actual = item.kind === 'nap' ? actuals[item.id] : undefined;
      const actualStart = parseTimeToMinutes(actual?.start);
      const actualEnd = parseTimeToMinutes(actual?.end);

      if (actualStart !== null) {
        // The baby's actual nap start takes over as the new anchor; predict
        // the end using the template's nap length unless an actual end was
        // also logged.
        startMinutes = actualStart;
        endMinutes = actualEnd !== null ? actualEnd : startMinutes + item.durationMinutes;
        isActual = true;
      } else if (actualEnd !== null) {
        endMinutes = actualEnd;
        isActual = true;
      }

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
        actualStartTime: actual?.start,
        actualEndTime: actual?.end,
        isActual,
        actualDurationLabel:
          actualEnd !== null ? formatDuration(endMinutes - startMinutes) : undefined,
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

  protected onActualNapStartChange(napId: string, value: string): void {
    this.actualNapTimes.update((current) => ({
      ...current,
      [napId]: { ...current[napId], start: value || undefined },
    }));
  }

  protected onActualNapEndChange(napId: string, value: string): void {
    this.actualNapTimes.update((current) => ({
      ...current,
      [napId]: { ...current[napId], end: value || undefined },
    }));
  }

  protected clearActualNapTimes(napId: string): void {
    this.actualNapTimes.update((current) => {
      const { [napId]: _removed, ...rest } = current;
      return rest;
    });
  }

  protected next(): void {
    this.activeIndex.update((i) => Math.min(i + 1, this.segments().length - 1));
  }

  protected previous(): void {
    this.activeIndex.update((i) => Math.max(i - 1, 0));
  }

  protected reset(): void {
    this.activeIndex.set(0);
    this.actualNapTimes.set({});
  }

  protected jumpTo(index: number): void {
    this.activeIndex.set(index);
  }
}
