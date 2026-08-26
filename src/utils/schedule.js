const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// weeklySchedule.slots = [{ day, time }, ...]
export function getNextLectureDate(weeklySchedule) {
  if (!weeklySchedule?.slots?.length) return null;

  const now = new Date();
  const candidates = [];

  for (const slot of weeklySchedule.slots) {
    const dayIndex = DAY_ORDER.indexOf(slot.day);
    if (dayIndex === -1 || !slot.time) continue;

    const [hours, minutes] = slot.time.split(":").map(Number);
    const todayIndex = now.getDay();

    for (let offset = 0; offset < 8; offset++) {
      const checkIndex = (todayIndex + offset) % 7;
      if (checkIndex === dayIndex) {
        const candidate = new Date(now);
        candidate.setDate(now.getDate() + offset);
        candidate.setHours(hours, minutes, 0, 0);
        if (candidate > now) {
          candidates.push(candidate);
        }
        break;
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a - b);
  return candidates[0];
}

export function formatLectureDate(date) {
  if (!date) return "";
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dayLabel} · ${timeLabel}`;
}

// Unique key per lecture occurrence, e.g. "2026-08-27" — used to store an override tied to that specific date
export function lectureDateKey(date) {
  if (!date) return null;
  return date.toISOString().split("T")[0];
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];