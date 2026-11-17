import { CalendarDays, CheckCheck, Dumbbell, NotebookPen, Utensils } from 'lucide-react'
import { useId } from 'react'

const finishes = {
  consistency: { ink: '#28578a', deep: '#173b63', light: '#dcecff', Icon: CalendarDays },
  tasks: { ink: '#967018', deep: '#604711', light: '#fff0ac', Icon: CheckCheck },
  training: { ink: '#b25924', deep: '#763719', light: '#ffddbe', Icon: Dumbbell },
  nutrition: { ink: '#80509a', deep: '#512e69', light: '#ebdcf5', Icon: Utensils },
  journal: { ink: '#ad4a79', deep: '#702e50', light: '#f8dce9', Icon: NotebookPen },
}
type Category = keyof typeof finishes

/** Add six transparent mascot paths here when a category's sheet is supplied. */
export const achievementMascots: Partial<Record<Category, readonly string[]>> = {
  consistency: Array.from({ length: 6 }, (_, index) => '/mascot/achievements/showing-up-' + (index + 1) + '.webp'),
  tasks: Array.from({ length: 6 }, (_, index) => '/mascot/achievements/small-wins-' + (index + 1) + '.webp'),
  training: Array.from({ length: 6 }, (_, index) => '/mascot/achievements/training-' + (index + 1) + '.webp'),
  nutrition: Array.from({ length: 6 }, (_, index) => '/mascot/achievements/food-logging-' + (index + 1) + '.webp'),
  journal: Array.from({ length: 6 }, (_, index) => '/mascot/achievements/journal-' + (index + 1) + '.webp'),
}

function frameShape(category: Category) {
  if (category === 'consistency') return 'M70 7 123 25v48c0 31-23 49-53 66-30-17-53-35-53-66V25Z'
  if (category === 'training') return 'm70 7 55 31v62l-55 37-55-37V38Z'
  if (category === 'nutrition') return 'M70 9a59 59 0 1 1 0 118 59 59 0 1 1 0-118Z'
  if (category === 'journal') return 'M32 9h76l20 20v80l-20 20H32l-20-20V29Z'
  return Array.from({ length: 24 }, (_, index) => {
    const angle = (index * 15 - 90) * Math.PI / 180, radius = index % 2 ? 53 : 61
    return (index ? 'L' : 'M') + (70 + Math.cos(angle) * radius).toFixed(2) + ' ' + (68 + Math.sin(angle) * radius).toFixed(2)
  }).join(' ') + 'Z'
}

export function AchievementEmblem({ category, tier, earned = false, mascotSrc }: { category: Category; tier: number; earned?: boolean; mascotSrc?: string }) {
  const uid = useId().replace(/:/g, '')
  const { ink, deep, light, Icon } = finishes[category]
  const rank = Math.max(1, Math.min(6, tier)), shape = frameShape(category)
  const source = mascotSrc || achievementMascots[category]?.[rank - 1]
  const face = rank >= 5 ? deep : light
  return <svg className={'ach-emblem ach-rank-emblem' + (source ? ' ach-fox-emblem' : '')} viewBox="0 0 140 156" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id={uid + '-rim'} x1="20" y1="5" x2="110" y2="145" gradientUnits="userSpaceOnUse"><stop stopColor={light}/><stop offset=".22" stopColor={ink}/><stop offset=".5" stopColor={light}/><stop offset=".7" stopColor={ink}/><stop offset="1" stopColor={deep}/></linearGradient>
      <linearGradient id={uid + '-face'} x1="30" y1="14" x2="104" y2="132" gradientUnits="userSpaceOnUse"><stop stopColor={rank >= 5 ? ink : '#fff'}/><stop offset=".65" stopColor={face}/><stop offset="1" stopColor={rank >= 5 ? deep : light}/></linearGradient>
      <linearGradient id={uid + '-ribbon'} x1="35" y1="110" x2="100" y2="154" gradientUnits="userSpaceOnUse"><stop stopColor={ink}/><stop offset=".5" stopColor={deep}/><stop offset="1" stopColor={ink}/></linearGradient>
      <radialGradient id={uid + '-warmth'} cx="50%" cy="68%" r="62%"><stop stopColor="#ff771b" stopOpacity=".96"/><stop offset=".44" stopColor="#ff942b" stopOpacity=".72"/><stop offset=".78" stopColor="#ffb24d" stopOpacity=".3"/><stop offset="1" stopColor="#ffad52" stopOpacity="0"/></radialGradient>
      <clipPath id={uid + '-clip'}><path d={shape}/></clipPath>
    </defs>
    {rank >= 2 && <><path d="m38 105-8 47 40-18 40 18-8-47" fill={'url(#' + uid + '-ribbon)'} stroke={deep} strokeWidth=".7"/><path d="m38 106 32 28-29-12Zm64 0-32 28 29-12Z" fill={deep}/></>}
    {rank >= 4 && <path d="m42 119-4 23 32-14 32 14-4-23" fill={light} opacity=".75"/>}
    <path d={shape} transform="translate(0 3)" fill={deep} stroke={deep} strokeWidth="4"/>
    <path d={shape} fill={'url(#' + uid + '-rim)'} stroke={ink} strokeWidth="1"/>
    <path d={shape} transform="translate(5.6 5.4) scale(.92)" fill={'url(#' + uid + '-face)'} stroke={rank >= 3 ? light : '#ffffffb3'} strokeWidth={rank >= 5 ? 1.8 : 1}/>
    {rank >= 3 && <path d={shape} transform="translate(8.4 8.2) scale(.88)" stroke={rank >= 5 ? light : ink} strokeWidth=".7" opacity=".7"/>}
    <g clipPath={'url(#' + uid + '-clip)'}>
      <path d="M-5 18 80-6l64 22L2 64Z" fill="#fff" opacity={rank >= 5 ? .08 : .27}/>
      <path d="M4 103C40 75 91 124 139 88v65H4Z" fill={ink} opacity=".12"/>
      <ellipse cx="70" cy="83" rx="59" ry="56" fill={'url(#' + uid + '-warmth)'}/>
      <ellipse cx="70" cy="111" rx="48" ry="26" fill={'url(#' + uid + '-warmth)'}/>
      {source ? <image href={source} x="23" y="23" width="94" height="99" preserveAspectRatio="xMidYMid meet"/> : <><circle cx="70" cy="66" r="30" fill={rank >= 5 ? '#ffffff0d' : '#ffffff80'} stroke={rank >= 5 ? light : ink} strokeWidth=".8" opacity=".8"/><Icon x="50" y="46" width="40" height="40" color={rank >= 5 ? light : ink} strokeWidth="1.6"/></>}
    </g>
    {rank >= 5 && <g stroke={ink} strokeWidth="2" strokeLinecap="round"><path d="m12 52-6-8m6 22-7-3m123-11 6-8m-6 22 7-3"/></g>}
    <rect x="52" y="125" width="36" height="19" rx="6" fill={deep}/>
    <rect x="52" y="122" width="36" height="19" rx="6" fill={'url(#' + uid + '-rim)'} stroke={light} strokeWidth=".8"/>
    <text x="70" y="135" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">{['I', 'II', 'III', 'IV', 'V', 'VI'][rank - 1]}</text>
    {earned && <circle cx="94" cy="132" r="2.5" fill={light} stroke={ink} strokeWidth=".8"/>}
  </svg>
}
