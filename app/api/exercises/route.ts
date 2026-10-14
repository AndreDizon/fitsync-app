import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const allowedFilters = ['category', 'target_muscle', 'equipment'] as const

export async function GET(request: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Database is not configured' }, { status: 503 })

  const params = request.nextUrl.searchParams
  const query = params.get('q')?.trim() ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const pageSize = Math.min(500, Math.max(1, Number(params.get('pageSize') ?? '500') || 500))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let requestQuery = supabase
    .from('exercises')
    .select('id,source_id,name,category,target_muscle,equipment,instructions,media_urls,image_url,video_url', { count: 'exact' })
    .order('name')
    .range(from, to)

  if (query) requestQuery = requestQuery.or(`name.ilike.%${query}%,category.ilike.%${query}%,target_muscle.ilike.%${query}%,equipment.ilike.%${query}%`)
  for (const filter of allowedFilters) {
    const value = params.get(filter)?.trim()
    if (value) requestQuery = requestQuery.eq(filter, value)
  }

  const { data, error, count } = await requestQuery
  if (error) return NextResponse.json({ error: 'Unable to load exercises' }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}
