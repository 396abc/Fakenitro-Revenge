// Bundles src/ into dist/FakeNitro/index.js and writes the manifest Revenge reads.
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'

const out = 'dist/FakeNitro'
mkdirSync(out, { recursive: true })

const result = await build({
	entryPoints: ['src/index.js'],
	bundle: true,
	write: false,
	format: 'iife',
	globalName: '__plugin',
	// Older syntax so Discord's JS engine (Hermes) can eval it
	target: 'es2016',
	jsx: 'transform',
	jsxFactory: 'React.createElement',
	jsxFragment: 'React.Fragment',
	legalComments: 'none',
})

// Revenge runs plugins as `vendetta => { return <code> }`, so the bundle has to be a
// single expression. Strip the `var __plugin =` esbuild adds.
let code = result.outputFiles[0].text.trim()
code = code.replace(/^var __plugin = /, '').replace(/;$/, '')
writeFileSync(`${out}/index.js`, code)

const manifest = {
	name: 'Fake Nitro',
	description:
		'A vibecoded plugin for Revenge, adapting the FakeNitro plugin from Vencord. Send fake emojis and stickers, ' +
		'see them as real ones, and use Nitro themes, app icons, stream quality and soundboard. ' +
		'Original FakeNitro by Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN and sadan (Vencord). ' +
		"Mobile adaptation based on Palm's Revenge Next fake-nitro.",
	authors: [{ name: '396abc' }],
	main: 'index.js',
	// Revenge only re-downloads the plugin when this changes
	hash: createHash('sha256').update(code).digest('hex'),
	vendetta: { icon: 'NitroWheelIcon' },
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')

console.log(`built ${out} (${code.length} bytes)`)
