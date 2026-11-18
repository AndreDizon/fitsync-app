'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import { AchievementEmblem } from './achievement-emblem'
import { milestones, type Award } from '../../shared/progress'

type Badge = typeof milestones[number]
export function AchievementShare({ badge, award, userName, total, onClose }: { badge: Badge; award: Award; userName: string; total: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), emblem = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0), [stage, setStage] = useState('Loading mascot artwork…')
  const blob = useRef<Blob | null>(null)
  const tier = milestones.filter(item => item.category === badge.category).findIndex(item => item.code === badge.code) + 1
  const firstName = userName.trim().split(/\s+/)[0] || 'champion'
  useEffect(() => { const previous = document.activeElement as HTMLElement; dialog.current?.showModal(); dialog.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); if (dialog.current) dialog.current.scrollTop = 0; return () => { previous?.focus() } }, [])
  useEffect(() => {
    let active = true, objectUrl = ''
    const controller = new AbortController(), timeout = setTimeout(() => { controller.abort(); if (active) setError('The artwork took too long to load. Your achievement is still claimed. Try again.') }, 20000)
    setUrl(''); setError(''); blob.current = null; setStage('Loading mascot artwork…')
    async function generate() {
      try {
        const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image creation is unavailable in this browser.')
        ctx.fillStyle = '#252c30'; ctx.fillRect(0, 0, 1080, 1350)
        ctx.strokeStyle = '#ffb66c'; ctx.globalAlpha = .2; ctx.lineWidth = 2
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(590 + i * 30, 0); ctx.bezierCurveTo(430 + i * 30, 350, 1160, 450, 1080, 760 + i * 30); ctx.stroke() }
        ctx.globalAlpha = 1; ctx.fillStyle = '#ffe135'; ctx.font = '800 38px Arial'; ctx.fillText('FitSync', 76, 98)
        ctx.fillStyle = '#f0ede8'; ctx.font = '24px Arial'; ctx.fillText('A little stronger, together.', 76, 143)
        const svg = emblem.current?.querySelector('svg'); if (!svg) throw new Error('Badge artwork could not be loaded.')
        const exportSvg = svg.cloneNode(true) as SVGSVGElement
        const source = exportSvg.querySelector('image')?.getAttribute('href')
        if (!source) throw new Error('Mascot artwork could not be loaded. Try again.')
        const response = await fetch(source, { signal: controller.signal })
        if (!response.ok) throw new Error('Mascot artwork could not load. Try again.')
        const data = await response.blob()
        if (!data.type.startsWith('image/')) throw new Error('Mascot artwork is unavailable. Try again.')
        const mascotUrl = URL.createObjectURL(data)
        const mascot = new Image()
        try { mascot.src = mascotUrl; await mascot.decode() } finally { URL.revokeObjectURL(mascotUrl) }
        if (!active || controller.signal.aborted) return
        setStage('Preparing your share card?')
        // Raster images nested inside an SVG can disappear during mobile canvas export.
        // Render the vector frame alone, then composite the decoded mascot directly.
        exportSvg.querySelectorAll('image').forEach(image => image.remove())
        const image = new Image()
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(exportSvg))
        await image.decode()
        if (!active || controller.signal.aborted) return
        ctx.drawImage(image, 350, 195, 380, 425)
        ctx.save(); ctx.translate(350, 195); ctx.scale(380 / 140, 425 / 156)
        const clip = exportSvg.querySelector('clipPath path')?.getAttribute('d')
        if (clip) ctx.clip(new Path2D(clip))
        const scale = Math.min(94 / mascot.naturalWidth, 99 / mascot.naturalHeight)
        const width = mascot.naturalWidth * scale, height = mascot.naturalHeight * scale
        ctx.drawImage(mascot, 23 + (94 - width) / 2, 23 + (99 - height) / 2, width, height)
        ctx.restore()
        const fit = (text: string, size: number, y: number, color: string, weight = '700') => { ctx.fillStyle = color; do { ctx.font = weight + ' ' + size + 'px Arial'; size-- } while (ctx.measureText(text).width > 928 && size > 18); ctx.fillText(text, 76, y) }
        fit(firstName + ', this win is yours.', 42, 705, '#ffbd83')
        fit(badge.name, 68, 800, '#fff', '800')
        fit(badge.description + '.', 30, 861, '#dce3e8', '400')
        ctx.strokeStyle = '#ffffff35'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(76, 916); ctx.lineTo(1004, 916); ctx.stroke()
        ctx.fillStyle = '#ffe135'; ctx.font = '800 64px Arial'; ctx.fillText(String(badge.target), 76, 1020); ctx.fillText(String(total) + ' / ' + milestones.length, 570, 1020)
        ctx.fillStyle = '#dce3e8'; ctx.font = '24px Arial'; ctx.fillText(badge.metric === 'best' ? 'day streak reached' : badge.metric === 'visits' ? 'app day reached' : badge.metric === 'workouts' ? 'workout days finished' : badge.metric === 'foods' ? 'food entries logged' : badge.metric === 'journalDays' ? 'journal days recorded' : 'tasks completed', 76, 1068); ctx.fillText('milestones unlocked', 570, 1068)
        const earned = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(award.awarded_at))
        ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.fillText('Unlocked ' + earned, 76, 1210)
        ctx.fillStyle = '#ffbd83'; ctx.font = '22px Arial'; ctx.fillText('My milestone. My pace.', 76, 1257)
        const generated = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png')); if (!generated) throw new Error('Could not generate your card. Close and try again.')
        if (!active || controller.signal.aborted) return; blob.current = generated; objectUrl = URL.createObjectURL(generated); setUrl(objectUrl)
      } catch (e) { if (active) setError(controller.signal.aborted ? 'The artwork took too long to load. Your achievement is still claimed. Try again.' : (e as Error).message) } finally { clearTimeout(timeout) }
    }
    void generate(); return () => { active = false; controller.abort(); clearTimeout(timeout); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [badge, award.awarded_at, firstName, total, attempt])
  function download() { if (!url) return; const link = document.createElement('a'); link.href = url; link.download = 'fitsync-' + badge.code + '.png'; link.click() }
  async function share() {
    if (!blob.current) return
    const file = new File([blob.current], 'fitsync-' + badge.code + '.png', { type: 'image/png' })
    if (!navigator.canShare?.({ files: [file] })) { download(); return }
    setBusy(true); setError('')
    try { await navigator.share({ files: [file], title: badge.name, text: 'A new FitSync milestone.' }) } catch (e) { if ((e as Error).name !== 'AbortError') setError('Sharing could not open. You can download the image instead.') } finally { setBusy(false) }
  }
  return <dialog className="ach-share" ref={dialog} onCancel={onClose} aria-labelledby="ach-share-title"><header><div><h2 id="ach-share-title" tabIndex={-1}>Nice work, {firstName}!</h2><p>Your achievement is claimed.</p></div><button type="button" aria-label="Close share card" onClick={onClose}><X size={20}/></button></header><h3>Shareable summary card</h3><p className="ach-share-caption">1080 × 1350 PNG, ready for your feed. Only your first name and these milestone stats are included.</p><div ref={emblem} className="ach-export-emblem"><AchievementEmblem category={badge.category} tier={tier} earned eager/></div>{url ? <img className="ach-share-image" src={url} width={1080} height={1350} alt={firstName + ' unlocked ' + badge.name + '. ' + badge.description + '. ' + total + ' milestones unlocked.'}/> : !error && <div className="ach-share-loading" role="status" aria-live="polite"><strong>{stage}</strong><p>Your achievement is claimed. Keep this window open while the image loads.</p></div>}{error && <div className="ach-share-error"><p role="alert" className="ach-claim-error">{error}</p>{!url && <button type="button" onClick={() => setAttempt(value => value + 1)}>Try creating card again</button>}</div>}<footer><button type="button" disabled={!url || busy} onClick={download}><Download size={16}/>Download PNG</button><button type="button" disabled={!url || busy} onClick={share}><Share2 size={16}/>{busy ? 'Opening…' : 'Share card'}</button></footer><p className="ach-share-caption">Share opens your device’s share menu when supported. Otherwise, it downloads the image for you to share.</p></dialog>
}
