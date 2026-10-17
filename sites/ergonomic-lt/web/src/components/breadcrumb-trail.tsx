import Link from 'next/link';
import {copyText} from '@/lib/editorial-copy';
import {SeoBreadcrumbs} from './seo-breadcrumbs';
export function BreadcrumbTrail({items}:{items:{name:string;path:string}[]}){
 return <><nav className="breadcrumbs" aria-label={copyText('ui.2a2b84d0d47890c0a040','Puslapio vieta')}>{items.map((item,index)=><span key={index}>{index>0&&<span aria-hidden="true">/ </span>}{index<items.length-1?<Link href={item.path}>{item.name}</Link>:<span>{item.name}</span>}</span>)}</nav><SeoBreadcrumbs items={items}/></>;
}
