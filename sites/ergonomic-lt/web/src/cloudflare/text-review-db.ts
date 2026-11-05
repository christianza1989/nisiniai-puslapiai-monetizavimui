import {env} from 'cloudflare:workers';
import type {SqlValue,SqlCommand} from '../lib/sql-types';
const database=()=>env.TEXT_REVIEW_DB||env.DB;
export async function dbAll<T>(sql:string,...params:SqlValue[]):Promise<T[]>{return(await database().prepare(sql).bind(...params).all<T>()).results;}
export async function dbAtomic(commands:SqlCommand[]){return database().batch(commands.map(c=>database().prepare(c.sql).bind(...c.params||[])));}
