'use client'

import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, ArrowUpRight, Trash2, Settings, CalendarDays, Dumbbell, Utensils, Droplet, Trophy, Heart, MessageCircle, Flame, ChevronDown } from 'lucide-react'
import { useNotifications } from '@/lib/notifications'
import { notificationFeatures } from '../../shared/notifications'
import '@/app/header-notifications.css'

const featureIcons = {workoutStart:CalendarDays,exercise:Dumbbell,meal:Utensils,water:Droplet,achievement:Trophy,like:Heart,comment:MessageCircle,streak:Flame}

export function HeaderNotifications({onSettings}:{onSettings:()=>void}) {
  const notifications = useNotifications()
  const unread = notifications.items.filter(item=>!item.read).length
  const count = notifications.items.length
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({left:16,top:78})
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const titleId = useId()
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return
    const anchor = trigger.current.getBoundingClientRect()
    const width = panel.current.getBoundingClientRect().width
    setPosition({left:Math.max(16,Math.min(anchor.right-width,window.innerWidth-width-16)),top:anchor.bottom+12})
  }, [open])
  useEffect(() => {
    if (!open) return
    close.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus({ preventScroll: true }) } }
    const pageScroll = (event: Event) => { if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) setOpen(false) }
    const resize = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('scroll', pageScroll, true)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', pageScroll, true); window.removeEventListener('resize', resize) }
  }, [open])
  return <div className="header-notifications" ref={root}>
    <button type="button" className="menu-toggle notification-trigger" ref={trigger} aria-label="Notifications" aria-describedby={count?panelId+'-count':undefined} title={`${count} notifications, ${unread} unread`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => { setOpen(value => !value); if(!open)notifications.refresh() }}><Bell size={20} aria-hidden="true"/>{count>0&&<span id={panelId+'-count'} className="notification-count">{count>99?'99+':count}</span>}</button>
    {open && createPortal(<section ref={panel} className="notification-panel" style={{left:position.left,top:position.top,maxHeight:`calc(100dvh - ${position.top+16}px)`}} id={panelId} role="dialog" aria-labelledby={titleId}>
      <header><h2 id={titleId}>Notifications</h2><button type="button" ref={close} aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }}><X size={18} aria-hidden="true"/></button></header>
      <div className="notification-toolbar"><span>{unread} unread</span><button disabled={!notifications.items.length} onClick={notifications.clear}><Trash2 size={14}/>Clear all</button><button onClick={()=>{setOpen(false);onSettings()}} aria-label="Notification settings"><Settings size={17}/></button></div>
      {notifications.socialError&&<p className="notification-warning" role="status">{notifications.socialError}</p>}
      {count?<div className="notification-groups">{notificationFeatures.map(feature=>{
        const items=notifications.items.filter(item=>item.feature===feature.id)
        if(!items.length)return null
        const Icon=featureIcons[feature.id],unreadCount=items.filter(item=>!item.read).length
        const page=feature.id==='like'||feature.id==='comment'?'Social':feature.id==='achievement'||feature.id==='streak'?'Progress':'My plan'
        return <details className="notification-group" name="notification-feature" key={feature.id}>
          <summary><span className={'notification-group-icon notification-group-icon-'+page.replace(' ','-').toLowerCase()}><Icon size={18} aria-hidden="true"/></span><span className="notification-group-copy"><strong>{feature.name}</strong><small>{page}{unreadCount?` · ${unreadCount} unread`:''}</small></span><span className="notification-group-count" aria-label={`${items.length} notifications`}>{items.length}</span><ChevronDown size={16} className="notification-group-chevron" aria-hidden="true"/></summary>
          <ul className="notification-list">{items.map(item=><li className={item.read?'is-read':''} key={item.id}><button className="notification-open" onClick={()=>{notifications.markRead(item.id);setOpen(false);window.dispatchEvent(new CustomEvent('fitsync-notification-open',{detail:item.target}))}}><strong>{item.title}</strong><span>{item.body}</span><small>{new Intl.DateTimeFormat('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:notifications.zone}).format(new Date(item.createdAt))}<ArrowUpRight size={13}/></small></button><button className="notification-remove" aria-label={'Clear notification: '+item.title} onClick={()=>notifications.remove(item.id)}><X size={15}/></button></li>)}</ul>
        </details>
      })}</div>:<div className="notification-empty"><span><Bell size={25} aria-hidden="true"/></span><h3>No notifications yet</h3><p>Enabled reminders appear here when they are due. All times follow {notifications.zone}.</p></div>}
      <p className="notification-retention">Up to 200 recent notifications on this device. Clearing them does not change your plans or posts.</p>
    </section>, document.body)}
  </div>
}
