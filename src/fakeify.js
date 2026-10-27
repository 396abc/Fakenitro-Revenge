// Sending side: Vencord's emoji picker / intention patches, sticker "SENDABLE" patch,
// addMessagePreSendListener, addMessagePreEditListener and the sticker bypass.
import { showCannotEmbedNotice, showUnsupportedStickerNotice } from './alerts'
import { canActuallyUse } from './premium'
import {
	addUnpatch,
	DEFAULT_EMOJI_SIZE,
	DEFAULT_STICKER_SIZE,
	findPath,
	findProps,
	formatLink,
	getWordBoundary,
	hasEmbedPerms,
	hasExternalStickerPerms,
	hasPermission,
	logger,
	Permissions,
	premiumType,
	Stores,
	storage,
} from './shared'

const { before, instead } = vendetta.patcher

let EmojiUtils
let Intention = {}
let ALLOWED_INTENTIONS = new Set()

// ---------- Emoji availability (port of canUseEmote) ----------

function canUseEmote(emoji, channelId) {
	if (!emoji || !emoji.id) return true // unicode emoji
	if (emoji.type === 0) return true

	const channel = Stores.ChannelStore?.getChannel(channelId)
	const getReason = EmojiUtils?.default?.getEmojiUnavailableReason

	// Discord's own check covers: role-subscription emoji, Twitch/managed sub emotes,
	// external emoji permission, animated/premium lock and unavailable guild emoji.
	if (getReason && Intention.CHAT !== undefined) {
		try {
			return getReason.call(EmojiUtils.default, {
				channel,
				emoji,
				intention: Intention.CHAT,
				bypass: true, // our marker: skip the picker bypass and get the real answer
			}) == null
		} catch (e) {
			logger.error('[FakeNitro] getEmojiUnavailableReason failed, using fallback', e)
		}
	}

	// Fallback: Vencord's original logic
	if (emoji.available === false) return false
	const guildId = channel?.guild_id ?? Stores.SelectedGuildStore?.getGuildId?.()
	if (premiumType() > 0) {
		return emoji.guildId === guildId || hasPermission(channelId, Permissions.USE_EXTERNAL_EMOJIS)
	}
	return !emoji.animated && emoji.guildId === guildId
}

// ---------- Link builders ----------

function emojiUrl(emoji) {
	const size = storage.emojiSize ?? DEFAULT_EMOJI_SIZE
	let url =
		`https://cdn.discordapp.com/emojis/${emoji.id}.webp` +
		`?size=${size}&name=${encodeURIComponent(emoji.name)}&lossless=true`
	if (emoji.animated) url += '&animated=true'
	return url
}

// StickerFormatType: 1 PNG, 2 APNG, 3 LOTTIE, 4 GIF
function stickerUrl(sticker) {
	const ext = sticker.format_type === 4 ? 'gif' : 'png'
	const size = storage.stickerSize ?? DEFAULT_STICKER_SIZE
	return (
		`https://media.discordapp.net/stickers/${sticker.id}.${ext}` +
		`?size=${size}&name=${encodeURIComponent(sticker.name)}&lossless=true`
	)
}

function emojiName(emoji) {
	return (emoji.originalName || emoji.name || 'emoji').replace(/~\d+$/, '')
}

// Replaces every `<a:name:id>` / `<:name:id>` for this emoji id, keeping Vencord's word-boundary spacing
function replaceEmoji(content, emoji) {
	const link = formatLink(emojiUrl(emoji), emojiName(emoji))
	const re = new RegExp(`<a?:[^:<>\\s]+:${emoji.id}>`, 'g')
	return content.replace(re, (match, offset, str) =>
		getWordBoundary(str, offset - 1) + link + getWordBoundary(str, offset + match.length),
	)
}

// ---------- Pre-send / pre-edit ----------

/** @returns Promise<boolean> whether to continue sending */
function processMessage(channelId, data, isEdit) {
	if (!storage.enableEmojiBypass || !data || typeof data.content !== 'string') {
		return Promise.resolve(true)
	}

	let hasBypass = false

	if (isEdit) {
		// Vencord's edit listener: scan raw content with EmojiStore
		const seen = new Set()
		const re = /(\\)?<a?:\w+:(\d+)>/g
		let m
		while ((m = re.exec(data.content))) {
			if (m[1] || seen.has(m[2])) continue
			seen.add(m[2])
			const emoji = Stores.EmojiStore?.getCustomEmojiById(m[2])
			if (!emoji || canUseEmote(emoji, channelId)) continue
			hasBypass = true
			data.content = replaceEmoji(data.content, emoji)
			re.lastIndex = 0
		}
	}

	// Emoji Discord already flagged as unusable
	if (Array.isArray(data.invalidEmojis) && data.invalidEmojis.length) {
		for (const emoji of data.invalidEmojis) {
			if (!emoji?.id) continue
			hasBypass = true
			data.content = replaceEmoji(data.content, emoji)
		}
		data.invalidEmojis = []
	}

	if (Array.isArray(data.validNonShortcutEmojis) && data.validNonShortcutEmojis.length) {
		data.validNonShortcutEmojis = data.validNonShortcutEmojis.filter(emoji => {
			if (canUseEmote(emoji, channelId)) return true
			hasBypass = true
			data.content = replaceEmoji(data.content, emoji)
			return false
		})
	}

	if (hasBypass && !storage.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
		return showCannotEmbedNotice()
	}
	return Promise.resolve(true)
}

// ---------- Patches ----------

function patchEmojiAvailability() {
	EmojiUtils = findProps('countEmoji')
	const EmojiConstants =
		findPath('modules/emojis/EmojiConstants.tsx') ?? findProps('EmojiIntention')
	Intention = EmojiConstants?.EmojiIntention ?? {}

	if (!EmojiUtils?.default?.getEmojiUnavailableReason) {
		throw new Error('EmojiUtils.getEmojiUnavailableReason not found')
	}
	if (Intention.CHAT === undefined) throw new Error('EmojiIntention not found')

	// Vencord: IS_BYPASSEABLE_INTENTION = [CHAT, GUILD_STICKER_RELATED_EMOJI]
	// Mobile also autocompletes emoji through AUTO_SUGGESTION.
	ALLOWED_INTENTIONS = new Set(
		[Intention.CHAT, Intention.GUILD_STICKER_RELATED_EMOJI, Intention.AUTO_SUGGESTION].filter(
			x => x !== undefined,
		),
	)

	addUnpatch(
		instead('getEmojiUnavailableReason', EmojiUtils.default, function (args, orig) {
			const opts = args[0] || {}
			if (storage.enableEmojiBypass && !opts.bypass && ALLOWED_INTENTIONS.has(opts.intention)) {
				return null
			}
			return orig.apply(this, args)
		}),
	)
}

function patchEmojiPicker() {
	const mod = findPath('modules/emoji_picker/native/components/EmojiPickerList.tsx')
	if (!mod?.default) throw new Error('EmojiPickerList not found')

	const empty = new Set()
	const target = mod.default.type ? mod.default : mod
	const key = mod.default.type ? 'type' : 'default'

	addUnpatch(
		before(key, target, args => {
			const props = args[0]
			if (!storage.enableEmojiBypass || !props) return
			// Voice-call / status / reaction pickers keep their limits (Vencord's ".CHAT" -> ".STATUS" patch)
			if (!ALLOWED_INTENTIONS.has(props.emojiPickerIntention)) return

			for (const cat of props.categories || []) {
				if (cat && 'emojisDisabled' in cat) {
					cat.emojisDisabled = empty
					cat.isNitroLocked = false
				}
			}
		}),
	)
}

function patchStickerPicker() {
	const mod = findPath('modules/stickers/native/StickerPickerListRow.tsx')
	if (!mod?.default) throw new Error('StickerPickerListRow not found')

	// Vencord: '"SENDABLE"' patch, `x.available ? ...` -> `true ? ...`
	addUnpatch(
		before('default', mod, args => {
			const props = args[0]
			if (!storage.enableStickerBypass || !Array.isArray(props?.stickers)) return
			props.stickers = props.stickers.map(s => Object.assign({}, s, { available: true }))
		}),
	)
}

function patchMessageActions() {
	const Actions = findProps('sendMessage', 'editMessage')
	if (!Actions) throw new Error('MessageActionCreators not found')

	addUnpatch(
		instead('sendMessage', Actions, function (args, orig) {
			return processMessage(args[0], args[1], false).then(ok =>
				ok ? orig.apply(this, args) : undefined,
			)
		}),
		instead('editMessage', Actions, function (args, orig) {
			return processMessage(args[0], args[2], true).then(ok =>
				ok ? orig.apply(this, args) : undefined,
			)
		}),
	)

	if (typeof Actions.sendStickers === 'function') {
		addUnpatch(
			instead('sendStickers', Actions, function (args, orig) {
				if (!storage.enableStickerBypass) return orig.apply(this, args)

				const [channelId, stickerIds, a2, extra] = args
				const channel = Stores.ChannelStore?.getChannel(channelId)
				if (!channel || !Array.isArray(stickerIds)) return orig.apply(this, args)

				const canUseStickers =
					canActuallyUse('STICKERS_EVERYWHERE') && hasExternalStickerPerms(channelId)

				const realIds = []
				const links = []
				let lottie = false

				for (const id of stickerIds) {
					const sticker = Stores.StickersStore?.getStickerById(id)
					// Unknown, or a Discord default sticker (free for everyone)
					if (!sticker || 'pack_id' in sticker) {
						realIds.push(id)
						continue
					}
					if (
						sticker.available !== false &&
						(canUseStickers || sticker.guild_id === channel.guild_id)
					) {
						realIds.push(id)
						continue
					}
					if (sticker.format_type === 3) {
						lottie = true
						continue
					}
					links.push(formatLink(stickerUrl(sticker), sticker.name))
				}

				if (lottie) {
					showUnsupportedStickerNotice()
					return Promise.resolve()
				}
				if (!links.length) return orig.apply(this, args)

				const proceed =
					!storage.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)
						? showCannotEmbedNotice()
						: Promise.resolve(true)

				return proceed.then(ok => {
					if (!ok) return
					const sends = [
						Actions.sendMessage(
							channelId,
							{ content: links.join(' '), invalidEmojis: [], validNonShortcutEmojis: [], tts: false },
							a2,
							extra,
						),
					]
					if (realIds.length) {
						const realArgs = args.slice()
						realArgs[1] = realIds
						sends.push(orig.apply(this, realArgs))
					}
					return Promise.all(sends)
				})
			}),
		)
	}
}

export function patchExpressionSending({ safely }) {
	safely('emoji availability', patchEmojiAvailability)
	safely('emoji picker', patchEmojiPicker)
	safely('sticker picker', patchStickerPicker)
	safely('send/edit/sticker bypass', patchMessageActions)
}
