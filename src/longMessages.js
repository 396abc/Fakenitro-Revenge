// Messages over the length limit can be turned into a message.txt attachment, like on desktop.
// Discord's own limit is raised so it doesn't block the message with its Nitro popup,
// then sendMessage checks the real limit and offers to attach the text as a file instead.
// The file goes into the chat box's upload tray, so it's only sent when the user hits send.
import { showMessageTooLongNotice } from './alerts'
import { addUnpatch, findProps, FluxDispatcher, logger, premiumType, Stores, storage } from './shared'

const FILE_NAME = 'message.txt'
const NO_LIMIT = 1073741824 // 2^30, effectively no limit
const DRAFT_TYPE_CHANNEL_MESSAGE = 0

let Limits
let original

// Nitro (premiumType 2) gets 4000, everyone else including Nitro Basic gets 2000
const realLimit = () => (premiumType() === 2 ? 4000 : 2000)

export function applyLimits() {
	if (!Limits || !original) return
	const raise = storage.uploadLongMessages
	Limits.MAX_MESSAGE_LENGTH = raise ? NO_LIMIT : original.normal
	Limits.MAX_MESSAGE_LENGTH_PREMIUM = raise ? NO_LIMIT : original.premium
}

// Discord's native file module, found the same way Revenge finds it
function getFileModule() {
	for (const name of ['NativeFileModule', 'RTNFileManager', 'DCDFileManager']) {
		const mod = globalThis.__turboModuleProxy?.(name) ?? globalThis.nativeModuleProxy?.[name]
		if (mod) return mod
	}
}

// Writes the text to Discord's cache folder and adds it to the upload tray, the same way
// picking a file from your phone does. Each file gets its own folder so it can keep the name message.txt.
async function attachAsFile(channelId, content) {
	const fs = getFileModule()
	if (!fs?.writeFile) throw new Error('native file module not found')

	const path = `fakenitro/${Date.now()}/${FILE_NAME}`
	const written = await fs.writeFile('cache', path, content, 'utf8')
	const cacheDir = (fs.getConstants?.() ?? fs).CacheDirPath
	const fullPath = typeof written === 'string' && written.startsWith('/') ? written : `${cacheDir}/${path}`
	const uri = `file://${fullPath}`

	FluxDispatcher.dispatch({
		type: 'UPLOAD_ATTACHMENT_ADD_FILES',
		channelId,
		draftType: DRAFT_TYPE_CHANNEL_MESSAGE,
		files: [
			{
				id: uri,
				origin: 1,
				uri,
				originalUri: uri,
				mimeType: 'text/plain',
				filename: FILE_NAME,
				platform: 0,
				createdUsingInAppCamera: false,
			},
		],
	})
}

// Discord clears the reply bar when it sends, so put it back if this was a reply
function restoreReply(channelId, options) {
	const ref = options?.messageReference
	const message = ref && Stores.MessageStore?.getMessage?.(ref.channel_id ?? channelId, ref.message_id)
	const channel = Stores.ChannelStore?.getChannel(channelId)
	if (!message || !channel) return

	FluxDispatcher.dispatch({
		type: 'CREATE_PENDING_REPLY',
		channel,
		message,
		shouldMention: options.allowedMentions?.replied_user !== false,
	})
}

// Put the text back in the chat box so nothing gets lost, unless it's still there
function restoreText(channelId, content) {
	const draft = Stores.DraftStore?.getDraft?.(channelId, DRAFT_TYPE_CHANNEL_MESSAGE)
	if (draft) return
	findProps('getBestActiveInputForChannelId')?.getBestActiveInputForChannelId(channelId)?.insertText(content)
}

export function patchLongMessages({ safely }) {
	safely('long messages', () => {
		Limits = findProps('MAX_MESSAGE_LENGTH')
		if (!Limits) throw new Error('MAX_MESSAGE_LENGTH not found')

		original = { normal: Limits.MAX_MESSAGE_LENGTH, premium: Limits.MAX_MESSAGE_LENGTH_PREMIUM }
		applyLimits()
		addUnpatch(() => {
			Limits.MAX_MESSAGE_LENGTH = original.normal
			Limits.MAX_MESSAGE_LENGTH_PREMIUM = original.premium
		})

		const Actions = findProps('sendMessage', 'editMessage')
		if (!Actions) throw new Error('MessageActionCreators not found')

		addUnpatch(
			vendetta.patcher.instead('sendMessage', Actions, function (args, orig) {
				const [channelId, message, , options] = args
				const content = message?.content
				const limit = realLimit()

				if (!storage.uploadLongMessages || typeof content !== 'string' || content.length <= limit) {
					return orig.apply(this, args)
				}

				return showMessageTooLongNotice(content.length, limit).then(upload => {
					if (!upload) {
						restoreText(channelId, content)
						restoreReply(channelId, options)
						return
					}

					return attachAsFile(channelId, content)
						.then(() => restoreReply(channelId, options))
						.catch(e => {
							logger.error('[FakeNitro] attaching long message failed', e)
							vendetta.ui.toasts.showToast(`Couldn't attach message: ${e?.message ?? e}`)
							restoreText(channelId, content)
							restoreReply(channelId, options)
						})
				})
			}),
		)
	})
}
