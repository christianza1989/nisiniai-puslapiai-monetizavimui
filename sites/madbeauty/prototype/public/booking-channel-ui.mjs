import {bookingChannel} from './booking-channel-model.mjs';
import {esc,link,field} from './ui.mjs';
export function externalBookingLink(org,className='button accent'){
 const channel=bookingChannel(org);
 return channel.bookingUrl?`<a class="${esc(className)}" href="${esc(channel.bookingUrl)}" target="_blank" rel="noopener noreferrer">Rezervuoti per Treatwell</a>`:'<p class="hint">Rezervavimo nuoroda šiuo metu nepasiekiama.</p>';
}
export function bookingChannelFields(org={}){
 const c=bookingChannel(org);
 return `<fieldset class="booking-channel-options"><legend>Kur klientai rezervuos vizitus?</legend><label class="booking-channel-option"><input type="radio" name="bookingProvider" value="madbeauty" ${c.nativeCalendarEnabled?'checked':''}><span><strong>Madbeauty</strong><span>Valdyk grafiką ir priimk rezervacijas čia.</span></span></label><label class="booking-channel-option"><input type="radio" name="bookingProvider" value="treatwell" ${!c.nativeCalendarEnabled?'checked':''}><span><strong>Treatwell</strong><span>Klientą nukreipsime į tavo salono rezervavimo puslapį. Madbeauty kalendorius bus išjungtas.</span></span></label><div class="booking-channel-url">${field('Tavo Treatwell salono nuoroda','bookingUrl',c.bookingUrl||'','url','maxlength="500" data-required-if="bookingProvider:treatwell" placeholder="https://www.treatwell.lt/salonas/salono-pavadinimas/"')}<p class="hint">Įklijuok viešą salono puslapio nuorodą. Prisijungimo duomenų nereikia.</p></div></fieldset>`;
}
export function bookingChannelSettings(org){
 const c=bookingChannel(org);
 return `<section class="booking-channel-settings"><h2>Vienas rezervavimo kalendorius</h2><p>Pasirink sistemą, kurioje priimi klientų vizitus. Tavo profilis ir darbai Madbeauty lieka matomi abiem atvejais.</p><p class="booking-channel-status" role="status"><strong>Aktyvus rezervavimas: ${c.nativeCalendarEnabled?'Madbeauty':'Treatwell'}</strong><span>${c.nativeCalendarEnabled?'Laikai ir vizitai valdomi Madbeauty.':'Madbeauty laikai ir naujos rezervacijos išjungti.'}</span></p><form id="booking-channel-settings" class="panel">${bookingChannelFields(org)}${!c.nativeCalendarEnabled?'<label class="booking-channel-native-confirm check-label"><input type="checkbox" name="nativeScheduleConfirmed" data-required-if="bookingProvider:madbeauty"><span>Grįžtant prie Madbeauty: patikrinau grafiką ir visus užimtus laikus, o Treatwell registraciją išjungiau.</span></label>':''}<p class="hint">Esami vizitai ir jų istorija neperkeliami. Keisti sistemą galima tik sutvarkius būsimus Madbeauty vizitus, aktyvius laiko pasirinkimus ir laukiančiųjų pageidavimus.</p><button class="button accent">Išsaugoti rezervavimo būdą</button></form></section>`;
}
export function externalCalendarView(org){
 return `<section class="external-calendar"><h2>Tavo rezervacijos — Treatwell</h2><p>Čia nėra antro kalendoriaus. Laikus ir vizitus valdyk savo Treatwell paskyroje, o Madbeauty klientai rezervuos per tavo salono nuorodą.</p>${externalBookingLink(org)}<p class="hint">Treatwell vizitų Madbeauty neskaito. Ankstesnių Madbeauty vizitų istorija išsaugota klientų kortelėse ir ataskaitose.</p>${link('/meistrui/integracijos','Keisti rezervavimo būdą','link')}</section>`;
}
