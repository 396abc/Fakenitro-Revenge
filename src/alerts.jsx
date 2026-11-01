// Popups shown while sending.
import { getComponents } from './components'
import { React, storage } from './shared'

const { openAlert } = bunny.ui.alerts

const { useEffect, useRef } = React

// A popup with buttons that resolves to the value of the button pressed.
// Closing it without pressing anything resolves to false.
function Confirm({ title, content, buttons, resolve }) {
	const { AlertModal, AlertActionButton, AlertActions } = getComponents()
	const settled = useRef(false)
	const done = value => {
		if (settled.current) return
		settled.current = true
		resolve(value)
	}

	useEffect(() => () => done(false), [])

	return (
		<AlertModal
			title={title}
			content={content}
			actions={
				<AlertActions>
					{buttons.map(b => (
						<AlertActionButton
							key={b.text}
							variant={b.variant}
							text={b.text}
							onPress={() => {
								b.onPress?.()
								done(b.value)
							}}
						/>
					))}
				</AlertActions>
			}
		/>
	)
}

function confirm(key, props) {
	return new Promise(resolve => openAlert(key, <Confirm {...props} resolve={resolve} />))
}

// Resolves true if the user wants to send anyway
export function showCannotEmbedNotice() {
	return confirm('fake-nitro-cannot-embed', {
		title: 'Hold on!',
		content:
			'You are trying to send/edit a message that contains a FakeNitro emoji or sticker, ' +
			'however you do not have permissions to embed links in the current channel. ' +
			'Are you sure you want to send this message? Your FakeNitro items will appear as a link only.',
		buttons: [
			{ text: 'Send Anyway', variant: 'destructive', value: true },
			{
				text: "Send Anyway & Don't Ask Again",
				variant: 'secondary',
				value: true,
				onPress: () => (storage.disableEmbedPermissionCheck = true),
			},
			{ text: 'Cancel', variant: 'secondary', value: false },
		],
	})
}

// Replaces Discord's "upgrade to Nitro" popup. Resolves true if the user wants to upload.
export function showMessageTooLongNotice(length, limit) {
	return confirm('fake-nitro-message-too-long', {
		title: 'Message too long',
		content: `Your message is ${length.toLocaleString()} characters, the limit is ${limit.toLocaleString()}. You can send it as a file instead.`,
		buttons: [
			{ text: 'Upload as file', variant: 'primary', value: true },
			{ text: 'Cancel', variant: 'secondary', value: false },
		],
	})
}

export function showUnsupportedStickerNotice() {
	confirm('fake-nitro-unsupported-sticker', {
		title: 'Hold on!',
		content: "This sticker is a Lottie sticker, which can't be sent as a FakeNitro link. Please remove it to proceed.",
		buttons: [{ text: 'OK', variant: 'primary', value: false }],
	})
}
