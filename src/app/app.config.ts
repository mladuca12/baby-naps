import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs (#/settings) keep deep links and refreshes working on GitHub
    // Pages, which has no fallback to index.html for unknown paths.
    provideRouter(routes, withHashLocation()),
  ],
};
