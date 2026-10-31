import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_SCHEDULE_CONFIG,
  MAX_DURATION_MINUTES,
  MAX_NAPS,
  MIN_NAPS,
  ScheduleSettings,
} from './schedule-settings';

const STORAGE_KEY = 'baby-naps.scheduleSettings';

describe('ScheduleSettings', () => {
  beforeEach(() => localStorage.clear());

  function createService(): ScheduleSettings {
    TestBed.configureTestingModule({});
    return TestBed.inject(ScheduleSettings);
  }

  it('defaults to the 3 nap day', () => {
    expect(createService().config()).toEqual({
      naps: [
        { awakeBeforeMinutes: 75, durationMinutes: 90 },
        { awakeBeforeMinutes: 105, durationMinutes: 120 },
        { awakeBeforeMinutes: 120, durationMinutes: 45 },
      ],
      awakeBeforeBedMinutes: 135,
    });
  });

  it('loads a previously saved schedule', () => {
    const saved = {
      naps: [{ awakeBeforeMinutes: 300, durationMinutes: 150 }],
      awakeBeforeBedMinutes: 240,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    expect(createService().config()).toEqual(saved);
  });

  it.each([
    ['malformed JSON', '{'],
    ['no naps', { naps: [], awakeBeforeBedMinutes: 120 }],
    [
      'too many naps',
      {
        naps: Array.from({ length: MAX_NAPS + 1 }, () => ({
          awakeBeforeMinutes: 60,
          durationMinutes: 30,
        })),
        awakeBeforeBedMinutes: 120,
      },
    ],
    [
      'a zero minute nap',
      { naps: [{ awakeBeforeMinutes: 60, durationMinutes: 0 }], awakeBeforeBedMinutes: 120 },
    ],
    [
      'a fractional wake window',
      { naps: [{ awakeBeforeMinutes: 7.5, durationMinutes: 30 }], awakeBeforeBedMinutes: 120 },
    ],
    ['no wake window before bed', { naps: [{ awakeBeforeMinutes: 60, durationMinutes: 30 }] }],
  ])('falls back to the defaults when the saved schedule has %s', (_, saved) => {
    localStorage.setItem(STORAGE_KEY, typeof saved === 'string' ? saved : JSON.stringify(saved));

    expect(createService().config()).toEqual(DEFAULT_SCHEDULE_CONFIG);
  });

  it('adds naps by copying the last nap and removes naps from the end', () => {
    const service = createService();
    const [nap1, nap2, nap3] = DEFAULT_SCHEDULE_CONFIG.naps;

    service.setNapCount(5);
    expect(service.config().naps).toEqual([nap1, nap2, nap3, nap3, nap3]);

    service.setNapCount(2);
    expect(service.config()).toEqual({ naps: [nap1, nap2], awakeBeforeBedMinutes: 135 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(service.config());
  });

  it('ignores nap counts outside the supported range', () => {
    const service = createService();

    service.setNapCount(MIN_NAPS - 1);
    service.setNapCount(MAX_NAPS + 1);
    service.setNapCount(2.5);

    expect(service.config()).toEqual(DEFAULT_SCHEDULE_CONFIG);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('updates and saves nap lengths and wake windows', () => {
    const service = createService();

    service.updateNap(0, { awakeBeforeMinutes: 80 });
    service.updateNap(1, { durationMinutes: 100 });
    service.setAwakeBeforeBed(150);

    const expected = {
      naps: [
        { awakeBeforeMinutes: 80, durationMinutes: 90 },
        { awakeBeforeMinutes: 105, durationMinutes: 100 },
        { awakeBeforeMinutes: 120, durationMinutes: 45 },
      ],
      awakeBeforeBedMinutes: 150,
    };
    expect(service.config()).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(expected);
  });

  it('ignores invalid minutes', () => {
    const service = createService();

    service.updateNap(0, { durationMinutes: Number.NaN });
    service.updateNap(0, { durationMinutes: 0 });
    service.updateNap(0, { awakeBeforeMinutes: 7.5 });
    service.updateNap(0, { awakeBeforeMinutes: MAX_DURATION_MINUTES + 1 });
    service.updateNap(3, { durationMinutes: 60 });
    service.setAwakeBeforeBed(-10);

    expect(service.config()).toEqual(DEFAULT_SCHEDULE_CONFIG);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores the defaults', () => {
    const service = createService();
    service.setNapCount(1);
    service.updateNap(0, { durationMinutes: 30 });

    service.restoreDefaults();

    expect(service.config()).toEqual(DEFAULT_SCHEDULE_CONFIG);
    expect(service.config().naps).toHaveLength(3);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
