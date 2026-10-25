// Isolate only siblings of the workspace's ancestor chain, preserving existing
// inert states and restoring every value when the full-screen session ends.
export function isolateWorkspace(root:HTMLElement){
 const changed:{element:HTMLElement;inert:boolean}[]=[];
 let path:HTMLElement=root;
 while(path.parentElement){
  for(const sibling of Array.from(path.parentElement.children))if(sibling!==path&&sibling instanceof HTMLElement){changed.push({element:sibling,inert:sibling.inert});sibling.inert=true;}
  path=path.parentElement;
 }
 return()=>{for(const {element,inert} of changed)element.inert=inert;};
}
export function workspaceFocusables(root:HTMLElement){
 return Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],summary,[tabindex="0"]')).filter(el=>{
  if(!el.getClientRects().length||el.closest('[inert]'))return false;
  // Closed disclosure descendants can retain layout rectangles in Chromium;
  // only their own summary participates in keyboard navigation.
  let parent=el.parentElement;
  while(parent&&parent!==root){if(parent.tagName==='DETAILS'&&!parent.hasAttribute('open')&&!parent.querySelector(':scope > summary')?.contains(el))return false;parent=parent.parentElement;}
  return true;
 });
}
