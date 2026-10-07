// Serialize shared core metadata; publication eligibility belongs to the projection.
export function sharingEntries(metadata){
 if(!metadata?.openGraph)return [];
 const g=metadata.openGraph,image=g.images?.[0],rows=[];
 const add=(kind,key,value)=>{if(value!==undefined&&value!==null&&value!=='')rows.push({kind,key,value:String(value)});};
 for(const key of ['title','description','url','locale','type'])add('property','og:'+key,g[key]);
 if(image){add('property','og:image',image.url);for(const key of ['width','height','alt'])add('property','og:image:'+key,image[key]);}
 add('property','article:published_time',g.publishedTime);add('property','article:modified_time',g.modifiedTime);
 add('name','twitter:card',image?'summary_large_image':'summary');
 add('name','twitter:title',g.title);add('name','twitter:description',g.description);
 if(image){add('name','twitter:image',image.url);add('name','twitter:image:alt',image.alt);}
 return rows;
}
export function sharingHtml(metadata){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return sharingEntries(metadata).map(r=>`<meta ${r.kind}="${escape(r.key)}" content="${escape(r.value)}">`).join('');
}
export function syncSharing(document,metadata){
 for(const tag of document.querySelectorAll('meta[property^="og:"],meta[property^="article:"],meta[name^="twitter:"]'))tag.remove();
 for(const row of sharingEntries(metadata)){const tag=document.createElement('meta');tag.setAttribute(row.kind,row.key);tag.setAttribute('content',row.value);document.head.append(tag);}
}
