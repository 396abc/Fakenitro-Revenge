# Fake Nitro for Revenge

A vibecoded plugin for [Revenge](https://github.com/revenge-mod/revenge-bundle) (Discord on Android), adapting the FakeNitro plugin from [Vencord](https://github.com/Vendicated/Vencord).

You can use emojis and stickers from any server, see other people's fake emojis as the real thing, and unlock Nitro themes, app icons, stream quality and the soundboard.

## Install

In Discord go to **Settings → Revenge → Plugins**, tap **+** and paste:

```
https://396abc.github.io/Fakenitro-Revenge/dist/FakeNitro/
```

Don't leave off the slash at the end. You'll get a warning about it being an unproxied plugin, that's normal for anything that isn't hosted by Revenge.

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

## If something breaks

Every part of the plugin logs whether it loaded. Connect your phone to a PC with adb, or use Termux if you're rooted, and run:

```
su -c "logcat -d" | grep FakeNitro
```

You'll see a line like `[FakeNitro] emoji picker: ok` for each part. If one says `failed`, that's the part Discord changed. Open an issue with that line.

## Building

You need Node.js.

```
npm install
npm run build   # makes dist/FakeNitro/index.js and manifest.json
npm test        # loads the plugin in a fake Revenge and checks every feature
```

Code is in `src/`:

| File | What's in it |
|---|---|
| `index.js` | Starts and stops everything |
| `shared.js` | Settings, module finders, helpers |
| `premium.js` | Nitro checks (stickers, streaming, themes, icons) |
| `fakeify.js` | Sending: unlocks pickers, turns emojis/stickers into links |
| `realify.js` | Receiving: turns those links back into emojis/stickers |
| `themes.js` | Gradient themes |
| `extras.js` | App icons and soundboard |
| `alerts.jsx` | Popups |
| `settings.jsx` | Settings page |

## Pushing an update from your phone (Termux)

First time only:

```
pkg update -y && pkg install -y git unzip && termux-setup-storage
```

```
cd ~ && git clone https://github.com/396abc/Fakenitro-Revenge.git
```

```
git config --global user.name "396abc" && git config --global user.email "you@example.com" && git config --global credential.helper store && echo "https://396abc:YOUR_TOKEN@github.com" > ~/.git-credentials && chmod 600 ~/.git-credentials
```

Replace `YOUR_TOKEN` with a GitHub token (Settings → Developer settings → Fine-grained tokens, with Contents set to read and write on this repo).

Every update after that is one command. It grabs the newest `Fakenitro-Revenge*.zip` from Downloads, extracts it into the repo and pushes it:

```
cd ~/Fakenitro-Revenge && Z="$(ls /storage/emulated/0/Download/Fakenitro-Revenge*.zip | sort -V | tail -1)" && echo "Using $Z" && unzip -o "$Z" && git add -A && { git commit -m "Update" || true; } && git push
```

GitHub Pages updates about a minute later, then restart Discord and Revenge picks up the new version.

## Credits

- **FakeNitro** for Vencord, which this is based on: Arjix, D3SOX, Ven, fawn, captain, Nuckyz, AutumnVN and sadan
- **fake-nitro** for Revenge Next by Palm and contributors, used as a reference for where things are in the mobile app
- **Revenge**, for the mod itself

## License

GPL-3.0, same as Vencord and Revenge. See [LICENSE](LICENSE).
