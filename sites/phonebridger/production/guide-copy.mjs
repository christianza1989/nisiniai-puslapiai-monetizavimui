export const guidePublicationNote='PhoneBridger is published by MB Memocasting. This guide describes the current beta; the browser demonstration does not connect to your physical phone.';
export const editorialCopyPairs=[
 ['The organizational attribution for these guides is MB Pinet, the operator named in the shared project configuration.','The organizational attribution for these guides is MB Memocasting, the operator of PhoneBridger.'],
 ['These guides were prepared and checked on 6 October 2026 for the beta described on Downloads. This private preview is not evidence of public publication. Before launch, the real first publication date and any later meaningful review must be recorded; changing a calendar date alone does not update the guidance.','These guides were first published on 6 October 2026 for the beta described on Downloads. Their operator attribution and publication wording were reviewed on 13 October 2026. Original publication dates are retained; a calendar change alone does not update the product guidance.'],
 ['Paid orders, production customer accounts and native file dragging are not activated by the website.','The website supports customer accounts and paid orders. Purchasing records an entitlement in your account; it does not supply an activation key for the current beta. Native file dragging is planned and remains unavailable in this release.']
];
export function updateGuidePublication(file,input){
 if(file==='editorial/index.html'){let text=input;for(const [before,after]of editorialCopyPairs){if(!text.includes(before))throw Error('Expected editorial publication baseline missing.');text=text.replace(before,after);}return text;}
 if(!/^guides\/(getting-started|usb-wifi|android-permissions|phone-position)\/index\.html$/.test(file))return input;
 if(!input.includes('MB Pinet</a>')||!input.includes('This private preview records a prepared editorial edition; it is not a past public publication.'))throw Error('Expected guide publication baseline missing.');
 return input.replace('MB Pinet</a>','MB Memocasting</a>').replace('Prepared 6 October 2026','Published 6 October 2026').replace('Reviewed 2026-10-06','Reviewed 2026-10-13')
  .replace('<p class="guide-review-note">',`<p>${guidePublicationNote}</p><p class="guide-review-note">`)
  .replace('This private preview records a prepared editorial edition; it is not a past public publication.','Public attribution and publication wording reviewed on 13 October 2026.');
}
