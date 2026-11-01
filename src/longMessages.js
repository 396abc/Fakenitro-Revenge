// Messages over the length limit get sent as message.txt instead, like on desktop.
// Discord's own limit is raised so it doesn't block the message with its Nitro popup,
// then sendMessage checks the real limit and offers to upload the text as a file.
import { showMessageTooLongNotice } from './alerts'
import { addUnpatch, findProps, logger, premiumType, Stores, storage } from './shared'

const FILE_NAME = 'message.txt'
const NO_LIMIT = 1073741824 // 2^30, effectively no limit

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

function utf8Length(str) {
	let n = 0
	for (const ch of str) {
		const c = ch.codePointAt(0)
		n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4
	}
	return n
}

function getHTTP() {
	return findProps('HTTP')?.HTTP ?? findProps('getAPIBaseURL', 'post')
}

// Same three steps the desktop app uses: ask for an upload URL, upload the file there,
// then send a message that points at the uploaded file.
async function uploadAsFile(channelId, content, options) {
	const HTTP = getHTTP()
	if (!HTTP) throw new Error('HTTP module not found')

	const { body } = await HTTP.post({
		url: `/channels/${channelId}/attachments`,
		body: { files: [{ id: '0', filename: FILE_NAME, file_size: utf8Length(content) }] },
	})
	const target = body?.attachments?.[0]
	if (!target?.upload_url) throw new Error('Discord did not return an upload URL')

	const res = await fetch(target.upload_url, { method: 'PUT', body: content })
	if (!res.ok) throw new Error(`File upload failed (${res.status})`)

	const message = {
		content: '',
		attachments: [{ id: '0', filename: FILE_NAME, uploaded_filename: target.upload_filename }],
	}
	if (options?.messageReference) message.message_reference = options.messageReference
	if (options?.allowedMentions) message.allowed_mentions = options.allowedMentions

	await HTTP.post({ url: `/channels/${channelId}/messages`, body: message })
}

// Put the text back in the chat box so nothing gets lost, unless it's still there
function restoreText(channelId, content) {
	const draft = Stores.DraftStore?.getDraft?.(channelId, 0)
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
					if (!upload) return restoreText(channelId, content)

					return uploadAsFile(channelId, content, options).catch(e => {
						logger.error('[FakeNitro] long message upload failed', e)
						vendetta.ui.toasts.showToast(`Couldn't upload message: ${e?.message ?? e}`)
						restoreText(channelId, content)
					})
				})
			}),
		)
	})
}
