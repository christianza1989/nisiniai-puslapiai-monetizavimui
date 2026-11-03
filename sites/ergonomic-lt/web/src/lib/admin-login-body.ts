/** Bounded progressive login: a cold browser must POST, never put a password in a URL. */
export async function adminLoginBody(req:Request){
 const type=req.headers.get('content-type')||'',form=type.includes('application/x-www-form-urlencoded');
 if(!form&&!type.includes('application/json'))throw Error('Neleistinas prisijungimo formatas.');
 const reader=req.body?.getReader();if(!reader)throw Error('Tuščia užklausa.');
 let length=0;const parts:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2000){await reader.cancel();throw Error('Užklausa per didelė.');}parts.push(value);}
 const body=new TextDecoder().decode(Buffer.concat(parts)),parsed=form?Object.fromEntries(new URLSearchParams(body)):JSON.parse(body);
 if(typeof parsed?.password!=='string'||parsed.password.length>200)throw Error('Neteisingas slaptažodis.');
 return {password:parsed.password as string,form};
}
