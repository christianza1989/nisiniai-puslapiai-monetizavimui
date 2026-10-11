// A link chooses the booking destination; it does not import external availability.
export function treatwellSalonUrl(value){
 if(typeof value!=='string'||value.length>500||/[\s\\\x00-\x1f]/.test(value))return null;
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||!['treatwell.lt','www.treatwell.lt'].includes(u.hostname)||u.port||u.username||u.password||u.search||u.hash||!/^\/salonas\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(u.pathname))return null;
  return 'https://www.treatwell.lt'+u.pathname.replace(/\/?$/,'/');
 }catch{return null;}
}
export function bookingChannel(org){
 const external=org?.bookingProvider==='treatwell';
 return {bookingProvider:external?'treatwell':'madbeauty',bookingUrl:external?treatwellSalonUrl(org.bookingUrl):null,nativeCalendarEnabled:!external,calendarState:external?'external':'current'};
}
