import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_SCHEDULE_CONFIG, MAX_NAPS, ScheduleSettings } from '../schedule-settings';
import { Settings } from './settings';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let element: HTMLElement;
  let settings: ScheduleSettings;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    element = fixture.nativeElement;
    settings = TestBed.inject(ScheduleSettings);
    await fixture.whenStable();
  });

  const napLabels = () =>
    [...element.querySelectorAll('.row--nap .row-label')].map((label) =>
      label.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const minuteInputs = () => [...element.querySelectorAll<HTMLInputElement>('input[type=number]')];
  const stepperButtons = () => [...element.querySelectorAll<HTMLButtonElement>('.stepper button')];

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('shows the wake window and length of every nap, then the wake window before bed', () => {
    expect(element.querySelector('.stepper-value')?.textContent?.trim()).toBe('3');
    expect(napLabels()).toEqual(['💤 Nap 1', '💤 Nap 2', '💤 Nap 3']);
    expect(minuteInputs().map((input) => input.value)).toEqual([
      '75',
      '90',
      '105',
      '120',
      '120',
      '45',
      '135',
    ]);
  });

  it('adds and removes naps', async () => {
    const [remove, add] = stepperButtons();

    add.click();
    await fixture.whenStable();
    expect(napLabels()).toHaveLength(4);
    expect(minuteInputs().map((input) => input.value)).toEqual([
      '75',
      '90',
      '105',
      '120',
      '120',
      '45',
      '120',
      '45',
      '135',
    ]);

    remove.click();
    remove.click();
    remove.click();
    await fixture.whenStable();
    expect(napLabels()).toEqual(['💤 Nap 1']);
    expect(settings.config().naps).toHaveLength(1);
    expect(remove.disabled).toBe(true);
    expect(add.disabled).toBe(false);
  });

  it('stops adding naps at the maximum', async () => {
    settings.setNapCount(MAX_NAPS);
    await fixture.whenStable();

    const [remove, add] = stepperButtons();
    expect(add.disabled).toBe(true);
    expect(remove.disabled).toBe(false);
  });

  it('saves valid minutes as they are typed', async () => {
    const inputs = minuteInputs();

    type(inputs[0], '80');
    type(inputs[1], '100');
    type(inputs[inputs.length - 1], '150');
    await fixture.whenStable();

    expect(settings.config().naps[0]).toEqual({ awakeBeforeMinutes: 80, durationMinutes: 100 });
    expect(settings.config().awakeBeforeBedMinutes).toBe(150);
    expect(element.querySelector('.row--nap .row-hint')?.textContent?.trim()).toBe('1hr 40m');
  });

  it('ignores invalid minutes and shows the saved value again on blur', async () => {
    const [awakeInput] = minuteInputs();

    for (const value of ['', '0', '7.5', '1000']) {
      type(awakeInput, value);
    }
    await fixture.whenStable();
    expect(settings.config()).toEqual(DEFAULT_SCHEDULE_CONFIG);

    awakeInput.dispatchEvent(new Event('blur'));
    expect(awakeInput.value).toBe('75');
  });

  it('restores the default schedule', async () => {
    settings.setNapCount(1);
    settings.updateNap(0, { durationMinutes: 30 });
    await fixture.whenStable();

    element.querySelector<HTMLButtonElement>('.restore-defaults')!.click();
    await fixture.whenStable();

    expect(settings.config()).toEqual(DEFAULT_SCHEDULE_CONFIG);
    expect(minuteInputs()).toHaveLength(7);
  });

  it('links back to the schedule', () => {
    expect(element.querySelector('a.btn-primary')?.getAttribute('href')).toBe('/');
  });
});
