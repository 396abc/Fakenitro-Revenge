// Port of Vencord's app icon patch (canUsePremiumAppIcons + isPremium(getCurrentUser()) -> true)
// and the soundboard patch (force `available: true` on received sounds).
import { addUnpatch, findProps, logger, storage } from './shared'

const SOUNDBOARD_EVENTS = new Set([
	'SOUNDBOARD_SOUNDS_RECEIVED',
	'GUILD_SOUNDBOARD_SOUND_CREATE',
	'GUILD_SOUNDBOARD_SOUND_UPDATE',
	'GUILD_SOUNDBOARD_SOUNDS_UPDATE',
])

export function patchAppIcons({ safely }) {
	safely('app icons', () => {
		const { after, instead } = vendetta.patcher

		const AppIconTypes = findProps('MasterAppIconIds')
		if (AppIconTypes) {
			const { FreemiumAppIconIds, MasterAppIconIds } = AppIconTypes
			const apply = () => {
				AppIconTypes.FreemiumAppIconIds = storage.enableAppIconBypass ? MasterAppIconIds : FreemiumAppIconIds
			}
			apply()
			addUnpatch(() => {
				AppIconTypes.FreemiumAppIconIds = FreemiumAppIconIds
			})
		} else {
			logger.warn('[FakeNitro] AppIconTypes not found')
		}

		const AppIconUtils = findProps('getIcons')
		if (!AppIconUtils) throw new Error('AppIconUtils (getIcons) not found')

		const unlock = icon => {
			if (icon && storage.enableAppIconBypass) icon.isPremium = false
			return icon
		}
		const unlockAll = icons => {
			if (Array.isArray(icons)) icons.forEach(unlock)
			return icons
		}

		for (const fn of ['getIcons', 'getOfficialAlternateIcons', 'getLimitedAlternateIcons']) {
			if (typeof AppIconUtils[fn] === 'function') {
				addUnpatch(after(fn, AppIconUtils, (_, ret) => unlockAll(ret)))
			}
		}
		if (typeof AppIconUtils.getIconById === 'function') {
			addUnpatch(after('getIconById', AppIconUtils, (_, ret) => unlock(ret)))
		}
	})
}

function markAvailable(value, depth) {
	if (!value || typeof value !== 'object' || depth > 6) return
	if (Array.isArray(value)) {
		for (const v of value) markAvailable(v, depth + 1)
		return
	}
	if (('soundId' in value || 'sound_id' in value) && 'available' in value) value.available = true
	for (const key in value) markAvailable(value[key], depth + 1)
}

export function patchSoundboard({ safely }) {
	safely('soundboard', () => {
		addUnpatch(
			bunny.api.flux.intercept(payload => {
				if (storage.enableSoundboardBypass && SOUNDBOARD_EVENTS.has(payload.type)) markAvailable(payload, 0)
			}),
		)
	})
}
