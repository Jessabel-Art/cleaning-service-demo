const assert = require('assert');
const {
  blockedDateKeysForFullDayBlackout,
  isFullDayBlackoutDateBlocked,
} = require('../blackoutDateKeys');

describe('full-day blackout date keys', () => {
  it('blocks only the selected single day when endDateKey is exclusive', () => {
    const blackout = {
      allDay: true,
      startDateKey: '2026-07-01',
      endDateKey: '2026-07-02',
    };

    assert.strictEqual(isFullDayBlackoutDateBlocked(blackout, '2026-07-01'), true);
    assert.strictEqual(isFullDayBlackoutDateBlocked(blackout, '2026-07-02'), false);
    assert.deepStrictEqual(blockedDateKeysForFullDayBlackout(blackout), ['2026-07-01']);
  });

  it('treats endDateKey as exclusive for multi-day blackouts', () => {
    const blackout = {
      allDay: true,
      startDateKey: '2026-07-01',
      endDateKey: '2026-07-03',
    };

    assert.deepStrictEqual(
      blockedDateKeysForFullDayBlackout(blackout),
      ['2026-07-01', '2026-07-02']
    );
    assert.strictEqual(isFullDayBlackoutDateBlocked(blackout, '2026-07-03'), false);
  });
});
