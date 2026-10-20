import {createHash} from 'node:crypto';
import index from '../../content/configurator-additional-index.json';
import catalog from '../../content/configurator-catalog.json';
import expanded from '../../content/configurator-expanded.json';
import pilot from '../../content/configurator-pilot.json';

// Conservative release-wide binding: even a consistent replacement of a
// runtime and its index invalidates old reviews. Shard bytes remain verified
// independently by the loader against the content-addressed index SHA.
export const technicalSources={index,catalog,expanded,pilot};
export function technicalSourceHash(sources:unknown){return createHash('sha256').update(JSON.stringify(sources)).digest('hex');}
export const currentTechnicalSourceHash=technicalSourceHash(technicalSources);
