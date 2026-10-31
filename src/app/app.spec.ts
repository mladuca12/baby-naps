import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  async function renderAt(url: string) {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the schedule on the home page', async () => {
    const element = await renderAt('/');
    expect(element.querySelector('app-schedule h1')?.textContent).toContain('3 Nap Day');
  });

  it('shows the settings page', async () => {
    const element = await renderAt('/settings');
    expect(element.querySelector('app-settings h1')?.textContent).toContain('Schedule settings');
    expect(element.querySelector('app-schedule')).toBeNull();
  });

  it('sends unknown pages to the schedule', async () => {
    const element = await renderAt('/nope');
    expect(element.querySelector('app-schedule')).not.toBeNull();
  });
});
