import {createApiHandler as createCoreHandler} from './http-core.mjs';
import {prepareMedia,readMedia,discardMedia} from './media.mjs';
export const createApiHandler=(store,options={})=>createCoreHandler(store,{...options,media:{prepareMedia,readMedia,discardMedia:asset=>discardMedia(store,asset)}});
