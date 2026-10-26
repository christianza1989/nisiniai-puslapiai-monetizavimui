import fs from 'node:fs/promises';
import path from 'node:path';
import { requireValue, CommerceError } from './validation.mjs';
import { hashBytes } from './private-storage.mjs';
export class NodePrivateStorage {
  constructor(root) {
    this.root = path.resolve(root);
  }
  async target(key) {
    requireValue(
      /^[a-zA-Z0-9_-]+\/(?:private\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf|catalog\/img_[a-f0-9]{64}(?:_t192)?\.webp)$/.test(
        key,
      ),
      'private_key_invalid',
      500,
    );
    await fs.mkdir(this.root, { recursive: true });
    const rootInfo = await fs.lstat(this.root);
    requireValue(!rootInfo.isSymbolicLink(), 'private_storage_invalid', 500);
    let target = this.root;
    for (const part of key.split('/')) {
      target = path.join(target, part);
      try {
        requireValue(!(await fs.lstat(target)).isSymbolicLink(), 'private_storage_invalid', 500);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    requireValue(target.startsWith(this.root + path.sep), 'private_key_invalid', 500);
    return target;
  }
  async put(key, bytes, hash) {
    const target = await this.target(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      requireValue((await hashBytes(await this.get(key))) === hash, 'private_file_conflict', 409);
    }
  }
  async get(key) {
    try {
      const target = await this.target(key);
      const stat = await fs.stat(target);
      requireValue(stat.size > 0 && stat.size <= 2 * 1024 * 1024, 'private_file_invalid', 502);
      return new Uint8Array(await fs.readFile(target));
    } catch (error) {
      if (error.code === 'ENOENT') throw new CommerceError('private_file_missing', 404);
      throw error;
    }
  }
}
