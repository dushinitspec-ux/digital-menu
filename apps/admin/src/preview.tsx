import { createRenderer, type Renderer } from '@dm/renderer';
import type { CategoryView, Currency, Locale, MediaView, Orientation, SceneSettings, SceneView, TemplateId } from '@dm/shared';
import { useEffect, useRef } from 'react';
import type { Catalog, Media } from './api';

/** Живое превью: тот же рендерер, что и на телевизоре, только в маленьком окне. */
export function ScenePreview({ scene, currency, locale, orientation = 'landscape' }: { scene: SceneView; currency: Currency; locale: Locale; orientation?: Orientation }) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<Renderer | null>(null);

  useEffect(() => {
    renderer.current = createRenderer(host.current!, { orientation });
    return () => {
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    renderer.current?.setOrientation(orientation);
  }, [orientation]);

  useEffect(() => {
    const timer = setTimeout(() => void renderer.current?.show(scene, { currency, locale }), 150);
    return () => clearTimeout(timer);
  }, [scene, currency, locale]);

  return <div ref={host} className={`preview preview-${orientation}`} />;
}

const mediaView = (m: Media): MediaView => ({ id: m.id, kind: m.kind, url: m.url, thumbUrl: m.thumbUrl, width: m.width, height: m.height });

/** Собирает сцену из несохранённых настроек и каталога — превью обновляется без запросов к серверу. */
export function buildLocalScene(
  id: string,
  name: string,
  template: TemplateId,
  settings: SceneSettings,
  catalog: Catalog,
  media: Media[],
  locale: Locale,
): SceneView {
  const collator = new Intl.Collator(locale);
  const categories: CategoryView[] = settings.categoryIds
    .map((cid) => catalog.categories.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => {
      const tobacco = c.compliance === 'tobacco';
      const items = catalog.items
        .filter((i) => i.categoryId === c.id && !i.hidden)
        .sort((a, b) => a.sort - b.sort)
        .map((i) => ({
          id: i.id,
          name: i.name,
          nameSecondary: i.nameSecondary,
          description: i.description,
          portion: i.portion,
          price: i.price,
          variants: i.variants,
          badges: tobacco ? [] : i.badges,
          image: !tobacco && i.imageUrl ? { id: i.imageId!, kind: 'image' as const, url: i.imageUrl, thumbUrl: i.imageUrl, width: null, height: null } : null,
          soldOut: i.soldOut,
        }));
      if (tobacco) items.sort((a, b) => collator.compare(a.name, b.name));
      return { id: c.id, name: c.name, nameSecondary: c.nameSecondary, compliance: c.compliance, variantLabels: c.variantLabels, items };
    });
  const bg = settings.backgroundMediaId ? media.find((m) => m.id === settings.backgroundMediaId && m.status === 'ready') : undefined;
  return { id, name, template, settings, background: bg ? mediaView(bg) : null, categories };
}
