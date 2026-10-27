import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const out = 'dist/FakeNitro'
mkdirSync(out, { recursive: true })

const result = await build({
	entryPoints: ['src/index.js'],
	bundle: true,
	write: false,
	format: 'iife',
	globalName: '__plugin',
	target: 'es2016',
	jsx: 'transform',
	jsxFactory: 'React.createElement',
	jsxFragment: 'React.Fragment',
	legalComments: 'none',
	minify: false,
})

let code = result.outputFiles[0].text.trim()
// Vendetta loader evals `vendetta=>{return <code>}` so the plugin must be one expression
code = code.replace(/^var __plugin = /, '').replace(/;$/, '')
writeFileSync(`${out}/index.js`, code)

const manifest = {
	name: 'Fake Nitro',
	description:
		"A vibecoded plugin for Revenge, adapting the FakeNitro plugin from Vencord. Send fake emojis and stickers, see them as real ones, and use Nitro themes, app icons, stream quality and soundboard. Original FakeNitro by Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN and sadan (Vencord). Mobile adaptation based on Palm's Revenge Next fake-nitro.",
	authors: [{ name: 'Vencord FakeNitro contributors' }, { name: 'Revenge port' }],
	main: 'index.js',
	hash: createHash('sha256').update(code).digest('hex'),
	vendetta: { icon: 'NitroWheelIcon' },
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log('built', code.length, 'bytes, hash', manifest.hash.slice(0, 12))
