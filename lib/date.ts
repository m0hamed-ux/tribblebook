export function timeAgo(date: Date | string): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) {
    return "الآن";
  }

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return `منذ ${minutes} د`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `منذ ${hours} س`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `منذ ${days} يوم`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `منذ ${weeks} أسبوع`;
  }

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  return new Intl.DateTimeFormat("ar-EG", options).format(date);
}
