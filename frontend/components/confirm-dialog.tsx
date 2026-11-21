'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, X } from 'lucide-react'
import '@/app/confirm-dialog.css'

type Options = { title: string; message: string; confirmLabel: string; destructive?: boolean }
type Request = Options & { resolve: (answer: boolean) => void; trigger: HTMLElement | null }
type Confirm = (options: Options) => Promise<boolean>
const ConfirmationContext = createContext<Confirm>(async()=>false)

export function useConfirmation() { return useContext(ConfirmationContext) }

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request,setRequest]=useState<Request|null>(null)
  const pending=useRef<Request|null>(null),dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null)
  const confirm=useCallback<Confirm>(options=>new Promise(resolve=>{
    // Repeated clicks cannot replace an unanswered confirmation.
    if(pending.current){resolve(false);return}
    const next={...options,resolve,trigger:document.activeElement instanceof HTMLElement?document.activeElement:null}
    pending.current=next;setRequest(next)
  }),[])
  const settle=useCallback((answer:boolean)=>{
    const current=pending.current
    if(!current)return
    pending.current=null;dialog.current?.close();setRequest(null)
    current.trigger?.focus()
    current.resolve(answer)
  },[])
  useEffect(()=>{
    if(request){dialog.current?.showModal();cancel.current?.focus()}
  },[request])
  useEffect(()=>()=>{pending.current?.resolve(false);pending.current=null},[])
  return <ConfirmationContext.Provider value={confirm}>{children}{request&&createPortal(
    <dialog ref={dialog} className="fitsync-confirm" aria-labelledby="fitsync-confirm-title" aria-describedby="fitsync-confirm-description" onCancel={event=>{event.preventDefault();settle(false)}} onClick={event=>{if(event.target===event.currentTarget)settle(false)}}>
      <header><span className="fitsync-confirm-icon"><CircleHelp size={23} aria-hidden="true"/></span><h2 id="fitsync-confirm-title">{request.title}</h2><button type="button" className="fitsync-confirm-close" aria-label="Close confirmation" onClick={()=>settle(false)}><X size={20}/></button></header>
      <p id="fitsync-confirm-description">{request.message}</p>
      <footer><button ref={cancel} type="button" onClick={()=>settle(false)}>Cancel</button><button type="button" className={'fitsync-confirm-accept'+(request.destructive?' is-destructive':'')} onClick={()=>settle(true)}>{request.confirmLabel}</button></footer>
    </dialog>,document.body)}</ConfirmationContext.Provider>
}
