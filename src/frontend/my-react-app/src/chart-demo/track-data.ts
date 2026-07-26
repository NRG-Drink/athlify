export class ChartDate {
  date: string;
  formattedDate: string;
  dateObject?: Date;

  constructor(date: string) {
    this.date = date;
    this.formattedDate = date;
    this.dateObject = new Date(date);
  }
}

export class TrackData extends ChartDate {
  distance: number;
  time: number;
  elevationGain: number;
  tss: number;

  constructor(date: string, distance: number, time: number, elevationGain: number, tss: number) {
    super(date);
    this.date = date;
    this.distance = distance;
    this.time = time;
    this.elevationGain = elevationGain;
    this.tss = tss;
  }

  getWeekNumber(): number {
    const date = new Date(this.date);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

function getFirstDayOfWeek(date: Date): Date {
  const firstDayOfWeek = new Date(date);
  const diff = (date.getDay() + 6) % 7; // Adjust so Monday is the first day of the week
  firstDayOfWeek.setDate(date.getDate() - diff);
  return firstDayOfWeek;
}

export function getMinMaxDates(trackData: TrackData[]): { minDate: Date; maxDate: Date } {
  const minDate = new Date(Math.min(...trackData.map(d => new Date(d.formattedDate).getTime())));
  const maxDate = new Date(Math.max(...trackData.map(d => new Date(d.formattedDate).getTime())));
  return { minDate, maxDate };
}

export function getConsistentDates(minDate: Date, maxDate: Date, key: "year" | "month" | "day" | "week"): Date[] {
  switch (key) {
    case "year":
      return getConsistentYears(minDate, maxDate);
    case "month":
      return getConsistentMonths(minDate, maxDate);
    case "week":
      return getConsistentWeeks(minDate, maxDate);
    case "day":
      return getConsistentDays(minDate, maxDate);
    default:
      return [];
  }
}

export function getConsistentYears(minDate: Date, maxDate: Date): Date[] {
  const years: Date[] = [];
  for (let year = minDate.getFullYear(); year <= maxDate.getFullYear(); year++) {
    years.push(new Date(year, 1, 1)); // Use February 1st to avoid timezone issues with January 1st
  }

  return years;
}

export function getConsistentMonths(minDate: Date, maxDate: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (current <= maxDate) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function getConsistentWeeks(minDate: Date, maxDate: Date): Date[] {
  const weeks: Date[] = [];
  const current = new Date(minDate);
  // current.setDate(current.getDate() - current.getDay());
  current.setDate(getFirstDayOfWeek(current).getDate()); // Set to the first day of the week (Monday)
  while (current <= maxDate) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

export function getConsistentDays(minDate: Date, maxDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(minDate);
  while (current <= maxDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function addFormattedDate(trackData: TrackData[], key: "year" | "month" | "day" | "week"): TrackData[] {
  return trackData.map(e => {
    e.formattedDate = getFormattedDate(new Date(e.date), key);
    return e;
  });
}

export function getFormattedDate(date: Date, key: "year" | "month" | "day" | "week"): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // const weekNumber = Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7);

  if (key === "year") {
    return `${year}-01-01`;
  } else if (key === "month") {
    return `${year}-${month.toString().padStart(2, '0')}-01`;
  } else if (key === "day") {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } else if (key === "week") {
    const fdow = getFirstDayOfWeek(new Date(date));
    return `${fdow.getFullYear()}-${(fdow.getMonth() + 1).toString().padStart(2, '0')}-${fdow.getDate().toString().padStart(2, '0')}`;
  }

  return "";
}

export function getAggregatedData(trackData: TrackData[], consistenDates: Date[], key: "year" | "month" | "day" | "week"): ChartDate[] {
  const aggregatedData: { [key: string]: ChartDate } = {};
  for (const date of consistenDates) {
    // const dateString = date.toISOString().split('T')[0];
    const dateString = getFormattedDate(date, key); // Change "year" to the appropriate key based on your use case
    const dataForDate = trackData.filter(d => d.formattedDate === dateString);
    if (dataForDate.length > 0) {
      const totalDistance = dataForDate.reduce((sum, d) => sum + d.distance, 0);
      const totalTime = dataForDate.reduce((sum, d) => sum + d.time, 0);
      const totalElevationGain = dataForDate.reduce((sum, d) => sum + d.elevationGain, 0);
      const totalTSS = dataForDate.reduce((sum, d) => sum + d.tss, 0);
      aggregatedData[dateString] = new TrackData(dateString, totalDistance, totalTime, totalElevationGain, totalTSS);
    } else {
      // Shows a datapoint with value 0.
      aggregatedData[dateString] = new TrackData(dateString, 0, 0, 0, 0);
      // Shows no datapoint when value is 0.
      // aggregatedData[dateString] = new ChartDate(dateString);
    }
  }

  return Object.values(aggregatedData);
}

// Write a generic function that creates diagram data by a given function that extracts the date, weeknumber, monthnumber, yearnumber from the TrackData. The function should return an array of ChartDate objects with the aggregated data.
export function toDiagramDataBy<T extends number>(trackData: TrackData[], extractor: (data: TrackData) => T): ChartDate[] {
  // Read min and max number and create all numbers (by day) in between
  const min = Math.min(...trackData.map(d => extractor(d)));
  const max = Math.max(...trackData.map(d => extractor(d)));
  const allNumbers: T[] = [];
  for (let n = min; n <= max; n++) {
    allNumbers.push(n as T);
  }

  // Aggregate data by number
  const aggregatedData: { [key: number]: ChartDate } = {};
  for (const number of allNumbers) {
    const dataForNumber = trackData.filter(d => extractor(d) === number);
    const axisNumber = number.toString(); // This is the number that we are aggregating by (e.g., weekNumber, monthNumber, yearNumber)
    if (dataForNumber.length > 0) {
      const totalDistance = dataForNumber.reduce((sum, d) => sum + d.distance, 0);
      const totalTime = dataForNumber.reduce((sum, d) => sum + d.time, 0);
      const totalElevationGain = dataForNumber.reduce((sum, d) => sum + d.elevationGain, 0);
      const totalTSS = dataForNumber.reduce((sum, d) => sum + d.tss, 0);
      aggregatedData[number] = new TrackData(axisNumber, totalDistance, totalTime, totalElevationGain, totalTSS);
      // aggregatedData[number] = new TrackData(dataForNumber[0].date, totalDistance, totalTime, totalElevationGain, totalTSS);
    } else {
      // Shows a datapoint with value 0.
      // aggregatedData[number] = new TrackData(dataForNumber[0].date, 0, 0, 0, 0);
      aggregatedData[number] = new TrackData(axisNumber, 0, 0, 0, 0);
      // Shows no datapoint when value is 0.
      // aggregatedData[number] = new ChartDate(dataForNumber[0].date);
    }
  }

  return Object.values(aggregatedData);
}

export function toDiagramDataByDay(trackData: TrackData[]): ChartDate[] {
  // Read min and max date and create all dates (by day) in between
  const minDate = new Date(Math.min(...trackData.map(d => new Date(d.date).getTime())));
  const maxDate = new Date(Math.max(...trackData.map(d => new Date(d.date).getTime())));
  const allDates: string[] = [];
  for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
    allDates.push(d.toISOString().split('T')[0]);
  }

  // Aggregate data by date
  const aggregatedData: { [key: string]: ChartDate } = {};
  for (const date of allDates) {
    const dataForDate = trackData.filter(d => d.date === date);
    if (dataForDate.length > 0) {
      const totalDistance = dataForDate.reduce((sum, d) => sum + d.distance, 0);
      const totalTime = dataForDate.reduce((sum, d) => sum + d.time, 0);
      const totalElevationGain = dataForDate.reduce((sum, d) => sum + d.elevationGain, 0);
      const totalTSS = dataForDate.reduce((sum, d) => sum + d.tss, 0);
      aggregatedData[date] = new TrackData(date, totalDistance, totalTime, totalElevationGain, totalTSS);
    } else {
      // Shows a datapoint with value 0.
      aggregatedData[date] = new TrackData(date, 0, 0, 0, 0);
      // Shows no datapoint when value is 0.
      // aggregatedData[date] = new ChartDate(date);
    }
  }

  return Object.values(aggregatedData);
}