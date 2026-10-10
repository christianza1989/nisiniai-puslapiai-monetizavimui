import {createAppServer} from '../prototype/app-server.mjs';
const server=createAppServer({enabled:true,contentPackagePath:'C:/Users/Lenovo/Documents/Nisiniai_puslapiai/madbeauty-next60-20261009/sites/madbeauty/content-next60-20261009/release/content-package.json'});
server.listen(8836,'127.0.0.1',()=>console.log('Madbeauty services preview http://127.0.0.1:8836/paslaugos'));
