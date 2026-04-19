import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "click.crun.circlerun",
  appName: "CircleRun",
  webDir: "out",
  server: {
    url: "https://crun.click",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
};

export default config;
