// Things every other file needs: settings, module finders and small helpers.

export const storage = vendetta.plugin.storage
export const logger = vendetta.logger
export const { React, ReactNative, FluxDispatcher } = vendetta.metro.common

const metro = vendetta.metro

export const DEFAULT_EMOJI_SIZE = 48
export const DEFAULT_STICKER_SIZE = 160
export const MEDIA_SIZES = [16, 32, 48, 56, 64, 96, 128, 160, 256, 512, 1024]

// Same options and defaults as the Vencord plugin, plus a few mobile extras at the bottom
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

	enableThemeBypass: true,
	enableAppIconBypass: true,
	enableSoundboardBypass: true,
	// -1 means no theme saved. Don't use null here, Revenge's storage crashes on it.
	themePreset: -1,
}

export function initStorage() {
	for (const key in DEFAULTS) {
		if (storage[key] === undefined || storage[key] === null) storage[key] = DEFAULTS[key]
	}
}

// Finders. These log instead of throwing so one missing module doesn't kill the whole plugin.

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

// Discord permission bits
export const Permissions = {
	EMBED_LINKS: BigInt(1) << BigInt(14),
	USE_EXTERNAL_EMOJIS: BigInt(1) << BigInt(18),
	USE_EXTERNAL_STICKERS: BigInt(1) << BigInt(37),
}

export function hasPermission(channelId, permission) {
	const channel = Stores.ChannelStore?.getChannel(channelId)
	// DMs have no permissions to check
	if (!channel || channel.isPrivate?.()) return true
	try {
		return Stores.PermissionStore.can(permission, channel)
	} catch {
		return true
	}
}

export const hasEmbedPerms = id => hasPermission(id, Permissions.EMBED_LINKS)
export const hasExternalStickerPerms = id => hasPermission(id, Permissions.USE_EXTERNAL_STICKERS)

export function premiumType() {
	return Stores.UserStore?.getCurrentUser?.()?.premiumType ?? 0
}

// Matches the GIF uploads Vencord users send for animated stickers
export const gifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/

// Adds a space if the character next to the link isn't already whitespace
export function getWordBoundary(str, offset) {
	return !str[offset] || /\s/.test(str[offset]) ? '' : ' '
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

export function formatLink(url, name) {
	if (!storage.useHyperLinks) return url
	const text = String(storage.hyperLinkText ?? DEFAULTS.hyperLinkText).split('{{NAME}}').join(name)
	return `[${text}](${url})`
}

// Every patch registers its undo function here so onUnload can clean up

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

// Runs one group of patches and logs whether it worked, so a broken group is easy to spot in logcat
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
