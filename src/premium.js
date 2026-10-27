// Nitro feature checks. On mobile they all go through ProductCatalog.canUserUse(product),
// so one patch covers stickers, streaming, themes and app icons.
import { addUnpatch, findProps, logger, storage } from './shared'

export let ProductCatalog
let originalCanUserUse

// The real answer, ignoring our patch. Used to check if the user actually has Nitro for something.
export function canActuallyUse(productKey) {
	if (!ProductCatalog || !originalCanUserUse) return false
	try {
		return originalCanUserUse.call(ProductCatalog, ProductCatalog[productKey])
	} catch {
		return false
	}
}

function shouldBypass(key) {
	if (!key) return false
	if (key === 'STICKERS_EVERYWHERE') return storage.enableStickerBypass
	if (key === 'CLIENT_THEMES') return storage.enableThemeBypass
	if (key === 'APP_ICONS') return storage.enableAppIconBypass
	if (/STREAM|VIDEO_UPLOAD|VIDEO_QUALITY/.test(key)) return storage.enableStreamQualityBypass

	// Emoji products are left alone on purpose. If Discord thought we could use any emoji it
	// would send them as real emoji and the server would reject them. fakeify.js handles emoji.
	return false
}

export function patchPremium() {
	ProductCatalog = findProps('canUserUse')
	if (!ProductCatalog) throw new Error('ProductCatalog (canUserUse) not found')

	originalCanUserUse = ProductCatalog.canUserUse

	// canUserUse gets passed a product value, map it back to its name (STICKERS_EVERYWHERE etc.)
	const keyOf = new Map()
	for (const key of Object.keys(ProductCatalog)) {
		const value = ProductCatalog[key]
		if (value != null && typeof value !== 'function') keyOf.set(value, key)
	}
	logger.log(`[FakeNitro] products: ${[...keyOf.values()].join(', ')}`)

	addUnpatch(
		vendetta.patcher.instead('canUserUse', ProductCatalog, function (args, orig) {
			if (shouldBypass(keyOf.get(args[0]))) return true
			return orig.apply(this, args)
		}),
	)
}
