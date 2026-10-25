import { requireValue, integer, identifier, normalizeChoices } from './validation.mjs';

const record = (v) => v && typeof v === 'object' && !Array.isArray(v);
const safeId = (v) => identifier(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
const text = (v, max, multiline = false) =>
  typeof v === 'string' &&
  v.length <= max &&
  !(multiline ? /[\x00-\x08\x0b-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(v);
export { normalizeChoices, cartLineKey } from './validation.mjs';
export function productContent(input, countries) {
  const out = {};
  if (input.content !== undefined) {
    const c = input.content;
    requireValue(
      record(c) &&
        text(c.summary ?? '', 600, true) &&
        text(c.description ?? '', 16000, true) &&
        text(c.contents ?? '', 5000, true) &&
        text(c.seoTitle ?? '', 160) &&
        text(c.seoDescription ?? '', 320),
      'invalid_product_content',
    );
    requireValue(
      Array.isArray(c.images ?? []) && (c.images ?? []).length <= 24,
      'invalid_product_images',
    );
    const images = (c.images ?? []).map((m) => {
      requireValue(
        safeId(m?.id) &&
          text(m.alt, 300) &&
          m.alt.trim().length >= 3 &&
          integer(m.width, 1, 10000) &&
          integer(m.height, 1, 10000) &&
          typeof m.src === 'string' &&
          /^\/(?:(?:images|memocasting-homepage\/v1\/media)\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpg|jpeg)|prekyba\/catalog-media\/[a-zA-Z0-9_-]+)$/.test(
            m.src,
          ) &&
          !m.src.includes('..'),
        'invalid_product_images',
      );
      return {
        id: m.id,
        src: m.src,
        alt: m.alt.trim(),
        width: m.width,
        height: m.height,
        ...(m.choices ? { choices: normalizeChoices(m.choices) } : {}),
      };
    });
    requireValue(new Set(images.map((m) => m.id)).size === images.length, 'invalid_product_images');
    out.content = {
      summary: (c.summary ?? '').trim(),
      description: (c.description ?? '').trim(),
      contents: (c.contents ?? '').trim(),
      seoTitle: (c.seoTitle ?? '').trim(),
      seoDescription: (c.seoDescription ?? '').trim(),
      images,
    };
  }
  if (input.optionGroups !== undefined) {
    requireValue(
      Array.isArray(input.optionGroups) && input.optionGroups.length <= 8,
      'invalid_product_options',
    );
    out.optionGroups = input.optionGroups.map((g) => {
      requireValue(
        safeId(g?.id) &&
          text(g.label, 100) &&
          g.label.trim() &&
          Array.isArray(g.values) &&
          g.values.length >= 1 &&
          g.values.length <= 30,
        'invalid_product_options',
      );
      const values = g.values.map((v) => {
        requireValue(
          safeId(v?.id) &&
            text(v.label, 100) &&
            v.label.trim() &&
            typeof v.enabled === 'boolean' &&
            record(v.prices) &&
            Object.entries(v.prices).every(
              ([country, price]) => countries.includes(country) && integer(price, 0),
            ) &&
            (v.imageId === undefined ||
              (out.content?.images ?? []).some((m) => m.id === v.imageId)) &&
            (v.color === undefined || /^#[0-9a-fA-F]{6}$/.test(v.color)) &&
            integer(v.extraWeightGrams ?? 0, 0, 100000),
          'invalid_product_options',
        );
        let pack;
        if (v.package) {
          requireValue(
            integer(v.package.weightGrams, 1, 100000) &&
              Array.isArray(v.package.dimensionsMm) &&
              v.package.dimensionsMm.length === 3 &&
              v.package.dimensionsMm.every((n) => integer(n, 1, 3000)),
            'invalid_package',
          );
          pack = { weightGrams: v.package.weightGrams, dimensionsMm: [...v.package.dimensionsMm] };
        }
        // Additional physical contents need measured packed dimensions before sale.
        requireValue(!v.enabled || !(v.extraWeightGrams > 0) || pack, 'option_package_required');
        if (v.enabled && pack)
          requireValue(
            input.package &&
              pack.weightGrams >= input.package.weightGrams + (v.extraWeightGrams ?? 0) &&
              pack.dimensionsMm.every((n, i) => n >= input.package.dimensionsMm[i]),
            'invalid_package',
          );
        return {
          id: v.id,
          label: v.label.trim(),
          enabled: v.enabled,
          prices: { ...v.prices },
          ...(v.imageId ? { imageId: v.imageId } : {}),
          ...(v.color ? { color: v.color } : {}),
          ...(v.extraWeightGrams ? { extraWeightGrams: v.extraWeightGrams } : {}),
          ...(pack ? { package: pack } : {}),
        };
      });
      requireValue(
        new Set(values.map((v) => v.id)).size === values.length &&
          values.some((v) => v.id === g.defaultValue && v.enabled),
        'invalid_product_options',
      );
      return { id: g.id, label: g.label.trim(), defaultValue: g.defaultValue, values };
    });
    requireValue(
      new Set(out.optionGroups.map((g) => g.id)).size === out.optionGroups.length &&
        out.optionGroups.filter((g) => g.values.some((v) => v.package)).length <= 1,
      'invalid_product_options',
    );
  }
  for (const m of out.content?.images ?? [])
    for (const [id, value] of Object.entries(m.choices ?? {}))
      requireValue(
        out.optionGroups?.some((g) => g.id === id && g.values.some((v) => v.id === value)),
        'invalid_product_images',
      );
  return out;
}
export function configureProduct(p, country, choices) {
  const selected = normalizeChoices(choices),
    groups = (p.optionGroups ?? []).filter((g) =>
      g.values.some((v) => v.id === g.defaultValue && integer(v.prices[country], 0)),
    );
  requireValue(
    Object.keys(selected).every((id) => groups.some((g) => g.id === id)),
    'product_option_unavailable',
    409,
  );
  let extra = 0,
    pack = p.package,
    image,
    labels = [];
  for (const g of groups) {
    const v = g.values.find((v) => v.id === (selected[g.id] ?? g.defaultValue));
    requireValue(v?.enabled && integer(v.prices[country], 0), 'product_option_unavailable', 409);
    extra += v.prices[country];
    labels.push(g.label + ': ' + v.label);
    if (v.package) {
      requireValue(
        v.package.weightGrams >= p.package.weightGrams + (v.extraWeightGrams ?? 0) &&
          v.package.dimensionsMm.every((n, i) => n >= p.package.dimensionsMm[i]),
        'invalid_package',
      );
      pack = v.package;
    }
    if (v.imageId) image = p.content?.images.find((m) => m.id === v.imageId);
  }
  const complete = Object.fromEntries(groups.map((g) => [g.id, selected[g.id] ?? g.defaultValue]));
  const combinations = (p.content?.images ?? [])
    .filter(
      (m) =>
        Object.keys(m.choices ?? {}).length &&
        Object.entries(m.choices).every(([id, v]) => complete[id] === v),
    )
    .sort((a, b) => Object.keys(b.choices).length - Object.keys(a.choices).length);
  return { extra, package: pack, labels, image: combinations[0] ?? image ?? p.content?.images[0] };
}
