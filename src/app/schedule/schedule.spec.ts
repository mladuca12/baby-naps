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
      'Awake 1hr',
      'Awake 1hr 30m',
      'Awake 2hrs',
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
});
