import { Routes } from '@angular/router';
import { Schedule } from './schedule/schedule';
import { Settings } from './settings/settings';

export const routes: Routes = [
  { path: '', component: Schedule },
  { path: 'settings', component: Settings },
  { path: '**', redirectTo: '' },
];
