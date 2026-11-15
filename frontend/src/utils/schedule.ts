export function calculateEstimatedCompletion(
  totalRecipients: number,
  delaySeconds: number,
  hourlyLimit: number,
  startTime: Date | string = new Date()
): {
  durationText: string;
  completionTimeText: string;
  totalMinutes: number;
} {
  if (totalRecipients <= 0) {
    return {
      durationText: '0 minutes',
      completionTimeText: '-',
      totalMinutes: 0,
    };
  }

  const delayTimeSeconds = totalRecipients * Math.max(0, delaySeconds);
  const hoursNeeded = Math.ceil(totalRecipients / Math.max(1, hourlyLimit));
  
  const delayBasedMinutes = delayTimeSeconds / 60;
  const rateLimitBasedMinutes = (hoursNeeded - 1) * 60 + ((totalRecipients % hourlyLimit || hourlyLimit) * delaySeconds) / 60;
  
  const totalMinutes = Math.round(Math.max(delayBasedMinutes, rateLimitBasedMinutes));
  
  // Format duration text
  let durationText = '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    durationText = `~${hours} hr ${minutes} min`;
  } else if (hours > 0) {
    durationText = `~${hours} hr`;
  } else {
    durationText = `~${Math.max(1, minutes)} min`;
  }

  // Format completion date
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const completionDate = new Date(start.getTime() + totalMinutes * 60 * 1000);
  
  const completionTimeText = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(completionDate);

  return {
    durationText,
    completionTimeText,
    totalMinutes,
  };
}
