import { BADGES, formatPrice, parsePrice, type Badge, type Variant } from '@dm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, type Catalog, type Category, type Item, type Location } from '../api';
import { useT } from '../i18n';
import { MediaPicker } from '../media-picker';
import { useOrg } from '../session';
import { Button, Empty, Field, PageHead, Sheet, Spinner, Switch, useToast, useConfirm } from '../ui';

type ItemDraft = Omit<Item, 'id' | 'sort' | 'imageUrl'> & { id?: string; imageUrl: string | null };

export function MenuPage() {
  const t = useT();
  const { base, org, canEdit } = useOrg();
  const qc = useQueryClient();
  const toast = useToast();
  const catalog = useQuery({ queryKey: ['catalog', org.id], queryFn: () => api.get<Catalog>(`${base}/catalog`) });
  const locations = useQuery({ queryKey: ['locations', org.id], queryFn: () => api.get<Location[]>(`${base}/locations`) });
  const [locationId, setLocationId] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<ItemDraft | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const key = ['catalog', org.id];
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = () => {
    toast(t('error'), 'error');
    void refresh();
  };

  /** Оптимистичное обновление: стоп и цена меняются в списке сразу, запрос идёт следом. */
  const patchItem = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Item> }) => api.patch(`${base}/items/${id}`, patch),
    onMutate: ({ id, patch }) => {
      qc.setQueryData<Catalog>(key, (c) => c && { ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
    },
    onError: fail,
  });
  const putOverride = useMutation({
    mutationFn: ({ itemId, soldOut, price }: { itemId: string; soldOut: boolean | null; price: number | null }) =>
      api.put(`${base}/items/${itemId}/locations/${locationId}`, { soldOut, price }),
    onMutate: ({ itemId, soldOut, price }) => {
      qc.setQueryData<Catalog>(key, (c) => {
        if (!c) return c;
        const rest = c.overrides.filter((o) => !(o.itemId === itemId && o.locationId === locationId));
        return { ...c, overrides: soldOut === null && price === null ? rest : [...rest, { itemId, locationId, soldOut, price }] };
      });
    },
    onError: fail,
  });
  const reorder = useMutation({
    mutationFn: ({ url, ids }: { url: string; ids: string[] }) => api.post(url, { ids }),
    onSettled: refresh,
  });

  const grouped = useMemo(() => {
    const c = catalog.data;
    if (!c) return [];
    return [...c.categories]
      .sort((a, b) => a.sort - b.sort)
      .map((cat) => ({ cat, items: c.items.filter((i) => i.categoryId === cat.id).sort((a, b) => a.sort - b.sort) }));
  }, [catalog.data]);

  if (catalog.isLoading || !catalog.data) return <Spinner />;
  const overrides = catalog.data.overrides;
  const override = (itemId: string) =>
    locationId === 'all' ? undefined : overrides.find((o) => o.itemId === itemId && o.locationId === locationId);

  const toggleSoldOut = (item: Item, value: boolean) => {
    if (locationId === 'all') return patchItem.mutate({ id: item.id, patch: { soldOut: value } });
    const o = override(item.id);
    const price = o?.price ?? null;
    putOverride.mutate({ itemId: item.id, soldOut: value === item.soldOut && price === null ? null : value, price });
  };

  const savePrice = (item: Item, raw: string) => {
    const price = parsePrice(raw);
    if (price === null) return toast(`${t('price')}: ?`, 'error');
    if (locationId === 'all') return patchItem.mutate({ id: item.id, patch: { price } });
    const o = override(item.id);
    putOverride.mutate({ itemId: item.id, soldOut: o?.soldOut ?? null, price: price === item.price ? null : price });
  };

  const move = (ids: string[], index: number, dir: -1 | 1, url: string) => {
    const next = [...ids];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    reorder.mutate({ url, ids: next });
  };

  const newItem = (cat: Category): ItemDraft => ({
    categoryId: cat.id,
    name: '',
    nameSecondary: '',
    description: '',
    portion: '',
    price: cat.variantLabels.length ? null : 0,
    variants: cat.variantLabels.map((label) => ({ label, price: 0 })),
    badges: [],
    imageId: null,
    imageUrl: null,
    soldOut: false,
    hidden: false,
  });

  const multiLocation = (locations.data?.length ?? 0) > 1;
  return (
    <div className="page">
      <PageHead
        title={t('nav_menu')}
        actions={canEdit ? <Button onClick={() => setEditingCategory({ name: '', variantLabels: [], compliance: 'none' })}>{t('addCategory')}</Button> : null}
      />
      {!canEdit ? <div className="notice">{t('readOnly')}</div> : null}
      {multiLocation ? (
        <div className="location-bar">
          <span>{t('stopListFor')}</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="all">{t('allLocations')}</option>
            {locations.data!.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {locationId !== 'all' ? <span className="muted small">{t('overrideHint')}</span> : null}
        </div>
      ) : null}
      {grouped.length === 0 ? <Empty>{t('emptyMenu')}</Empty> : null}
      {grouped.map(({ cat, items }, ci) => (
        <section key={cat.id} className="card cat-card">
          <div className="cat-head">
            <div>
              <h2>{cat.name}</h2>
              <div className="muted small">
                {cat.variantLabels.length ? cat.variantLabels.join(' · ') : null}
                {cat.compliance === 'tobacco' ? <span className="tag">15-ФЗ</span> : null}
              </div>
            </div>
            {canEdit ? (
              <div className="cat-actions">
                <button type="button" className="icon-btn" aria-label={t('moveUp')} onClick={() => move(grouped.map((g) => g.cat.id), ci, -1, `${base}/categories/reorder`)}>
                  ↑
                </button>
                <button type="button" className="icon-btn" aria-label={t('moveDown')} onClick={() => move(grouped.map((g) => g.cat.id), ci, 1, `${base}/categories/reorder`)}>
                  ↓
                </button>
                <Button variant="ghost" size="sm" onClick={() => setEditingCategory(cat)}>
                  {t('edit')}
                </Button>
              </div>
            ) : null}
          </div>
          <ul className="items">
            {items.map((item, ii) => {
              const o = override(item.id);
              const soldOut = o?.soldOut ?? item.soldOut;
              const price = o?.price ?? item.price;
              return (
                <li key={item.id} className={`item-row${soldOut ? ' is-soldout' : ''}${item.hidden ? ' is-hidden' : ''}`}>
                  {item.imageUrl ? <img className="item-thumb" src={item.imageUrl} alt="" /> : <span className="item-thumb item-thumb-empty" />}
                  <button type="button" className="item-main" onClick={() => canEdit && setEditingItem({ ...item })}>
                    <span className="item-name">{item.name}</span>
                    <span className="muted small">
                      {[item.portion, ...item.badges.map((b) => t(`badge_${b}`))].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                  <div className="item-price">
                    {item.variants.length ? (
                      <span className="variants">
                        {item.variants.map((v) => `${v.label} ${formatPrice(v.price, org.currency, org.locale)}`).join(' · ')}
                      </span>
                    ) : price !== null ? (
                      <PriceInput
                        value={price}
                        disabled={!canEdit}
                        changed={o?.price != null}
                        format={(p) => formatPrice(p, org.currency, org.locale)}
                        onSave={(raw) => savePrice(item, raw)}
                      />
                    ) : null}
                  </div>
                  <Switch checked={!soldOut} disabled={!canEdit} onChange={(v) => toggleSoldOut(item, !v)} label={soldOut ? t('soldOut') : t('inStock')} />
                  {canEdit ? (
                    <div className="row-move">
                      <button type="button" className="icon-btn" aria-label={t('moveUp')} onClick={() => move(items.map((i) => i.id), ii, -1, `${base}/categories/${cat.id}/items/reorder`)}>
                        ↑
                      </button>
                      <button type="button" className="icon-btn" aria-label={t('moveDown')} onClick={() => move(items.map((i) => i.id), ii, 1, `${base}/categories/${cat.id}/items/reorder`)}>
                        ↓
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {canEdit ? (
            <Button variant="ghost" onClick={() => setEditingItem(newItem(cat))}>
              + {t('addItem')}
            </Button>
          ) : null}
        </section>
      ))}

      {editingItem ? (
        <ItemSheet
          draft={editingItem}
          category={catalog.data.categories.find((c) => c.id === editingItem.categoryId)!}
          categories={catalog.data.categories}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            void refresh();
            toast(t('saved'));
          }}
        />
      ) : null}
      {editingCategory ? (
        <CategorySheet
          draft={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            void refresh();
            toast(t('saved'));
          }}
        />
      ) : null}
    </div>
  );
}

function PriceInput({ value, onSave, format, disabled, changed }: { value: number; onSave: (raw: string) => void; format: (p: number) => string; disabled?: boolean; changed?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  if (!editing) {
    return (
      <button
        type="button"
        className={`price-btn${changed ? ' is-override' : ''}`}
        disabled={disabled}
        onClick={() => {
          setRaw(String(value / 100).replace('.', ','));
          setEditing(true);
        }}
      >
        {format(value)}
      </button>
    );
  }
  const commit = () => {
    setEditing(false);
    if (raw.trim() && raw !== String(value / 100).replace('.', ',')) onSave(raw);
  };
  return (
    <input
      className="price-input"
      inputMode="decimal"
      autoFocus
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
    />
  );
}

function ItemSheet({
  draft,
  category,
  categories,
  onClose,
  onSaved,
}: {
  draft: ItemDraft;
  category: Category;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const ask = useConfirm();
  const { base } = useOrg();
  const toast = useToast();
  const [item, setItem] = useState<ItemDraft>(draft);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries([
      ['_', draft.price !== null ? String(draft.price / 100) : ''],
      ...draft.variants.map((v) => [v.label, String(v.price / 100)]),
    ]),
  );
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const labels = category.variantLabels.length ? category.variantLabels : draft.variants.map((v) => v.label);
  const usesVariants = labels.length > 0;

  const save = async () => {
    let variants: Variant[] = [];
    let price: number | null = null;
    if (usesVariants) {
      for (const label of labels) {
        const raw = prices[label] ?? '';
        if (!raw.trim()) continue;
        const p = parsePrice(raw);
        if (p === null) return toast(`${t('price')} ${label}: ?`, 'error');
        variants.push({ label, price: p });
      }
    } else {
      price = prices._?.trim() ? parsePrice(prices._) : null;
      if (prices._?.trim() && price === null) return toast(`${t('price')}: ?`, 'error');
      variants = [];
    }
    const body = {
      categoryId: item.categoryId,
      name: item.name,
      nameSecondary: item.nameSecondary,
      description: item.description,
      portion: item.portion,
      price,
      variants,
      badges: item.badges,
      imageId: item.imageId,
      soldOut: item.soldOut,
      hidden: item.hidden,
    };
    setBusy(true);
    try {
      if (item.id) await api.patch(`${base}/items/${item.id}`, body);
      else await api.post(`${base}/items`, body);
      onSaved();
    } catch {
      toast(t('error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!item.id || !(await ask(t('confirmDelete')))) return;
    await api.del(`${base}/items/${item.id}`);
    onSaved();
  };

  const toggleBadge = (b: Badge) =>
    setItem({ ...item, badges: item.badges.includes(b) ? item.badges.filter((x) => x !== b) : [...item.badges, b].slice(0, 3) });

  return (
    <Sheet
      open
      title={item.id ? t('editItem') : t('newItem')}
      onClose={onClose}
      footer={
        <>
          {item.id ? (
            <Button variant="danger" onClick={() => void remove()}>
              {t('delete')}
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={busy || !item.name.trim()} onClick={() => void save()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <Field label={t('name')}>
        <input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} autoFocus={!item.id} />
      </Field>
      <Field label={t('nameSecondary')}>
        <input value={item.nameSecondary} onChange={(e) => setItem({ ...item, nameSecondary: e.target.value })} />
      </Field>
      {usesVariants ? (
        <Field label={t('sizes')} group>
          <div className="variant-grid">
            {labels.map((label) => (
              <label key={label} className="variant-cell">
                <span>{label}</span>
                <input inputMode="decimal" value={prices[label] ?? ''} onChange={(e) => setPrices({ ...prices, [label]: e.target.value })} />
              </label>
            ))}
          </div>
        </Field>
      ) : (
        <Field label={t('price')}>
          <input inputMode="decimal" value={prices._ ?? ''} onChange={(e) => setPrices({ ...prices, _: e.target.value })} />
        </Field>
      )}
      <div className="grid-2">
        <Field label={t('portion')}>
          <input value={item.portion} onChange={(e) => setItem({ ...item, portion: e.target.value })} placeholder="250 мл" />
        </Field>
        <Field label={t('category')}>
          <select value={item.categoryId} onChange={(e) => setItem({ ...item, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t('description')}>
        <textarea rows={2} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
      </Field>
      {category.compliance !== 'tobacco' ? (
        <>
          <Field label={t('badges')} group>
            <div className="chips">
              {BADGES.map((b) => (
                <button type="button" key={b} className={`chip${item.badges.includes(b) ? ' is-on' : ''}`} onClick={() => toggleBadge(b)}>
                  {t(`badge_${b}`)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('photo')} group>
            <div className="photo-row">
              {item.imageUrl ? <img className="item-thumb item-thumb-lg" src={item.imageUrl} alt="" /> : null}
              <Button variant="soft" onClick={() => setPicker(true)}>
                {t('choosePhoto')}
              </Button>
              {item.imageId ? (
                <Button variant="ghost" onClick={() => setItem({ ...item, imageId: null, imageUrl: null })}>
                  {t('removePhoto')}
                </Button>
              ) : null}
            </div>
          </Field>
        </>
      ) : (
        <p className="muted small">{t('tobaccoHint')}</p>
      )}
      <div className="switch-list">
        <Switch checked={item.soldOut} onChange={(v) => setItem({ ...item, soldOut: v })} label={t('soldOut')} />
        <Switch checked={item.hidden} onChange={(v) => setItem({ ...item, hidden: v })} label={t('hidden')} />
      </div>
      <MediaPicker
        open={picker}
        kinds={['image']}
        onClose={() => setPicker(false)}
        onPick={(m) => setItem({ ...item, imageId: m.id, imageUrl: m.thumbUrl ?? m.url })}
      />
    </Sheet>
  );
}

function CategorySheet({ draft, onClose, onSaved }: { draft: Partial<Category>; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const ask = useConfirm();
  const { base } = useOrg();
  const toast = useToast();
  const [name, setName] = useState(draft.name ?? '');
  const [nameSecondary, setNameSecondary] = useState(draft.nameSecondary ?? '');
  const [labels, setLabels] = useState((draft.variantLabels ?? []).join(', '));
  const [tobacco, setTobacco] = useState(draft.compliance === 'tobacco');

  const save = async () => {
    const body = {
      name,
      nameSecondary,
      variantLabels: labels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
      compliance: tobacco ? 'tobacco' : 'none',
    };
    try {
      if (draft.id) await api.patch(`${base}/categories/${draft.id}`, body);
      else await api.post(`${base}/categories`, body);
      onSaved();
    } catch {
      toast(t('error'), 'error');
    }
  };
  const remove = async () => {
    if (!draft.id || !(await ask(t('confirmDelete')))) return;
    await api.del(`${base}/categories/${draft.id}`);
    onSaved();
  };

  return (
    <Sheet
      open
      title={t('editCategory')}
      onClose={onClose}
      footer={
        <>
          {draft.id ? (
            <Button variant="danger" onClick={() => void remove()}>
              {t('delete')}
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={!name.trim()} onClick={() => void save()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <Field label={t('name')}>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label={t('nameSecondary')}>
        <input value={nameSecondary} onChange={(e) => setNameSecondary(e.target.value)} />
      </Field>
      <Field label={t('sizes')} hint={t('sizesHint')}>
        <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="S, M, L" />
      </Field>
      <Switch checked={tobacco} onChange={setTobacco} label={t('tobaccoMode')} />
      {tobacco ? <p className="muted small">{t('tobaccoHint')}</p> : null}
    </Sheet>
  );
}
