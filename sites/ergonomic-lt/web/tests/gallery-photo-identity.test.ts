import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galleryPhotoIdentity,uniqueGalleryPhotos} from '../src/lib/gallery-photo-identity';
import {optimizedProductImage} from '../src/lib/product-media';
import galleries from '../content/configuration-galleries.json';
import {galleryImages} from '../src/components/product-gallery';
const airi=galleries['29969204'];

test('AIRI identical uploads collapse across supplier URLs, resize queries and local WebP aliases',()=>{
 assert.equal(galleryPhotoIdentity(airi[0]),galleryPhotoIdentity(airi[1]));
 assert.equal(galleryPhotoIdentity(airi[2]),galleryPhotoIdentity(airi[3]));
 assert.notEqual(galleryPhotoIdentity(airi[0]),galleryPhotoIdentity(airi[2]));
 const primary=optimizedProductImage(airi[0]);
 assert.equal(galleryPhotoIdentity(primary),galleryPhotoIdentity(airi[1]+'?width=160'));
 const photos=galleryImages(primary,airi);
 assert.equal(photos[0],primary);assert.equal(photos.length,8);
 assert(photos.some(src=>galleryPhotoIdentity(src)===galleryPhotoIdentity(airi[2])));
});
test('Unverified photographs remain distinct and order is retained',()=>{
 assert.deepEqual(uniqueGalleryPhotos(['/custom/front.jpg','/custom/side.jpg','/custom/front.jpg',null]),['/custom/front.jpg','/custom/side.jpg']);
});
