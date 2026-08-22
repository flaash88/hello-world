/** Zeitraeume der Auswertung. Bewusst ohne Serverbezug – auch der Client nutzt sie. */
export type Period = 'day' | 'week' | 'month'

export const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30 }
export const PERIOD_LABEL: Record<Period, string> = { day: 'Tag', week: 'Woche', month: 'Monat' }
