import {
  tablerBed,
  tablerMoon,
  tablerSettings,
  tablerSunrise,
  tablerZzz,
} from '@ng-icons/tabler-icons';

// SVG icons for each part of the day, shared so the schedule and settings
// pages always match. Render with <ng-icon [svg]="icons.nap" />.
export const icons = {
  rise: tablerSunrise,
  nap: tablerZzz,
  bedtime: tablerMoon,
  asleep: tablerBed,
  settings: tablerSettings,
};
