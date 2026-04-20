'use client';

import { useStudio } from '@/lib/store';

export function RecordCountdown() {
  const countdownValue = useStudio((s) => s.countdownValue);

  if (countdownValue === null || countdownValue <= 0) return null;

  return (
    <div className="countdown-overlay">
      <div key={countdownValue} className="countdown-number">
        {countdownValue}
      </div>
    </div>
  );
}
