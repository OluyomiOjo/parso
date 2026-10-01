// Parso only schedules notifications on the phone (reminders); it never receives push notifications.
// expo-notifications adds Apple's push setting (aps-environment) to the app anyway, which would make the
// build change the app's Apple provisioning. Removing it keeps local notifications working unchanged.
// List this plugin BEFORE expo-notifications in app.json: entitlement edits run in reverse order, so it
// then runs after the setting has been added.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
