const { withAndroidManifest } = require("expo/config-plugins");

// Keep portrait as an activity preference without filtering fixed-screen devices.
module.exports = function withOptionalPortraitFeature(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const features = manifest["uses-feature"] || [];
    const portraitFeature = features.find(
      (feature) => feature.$["android:name"] === "android.hardware.screen.portrait",
    );

    if (portraitFeature) {
      portraitFeature.$["android:required"] = "false";
    } else {
      features.push({
        $: {
          "android:name": "android.hardware.screen.portrait",
          "android:required": "false",
        },
      });
    }

    manifest["uses-feature"] = features;
    return config;
  });
};
