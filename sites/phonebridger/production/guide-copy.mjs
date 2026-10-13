export const guidePublicationNote='PhoneBridger is published by MB Memocasting. This guide describes the current beta; the browser demonstration does not connect to your physical phone.';
export function updateGuidePublication(file,input){
 if(!/^guides\/(getting-started|usb-wifi|android-permissions|phone-position)\/index\.html$/.test(file))return input;
 if(!input.includes('MB Pinet</a>')||!input.includes('This private preview records a prepared editorial edition; it is not a past public publication.'))throw Error('Expected guide publication baseline missing.');
 return input.replace('MB Pinet</a>','MB Memocasting</a>').replace('Prepared 6 October 2026','Published 6 October 2026').replace('Reviewed 2026-10-06','Reviewed 2026-10-13')
  .replace('<p class="guide-review-note">',`<p>${guidePublicationNote}</p><p class="guide-review-note">`)
  .replace('This private preview records a prepared editorial edition; it is not a past public publication.','Public attribution and publication wording reviewed on 13 October 2026.');
}
