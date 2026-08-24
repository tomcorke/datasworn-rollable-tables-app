import { readdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
const files = (await readdir('src/data')).filter(file => file.endsWith('.yaml'));
const data = Object.fromEntries(await Promise.all(files.map(async file => [file.replace('.yaml', ''), parse(await readFile(`src/data/${file}`, 'utf8'), { maxAliasCount: -1 })])));
await writeFile('src/data/index.json', JSON.stringify(data));
console.log(`Bundled ${files.length} Datasworn files`);
