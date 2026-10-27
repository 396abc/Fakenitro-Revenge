// Fake Nitro for Revenge, by 396abc.
// Based on Vencord's FakeNitro by Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN and sadan.
// Mobile module lookups follow Palm's fake-nitro for Revenge Next.
// Licensed under GPL-3.0, like both of those.
import { patchAppIcons, patchSoundboard } from './extras'
import { patchExpressionSending } from './fakeify'
import { patchPremium } from './premium'
import { patchExpressionRendering } from './realify'
import Settings from './settings'
import { initStorage, logger, safely, unpatchAll } from './shared'
import { patchThemes } from './themes'

export default {
	onLoad() {
		initStorage()

		// Each group is applied separately so one broken patch doesn't stop the rest
		const ctx = { safely }
		safely('premium checks', patchPremium)
		patchExpressionSending(ctx)
		patchExpressionRendering(ctx)
		patchThemes(ctx)
		patchAppIcons(ctx)
		patchSoundboard(ctx)

		logger.log('[FakeNitro] loaded')
	},
	onUnload() {
		unpatchAll()
	},
	settings: Settings,
}
