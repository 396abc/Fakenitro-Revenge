# Fake Nitro (classic Revenge)

A port of Vencord's FakeNitro plugin to classic Revenge, which uses the Vendetta plugin format. It includes every Vencord setting, rebuilt as a native Discord mobile settings page.

## Install

1. Host the two files in `dist/FakeNitro/` (`manifest.json` and `index.js`) on any static host. For example, on GitHub Pages: `https://<user>.github.io/<repo>/FakeNitro/`.
2. In Revenge, go to Plugins → **+**, then paste that URL. Keep the trailing slash.
3. You will see the "unproxied plugin" warning. This is expected for self-hosted plugins.

## Build from source

```
npm install
node build.mjs          # -> dist/FakeNitro/{index.js,manifest.json}
node test/harness.cjs   # mocked Revenge + Discord environment tests
```

## Feature parity with Vencord

| Vencord feature | Revenge port |
|---|---|
| `enableEmojiBypass`: send locked emoji as links | ✅ `sendMessage`/`editMessage` patches, plus the emoji picker and autocomplete unlocked for chat only |
| Bypass missing *Use External Emojis* permission | ✅ Uses Discord's own `getEmojiUnavailableReason` |
| Role-subscription and Twitch-managed emoji handling | ✅ Same check as above |
| Voice-call / status / reaction pickers stay locked | ✅ The bypass is limited to the CHAT and AUTO_SUGGESTION intentions |
| `emojiSize`, `stickerSize` | ✅ Same 16–1024px options |
| `transformEmojis`: show fake emoji as real | ✅ Patched into the mobile chat row builder (`RowManager.generate`), including jumbo emoji and reply previews |
| `enableStickerBypass` + "SENDABLE" patch | ✅ Sticker picker unlocked, and `sendStickers` sends a link instead |
| `transformStickers`: show fake stickers as real | ✅ Sticker links are turned into real stickers |
| Vencord users' GIF-uploaded animated stickers | ✅ Shown as stickers and removed from attachments (`filterAttachments`) |
| `transformCompoundSentence` | ✅ |
| `useHyperLinks`, `hyperLinkText` with `{{NAME}}` | ✅ |
| `disableEmbedPermissionCheck` + "Hold on!" modal and checkbox | ✅ Mobile alert with "Send Anyway", "Send Anyway & Don't Ask Again" and "Cancel" |
| `enableStreamQualityBypass` | ✅ via `ProductCatalog.canUserUse` |
| Client (gradient) themes, applied locally and kept on reconnect | ✅ |
| Premium app icons | ✅ |
| Soundboard sounds always available | ✅ |
| Lottie stickers | ⚠️ Same as Vencord: can't be faked, so an alert is shown |
| Animated (APNG) stickers converted to GIF and uploaded | ⚠️ Sent as a `.png` link instead. Vencord does this conversion with an HTML canvas, which mobile doesn't have |
| "This is a FakeNitro emoji/sticker" notice in popouts | ❌ Not ported. Fake items are flagged `fake: true`, but the mobile popout module wasn't identified |
| Custom client theme editor, server-boost stream tier | ❌ Desktop-only UI |

GPL-3.0. Based on Vencord's FakeNitro (Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN, sadan). Mobile module names come from Revenge Next's fake-nitro (Palm and contributors).
