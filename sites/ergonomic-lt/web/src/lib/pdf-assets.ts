import {readFileSync} from 'node:fs';
import path from 'node:path';
export async function pdfAsset(asset:string):Promise<Buffer> {
  return readFileSync(path.join(process.cwd(),'public',asset));
}
