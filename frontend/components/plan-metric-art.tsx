/** Decorative artwork; the numeric progress remains the source of truth. */
export function PlanMetricArt({name}:{name:string}){
 const paths:Record<string,React.ReactNode>={
 'Movement time':<><circle cx="54" cy="50" r="30"/><path d="M54 31v21l15 9M43 9h22M54 9v11M79 25l7-7"/><path d="M6 68h19M12 81h24"/></>,
 'Exercises':<><path d="M20 30h60M20 55h60M20 80h60"/><path d="M26 24l5 6 10-12M26 49l5 6 10-12M26 74l5 6 10-12"/><path d="M54 28h18M54 53h18M54 78h18"/></>,
 'Energy':<><path d="M57 8c7 24-13 26-8 43 8-4 13-12 14-18 24 20 22 49-4 57C24 99 8 67 29 42c-1 14 6 18 10 20C32 36 52 32 57 8Z"/><path d="M48 76l10-17-1 13h10L54 86"/></>,
 'Protein':<><path d="M28 12c-20 20 22 34 44 52s0 24-1 25M72 12c20 20-22 34-44 52s0 24 1 25M28 14h44M30 32h40M34 50h32M28 69h44M28 86h44"/></>,
 'Carbohydrates':<><path d="M50 90V14M50 37C22 38 21 21 24 15c16 0 24 10 26 22ZM50 58C22 59 21 42 24 36c16 0 24 10 26 22ZM50 78C22 79 21 62 24 56c16 0 24 10 26 22ZM50 47c28 1 29-16 26-22-16 0-24 10-26 22ZM50 68c28 1 29-16 26-22-16 0-24 10-26 22Z"/></>,
 'Fat':<><path d="M25 85C47 66 61 42 72 15M58 44C42 45 32 33 35 21c16 1 25 10 23 23ZM65 31c4-14 16-20 26-16-2 13-12 20-26 16Z"/><ellipse cx="39" cy="61" rx="13" ry="18" transform="rotate(30 39 61)"/><ellipse cx="66" cy="62" rx="12" ry="17" transform="rotate(30 66 62)"/><path d="M38 52c-4 3-6 7-6 11M65 53c-3 2-5 6-5 10"/></>,
 }
 return <svg className="plan-metric-art" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]||paths.Exercises}</svg>
}
