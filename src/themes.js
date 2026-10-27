// Nitro gradient themes. The theme is applied on this device only and never synced to
// Discord's servers, since that would fail without Nitro.
import { canActuallyUse } from './premium'
import { addUnpatch, findProps, FluxDispatcher, logger, storage } from './shared'

const { intercept } = bunny.api.flux

// Theme picker indexes: 0 Light, 1 Dark, 2 Midnight, 3 Auto, then the gradients
const isNonGradientThemeIndex = index => index < 4

function applyStoredPreset() {
	if (!storage.enableThemeBypass) return
	if (typeof storage.themePreset !== 'number' || storage.themePreset < 0) return
	if (canActuallyUse('CLIENT_THEMES')) return

	setTimeout(() => {
		try {
			FluxDispatcher.dispatch({ type: 'UPDATE_BACKGROUND_GRADIENT_PRESET', presetId: storage.themePreset })
		} catch (e) {
			logger.error('[FakeNitro] failed to re-apply gradient theme', e)
		}
	})
}

export function patchThemes({ safely }) {
	safely('client themes', () => {
		// Remember which gradient was picked so it can be put back after a restart
		const ThemeActions = findProps('updateBackgroundGradientPreset')
		if (ThemeActions) {
			const { before } = vendetta.patcher
			if (typeof ThemeActions.updateMobilePendingThemeIndex === 'function') {
				addUnpatch(
					before('updateMobilePendingThemeIndex', ThemeActions, args => {
						if (isNonGradientThemeIndex(args[0])) storage.themePreset = -1
					}),
				)
			}
			addUnpatch(
				before('updateBackgroundGradientPreset', ThemeActions, args => {
					if (typeof args[0] === 'number') storage.themePreset = args[0]
				}),
			)
		} else {
			logger.warn('[FakeNitro] theme action creators not found, theme won\'t persist')
		}

		addUnpatch(
			intercept(payload => {
				if (!storage.enableThemeBypass) return

				// Picking a gradient tries to sync it to the account. Without Nitro that fails,
				// so turn syncing off for this change and apply the theme locally.
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

				// The account's real settings come back on connect and would reset the theme
				if (payload.type === 'CONNECTION_OPEN') applyStoredPreset()
			}),
		)

		applyStoredPreset()
	})
}
