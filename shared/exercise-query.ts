export type ExerciseSearchRecord = {
  id: string; name: string; category: string; target: string; target_muscle: string;
  equipment: string; group: string; difficulty: string; movementPattern: string;
  bodyPart: string; secondaryMuscles: string[];
}
const filterKeys = ['category', 'target_muscle', 'equipment', 'group', 'difficulty', 'movementPattern'] as const
type FacetKey = typeof filterKeys[number]
const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\bdb\b/g, 'dumbbell').replace(/\bbb\b/g, 'barbell')
  .replace(/\bbody[ -]weight\b/g, 'bodyweight')
  .replace(/\b(push|pull|chin)[ -]?ups?\b/g, '$1up')
  .replace(/\bpecs?\b/g, 'pectorals').replace(/\babs\b/g, 'abdominals').replace(/\blats\b/g, 'latissimus dorsi')
  .replace(/\babdominis\b/g, 'abdominals')
  .replace(/[^a-z0-9]+/g, ' ').trim()
const tokens = (value: string) => normalize(value).split(/\s+/).filter(Boolean).map(word => word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word)
const integer = (value: string | null, fallback: number, max: number) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback
}


export function queryExercises<T extends ExerciseSearchRecord>(exercises: T[], params: URLSearchParams) {
  const facets = Object.fromEntries(filterKeys.map(key => [key, [...new Set(exercises.map(item => item[key]))].sort()])) as Record<FacetKey, string[]>
  const searchable = new Map(exercises.map(item => [item.id, tokens([item.name, item.category, item.target, item.equipment, item.bodyPart, item.group, item.movementPattern, ...item.secondaryMuscles].join(' ')).join(' ')]))
  const query = (params.get('q') || '').trim().slice(0, 200)
  const terms = tokens(query)
  const selections = Object.fromEntries(filterKeys.map(key => [key, [...new Set(params.getAll(key).flatMap(value => value.split(',')).map(value => value.trim().toLowerCase()).filter(Boolean))]]))
  const matches = (item: T, except?: string) =>
    terms.every(term => searchable.get(item.id)!.includes(term)) &&
    filterKeys.every(key => key === except || !selections[key].length || selections[key].includes(item[key].toLowerCase()))
  // Counts ignore the facet's own selection, while respecting search and all
  // other facets. Selected options remain visible even when their count is zero.
  const facetCounts = Object.fromEntries(filterKeys.map(key => [key, Object.fromEntries(
    (facets[key] as string[]).map(value => [value, exercises.filter(item => item[key] === value && matches(item, key)).length])
  )])) as Record<FacetKey, Record<string, number>>
  const filtered = exercises.filter(item => matches(item))
  const requestedSort = params.get('sort') || (terms.length ? 'relevance' : 'name')
  const sort = ['relevance', 'name', 'name-desc', 'beginner'].includes(requestedSort) ? requestedSort : 'name'
  const rank = (item: T) => {
    const name = tokens(item.name).join(' '), search = terms.join(' ')
    return name === search ? 100 : (name.startsWith(search) ? 30 : 0) + terms.filter(term => name.includes(term)).length * 5
  }
  const levels: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }
  filtered.sort((a, b) => {
    if (sort === 'relevance' && terms.length && rank(a) !== rank(b)) return rank(b) - rank(a)
    if (sort === 'beginner' && levels[a.difficulty] !== levels[b.difficulty]) return levels[a.difficulty] - levels[b.difficulty]
    return (sort === 'name-desc' ? -1 : 1) * a.name.localeCompare(b.name, 'en')
  })
  const pageSize = integer(params.get('pageSize'), 24, 100)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const page = Math.min(integer(params.get('page'), 1, 10000), Math.max(1, totalPages))
  return { data: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, catalogTotal: exercises.length, page, pageSize, totalPages, sort, facets, facetCounts }
}
