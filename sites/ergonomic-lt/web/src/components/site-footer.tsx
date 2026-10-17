
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {ArrowUp,ArrowUpRight} from 'lucide-react';
import {BrandLogo} from './brand-logo';
export function SiteFooter(){
  return <footer className="site-footer footer-unified">
    <div className="footer-grid">
      <div className="footer-brand-section">
        <Link href="/" className="footer-brand" aria-label="Ergonomic.lt pradinis puslapis"><BrandLogo/></Link>
        <p>{copyText("ui.b9a0dd3c1fa4c662bc7b","Baldai darbo erdvei.")}<br/>{copyText("ui.1985e9514469a797ead5","Gamyba ir prekyba.")}</p>
        <Link href="/uzklausa/" className="footer-inquiry">{copyText("ui.64d9f0f8dbc217fd5803","Pateikti užklausą ")}<ArrowUpRight size={16} aria-hidden="true"/></Link>
      </div>
      <nav aria-labelledby="footer-catalog-title">
        <h2 id="footer-catalog-title">{copyText("ui.1e54fd1867276164f3be","Baldų katalogas")}</h2>
        <div className="footer-links">
          <Link href="/ergonominiai-stalai/">{copyText("ui.3dd3ef0abc8031398875","Ergonominiai stalai")}</Link>
          <Link href="/ergonomines-kedes/">{copyText("ui.7d4ea45051b9b7ee93fb","Ergonominės kėdės")}</Link>
          <Link href="/shop/balansines-kedes/">{copyText("ui.2f9be6b828d7ed22ff1e","Balansinės kėdės")}</Link>
          <Link href="/shop/priedai/">{copyText("ui.76d2374fe6a40119e102","Priedai darbo vietai")}</Link>
          <Link href="/biuro-kedes/">{copyText("ui.8d3911b916fd1c8627b3","Biuro kėdės")}</Link>
          <Link href="/produktai/">{copyText("ui.7302a7973069a1bec31a","Visas katalogas ")}<ArrowUpRight size={14} aria-hidden="true"/></Link>
        </div>
      </nav>
      <nav aria-labelledby="footer-guides-title">
        <h2 id="footer-guides-title">{copyText("ui.9e91e7d8ee7ea79ceb7b","Apie ergonomiką")}</h2>
        <div className="footer-links">
          <Link href="/ergonomika-darbo-vietoje-reikalavimai/">{copyText("ui.34ac01c0ffd0e67f5754","Ergonomika darbo vietoje")}</Link>
          <Link href="/aktyvus-sedejimas/">{copyText("ui.120cdeca91519b6a7112","Aktyvus sėdėjimas")}</Link>
          <Link href="/mokykliniai-baldai/">{copyText("ui.528358679b323de9fb68","Mokykliniai baldai")}</Link>
          <Link href="/steam-baldai/">{copyText("ui.ed92ac5b6916ad71c6a9","STEAM baldai")}</Link>
          <Link href="/biuro-baldu-gamyba/">{copyText("ui.ead37a7f7845daa955e8","Biuro baldų gamyba")}</Link>
          <Link href="/gidai/">{copyText("ui.cb2ceebe29818d7ebf11","Gidai ir patarimai")}</Link>
          <Link href="/kolekcijos/">{copyText("ui.4c0f1fbe3ba0895c5a4a","Produktų kolekcijos")}</Link>
        </div>
      </nav>
      <div className="footer-contacts">
        <h2 id="kontaktai-0">{copyText("ui.f30832526b86f2a53ca5","KONTAKTAI")}</h2>
        <p className="footer-company" id="uab-a-z-prekyba-1">UAB A-Z Prekyba</p>
        <address><span>Buivydiškių g. 22, Vilnius, LT- 07195</span><a href="tel:+37069199833">+37069199833</a><a href="mailto:ergonomic@azprekyba.lt">ergonomic@azprekyba.lt</a></address>
        <a className="footer-primary-email" href="mailto:info@ergonomic.lt">info@ergonomic.lt <ArrowUpRight size={14} aria-hidden="true"/></a>
      </div>
    </div>
    <div className="footer-end">
      <span className="footer-copyright">© {new Date().getFullYear()} Ergonomic.lt</span>
      <div className="footer-social"><a href="https://www.facebook.com/ergonomic.lt">{copyText("ui.d41f5b4977ee05c6b61b","Facebook")}</a><a href="https://www.instagram.com/ergonomic.lt/">{copyText("ui.bad57ef7837c8e6bf99c","Instagram")}</a></div>
      <Link href="/privatumas/">{copyText("ui.2183ce763326fa12b6ec","Privatumas")}</Link>
      {process.env.LAUNCH_SITE!=='true'&&<Link href="/admin/">{copyText("ui.a2358bd9d464f6305cc0","Administravimas")}</Link>}
      <a className="footer-back-top" href="#top" aria-label={copyText("ui.05befaf9293a8faa438c","Grįžti į puslapio viršų")}><ArrowUp size={20} aria-hidden="true"/></a>
    </div>
  </footer>;
}
