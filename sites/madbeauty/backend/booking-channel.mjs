import {bookingChannel,treatwellSalonUrl} from '../prototype/public/booking-channel-model.mjs';
import {reject} from './primitives.mjs';
export {bookingChannel};
export function channelInput(input){
 const bookingProvider=input.bookingProvider??'madbeauty';
 if(!['madbeauty','treatwell'].includes(bookingProvider))reject('INVALID_INPUT','Pasirink Madbeauty arba Treatwell rezervavimą.');
 const bookingUrl=bookingProvider==='treatwell'?treatwellSalonUrl(input.bookingUrl):null;
 if(bookingProvider==='treatwell'&&!bookingUrl)reject('INVALID_INPUT','Įvesk visą HTTPS Treatwell salono nuorodą, be papildomų parametrų: https://www.treatwell.lt/salonas/salono-pavadinimas/.');
 return {bookingProvider,bookingUrl};
}
export function requireNativeCalendar(org){
 if(!bookingChannel(org).nativeCalendarEnabled)reject('EXTERNAL_BOOKING','Šis salonas priima rezervacijas per Treatwell. Atidaryk jo profilyje esančią rezervavimo nuorodą.',409);
}
export function changeBookingChannel(d,org,input,now){
 const next=channelInput(input),previous=bookingChannel(org);
 if(input.version!==org.version)reject('VERSION_CONFLICT','Nustatymai pasikeitė. Atnaujink puslapį ir pasirink iš naujo.',409);
 if(previous.bookingProvider!==next.bookingProvider){
  if(d.bookings.some(b=>b.organizationId===org.id&&b.status==='confirmed'&&Date.parse(b.endAt)>now))reject('BOOKING_CHANNEL_CONFLICT','Pirmiausia užbaik arba sutvarkyk būsimus Madbeauty vizitus. Jie automatiškai neperkeliami į Treatwell.',409);
  if(d.holds.some(h=>h.organizationId===org.id&&h.state==='held'&&Date.parse(h.expiresAt)>now))reject('BOOKING_CHANNEL_CONFLICT','Klientas šiuo metu renkasi laiką. Palauk, kol jo pasirinkimas bus užbaigtas arba baigsis jo galiojimas.',409);
  if(d.waitlist.some(w=>w.organizationId===org.id&&!['closed','expired','booked'].includes(w.state)))reject('BOOKING_CHANNEL_CONFLICT','Pirmiausia uždaryk aktyvius Madbeauty laukiančiųjų pageidavimus.',409);
  if(next.bookingProvider==='madbeauty'&&input.nativeScheduleConfirmed!==true)reject('SCHEDULE_CONFIRMATION_REQUIRED','Patvirtink, kad Madbeauty grafikas atnaujintas pagal visus tavo vizitus, o Treatwell registracija išjungta. Kalendoriai automatiškai nesinchronizuoja.',409);
 }
 Object.assign(org,next,{version:org.version+1});
 return {...bookingChannel(org),version:org.version};
}
