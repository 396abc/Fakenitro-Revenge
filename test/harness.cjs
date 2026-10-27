// Fakes Revenge and the Discord modules the plugin uses, then loads dist/FakeNitro/index.js
// the same way Revenge does and checks every feature. Run with `npm test` after `npm run build`.
// Set DEBUG=1 to print each test as it runs.
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const React = require('react')
const TestRenderer = require('react-test-renderer')
const spitroast = require('spitroast')

const results = []
function test(name, fn) {
	if (process.env.DEBUG) console.log('>', name)
	return Promise.resolve()
		.then(fn)
		.then(() => results.push(['PASS', name]))
		.catch(e => { if (process.env.DEBUG) console.log('FAIL', name, e && e.stack); results.push(['FAIL', name, e && e.stack]) })
}

// Fake Discord modules
const EmojiIntention = { REACTION: 0, STATUS: 1, COMMUNITY_CONTENT: 2, CHAT: 3, GUILD_STICKER_RELATED_EMOJI: 4, AUTO_SUGGESTION: 9 }
const CURRENT_GUILD = 'g1'

const emojis = {
	100: { id: '100', name: 'local', animated: false, guildId: CURRENT_GUILD },
	200: { id: '200', name: 'party', animated: true, guildId: 'g2' },
	300: { id: '300', name: 'external', animated: false, guildId: 'g2' },
}
const stickers = {
	s1: { id: 's1', name: 'cool', format_type: 1, guild_id: 'g2', available: true },
	s2: { id: 's2', name: 'apng', format_type: 2, guild_id: 'g2', available: true },
	s3: { id: 's3', name: 'lottie', format_type: 3, guild_id: 'g2', available: true },
	s4: { id: 's4', name: 'mine', format_type: 1, guild_id: CURRENT_GUILD, available: true },
	d1: { id: 'd1', name: 'wumpus', format_type: 3, pack_id: 'p' },
	g5: { id: '555', name: 'gifsticker', format_type: 4, guild_id: 'g2', available: true },
}
const stickerById = id => stickers[id] || Object.values(stickers).find(s => s.id === id)

let canEmbed = true
const channel = { id: 'c1', guild_id: CURRENT_GUILD, isPrivate: () => false }

const Stores = {
	UserStore: { getName: () => 'UserStore', getCurrentUser: () => ({ premiumType: 0 }) },
	ChannelStore: { getName: () => 'ChannelStore', getChannel: id => (id === 'c1' ? channel : undefined) },
	PermissionStore: {
		getName: () => 'PermissionStore',
		can: perm => (perm === BigInt(1) << BigInt(14) ? canEmbed : false),
	},
	StickersStore: { getName: () => 'StickersStore', getStickerById: stickerById },
	EmojiStore: { getName: () => 'EmojiStore', getCustomEmojiById: id => emojis[id] },
	SelectedGuildStore: { getName: () => 'SelectedGuildStore', getGuildId: () => CURRENT_GUILD },
}

const EmojiUtils = {
	countEmoji() {},
	default: {
		// Real-ish: usable only if from current guild and not animated (no Nitro)
		getEmojiUnavailableReason({ emoji, channel: ch }) {
			if (emoji.animated) return 1
			if (emoji.guildId !== (ch && ch.guild_id)) return 2
			return null
		},
	},
}

const ProductCatalog = {
	CLIENT_THEMES: 'p_themes',
	STICKERS_EVERYWHERE: 'p_stickers',
	APP_ICONS: 'p_icons',
	EMOJIS_EVERYWHERE: 'p_emojis',
	ANIMATED_EMOJIS: 'p_anim',
	STREAM_MID_QUALITY: 'p_s_mid',
	STREAM_HIGH_QUALITY: 'p_s_high',
	canUserUse() { return false },
}

const sent = []
const MessageActions = {
	sendMessage(channelId, data) { sent.push(['send', channelId, JSON.parse(JSON.stringify(data))]); return Promise.resolve('sent') },
	editMessage(channelId, id, data) { sent.push(['edit', channelId, JSON.parse(JSON.stringify(data))]); return Promise.resolve('edited') },
	sendStickers(channelId, ids) { sent.push(['stickers', channelId, ids.slice()]); return Promise.resolve('stickers') },
	receiveMessage() {},
}

function EmojiPickerListInner() { return null }
const EmojiPickerListModule = { default: { $$typeof: Symbol.for('react.memo'), type: function EmojiPickerList(props) { return props } } }
const StickerPickerListRowModule = { default: props => props }

const AvatarUtils = { getEmojiURL: ({ id, animated, size }) => `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'webp'}?size=${size}` }
const StickersUtils = { getStickerAssetUrl: s => `https://media.discordapp.net/stickers/${s.id}.png` }
function RowManager() {}
RowManager.prototype.generate = function (row) { return row }

const ThemeActions = {
	updateBackgroundGradientPreset(id) { this.last = id },
	updateMobilePendingThemeIndex(i) { this.lastIndex = i },
}
const AppIconTypes = { FreemiumAppIconIds: { a: 'free' }, MasterAppIconIds: { a: 'free', b: 'premium' } }
const AppIconUtils = {
	getIcons: () => [{ id: 'a', isPremium: false }, { id: 'b', isPremium: true }],
	getIconById: id => ({ id, isPremium: true }),
}

const byProps = {
	countEmoji: EmojiUtils,
	EmojiIntention: { EmojiIntention },
	canUserUse: ProductCatalog,
	'sendMessage,editMessage': MessageActions,
	getEmojiURL: AvatarUtils,
	getStickerAssetUrl: StickersUtils,
	updateBackgroundGradientPreset: ThemeActions,
	MasterAppIconIds: AppIconTypes,
	getIcons: AppIconUtils,
}
const byPath = {
	'modules/emojis/EmojiConstants.tsx': { EmojiIntention },
	'modules/emoji_picker/native/components/EmojiPickerList.tsx': EmojiPickerListModule,
	'modules/stickers/native/StickerPickerListRow.tsx': StickerPickerListRowModule,
}

// Flux dispatcher
const intercepts = []
const dispatched = []
const FluxDispatcher = {
	dispatch(payload) {
		dispatched.push(payload)
		for (const i of intercepts) i(payload)
	},
}

// UI components (just render their props)
let lastAlert = null
const mk = name => {
	const C = props => React.createElement(name, props, props.children)
	C.displayName = name
	return C
}
const TableRow = mk('TableRow')
TableRow.Icon = mk('TableRowIcon')
const components = {
	Stack: mk('Stack'),
	TableRowGroup: mk('TableRowGroup'),
	TableSwitchRow: mk('TableSwitchRow'),
	TableRadioGroup: mk('TableRadioGroup'),
	TableRadioRow: mk('TableRadioRow'),
	TableRow,
	TextInput: mk('TextInput'),
	AlertModal: Object.assign(props => React.createElement('AlertModal', null, props.actions), { displayName: 'AlertModal' }),
	AlertActionButton: mk('AlertActionButton'),
	AlertActions: mk('AlertActions'),
}

// Plugin storage, behaves like Revenge's
const store = {}
function useProxy() {
	const [, force] = React.useState(0)
	React.useEffect(() => {
		listeners.add(force)
		return () => listeners.delete(force)
	}, [])
}
const listeners = new Set()
const storage = new Proxy(store, {
	set(t, k, v) { if (v === null) throw new TypeError('Revenge storage crashes on null'); t[k] = v; listeners.forEach(f => f(x => x + 1)); return true },
})

const logs = []
const vendetta = {
	plugin: { id: 'https://example/FakeNitro/', storage },
	logger: {
		log: (...a) => logs.push(['log', a.join(' ')]),
		warn: (...a) => logs.push(['warn', a.join(' ')]),
		error: (...a) => logs.push(['error', a.map(String).join(' ')]),
	},
	patcher: spitroast,
	metro: {
		findByProps: (...p) => byProps[p.join(',')],
		findByName: name => (name === 'RowManager' ? RowManager : undefined),
		findByStoreName: name => Stores[name],
		common: { React, ReactNative: { ScrollView: mk('ScrollView') }, FluxDispatcher },
	},
	storage: { useProxy },
	ui: { assets: { getAssetIDByName: () => 1 } },
}
global.bunny = {
	metro: { findByFilePath: (p) => byPath[p], common: { components } },
	ui: { alerts: { openAlert: (key, el) => { lastAlert = { key, el } } } },
	api: { flux: { intercept: cb => { intercepts.push(cb); return () => intercepts.splice(intercepts.indexOf(cb), 1) } } },
}

// Load the plugin like Revenge does
const js = fs.readFileSync(path.join(__dirname, '../dist/FakeNitro/index.js'), 'utf8')
const raw = (0, eval)(`vendetta=>{return ${js}}`)(vendetta)
const ret = typeof raw === 'function' ? raw() : raw
const plugin = (ret && ret.default) || ret
plugin.onLoad()

const EMOJI = id => {
	const e = emojis[id]
	return { id: e.id, name: e.name, animated: e.animated, guildId: e.guildId }
}

;(async () => {
	await test('all patch groups applied', () => {
		const failed = logs.filter(l => l[0] === 'error')
		assert.deepStrictEqual(failed, [], JSON.stringify(failed))
		for (const g of ['premium checks', 'emoji availability', 'emoji picker', 'sticker picker', 'send/edit/sticker bypass', 'message rendering', 'client themes', 'app icons', 'soundboard'])
			assert(logs.some(l => l[1] === `[FakeNitro] ${g}: ok`), g)
	})

	await test('defaults match Vencord', () => {
		assert.strictEqual(storage.emojiSize, 48)
		assert.strictEqual(storage.stickerSize, 160)
		assert.strictEqual(storage.useHyperLinks, true)
		assert.strictEqual(storage.hyperLinkText, '{{NAME}}')
		assert.strictEqual(storage.transformCompoundSentence, false)
	})

	await test('canUserUse bypass: stickers/themes/icons/stream yes, emoji products no', () => {
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.STICKERS_EVERYWHERE), true)
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.CLIENT_THEMES), true)
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.APP_ICONS), true)
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.STREAM_HIGH_QUALITY), true)
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.EMOJIS_EVERYWHERE), false)
		storage.enableStreamQualityBypass = false
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.STREAM_MID_QUALITY), false)
		storage.enableStreamQualityBypass = true
	})

	await test('emoji unlocked for CHAT, not for REACTION/STATUS', () => {
		const get = intention => EmojiUtils.default.getEmojiUnavailableReason({ emoji: EMOJI(200), channel, intention })
		assert.strictEqual(get(EmojiIntention.CHAT), null)
		assert.strictEqual(get(EmojiIntention.AUTO_SUGGESTION), null)
		assert.strictEqual(get(EmojiIntention.REACTION), 1)
		assert.strictEqual(get(EmojiIntention.STATUS), 1)
	})

	await test('emoji picker clears disabled sets only for chat picker', () => {
		const props = intention => ({ emojiPickerIntention: intention, categories: [{ emojisDisabled: new Set(['x']), isNitroLocked: true }] })
		const chat = props(EmojiIntention.CHAT)
		EmojiPickerListModule.default.type(chat)
		assert.strictEqual(chat.categories[0].emojisDisabled.size, 0)
		assert.strictEqual(chat.categories[0].isNitroLocked, false)
		const react = props(EmojiIntention.REACTION)
		EmojiPickerListModule.default.type(react)
		assert.strictEqual(react.categories[0].emojisDisabled.size, 1)
	})

	await test('sticker picker marks stickers available', () => {
		const out = StickerPickerListRowModule.default({ stickers: [{ id: 's1', available: false }] })
		assert.strictEqual(out.stickers[0].available, true)
	})

	await test('send: locked emoji -> hyperlink, usable emoji kept, word boundaries', async () => {
		sent.length = 0
		const r = await MessageActions.sendMessage('c1', {
			content: 'hi<a:party:200>there <:local:100> <:external:300>',
			validNonShortcutEmojis: [EMOJI(200), EMOJI(100), EMOJI(300)],
			invalidEmojis: [],
		})
		assert.strictEqual(r, 'sent')
		const data = sent[0][2]
		assert.strictEqual(
			data.content,
			'hi [party](https://cdn.discordapp.com/emojis/200.webp?size=48&name=party&lossless=true&animated=true) there <:local:100> [external](https://cdn.discordapp.com/emojis/300.webp?size=48&name=external&lossless=true)',
		)
		assert.deepStrictEqual(data.validNonShortcutEmojis.map(e => e.id), ['100'])
	})

	await test('send: plain links + custom hyperlink text + size', async () => {
		sent.length = 0
		storage.useHyperLinks = false
		storage.emojiSize = 128
		await MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		assert.strictEqual(sent[0][2].content, 'https://cdn.discordapp.com/emojis/300.webp?size=128&name=external&lossless=true')
		sent.length = 0
		storage.useHyperLinks = true
		storage.hyperLinkText = ':{{NAME}}:'
		await MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		assert(sent[0][2].content.startsWith('[:external:](https://'), sent[0][2].content)
		storage.hyperLinkText = '{{NAME}}'
		storage.emojiSize = 48
	})

	await test('send: invalidEmojis are converted too', async () => {
		sent.length = 0
		await MessageActions.sendMessage('c1', { content: 'x <:external:300>', invalidEmojis: [EMOJI(300)], validNonShortcutEmojis: [] })
		assert(sent[0][2].content.includes('/emojis/300.webp'))
		assert.deepStrictEqual(sent[0][2].invalidEmojis, [])
	})

	await test('send: emoji bypass off leaves message untouched', async () => {
		sent.length = 0
		storage.enableEmojiBypass = false
		await MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		assert.strictEqual(sent[0][2].content, '<:external:300>')
		storage.enableEmojiBypass = true
	})

	await test('edit: scans raw content via EmojiStore, skips escaped', async () => {
		sent.length = 0
		await MessageActions.editMessage('c1', 'm1', { content: 'a <:external:300> \\<:external:300> <:local:100>' })
		const c = sent[0][2].content
		assert(c.startsWith('a [external](https://cdn.discordapp.com/emojis/300.webp'), c)
		assert(c.endsWith('<:local:100>'), c)
	})

	await test('no embed perms: alert, cancel blocks send', async () => {
		sent.length = 0
		canEmbed = false
		const p = MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		await new Promise(r => setTimeout(r, 0))
		assert(lastAlert && lastAlert.key === 'fake-nitro-cannot-embed')
		lastAlert.el.props.resolve(false)
		await p
		assert.strictEqual(sent.length, 0)
	})

	await test('no embed perms: "don\'t ask again" sends and sets setting', async () => {
		sent.length = 0
		lastAlert = null
		const p = MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		await new Promise(r => setTimeout(r, 0))
		// render the alert and press the 2nd button
		const tr = TestRenderer.create(lastAlert.el)
		const buttons = tr.root.findAll(n => n.type && n.type.displayName === 'AlertActionButton')
		buttons[1].props.onPress()
		await p
		assert.strictEqual(sent.length, 1)
		assert.strictEqual(storage.disableEmbedPermissionCheck, true)
		lastAlert = null
		sent.length = 0
		await MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		assert.strictEqual(lastAlert, null)
		storage.disableEmbedPermissionCheck = false
		canEmbed = true
	})

	await test('stickers: locked -> link message, own-guild & default stickers real', async () => {
		sent.length = 0
		await MessageActions.sendStickers('c1', ['s1'])
		assert.deepStrictEqual(sent.map(s => s[0]), ['send'])
		assert.strictEqual(sent[0][2].content, '[cool](https://media.discordapp.net/stickers/s1.png?size=160&name=cool&lossless=true)')
		sent.length = 0
		await MessageActions.sendStickers('c1', ['s4'])
		assert.deepStrictEqual(sent, [['stickers', 'c1', ['s4']]])
		sent.length = 0
		await MessageActions.sendStickers('c1', ['d1'])
		assert.deepStrictEqual(sent, [['stickers', 'c1', ['d1']]])
	})

	await test('stickers: gif format uses .gif, lottie shows alert and cancels', async () => {
		sent.length = 0
		await MessageActions.sendStickers('c1', ['555'])
		assert(sent[0][2].content.includes('/stickers/555.gif'))
		sent.length = 0
		lastAlert = null
		await MessageActions.sendStickers('c1', ['s3'])
		assert.strictEqual(sent.length, 0)
		assert.strictEqual(lastAlert.key, 'fake-nitro-unsupported-sticker')
	})

	const row = message => ({ type: 1, message })
	const link = url => ({ type: 'link', target: url, content: [{ type: 'text', content: url }] })
	const E_URL = 'https://cdn.discordapp.com/emojis/300.webp?size=48&name=external&lossless=true'
	const S_URL = 'https://media.discordapp.net/stickers/777.png?size=160&name=cool'

	await test('render: single emoji link -> jumbo custom emoji, embed hidden', () => {
		const r = RowManager.prototype.generate(row({ content: [link(E_URL)], embeds: [{ type: 'image', url: E_URL }] }))
		const n = r.message.content[0]
		assert.strictEqual(n.type, 'customEmoji')
		assert.strictEqual(n.id, '300')
		assert.strictEqual(n.alt, 'external')
		assert.strictEqual(n.jumboable, true)
		assert.strictEqual(r.message.embeds.length, 0)
	})

	await test('render: sticker link -> sticker, removed from text', () => {
		const r = RowManager.prototype.generate(row({ content: [link(S_URL)], embeds: [{ type: 'image', url: S_URL }] }))
		assert.strictEqual(r.message.content.length, 0)
		assert.strictEqual(r.message.stickers[0].id, '777')
		assert.strictEqual(r.message.stickers[0].name, 'cool')
	})

	await test('render: compound sentence untouched unless enabled', () => {
		const msg = () => ({ content: [{ type: 'text', content: 'look ' }, link(E_URL)], embeds: [{ type: 'image', url: E_URL }] })
		const r1 = RowManager.prototype.generate(row(msg()))
		assert.strictEqual(r1.message.content[1].type, 'link')
		storage.transformCompoundSentence = true
		const r2 = RowManager.prototype.generate(row(msg()))
		assert.strictEqual(r2.message.content[1].type, 'customEmoji')
		assert.strictEqual(r2.message.content[1].jumboable, undefined)
		storage.transformCompoundSentence = false
	})

	await test('render: transformEmojis off keeps links', () => {
		storage.transformEmojis = false
		const r = RowManager.prototype.generate(row({ content: [link(E_URL)] }))
		assert.strictEqual(r.message.content[0].type, 'link')
		storage.transformEmojis = true
	})

	await test('render: GIF-upload sticker attachment (Vencord APNG) -> sticker', () => {
		const url = 'https://cdn.discordapp.com/attachments/1/2/555.gif'
		const r = RowManager.prototype.generate(row({ content: [], attachments: [{ url }, { url: 'https://cdn.discordapp.com/attachments/1/2/999.gif' }] }))
		assert.strictEqual(r.message.attachments.length, 1)
		assert.strictEqual(r.message.stickers[0].id, '555')
	})

	await test('render: reply preview converts emoji, keeps sticker links', () => {
		const r = RowManager.prototype.generate(row({ content: [{ type: 'text', content: 'ok' }], referencedMessage: { message: { content: [link(E_URL)] } } }))
		assert.strictEqual(r.message.referencedMessage.message.content[0].type, 'customEmoji')
		const r2 = RowManager.prototype.generate(row({ content: [], referencedMessage: { message: { content: [link(S_URL)] } } }))
		assert.strictEqual(r2.message.referencedMessage.message.content[0].type, 'link')
	})

	await test('themes: Nitro gradient applied locally, not synced, remembered', () => {
		dispatched.length = 0
		ThemeActions.updateBackgroundGradientPreset(7)
		assert.strictEqual(storage.themePreset, 7)
		const payload = { type: 'SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE', changes: { appearance: { settings: { clientThemeSettings: { backgroundGradientPresetId: 7 } } } } }
		FluxDispatcher.dispatch(payload)
		assert.strictEqual(payload.changes.appearance.shouldSync, false)
		assert.strictEqual(payload.changes.appearance.settings.clientThemeSettings.backgroundGradientPresetId, undefined)
		return new Promise(r => setTimeout(r, 5)).then(() => {
			assert(dispatched.some(d => d.type === 'UPDATE_BACKGROUND_GRADIENT_PRESET' && d.presetId === 7))
			dispatched.length = 0
			FluxDispatcher.dispatch({ type: 'CONNECTION_OPEN' })
			return new Promise(r => setTimeout(r, 5))
		}).then(() => {
			assert(dispatched.some(d => d.type === 'UPDATE_BACKGROUND_GRADIENT_PRESET' && d.presetId === 7))
			ThemeActions.updateMobilePendingThemeIndex(1)
			assert.strictEqual(storage.themePreset, -1)
		})
	})

	await test('app icons unlocked', () => {
		assert.deepStrictEqual(AppIconTypes.FreemiumAppIconIds, AppIconTypes.MasterAppIconIds)
		assert(AppIconUtils.getIcons().every(i => !i.isPremium))
		assert.strictEqual(AppIconUtils.getIconById('b').isPremium, false)
	})

	await test('soundboard sounds forced available', () => {
		const p = { type: 'GUILD_SOUNDBOARD_SOUNDS_UPDATE', guildId: 'g', soundboardSounds: [{ soundId: '1', available: false }] }
		FluxDispatcher.dispatch(p)
		assert.strictEqual(p.soundboardSounds[0].available, true)
		const q = { type: 'SOUNDBOARD_SOUNDS_RECEIVED', updates: [{ guildId: 'g', sounds: [{ sound_id: '2', available: false }] }] }
		FluxDispatcher.dispatch(q)
		assert.strictEqual(q.updates[0].sounds[0].available, true)
	})

	await test('settings page renders every option and toggles storage', () => {
		let tr
		TestRenderer.act(() => { tr = TestRenderer.create(React.createElement(plugin.settings)) })
		const switches = tr.root.findAll(n => n.type && n.type.displayName === 'TableSwitchRow')
		const labels = switches.map(s => s.props.label)
		for (const l of ['Enable emoji bypass', 'Transform emojis', 'Enable sticker bypass', 'Transform stickers', 'Transform compound sentences', 'Use hyperlinks', 'Disable embed permission check', 'Stream quality bypass', 'Nitro themes', 'Nitro app icons', 'Soundboard'])
			assert(labels.includes(l), 'missing ' + l)
		const radios = tr.root.findAll(n => n.type && n.type.displayName === 'TableRadioGroup')
		assert.strictEqual(radios.length, 2)
		assert(tr.root.findAll(n => n.type && n.type.displayName === 'TextInput').length === 1)
		TestRenderer.act(() => switches.find(s => s.props.label === 'Use hyperlinks').props.onValueChange(false))
		assert.strictEqual(storage.useHyperLinks, false)
		assert.strictEqual(tr.root.findAll(n => n.type && n.type.displayName === 'TextInput').length, 0)
		TestRenderer.act(() => radios[0].props.onChange('256'))
		assert.strictEqual(storage.emojiSize, 256)
		storage.useHyperLinks = true
		storage.emojiSize = 48
	})

	await test('unload restores everything', async () => {
		plugin.onUnload()
		assert.strictEqual(ProductCatalog.canUserUse(ProductCatalog.STICKERS_EVERYWHERE), false)
		assert.strictEqual(EmojiUtils.default.getEmojiUnavailableReason({ emoji: EMOJI(200), channel, intention: 3 }), 1)
		assert.deepStrictEqual(AppIconTypes.FreemiumAppIconIds, { a: 'free' })
		assert.strictEqual(intercepts.length, 0)
		sent.length = 0
		await MessageActions.sendMessage('c1', { content: '<:external:300>', validNonShortcutEmojis: [EMOJI(300)] })
		assert.strictEqual(sent[0][2].content, '<:external:300>')
	})

	for (const r of results) console.log(r[0], r[1], r[2] ? '\n' + r[2] : '')
	const failed = results.filter(r => r[0] === 'FAIL').length
	console.log(`\n${results.length - failed}/${results.length} passed`)
	process.exit(failed ? 1 : 0)
})()
