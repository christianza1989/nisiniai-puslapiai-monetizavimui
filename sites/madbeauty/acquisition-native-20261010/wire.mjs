import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import recipient from './contracts/recipient-schemas.json' with {type:'json'};
import acquisition from './contracts/acquisition-schemas.json' with {type:'json'};
const ajv=new Ajv({strict:true,coerceTypes:false,useDefaults:false,removeAdditional:false});
addFormats(ajv);
const validators=Object.fromEntries(Object.entries({...acquisition.schemas,...recipient.schemas}).map(([name,schema])=>[name,ajv.compile(schema)]));
export function validateWire(name,value){
 if(!validators[name]||!validators[name](value))throw Error('invalid_wire_'+name);
 return value;
}
