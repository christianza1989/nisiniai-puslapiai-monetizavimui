
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {HeaderCatalogMenu} from './header-catalog-menu';
import {selections} from '@/lib/seo-collections';
const navigation=[['/produktai/',copyText("ui.c975fc12a79f099f6af0","Katalogas")],...(process.env.LAUNCH_SITE==='true'?[]:[['/#darbo-erdves',copyText("ui.709c06b5fb67db22408a","Darbo erdvės")]]),['/gidai/',copyText("ui.37cc2cdf4f0e703772a6","Ergonomika")],[process.env.LAUNCH_SITE==='true'?'/kontaktai/':'/#kontaktai',copyText("ui.8e9f4267042683306efa","Kontaktai")]];
export function SiteHeader(){
  return <header className="site-header-matched">
    <Link href="/" className="header-wordmark" aria-label="Ergonomic.lt pradinis puslapis"><img src="/media/home-final/assets/ergonomic-logo.png" width={1700} height={210} alt="Ergonomic.lt — Ergonomic Furniture" decoding="async"/></Link>
    <nav className="header-navigation" aria-label={copyText("ui.fc6942e036f2e9555397","Pagrindinė navigacija")}>{navigation.map(([href,label])=>href==='/produktai/'?<HeaderCatalogMenu key={href} label={label} links={[{href:'/produktai/',label:copyText('ui.963c336d28898a6cc06b','Visi produktai')},...['ergonomines-kedes','ergonominiai-stalai','balansines-kedes','priedai'].map(id=>{const s=selections.find(s=>s.id===id)!;return {href:s.path,label:s.name};})]}/>:<Link key={href} href={href}>{label}</Link>)}</nav>
    <form className="header-search-form" role="search" action="/produktai/" method="get">
      <label className="header-search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6"/></svg>
        <input type="search" name="paieska" placeholder={copyText("ui.1c782d50e8e6381fb1ea","Ieškoti baldų")} aria-label={copyText("ui.1c782d50e8e6381fb1ea","Ieškoti baldų")} autoComplete="off" maxLength={200}/>
      </label>
    </form>
  </header>;
}
