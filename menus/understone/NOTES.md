# Understone: зимнее меню

`menu.json` собран по картинкам текущих экранов из `source/`: Fethiye (экраны от 09.09.2026) и Merkez
(фото экранов, слайды и постеры). Позиции и цены переписаны с картинок и проверены по крупным фрагментам.
Фото в `photos/` вырезаны с этих же экранов: у блюд и стаканов убран синий фон.

- 120 позиций в 17 категориях. Шаблон всех сцен — `winter` (снег, сосульки, иней, морозно-синий).
- Базовые цены взяты из Merkez, цены Fethiye записаны в `locationPrices.fethiye`.
- Позиции, которых нет в точке, отмечены в `unavailableAt`. Сцены с `soldOutMode: "hide"` их не показывают.
  - Frappé и Mini Serpme Kahvaltı есть только в Merkez.
  - İki Kişilik Sini Kahvaltı есть только в Fethiye.

## Сцены

| Сцена | Категории |
|---|---|
| Sıcak İçecekler | Special Winter, Sıcak Kahveler, Mocha & Matcha, Tea & Herbal Tea |
| Soğuk İçecekler | Soğuk Kahveler, Frappé, Milkshake & Frozen, Special & Detox |
| Vitamin Bar & Meşrubat | Vitamin Bar, Understone Serinliği, Meşrubatlar |
| Kahvaltı & Kruvasan | Kahvaltı, Kruvasanlar |
| Food & Co. | Tost, Sandviç & Focaccia; Burger, Taco & Wrap; Ana Yemekler; Çocuk Menüsü |

В промо-ролике идут салепы и горячий шоколад, Taro Patto, Zen Taro Matcha, Coffee Lotus Crush, Cafe Crème Brûlée
и завтрак своей точки.

## Что изменено при переносе

- Опечатки в названиях и описаниях исправлены:
  - Capuccino → Cappuccino, Macchiatto → Macchiato, Raoibos → Rooibos;
  - Creme Brulle → Crème Brûlée, Chedar(lı) → Cheddar(lı), Healty → Healthy, Foccacia/Foccaccia → Focaccia;
  - Noddle → Noodle, Mozarella/Mozeralla → Mozzarella, Bratwurts → Bratwurst, Hoison → Hoisin;
  - Jalepone/Jalepeno → Jalapeño, Chilli → Chili.
- Восстановлены пробелы после запятых и вокруг «&». Убран повтор «Domates» в Pesto Mozzarella Focaccia.
- «Yaz Serinliği» (летняя линейка) в зимнем меню называется «Understone Serinliği».
  Метки NEW летних серий (Yaz Serinliği, Frappé) сняты.
- Один длинный список «Espresso & Co.» разделён на «Sıcak Kahveler» и «Soğuk Kahveler».
  Еда «Food & Co.» разбита на категории.
- Ice Caramel Latte и четыре напитка с плиток (Taro Patto, Zen Taro Matcha, Coffee Lotus Crush, Cafe Crème Brûlée)
  добавлены в списки, на экранах они были только на фото.

## Уточнить у Understone

1. В Merkez часть цен выше, чем в Fethiye. Возможно, это просто прайсы разных дат:
   - Iced Americano 210 / 190;
   - Espresso Tonic и Cold Brew 275 / 270;
   - три мокко 275 / 270;
   - Bumblebee 300 / 270;
   - Cool Lime и Cool Berry 275 / 270;
   - Ice Caramel Latte 290 / 260.
2. На одном слайде Frappé стоит 300 ₺, на экране Merkez и остальных постерах 280 ₺. В меню взято 280.
   Продают ли Frappé в Fethiye?
3. У Tavuk Wrap на обоих экранах напечатано то же описание, что у Çıtır Tavuk Parçaları. Похоже на ошибку копирования.
4. На экране Merkez у Chai Tea Latte и Iced Chai Tea Latte стоят красные звёздочки. Это «новинка»? Сейчас без метки.
5. Фото салепа и горячего шоколада: для зимнего промо-ролика они бы очень пригодились.

## Как обновить

1. Поправить `menu.json`.
2. Залить меню в базу. С `--replace` меню и сцены заменяются, экраны остаются на своих сценах:

   ```bash
   OWNER_PASSWORD='…' pnpm --filter @dm/api import-menu -- ../../menus/understone/menu.json --owner-email <email владельца> --replace
   ```

3. Переснять ролики. Fethiye снимается вертикально, Merkez горизонтально:

   ```bash
   pnpm --filter @dm/video render -- ../../menus/understone/menu.json --location fethiye --orientation portrait
   ```

   ```bash
   pnpm --filter @dm/video render -- ../../menus/understone/menu.json --location merkez --orientation landscape
   ```
