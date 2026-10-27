// Port of Vencord's "canUseCustomStickersEverywhere / canStreamQuality / canUseHighVideoUploadQuality /
// canUseClientThemes / canUsePremiumAppIcons -> return true" patches.
// Mobile routes all of these through ProductCatalog.canUserUse(product).
import { addUnpatch, findProps, logger, storage } from './shared'

export let ProductCatalog
let originalCanUserUse

/** Real (un-bypassed) entitlement check, used where Vencord checks `premiumType` */
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
	// EMOJIS_EVERYWHERE / ANIMATED_EMOJIS are deliberately NOT bypassed here.
	// Like Vencord, emoji are only unlocked for CHAT intentions (see expressions.js),
	// otherwise Discord would try to send them as real emoji and reject the message.
	return false
}

export function patchPremium() {
	ProductCatalog = findProps('canUserUse')
	if (!ProductCatalog) throw new Error('ProductCatalog (canUserUse) not found')

	originalCanUserUse = ProductCatalog.canUserUse

	// Reverse map product value -> key name, so we don't depend on product IDs
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
