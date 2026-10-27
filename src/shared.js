// Shared state, settings, module lookups and helpers.
// Port of Vencord's FakeNitro to classic Revenge (Vendetta-compatible plugin API).

export const storage = vendetta.plugin.storage
export const logger = vendetta.logger
export const { React, ReactNative, FluxDispatcher } = vendetta.metro.common

const metro = vendetta.metro

export const DEFAULT_EMOJI_SIZE = 48
export const DEFAULT_STICKER_SIZE = 160
export const MEDIA_SIZES = [16, 32, 48, 56, 64, 96, 128, 160, 256, 512, 1024]

// Same option set and defaults as Vencord's definePluginSettings
export const DEFAULTS = {
	enableEmojiBypass: true,
	emojiSize: DEFAULT_EMOJI_SIZE,
	transformEmojis: true,
	enableStickerBypass: true,
	stickerSize: DEFAULT_STICKER_SIZE,
	transformStickers: true,
	transformCompoundSentence: false,
	enableStreamQualityBypass: true,
	useHyperLinks: true,
	hyperLinkText: '{{NAME}}',
	disableEmbedPermissionCheck: false,
	// Mobile-only extras
	enableThemeBypass: true,
	enableAppIconBypass: true,
	enableSoundboardBypass: true,
	themePreset: null,
}

export function initStorage() {
	for (const key in DEFAULTS) {
		if (storage[key] === undefined) storage[key] = DEFAULTS[key]
	}
}

// ---------- Module lookups ----------

export function findProps(...props) {
	try {
		return metro.findByProps(...props)
	} catch (e) {
		logger.error(`[FakeNitro] findByProps(${props}) failed`, e)
	}
}

export function findPath(path, exportDefault = false) {
	try {
		return bunny.metro.findByFilePath(path, exportDefault)
	} catch (e) {
		logger.error(`[FakeNitro] findByFilePath(${path}) failed`, e)
	}
}

export function findName(name, exportDefault = true) {
	try {
		return metro.findByName(name, exportDefault)
	} catch (e) {
		logger.error(`[FakeNitro] findByName(${name}) failed`, e)
	}
}

export function findStore(name) {
	try {
		return metro.findByStoreName(name)
	} catch (e) {
		logger.error(`[FakeNitro] findByStoreName(${name}) failed`, e)
	}
}

export const Stores = {
	get UserStore() { return findStore('UserStore') },
	get ChannelStore() { return findStore('ChannelStore') },
	get PermissionStore() { return findStore('PermissionStore') },
	get StickersStore() { return findStore('StickersStore') },
	get EmojiStore() { return findStore('EmojiStore') },
	get SelectedGuildStore() { return findStore('SelectedGuildStore') },
}

// ---------- Permissions ----------

export const Permissions = {
	EMBED_LINKS: BigInt(1) << BigInt(14),
	ATTACH_FILES: BigInt(1) << BigInt(15),
	USE_EXTERNAL_EMOJIS: BigInt(1) << BigInt(18),
	USE_EXTERNAL_STICKERS: BigInt(1) << BigInt(37),
}

export function hasPermission(channelId, permission) {
	const channel = Stores.ChannelStore?.getChannel(channelId)
	if (!channel || channel.isPrivate?.()) return true
	try {
		return Stores.PermissionStore.can(permission, channel)
	} catch {
		return true
	}
}

export const hasEmbedPerms = id => hasPermission(id, Permissions.EMBED_LINKS)
export const hasExternalStickerPerms = id => hasPermission(id, Permissions.USE_EXTERNAL_STICKERS)

// ---------- Nitro state ----------

export function premiumType() {
	return Stores.UserStore?.getCurrentUser?.()?.premiumType ?? 0
}

// ---------- Regexes (from Vencord) ----------

export const fakeNitroEmojiRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/
export const fakeNitroStickerRegex = /\/stickers\/(\d+?)\./
export const fakeNitroGifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/
export const hyperLinkRegex = /\[.+?\]\((https?:\/\/.+?)\)/
export const hyperLinkOnlyRegex = new RegExp(`^${hyperLinkRegex.source}$`)

export function getWordBoundary(origStr, offset) {
	return !origStr[offset] || /\s/.test(origStr[offset]) ? '' : ' '
}

export function getSearchParam(url, name) {
	const match = new RegExp(`[?&]${name}=([^&#]*)`).exec(url)
	if (!match) return null
	try {
		return decodeURIComponent(match[1])
	} catch {
		return match[1]
	}
}

export function linkText(name) {
	return String(storage.hyperLinkText ?? DEFAULTS.hyperLinkText).split('{{NAME}}').join(name)
}

export function formatLink(url, name) {
	return storage.useHyperLinks ? `[${linkText(name)}](${url})` : url
}

// ---------- Unpatch bookkeeping ----------

const unpatches = []

export function addUnpatch(...fns) {
	for (const fn of fns) if (typeof fn === 'function') unpatches.push(fn)
}

export function unpatchAll() {
	while (unpatches.length) {
		try {
			unpatches.pop()()
		} catch (e) {
			logger.error('[FakeNitro] unpatch failed', e)
		}
	}
}

export function safely(name, fn) {
	try {
		fn()
		logger.log(`[FakeNitro] ${name}: ok`)
		return true
	} catch (e) {
		logger.error(`[FakeNitro] ${name}: failed`, e)
		return false
	}
}
