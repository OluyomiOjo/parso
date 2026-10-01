// Two fixes to the iOS share extension that expo-share-intent generates. Both run in the finalized
// stage, after the package has written the extension's files.
//
// 1. Label: the package names the extension "<App> - Share Extension" and reuses that value for the
//    Xcode target, which can't be "Parso" (the app target already is). This sets only the label people
//    see in the share sheet.
// 2. Frozen source app: with the invisible extension view (the default), the extension finishes before
//    iOS has finished presenting it, which leaves Instagram, LinkedIn etc. stuck under an invisible
//    screen. Known bug, open upstream: https://github.com/achorein/expo-share-intent/issues/217
//    Fix suggested there: start the hand-off in viewDidAppear instead of viewDidLoad.
//
// Each edit throws if the code it expects isn't there, so a package update can't silently drop a fix.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('expo/config-plugins');

function replaceOnce(source, from, to, what) {
  if (!from.test(source)) throw new Error(`withShareExtensionFixes: couldn't find ${what}; check expo-share-intent's ShareViewController.swift`);
  return source.replace(from, to);
}

module.exports = function withShareExtensionFixes(config, { label }) {
  return withFinalizedMod(config, [
    'ios',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'ShareExtension');

      const plist = path.join(dir, 'ShareExtension-Info.plist');
      fs.writeFileSync(
        plist,
        replaceOnce(
          fs.readFileSync(plist, 'utf8'),
          /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
          `$1${label}$2`,
          'CFBundleDisplayName',
        ),
      );

      const swiftPath = path.join(dir, 'ShareViewController.swift');
      let swift = fs.readFileSync(swiftPath, 'utf8');
      swift = replaceOnce(
        swift,
        /(view\.isOpaque = false)\s*\n\s*handleViewLoad\(\)/,
        '$1',
        'the handleViewLoad() call in viewDidLoad',
      );
      swift = replaceOnce(
        swift,
        /if !hideView \{\s*\n\s*handleViewLoad\(\)\s*\n\s*\}/,
        '// Patched (expo-share-intent#217): hand off only once the view has fully appeared.\n    handleViewLoad()',
        'the hideView check in viewDidAppear',
      );
      fs.writeFileSync(swiftPath, swift);
      return cfg;
    },
  ]);
};
