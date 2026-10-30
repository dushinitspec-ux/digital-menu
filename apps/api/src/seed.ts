import type { Badge, BusinessType, Locale, SceneSettings, TemplateId } from '@dm/shared';
import type { Tx } from './db';

// Демо-меню для нового аккаунта: владелец сразу видит, как выглядит экран, и правит своё поверх.

type P = number | [string, number][];
interface SeedItem {
  n: string;
  p: P;
  d?: string;
  portion?: string;
  b?: Badge[];
}
interface SeedCategory {
  name: string;
  variantLabels?: string[];
  tobacco?: boolean;
  items: SeedItem[];
}
interface SeedScene {
  name: string;
  template: TemplateId;
  categories: number[];
  title: string;
  subtitle: string;
}
interface SeedMenu {
  categories: SeedCategory[];
  scenes: SeedScene[];
}

const sizes = (s: number, m: number, l: number): P => [
  ['S', s],
  ['M', m],
  ['L', l],
];

const RU: Record<'coffee' | 'bar' | 'hookah' | 'food', SeedMenu> = {
  coffee: {
    categories: [
      {
        name: 'Кофе',
        variantLabels: ['S', 'M', 'L'],
        items: [
          { n: 'Эспрессо', p: 15000, portion: '30 мл' },
          { n: 'Американо', p: sizes(18000, 21000, 24000) },
          { n: 'Капучино', p: sizes(22000, 26000, 30000), b: ['hit'] },
          { n: 'Флэт уайт', p: sizes(26000, 29000, 32000) },
          { n: 'Раф ванильный', p: sizes(28000, 32000, 36000), b: ['new'] },
          { n: 'Латте на овсяном', p: sizes(27000, 31000, 35000), b: ['vegan'] },
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
      { name: 'Весь день', template: 'crema', categories: [0, 1, 2], title: 'Кофе и десерты', subtitle: 'Свежая обжарка каждую неделю' },
      { name: 'Завтраки', template: 'crema', categories: [3, 0], title: 'Завтраки до 12:00', subtitle: 'Готовим за 10 минут' },
    ],
  },
  bar: {
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
        variantLabels: ['0,3', '0,5'],
        items: [
          { n: 'Светлый лагер', p: [['0,3', 25000], ['0,5', 35000]] },
          { n: 'IPA', p: [['0,3', 32000], ['0,5', 45000]], b: ['new'] },
          { n: 'Пшеничное нефильтрованное', p: [['0,3', 29000], ['0,5', 40000]] },
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
    scenes: [{ name: 'Вечер', template: 'noir', categories: [0, 1, 2], title: 'Бар', subtitle: 'Каждый вечер с 18:00' }],
  },
  hookah: {
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
    scenes: [{ name: 'Лаунж', template: 'noir', categories: [1, 2, 0], title: 'Лаунж', subtitle: 'Чай, лимонады и кальяны' }],
  },
  food: {
    categories: [
      {
        name: 'Салаты',
        items: [
          { n: 'Цезарь с курицей', p: 59000, portion: '250 г', b: ['hit'] },
          { n: 'Греческий', p: 49000, portion: '230 г', b: ['vegan'] },
        ],
      },
      {
        name: 'Супы',
        items: [
          { n: 'Борщ со сметаной', p: 39000, portion: '300 г' },
          { n: 'Том ям с креветками', p: 59000, portion: '350 г', b: ['spicy'] },
        ],
      },
      {
        name: 'Горячее',
        items: [
          { n: 'Паста карбонара', p: 65000, portion: '280 г' },
          { n: 'Бефстроганов с пюре', p: 79000, portion: '320 г', b: ['new'] },
          { n: 'Стейк из лосося', p: 119000, portion: '180 г' },
        ],
      },
      {
        name: 'Напитки',
        items: [
          { n: 'Морс клюквенный', p: 19000, portion: '300 мл' },
          { n: 'Лимонад домашний', p: 29000, portion: '400 мл' },
        ],
      },
    ],
    scenes: [{ name: 'Основное меню', template: 'noir', categories: [0, 1, 2, 3], title: 'Меню', subtitle: 'Кухня открыта до 23:00' }],
  },
};

const EN: typeof RU = {
  coffee: {
    categories: [
      {
        name: 'Coffee',
        variantLabels: ['S', 'M', 'L'],
        items: [
          { n: 'Espresso', p: 250, portion: '30 ml' },
          { n: 'Americano', p: sizes(300, 350, 400) },
          { n: 'Cappuccino', p: sizes(350, 400, 450), b: ['hit'] },
          { n: 'Flat white', p: sizes(380, 430, 480) },
          { n: 'Oat latte', p: sizes(400, 450, 500), b: ['vegan'] },
          { n: 'Vanilla raf', p: sizes(420, 470, 520), b: ['new'] },
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
      { name: 'All day', template: 'crema', categories: [0, 1, 2], title: 'Coffee & cake', subtitle: 'Roasted fresh every week' },
      { name: 'Breakfast', template: 'crema', categories: [3, 0], title: 'Breakfast until noon', subtitle: 'Ready in ten minutes' },
    ],
  },
  bar: {
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
        variantLabels: ['0.3', '0.5'],
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
    scenes: [{ name: 'Evening', template: 'noir', categories: [0, 1, 2], title: 'The bar', subtitle: 'Every night from 6 pm' }],
  },
  hookah: {
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
    scenes: [{ name: 'Lounge', template: 'noir', categories: [1, 2, 0], title: 'Lounge', subtitle: 'Tea, lemonades and hookah' }],
  },
  food: {
    categories: [
      {
        name: 'Salads',
        items: [
          { n: 'Chicken Caesar', p: 1290, portion: '250 g', b: ['hit'] },
          { n: 'Greek salad', p: 1090, portion: '230 g', b: ['vegan'] },
        ],
      },
      {
        name: 'Mains',
        items: [
          { n: 'Pasta carbonara', p: 1490, portion: '280 g' },
          { n: 'Salmon steak', p: 2290, portion: '180 g', b: ['new'] },
          { n: 'Beef burger & fries', p: 1690, portion: '350 g' },
        ],
      },
      {
        name: 'Drinks',
        items: [
          { n: 'Homemade lemonade', p: 550, portion: '400 ml' },
          { n: 'Sparkling water', p: 350, portion: '330 ml' },
        ],
      },
    ],
    scenes: [{ name: 'Main menu', template: 'noir', categories: [0, 1, 2], title: 'Menu', subtitle: 'Kitchen open until 11 pm' }],
  },
};

function menuFor(businessType: BusinessType, locale: Locale): SeedMenu {
  const book = locale === 'ru' ? RU : EN;
  if (businessType === 'coffee') return book.coffee;
  if (businessType === 'bar') return book.bar;
  if (businessType === 'hookah') return book.hookah;
  const food = book.food;
  if (businessType === 'cafe') return { ...food, scenes: food.scenes.map((s) => ({ ...s, template: 'crema' as const })) };
  return food;
}

export async function seedDemoMenu(sql: Tx, orgId: string, businessType: BusinessType, locale: Locale) {
  const menu = menuFor(businessType, locale);
  const categoryIds: string[] = [];
  for (const [ci, c] of menu.categories.entries()) {
    const [row] = await sql<{ id: string }[]>`
      insert into categories (org_id, name, compliance, variant_labels, sort)
      values (${orgId}, ${c.name}, ${c.tobacco ? 'tobacco' : 'none'}, ${c.variantLabels ?? []}::text[], ${ci})
      returning id`;
    categoryIds.push(row!.id);
    for (const [ii, item] of c.items.entries()) {
      const variants = typeof item.p === 'number' ? [] : item.p.map(([label, price]) => ({ label, price }));
      const price = typeof item.p === 'number' ? item.p : null;
      await sql`
        insert into items (org_id, category_id, name, description, portion, price, variants, badges, sort)
        values (${orgId}, ${row!.id}, ${item.n}, ${item.d ?? ''}, ${item.portion ?? ''}, ${price},
                ${sql.json(variants)}, ${item.b ?? []}::text[], ${ii})`;
    }
  }
  const sceneIds: string[] = [];
  for (const s of menu.scenes) {
    const settings: Partial<SceneSettings> = {
      title: s.title,
      subtitle: s.subtitle,
      categoryIds: s.categories.map((i) => categoryIds[i]!),
    };
    const [row] = await sql<{ id: string }[]>`
      insert into scenes (org_id, name, template, settings)
      values (${orgId}, ${s.name}, ${s.template}, ${sql.json(settings as never)}) returning id`;
    sceneIds.push(row!.id);
  }
  return { categoryIds, sceneIds };
}
