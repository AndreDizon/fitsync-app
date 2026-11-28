import '@/app/plan-formulation-skeleton.css'

export function PlanFormulationSkeleton({ nutrition, ai }: { nutrition: boolean; ai: boolean }) {
  return <div className="plan-formulation-skeleton" data-kind={nutrition ? 'nutrition' : 'workout'}>
    <p role="status" className="plan-formulation-status">{ai ? 'AI is formulating' : 'Formulating'} your {nutrition ? 'meal' : 'workout'} plan…</p>
    <div className="plan-skeleton-cards" aria-hidden="true">
      {[0, 1, 2].map(index => <div className="plan-skeleton-row" key={index}>
        <div className="plan-skeleton-rail"><span className="plan-skeleton-block plan-skeleton-time" /><span className="plan-skeleton-block plan-skeleton-action" /></div>
        <div className="plan-skeleton-card">
          <div className="plan-skeleton-heading"><span className="plan-skeleton-block plan-skeleton-art" /><div><span className="plan-skeleton-block plan-skeleton-title" /><span className="plan-skeleton-block plan-skeleton-subtitle" /></div><span className="plan-skeleton-block plan-skeleton-detail" /></div>
          <div className="plan-skeleton-metrics">{[0, 1, 2].map(metric => <div key={metric}><span className="plan-skeleton-block" /><span className="plan-skeleton-block" /></div>)}</div>
          <div className="plan-skeleton-footer"><span className="plan-skeleton-block" /><span className="plan-skeleton-block" /></div>
        </div>
      </div>)}
    </div>
  </div>
}
