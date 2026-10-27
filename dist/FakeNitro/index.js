(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/shared.js
  var storage = vendetta.plugin.storage;
  var logger = vendetta.logger;
  var { React, ReactNative, FluxDispatcher } = vendetta.metro.common;
  var metro = vendetta.metro;
  var DEFAULT_EMOJI_SIZE = 48;
  var DEFAULT_STICKER_SIZE = 160;
  var MEDIA_SIZES = [16, 32, 48, 56, 64, 96, 128, 160, 256, 512, 1024];
  var DEFAULTS = {
    enableEmojiBypass: true,
    emojiSize: DEFAULT_EMOJI_SIZE,
    transformEmojis: true,
    enableStickerBypass: true,
    stickerSize: DEFAULT_STICKER_SIZE,
    transformStickers: true,
    transformCompoundSentence: false,
    enableStreamQualityBypass: true,
    useHyperLinks: true,
    hyperLinkText: "{{NAME}}",
    disableEmbedPermissionCheck: false,
    enableThemeBypass: true,
    enableAppIconBypass: true,
    enableSoundboardBypass: true,
    // -1 means no theme saved. Don't use null here, Revenge's storage crashes on it.
    themePreset: -1
  };
  function initStorage() {
    for (const key in DEFAULTS) {
      if (storage[key] === void 0 || storage[key] === null) storage[key] = DEFAULTS[key];
    }
  }
  function findProps(...props) {
    try {
      return metro.findByProps(...props);
    } catch (e) {
      logger.error(`[FakeNitro] findByProps(${props}) failed`, e);
    }
  }
  function findPath(path, exportDefault = false) {
    try {
      return bunny.metro.findByFilePath(path, exportDefault);
    } catch (e) {
      logger.error(`[FakeNitro] findByFilePath(${path}) failed`, e);
    }
  }
  function findName(name, exportDefault = true) {
    try {
      return metro.findByName(name, exportDefault);
    } catch (e) {
      logger.error(`[FakeNitro] findByName(${name}) failed`, e);
    }
  }
  function findStore(name) {
    try {
      return metro.findByStoreName(name);
    } catch (e) {
      logger.error(`[FakeNitro] findByStoreName(${name}) failed`, e);
    }
  }
  var Stores = {
    get UserStore() {
      return findStore("UserStore");
    },
    get ChannelStore() {
      return findStore("ChannelStore");
    },
    get PermissionStore() {
      return findStore("PermissionStore");
    },
    get StickersStore() {
      return findStore("StickersStore");
    },
    get EmojiStore() {
      return findStore("EmojiStore");
    },
    get SelectedGuildStore() {
      return findStore("SelectedGuildStore");
    }
  };
  var Permissions = {
    EMBED_LINKS: BigInt(1) << BigInt(14),
    USE_EXTERNAL_EMOJIS: BigInt(1) << BigInt(18),
    USE_EXTERNAL_STICKERS: BigInt(1) << BigInt(37)
  };
  function hasPermission(channelId, permission) {
    var _a, _b;
    const channel = (_a = Stores.ChannelStore) == null ? void 0 : _a.getChannel(channelId);
    if (!channel || ((_b = channel.isPrivate) == null ? void 0 : _b.call(channel))) return true;
    try {
      return Stores.PermissionStore.can(permission, channel);
    } catch (e) {
      return true;
    }
  }
  var hasEmbedPerms = (id) => hasPermission(id, Permissions.EMBED_LINKS);
  var hasExternalStickerPerms = (id) => hasPermission(id, Permissions.USE_EXTERNAL_STICKERS);
  function premiumType() {
    var _a, _b, _c, _d;
    return (_d = (_c = (_b = (_a = Stores.UserStore) == null ? void 0 : _a.getCurrentUser) == null ? void 0 : _b.call(_a)) == null ? void 0 : _c.premiumType) != null ? _d : 0;
  }
  var gifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/;
  function getWordBoundary(str, offset) {
    return !str[offset] || /\s/.test(str[offset]) ? "" : " ";
  }
  function getSearchParam(url, name) {
    const match = new RegExp(`[?&]${name}=([^&#]*)`).exec(url);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch (e) {
      return match[1];
    }
  }
  function formatLink(url, name) {
    var _a;
    if (!storage.useHyperLinks) return url;
    const text = String((_a = storage.hyperLinkText) != null ? _a : DEFAULTS.hyperLinkText).split("{{NAME}}").join(name);
    return `[${text}](${url})`;
  }
  var unpatches = [];
  function addUnpatch(...fns) {
    for (const fn of fns) if (typeof fn === "function") unpatches.push(fn);
  }
  function unpatchAll() {
    while (unpatches.length) {
      try {
        unpatches.pop()();
      } catch (e) {
        logger.error("[FakeNitro] unpatch failed", e);
      }
    }
  }
  function safely(name, fn) {
    try {
      fn();
      logger.log(`[FakeNitro] ${name}: ok`);
      return true;
    } catch (e) {
      logger.error(`[FakeNitro] ${name}: failed`, e);
      return false;
    }
  }

  // src/extras.js
  var SOUNDBOARD_EVENTS = /* @__PURE__ */ new Set([
    "SOUNDBOARD_SOUNDS_RECEIVED",
    "GUILD_SOUNDBOARD_SOUND_CREATE",
    "GUILD_SOUNDBOARD_SOUND_UPDATE",
    "GUILD_SOUNDBOARD_SOUNDS_UPDATE"
  ]);
  function patchAppIcons({ safely: safely2 }) {
    safely2("app icons", () => {
      const { after } = vendetta.patcher;
      const AppIconTypes = findProps("MasterAppIconIds");
      if (AppIconTypes) {
        const { FreemiumAppIconIds, MasterAppIconIds } = AppIconTypes;
        if (storage.enableAppIconBypass) AppIconTypes.FreemiumAppIconIds = MasterAppIconIds;
        addUnpatch(() => {
          AppIconTypes.FreemiumAppIconIds = FreemiumAppIconIds;
        });
      } else {
        logger.warn("[FakeNitro] AppIconTypes not found");
      }
      const AppIconUtils = findProps("getIcons");
      if (!AppIconUtils) throw new Error("AppIconUtils (getIcons) not found");
      const unlock = (icon) => {
        if (icon && storage.enableAppIconBypass) icon.isPremium = false;
        return icon;
      };
      for (const fn of ["getIcons", "getOfficialAlternateIcons", "getLimitedAlternateIcons"]) {
        if (typeof AppIconUtils[fn] !== "function") continue;
        addUnpatch(
          after(fn, AppIconUtils, (_, icons) => {
            if (Array.isArray(icons)) icons.forEach(unlock);
            return icons;
          })
        );
      }
      if (typeof AppIconUtils.getIconById === "function") {
        addUnpatch(after("getIconById", AppIconUtils, (_, icon) => unlock(icon)));
      }
    });
  }
  function markAvailable(value, depth) {
    if (!value || typeof value !== "object" || depth > 6) return;
    if (Array.isArray(value)) {
      for (const v of value) markAvailable(v, depth + 1);
      return;
    }
    if (("soundId" in value || "sound_id" in value) && "available" in value) value.available = true;
    for (const key in value) markAvailable(value[key], depth + 1);
  }
  function patchSoundboard({ safely: safely2 }) {
    safely2("soundboard", () => {
      addUnpatch(
        bunny.api.flux.intercept((payload) => {
          if (storage.enableSoundboardBypass && SOUNDBOARD_EVENTS.has(payload.type)) {
            markAvailable(payload, 0);
          }
        })
      );
    });
  }

  // src/components.js
  var cache;
  function unwrap(value) {
    var _a, _b, _c;
    const factory = (_c = (_b = (_a = bunny.utils) == null ? void 0 : _a.lazy) == null ? void 0 : _b.getProxyFactory) == null ? void 0 : _c.call(_b, value);
    return factory ? factory() : value;
  }
  function getComponents() {
    if (cache) return cache;
    const all = bunny.metro.common.components;
    cache = {};
    for (const name of [
      "Stack",
      "TableRowGroup",
      "TableSwitchRow",
      "TableRadioGroup",
      "TableRadioRow",
      "TableRowIcon",
      "TextInput",
      "AlertModal",
      "AlertActionButton",
      "AlertActions"
    ]) {
      cache[name] = unwrap(all[name]);
    }
    return cache;
  }

  // src/alerts.jsx
  var { openAlert } = bunny.ui.alerts;
  var { useEffect, useRef } = React;
  function CannotEmbedNotice({ resolve }) {
    const { AlertModal, AlertActionButton, AlertActions } = getComponents();
    const settled = useRef(false);
    const done = (value) => {
      if (settled.current) return;
      settled.current = true;
      resolve(value);
    };
    useEffect(() => () => done(false), []);
    return /* @__PURE__ */ React.createElement(
      AlertModal,
      {
        title: "Hold on!",
        content: "You are trying to send/edit a message that contains a FakeNitro emoji or sticker, however you do not have permissions to embed links in the current channel. Are you sure you want to send this message? Your FakeNitro items will appear as a link only.",
        actions: /* @__PURE__ */ React.createElement(AlertActions, null, /* @__PURE__ */ React.createElement(AlertActionButton, { variant: "destructive", text: "Send Anyway", onPress: () => done(true) }), /* @__PURE__ */ React.createElement(
          AlertActionButton,
          {
            variant: "secondary",
            text: "Send Anyway & Don't Ask Again",
            onPress: () => {
              storage.disableEmbedPermissionCheck = true;
              done(true);
            }
          }
        ), /* @__PURE__ */ React.createElement(AlertActionButton, { variant: "secondary", text: "Cancel", onPress: () => done(false) }))
      }
    );
  }
  function showCannotEmbedNotice() {
    return new Promise((resolve) => {
      openAlert("fake-nitro-cannot-embed", /* @__PURE__ */ React.createElement(CannotEmbedNotice, { resolve }));
    });
  }
  function showUnsupportedStickerNotice() {
    const { AlertModal, AlertActionButton, AlertActions } = getComponents();
    openAlert(
      "fake-nitro-unsupported-sticker",
      /* @__PURE__ */ React.createElement(
        AlertModal,
        {
          title: "Hold on!",
          content: "This sticker is a Lottie sticker, which can't be sent as a FakeNitro link. Please remove it to proceed.",
          actions: /* @__PURE__ */ React.createElement(AlertActions, null, /* @__PURE__ */ React.createElement(AlertActionButton, { variant: "primary", text: "OK" }))
        }
      )
    );
  }

  // src/premium.js
  var ProductCatalog;
  var originalCanUserUse;
  function canActuallyUse(productKey) {
    if (!ProductCatalog || !originalCanUserUse) return false;
    try {
      return originalCanUserUse.call(ProductCatalog, ProductCatalog[productKey]);
    } catch (e) {
      return false;
    }
  }
  function shouldBypass(key) {
    if (!key) return false;
    if (key === "STICKERS_EVERYWHERE") return storage.enableStickerBypass;
    if (key === "CLIENT_THEMES") return storage.enableThemeBypass;
    if (key === "APP_ICONS") return storage.enableAppIconBypass;
    if (/STREAM|VIDEO_UPLOAD|VIDEO_QUALITY/.test(key)) return storage.enableStreamQualityBypass;
    return false;
  }
  function patchPremium() {
    ProductCatalog = findProps("canUserUse");
    if (!ProductCatalog) throw new Error("ProductCatalog (canUserUse) not found");
    originalCanUserUse = ProductCatalog.canUserUse;
    const keyOf = /* @__PURE__ */ new Map();
    for (const key of Object.keys(ProductCatalog)) {
      const value = ProductCatalog[key];
      if (value != null && typeof value !== "function") keyOf.set(value, key);
    }
    logger.log(`[FakeNitro] products: ${[...keyOf.values()].join(", ")}`);
    addUnpatch(
      vendetta.patcher.instead("canUserUse", ProductCatalog, function(args, orig) {
        if (shouldBypass(keyOf.get(args[0]))) return true;
        return orig.apply(this, args);
      })
    );
  }

  // src/fakeify.js
  var { before, instead } = vendetta.patcher;
  var EmojiUtils;
  var Intention = {};
  var allowedIntentions = /* @__PURE__ */ new Set();
  function canUseEmote(emoji, channelId) {
    var _a, _b, _c, _d, _e;
    if (!emoji || !emoji.id) return true;
    if (emoji.type === 0) return true;
    const channel = (_a = Stores.ChannelStore) == null ? void 0 : _a.getChannel(channelId);
    const getReason = (_b = EmojiUtils == null ? void 0 : EmojiUtils.default) == null ? void 0 : _b.getEmojiUnavailableReason;
    if (getReason && Intention.CHAT !== void 0) {
      try {
        const reason = getReason.call(EmojiUtils.default, {
          channel,
          emoji,
          intention: Intention.CHAT,
          bypass: true
        });
        return reason == null;
      } catch (e) {
        logger.error("[FakeNitro] getEmojiUnavailableReason failed, using fallback", e);
      }
    }
    if (emoji.available === false) return false;
    const guildId = (_e = channel == null ? void 0 : channel.guild_id) != null ? _e : (_d = (_c = Stores.SelectedGuildStore) == null ? void 0 : _c.getGuildId) == null ? void 0 : _d.call(_c);
    if (premiumType() > 0) {
      return emoji.guildId === guildId || hasPermission(channelId, Permissions.USE_EXTERNAL_EMOJIS);
    }
    return !emoji.animated && emoji.guildId === guildId;
  }
  function emojiUrl(emoji) {
    var _a;
    const size = (_a = storage.emojiSize) != null ? _a : DEFAULT_EMOJI_SIZE;
    let url = `https://cdn.discordapp.com/emojis/${emoji.id}.webp?size=${size}&name=${encodeURIComponent(emoji.name)}&lossless=true`;
    if (emoji.animated) url += "&animated=true";
    return url;
  }
  function stickerUrl(sticker) {
    var _a;
    const ext = sticker.format_type === 4 ? "gif" : "png";
    const size = (_a = storage.stickerSize) != null ? _a : DEFAULT_STICKER_SIZE;
    return `https://media.discordapp.net/stickers/${sticker.id}.${ext}?size=${size}&name=${encodeURIComponent(sticker.name)}&lossless=true`;
  }
  function emojiName(emoji) {
    return (emoji.originalName || emoji.name || "emoji").replace(/~\d+$/, "");
  }
  function replaceEmoji(content, emoji) {
    const link = formatLink(emojiUrl(emoji), emojiName(emoji));
    const re = new RegExp(`<a?:[^:<>\\s]+:${emoji.id}>`, "g");
    return content.replace(
      re,
      (match, offset, str) => getWordBoundary(str, offset - 1) + link + getWordBoundary(str, offset + match.length)
    );
  }
  function processMessage(channelId, data, isEdit) {
    var _a;
    if (!storage.enableEmojiBypass || !data || typeof data.content !== "string") {
      return Promise.resolve(true);
    }
    let hasBypass = false;
    if (isEdit) {
      const seen = /* @__PURE__ */ new Set();
      const re = /(\\)?<a?:\w+:(\d+)>/g;
      let m;
      while (m = re.exec(data.content)) {
        if (m[1] || seen.has(m[2])) continue;
        seen.add(m[2]);
        const emoji = (_a = Stores.EmojiStore) == null ? void 0 : _a.getCustomEmojiById(m[2]);
        if (!emoji || canUseEmote(emoji, channelId)) continue;
        hasBypass = true;
        data.content = replaceEmoji(data.content, emoji);
        re.lastIndex = 0;
      }
    }
    if (Array.isArray(data.invalidEmojis) && data.invalidEmojis.length) {
      for (const emoji of data.invalidEmojis) {
        if (!(emoji == null ? void 0 : emoji.id)) continue;
        hasBypass = true;
        data.content = replaceEmoji(data.content, emoji);
      }
      data.invalidEmojis = [];
    }
    if (Array.isArray(data.validNonShortcutEmojis) && data.validNonShortcutEmojis.length) {
      data.validNonShortcutEmojis = data.validNonShortcutEmojis.filter((emoji) => {
        if (canUseEmote(emoji, channelId)) return true;
        hasBypass = true;
        data.content = replaceEmoji(data.content, emoji);
        return false;
      });
    }
    if (hasBypass && !storage.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
      return showCannotEmbedNotice();
    }
    return Promise.resolve(true);
  }
  function patchEmojiAvailability() {
    var _a, _b, _c;
    EmojiUtils = findProps("countEmoji");
    const EmojiConstants = (_a = findPath("modules/emojis/EmojiConstants.tsx")) != null ? _a : findProps("EmojiIntention");
    Intention = (_b = EmojiConstants == null ? void 0 : EmojiConstants.EmojiIntention) != null ? _b : {};
    if (!((_c = EmojiUtils == null ? void 0 : EmojiUtils.default) == null ? void 0 : _c.getEmojiUnavailableReason)) {
      throw new Error("EmojiUtils.getEmojiUnavailableReason not found");
    }
    if (Intention.CHAT === void 0) throw new Error("EmojiIntention not found");
    allowedIntentions = new Set(
      [Intention.CHAT, Intention.GUILD_STICKER_RELATED_EMOJI, Intention.AUTO_SUGGESTION].filter(
        (x) => x !== void 0
      )
    );
    addUnpatch(
      instead("getEmojiUnavailableReason", EmojiUtils.default, function(args, orig) {
        const opts = args[0] || {};
        if (storage.enableEmojiBypass && !opts.bypass && allowedIntentions.has(opts.intention)) {
          return null;
        }
        return orig.apply(this, args);
      })
    );
  }
  function patchEmojiPicker() {
    const mod = findPath("modules/emoji_picker/native/components/EmojiPickerList.tsx");
    if (!(mod == null ? void 0 : mod.default)) throw new Error("EmojiPickerList not found");
    const target = mod.default.type ? mod.default : mod;
    const key = mod.default.type ? "type" : "default";
    const empty = /* @__PURE__ */ new Set();
    addUnpatch(
      before(key, target, (args) => {
        const props = args[0];
        if (!storage.enableEmojiBypass || !props) return;
        if (!allowedIntentions.has(props.emojiPickerIntention)) return;
        for (const cat of props.categories || []) {
          if (cat && "emojisDisabled" in cat) {
            cat.emojisDisabled = empty;
            cat.isNitroLocked = false;
          }
        }
      })
    );
  }
  function patchStickerPicker() {
    const mod = findPath("modules/stickers/native/StickerPickerListRow.tsx");
    if (!(mod == null ? void 0 : mod.default)) throw new Error("StickerPickerListRow not found");
    addUnpatch(
      before("default", mod, (args) => {
        const props = args[0];
        if (!storage.enableStickerBypass || !Array.isArray(props == null ? void 0 : props.stickers)) return;
        props.stickers = props.stickers.map((s) => Object.assign({}, s, { available: true }));
      })
    );
  }
  function patchMessageActions() {
    const Actions = findProps("sendMessage", "editMessage");
    if (!Actions) throw new Error("MessageActionCreators not found");
    addUnpatch(
      instead("sendMessage", Actions, function(args, orig) {
        return processMessage(args[0], args[1], false).then(
          (ok) => ok ? orig.apply(this, args) : void 0
        );
      }),
      instead("editMessage", Actions, function(args, orig) {
        return processMessage(args[0], args[2], true).then(
          (ok) => ok ? orig.apply(this, args) : void 0
        );
      })
    );
    if (typeof Actions.sendStickers !== "function") return;
    addUnpatch(
      instead("sendStickers", Actions, function(args, orig) {
        var _a, _b;
        if (!storage.enableStickerBypass) return orig.apply(this, args);
        const [channelId, stickerIds, a2, extra] = args;
        const channel = (_a = Stores.ChannelStore) == null ? void 0 : _a.getChannel(channelId);
        if (!channel || !Array.isArray(stickerIds)) return orig.apply(this, args);
        const canUseStickers = canActuallyUse("STICKERS_EVERYWHERE") && hasExternalStickerPerms(channelId);
        const realIds = [];
        const links = [];
        let hasLottie = false;
        for (const id of stickerIds) {
          const sticker = (_b = Stores.StickersStore) == null ? void 0 : _b.getStickerById(id);
          if (!sticker || "pack_id" in sticker) {
            realIds.push(id);
            continue;
          }
          if (sticker.available !== false && (canUseStickers || sticker.guild_id === channel.guild_id)) {
            realIds.push(id);
            continue;
          }
          if (sticker.format_type === 3) {
            hasLottie = true;
            continue;
          }
          links.push(formatLink(stickerUrl(sticker), sticker.name));
        }
        if (hasLottie) {
          showUnsupportedStickerNotice();
          return Promise.resolve();
        }
        if (!links.length) return orig.apply(this, args);
        const proceed = !storage.disableEmbedPermissionCheck && !hasEmbedPerms(channelId) ? showCannotEmbedNotice() : Promise.resolve(true);
        return proceed.then((ok) => {
          if (!ok) return;
          const sends = [
            Actions.sendMessage(
              channelId,
              { content: links.join(" "), invalidEmojis: [], validNonShortcutEmojis: [], tts: false },
              a2,
              extra
            )
          ];
          if (realIds.length) {
            const realArgs = args.slice();
            realArgs[1] = realIds;
            sends.push(orig.apply(this, realArgs));
          }
          return Promise.all(sends);
        });
      })
    );
  }
  function patchExpressionSending({ safely: safely2 }) {
    safely2("emoji availability", patchEmojiAvailability);
    safely2("emoji picker", patchEmojiPicker);
    safely2("sticker picker", patchStickerPicker);
    safely2("send/edit/sticker bypass", patchMessageActions);
  }

  // src/realify.js
  var MESSAGE_ROW_TYPE = 1;
  var MAX_JUMBO_EMOJIS = 30;
  var STICKER_SIZE = 160;
  var STICKER_RENDER_LOOP = 0;
  var expressionUrlRegex = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/(emojis|stickers)\/(\d+)\.(\w+)/;
  var AvatarUtils;
  var StickersUtils;
  function parseExpressionUrl(url) {
    if (typeof url !== "string") return;
    const match = expressionUrlRegex.exec(url);
    if (!match) return;
    const extension = match[3].toLowerCase();
    return {
      kind: match[1],
      id: match[2],
      extension,
      name: getSearchParam(url, "name") || void 0,
      animated: extension === "gif" || getSearchParam(url, "animated") === "true"
    };
  }
  function createEmojiNode(link) {
    var _a, _b, _c;
    const known = (_a = Stores.EmojiStore) == null ? void 0 : _a.getCustomEmojiById(link.id);
    const animated = link.animated || !!(known == null ? void 0 : known.animated);
    return {
      type: "customEmoji",
      id: link.id,
      alt: (_c = (_b = known == null ? void 0 : known.name) != null ? _b : link.name) != null ? _c : "FakeNitroEmoji",
      src: AvatarUtils.getEmojiURL({ id: link.id, animated, size: 48 }),
      frozenSrc: AvatarUtils.getEmojiURL({ id: link.id, animated: false, size: 48 }),
      fake: true
    };
  }
  function createSticker(id, nameHint, extension) {
    var _a, _b, _c, _d, _e;
    const known = (_a = Stores.StickersStore) == null ? void 0 : _a.getStickerById(id);
    const sticker = {
      id,
      name: (_c = (_b = known == null ? void 0 : known.name) != null ? _b : nameHint) != null ? _c : "FakeNitroSticker",
      format_type: (_d = known == null ? void 0 : known.format_type) != null ? _d : extension === "gif" ? 4 : 1
    };
    return Object.assign({}, sticker, {
      asset: id,
      url: (_e = StickersUtils.getStickerAssetUrl(sticker)) != null ? _e : "",
      width: STICKER_SIZE,
      height: STICKER_SIZE,
      renderMode: STICKER_RENDER_LOOP,
      accessibilityLabel: sticker.name,
      accessibilityHint: "",
      fake: true
    });
  }
  var isWhitespace = (n) => (n == null ? void 0 : n.type) === "text" && typeof n.content === "string" && !n.content.trim();
  function trimWhitespace(nodes) {
    let start = 0;
    let end = nodes.length;
    while (start < end && isWhitespace(nodes[start])) start++;
    while (end > start && isWhitespace(nodes[end - 1])) end--;
    return start === 0 && end === nodes.length ? nodes : nodes.slice(start, end);
  }
  function isJumboable(nodes) {
    let count = 0;
    for (const n of nodes) {
      if ((n == null ? void 0 : n.type) === "emoji" || (n == null ? void 0 : n.type) === "customEmoji") count++;
      else if (!isWhitespace(n)) return false;
    }
    return count > 0 && count <= MAX_JUMBO_EMOJIS;
  }
  function isSimpleMessage(content) {
    return trimWhitespace(content || []).length <= 1;
  }
  function attachmentUrl(a) {
    var _a, _b, _c, _d, _e;
    return (_e = (_c = (_b = (_a = a == null ? void 0 : a.url) != null ? _a : a == null ? void 0 : a.proxyURL) != null ? _b : a == null ? void 0 : a.proxy_url) != null ? _c : a == null ? void 0 : a.uri) != null ? _e : (_d = a == null ? void 0 : a.source) == null ? void 0 : _d.uri;
  }
  function realify(message, isReplyPreview) {
    var _a;
    const emojis = storage.transformEmojis;
    const stickers = !isReplyPreview && storage.transformStickers;
    if (!emojis && !stickers) return;
    const original = message.content || [];
    const compoundOk = storage.transformCompoundSentence || isSimpleMessage(original);
    const emojiIds = /* @__PURE__ */ new Set();
    const newStickers = /* @__PURE__ */ new Map();
    const parse = (url) => {
      const link = parseExpressionUrl(url);
      if (link && (link.kind === "emojis" ? emojis : stickers)) return link;
    };
    const addSticker = (id, name, extension) => {
      if (!newStickers.has(id)) newStickers.set(id, createSticker(id, name, extension));
    };
    const convertNodes = (nodes) => {
      let changed = false;
      const out = [];
      for (const node of nodes) {
        const conv = convertNode(node);
        if (conv !== node) changed = true;
        if (conv) out.push(conv);
      }
      return changed ? out : nodes;
    };
    const convertNode = (node) => {
      if ((node == null ? void 0 : node.type) === "link") {
        const link = parse(node.target);
        if (!link) return node;
        if (link.kind === "emojis") {
          emojiIds.add(link.id);
          return createEmojiNode(link);
        }
        addSticker(link.id, link.name, link.extension);
        return null;
      }
      if (Array.isArray(node == null ? void 0 : node.content)) {
        const content2 = convertNodes(node.content);
        if (content2 !== node.content) return Object.assign({}, node, { content: content2 });
      }
      return node;
    };
    let content = compoundOk ? convertNodes(original) : original;
    let removedEmbeds = false;
    const embeds = !compoundOk ? message.embeds : (_a = message.embeds) == null ? void 0 : _a.filter((embed) => {
      var _a2, _b;
      if ((embed == null ? void 0 : embed.type) !== "image" && (embed == null ? void 0 : embed.type) !== "gifv") return true;
      const link = parse((_b = embed.url) != null ? _b : (_a2 = embed.image) == null ? void 0 : _a2.url);
      if (!link) return true;
      if (link.kind === "stickers") {
        addSticker(link.id, link.name, link.extension);
      } else if (!emojiIds.has(link.id)) {
        if (original.length) return true;
        if (content.length) content = content.concat([{ type: "text", content: " " }]);
        content = content.concat([createEmojiNode(link)]);
        emojiIds.add(link.id);
      }
      removedEmbeds = true;
      return false;
    });
    let attachments = message.attachments;
    if (stickers && Array.isArray(attachments) && attachments.length) {
      const kept = attachments.filter((a) => {
        var _a2, _b;
        const match = String((_a2 = attachmentUrl(a)) != null ? _a2 : "").match(gifStickerRegex);
        if (!match || !((_b = Stores.StickersStore) == null ? void 0 : _b.getStickerById(match[1]))) return true;
        addSticker(match[1], void 0, "gif");
        return false;
      });
      if (kept.length !== attachments.length) attachments = kept;
    }
    const attachmentsChanged = attachments !== message.attachments;
    if (content === original && !removedEmbeds && !newStickers.size && !attachmentsChanged) return;
    content = trimWhitespace(content);
    if (!isReplyPreview && isJumboable(content)) {
      content = content.map((n) => Object.assign({}, n, { jumboable: true }));
    }
    const result = Object.assign({}, message, { content, embeds, attachments });
    if (newStickers.size) result.stickers = (message.stickers || []).concat([...newStickers.values()]);
    if ((removedEmbeds || attachmentsChanged) && !(embeds == null ? void 0 : embeds.length) && !(attachments == null ? void 0 : attachments.length)) {
      result.useAttachmentGridLayout = false;
      result.useAttachmentUploadPreview = false;
    }
    return result;
  }
  function patchExpressionRendering({ safely: safely2 }) {
    safely2("message rendering", () => {
      var _a;
      AvatarUtils = findProps("getEmojiURL");
      StickersUtils = findProps("getStickerAssetUrl");
      const RowManager = findName("RowManager");
      if (!AvatarUtils) throw new Error("AvatarUtils (getEmojiURL) not found");
      if (!StickersUtils) throw new Error("StickersUtils (getStickerAssetUrl) not found");
      if (!((_a = RowManager == null ? void 0 : RowManager.prototype) == null ? void 0 : _a.generate)) throw new Error("RowManager.generate not found");
      addUnpatch(
        vendetta.patcher.after("generate", RowManager.prototype, (args, row) => {
          if ((row == null ? void 0 : row.type) !== MESSAGE_ROW_TYPE || !row.message) return row;
          try {
            const message = realify(row.message, false);
            if (message) row.message = message;
            const reply = row.message.referencedMessage;
            const replyMessage = (reply == null ? void 0 : reply.message) && realify(reply.message, true);
            if (replyMessage) {
              row.message = Object.assign({}, row.message, {
                referencedMessage: Object.assign({}, reply, { message: replyMessage })
              });
            }
          } catch (e) {
            logger.error("[FakeNitro] failed to transform message", e);
          }
          return row;
        })
      );
    });
  }

  // src/settings.jsx
  var { ScrollView } = ReactNative;
  var { useProxy } = vendetta.storage;
  var { getAssetIDByName } = vendetta.ui.assets;
  function Icon({ name }) {
    const { TableRowIcon } = getComponents();
    const id = getAssetIDByName(name);
    return id && TableRowIcon ? /* @__PURE__ */ React.createElement(TableRowIcon, { source: id }) : null;
  }
  function Switch({ setting, label, subLabel, icon }) {
    const { TableSwitchRow } = getComponents();
    return /* @__PURE__ */ React.createElement(
      TableSwitchRow,
      {
        label,
        subLabel,
        icon: icon ? /* @__PURE__ */ React.createElement(Icon, { name: icon }) : void 0,
        value: !!storage[setting],
        onValueChange: (v) => storage[setting] = v
      }
    );
  }
  function SizePicker({ setting, title }) {
    var _a;
    const { TableRadioGroup, TableRadioRow } = getComponents();
    return /* @__PURE__ */ React.createElement(
      TableRadioGroup,
      {
        title,
        defaultValue: String((_a = storage[setting]) != null ? _a : DEFAULTS[setting]),
        onChange: (v) => storage[setting] = Number(v)
      },
      MEDIA_SIZES.map((size) => /* @__PURE__ */ React.createElement(TableRadioRow, { key: size, label: `${size}px`, value: String(size) }))
    );
  }
  function Settings() {
    useProxy(storage);
    const { Stack, TableRowGroup, TextInput } = getComponents();
    return /* @__PURE__ */ React.createElement(ScrollView, { style: { flex: 1 }, contentContainerStyle: { padding: 16, paddingBottom: 64 } }, /* @__PURE__ */ React.createElement(Stack, { spacing: 24 }, /* @__PURE__ */ React.createElement(TableRowGroup, { title: "Emojis" }, /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "enableEmojiBypass",
        icon: "ReactionIcon",
        label: "Enable emoji bypass",
        subLabel: "Allows sending fake emojis (also bypasses missing permission to use custom emojis)"
      }
    ), /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "transformEmojis",
        icon: "ImageIcon",
        label: "Transform emojis",
        subLabel: "Whether to transform fake emojis into real ones"
      }
    )), storage.enableEmojiBypass && /* @__PURE__ */ React.createElement(SizePicker, { setting: "emojiSize", title: "Size of the emojis when sending" }), /* @__PURE__ */ React.createElement(TableRowGroup, { title: "Stickers" }, /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "enableStickerBypass",
        icon: "StickerIcon",
        label: "Enable sticker bypass",
        subLabel: "Allows sending fake stickers (also bypasses missing permission to use stickers)"
      }
    ), /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "transformStickers",
        icon: "ImageIcon",
        label: "Transform stickers",
        subLabel: "Whether to transform fake stickers into real ones"
      }
    )), storage.enableStickerBypass && /* @__PURE__ */ React.createElement(SizePicker, { setting: "stickerSize", title: "Size of the stickers when sending" }), /* @__PURE__ */ React.createElement(TableRowGroup, { title: "Links" }, /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "transformCompoundSentence",
        label: "Transform compound sentences",
        subLabel: "Whether to transform fake stickers and emojis in compound sentences (sentences with more content than just the fake emoji or sticker link)"
      }
    ), /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "useHyperLinks",
        icon: "LinkIcon",
        label: "Use hyperlinks",
        subLabel: "Whether to use hyperlinks when sending fake emojis and stickers"
      }
    ), /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "disableEmbedPermissionCheck",
        label: "Disable embed permission check",
        subLabel: "Whether to disable the embed permission check when sending fake emojis and stickers"
      }
    )), storage.useHyperLinks && /* @__PURE__ */ React.createElement(
      TextInput,
      {
        label: "Hyperlink text",
        description: "What text the hyperlink should use. {{NAME}} will be replaced with the emoji/sticker name.",
        placeholder: "{{NAME}}",
        value: storage.hyperLinkText,
        onChange: (v) => storage.hyperLinkText = v != null ? v : "",
        isClearable: true
      }
    ), /* @__PURE__ */ React.createElement(TableRowGroup, { title: "Streaming" }, /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "enableStreamQualityBypass",
        icon: "ScreenIcon",
        label: "Stream quality bypass",
        subLabel: "Allow streaming in nitro quality"
      }
    )), /* @__PURE__ */ React.createElement(TableRowGroup, { title: "Appearance & extras" }, /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "enableThemeBypass",
        icon: "PaintPaletteIcon",
        label: "Nitro themes",
        subLabel: "Use gradient app themes. Applied locally only, others won't see it."
      }
    ), /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "enableAppIconBypass",
        icon: "NitroWheelIcon",
        label: "Nitro app icons",
        subLabel: "Unlock premium app icons. Reload Discord after changing."
      }
    ), /* @__PURE__ */ React.createElement(
      Switch,
      {
        setting: "enableSoundboardBypass",
        icon: "SoundboardIcon",
        label: "Soundboard",
        subLabel: "Make all soundboard sounds available"
      }
    ))));
  }

  // src/themes.js
  var { intercept } = bunny.api.flux;
  var isNonGradientThemeIndex = (index) => index < 4;
  function applyStoredPreset() {
    if (!storage.enableThemeBypass) return;
    if (typeof storage.themePreset !== "number" || storage.themePreset < 0) return;
    if (canActuallyUse("CLIENT_THEMES")) return;
    setTimeout(() => {
      try {
        FluxDispatcher.dispatch({ type: "UPDATE_BACKGROUND_GRADIENT_PRESET", presetId: storage.themePreset });
      } catch (e) {
        logger.error("[FakeNitro] failed to re-apply gradient theme", e);
      }
    });
  }
  function patchThemes({ safely: safely2 }) {
    safely2("client themes", () => {
      const ThemeActions = findProps("updateBackgroundGradientPreset");
      if (ThemeActions) {
        const { before: before2 } = vendetta.patcher;
        if (typeof ThemeActions.updateMobilePendingThemeIndex === "function") {
          addUnpatch(
            before2("updateMobilePendingThemeIndex", ThemeActions, (args) => {
              if (isNonGradientThemeIndex(args[0])) storage.themePreset = -1;
            })
          );
        }
        addUnpatch(
          before2("updateBackgroundGradientPreset", ThemeActions, (args) => {
            if (typeof args[0] === "number") storage.themePreset = args[0];
          })
        );
      } else {
        logger.warn("[FakeNitro] theme action creators not found, theme won't persist");
      }
      addUnpatch(
        intercept((payload) => {
          var _a, _b, _c;
          if (!storage.enableThemeBypass) return;
          if (payload.type === "SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE") {
            const appearance = (_a = payload.changes) == null ? void 0 : _a.appearance;
            const presetId = (_c = (_b = appearance == null ? void 0 : appearance.settings) == null ? void 0 : _b.clientThemeSettings) == null ? void 0 : _c.backgroundGradientPresetId;
            if (appearance && presetId !== void 0 && appearance.shouldSync !== false && !canActuallyUse("CLIENT_THEMES")) {
              setTimeout(
                () => FluxDispatcher.dispatch({ type: "UPDATE_BACKGROUND_GRADIENT_PRESET", presetId })
              );
              appearance.shouldSync = false;
              appearance.settings.clientThemeSettings.backgroundGradientPresetId = void 0;
            }
          }
          if (payload.type === "CONNECTION_OPEN") applyStoredPreset();
        })
      );
      applyStoredPreset();
    });
  }

  // src/index.js
  var index_default = {
    onLoad() {
      initStorage();
      const ctx = { safely };
      safely("premium checks", patchPremium);
      patchExpressionSending(ctx);
      patchExpressionRendering(ctx);
      patchThemes(ctx);
      patchAppIcons(ctx);
      patchSoundboard(ctx);
      logger.log("[FakeNitro] loaded");
    },
    onUnload() {
      unpatchAll();
    },
    settings: Settings
  };
  return __toCommonJS(index_exports);
})()