import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { formatDuration } from '../format-duration';
import { icons } from '../icons';
import {
  MAX_DURATION_MINUTES,
  MAX_NAPS,
  MIN_DURATION_MINUTES,
  MIN_NAPS,
  ScheduleSettings,
} from '../schedule-settings';

@Component({
  imports: [RouterLink, NgIcon],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {
  protected readonly icons = icons;
  protected readonly settings = inject(ScheduleSettings);
  protected readonly config = this.settings.config;
  protected readonly napCount = computed(() => this.config().naps.length);

  protected readonly minNaps = MIN_NAPS;
  protected readonly maxNaps = MAX_NAPS;
  protected readonly minMinutes = MIN_DURATION_MINUTES;
  protected readonly maxMinutes = MAX_DURATION_MINUTES;
  protected readonly formatDuration = formatDuration;

  // Invalid entries are never saved, so show the saved value again once the
  // user leaves the field.
  protected resetInput(input: HTMLInputElement, savedMinutes: number): void {
    input.value = String(savedMinutes);
  }
}
