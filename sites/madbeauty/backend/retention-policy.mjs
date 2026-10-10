// Approved directly by the site owner in this chat on 2026-10-10. Deployment
// activates this version through server configuration; RPC input cannot do so.
export const RETENTION_POLICY=Object.freeze({version:'madbeauty-2026-10-10-v1',approvedAt:'2026-10-10',messagesMonths:12,historyMonths:24,inactiveMonths:24,backupDays:30,receiptMonths:24,noticeDays:30});
export const policyActive=store=>store.retentionPolicyVersion===RETENTION_POLICY.version;
export function monthsBefore(now,months){const d=new Date(now),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.getTime();}
export const policyPublic=()=>({...RETENTION_POLICY,backupExplanation:'Kopijose duomenys gali išlikti iki 30 dienų. Prieš atkuriant prieigą pakartojami jau įvykdyti pašalinimai.',futureExplanation:'Būsimi vizitai neatšaukiami. Jų laikas lieka teikėjo kalendoriuje be tavo vardo, el. pašto ir pastabų; prisijungimas ir priminimai sustabdomi.'});
