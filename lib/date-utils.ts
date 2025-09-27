export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  };

  return date.toLocaleDateString("en-US", options);
}

export function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  };

  return date.toLocaleDateString("en-US", options);
}