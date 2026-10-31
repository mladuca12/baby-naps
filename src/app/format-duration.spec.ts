import { formatElapsed } from './format-duration';

describe('formatElapsed', () => {
  it.each([
    [0, '0s'],
    [34, '34s'],
    [65, '1m 5s'],
    [3605, '1hr 5s'],
    [4354, '1hr 12m 34s'],
    [7200, '2hrs 0s'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatElapsed(seconds)).toBe(expected);
  });
});
