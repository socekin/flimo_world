export const DEFAULT_TIME_CONFIG = {
  startDay: 1,
  startHour: 8,
  startMinute: 0
};

/**
 * 将游戏内经过的毫秒数格式化为 "Day X, HH:MM AM/PM"。
 * 前端维护游戏时间，便于暂停/加速。
 */
export function formatGameTime(elapsedMs = 0, config = DEFAULT_TIME_CONFIG) {
  const safeElapsed = Math.max(0, Math.floor(elapsedMs));
  const elapsedMinutes = Math.floor(safeElapsed / 60000);
  const startDay = config.startDay || 1;
  const baseMinutes =
    (startDay - 1) * 24 * 60 +
    (config.startHour || 0) * 60 +
    (config.startMinute || 0);

  const totalMinutes = baseMinutes + elapsedMinutes;
  const dayIndex = Math.floor(totalMinutes / (24 * 60));
  const minutesOfDay = totalMinutes % (24 * 60);
  const hours24 = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;

  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `Day ${dayIndex + 1}, ${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}
