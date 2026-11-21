'use client'

import '@/app/card-heading.css'

import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { learningArticles } from '@/lib/learning-articles'
import { usePlanningProfile } from '@/lib/planning-profile'
import '@/app/learning-articles.css'

export function LearningArticles() {
  const profile=usePlanningProfile()
  const grid=useRef<HTMLDivElement>(null)
  useLayoutEffect(()=>{
    const container=grid.current
    if(!container)return
    let measuredWidth=0,disposed=false
    const measure=()=>{
      if(disposed)return
      const card=container.querySelector<HTMLElement>('.sc-learning-article')
      if(!card)return
      const width=card.getBoundingClientRect().width
      if(!width||width===measuredWidth)return
      // Measure the entire collection at this card width, so pagination and
      // filters share the same height. The temporary copy is never painted.
      const copy=card.cloneNode(true) as HTMLElement
      copy.setAttribute('aria-hidden','true')
      Object.assign(copy.style,{position:'fixed',visibility:'hidden',pointerEvents:'none',width:`${width}px`,boxSizing:'border-box',height:'auto',minHeight:'0',left:'0',top:'0'})
      container.append(copy)
      let tallest=0
      try{
        for(const article of learningArticles){
          copy.querySelector('.sc-learning-tags span:first-child')!.textContent=article.topic
          copy.querySelector('.sc-learning-tags span:last-child')!.textContent=article.level
          copy.querySelector('h4')!.textContent=article.title
          copy.querySelector(':scope > p')!.textContent=article.description
          copy.querySelector('.sc-learning-source strong')!.textContent=article.source
          tallest=Math.max(tallest,copy.getBoundingClientRect().height)
        }
      }finally{copy.remove()}
      measuredWidth=width
      container.style.setProperty('--sc-learning-card-height',`${Math.ceil(tallest)}px`)
    }
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(container)
    const fontsChanged=()=>{measuredWidth=0;measure()}
    void document.fonts.ready.then(fontsChanged)
    document.fonts.addEventListener('loadingdone',fontsChanged)
    return()=>{disposed=true;observer.disconnect();document.fonts.removeEventListener('loadingdone',fontsChanged)}
  },[])
  const [topic,setTopic]=useState('All topics'),[expertise,setExpertise]=useState<Record<string,string>>({}),[page,setPage]=useState(0)
  const trainingLevel=['Beginner','Intermediate','Advanced'].includes(profile?.experience??'')?profile!.experience:'All levels'
  const level=expertise[topic]??(topic==='Workout'?trainingLevel:'All levels')
  const filtered=learningArticles.filter(article=>(topic==='All topics'||article.topic===topic)&&(level==='All levels'||article.level===level))
  const pages=Math.max(1,Math.ceil(filtered.length/3)),current=Math.min(page,pages-1)
  function clearFilters(){setTopic('All topics');setExpertise({});setPage(0)}
  return <section className="sc-learning" aria-labelledby="learning-title">
    <header className="sc-learning-header fitsync-card-heading"><BookOpen className="fitsync-card-heading-icon" size={22}/><div><h3 id="learning-title">Learn &amp; improve</h3><p>Start with the basics. Explore the details when you are ready.</p></div><button className="sc-learning-clear" type="button" onClick={clearFilters}>Clear filters</button><svg viewBox="0 0 360 120" fill="none" aria-hidden="true"><path d="M380 20H210c-55 0-55 65-110 65H-20M380 34H216c-55 0-55 65-110 65H-20"/><path d="M278 54h26v40l-13-6-13 6V54Z"/></svg></header>
    <div className="sc-learning-content">
      <div className="sc-learning-filters"><span><SlidersHorizontal size={17}/>Find articles for your experience</span><label>Topic<select aria-label="Article topic" value={topic} onChange={event=>{setTopic(event.target.value);setPage(0)}}>{['All topics','Workout','Nutrition','Recovery'].map(value=><option key={value}>{value}</option>)}</select></label><label>Expertise level<select aria-label="Article expertise level" aria-describedby="learning-expertise-help" value={level} onChange={event=>{setExpertise(previous=>({...previous,[topic]:event.target.value}));setPage(0)}}>{['All levels','Beginner','Intermediate','Advanced'].map(value=><option key={value}>{value}</option>)}</select></label></div>
      <p id="learning-expertise-help" className="sc-learning-expertise-help">{topic==='Workout'&&expertise[topic]===undefined&&trainingLevel!=='All levels'?`Recommended for your ${trainingLevel.toLowerCase()} training experience from onboarding. You can change the level here.`:'Choose how familiar you are with the selected topic: Beginner for foundations, Intermediate for applying the basics, or Advanced for deeper guidance.'}</p>
      <p className="sc-learning-count" role="status">{filtered.length?`${current*3+1}–${Math.min(current*3+3,filtered.length)} of ${filtered.length} articles`:'No articles match these filters.'}</p>
      <div className="sc-learning-grid" ref={grid}>{filtered.slice(current*3,current*3+3).map(article=><article className={'sc-learning-article sc-learning-'+article.topic.toLowerCase()} key={article.id}><div className="sc-learning-tags"><span>{article.topic}</span><span>{article.level}</span></div><h4>{article.title}</h4><p>{article.description}</p><footer className="sc-learning-footer"><span className="sc-learning-source">From <strong>{article.source}</strong></span><a href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${article.title} on ${article.source} (opens in a new tab)`}>Read article<ArrowUpRight size={16}/></a></footer></article>)}</div>
      {filtered.length===0&&<div className="sc-learning-empty"><BookOpen size={26}/><p>No articles for this topic and expertise level yet. Try All levels or another topic.</p><button type="button" onClick={()=>{setTopic('All topics');setExpertise({});setPage(0)}}>Show all articles</button></div>}
      {pages>1&&<nav className="sc-learning-pagination" aria-label="Article pages"><button type="button" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={17}/>Previous</button><span>Page {current+1} of {pages}</span><button type="button" disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next<ChevronRight size={17}/></button></nav>}
      <details className="sc-learning-about"><summary>About this collection</summary><p>FitSync assigns expertise levels to help match articles to your familiarity with each topic. Workout uses your onboarding training experience by default. Nutrition and Recovery use the level you choose here; your training experience is not used to infer those. These are browsing suggestions, not an assessment or a personal training prescription. Articles open on the publisher’s website and require internet access. Sources checked November 21, 2026. General education; linking does not imply endorsement or professional review of FitSync.</p></details>
    </div>
  </section>
}
