# Understone: зимние экраны

Экраны повторяют текущие экраны Understone Merkez один в один: раскладку, шрифты, цвета, фото и порядок позиций.
Поменялось только сезонное оформление. Сакура заменена кристаллами снежинок, на синих панелях падает снег и лежит сугроб.

- `screens.html#s=hot&loc=merkez` — горячие напитки (Espresso & Co., Mocha & Matcha, Special Winter, Tea & Herbal Tea).
- `#s=cold` — холодные напитки: Serinlik, Frappé (только Merkez), Special & Detox, Milkshake & Frozen, Vitamin Bar, Meşrubatlar.
- `#s=food1` … `#s=food6` — шесть экранов FOOD & CO.
- `loc=merkez` или `loc=fethiye` — цены и ассортимент точки.

Готовые кадры 1920×1080 лежат в `shots/`. Данные `data-*.js` собирает `build_data.py`
из расшифровок экранов и `../menu.json`. Шрифты (OFL) лежат в `fonts/`, страница работает без сети.

Как открыть локально:

```bash
python3 -m http.server 8000 --directory menus/understone/winter
```
