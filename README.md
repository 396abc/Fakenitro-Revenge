# Fake Nitro for Revenge

A vibecoded plugin for [Revenge](https://github.com/revenge-mod/revenge-bundle) (Discord on Android), adapting the FakeNitro plugin from [Vencord](https://github.com/Vendicated/Vencord).

You can use emojis and stickers from any server, see other people's fake emojis as the real thing, and unlock Nitro themes, app icons, stream quality and the soundboard.

## Install

In Discord go to **Settings → Revenge → Plugins**, tap **+** and paste:

```
https://396abc.github.io/Fakenitro-Revenge/dist/FakeNitro/
```


This is for the classic version of Revenge (the one with the plugin URL box). It won't work on Revenge Next.

## What it does

- **Emojis**: pick any emoji in chat. Ones you can't actually use get sent as a link to the image. Works when editing too.
- **Stickers**: same idea, locked stickers get sent as a link.
- **Seeing them**: fake emoji and sticker links from anyone using FakeNitro (Vencord, Revenge, whatever) show up as normal emojis and stickers for you, including big emojis and in replies.
- **Everyone else** sees the image, plus the name if hyperlinks are on.
- **Nitro themes**: the gradient themes work, but only on your phone. Nobody else sees them and they aren't saved to your account.
- **App icons**: all the premium icons are unlocked.
- **Stream quality**: higher quality options when streaming.
- **Soundboard**: sounds that show as unavailable are usable again.

Everything can be turned on and off in the plugin's settings, same options as the Vencord version.

### Things that don't work

- **Animated stickers (APNG)** get sent as a still `.png` link. Vencord turns them into a GIF first, but that needs a canvas which Discord's mobile app doesn't have.
- **Lottie stickers** can't be faked at all, you'll get a popup if you try. Same as on Vencord.
- **The "This is a FakeNitro emoji" note** that Vencord adds when you tap a fake emoji isn't there.
- Reactions and statuses can't use fake emojis, since there's nowhere to put a link.


## Credits

- **FakeNitro** for Vencord, which this is based on: Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN and sadan
- **fake-nitro** for Revenge Next by Palm and contributors, used as a reference for where things are in the mobile app
- **Revenge**, for the mod itself

## License

GPL-3.0, same as Vencord and Revenge. See [LICENSE](LICENSE).
