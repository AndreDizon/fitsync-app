'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import '@/app/home-theme-preview.css'
export const homeThemes = [
 {id:'clean-sporty',name:'Clean sporty',description:'Bright and focused',header:'#ffffff',base:'#ffffff',image:'none',dark:false,headerDark:false},
 {id:'midnight-orange',name:'Midnight orange',description:'Warm, after hours',header:'#202124',base:'#191b1f',image:'radial-gradient(ellipse at 0 0,#b8512638,transparent 55%),radial-gradient(ellipse at 100% 80%,#395c9820,transparent 50%)',dark:true,headerDark:true},
 {id:'night-training',name:'Night training',description:'Cool charcoal',header:'#232529',base:'#17191c',image:'none',dark:true,headerDark:true},
 {id:'trackside',name:'Trackside',description:'Concrete and charcoal',header:'#262b2e',base:'#eef0f1',image:'none',dark:false,headerDark:true},
 {id:'open-sky',name:'Open sky',description:'Fresh and spacious',header:'#ffffff',base:'#eaf4fc',image:'none',dark:false,headerDark:false},
 {id:'sunrise',name:'Sunrise',description:'Warm and energizing',header:'#ffffff',base:'#fff0e5',image:'none',dark:false,headerDark:false},
 {id:'recovery',name:'Recovery',description:'Calm and restorative',header:'#ffffff',base:'#edf3ec',image:'none',dark:false,headerDark:false},
 {id:'pink-court',name:'Pink court',description:'Playful and bold',header:'#f1cfdd',base:'#fcecf2',image:'none',dark:false,headerDark:false},
] as const
export type HomeTheme = typeof homeThemes[number]['id']
export function useHomeTheme(){
 const [theme,setThemeState]=useState<HomeTheme>('clean-sporty')
 useEffect(()=>{try{const stored=localStorage.getItem('fitsync-home-theme');const saved=stored==='matte-black'?'night-training':stored;if(homeThemes.some(t=>t.id===saved)){setThemeState(saved as HomeTheme);if(stored!==saved)localStorage.setItem('fitsync-home-theme',saved!)}}catch{}},[])
 const setTheme=(value:HomeTheme)=>{setThemeState(value);try{localStorage.setItem('fitsync-home-theme',value)}catch{}}
 const selected=homeThemes.find(t=>t.id===theme) || homeThemes[0]
 const themeStyle={'--preview-header':selected.header,'--preview-base':selected.base,'--preview-image':selected.image,'--preview-size':'100% 100%'} as CSSProperties
 return {theme,setTheme,themeStyle,isDark:selected.dark,isHeaderDark:selected.headerDark}
}
export function HomeThemeSettings({theme,onChange}:{theme:HomeTheme;onChange:(theme:HomeTheme)=>void}){
 return <div className="home-theme-setting"><label htmlFor="home-theme-selector">Theme</label><select id="home-theme-selector" value={theme} onChange={e=>onChange(e.target.value as HomeTheme)}>{homeThemes.map(t=><option value={t.id} key={t.id}>{t.name}{t.id==='clean-sporty'?' (default)':''}</option>)}</select><p>Applies to all pages and tabs. Card colors stay the same.</p></div>
}
