import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {ProductDescription} from '../src/components/product-description';
import {productDescriptionBlocks} from '../src/lib/product-description';
import {studioDescriptionParagraphs} from '../src/lib/product-studio';

test('Product descriptions render headings, both bullet markers, and blank-line paragraphs',()=>{
 const text='Įžanga.\r\n\r\n## Konstrukcija\r\n* Medinis rėmas\r\n- Minkšta sėdynė\r\n\r\n### Apdaila\r\nPirma eilutė\r\nantra eilutė.\r\n\r\nKita pastraipa.';
 const {document}=parseHTML(renderToStaticMarkup(<ProductDescription text={text}/>));
 assert.equal(document.querySelector('h2')?.textContent,'Konstrukcija');
 assert.equal(document.querySelector('h3')?.textContent,'Apdaila');
 assert.deepEqual([...document.querySelectorAll('li')].map(e=>e.textContent),['Medinis rėmas','Minkšta sėdynė']);
 assert.deepEqual([...document.querySelectorAll('p')].map(e=>e.textContent),['Įžanga.','Pirma eilutė antra eilutė.','Kita pastraipa.']);
 assert.deepEqual(studioDescriptionParagraphs(text),[text]);
});

test('Description text never creates HTML, scripts, links, or event handlers',()=>{
 const text='## <img src=x onerror=alert(1)>\n* <script>alert(1)</script>\n\n<a href="javascript:alert(1)">Nuoroda</a>';
 const html=renderToStaticMarkup(<ProductDescription text={text}/>);
 const {document}=parseHTML(html);
 assert.equal(document.querySelectorAll('img,script,a,[onerror]').length,0);
 assert.equal(document.querySelector('h2')?.textContent,'<img src=x onerror=alert(1)>');
 assert.equal(document.querySelector('li')?.textContent,'<script>alert(1)</script>');
});

test('Plain descriptions keep their text, paragraph structure, and lead styling',()=>{
 const text='Senas aprašymas. Matmuo 60 * 40, modelis ABC-12.\nViena eilutė.';
 assert.deepEqual(productDescriptionBlocks(text),[{type:'paragraph',text}]);
 const {document}=parseHTML(renderToStaticMarkup(<ProductDescription text={text} lead/>));
 assert.equal(document.querySelectorAll('p').length,1);
 assert.equal(document.querySelectorAll('h2,h3,ul').length,0);
 assert.equal(document.querySelector('p')?.className,'studio-intro-lead');
 assert.equal(document.querySelector('p')?.textContent,text);
 const long='Tai yra senas aprašymo sakinys. '.repeat(90);
 assert(studioDescriptionParagraphs(long).length>1);
});
