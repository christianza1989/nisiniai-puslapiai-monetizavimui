import { parentPort, workerData } from 'node:worker_threads';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { cart, key } from './fixtures.mjs';
const db = new NodeDatabase(workerData.file),
  service = new CommerceService(db);
parentPort.postMessage({ ready: true });
parentPort.once('message', async () => {
  try {
    const result = await service.createOrder('store_a', 'sandbox', cart(), key(workerData.key));
    parentPort.postMessage({ ok: true, id: result.order.id });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error.message });
  } finally {
    db.close();
    parentPort.close();
  }
});
