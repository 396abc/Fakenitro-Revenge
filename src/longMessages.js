// Messages over the length limit can be turned into a message.txt attachment, like on desktop.
// Discord's limit is reported as "no limit" so it doesn't block the message with its Nitro popup,
// except to the character counter, which still sees the real limit. sendMessage then checks the
// real limit and offers to attach the text as a file. The file goes into the chat box's upload
// tray, so it's only sent when the user hits send.
import { showMessageTooLongNotice } from './alerts'
import { addUnpatch, findPath, findProps, FluxDispatcher, logger, premiumType, Stores, storage } from './shared'

const FILE_NAME = 'message.txt'
const NO_LIMIT = 1073741824 // 2^30, effectively no limit
const DRAFT_TYPE_CHANNEL_MESSAGE = 0

let getRealLimit
let inCounter = false

// Discord's own answer (4000 with Nitro, 2000 otherwise), from before we patched it
function realLimit() {
	try {
		const n = getRealLimit?.()
		if (typeof n === 'number' && n > 0 && n < NO_LIMIT) return n
	} catch {}
	return premiumType() === 2 ? 4000 : 2000
}

let MaxLength

// Discord's chat box asks this module for the limit before it sends. Report "no limit"
// so it doesn't show its Nitro popup, and keep the original to know the real limit.
function patchLimit() {
	MaxLength = findPath('modules/messages/useMessageMaxLength.tsx')
	if (!MaxLength?.getMaxMessageLength) throw new Error('useMessageMaxLength not found')

	const orig = MaxLength.getMaxMessageLength
	getRealLimit = () => orig.call(MaxLength)

	addUnpatch(
		() => (getRealLimit = undefined),
		vendetta.patcher.instead('getMaxMessageLength', MaxLength, function (args, fn) {
			return storage.uploadLongMessages ? NO_LIMIT : fn.apply(this, args)
		}),
	)
}

// Same for the hook version. It still has to run every time so React's hook order stays the same.
function patchLimitHook() {
	if (typeof MaxLength?.default !== 'function') throw new Error('useMessageMaxLength hook not found')

	addUnpatch(
		vendetta.patcher.instead('default', MaxLength, function (args, fn) {
			const limit = fn.apply(this, args)
			return storage.uploadLongMessages && !inCounter ? NO_LIMIT : limit
		}),
	)
}

// Let the counter see the real limit, whether it asks the hook itself or gets it as a prop
function patchCounter() {
	const Counter = findPath('modules/chat_input/native/accessories/ChatInputCharCounter.tsx')?.default
	if (!Counter?.type) throw new Error('ChatInputCharCounter not found')

	addUnpatch(
		vendetta.patcher.instead('type', Counter, function (args, fn) {
			const props = args[0]
			if (storage.uploadLongMessages && props && typeof props === 'object') {
				const fixed = {}
				for (const key in props) fixed[key] = props[key] === NO_LIMIT ? realLimit() : props[key]
				args = [fixed].concat(args.slice(1))
			}
			inCounter = true
			try {
				return fn.apply(this, args)
			} finally {
				inCounter = false
			}
		}),
	)
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

// Catch messages over the real limit before they're sent
function patchSend() {
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
}

// Each part is separate so one failing doesn't take the rest down. The send check goes first,
// since without it long messages would just fail to send.
export function patchLongMessages({ safely }) {
	safely('long messages: send check', patchSend)
	safely('long messages: limit', patchLimit)
	safely('long messages: limit hook', patchLimitHook)
	safely('long messages: char counter', patchCounter)
}
