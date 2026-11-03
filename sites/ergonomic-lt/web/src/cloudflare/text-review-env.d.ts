interface ErgonomicBoundaryEnv {REFERENCE_ASSETS?:Fetcher;TEXT_REVIEW_DB?:D1Database;PUBLIC_CUSTOMER_BOUNDARY?:string;SESSION_SECRET?:string;PUBLIC_CONFIGURATION_SECRET?:string;PRIVATE_SOURCE_READ_TOKEN?:string;PRIVATE_CLIENT_CHUNKS?:string;PUBLIC_CLIENT_CHUNKS?:string;}
interface Env extends ErgonomicBoundaryEnv {}
declare namespace Cloudflare {interface Env extends ErgonomicBoundaryEnv {}}
