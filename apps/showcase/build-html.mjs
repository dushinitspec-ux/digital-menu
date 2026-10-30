// Собирает dist/digital-menu-showcase.html: стили (со встроенными шрифтами) и скрипт в одном файле.
// Файл открывается двойным щелчком без сервера и публикуется как страница-демо.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dist = new URL('./dist/', import.meta.url);
const js = readFileSync(new URL('showcase.js', dist), 'utf8');
const cssFile = readdirSync(dist).find((f) => f.endsWith('.css'));
const css = cssFile ? readFileSync(new URL(cssFile, dist), 'utf8') : '';
if (js.includes('</script')) throw new Error('script contains </script>');

const html = `<meta charset="utf-8">
<title>Digital Menu</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync(new URL('digital-menu-showcase.html', dist), html);
console.log(`digital-menu-showcase.html ${(html.length / 1024 / 1024).toFixed(2)} MB`);
