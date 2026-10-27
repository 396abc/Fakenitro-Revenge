// Settings page. Same options as the Vencord plugin, built with Discord's own mobile components.
import { getComponents } from './components'
import { DEFAULTS, MEDIA_SIZES, React, ReactNative, storage } from './shared'

const { ScrollView } = ReactNative
const { useProxy } = vendetta.storage
const { getAssetIDByName } = vendetta.ui.assets

// Skip the icon if Discord renamed or removed the asset
function Icon({ name }) {
	const { TableRowIcon } = getComponents()
	const id = getAssetIDByName(name)
	return id && TableRowIcon ? <TableRowIcon source={id} /> : null
}

function Switch({ setting, label, subLabel, icon }) {
	const { TableSwitchRow } = getComponents()
	return (
		<TableSwitchRow
			label={label}
			subLabel={subLabel}
			icon={icon ? <Icon name={icon} /> : undefined}
			value={!!storage[setting]}
			onValueChange={v => (storage[setting] = v)}
		/>
	)
}

// Radio rows only take string values, so sizes are stored as numbers and converted here
function SizePicker({ setting, title }) {
	const { TableRadioGroup, TableRadioRow } = getComponents()
	return (
		<TableRadioGroup
			title={title}
			defaultValue={String(storage[setting] ?? DEFAULTS[setting])}
			onChange={v => (storage[setting] = Number(v))}
		>
			{MEDIA_SIZES.map(size => (
				<TableRadioRow key={size} label={`${size}px`} value={String(size)} />
			))}
		</TableRadioGroup>
	)
}

export default function Settings() {
	useProxy(storage)
	const { Stack, TableRowGroup, TextInput } = getComponents()

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
			<Stack spacing={24}>
				<TableRowGroup title="Emojis">
					<Switch
						setting="enableEmojiBypass"
						icon="ReactionIcon"
						label="Enable emoji bypass"
						subLabel="Allows sending fake emojis (also bypasses missing permission to use custom emojis)"
					/>
					<Switch
						setting="transformEmojis"
						icon="ImageIcon"
						label="Transform emojis"
						subLabel="Whether to transform fake emojis into real ones"
					/>
				</TableRowGroup>
				{storage.enableEmojiBypass && <SizePicker setting="emojiSize" title="Size of the emojis when sending" />}

				<TableRowGroup title="Stickers">
					<Switch
						setting="enableStickerBypass"
						icon="StickerIcon"
						label="Enable sticker bypass"
						subLabel="Allows sending fake stickers (also bypasses missing permission to use stickers)"
					/>
					<Switch
						setting="transformStickers"
						icon="ImageIcon"
						label="Transform stickers"
						subLabel="Whether to transform fake stickers into real ones"
					/>
				</TableRowGroup>
				{storage.enableStickerBypass && (
					<SizePicker setting="stickerSize" title="Size of the stickers when sending" />
				)}

				<TableRowGroup title="Links">
					<Switch
						setting="transformCompoundSentence"
						label="Transform compound sentences"
						subLabel="Whether to transform fake stickers and emojis in compound sentences (sentences with more content than just the fake emoji or sticker link)"
					/>
					<Switch
						setting="useHyperLinks"
						icon="LinkIcon"
						label="Use hyperlinks"
						subLabel="Whether to use hyperlinks when sending fake emojis and stickers"
					/>
					<Switch
						setting="disableEmbedPermissionCheck"
						label="Disable embed permission check"
						subLabel="Whether to disable the embed permission check when sending fake emojis and stickers"
					/>
				</TableRowGroup>
				{storage.useHyperLinks && (
					<TextInput
						label="Hyperlink text"
						description="What text the hyperlink should use. {{NAME}} will be replaced with the emoji/sticker name."
						placeholder="{{NAME}}"
						value={storage.hyperLinkText}
						onChange={v => (storage.hyperLinkText = v ?? '')}
						isClearable
					/>
				)}

				<TableRowGroup title="Streaming">
					<Switch
						setting="enableStreamQualityBypass"
						icon="ScreenIcon"
						label="Stream quality bypass"
						subLabel="Allow streaming in nitro quality"
					/>
				</TableRowGroup>

				<TableRowGroup title="Appearance & extras">
					<Switch
						setting="enableThemeBypass"
						icon="PaintPaletteIcon"
						label="Nitro themes"
						subLabel="Use gradient app themes. Applied locally only, others won't see it."
					/>
					<Switch
						setting="enableAppIconBypass"
						icon="NitroWheelIcon"
						label="Nitro app icons"
						subLabel="Unlock premium app icons. Reload Discord after changing."
					/>
					<Switch
						setting="enableSoundboardBypass"
						icon="SoundboardIcon"
						label="Soundboard"
						subLabel="Make all soundboard sounds available"
					/>
				</TableRowGroup>
			</Stack>
		</ScrollView>
	)
}
