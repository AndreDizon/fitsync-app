'use client'
import { PlaylistManager } from './playlist-manager'
import { FoodLibrary } from './food-library'
import { MyPlanWorkspace } from './my-plan-workspace'
type Tab = 'plan' | 'playlist' | 'library'
export function NutritionWorkspace({ tab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return tab === 'playlist' ? <PlaylistManager kind="nutrition" /> : tab === 'library' ? <FoodLibrary /> : <MyPlanWorkspace kind="nutrition" />
}
