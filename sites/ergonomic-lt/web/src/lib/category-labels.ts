
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
const names:Record<string,string>={www_chairs:copyText("ui.8d3911b916fd1c8627b3","Biuro kėdės"),www_desks:copyText("ui.02b35eb600c95a1dfd9b","Biuro stalai ir darbo vietos"),www_tables:copyText("ui.181c51afa82087fa0c38","Susitikimų ir poilsio zonų stalai"),www_softseating:copyText("ui.2aae3fc11b133bd029b3","Minkšti biuro ir poilsio baldai"),www_storage:copyText("ui.33890dee654f0761da06","Biuro spintos ir laikymo baldai"),www_panels:copyText("ui.86481156e24e9621b47a","Akustiniai biuro sprendimai"),www_beamseating:copyText("ui.87c7b7b149cd0f253fab","Laukiamojo kėdės ir sėdėjimo blokai"),www_officechairs:copyText("ui.2c33c8d8488d47c5c705","Biuro darbo kėdės"),www_workbenches:copyText("ui.d34705c53ff213a3508b","Bendri biuro darbo stalai")};
export function categoryLabel(id:string,fallback:string){return names[id]||fallback;}
