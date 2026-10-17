import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {workspaceFocusables} from '../src/lib/fullscreen-workspace';

test('full-screen focus excludes closed disclosure links even when Chromium gives them rectangles',()=>{
 const {document}=parseHTML('<div id="workspace"><button>Close</button><button hidden>Full screen</button><details><summary>Documents</summary><a href="/file.pdf">Hidden file</a></details><details open><summary>Finishes</summary><select><option>Valencia</option></select></details><div inert><button>Inactive</button></div></div>');
 const root=document.getElementById('workspace')!;
 for(const element of Array.from(root.querySelectorAll<HTMLElement>('*')))element.getClientRects=()=>({length:element.hasAttribute('hidden')?0:1}) as DOMRectList;
 assert.deepEqual(workspaceFocusables(root).map(el=>el.tagName),['BUTTON','SUMMARY','SUMMARY','SELECT']);
 root.querySelector('details')!.setAttribute('open','');
 assert.equal(workspaceFocusables(root).filter(el=>el.tagName==='A').length,1);
});
