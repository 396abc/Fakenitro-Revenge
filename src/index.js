// Fake Nitro for classic Revenge — port of Vencord's FakeNitro plugin.
// Vencord authors: Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN, sadan (GPL-3.0).
// Mobile module mapping informed by Revenge Next's fake-nitro (Palm and contributors, GPL-3.0).
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
