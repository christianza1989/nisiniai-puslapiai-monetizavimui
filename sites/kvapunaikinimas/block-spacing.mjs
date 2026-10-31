// A source-only empty layout node must not become a public prose block.
// Replay its measured gap only against the same native text digest.
export function applyBlockSpacing(slug,digest,format,corrections=[]){
 const matches=corrections.filter(c=>c.slug===slug&&c.digest===digest);
 if(matches.length>1)throw Error('Ambiguous source block spacing');
 if(!matches.length)return format;
 const {marginTop,markerIndent}=matches[0],out={...format};
 if(marginTop!==undefined){
  if(!format?.style||!Number.isFinite(marginTop)||marginTop<0||marginTop>128)throw Error('Invalid source block spacing');
  out.style={...format.style,marginTop};
 }
 if(markerIndent!==undefined){
  if(!format?.marker||!Number.isFinite(markerIndent)||markerIndent<0||markerIndent>80)throw Error('Invalid source marker spacing');
  out.marker={...format.marker,indent:markerIndent};
 }
 return out;
}
