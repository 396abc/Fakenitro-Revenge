// Popups shown while sending.
import { React, storage } from './shared'

const { AlertModal, AlertActionButton, AlertActions } = bunny.metro.common.components
const { openAlert } = bunny.ui.alerts

const { useEffect, useRef } = React

function CannotEmbedNotice({ resolve }) {
	const settled = useRef(false)
	const done = value => {
		if (settled.current) return
		settled.current = true
		resolve(value)
	}

	// Closing the popup without pressing a button counts as cancel
	useEffect(() => () => done(false), [])

	return (
		<AlertModal
			title="Hold on!"
			content={
				'You are trying to send/edit a message that contains a FakeNitro emoji or sticker, ' +
				'however you do not have permissions to embed links in the current channel. ' +
				'Are you sure you want to send this message? Your FakeNitro items will appear as a link only.'
			}
			actions={
				<AlertActions>
					<AlertActionButton variant="destructive" text="Send Anyway" onPress={() => done(true)} />
					<AlertActionButton
						variant="secondary"
						text="Send Anyway & Don't Ask Again"
						onPress={() => {
							storage.disableEmbedPermissionCheck = true
							done(true)
						}}
					/>
					<AlertActionButton variant="secondary" text="Cancel" onPress={() => done(false)} />
				</AlertActions>
			}
		/>
	)
}

// Resolves true if the user wants to send anyway
export function showCannotEmbedNotice() {
	return new Promise(resolve => {
		openAlert('fake-nitro-cannot-embed', <CannotEmbedNotice resolve={resolve} />)
	})
}

export function showUnsupportedStickerNotice() {
	openAlert(
		'fake-nitro-unsupported-sticker',
		<AlertModal
			title="Hold on!"
			content="This sticker is a Lottie sticker, which can't be sent as a FakeNitro link. Please remove it to proceed."
			actions={
				<AlertActions>
					<AlertActionButton variant="primary" text="OK" />
				</AlertActions>
			}
		/>,
	)
}
