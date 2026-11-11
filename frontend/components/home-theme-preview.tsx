'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import '@/app/home-theme-preview.css'
export type HomeTheme = 'clean-sporty' | 'midnight-orange' | 'night-training'
const themes = [
 {id:'clean-sporty',name:'Clean sporty',header:'#fff',base:'#fff',image:'none'},
 {id:'midnight-orange',name:'Midnight orange',header:'#202124',base:'#191b1f',image:'radial-gradient(ellipse at 0 0,#b8512638,transparent 55%),radial-gradient(ellipse at 100% 80%,#395c9820,transparent 50%)'},
 {id:'night-training',name:'Night training',header:'#232529',base:'#17191c',image:'none'},
] as const
export function useHomeTheme(){
 const [theme,setThemeState]=useState<HomeTheme>('clean-sporty')
 useEffect(()=>{try{const saved=localStorage.getItem('fitsync-home-theme');if(themes.some(t=>t.id===saved))setThemeState(saved as HomeTheme)}catch{}},[])
 const setTheme=(value:HomeTheme)=>{setThemeState(value);try{localStorage.setItem('fitsync-home-theme',value)}catch{}}
 const selected=themes.find(t=>t.id===theme) || themes[0]
 const themeStyle={'--preview-header':selected.header,'--preview-base':selected.base,'--preview-image':selected.image,'--preview-size':'100% 100%'} as CSSProperties
 return {theme,setTheme,themeStyle}
}
export function HomeThemeSettings({theme,onChange}:{theme:HomeTheme;onChange:(theme:HomeTheme)=>void}){
 return <div className="home-theme-setting"><label htmlFor="home-theme-selector">Theme</label><select id="home-theme-selector" value={theme} onChange={e=>onChange(e.target.value as HomeTheme)}>{themes.map(t=><option value={t.id} key={t.id}>{t.name}{t.id==='clean-sporty'?' (default)':''}</option>)}</select><p>Applies to all pages and tabs. Card colors stay the same.</p></div>
}
