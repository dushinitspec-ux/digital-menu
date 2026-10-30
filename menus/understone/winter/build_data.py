"""Данные зимних экранов Understone: точная раскладка экранов Merkez (колонки, порядок, плитки с фото)."""
import json, re, sys, unicodedata
SP = sys.argv[1]  # папка с расшифровками экранов (agents/*.json)
OUT = sys.argv[3] if len(sys.argv) > 3 else '.'
LOC = sys.argv[2] if len(sys.argv) > 2 else 'merkez'

def key_of(name):
    s = unicodedata.normalize('NFKD', name.lower().replace('ı', 'i').replace('İ', 'i'))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'^iced? ', 'ice ', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

CAPS_FIX = [(r'CAPUCCINO', 'CAPPUCCINO'), (r'MACCHIATTO', 'MACCHIATO'), (r'RAOIBOS', 'ROOIBOS'), (r'CREME BRULLE', 'CRÈME BRÛLÉE'),
            (r'\bCHEDARLI\b', 'CHEDDARLI'), (r'\bCHEDAR\b', 'CHEDDAR'), (r'HEALTY', 'HEALTHY'), (r'FOCC?ACC?IA', 'FOCACCIA'),
            (r'NODDLE', 'NOODLE'), (r'MOZARELLA', 'MOZZARELLA'), (r'BRATWURTS', 'BRATWURST'), (r'\bKLASIK\b', 'KLASİK'),
            (r'^ICE CHAI', 'ICED CHAI')]

def capfix(p):
    p = ' '.join(p.split())
    for a, b in CAPS_FIX:
        p = re.sub(a, b, p)
    return p

menu = json.load(open('/home/user/digital-menu/menus/understone/menu.json'))
items = {key_of(i['name']): i for c in menu['categories'] for i in c['items']}

def find(name):
    k = key_of(name)
    if k in items:
        return items[k]
    k2 = key_of(capfix(name))
    return items[k2]

def avail(it):
    return LOC not in it.get('unavailableAt', [])

def price(it):
    return it.get('locationPrices', {}).get(LOC, it['price'])

def row(printed):
    it = find(printed)
    return {'name': capfix(printed), 'price': price(it)} if avail(it) else None

def rows(printed_list):
    return [r for r in (row(p) for p in printed_list) if r]

md = json.load(open(f'{SP}/agents/merkez-drinks.json'))
sec = {s['printed']: [i['printed'] for i in s['items'] if 'photo tile' not in (i.get('note') or '').lower()]
       for sc in md['screens'] for s in sc['sections']}

def tile(printed, photo):
    it = find(printed)
    return {'name': capfix(printed), 'price': price(it), 'img': f'assets/photos/{photo}.webp'}

esp = sec['ESPRESSO & CO.']
tea = sec['TEA & HERBAL TEA']
detox = sec['SPECIAL & DETOX']
hot = {
    'left': [{'title': 'ESPRESSO & CO.', 'groups': [rows(esp[:9]), rows(esp[9:])]}],
    'center': {'title': 'MOCHA & MATCHA', 'rows': rows(sec['MOCHA & MATCHA'][:5]),
               'tiles': [tile('TARO PATTO', 'taro-patto'), tile('ZEN TARO MATCHA', 'zen-taro-matcha'),
                         tile('COFFEE LOTUS CRUSH', 'coffee-lotus-crush'), tile('CAFE CREME BRULLE', 'cafe-creme-brulee')]},
    'right': [{'title': 'SPECIAL WINTER', 'groups': [rows(sec['SPECIAL WINTER'])], 'flake': True},
              {'title': 'TEA & HERBAL TEA', 'groups': [rows(tea[:8]), rows(tea[8:])]}],
}
frappe = rows(sec['FRAPPÉ'])
cold = {
    'left': [{'title': 'SERİNLİK', 'groups': [rows(sec['YAZ SERİNLİĞİ'])]}]
            + ([{'title': 'FRAPPÉ', 'groups': [frappe]}] if frappe else [])
            + [{'title': 'SPECIAL & DETOX', 'groups': [rows(detox[:2]), rows(detox[2:])]}],
    'center': {'title': 'MILKSHAKE & FROZEN', 'rows': rows(sec['MILKSHAKE & FROZEN'][:6]),
               'tiles': [tile('ICE CARAMEL LATTE', 'ice-caramel-latte'), tile('ICED MOCHA', 'ice-mocha'),
                         tile('ICED LATTE', 'ice-latte'), tile('ICE STRAWBERRY MATCHA', 'ice-strawberry-matcha')]},
    'right': [{'title': 'VİTAMİN BAR', 'groups': [rows(sec['VİTAMİN BAR'])]},
              {'title': 'MEŞRUBATLAR', 'groups': [rows(sec['MEŞRUBATLAR'])]}],
}

def slug(name):
    s = unicodedata.normalize('NFKD', name.lower().replace('ı', 'i').replace('İ', 'i'))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

mf = json.load(open(f'{SP}/agents/merkez-food.json'))
food = []
for sc in mf['screens']:
    dishes = []
    for it in sc['items']:
        m = find(capfix(it['printed']).title()) if key_of(capfix(it['printed'])) in items else find(it['name'])
        img = m.get('image', '').replace('photos/', 'assets/photos/')
        dishes.append({'name': capfix(it['printed']), 'desc': m.get('description', ''), 'price': price(m), 'img': img})
    food.append(dishes)

open(f'{OUT}/data-{LOC}.js', 'w').write('window.D=' + json.dumps({'hot': hot, 'cold': cold, 'food': food, 'loc': LOC}, ensure_ascii=False) + ';')
print(LOC, [len(g) for s in hot['left'] for g in s['groups']], len(cold['left']), [len(s) for s in food], food[0][0])
