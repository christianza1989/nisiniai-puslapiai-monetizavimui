
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {CustomFurniturePage} from '@/components/custom-furniture-page';
import {pageMetadata} from '@/lib/metadata';
export const metadata=pageMetadata(copyText("ui.b590deaa13522891e6f3","STEAM baldai pagal užsakymą"),'/steam-baldai/',copyText("ui.cc46abce83884733c5fb","STEAM stalai, spintos ir kiti kietieji mokymo erdvių baldai pagal individualų užsakymą."));
export default function Page(){return <CustomFurniturePage steam/>;}
