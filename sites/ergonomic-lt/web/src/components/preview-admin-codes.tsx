import {previewField} from '@/lib/preview-option-presentation';

export function PreviewAdminCodes({model,values}:{model:string;values:Record<string,string|null|undefined>}) {
 return <details className="pc2-admin-codes">
  <summary>Visi pasirinkimų kodai</summary>
  <dl>
   <div><dt>Modelio kodas</dt><dd><code>{model}</code></dd></div>
   {Object.entries(values).filter(([,value])=>value!=null).map(([field,value])=>
    <div key={field}><dt>{previewField(field.split('.').at(-1)!)}</dt><dd><code>{field}={value}</code></dd></div>)}
  </dl>
 </details>;
}
