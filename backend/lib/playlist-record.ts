import type { PlaylistInput } from '../../shared/playlists'
export function playlistColumns(input: PlaylistInput) {
  const { selectedDay, restDays, ...rest } = input
  return { ...rest, selected_day: selectedDay, rest_days: restDays }
}
export function playlistResult(row: Record<string, unknown>) {
  const { selected_day, rest_days, ...rest } = row
  return { ...rest, selectedDay: selected_day, restDays: rest_days }
}
