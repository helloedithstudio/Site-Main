// The Nuxt `$device` plugin: UA-based device class + capability features.
// `lowPowerMode` is detected with the hidden #test-video (iOS low-power mode
// refuses to autoplay it).

const hasWindow = () => typeof window !== "undefined";

class UserAgent {
  userAgent: string;
  isAndroidDevice: boolean;
  iOSDevice: string;

  constructor(ua?: string) {
    this.userAgent = ua || (hasWindow() && window.navigator ? window.navigator.userAgent : "");
    this.isAndroidDevice = !/like android/i.test(this.userAgent) && /android/i.test(this.userAgent);
    this.iOSDevice = this.match(1, /(iphone|ipod|ipad)/i).toLowerCase();
    if (
      hasWindow() &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 2 &&
      !(window as unknown as { MSStream?: unknown }).MSStream
    ) {
      this.iOSDevice = "ipad";
    }
  }

  match(index: number, re: RegExp) {
    const m = this.userAgent.match(re);
    return (m && m.length > 1 && m[index]) || "";
  }

  get isMobile() {
    return (
      !this.isTablet &&
      (/[^-]mobi/i.test(this.userAgent) ||
        this.iOSDevice === "iphone" ||
        this.iOSDevice === "ipod" ||
        this.isAndroidDevice ||
        /nexus\s*[0-6]\s*/i.test(this.userAgent))
    );
  }

  get isTablet() {
    return (
      (/tablet/i.test(this.userAgent) && !/tablet pc/i.test(this.userAgent)) ||
      this.iOSDevice === "ipad" ||
      (this.isAndroidDevice && !/[^-]mobi/i.test(this.userAgent)) ||
      (!/nexus\s*[0-6]\s*/i.test(this.userAgent) && /nexus\s*[0-9]+/i.test(this.userAgent))
    );
  }

  get isDesktop() {
    return !this.isMobile && !this.isTablet;
  }
}

export type Device = {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
  phone: boolean;
  features: {
    hasMouse: boolean;
    hasWheelEvent: boolean;
    hasMouseWheelEvent: boolean;
    hasTouch: boolean;
    hasKeyDown: boolean;
    lowPowerMode: boolean;
    reducedMotion: boolean;
  };
};

export function createDevice(): Device {
  const ua = new UserAgent();
  const device: Device = {
    mobile: ua.isMobile,
    tablet: ua.isTablet,
    desktop: ua.isDesktop,
    phone: ua.isMobile && !ua.isTablet,
    features: {
      hasMouse: false,
      hasWheelEvent: false,
      hasMouseWheelEvent: false,
      hasTouch: false,
      hasKeyDown: false,
      lowPowerMode: false,
      reducedMotion: false,
    },
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const testLowPower = () => {
    const video = document.querySelector<HTMLVideoElement>("#test-video");
    if (!video) return;
    const onReady = () => {
      device.features.lowPowerMode = video.paused;
      video.removeEventListener("canplaythrough", onReady);
    };
    video.addEventListener("canplaythrough", onReady);
    video.play().catch(() => {});
  };

  device.features.hasMouse = !("ontouchstart" in window);
  device.features.hasWheelEvent = "onwheel" in document;
  device.features.hasMouseWheelEvent = "onmousewheel" in document;
  device.features.hasTouch = "ontouchstart" in window;
  device.features.hasKeyDown = "onkeydown" in document;
  device.features.reducedMotion = reduced.matches;

  if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
    document.documentElement.classList.add("is-safari");
  }

  testLowPower();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") testLowPower();
  });
  window.addEventListener("focus", () => testLowPower());
  reduced.addEventListener?.("change", (e) => {
    device.features.reducedMotion = e.matches;
  });

  return device;
}
