// Receiving side: Vencord's transformAst, shouldIgnoreEmbed, patchFakeNitroStickers and filterAttachments.
// Desktop does this in the markdown parser + message accessories; mobile builds every chat row in
// RowManager.prototype.generate, so all of it happens there.
import {
	addUnpatch,
	fakeNitroGifStickerRegex,
	findName,
	findProps,
	getSearchParam,
	logger,
	Stores,
	storage,
} from './shared'

const MESSAGE_ROW_TYPE = 1
const MAX_JUMBO_EMOJIS = 30 // EmojiConstants.MAX_EMOJI_TO_BE_JUMBO
const STICKER_SIZE = 160 // mobile renders all chat stickers at this size
const STICKER_RENDER_LOOP = 0

const ExpressionUrlRegex =
	/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/(emojis|stickers)\/(\d+)\.(\w+)/

let AvatarUtils
let StickersUtils

function parseExpressionUrl(url) {
	if (typeof url !== 'string') return
	const match = ExpressionUrlRegex.exec(url)
	if (!match) return
	const extension = match[3].toLowerCase()
	return {
		kind: match[1],
		id: match[2],
		extension,
		name: getSearchParam(url, 'name') || undefined,
		animated: extension === 'gif' || getSearchParam(url, 'animated') === 'true',
	}
}

function createEmojiNode(link) {
	const known = Stores.EmojiStore?.getCustomEmojiById(link.id)
	const animated = link.animated || !!known?.animated
	return {
		type: 'customEmoji',
		id: link.id,
		alt: known?.name ?? link.name ?? 'FakeNitroEmoji',
		src: AvatarUtils.getEmojiURL({ id: link.id, animated, size: 48 }),
		frozenSrc: AvatarUtils.getEmojiURL({ id: link.id, animated: false, size: 48 }),
		fake: true,
	}
}

function createSticker(id, nameHint, extension) {
	const known = Stores.StickersStore?.getStickerById(id)
	const sticker = {
		id,
		name: known?.name ?? nameHint ?? 'FakeNitroSticker',
		format_type: known?.format_type ?? (extension === 'gif' ? 4 : 1),
	}
	return Object.assign({}, sticker, {
		asset: id,
		url: StickersUtils.getStickerAssetUrl(sticker) ?? '',
		width: STICKER_SIZE,
		height: STICKER_SIZE,
		renderMode: STICKER_RENDER_LOOP,
		accessibilityLabel: sticker.name,
		accessibilityHint: '',
		fake: true,
	})
}

const isWhitespace = n => n?.type === 'text' && typeof n.content === 'string' && !n.content.trim()

function trimWhitespace(nodes) {
	let start = 0
	let end = nodes.length
	while (start < end && isWhitespace(nodes[start])) start++
	while (end > start && isWhitespace(nodes[end - 1])) end--
	return start === 0 && end === nodes.length ? nodes : nodes.slice(start, end)
}

function isJumboable(nodes) {
	let count = 0
	for (const n of nodes) {
		if (n?.type === 'emoji' || n?.type === 'customEmoji') count++
		else if (!isWhitespace(n)) return false
	}
	return count > 0 && count <= MAX_JUMBO_EMOJIS
}

/** Vencord only transforms "simple" messages unless transformCompoundSentence is on */
function isSimpleMessage(content) {
	return trimWhitespace(content || []).length <= 1
}

function attachmentUrl(a) {
	return a?.url ?? a?.proxyURL ?? a?.proxy_url ?? a?.uri ?? a?.source?.uri
}

function realify(message, isReplyPreview) {
	const emojis = storage.transformEmojis
	// Reply previews only show text, so sticker links stay links there
	const stickers = !isReplyPreview && storage.transformStickers
	if (!emojis && !stickers) return

	const original = message.content || []
	const compoundOk = storage.transformCompoundSentence || isSimpleMessage(original)

	const emojiIds = new Set()
	const newStickers = new Map()

	const parse = url => {
		const link = parseExpressionUrl(url)
		if (link && (link.kind === 'emojis' ? emojis : stickers)) return link
	}

	// transformAst: nodes may be cached by Discord, so copy instead of mutating
	const convertNodes = nodes => {
		let changed = false
		const out = []
		for (const node of nodes) {
			const conv = convertNode(node)
			if (conv !== node) changed = true
			if (conv) out.push(conv)
		}
		return changed ? out : nodes
	}

	const convertNode = node => {
		if (node?.type === 'link') {
			const link = parse(node.target)
			if (!link) return node
			if (link.kind === 'emojis') {
				emojiIds.add(link.id)
				return createEmojiNode(link)
			}
			// Sticker links are removed from the text and rendered as stickers instead
			if (!newStickers.has(link.id)) newStickers.set(link.id, createSticker(link.id, link.name, link.extension))
			return null
		}
		if (Array.isArray(node?.content)) {
			const content = convertNodes(node.content)
			if (content !== node.content) return Object.assign({}, node, { content })
		}
		return node
	}

	let content = compoundOk ? convertNodes(original) : original

	// shouldIgnoreEmbed: a message that is only a link has its text hidden behind the embed
	let removedEmbeds = false
	const embeds = !compoundOk
		? message.embeds
		: message.embeds?.filter(embed => {
				if (embed?.type !== 'image' && embed?.type !== 'gifv') return true
				const link = parse(embed.url ?? embed.image?.url)
				if (!link) return true

				if (link.kind === 'stickers') {
					if (!newStickers.has(link.id)) newStickers.set(link.id, createSticker(link.id, link.name, link.extension))
				} else if (!emojiIds.has(link.id)) {
					if (original.length) return true
					if (content.length) content = content.concat([{ type: 'text', content: ' ' }])
					content = content.concat([createEmojiNode(link)])
					emojiIds.add(link.id)
				}
				removedEmbeds = true
				return false
			})

	// filterAttachments + gif part of patchFakeNitroStickers: animated stickers sent by
	// Vencord users as GIF uploads. Only treated as stickers when StickersStore knows the id.
	let attachments = message.attachments
	if (stickers && Array.isArray(attachments) && attachments.length) {
		const kept = attachments.filter(a => {
			const match = String(attachmentUrl(a) ?? '').match(fakeNitroGifStickerRegex)
			if (!match || !Stores.StickersStore?.getStickerById(match[1])) return true
			if (!newStickers.has(match[1])) newStickers.set(match[1], createSticker(match[1], undefined, 'gif'))
			return false
		})
		if (kept.length !== attachments.length) attachments = kept
	}

	if (content === original && !removedEmbeds && !newStickers.size && attachments === message.attachments) return

	content = trimWhitespace(content)
	if (!isReplyPreview && isJumboable(content)) {
		content = content.map(n => Object.assign({}, n, { jumboable: true }))
	}

	const result = Object.assign({}, message, { content, embeds, attachments })
	if (newStickers.size) result.stickers = (message.stickers || []).concat([...newStickers.values()])
	if ((removedEmbeds || attachments !== message.attachments) && !embeds?.length && !attachments?.length) {
		result.useAttachmentGridLayout = false
		result.useAttachmentUploadPreview = false
	}
	return result
}

export function patchExpressionRendering({ safely }) {
	safely('message rendering', () => {
		AvatarUtils = findProps('getEmojiURL')
		StickersUtils = findProps('getStickerAssetUrl')
		const RowManager = findName('RowManager')

		if (!AvatarUtils) throw new Error('AvatarUtils (getEmojiURL) not found')
		if (!StickersUtils) throw new Error('StickersUtils (getStickerAssetUrl) not found')
		if (!RowManager?.prototype?.generate) throw new Error('RowManager.generate not found')

		addUnpatch(
			vendetta.patcher.after('generate', RowManager.prototype, (args, row) => {
				if (row?.type !== MESSAGE_ROW_TYPE || !row.message) return row
				try {
					const message = realify(row.message, false)
					if (message) row.message = message

					const reply = row.message.referencedMessage
					const replyMessage = reply?.message && realify(reply.message, true)
					if (replyMessage) {
						row.message = Object.assign({}, row.message, {
							referencedMessage: Object.assign({}, reply, { message: replyMessage }),
						})
					}
				} catch (e) {
					logger.error('[FakeNitro] failed to transform message', e)
				}
				return row
			}),
		)
	})
}

// exported for tests
export const _internal = { realify, parseExpressionUrl, setUtils: (a, s) => ((AvatarUtils = a), (StickersUtils = s)) }
