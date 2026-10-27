// Port of Vencord's client theme support: canUseClientThemes (premium.js), handleGradientThemeSelect
// (apply gradient locally instead of syncing it to Discord) and handleProtoChange (keep the local
// theme when Discord's synced settings come back on connect).
import { canActuallyUse } from './premium'
import { addUnpatch, findProps, FluxDispatcher, logger, storage } from './shared'

const { intercept } = bunny.api.flux

function applyStoredPreset() {
	if (!storage.enableThemeBypass || storage.themePreset == null) return
	if (canActuallyUse('CLIENT_THEMES')) return
	setTimeout(() => {
		try {
			FluxDispatcher.dispatch({ type: 'UPDATE_BACKGROUND_GRADIENT_PRESET', presetId: storage.themePreset })
		} catch (e) {
			logger.error('[FakeNitro] failed to re-apply gradient theme', e)
		}
	})
}

// [Light, Dark, Midnight, Auto, ...gradient themes]
const isNonGradientThemeIndex = index => index < 4

export function patchThemes({ safely }) {
	safely('client themes', () => {
		const ThemeActions = findProps('updateBackgroundGradientPreset')
		if (ThemeActions) {
			const { before } = vendetta.patcher
			if (typeof ThemeActions.updateMobilePendingThemeIndex === 'function') {
				addUnpatch(
					before('updateMobilePendingThemeIndex', ThemeActions, args => {
						if (isNonGradientThemeIndex(args[0])) storage.themePreset = null
					}),
				)
			}
			addUnpatch(
				before('updateBackgroundGradientPreset', ThemeActions, args => {
					storage.themePreset = args[0]
				}),
			)
		} else {
			logger.warn('[FakeNitro] ClientThemesBackgroundActionCreators not found; theme will not persist')
		}

		addUnpatch(
			intercept(payload => {
				if (!storage.enableThemeBypass) return

				// handleGradientThemeSelect: don't sync a Nitro theme to Discord, apply it locally
				if (payload.type === 'SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE') {
					const appearance = payload.changes?.appearance
					const presetId = appearance?.settings?.clientThemeSettings?.backgroundGradientPresetId
					if (
						appearance &&
						presetId !== undefined &&
						appearance.shouldSync !== false &&
						!canActuallyUse('CLIENT_THEMES')
					) {
						setTimeout(() =>
							FluxDispatcher.dispatch({ type: 'UPDATE_BACKGROUND_GRADIENT_PRESET', presetId }),
						)
						appearance.shouldSync = false
						appearance.settings.clientThemeSettings.backgroundGradientPresetId = undefined
					}
				}

				// handleProtoChange: server settings arriving on connect would reset the theme
				if (payload.type === 'CONNECTION_OPEN') applyStoredPreset()
			}),
		)

		applyStoredPreset()
	})
}
