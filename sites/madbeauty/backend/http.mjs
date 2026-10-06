import {createApiHandler as createCoreHandler} from './http-core.mjs';
import {prepareMedia,readMedia} from './media.mjs';
export const createApiHandler=(store,options={})=>createCoreHandler(store,{...options,media:{prepareMedia,readMedia}});
