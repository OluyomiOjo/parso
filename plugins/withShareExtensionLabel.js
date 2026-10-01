// expo-share-intent names its share extension "<App> - Share Extension" and uses the same value for the
// Xcode target, which can't be "Parso" (the app target already has that name). This sets only the label
// people see in the iOS share sheet.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('expo/config-plugins');

module.exports = function withShareExtensionLabel(config, { label }) {
  // Finalized mods run after every other mod, including the one that writes the extension's files.
  return withFinalizedMod(config, [
    'ios',
    (cfg) => {
      const plist = path.join(cfg.modRequest.platformProjectRoot, 'ShareExtension', 'ShareExtension-Info.plist');
      if (fs.existsSync(plist)) {
        const xml = fs.readFileSync(plist, 'utf8').replace(
          /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
          `$1${label}$2`,
        );
        fs.writeFileSync(plist, xml);
      }
      return cfg;
    },
  ]);
};
