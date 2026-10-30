import type { Badge, CategoryView, Currency, Locale, TemplateId } from '@dm/shared';

// Те же демо-меню, что получает новый аккаунт в сервисе (apps/api/src/seed.ts), в формате экрана.

export type Business = 'coffee' | 'bar' | 'hookah';
export type Market = 'ru' | 'eu';

type P = number | [string, number][];
interface I {
  n: string;
  p: P;
  d?: string;
  portion?: string;
  b?: Badge[];
}
interface C {
  name: string;
  labels?: string[];
  tobacco?: boolean;
  items: I[];
}
export interface SceneDef {
  name: string;
  title: string;
  subtitle: string;
  categories: number[];
}
interface Menu {
  template: TemplateId;
  categories: C[];
  scenes: SceneDef[];
}

const s = (a: number, b: number, c: number): P => [
  ['S', a],
  ['M', b],
  ['L', c],
];

const MENUS: Record<Market, Record<Business, Menu>> = {
  ru: {
    coffee: {
      template: 'crema',
      categories: [
        {
          name: 'Кофе',
          labels: ['S', 'M', 'L'],
          items: [
            { n: 'Эспрессо', p: 15000, portion: '30 мл' },
            { n: 'Американо', p: s(18000, 21000, 24000) },
            { n: 'Капучино', p: s(22000, 26000, 30000), b: ['hit'] },
            { n: 'Флэт уайт', p: s(26000, 29000, 32000) },
            { n: 'Раф ванильный', p: s(28000, 32000, 36000), b: ['new'] },
            { n: 'Латте на овсяном', p: s(27000, 31000, 35000), b: ['vegan'] },
          ],
        },
        {
          name: 'Не кофе',
          items: [
            { n: 'Какао с маршмеллоу', p: 26000, portion: '350 мл' },
            { n: 'Матча латте', p: 32000, portion: '350 мл', b: ['new'] },
            { n: 'Чай листовой', p: 22000, portion: '500 мл', d: 'Эрл грей, сенча, ройбуш' },
          ],
        },
        {
          name: 'Выпечка и десерты',
          items: [
            { n: 'Круассан', p: 19000, portion: '70 г' },
            { n: 'Чизкейк Нью-Йорк', p: 32000, portion: '120 г', b: ['hit'] },
            { n: 'Морковный торт', p: 30000, portion: '130 г' },
          ],
        },
        {
          name: 'Завтраки',
          items: [
            { n: 'Сырники со сметаной', p: 39000, portion: '220 г', b: ['hit'] },
            { n: 'Омлет с сыром и зеленью', p: 35000, portion: '200 г' },
            { n: 'Гранола с йогуртом и ягодами', p: 32000, portion: '250 г' },
          ],
        },
      ],
      scenes: [
        { name: 'День', title: 'Кофе и десерты', subtitle: 'Свежая обжарка каждую неделю', categories: [0, 1, 2] },
        { name: 'Завтрак', title: 'Завтраки до 12:00', subtitle: 'Готовим за 10 минут', categories: [3, 0] },
      ],
    },
    bar: {
      template: 'noir',
      categories: [
        {
          name: 'Коктейли',
          items: [
            { n: 'Негрони', p: 65000, d: 'Джин, кампари, красный вермут' },
            { n: 'Апероль шприц', p: 59000, d: 'Апероль, просекко, содовая', b: ['hit'] },
            { n: 'Олд фэшн', p: 69000, d: 'Бурбон, биттер, апельсин' },
            { n: 'Маргарита', p: 62000, d: 'Текила, трипл сек, лайм' },
          ],
        },
        {
          name: 'Пиво',
          labels: ['0,3', '0,5'],
          items: [
            { n: 'Светлый лагер', p: [['0,3', 25000], ['0,5', 35000]] },
            { n: 'IPA', p: [['0,3', 32000], ['0,5', 45000]], b: ['new'] },
            { n: 'Пшеничное', p: [['0,3', 29000], ['0,5', 40000]] },
          ],
        },
        {
          name: 'Закуски',
          items: [
            { n: 'Крылья BBQ', p: 49000, portion: '300 г', b: ['spicy'] },
            { n: 'Начос с сальсой', p: 42000, portion: '250 г' },
            { n: 'Сырная тарелка', p: 79000, portion: '200 г' },
          ],
        },
      ],
      scenes: [{ name: 'Вечер', title: 'Бар', subtitle: 'Каждый вечер с 18:00', categories: [0, 1, 2] }],
    },
    hookah: {
      template: 'neon',
      categories: [
        {
          name: 'Кальяны',
          tobacco: true,
          items: [
            { n: 'Кальян классический', p: 150000 },
            { n: 'Кальян премиум', p: 220000 },
            { n: 'Кальян на грейпфруте', p: 250000 },
          ],
        },
        {
          name: 'Чай',
          items: [
            { n: 'Пуэр', p: 45000, portion: '600 мл' },
            { n: 'Молочный улун', p: 45000, portion: '600 мл', b: ['hit'] },
            { n: 'Иван-чай с облепихой', p: 39000, portion: '600 мл' },
          ],
        },
        {
          name: 'Лимонады',
          items: [
            { n: 'Манго — маракуйя', p: 39000, portion: '1 л', b: ['new'] },
            { n: 'Малина — базилик', p: 39000, portion: '1 л' },
          ],
        },
      ],
      scenes: [{ name: 'Лаунж', title: 'Лаунж', subtitle: 'Чай, лимонады и кальяны', categories: [1, 2, 0] }],
    },
  },
  eu: {
    coffee: {
      template: 'crema',
      categories: [
        {
          name: 'Coffee',
          labels: ['S', 'M', 'L'],
          items: [
            { n: 'Espresso', p: 250, portion: '30 ml' },
            { n: 'Americano', p: s(300, 350, 400) },
            { n: 'Cappuccino', p: s(350, 400, 450), b: ['hit'] },
            { n: 'Flat white', p: s(380, 430, 480) },
            { n: 'Oat latte', p: s(400, 450, 500), b: ['vegan'] },
            { n: 'Vanilla raf', p: s(420, 470, 520), b: ['new'] },
          ],
        },
        {
          name: 'Not coffee',
          items: [
            { n: 'Hot chocolate', p: 400, portion: '350 ml' },
            { n: 'Matcha latte', p: 450, portion: '350 ml', b: ['new'] },
            { n: 'Loose-leaf tea', p: 320, portion: '500 ml', d: 'Earl grey, sencha, rooibos' },
          ],
        },
        {
          name: 'Pastry & cakes',
          items: [
            { n: 'Butter croissant', p: 280, portion: '70 g' },
            { n: 'New York cheesecake', p: 520, portion: '120 g', b: ['hit'] },
            { n: 'Carrot cake', p: 480, portion: '130 g' },
          ],
        },
        {
          name: 'Breakfast',
          items: [
            { n: 'Avocado toast', p: 950, portion: '220 g', b: ['vegan'] },
            { n: 'Eggs Benedict', p: 1150, portion: '250 g', b: ['hit'] },
            { n: 'Granola, yoghurt & berries', p: 750, portion: '250 g' },
          ],
        },
      ],
      scenes: [
        { name: 'Day', title: 'Coffee & cake', subtitle: 'Roasted fresh every week', categories: [0, 1, 2] },
        { name: 'Breakfast', title: 'Breakfast until noon', subtitle: 'Ready in ten minutes', categories: [3, 0] },
      ],
    },
    bar: {
      template: 'noir',
      categories: [
        {
          name: 'Cocktails',
          items: [
            { n: 'Negroni', p: 1100, d: 'Gin, Campari, sweet vermouth' },
            { n: 'Aperol spritz', p: 950, d: 'Aperol, prosecco, soda', b: ['hit'] },
            { n: 'Old fashioned', p: 1200, d: 'Bourbon, bitters, orange' },
            { n: 'Margarita', p: 1050, d: 'Tequila, triple sec, lime' },
          ],
        },
        {
          name: 'Beer',
          labels: ['0.3', '0.5'],
          items: [
            { n: 'Pilsner', p: [['0.3', 450], ['0.5', 650]] },
            { n: 'IPA', p: [['0.3', 550], ['0.5', 790]], b: ['new'] },
            { n: 'Wheat beer', p: [['0.3', 500], ['0.5', 720]] },
          ],
        },
        {
          name: 'Bar snacks',
          items: [
            { n: 'BBQ wings', p: 1250, portion: '300 g', b: ['spicy'] },
            { n: 'Nachos & salsa', p: 950, portion: '250 g' },
            { n: 'Cheese board', p: 1650, portion: '200 g' },
          ],
        },
      ],
      scenes: [{ name: 'Evening', title: 'The bar', subtitle: 'Every night from 6 pm', categories: [0, 1, 2] }],
    },
    hookah: {
      template: 'neon',
      categories: [
        {
          name: 'Hookah',
          tobacco: true,
          items: [
            { n: 'Classic hookah', p: 2500 },
            { n: 'Premium hookah', p: 3500 },
            { n: 'Grapefruit bowl hookah', p: 4000 },
          ],
        },
        {
          name: 'Tea',
          items: [
            { n: 'Pu-erh', p: 900, portion: '600 ml' },
            { n: 'Milk oolong', p: 900, portion: '600 ml', b: ['hit'] },
          ],
        },
        {
          name: 'Lemonades',
          items: [
            { n: 'Mango & passion fruit', p: 1200, portion: '1 l', b: ['new'] },
            { n: 'Raspberry & basil', p: 1200, portion: '1 l' },
          ],
        },
      ],
      scenes: [{ name: 'Lounge', title: 'Lounge', subtitle: 'Tea, lemonades and hookah', categories: [1, 2, 0] }],
    },
  },
};

export const MARKET: Record<Market, { currency: Currency; locale: Locale }> = {
  ru: { currency: 'RUB', locale: 'ru' },
  eu: { currency: 'EUR', locale: 'en' },
};

export interface DemoMenu {
  template: TemplateId;
  categories: CategoryView[];
  scenes: SceneDef[];
}

/** Свежая редактируемая копия меню: у каждой позиции свой id, как в базе. */
export function loadMenu(market: Market, business: Business): DemoMenu {
  const menu = MENUS[market][business];
  let seq = 0;
  const categories: CategoryView[] = menu.categories.map((c, ci) => ({
    id: `c${ci}`,
    name: c.name,
    nameSecondary: '',
    compliance: c.tobacco ? 'tobacco' : 'none',
    variantLabels: c.labels ?? [],
    items: c.items.map((i) => ({
      id: `i${seq++}`,
      name: i.n,
      nameSecondary: '',
      description: i.d ?? '',
      portion: i.portion ?? '',
      price: typeof i.p === 'number' ? i.p : null,
      variants: typeof i.p === 'number' ? [] : i.p.map(([label, price]) => ({ label, price })),
      badges: c.tobacco ? [] : (i.b ?? []),
      image: null,
      soldOut: false,
    })),
  }));
  return { template: menu.template, categories, scenes: menu.scenes };
}
