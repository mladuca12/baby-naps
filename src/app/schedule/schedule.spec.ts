import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ScheduleSettings } from '../schedule-settings';
import { Schedule } from './schedule';

describe('Schedule', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Schedule],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Schedule);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function text(element: Element | null | undefined): string | undefined {
    return element?.textContent?.replace(/\s+/g, ' ').trim();
  }

  it('should create', async () => {
    const { fixture } = await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the configured number of naps in the title', async () => {
    const { fixture, element } = await render();
    expect(text(element.querySelector('h1'))).toBe('3 Nap Day');

    TestBed.inject(ScheduleSettings).setNapCount(2);
    await fixture.whenStable();

    expect(text(element.querySelector('h1'))).toBe('2 Nap Day');
  });

  it('builds the day from the configured naps and wake windows', async () => {
    const settings = TestBed.inject(ScheduleSettings);
    settings.setNapCount(2);
    settings.updateNap(0, { awakeBeforeMinutes: 60, durationMinutes: 30 });
    settings.updateNap(1, { awakeBeforeMinutes: 90, durationMinutes: 60 });
    settings.setAwakeBeforeBed(120);

    const { element } = await render();

    const cards = [...element.querySelectorAll('.card')].map((card) => [
      text(card.querySelector('.card-title')),
      text(card.querySelector('.card-time')),
    ]);
    expect(cards).toEqual([
      ['Morning rise', '7:00am'],
      ['Nap 1', '8:00am - 8:30am'],
      ['Nap 2', '10:00am - 11:00am'],
      ['Get ready for bed', '1:00pm'],
      ['Asleep', '1:30pm'],
    ]);
    expect([...element.querySelectorAll('.awake-caption')].map(text)).toEqual([
      'Awake 1hr (7:00am - 8:00am)',
      'Awake 1hr 30m (8:30am - 10:00am)',
      'Awake 2hrs (11:00am - 1:00pm)',
    ]);
  });

  it('starts each wake window when the previous nap actually ended', async () => {
    localStorage.setItem(
      'baby-naps.actualNapTimes',
      JSON.stringify({ nap1: { start: '08:30', end: '09:30' } }),
    );

    const { element } = await render();

    expect([...element.querySelectorAll('.awake-caption')].map(text)).toEqual([
      'Awake 1hr 15m (7:00am - 8:15am)',
      'Awake 1hr 45m (9:30am - 11:15am)',
      'Awake 2hrs (1:15pm - 3:15pm)',
      'Awake 2hrs 15m (4:00pm - 6:15pm)',
    ]);
  });

  it('shows the actual nap length next to the planned length once the nap has ended', async () => {
    const { fixture, element } = await render();
    const napBadges = () =>
      [...element.querySelectorAll('.card--nap')].map((card) =>
        [...card.querySelectorAll('.card-badge')].map(text),
      );
    expect(napBadges()).toEqual([['1hr 30m'], ['2hrs'], ['45m']]);

    const [, nap1End, nap2Start, , nap3Start, nap3End] =
      element.querySelectorAll<HTMLInputElement>('.nap-actuals input');
    for (const [input, value] of [
      [nap1End, '09:30'],
      [nap2Start, '11:45'],
      [nap3Start, '15:50'],
      [nap3End, '16:28'],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    expect(napBadges()).toEqual([
      ['1hr 30m', '1hr 15m actual'],
      // Still asleep: the actual length isn't known until the end is logged.
      ['2hrs'],
      ['45m', '38m actual'],
    ]);
  });

  it('keeps the current step within the day when naps are removed', async () => {
    localStorage.setItem('baby-naps.activeIndex', '9');
    const { fixture, element } = await render();
    expect(text(element.querySelector('.now-value'))).toBe('Asleep');

    TestBed.inject(ScheduleSettings).setNapCount(1);
    await fixture.whenStable();

    expect(text(element.querySelector('.now-value'))).toBe('Asleep');
    expect(localStorage.getItem('baby-naps.activeIndex')).toBe('5');
  });

  it('links to the settings page', async () => {
    const { element } = await render();
    expect(element.querySelector('a.settings-link')?.getAttribute('href')).toBe('/settings');
  });

  it('uses icons instead of emoji', async () => {
    const { element } = await render();

    expect(element.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(element.querySelector('.settings-link ng-icon svg')).not.toBeNull();
    const cards = [...element.querySelectorAll('.card')];
    expect(cards).toHaveLength(6);
    for (const card of cards) {
      expect(card.querySelector('.card-icon ng-icon svg')).not.toBeNull();
    }
  });
});
