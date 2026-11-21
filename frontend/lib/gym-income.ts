export type IncomePeriod={id:string;plan_name:string;price:string;currency:string;starts_on:string;ends_on:string;cancelled:boolean;member_name:string;outstanding:string}
export type IncomeEntry={id:string;kind:'payment'|'refund';payment_id:string|null;period_id:string|null;plan_name:string;amount:string;currency:string;received_on:string;method:string;notes:string;voided:boolean;void_reason:string|null;recorded_at:string;member_name:string;recorded_by:string;refundable:string}
export type IncomeMonth={month:string;currency:string;received:string;refunds:string;net:string;records:number}
export type GymIncomeData={year:number;month:number;page:number;summary:IncomeMonth[];entries:IncomeEntry[];total:number;periods:IncomePeriod[];years:number[];currencies:string[];timeZone:string}
export const incomeMoney=(amount:string|number,currency:string)=>new Intl.NumberFormat(undefined,{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(amount))
export function incomeCsv(entries:IncomeEntry[]):string{
 const cell=(value:unknown)=>{
  let text=String(value??'')
  if(/^\s*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text
  return '"'+text.replaceAll('"','""')+'"'
 }
 const headers=['Date (gym local)','Member','Membership plan','Type','Amount','Currency','Method','Status','Note','Void reason','Recorded by','Recorded at (UTC)','Record ID','Original payment ID']
 const rows=entries.map(e=>[e.received_on,e.member_name,e.plan_name,e.kind,e.amount,e.currency,e.method,e.voided?'Voided':'Recorded',e.notes,e.void_reason||'',e.recorded_by,e.recorded_at,e.id,e.payment_id||''])
 return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')
}
