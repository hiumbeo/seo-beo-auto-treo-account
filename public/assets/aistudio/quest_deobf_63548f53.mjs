import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "chalk";
import { fetch, ProxyAgent } from "undici";

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dir      = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dir, ".token");
const CFG_FILE   = join(__dir, ".quest-config.json");

// ─── Region Presets ───────────────────────────────────────────────────────────

const REGION_PRESETS = {
  // ─── Bắc & Nam Mỹ (Americas) ───
  US: {
    name: "🇺🇸 Hoa Kỳ (United States)",
    code: "US",
    locale: "en-US",
    systemLocale: "en-US",
    timezone: "America/New_York",
    tzOffset: 300,
    lang: "en-US,en;q=0.9",
  },
  CA: {
    name: "🇨🇦 Canada",
    code: "CA",
    locale: "en-US",
    systemLocale: "en-CA",
    timezone: "America/Toronto",
    tzOffset: 300,
    lang: "en-CA,en-US;q=0.9,en;q=0.8",
  },
  MX: {
    name: "🇲🇽 Mexico",
    code: "MX",
    locale: "es-419",
    systemLocale: "es-MX",
    timezone: "America/Mexico_City",
    tzOffset: 360,
    lang: "es-MX,es-419;q=0.9,es;q=0.8,en-US;q=0.7",
  },
  BR: {
    name: "🇧🇷 Brazil (Nam Mỹ)",
    code: "BR",
    locale: "pt-BR",
    systemLocale: "pt-BR",
    timezone: "America/Sao_Paulo",
    tzOffset: 180,
    lang: "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  AR: {
    name: "🇦🇷 Argentina",
    code: "AR",
    locale: "es-419",
    systemLocale: "es-AR",
    timezone: "America/Argentina/Buenos_Aires",
    tzOffset: 180,
    lang: "es-AR,es-419;q=0.9,es;q=0.8,en-US;q=0.7",
  },
  CL: {
    name: "🇨🇱 Chile",
    code: "CL",
    locale: "es-419",
    systemLocale: "es-CL",
    timezone: "America/Santiago",
    tzOffset: 240,
    lang: "es-CL,es-419;q=0.9,es;q=0.8,en-US;q=0.7",
  },
  CO: {
    name: "🇨🇴 Colombia",
    code: "CO",
    locale: "es-419",
    systemLocale: "es-CO",
    timezone: "America/Bogota",
    tzOffset: 300,
    lang: "es-CO,es-419;q=0.9,es;q=0.8,en-US;q=0.7",
  },

  // ─── Châu Á & Thái Bình Dương (Asia-Pacific) ───
  VN: {
    name: "🇻🇳 Việt Nam (Vietnam)",
    code: "VN",
    locale: "vi",
    systemLocale: "vi-VN",
    timezone: "Asia/Ho_Chi_Minh",
    tzOffset: -420,
    lang: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  JP: {
    name: "🇯🇵 Nhật Bản (Japan)",
    code: "JP",
    locale: "ja",
    systemLocale: "ja-JP",
    timezone: "Asia/Tokyo",
    tzOffset: -540,
    lang: "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  KR: {
    name: "🇰🇷 Hàn Quốc (South Korea)",
    code: "KR",
    locale: "ko",
    systemLocale: "ko-KR",
    timezone: "Asia/Seoul",
    tzOffset: -540,
    lang: "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  SG: {
    name: "🇸🇬 Singapore",
    code: "SG",
    locale: "en-US",
    systemLocale: "en-SG",
    timezone: "Asia/Singapore",
    tzOffset: -480,
    lang: "en-SG,en;q=0.9,zh-SG;q=0.8,en-US;q=0.7",
  },
  TW: {
    name: "🇹🇼 Đài Loan (Taiwan)",
    code: "TW",
    locale: "zh-TW",
    systemLocale: "zh-TW",
    timezone: "Asia/Taipei",
    tzOffset: -480,
    lang: "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  HK: {
    name: "🇭🇰 Hồng Kông (Hong Kong)",
    code: "HK",
    locale: "zh-TW",
    systemLocale: "zh-HK",
    timezone: "Asia/Hong_Kong",
    tzOffset: -480,
    lang: "zh-HK,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  TH: {
    name: "🇹🇭 Thái Lan (Thailand)",
    code: "TH",
    locale: "th",
    systemLocale: "th-TH",
    timezone: "Asia/Bangkok",
    tzOffset: -420,
    lang: "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  ID: {
    name: "🇮🇩 Indonesia",
    code: "ID",
    locale: "id",
    systemLocale: "id-ID",
    timezone: "Asia/Jakarta",
    tzOffset: -420,
    lang: "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  PH: {
    name: "🇵🇭 Philippines",
    code: "PH",
    locale: "en-US",
    systemLocale: "en-PH",
    timezone: "Asia/Manila",
    tzOffset: -480,
    lang: "en-PH,en;q=0.9,fil-PH;q=0.8,en-US;q=0.7",
  },
  MY: {
    name: "🇲🇾 Malaysia",
    code: "MY",
    locale: "en-GB",
    systemLocale: "ms-MY",
    timezone: "Asia/Kuala_Lumpur",
    tzOffset: -480,
    lang: "ms-MY,ms;q=0.9,en-GB;q=0.8,en-US;q=0.7",
  },
  IN: {
    name: "🇮🇳 Ấn Độ (India)",
    code: "IN",
    locale: "hi",
    systemLocale: "hi-IN",
    timezone: "Asia/Kolkata",
    tzOffset: -330,
    lang: "hi-IN,hi;q=0.9,en-IN;q=0.8,en-GB;q=0.7",
  },
  AU: {
    name: "🇦🇺 Úc (Australia)",
    code: "AU",
    locale: "en-GB",
    systemLocale: "en-AU",
    timezone: "Australia/Sydney",
    tzOffset: -600,
    lang: "en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  NZ: {
    name: "🇳🇿 New Zealand",
    code: "NZ",
    locale: "en-GB",
    systemLocale: "en-NZ",
    timezone: "Pacific/Auckland",
    tzOffset: -720,
    lang: "en-NZ,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  },

  // ─── Châu Âu (Europe) ───
  GB: {
    name: "🇬🇧 Vương Quốc Anh (United Kingdom)",
    code: "GB",
    locale: "en-GB",
    systemLocale: "en-GB",
    timezone: "Europe/London",
    tzOffset: -60,
    lang: "en-GB,en;q=0.9,en-US;q=0.8",
  },
  DE: {
    name: "🇩🇪 Đức / Châu Âu (Germany - EU)",
    code: "DE",
    locale: "de",
    systemLocale: "de-DE",
    timezone: "Europe/Berlin",
    tzOffset: -120,
    lang: "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  FR: {
    name: "🇫🇷 Pháp (France)",
    code: "FR",
    locale: "fr",
    systemLocale: "fr-FR",
    timezone: "Europe/Paris",
    tzOffset: -120,
    lang: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  ES: {
    name: "🇪🇸 Tây Ban Nha (Spain)",
    code: "ES",
    locale: "es-ES",
    systemLocale: "es-ES",
    timezone: "Europe/Madrid",
    tzOffset: -120,
    lang: "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  IT: {
    name: "🇮🇹 Ý (Italy)",
    code: "IT",
    locale: "it",
    systemLocale: "it-IT",
    timezone: "Europe/Rome",
    tzOffset: -120,
    lang: "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  NL: {
    name: "🇳🇱 Hà Lan (Netherlands)",
    code: "NL",
    locale: "nl",
    systemLocale: "nl-NL",
    timezone: "Europe/Amsterdam",
    tzOffset: -120,
    lang: "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  PL: {
    name: "🇵🇱 Ba Lan (Poland)",
    code: "PL",
    locale: "pl",
    systemLocale: "pl-PL",
    timezone: "Europe/Warsaw",
    tzOffset: -120,
    lang: "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  SE: {
    name: "🇸🇪 Thụy Điển (Sweden)",
    code: "SE",
    locale: "sv-SE",
    systemLocale: "sv-SE",
    timezone: "Europe/Stockholm",
    tzOffset: -120,
    lang: "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  NO: {
    name: "🇳🇴 Na Uy (Norway)",
    code: "NO",
    locale: "no",
    systemLocale: "nb-NO",
    timezone: "Europe/Oslo",
    tzOffset: -120,
    lang: "nb-NO,no;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  DK: {
    name: "🇩🇰 Đan Mạch (Denmark)",
    code: "DK",
    locale: "da",
    systemLocale: "da-DK",
    timezone: "Europe/Copenhagen",
    tzOffset: -120,
    lang: "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  FI: {
    name: "🇫🇮 Phần Lan (Finland)",
    code: "FI",
    locale: "fi",
    systemLocale: "fi-FI",
    timezone: "Europe/Helsinki",
    tzOffset: -180,
    lang: "fi-FI,fi;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  TR: {
    name: "🇹🇷 Thổ Nhĩ Kỳ (Turkey)",
    code: "TR",
    locale: "tr",
    systemLocale: "tr-TR",
    timezone: "Europe/Istanbul",
    tzOffset: -180,
    lang: "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  RU: {
    name: "🇷🇺 Nga (Russia)",
    code: "RU",
    locale: "ru",
    systemLocale: "ru-RU",
    timezone: "Europe/Moscow",
    tzOffset: -180,
    lang: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  UA: {
    name: "🇺🇦 Ukraine",
    code: "UA",
    locale: "uk",
    systemLocale: "uk-UA",
    timezone: "Europe/Kyiv",
    tzOffset: -180,
    lang: "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  CZ: {
    name: "🇨🇿 Séc (Czech Republic)",
    code: "CZ",
    locale: "cs",
    systemLocale: "cs-CZ",
    timezone: "Europe/Prague",
    tzOffset: -120,
    lang: "cs-CZ,cs;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  RO: {
    name: "🇷🇴 Romania",
    code: "RO",
    locale: "ro",
    systemLocale: "ro-RO",
    timezone: "Europe/Bucharest",
    tzOffset: -180,
    lang: "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  GR: {
    name: "🇬🇷 Hy Lạp (Greece)",
    code: "GR",
    locale: "el",
    systemLocale: "el-GR",
    timezone: "Europe/Athens",
    tzOffset: -180,
    lang: "el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  HU: {
    name: "🇭🇺 Hungary",
    code: "HU",
    locale: "hu",
    systemLocale: "hu-HU",
    timezone: "Europe/Budapest",
    tzOffset: -120,
    lang: "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7",
  },

  // ─── Trung Đông (Middle East) ───
  SA: {
    name: "🇸🇦 Ả Rập Xê Út (Saudi Arabia)",
    code: "SA",
    locale: "en-US",
    systemLocale: "ar-SA",
    timezone: "Asia/Riyadh",
    tzOffset: -180,
    lang: "ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  AE: {
    name: "🇦🇪 UAE (Các Tiểu Vương Quốc Ả Rập)",
    code: "AE",
    locale: "en-US",
    systemLocale: "ar-AE",
    timezone: "Asia/Dubai",
    tzOffset: -240,
    lang: "ar-AE,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  },
};

// ─── Webshare & Free Proxies Loader ──────────────────────────────────────────

const WEBSHARE_PROXIES = [
  "http://eaprqnuf:7j8351yt7wvc@31.59.20.176:6754",
  "http://eaprqnuf:7j8351yt7wvc@31.56.127.193:7684",
  "http://eaprqnuf:7j8351yt7wvc@45.38.107.97:6014",
  "http://eaprqnuf:7j8351yt7wvc@38.154.203.95:5863",
  "http://eaprqnuf:7j8351yt7wvc@198.105.121.200:6462",
  "http://eaprqnuf:7j8351yt7wvc@64.137.96.74:6641",
  "http://eaprqnuf:7j8351yt7wvc@198.23.243.226:6361",
  "http://eaprqnuf:7j8351yt7wvc@38.154.185.97:6370",
  "http://eaprqnuf:7j8351yt7wvc@84.247.60.125:6095",
  "http://eaprqnuf:7j8351yt7wvc@142.111.67.146:5611",
  "http://eaprqnuf:7j8351yt7wvc@191.96.254.138:6185",
];

const ONLINE_PROXIES_FILE = join(__dir, "online_proxies.txt");
let IN_MEMORY_ONLINE_PROXIES = [];

const FREE_PROXY_SOURCES = [
  { name: "ProxyScrape (HTTP)", url: "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all" },
  { name: "TheSpeedX (HTTP)", url: "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt" },
  { name: "Monosans (HTTP)", url: "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt" },
  { name: "RoosterKid (HTTPS)", url: "https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt" },
  { name: "Proxifly (HTTP)", url: "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt" },
  { name: "ShiftyTR (HTTP)", url: "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt" },
];

function formatProxyLine(line) {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;
  if (line.startsWith("http://") || line.startsWith("https://")) return line;
  if (line.startsWith("socks5://") || line.startsWith("socks4://")) return null;
  const parts = line.split(":");
  if (parts.length === 4) {
    const [ip, port, user, pass] = parts;
    return `http://${user}:${pass}@${ip}:${port}`;
  }
  if (parts.length === 2 && !isNaN(parts[1])) {
    const [ip, port] = parts;
    return `http://${ip}:${port}`;
  }
  return null;
}

async function fetchOnlineProxies(saveToFile = true, logCallback = null) {
  const newSet = new Set();
  const notify = (msg, level = "info") => {
    if (logCallback) logCallback(msg, level);
    else log(msg, level);
  };

  notify("🌐 Đang quét & tải proxy tự động từ ProxyScrape và các nguồn miễn phí...", "info");

  await Promise.allSettled(
    FREE_PROXY_SOURCES.map(async (src) => {
      try {
        const res = await fetch(src.url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const text = await res.text();
          const lines = text.split(/\r?\n/);
          let count = 0;
          for (let l of lines) {
            const p = formatProxyLine(l);
            if (p) {
              newSet.add(p);
              count++;
            }
          }
          notify(`✓ ${src.name}: Đã cào được ${chalk.bold(count)} proxies`, "ok");
        } else {
          notify(`✕ ${src.name}: Lỗi HTTP ${res.status}`, "warn");
        }
      } catch (e) {
        notify(`✕ ${src.name}: ${e.message}`, "warn");
      }
    })
  );

  IN_MEMORY_ONLINE_PROXIES = Array.from(newSet);

  if (saveToFile && IN_MEMORY_ONLINE_PROXIES.length > 0) {
    try {
      writeFileSync(ONLINE_PROXIES_FILE, IN_MEMORY_ONLINE_PROXIES.join("\n"));
      notify(`Đã lưu ${chalk.bold(IN_MEMORY_ONLINE_PROXIES.length)} proxies vào online_proxies.txt`, "ok");
    } catch { }
  }

  notify(`Hoàn tất! Tổng cộng thu thập được ${chalk.bold(newSet.size)} Proxy hợp lệ.`, "ok");
  return Array.from(newSet);
}

function loadProxyPool(source = "all") {
  const list = new Set(WEBSHARE_PROXIES);
  if (source === "webshare") return Array.from(list);

  for (const p of IN_MEMORY_ONLINE_PROXIES) list.add(p);

  const possibleFiles = [
    ONLINE_PROXIES_FILE,
    join(__dir, "free-proxy-list.txt"),
    join(__dir, "free-proxy-list (1).txt"),
    join(__dir, "free proxy.txt"),
    join(__dir, "free-proxy.txt"),
    join(__dir, "Webshare 10 proxies.txt"),
    join(__dir, "Webshare 10 proxies (1).txt"),
    join(__dir, "proxies.txt"),
    join(__dir, "proxy.txt"),
    "/storage/emulated/0/Download/free-proxy-list.txt",
    "/storage/emulated/0/Download/free-proxy-list (1).txt",
    "/storage/emulated/0/Download/free proxy.txt",
    "/storage/emulated/0/Download/Webshare 10 proxies.txt",
    "/storage/emulated/0/Download/Webshare 10 proxies (1).txt",
    "/storage/emulated/0/Download/proxies.txt",
  ];
  for (const f of possibleFiles) {
    try {
      if (existsSync(f)) {
        const lines = readFileSync(f, "utf-8").split(/\r?\n/);
        for (const l of lines) {
          const p = formatProxyLine(l);
          if (p) list.add(p);
        }
      }
    } catch { }
  }
  return Array.from(list);
}

// ─── Config (runtime, loaded from file) ──────────────────────────────────────

const DEFAULT_CFG = {
  boostRatio:        2.5,   // ×speed multiplier (1 = normal, 2.5 = 25s→10s, 5 = 25s→5s)
  pollInterval:      60,    // giây giữa mỗi lần quét
  autoAccept:        true,  // tự động nhận quest mới
  autoRegionSweep:   true,  // tự động quét qua mọi khu vực toàn cầu (40 quốc gia) để hốt hết quest
  autoBackToVN:      true,  // tự động chuyển vị trí tài khoản về Việt Nam khi làm xong quest
  useProxyPool:      true,  // tự động dùng Proxy Pool xoay vòng
  proxyPoolSource:   "all", // nguồn proxy: "all" (Webshare + Free Proxy) hoặc "webshare" (11 IPs)
  region:            "US",  // khu vực mặc định (US, JP, KR, DE, GB, VN, CA, SG, FR...)
  proxy:             "",    // Proxy tuỳ chỉnh cố định (để trống sẽ tự động lấy từ Proxy Pool)
};

function loadConfig() {
  try {
    if (existsSync(CFG_FILE)) return { ...DEFAULT_CFG, ...JSON.parse(readFileSync(CFG_FILE, "utf-8")) };
  } catch { }
  return { ...DEFAULT_CFG };
}
function saveConfig(cfg) {
  try { writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2)); } catch { }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE         = "https://discord.com/api/v9";
const DISPLAY_INTERVAL = 500;

const SUPPORTED_TASKS = [
  "WATCH_VIDEO",
  "WATCH_VIDEO_ON_MOBILE",
  "PLAY_ON_DESKTOP",
  "STREAM_ON_DESKTOP",
  "PLAY_ACTIVITY",
];

const DESKTOP_TASKS = new Set([
  "PLAY_ON_DESKTOP",
  "STREAM_ON_DESKTOP",
  "WATCH_VIDEO",
  "WATCH_VIDEO_ON_MOBILE",
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getVNTime(date = new Date()) {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchLatestBuildNumber() {
  const FALLBACK = 595897;
  try {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
    const r  = await fetch("https://discord.com/app", {
      headers: { "User-Agent": ua },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return FALLBACK;
    const html    = await r.text();
    const scripts = [...html.matchAll(/\/assets\/([a-zA-Z0-9_\-\.]+)\.js/g)].map(m => m[1]);
    if (!scripts.length) return FALLBACK;

    // Ưu tiên các file chunk chính (web.*, app.*) chứa build number
    const priority = scripts.filter(s => s.startsWith("web.") || s.startsWith("app."));
    const candidates = [...priority, ...scripts.slice(-10).reverse()];

    for (const h of candidates) {
      try {
        const ar  = await fetch(`https://discord.com/assets/${h}.js`, {
          headers: { "User-Agent": ua },
          signal: AbortSignal.timeout(10_000),
        });
        if (!ar.ok) continue;
        const txt = await ar.text();
        const m   = txt.match(/Build Number:\s*(\d{5,7})/i)
                 || txt.match(/build_number:\"(\d{5,7})\"/i)
                 || txt.match(/buildNumber["'\s:]+["'\s]*(\d{5,7})/i)
                 || txt.match(/"buildNumber",\s*"(\d{5,7})"/);
        if (m) return parseInt(m[1]);
      } catch { }
    }
    return FALLBACK;
  } catch { return FALLBACK; }
}

function makeSuperProperties(buildNumber, region = REGION_PRESETS.US) {
  return Buffer.from(JSON.stringify({
    os: "Windows",
    browser: "Discord Client",
    release_channel: "stable",
    client_version: "1.0.9180",
    os_version: "10.0.26100",
    os_arch: "x64",
    app_arch: "x64",
    system_locale: region.systemLocale || "en-US",
    browser_user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) discord/1.0.9180 Chrome/134.0.6998.35 Electron/34.2.0 Safari/537.36",
    browser_version: "34.2.0",
    client_build_number: buildNumber,
    native_build_number: 595897,
    client_event_source: null,
  })).toString("base64");
}

function _get(d, ...keys) {
  if (!d) return null;
  for (const k of keys) if (k in d) return d[k];
  return null;
}
function _taskConfig(quest) {
  const cfg = quest.config ?? {};
  return _get(cfg, "taskConfig", "task_config", "taskConfigV2", "task_config_v2");
}
function questName(quest) {
  const cfg  = quest.config ?? {};
  const msgs = cfg.messages ?? {};
  const n    = _get(msgs, "questName", "quest_name") ?? _get(msgs, "gameTitle", "game_title");
  if (n) return n.trim();
  return cfg.application?.name ?? `Quest#${quest.id ?? "?"}`;
}
function expiresAt(quest)  { return _get(quest.config ?? {}, "expiresAt", "expires_at"); }
function userStatus(quest) {
  const us = _get(quest, "userStatus", "user_status");
  return (us && typeof us === "object") ? us : {};
}
function isEnrolled(quest)  { return !!_get(userStatus(quest), "enrolledAt",  "enrolled_at"); }
function isCompleted(quest) { return !!_get(userStatus(quest), "completedAt", "completed_at"); }
function isClaimed(quest)   { return !!_get(userStatus(quest), "claimedAt",   "claimed_at"); }
function isExpired(quest) {
  const exp = expiresAt(quest);
  if (!exp) return false;
  try { return new Date(exp) <= new Date(); } catch { return false; }
}
function isCompletable(quest) {
  if (isExpired(quest)) return false;
  const tc = _taskConfig(quest);
  if (!tc?.tasks) return false;
  return SUPPORTED_TASKS.some(t => tc.tasks[t] != null);
}
function taskType(quest) {
  const tc = _taskConfig(quest);
  if (!tc?.tasks) return null;
  return SUPPORTED_TASKS.find(t => tc.tasks[t] != null) ?? null;
}
function hasPlatformSelection(quest) {
  const tc = _taskConfig(quest);
  if (!tc?.tasks) return false;
  const tasks = tc.tasks;
  const hasDesktop = Object.keys(tasks).some(t => DESKTOP_TASKS.has(t));
  const hasOther   = Object.keys(tasks).some(t => !DESKTOP_TASKS.has(t));
  return hasDesktop && hasOther;
}
function getEnrollPlatform(quest) {
  const tt = taskType(quest);
  if (tt && DESKTOP_TASKS.has(tt)) return "desktop";
  return null;
}
function secondsNeeded(quest) {
  const tc = _taskConfig(quest);
  const tt = taskType(quest);
  if (!tc || !tt) return 0;
  return tc.tasks[tt]?.target ?? 0;
}
function secondsDone(quest) {
  const tt = taskType(quest);
  if (!tt) return 0;
  return (userStatus(quest).progress ?? {})[tt]?.value ?? 0;
}
function enrolledAt(quest) { return _get(userStatus(quest), "enrolledAt", "enrolled_at"); }
function formatTime(s) {
  s = Math.floor(s);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${(s % 60).toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, "0")}m`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

// ─── Engine ───────────────────────────────────────────────────────────────────

function getRouteBucket(path) {
  if (path.startsWith("/quests/@me")) return "quests_me";
  if (path.includes("/enroll")) return "quests_enroll";
  if (path.includes("/video-progress")) return "quests_video_progress";
  if (path.includes("/heartbeat")) return "quests_heartbeat";
  if (path.startsWith("/users/@me/settings")) return "users_settings";
  if (path.startsWith("/users/@me")) return "users_me";
  return path.split("?")[0];
}

class QuestEngine {
  constructor(token, cfg) {
    this.token          = token;
    this.cfg            = cfg;
    this._stop          = false;
    this._doneIds       = new Set();
    this._headers       = {};
    this._initDone      = false;
    this._globalRlUntil = 0;
    this._routeRlUntil  = new Map();
    this.region         = REGION_PRESETS[cfg.region?.toUpperCase()] || REGION_PRESETS.US;
    this._proxyPool     = loadProxyPool(cfg.proxyPoolSource ?? "all");
    this._proxyIdx      = 0;
    this._dispatcher    = undefined;
  }

  get _heartbeatMs() { return Math.max(4000, Math.round(20_000 / this.cfg.boostRatio)); }

  _initDispatcher() {
    if (this.cfg.proxy) {
      try { this._dispatcher = new ProxyAgent(this.cfg.proxy); return; } catch { }
    }
    if (this.cfg.useProxyPool && this._proxyPool.length > 0) {
      const p = this._proxyPool[this._proxyIdx];
      try { this._dispatcher = new ProxyAgent(p); return; } catch { }
    }
    this._dispatcher = undefined;
  }

  _rotateProxy(cb = null) {
    if (!this.cfg.useProxyPool || this._proxyPool.length <= 1) return;
    this._proxyIdx = (this._proxyIdx + 1) % this._proxyPool.length;
    const nextProxy = this._proxyPool[this._proxyIdx];
    try {
      this._dispatcher = new ProxyAgent(nextProxy);
      const masked = nextProxy.replace(/:[^:@]+@/, ":***@");
      cb?.("log", { msg: `🔄 Xoay Proxy (#${this._proxyIdx + 1}/${this._proxyPool.length}): ${chalk.cyan(masked)}`, level: "info" });
    } catch { }
  }

  async _init() {
    if (this._initDone) return;
    this.region = REGION_PRESETS[this.cfg.region?.toUpperCase()] || REGION_PRESETS.US;
    this._initDispatcher();
    const bn = await fetchLatestBuildNumber();
    const sp = makeSuperProperties(bn, this.region);
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
               "(KHTML, like Gecko) discord/1.0.9180 Chrome/134.0.6998.35 Electron/34.2.0 Safari/537.36";
    this._headers = {
      "Authorization":      this.token,
      "Content-Type":       "application/json",
      "Accept":             "*/*",
      "Accept-Language":    this.region.lang,
      "User-Agent":         ua,
      "X-Super-Properties": sp,
      "X-Discord-Locale":   this.region.locale,
      "X-Discord-Timezone": this.region.timezone,
      "Origin":             "https://discord.com",
      "Referer":            "https://discord.com/channels/@me",
    };
    this._initDone = true;
  }

  clear() { this.token = ""; this._headers["Authorization"] = ""; }
  stop()  { this._stop = true; }

  async _request(method, path, payload = null, cb = null, maxRetries = 5) {
    const bucket = getRouteBucket(path);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (this._stop) return null;

      // 1. Chờ Global Rate Limit
      const now = Date.now();
      if (now < this._globalRlUntil) {
        const wait = this._globalRlUntil - now;
        cb?.("log", { msg: `[RateLimit Global] Tạm dừng ${(wait / 1000).toFixed(1)}s trước khi tiếp tục...`, level: "warn" });
        await sleep(wait);
      }

      // 2. Chờ Route-specific Rate Limit
      const routeUntil = this._routeRlUntil.get(bucket) ?? 0;
      if (Date.now() < routeUntil) {
        const wait = routeUntil - Date.now();
        await sleep(wait);
      }

      // 3. Giãn cách nhẹ (jitter) để tránh nghẽn khi chạy nhiều quest song song
      await sleep(40 + Math.floor(Math.random() * 50));

      try {
        const r = await fetch(`${API_BASE}${path}`, {
          method,
          headers:    this._headers,
          body:       payload ? JSON.stringify(payload) : undefined,
          dispatcher: this._dispatcher,
          signal:     AbortSignal.timeout(15_000),
        });

        // 4. Xử lý HTTP 429 (Rate Limit)
        if (r.status === 429) {
          let retryAfter = 5;
          let isGlobal = r.headers.get("x-ratelimit-global") === "true";

          try {
            const h = r.headers.get("retry-after") || r.headers.get("x-ratelimit-reset-after");
            if (h) retryAfter = parseFloat(h);
          } catch { }

          try {
            const body = await r.clone().json();
            if (body.retry_after !== undefined) retryAfter = parseFloat(body.retry_after);
            if (body.global) isGlobal = true;
          } catch { }

          const waitMs = Math.ceil(Math.max(1, retryAfter) * 1000) + 600;

          if (isGlobal) {
            this._globalRlUntil = Date.now() + waitMs;
            cb?.("log", { msg: `⚠️ Rate limit TOÀN CỤC – Chờ ${(waitMs / 1000).toFixed(1)}s (lần ${attempt}/${maxRetries})`, level: "warn" });
          } else {
            this._routeRlUntil.set(bucket, Date.now() + waitMs);
            cb?.("log", { msg: `⚠️ Rate limit [${bucket}] – Chờ ${(waitMs / 1000).toFixed(1)}s (lần ${attempt}/${maxRetries})`, level: "warn" });
          }

          // Tự động xoay Proxy IP ngay lập tức để né rate-limit IP
          if (this.cfg.useProxyPool && this._proxyPool.length > 1) {
            this._rotateProxy(cb);
          }

          await sleep(waitMs);
          continue;
        }

        // 5. Kiểm tra trước giới hạn còn lại (X-RateLimit-Remaining)
        const remaining = r.headers.get("x-ratelimit-remaining");
        const resetAfter = r.headers.get("x-ratelimit-reset-after");
        if (remaining === "0" && resetAfter) {
          const waitMs = Math.ceil(parseFloat(resetAfter) * 1000) + 300;
          this._routeRlUntil.set(bucket, Date.now() + waitMs);
        }

        // 6. Xử lý lỗi 5xx Server
        if (r.status >= 500 && r.status < 600) {
          if (this.cfg.useProxyPool && this._proxyPool.length > 1) {
            this._rotateProxy(cb);
          }
          const backoff = Math.min(6000, 1000 * Math.pow(1.5, attempt)) + Math.floor(Math.random() * 500);
          cb?.("log", { msg: `Discord server bận (${r.status}) – thử lại sau ${(backoff / 1000).toFixed(1)}s...`, level: "warn" });
          await sleep(backoff);
          continue;
        }

        return r;
      } catch (e) {
        if (this._stop) return null;
        if (this.cfg.useProxyPool && this._proxyPool.length > 1) {
          this._rotateProxy(cb);
        }
        const backoff = Math.min(6000, 1000 * Math.pow(1.5, attempt)) + Math.floor(Math.random() * 500);
        cb?.("log", { msg: `Lỗi mạng (${e.message}) – thử lại sau ${(backoff / 1000).toFixed(1)}s (lần ${attempt}/${maxRetries})`, level: "warn" });
        await sleep(backoff);
      }
    }
    return null;
  }

  async _get(path, cb = null) {
    return this._request("GET", path, null, cb);
  }

  async _post(path, payload = null, cb = null) {
    return this._request("POST", path, payload, cb);
  }

  async _patch(path, payload = null, cb = null) {
    return this._request("PATCH", path, payload, cb);
  }

  async _postRetry(path, payload, cb, maxRetries = 5) {
    return this._request("POST", path, payload, cb, maxRetries);
  }

  async validateToken() {
    await this._init();
    try { const r = await this._get("/users/@me"); return r?.ok ? r.json() : null; }
    catch { return null; }
  }

  async setRegion(regionCodeOrKey, syncAccount = true, cb = null) {
    await this._init();
    const reg = REGION_PRESETS[regionCodeOrKey?.toUpperCase()] || REGION_PRESETS.US;
    this.region = reg;
    this.cfg.region = reg.code;
    saveConfig(this.cfg);

    const bn = await fetchLatestBuildNumber();
    const sp = makeSuperProperties(bn, reg);
    this._headers["Accept-Language"]    = reg.lang;
    this._headers["X-Discord-Locale"]   = reg.locale;
    this._headers["X-Discord-Timezone"] = reg.timezone;
    this._headers["X-Super-Properties"] = sp;

    if (syncAccount) {
      try {
        const r = await this._patch("/users/@me/settings", {
          locale: reg.locale,
          timezone_offset: reg.tzOffset,
        }, cb);
        if (r?.ok) {
          cb?.("log", { msg: `Đã đổi vị trí tài khoản sang ${chalk.bold(reg.name)} (locale: ${reg.locale})`, level: "ok" });
          return true;
        }
      } catch (e) {
        cb?.("log", { msg: `Lỗi đồng bộ vị trí tài khoản: ${e.message}`, level: "warn" });
      }
    }
    return true;
  }

  async backToVietnam(cb = null) {
    cb?.("log", { msg: `🇻🇳 Đang chuyển vị trí tài khoản về Việt Nam (VN)...`, level: "info" });
    const ok = await this.setRegion("VN", true, cb);
    if (ok) {
      cb?.("log", { msg: `Đã chuyển tài khoản về ${chalk.bold("Việt Nam (VN)")} thành công!`, level: "ok" });
    }
    return ok;
  }

  async multiRegionSweep(cb) {
    const originalRegion = this.region?.code || "US";
    const codes = Object.keys(REGION_PRESETS);
    const summary = [];
    let totalNewEnrolled = 0;

    cb?.("log", { msg: `Bắt đầu quét Quest trên toàn bộ ${codes.length} khu vực...`, level: "info" });

    for (const code of codes) {
      if (this._stop) break;
      const reg = REGION_PRESETS[code];
      cb?.("log", { msg: `─── Đang chuyển sang khu vực: ${reg.name} ───`, level: "info" });
      await this.setRegion(code, true, cb);
      await sleep(1000);

      const quests = await this.fetchQuests(cb);
      const unaccepted = quests.filter(q => !isEnrolled(q) && !isCompleted(q) && isCompletable(q));
      const count = unaccepted.length;

      if (count > 0) {
        cb?.("log", { msg: `Tìm thấy ${chalk.bold(count)} quest mới tại ${reg.name}! Đang nhận...`, level: "ok" });
        for (const q of unaccepted) {
          if (this._stop) break;
          const ok = await this.enroll(q, cb);
          if (ok) totalNewEnrolled++;
          await sleep(600);
        }
      } else {
        cb?.("log", { msg: `Không có quest mới thêm ở ${reg.name}.`, level: "info" });
      }
      summary.push({ region: reg.name, total: quests.length, newCount: count });
    }

    await this.setRegion(originalRegion, true, cb);
    cb?.("log", { msg: `Hoàn tất quét toàn cầu! Đã nhận thêm tổng cộng ${chalk.bold(chalk.green(totalNewEnrolled))} quest mới.`, level: "ok" });
    return { summary, totalNewEnrolled };
  }

  async autoSweepAndAccept(cb) {
    if (!this.cfg.autoRegionSweep) {
      let quests = await this.fetchQuests(cb);
      return this.autoAccept(quests, cb);
    }

    const originalRegion = this.cfg.region || "US";
    const codes = Object.keys(REGION_PRESETS);
    let totalNew = 0;
    cb?.("log", { msg: `🌐 Tự động quét ${codes.length} khu vực toàn cầu để nhận quest mới...`, level: "info" });

    for (const code of codes) {
      if (this._stop) break;
      const reg = REGION_PRESETS[code];
      await this.setRegion(code, true, null);
      await sleep(800);

      const quests = await this.fetchQuests(cb);
      const unaccepted = quests.filter(q => !isEnrolled(q) && !isCompleted(q) && isCompletable(q));
      if (unaccepted.length > 0) {
        cb?.("log", { msg: `Tìm thấy ${chalk.bold(unaccepted.length)} quest tại ${reg.name}! Đang tự động nhận...`, level: "ok" });
        for (const q of unaccepted) {
          if (this._stop) break;
          const ok = await this.enroll(q, cb);
          if (ok) totalNew++;
          await sleep(600);
        }
      }
    }

    await this.setRegion(originalRegion, true, null);
    if (totalNew > 0) {
      cb?.("log", { msg: `Đã tự động nhận thêm ${chalk.bold(chalk.green(totalNew))} quest từ các khu vực!`, level: "ok" });
    }
    await sleep(600);
    return this.fetchQuests(cb);
  }

  async fetchQuests(cb = null) {
    try {
      const r = await this._get("/quests/@me", cb);
      if (r?.ok) {
        const d = await r.json();
        return Array.isArray(d) ? d : (d.quests ?? []);
      }
    } catch { }
    return [];
  }

  async enroll(quest, cb) {
    const name = questName(quest), qid = quest.id;
    const platform = getEnrollPlatform(quest);
    if (hasPlatformSelection(quest)) {
      cb?.("log", { msg: `Quest "${name}" yêu cầu chọn nền tảng → tự động chọn PC/Desktop`, level: "info" });
    }

    const payload = {
      location: 11,
      is_targeted: false,
      metadata_raw: null,
      metadata_sealed: null,
      traffic_metadata_raw:    quest.traffic_metadata_raw    ?? null,
      traffic_metadata_sealed: quest.traffic_metadata_sealed ?? null,
    };
    if (platform) {
      payload.platform = platform;
      payload.device_type = platform;
    }

    const r = await this._post(`/quests/${qid}/enroll`, payload, cb);
    if (r && [200, 201, 204].includes(r.status)) {
      cb?.("log", { msg: `Đã nhận quest: ${name}${platform ? " (PC)" : ""}`, level: "ok" });
      return true;
    }
    cb?.("log", { msg: `Enroll "${name}" thất bại (${r ? r.status : "Mạng"})`, level: "warn" });
    return false;
  }

  async autoAccept(quests, cb) {
    if (!this.cfg.autoAccept) return quests;
    const unaccepted = quests.filter(q => !isEnrolled(q) && !isCompleted(q) && isCompletable(q));
    if (!unaccepted.length) return quests;
    cb?.("log", { msg: `Tìm thấy ${unaccepted.length} quest chưa nhận – tự động nhận...`, level: "info" });
    await Promise.all(unaccepted.map(async (q, i) => {
      if (this._stop) return;
      await sleep(i * 600);
      await this.enroll(q, cb);
    }));
    await sleep(1500);
    return this.fetchQuests(cb);
  }

  getActionable(quests) {
    return quests.filter(q =>
      isEnrolled(q) && !isCompleted(q) && isCompletable(q) && !this._doneIds.has(q.id)
    );
  }

  async _completeVideo(quest, cb) {
    const name   = questName(quest), qid = quest.id;
    const target = secondsNeeded(quest);
    let done     = secondsDone(quest);
    const eaStr  = enrolledAt(quest);
    const enrolledTs  = eaStr ? new Date(eaStr).getTime() / 1000 : Date.now() / 1000;
    const speed       = Math.ceil(7 * this.cfg.boostRatio);
    const maxFuture   = Math.ceil(10 * this.cfg.boostRatio);
    let lastPostTs    = 0;

    cb("quest_start", { name, task: "WATCH_VIDEO", target, done });

    while (done < target && !this._stop) {
      const now  = Date.now() / 1000;
      const diff = (now - enrolledTs) + maxFuture - done;
      const ts   = Math.min(target, done + speed);

      if (diff >= speed && (Date.now() - lastPostTs >= 1200)) {
        lastPostTs = Date.now();
        const r = await this._postRetry(
          `/quests/${qid}/video-progress`,
          { timestamp: Math.min(target, ts + Math.random() * 0.5) },
          cb
        );
        if (r?.ok) {
          const body = await r.json().catch(() => ({}));
          if (body.completed_at) {
            done = target;
            cb("progress", { name, done, target });
            cb("quest_done", { name, quest });
            return;
          }
          done = ts;
          cb("progress", { name, done, target });
        }
      }

      if (ts >= target) break;
      await sleep(DISPLAY_INTERVAL);
    }

    await this._postRetry(`/quests/${qid}/video-progress`, { timestamp: target }, cb);
    cb("quest_done", { name, quest });
  }

  async _completeHeartbeat(quest, cb) {
    const name   = questName(quest), qid = quest.id, tt = taskType(quest);
    const target = secondsNeeded(quest);
    let done     = secondsDone(quest);
    const pid    = Math.floor(Math.random() * 29000) + 1000;

    cb("quest_start", { name, task: tt, target, done });

    while (done < target && !this._stop) {
      const r = await this._postRetry(
        `/quests/${qid}/heartbeat`,
        { stream_key: `call:0:${pid}`, terminal: false },
        cb
      );
      if (r?.ok) {
        const body = await r.json().catch(() => ({}));
        const prog = body.progress ?? {};
        if (tt in prog) done = prog[tt].value ?? done;
        cb("progress", { name, done, target });
        if (body.completed_at || done >= target) break;
      }

      const waitStart = Date.now();
      while (Date.now() - waitStart < this._heartbeatMs && done < target && !this._stop) {
        await sleep(DISPLAY_INTERVAL);
        cb("progress", { name, done, target });
      }
    }

    await this._postRetry(`/quests/${qid}/heartbeat`, { stream_key: `call:0:${pid}`, terminal: true }, cb).catch(() => {});
    cb("quest_done", { name, quest });
  }

  async _completeActivity(quest, cb) {
    const name   = questName(quest), qid = quest.id;
    const target = secondsNeeded(quest);
    let done     = secondsDone(quest);
    const streamKey = "call:0:1";

    cb("quest_start", { name, task: "PLAY_ACTIVITY", target, done });

    while (done < target && !this._stop) {
      const r = await this._postRetry(
        `/quests/${qid}/heartbeat`,
        { stream_key: streamKey, terminal: false },
        cb
      );
      if (r?.ok) {
        const body = await r.json().catch(() => ({}));
        const prog = body.progress ?? {};
        done = prog.PLAY_ACTIVITY?.value ?? done;
        cb("progress", { name, done, target });
        if (body.completed_at || done >= target) break;
      }

      const waitStart = Date.now();
      while (Date.now() - waitStart < this._heartbeatMs && done < target && !this._stop) {
        await sleep(DISPLAY_INTERVAL);
        cb("progress", { name, done, target });
      }
    }

    await this._postRetry(`/quests/${qid}/heartbeat`, { stream_key: streamKey, terminal: true }, cb).catch(() => {});
    cb("quest_done", { name, quest });
  }

  async completeQuest(quest, cb) {
    const tt = taskType(quest), qid = quest.id;
    if (!tt || this._doneIds.has(qid)) return;
    try {
      if      (tt === "WATCH_VIDEO" || tt === "WATCH_VIDEO_ON_MOBILE") await this._completeVideo(quest, cb);
      else if (tt === "PLAY_ON_DESKTOP" || tt === "STREAM_ON_DESKTOP") await this._completeHeartbeat(quest, cb);
      else if (tt === "PLAY_ACTIVITY")                                  await this._completeActivity(quest, cb);
    } finally { this._doneIds.add(qid); }
  }
}

// ─── IO helpers ───────────────────────────────────────────────────────────────

function loadToken() {
  try { if (existsSync(TOKEN_FILE)) { const t = readFileSync(TOKEN_FILE, "utf-8").trim(); if (t) return t; } } catch { }
  return null;
}
function saveToken(token) { try { writeFileSync(TOKEN_FILE, token); } catch { } }
function deleteToken()    { try { if (existsSync(TOKEN_FILE)) unlinkSync(TOKEN_FILE); } catch { } }

async function prompt(question, { hidden = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (hidden) {
    process.stdout.write(question);
    process.stdin.setRawMode?.(true);
    return new Promise(resolve => {
      let buf = "";
      process.stdin.resume();
      process.stdin.setEncoding("utf-8");
      const onData = ch => {
        if (ch === "\n" || ch === "\r") {
          process.stdin.setRawMode?.(false);
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          resolve(buf.trim());
        } else if (ch === "\u0003") { process.exit(); }
        else { buf += ch; process.stdout.write("*"); }
      };
      process.stdin.on("data", onData);
    });
  }
  return new Promise(resolve => { rl.question(question, ans => { rl.close(); resolve(ans.trim()); }); });
}

function getAsciiLogo() {
  const l1 = "   █████╗ ██╗   ██╗████████╗ ██████╗      ██████╗ ██╗   ██╗███████╗███████╗████████╗";
  const l2 = "  ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗    ██╔═══██╗██║   ██║██╔════╝██╔════╝╚══██╔══╝";
  const l3 = "  ███████║██║   ██║   ██║   ██║   ██║    ██║   ██║██║   ██║█████╗  ███████╗   ██║   ";
  const l4 = "  ██╔══██║██║   ██║   ██║   ██║   ██║    ██║▄▄ ██║██║   ██║██╔══╝  ╚════██║   ██║   ";
  const l5 = "  ██║  ██║╚██████╔╝   ██║   ╚██████╔╝    ╚██████╔╝╚██████╔╝███████╗███████║   ██║   ";
  const l6 = "  ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝      ╚══▀▀═╝  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ";
  return [
    chalk.hex("#00F0FF").bold(l1),
    chalk.hex("#38BDF8").bold(l2),
    chalk.hex("#818CF8").bold(l3),
    chalk.hex("#A78BFA").bold(l4),
    chalk.hex("#C084FC").bold(l5),
    chalk.hex("#E879F9").bold(l6),
  ].join("\n");
}

function log(msg, level = "info") {
  const ts = getVNTime();
  const prefix = {
    info:  chalk.hex("#00F0FF").bold(" [INFO] "),
    ok:    chalk.hex("#22C55E").bold(" [  OK] "),
    warn:  chalk.hex("#F59E0B").bold(" [WARN] "),
    error: chalk.hex("#EF4444").bold(" [ ERR] "),
  }[level] ?? ` [${level.toUpperCase()}] `;
  console.log(`${chalk.dim(ts)}${prefix}${msg}`);
}

function progressBar(done, total, width = 14) {
  const pct    = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  const empty  = Math.max(0, width - filled);
  let barColor = chalk.hex("#00F0FF");
  if (pct >= 100) barColor = chalk.hex("#22C55E");
  else if (pct >= 50) barColor = chalk.hex("#F59E0B");

  return { bar: barColor("█".repeat(filled)) + chalk.dim("░".repeat(empty)), pct };
}

function taskLabel(tt) {
  return {
    WATCH_VIDEO:           chalk.hex("#EC4899").bold("🎬 VIDEO    "),
    WATCH_VIDEO_ON_MOBILE: chalk.hex("#F43F5E").bold("📱 VIDEO MB "),
    PLAY_ON_DESKTOP:       chalk.hex("#3B82F6").bold("🎮 DESKTOP  "),
    STREAM_ON_DESKTOP:     chalk.hex("#8B5CF6").bold("📺 STREAM   "),
    PLAY_ACTIVITY:         chalk.hex("#10B981").bold("🎯 ACTIVITY "),
  }[tt] ?? chalk.dim("❓ UNKNOWN  ");
}

// ─── Live Dashboard ───────────────────────────────────────────────────────────

class LiveDashboard {
  constructor(cfg) {
    this.cfg       = cfg;
    this.quests    = [];
    this.logs      = [];
    this._interval = null;
    this.startTime = Date.now();
    this._spinIdx  = 0;
  }

  addQuest(name, task, done, target) {
    this.quests.push({ name, task, done, target, status: "running" });
    return this.quests.length - 1;
  }

  update(idx, done, target) {
    if (this.quests[idx]) {
      this.quests[idx].done = done;
      this.quests[idx].target = target;
    }
  }

  markDone(idx) {
    if (this.quests[idx]) {
      this.quests[idx].status = "done";
      this.quests[idx].done = this.quests[idx].target;
    }
  }

  addLog(msg, level = "info") {
    const ts = getVNTime();
    this.logs.push({ ts, msg, level });
    if (this.logs.length > 5) this.logs.shift();
  }

  render() {
    const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const spin = spinners[this._spinIdx++ % spinners.length];
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const running = this.quests.filter(q => q.status === "running").length;
    const done    = this.quests.filter(q => q.status === "done").length;
    const pool    = loadProxyPool(this.cfg.proxyPoolSource ?? "all");

    let proxyStr = chalk.dim("(Tắt)");
    if (this.cfg.proxy) proxyStr = chalk.hex("#06B6D4")("Custom");
    else if (this.cfg.useProxyPool) {
      const srcName = this.cfg.proxyPoolSource === "webshare" ? `Webshare(${pool.length})` : `Pool(${pool.length})`;
      proxyStr = chalk.hex("#10B981")(srcName);
    }

    const lines = [];
    lines.push(chalk.hex("#6366F1")("╭─────────────────────── ✦ TIẾN TRÌNH AUTO QUEST ✦ ─────────────────────────╮"));
    lines.push(
      chalk.hex("#6366F1")("│") +
      `  ${chalk.hex("#00F0FF").bold(spin)} ` +
      chalk.hex("#06B6D4")(`🕒 ${getVNTime()}`) + "  ·  " +
      chalk.hex("#F59E0B").bold(`▶ Chạy: ${running}`) + "  ·  " +
      chalk.hex("#22C55E").bold(`✓ Xong: ${done}`) + "  ·  " +
      chalk.hex("#94A3B8")(`⏱️ ${formatTime(elapsed)}`) + "  ·  " +
      chalk.hex("#EC4899")(`⚡ ×${this.cfg.boostRatio}`) + "  ·  " +
      chalk.hex("#06B6D4")(`🔌 Proxy: ${proxyStr}`)
    );
    lines.push(chalk.hex("#6366F1")("├─────────────────────────────────────────────────────────────────────────────┤"));

    for (let i = 0; i < this.quests.length; i++) {
      const q = this.quests[i];
      const { bar, pct } = progressBar(q.done, q.target, 12);
      const remain = q.target > 0 ? formatTime(Math.max(0, q.target - q.done)) : "0s";
      const nameShort = q.name.length > 20 ? q.name.slice(0, 18) + "…" : q.name.padEnd(20);
      const badge = taskLabel(q.task);

      if (q.status === "done") {
        const { bar: dBar } = progressBar(q.target, q.target, 12);
        lines.push(`  ${chalk.hex("#22C55E").bold("✓")} ${badge} ${chalk.white.bold(nameShort)} [${dBar}] ${chalk.hex("#22C55E").bold("100%")}  ${chalk.hex("#22C55E").bold("HOÀN THÀNH")}`);
      } else {
        lines.push(`  ${chalk.hex("#F59E0B").bold("▶")} ${badge} ${chalk.white.bold(nameShort)} [${bar}] ${chalk.hex("#00F0FF").bold(pct.toFixed(1).padStart(5) + "%")} ${chalk.dim(q.done.toFixed(0) + "/" + q.target + "s")} ${chalk.hex("#EC4899")("~" + remain)}`);
      }
    }

    if (this.logs.length) {
      lines.push(chalk.hex("#6366F1")("├────────────────────────────── 📜 NHẬT KÝ LIVE ──────────────────────────────┤"));
      for (const e of this.logs) {
        const p = {
          info:  chalk.hex("#00F0FF")("[INFO]"),
          ok:    chalk.hex("#22C55E")("[  OK]"),
          warn:  chalk.hex("#F59E0B")("[WARN]"),
          error: chalk.hex("#EF4444")("[ ERR]"),
        }[e.level] ?? `[${e.level}]`;
        lines.push(`  ${chalk.dim(e.ts)} ${p} ${e.msg}`);
      }
    }

    lines.push(chalk.hex("#6366F1")("╰─────────────────────────────────────────────────────────────────────────────╯"));
    lines.push(chalk.dim("  👉 Nhấn Ctrl+C để tạm dừng và quay lại menu"));

    console.clear();
    console.log(lines.join("\n"));
  }

  start() {
    process.stdout.write("\u001b[?25l");
    this._interval = setInterval(() => this.render(), DISPLAY_INTERVAL);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    process.stdout.write("\u001b[?25h");
  }
}

// ─── Modes ────────────────────────────────────────────────────────────────────

async function checkMode(engine) {
  console.log("\n" + chalk.hex("#6366F1")("╭─────────────────────── 🔍 DANH SÁCH NHIỆM VỤ ────────────────────────╮"));
  log("Đang tải danh sách quest từ Discord...", "info");
  const quests = await engine.fetchQuests();
  if (!quests.length) { log("Không có quest nào hiện tại.", "info"); return; }

  const enrolled = quests.filter(q => isEnrolled(q)).length;
  const done = quests.filter(q => isCompleted(q)).length;
  const completable = quests.filter(q => isCompletable(q)).length;

  console.log(
    `  ${chalk.hex("#00F0FF").bold(`Tổng: ${quests.length}`)}  │  ` +
    `${chalk.hex("#F59E0B").bold(`▶ Đang chạy: ${enrolled}`)}  │  ` +
    `${chalk.hex("#22C55E").bold(`✓ Đã xong: ${done}`)}  │  ` +
    `${chalk.hex("#EC4899").bold(`🎁 Có thể làm: ${completable}`)}`
  );
  console.log(chalk.hex("#6366F1")("├─────────────────────────────────────────────────────────────────────────────┤"));

  for (const q of quests) {
    const name   = questName(q), tt = taskType(q) ?? "UNKNOWN";
    const exp    = expiresAt(q)?.slice(0, 10) || "?";
    const target = secondsNeeded(q), done = secondsDone(q);
    const badge  = taskLabel(tt);
    let icon, extra;

    if (isCompleted(q)) {
      const claimStatus = isClaimed(q) ? chalk.hex("#22C55E")(" [Đã nhận thưởng]") : chalk.hex("#F59E0B")(" [Chưa nhận quà]");
      icon = chalk.hex("#22C55E").bold("✅ [DONE   ]"); extra = chalk.hex("#22C55E")(`${done.toFixed(0)}/${target}s`) + claimStatus;
    } else if (isExpired(q)) {
      icon = chalk.dim("⏰ [EXPIRED]"); extra = chalk.dim(`hết hạn: ${exp}`);
    } else if (isEnrolled(q)) {
      const { bar, pct } = progressBar(done, target, 12);
      icon = chalk.hex("#F59E0B").bold("▶ [RUNNING]"); extra = `[${bar}] ${chalk.hex("#00F0FF")(pct.toFixed(1) + "%")}  ${done.toFixed(0)}/${target}s`;
    } else if (isCompletable(q)) {
      icon = chalk.hex("#00F0FF").bold("🆕 [NEW    ]"); extra = chalk.hex("#EC4899")(`mục tiêu: ${target}s`) + chalk.dim(`  (hết: ${exp})`);
    } else {
      icon = chalk.dim("❓ [N/A    ]"); extra = chalk.dim(`hết: ${exp}`);
    }
    console.log(`  ${icon} ${badge} ${chalk.white.bold(name.padEnd(24))} ${extra}`);
  }
  console.log(chalk.hex("#6366F1")("╰─────────────────────────────────────────────────────────────────────────────╯"));
}

async function runBot(token, cfg) {
  let _stop = false;
  const prevSigint = process.listeners("SIGINT").slice();
  process.removeAllListeners("SIGINT");

  const engine = new QuestEngine(token, cfg);
  await engine._init();

  const user = await engine.validateToken();
  if (!user) { log("Token không hợp lệ hoặc đã hết hạn!", "error"); return; }

  const username = user.global_name ?? user.username ?? "?";
  const regName  = engine.region?.name ?? "Mặc định (US)";
  const pool = loadProxyPool(cfg.proxyPoolSource ?? "all");
  let proxyStatus = chalk.dim("(Không dùng)");
  if (cfg.proxy) proxyStatus = chalk.cyan(`Cố định (${cfg.proxy})`);
  else if (cfg.useProxyPool) {
    const srcName = cfg.proxyPoolSource === "webshare" ? "Webshare" : "Webshare + Free";
    proxyStatus = chalk.green(`Proxy Pool (${pool.length} IPs - ${srcName} - Auto Rotate)`);
  }

  console.log("");
  log(`Tài khoản: ${chalk.bold(chalk.green(username))}  ${chalk.dim("(ID: " + user.id + ")")}`, "ok");
  log(
    `Vùng gốc: ${chalk.cyan(regName)}  |  ` +
    `Auto-sweep: ${cfg.autoRegionSweep ? chalk.green(`BẬT (${Object.keys(REGION_PRESETS).length} vùng)`) : chalk.red("TẮT")}  |  ` +
    `Auto-back VN: ${cfg.autoBackToVN ? chalk.green("BẬT") : chalk.red("TẮT")}  |  ` +
    `Boost: ${chalk.yellow("×" + cfg.boostRatio)}  |  ` +
    `Poll: ${chalk.yellow(cfg.pollInterval + "s")}  |  ` +
    `Auto-accept: ${cfg.autoAccept ? chalk.green("BẬT") : chalk.red("TẮT")}`,
    "info"
  );
  log(`Proxy: ${proxyStatus}`, "info");

  const stopHandler = () => { _stop = true; engine.stop(); };
  process.on("SIGINT", stopHandler);

  let cycle = 0;
  while (!_stop) {
    cycle++;
    console.log(chalk.dim("─".repeat(62)));
    log(`Quét lần #${cycle}...`, "info");

    const simpleCb = (ev, kw = {}) => { if (ev === "log") log(kw.msg ?? "", kw.level ?? "info"); };
    let quests = await engine.autoSweepAndAccept(simpleCb);
    if (_stop) break;

    if (!quests.length) {
      log("Không có quest nào hiện tại.", "info");
    } else {
      log(
        `Tổng: ${quests.length}  |  ` +
        `Enrolled: ${chalk.yellow(quests.filter(q => isEnrolled(q)).length)}  |  ` +
        `Done: ${chalk.green(quests.filter(q => isCompleted(q)).length)}  |  ` +
        `Có thể làm: ${chalk.cyan(quests.filter(q => isCompletable(q)).length)}`,
        "info"
      );

      const actionable = engine.getActionable(quests);
      if (actionable.length) {
        log(`Bắt đầu ${chalk.bold(actionable.length)} quest song song  (boost ×${cfg.boostRatio})`, "info");
        console.log("");

        const dash        = new LiveDashboard(cfg);
        const questIdxMap = new Map();
        for (const q of actionable)
          questIdxMap.set(q.id, dash.addQuest(questName(q), taskType(q) ?? "UNKNOWN", secondsDone(q), secondsNeeded(q)));

        dash.render();
        dash.start();

        await Promise.allSettled(
          actionable.map(q => {
            const idx = questIdxMap.get(q.id);
            return engine.completeQuest(q, (event, kw = {}) => {
              if (_stop) return;
              if      (event === "progress")   dash.update(idx, kw.done ?? 0, kw.target ?? 0);
              else if (event === "quest_done") { dash.markDone(idx); dash.addLog(`Hoàn thành: ${kw.name}`, "ok"); }
              else if (event === "log")        dash.addLog(kw.msg ?? "", kw.level ?? "info");
            });
          })
        );

        dash.stop();
        dash.render();
        const doneCount = dash.quests.filter(q => q.status === "done").length;
        log(`Hoàn thành ${chalk.green(doneCount)}/${actionable.length} quest`, "ok");

        const after = await engine.fetchQuests();
        const still = after.filter(q => isCompletable(q) && isEnrolled(q) && !isCompleted(q));
        if (!still.length && !_stop) {
          console.log(chalk.dim("═".repeat(62)));
          log("Tất cả quest đã xong!", "ok");
          console.log(chalk.dim("═".repeat(62)));

          if (cfg.autoBackToVN) {
            await engine.backToVietnam(simpleCb);
          }
          break;
        }
      } else {
        log("Không có quest nào cần chạy lúc này.", "info");
        const completedCount = quests.filter(q => isCompleted(q)).length;
        if (completedCount > 0 && cfg.autoBackToVN && engine.region?.code !== "VN") {
          await engine.backToVietnam(simpleCb);
        }
      }
    }

    if (_stop) break;
    log(`Chờ ${cfg.pollInterval}s... (Ctrl+C để dừng)`, "info");
    const ws = Date.now();
    while (Date.now() - ws < cfg.pollInterval * 1000 && !_stop) await sleep(200);
  }

  log(_stop ? "Đã dừng – quay lại menu." : "Hoàn tất.", "info");
  process.removeListener("SIGINT", stopHandler);
  for (const fn of prevSigint) process.on("SIGINT", fn);
}

// ─── Menus ────────────────────────────────────────────────────────────────────

async function printHeader(subtitle = "", cfg = null) {
  console.clear();
  const timeStr = getVNTime();

  console.log(getAsciiLogo());

  console.log(chalk.hex("#6366F1")("  " + "─".repeat(78)));
  console.log(
    chalk.hex("#00F0FF").bold("  ⚡ AUTO QUEST v8.0") +
    chalk.dim("  │  ") +
    chalk.hex("#06B6D4")(`🕒 ${timeStr} (Giờ VN)`) +
    chalk.dim("  │  ") +
    chalk.hex("#22C55E")("● ONLINE")
  );
  console.log(chalk.hex("#6366F1")("  " + "─".repeat(78)));
  if (subtitle) {
    console.log(chalk.hex("#EC4899").bold("  ◈ ") + chalk.hex("#FBBF24").bold(subtitle));
    console.log("");
  } else {
    console.log("");
  }
}

function menuChoice(items) {
  items.forEach((it, i) => {
    const num  = chalk.hex("#00F0FF").bold(` [${i + 1}] `);
    const hint = it.hint ? chalk.hex("#94A3B8")(`  ─── ${it.hint}`) : "";
    console.log(`  ${num} ${it.label}${hint}`);
  });
  console.log("");
}

async function tokenMenu(cfg = null) {
  while (true) {
    await printHeader("🔑 Quản Lý Discord Token", cfg);
    const saved = loadToken();

    if (saved) {
      const masked = saved.slice(0, 12) + "·".repeat(8) + saved.slice(-6);
      console.log(chalk.hex("#6366F1")("  ╭─────────────────── ✦ TOKEN ĐANG LƯU HIỆN TẠI ✦ ──────────────────╮"));
      console.log(chalk.hex("#6366F1")("  │") + `  🔑 Token: ` + chalk.hex("#F59E0B").bold(masked) + chalk.hex("#22C55E").bold("  [HỢP LỆ]"));
      console.log(chalk.hex("#6366F1")("  ╰──────────────────────────────────────────────────────────────────╯"));
      console.log("");
      menuChoice([
        { label: chalk.hex("#22C55E").bold("Dùng token hiện tại này"), hint: "tiếp tục vào Menu chính" },
        { label: chalk.hex("#00F0FF").bold("Nhập token mới thay thế"), hint: "dán token tài khoản khác" },
        { label: chalk.hex("#EF4444").bold("Xoá token đã lưu"),        hint: "xóa vĩnh viễn tệp .token" },
        { label: "← Quay lại Menu chính" },
      ]);
      const ch = await prompt(chalk.dim("  👉 Chọn: "));
      if (ch === "1") return saved;
      if (ch === "2") break;
      if (ch === "3") { deleteToken(); log("Đã xoá token thành công.", "ok"); await sleep(1000); return null; }
      if (ch === "4") return null;
    } else {
      console.log(chalk.dim("  Chưa có token nào được lưu trong hệ thống."));
      console.log("");
      menuChoice([
        { label: chalk.hex("#00F0FF").bold("Nhập Discord Token mới"), hint: "dán token để bắt đầu" },
        { label: "← Quay lại" },
      ]);
      const ch = await prompt(chalk.dim("  👉 Chọn: "));
      if (ch === "2" || ch === "") return null;
      break;
    }
  }

  console.log("");
  console.log(chalk.hex("#00F0FF")("  Dán Discord Token của bạn vào đây (Token sẽ được ẩn bảo mật):"));
  const token = await prompt(chalk.hex("#F59E0B")("  🔑 Token: "), { hidden: true });
  if (!token) { log("Không nhập token – đã huỷ tác vụ.", "warn"); await sleep(800); return null; }
  saveToken(token);
  log("Đã lưu Discord Token mới thành công!", "ok");
  await sleep(800);
  return token;
}

async function proxyMenu(cfg) {
  while (true) {
    const src = cfg.proxyPoolSource ?? "all";
    const pool = loadProxyPool(src);
    const webshareList = loadProxyPool("webshare");
    await printHeader("🔌 Quản Lý Proxy Pool & Rate Limit", cfg);

    let currentStatus = chalk.hex("#EF4444")("Đang tắt (Dùng mạng gốc)");
    if (cfg.proxy) {
      currentStatus = chalk.hex("#06B6D4")(`Cố định (${cfg.proxy})`);
    } else if (cfg.useProxyPool) {
      const modeLabel = src === "webshare" ? "Webshare (11 IPs)" : `Toàn bộ (${pool.length} IPs - Webshare + Free + ProxyScrape)`;
      currentStatus = chalk.hex("#22C55E")(`BẬT – Tự động xoay [${modeLabel}]`);
    }

    console.log(chalk.hex("#6366F1")("  ╭─────────────────── ✦ TRẠNG THÁI PROXY ✦ ────────────────────╮"));
    console.log(chalk.hex("#6366F1")("  │") + `  Trạng thái : ` + currentStatus);
    console.log(chalk.hex("#6366F1")("  │") + `  Nguồn Pool : ` + (src === "webshare" ? chalk.hex("#F59E0B").bold("Chỉ Webshare (11 IPs)") : chalk.hex("#00F0FF").bold(`Webshare + Free + ProxyScrape (${pool.length} IPs)`)));
    console.log(chalk.hex("#6366F1")("  ╰──────────────────────────────────────────────────────────────────╯"));
    console.log("");

    menuChoice([
      { label: `Bật/Tắt Proxy Pool (Tự động xoay)`,           hint: `hiện: ${cfg.useProxyPool && !cfg.proxy ? "BẬT" : "TẮT"}` },
      { label: chalk.hex("#22C55E").bold("🌐 Tự động quét & Tải Proxy Online mới (ProxyScrape + Free)"), hint: "cào 4000+ proxy tươi sống" },
      { label: `Chuyển nguồn Proxy Pool (Webshare/All)`,      hint: `hiện: ${src === "all" ? `Toàn bộ (${pool.length} IPs)` : "Webshare (11 IPs)"}` },
      { label: chalk.hex("#00F0FF").bold("Chọn 1 Proxy cụ thể từ Webshare"), hint: `gán cố định 1 IP tốc độ cao` },
      { label: `Nhập Proxy URL riêng thủ công`,                hint: `http://user:pass@ip:port` },
      { label: `📋 Xem danh sách Proxy trong Pool hiện tại`,   hint: `hiện có ${pool.length} IPs` },
      { label: chalk.hex("#EF4444").bold("✕  Tắt toàn bộ Proxy"),               hint: `kết nối mạng trực tiếp` },
      { label: "← Quay lại Menu chính" },
    ]);

    const ch = await prompt(chalk.dim("  👉 Chọn: "));

    if (ch === "1") {
      cfg.useProxyPool = !cfg.useProxyPool;
      cfg.proxy = "";
      saveConfig(cfg);
      log(`Proxy Pool: ${cfg.useProxyPool ? "BẬT" : "TẮT"}`, "ok");
    } else if (ch === "2") {
      console.log("");
      await fetchOnlineProxies(true);
      cfg.useProxyPool = true;
      cfg.proxy = "";
      cfg.proxyPoolSource = "all";
      saveConfig(cfg);
      const newPool = loadProxyPool("all");
      log(`Đã cập nhật Pool thành công: Hiện có ${chalk.bold(newPool.length)} Proxy khả dụng!`, "ok");
      console.log("");
      await prompt(chalk.dim("  [Nhấn Enter để tiếp tục] "));
    } else if (ch === "3") {
      cfg.proxyPoolSource = (src === "all") ? "webshare" : "all";
      cfg.proxy = "";
      saveConfig(cfg);
      const newPool = loadProxyPool(cfg.proxyPoolSource);
      log(`Đã đổi nguồn Proxy: ${cfg.proxyPoolSource === "webshare" ? "Chỉ Webshare (11 IPs)" : `Webshare + Free (${newPool.length} IPs)`}`, "ok");
    } else if (ch === "4") {
      await printHeader("📋 Danh Sách Webshare Proxies", cfg);
      webshareList.forEach((p, i) => {
        const masked = p.replace(/:[^:@]+@/, ":***@");
        console.log(chalk.hex("#00F0FF")(`  [${i + 1}] `) + chalk.white(masked));
      });
      console.log(chalk.dim("\n  [0] Quay lại"));
      const pick = await prompt(chalk.dim("\n  👉 Chọn IP [1-" + webshareList.length + "]: "));
      const idx = parseInt(pick) - 1;
      if (idx >= 0 && idx < webshareList.length) {
        cfg.proxy = webshareList[idx];
        cfg.useProxyPool = false;
        saveConfig(cfg);
        log(`Đã gán Proxy cố định: ${cfg.proxy}`, "ok");
      }
    } else if (ch === "5") {
      console.log("");
      console.log(chalk.dim("  Nhập URL Proxy (ví dụ: http://user:pass@ip:port hoặc http://ip:port):"));
      const p = await prompt(chalk.hex("#00F0FF")("  Proxy URL: "));
      if (p.trim()) {
        cfg.proxy = p.trim();
        cfg.useProxyPool = false;
        saveConfig(cfg);
        log(`Đã đặt Proxy: ${cfg.proxy}`, "ok");
      }
    } else if (ch === "6") {
      const fullList = loadProxyPool(src);
      await printHeader(`📋 Danh Sách Proxy Trong Pool (${fullList.length} IPs)`, cfg);
      const page = fullList.slice(0, 30);
      page.forEach((p, i) => {
        const masked = p.replace(/:[^:@]+@/, ":***@");
        console.log(chalk.hex("#00F0FF")(`  [${i + 1}] `) + chalk.white(masked));
      });
      if (fullList.length > 30) {
        console.log(chalk.dim(`  ... và ${fullList.length - 30} proxy khác.`));
      }
      console.log("");
      await prompt(chalk.dim("  [Nhấn Enter để tiếp tục] "));
    } else if (ch === "7") {
      cfg.proxy = "";
      cfg.useProxyPool = false;
      saveConfig(cfg);
      log("Đã tắt toàn bộ Proxy.", "ok");
    } else {
      saveConfig(cfg);
      return cfg;
    }
    await sleep(600);
  }
}

async function locationMenu(token, cfg) {
  const engine = new QuestEngine(token, cfg);
  await engine._init();

  const totalCountries = Object.keys(REGION_PRESETS).length;

  async function applyAndCheckRegion(code) {
    const reg = REGION_PRESETS[code];
    if (!reg) {
      log(`Mã quốc gia "${code}" không hợp lệ!`, "warn");
      await sleep(1000);
      return;
    }
    await engine.setRegion(code, true, (ev, kw = {}) => {
      if (ev === "log") log(kw.msg ?? "", kw.level ?? "info");
    });
    cfg.region = code;
    saveConfig(cfg);
    log(`Đã lưu khu vực mặc định: ${reg.name}`, "ok");

    log("Đang kiểm tra quest tại khu vực mới...", "info");
    const quests = await engine.fetchQuests();
    const unaccepted = quests.filter(q => !isEnrolled(q) && !isCompleted(q) && isCompletable(q));
    if (unaccepted.length) {
      log(`Tìm thấy ${chalk.bold(unaccepted.length)} quest mới tại ${reg.name}!`, "ok");
      if (cfg.autoAccept) {
        await engine.autoAccept(quests, (ev, kw = {}) => {
          if (ev === "log") log(kw.msg ?? "", kw.level ?? "info");
        });
      }
    } else {
      log(`Không có quest mới thêm tại ${reg.name}.`, "info");
    }
    console.log("");
    await prompt(chalk.dim("  [Nhấn Enter để tiếp tục] "));
  }

  while (true) {
    await printHeader("🌐 Đổi Địa Điểm & Quét Quest Toàn Cầu", cfg);
    const currentReg = REGION_PRESETS[cfg.region?.toUpperCase()] || REGION_PRESETS.US;
    const pool = loadProxyPool(cfg.proxyPoolSource ?? "all");
    let proxyText = chalk.dim("(Tắt)");
    if (cfg.proxy) proxyText = chalk.hex("#06B6D4")(cfg.proxy);
    else if (cfg.useProxyPool) {
      const srcName = cfg.proxyPoolSource === "webshare" ? "Webshare" : "Webshare + Free";
      proxyText = chalk.hex("#10B981")(`Proxy Pool (${pool.length} IPs - ${srcName})`);
    }

    console.log(chalk.hex("#6366F1")("  ╭─────────────────── ✦ VỊ TRÍ TÀI KHOẢN HIỆN TẠI ✦ ─────────────────╮"));
    console.log(chalk.hex("#6366F1")("  │") + `  📍 Khu vực : ` + chalk.hex("#22C55E").bold(currentReg.name) + chalk.hex("#00F0FF").bold(" [ĐANG CHỌN]"));
    console.log(chalk.hex("#6366F1")("  │") + `  🔤 Locale  : ` + chalk.hex("#F59E0B").bold(currentReg.locale) + chalk.dim(`  │ Timezone: ${currentReg.timezone}`));
    console.log(chalk.hex("#6366F1")("  │") + `  🔌 Proxy   : ` + proxyText);
    console.log(chalk.hex("#6366F1")("  ╰──────────────────────────────────────────────────────────────────╯"));
    console.log("");

    menuChoice([
      { label: chalk.hex("#22C55E").bold(`🚀 Quét & Nhận Quest TẤT CẢ ${totalCountries} quốc gia (Multi-Region Sweep)`), hint: `Tự động đổi qua ${totalCountries} quốc gia hốt sạch quest` },
      { label: chalk.hex("#F59E0B").bold("🇻🇳 Chọn Việt Nam (Vietnam - VN)"), hint: "Trở về máy chủ Việt Nam" },
      { label: "🇺🇸 Chọn Hoa Kỳ (United States - US)",   hint: "Nhiều quest nhất thế giới" },
      { label: "🇯🇵 Chọn Nhật Bản (Japan - JP)",          hint: "Quest anime / game Nhật" },
      { label: "🇰🇷 Chọn Hàn Quốc (South Korea - KR)",    hint: "Quest game Hàn Quốc" },
      { label: "🇨🇦 Chọn Canada (Canada - CA)",           hint: "Server Bắc Mỹ" },
      { label: "🇩🇪 Chọn Đức / Châu Âu (Germany - DE)",   hint: "Quest server Châu Âu" },
      { label: "🇬🇧 Chọn Vương Quốc Anh (UK - GB)",       hint: "Server Châu Âu / UK" },
      { label: "🇸🇬 Chọn Singapore (Singapore - SG)",     hint: "Server Đông Nam Á" },
      { label: "🇧🇷 Chọn Brazil (Brazil - BR)",           hint: "Server Nam Mỹ" },
      { label: chalk.hex("#00F0FF").bold(`📑 Xem danh sách đầy đủ tất cả ${totalCountries} quốc gia (theo Châu Lục)`), hint: "Mở menu chọn bất kỳ nước nào" },
      { label: chalk.hex("#EC4899").bold("🔍 Nhập mã quốc gia tuỳ chọn (VD: TH, ID, PH, AU, FR, TR, RU...)"), hint: "Chuyển nhanh theo mã 2 ký tự" },
      { label: "🔌 Quản lý Proxy & Nguồn Pool",          hint: `chọn Webshare hoặc Free Proxy Pool` },
      { label: "← Quay lại Menu chính" },
    ]);

    const input = (await prompt(chalk.dim(`  👉 Chọn [1-14 hoặc nhập mã QG (VD: AU, FR, TH...)]: `))).trim();
    const upperInput = input.toUpperCase();

    // Nếu người dùng nhập trực tiếp mã quốc gia (VD: AU, TH, FR, RU, JP, VN...)
    if (REGION_PRESETS[upperInput]) {
      console.log("");
      await applyAndCheckRegion(upperInput);
      continue;
    }

    if (input === "1") {
      console.log("");
      await engine.multiRegionSweep((ev, kw = {}) => {
        if (ev === "log") log(kw.msg ?? "", kw.level ?? "info");
      });
      console.log("");
      await prompt(chalk.dim("  [Nhấn Enter để tiếp tục] "));

    } else if (["2","3","4","5","6","7","8","9","10"].includes(input)) {
      const quickMap = {
        "2": "VN", "3": "US", "4": "JP", "5": "KR", "6": "CA",
        "7": "DE", "8": "GB", "9": "SG", "10": "BR",
      };
      console.log("");
      await applyAndCheckRegion(quickMap[input]);

    } else if (input === "11") {
      // Menu hiển thị đầy đủ 40 quốc gia phân loại theo Châu Lục
      await printHeader(`📑 Toàn Bộ ${totalCountries} Quốc Gia Hỗ Trợ Quest`, cfg);
      
      console.log(chalk.hex("#EC4899").bold("  🌎 BẮC & NAM MỸ (Americas):"));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[US]") + " 🇺🇸 Hoa Kỳ",
        chalk.hex("#00F0FF").bold("[CA]") + " 🇨🇦 Canada",
        chalk.hex("#00F0FF").bold("[MX]") + " 🇲🇽 Mexico",
        chalk.hex("#00F0FF").bold("[BR]") + " 🇧🇷 Brazil",
        chalk.hex("#00F0FF").bold("[AR]") + " 🇦🇷 Argentina",
        chalk.hex("#00F0FF").bold("[CL]") + " 🇨🇱 Chile",
        chalk.hex("#00F0FF").bold("[CO]") + " 🇨🇴 Colombia",
      ].join("   "));
      console.log("");

      console.log(chalk.hex("#F59E0B").bold("  🌏 CHÂU Á & THÁI BÌNH DƯƠNG (Asia-Pacific):"));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[VN]") + " 🇻🇳 Việt Nam",
        chalk.hex("#00F0FF").bold("[JP]") + " 🇯🇵 Nhật Bản",
        chalk.hex("#00F0FF").bold("[KR]") + " 🇰🇷 Hàn Quốc",
        chalk.hex("#00F0FF").bold("[SG]") + " 🇸🇬 Singapore",
        chalk.hex("#00F0FF").bold("[TW]") + " 🇹🇼 Đài Loan",
      ].join("   "));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[HK]") + " 🇭🇰 Hồng Kông",
        chalk.hex("#00F0FF").bold("[TH]") + " 🇹🇭 Thái Lan",
        chalk.hex("#00F0FF").bold("[ID]") + " 🇮🇩 Indonesia",
        chalk.hex("#00F0FF").bold("[PH]") + " 🇵🇭 Philippines",
        chalk.hex("#00F0FF").bold("[MY]") + " 🇲🇾 Malaysia",
      ].join("   "));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[IN]") + " 🇮🇳 Ấn Độ",
        chalk.hex("#00F0FF").bold("[AU]") + " 🇦🇺 Úc",
        chalk.hex("#00F0FF").bold("[NZ]") + " 🇳🇿 New Zealand",
      ].join("   "));
      console.log("");

      console.log(chalk.hex("#10B981").bold("  🌍 CHÂU ÂU (Europe):"));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[GB]") + " 🇬🇧 Anh",
        chalk.hex("#00F0FF").bold("[DE]") + " 🇩🇪 Đức",
        chalk.hex("#00F0FF").bold("[FR]") + " 🇫🇷 Pháp",
        chalk.hex("#00F0FF").bold("[ES]") + " 🇪🇸 Tây Ban Nha",
        chalk.hex("#00F0FF").bold("[IT]") + " 🇮🇹 Ý",
        chalk.hex("#00F0FF").bold("[NL]") + " 🇳🇱 Hà Lan",
      ].join("   "));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[PL]") + " 🇵🇱 Ba Lan",
        chalk.hex("#00F0FF").bold("[SE]") + " 🇸🇪 Thụy Điển",
        chalk.hex("#00F0FF").bold("[NO]") + " 🇳🇴 Na Uy",
        chalk.hex("#00F0FF").bold("[DK]") + " 🇩🇰 Đan Mạch",
        chalk.hex("#00F0FF").bold("[FI]") + " 🇫🇮 Phần Lan",
        chalk.hex("#00F0FF").bold("[TR]") + " 🇹🇷 Thổ Nhĩ Kỳ",
      ].join("   "));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[RU]") + " 🇷🇺 Nga",
        chalk.hex("#00F0FF").bold("[UA]") + " 🇺🇦 Ukraine",
        chalk.hex("#00F0FF").bold("[CZ]") + " 🇨🇿 Séc",
        chalk.hex("#00F0FF").bold("[RO]") + " 🇷🇴 Romania",
        chalk.hex("#00F0FF").bold("[GR]") + " 🇬🇷 Hy Lạp",
        chalk.hex("#00F0FF").bold("[HU]") + " 🇭🇺 Hungary",
      ].join("   "));
      console.log("");

      console.log(chalk.hex("#8B5CF6").bold("  🕌 TRUNG ĐÔNG (Middle East):"));
      console.log("    " + [
        chalk.hex("#00F0FF").bold("[SA]") + " 🇸🇦 Ả Rập Xê Út",
        chalk.hex("#00F0FF").bold("[AE]") + " 🇦🇪 UAE (Dubai)",
      ].join("   "));
      console.log("");

      console.log(chalk.hex("#6366F1")("  " + "─".repeat(74)));
      const pick = (await prompt(chalk.hex("#00F0FF")("  👉 Nhập mã quốc gia bạn muốn chuyển (VD: AU, TH, FR, RU... hoặc Enter để quay lại): "))).trim().toUpperCase();
      if (pick && REGION_PRESETS[pick]) {
        console.log("");
        await applyAndCheckRegion(pick);
      }

    } else if (input === "12") {
      const pick = (await prompt(chalk.hex("#00F0FF")("  👉 Nhập mã quốc gia (2 ký tự, VD: AU, FR, TH, ID, PH, MX, RU, IT, TR...): "))).trim().toUpperCase();
      if (pick && REGION_PRESETS[pick]) {
        console.log("");
        await applyAndCheckRegion(pick);
      } else if (pick) {
        log(`Không tìm thấy quốc gia với mã "${pick}"!`, "warn");
        await sleep(1000);
      }

    } else if (input === "13") {
      await proxyMenu(cfg);
      engine.cfg = cfg;
      engine._initDispatcher();

    } else {
      return cfg;
    }
  }
}

async function settingsMenu(cfg) {
  while (true) {
    await printHeader("⚙️  Cài Đặt Cấu Hình", cfg);

    const currentReg = REGION_PRESETS[cfg.region?.toUpperCase()] || REGION_PRESETS.US;
    const pool = loadProxyPool(cfg.proxyPoolSource ?? "all");
    const boostDesc = cfg.boostRatio === 1
      ? chalk.dim("(tốc độ gốc)")
      : chalk.hex("#EC4899")(`(${cfg.boostRatio}× siêu tốc)`);
    const hbSec = (Math.max(3, Math.round(20 / cfg.boostRatio * 10) / 10)).toFixed(1) + "s";

    let proxyText = chalk.dim("Không dùng");
    if (cfg.proxy) proxyText = chalk.hex("#06B6D4")(cfg.proxy);
    else if (cfg.useProxyPool) {
      const srcName = cfg.proxyPoolSource === "webshare" ? "Webshare" : "Webshare + Free";
      proxyText = chalk.hex("#10B981")(`Proxy Pool (${pool.length} IPs - ${srcName})`);
    }

    const badgeOn  = chalk.hex("#22C55E").bold("[ 🟢 BẬT ]");
    const badgeOff = chalk.hex("#EF4444").bold("[ 🔴 TẮT ]");

    console.log(chalk.hex("#6366F1")("  ╭─────────────────── ✦ BẢNG CẤU HÌNH HIỆN TẠI ✦ ───────────────────╮"));
    console.log(chalk.hex("#6366F1")("  │") + `  🌍 Khu vực mặc định : ` + chalk.hex("#F59E0B").bold(currentReg.name));
    console.log(chalk.hex("#6366F1")("  │") + `  🌐 Quét đa vùng:     ` + (cfg.autoRegionSweep ? chalk.hex("#22C55E").bold(`[ 🟢 BẬT (${Object.keys(REGION_PRESETS).length} vùng) ]`) : badgeOff));
    console.log(chalk.hex("#6366F1")("  │") + `  🇻🇳 Về VN khi xong   : ` + (cfg.autoBackToVN ? badgeOn : badgeOff));
    console.log(chalk.hex("#6366F1")("  │") + `  🔌 Proxy kết nối    : ` + proxyText);
    console.log(chalk.hex("#6366F1")("  │") + `  ⚡ Tỉ lệ Boost      : ` + chalk.hex("#00F0FF").bold(`×${cfg.boostRatio}`) + "  " + boostDesc);
    console.log(chalk.hex("#6366F1")("  │") + `  💓 Gửi Heartbeat    : ` + chalk.hex("#00F0FF").bold(hbSec) + chalk.dim(" (tự tính từ boost)"));
    console.log(chalk.hex("#6366F1")("  │") + `  ⏱️  Chu kỳ quét (Poll): ` + chalk.hex("#00F0FF").bold(cfg.pollInterval + "s"));
    console.log(chalk.hex("#6366F1")("  │") + `  🎁 Tự động nhận Q   : ` + (cfg.autoAccept ? badgeOn : badgeOff));
    console.log(chalk.hex("#6366F1")("  ╰──────────────────────────────────────────────────────────────────╯"));
    console.log("");

    menuChoice([
      { label: `Bật/Tắt Quét đa khu vực (Auto Sweep)`,   hint: `hiện: ${cfg.autoRegionSweep ? "BẬT" : "TẮT"}` },
      { label: `Bật/Tắt Tự động về VN khi xong quest`,     hint: `hiện: ${cfg.autoBackToVN ? "BẬT" : "TẮT"}` },
      { label: `Quản lý Proxy & Nguồn Proxy Pool`,         hint: `bật/tắt/xoay 1200+ IPs` },
      { label: `Đổi tỉ lệ Boost tốc độ`,                   hint: `hiện: ×${cfg.boostRatio} (khuyên: 2-5)` },
      { label: `Đổi chu kỳ lặp lại (Poll interval)`,       hint: `hiện: ${cfg.pollInterval}s` },
      { label: `Bật/Tắt Tự động nhận quest mới`,           hint: `hiện: ${cfg.autoAccept ? "BẬT" : "TẮT"}` },
      { label: `← Lưu cấu hình & Quay lại Menu chính` },
    ]);

    const ch = await prompt(chalk.dim("  👉 Chọn: "));

    if (ch === "1") {
      cfg.autoRegionSweep = !cfg.autoRegionSweep;
      log(`Auto Sweep vùng: ${cfg.autoRegionSweep ? "BẬT" : "TẮT"}`, "ok");
    } else if (ch === "2") {
      cfg.autoBackToVN = !cfg.autoBackToVN;
      log(`Auto về VN khi xong quest: ${cfg.autoBackToVN ? "BẬT" : "TẮT"}`, "ok");
    } else if (ch === "3") {
      await proxyMenu(cfg);
    } else if (ch === "4") {
      const v = await prompt(chalk.dim("  Boost ratio mới (ví dụ: 1, 2.5, 5, 10): "));
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) { cfg.boostRatio = Math.round(n * 10) / 10; log(`Đã đặt boost ×${cfg.boostRatio}`, "ok"); }
      else log("Giá trị không hợp lệ, giữ nguyên.", "warn");
    } else if (ch === "5") {
      const v = await prompt(chalk.dim("  Poll interval mới (giây, ví dụ: 30, 60, 120): "));
      const n = parseInt(v);
      if (!isNaN(n) && n >= 5) { cfg.pollInterval = n; log(`Đã đặt poll ${n}s`, "ok"); }
      else log("Giá trị không hợp lệ (tối thiểu 5s), giữ nguyên.", "warn");
    } else if (ch === "6") {
      cfg.autoAccept = !cfg.autoAccept;
      log(`Auto-accept: ${cfg.autoAccept ? "BẬT" : "TẮT"}`, "ok");
    } else {
      saveConfig(cfg);
      log("Đã lưu cài đặt thành công!", "ok");
      await sleep(600);
      return cfg;
    }
    await sleep(400);
  }
}

async function aboutMenu(cfg) {
  await printHeader("ℹ️  Thông Tin & Hướng Dẫn Sử Dụng", cfg);
  console.log(chalk.hex("#6366F1")("  ╭──────────────── ✦ TÍNH NĂNG AUTO QUEST ✦ ─────────────────╮"));
  console.log(chalk.hex("#6366F1")("  │") + chalk.hex("#00F0FF").bold("  🎬 Video Quest Speed   : ") + "Nhảy timestamp thông minh theo hệ số Boost");
  console.log(chalk.hex("#6366F1")("  │") + chalk.hex("#38BDF8").bold("  🎮 Game/Heartbeat Boost: ") + "Tối ưu chu kỳ gửi packet, rút ngắn 80% thời gian");
  console.log(chalk.hex("#6366F1")("  │") + chalk.hex("#818CF8").bold("  🌐 Multi-Region Sweep  : ") + `Quét ${Object.keys(REGION_PRESETS).length} quốc gia toàn cầu hốt sạch quest`);
  console.log(chalk.hex("#6366F1")("  │") + chalk.hex("#22C55E").bold("  🇻🇳 Auto Back to VN     : ") + "Tự động đổi vị trí tài khoản về VN khi xong quest");
  console.log(chalk.hex("#6366F1")("  │") + chalk.hex("#EC4899").bold("  💻 Auto PC/Desktop Mode: ") + "Tự chọn nền tảng PC tối ưu khi nhận nhiệm vụ");
  console.log(chalk.hex("#6366F1")("  │") + chalk.hex("#A855F7").bold("  🔌 1200+ Proxy Pool    : ") + "Tự động xoay IP chống rate limit & an toàn");
  console.log(chalk.hex("#6366F1")("  ╰──────────────────────────────────────────────────────────────────╯"));
  console.log("");
  console.log(chalk.dim("  📁 Config: ") + chalk.cyan(CFG_FILE));
  console.log(chalk.dim("  🔑 Token : ") + chalk.cyan(TOKEN_FILE));
  console.log("");
  await prompt(chalk.dim("  [Nhấn Enter để quay lại Menu chính] "));
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

async function mainMenu() {
  let cfg   = loadConfig();
  let token = loadToken();

  if (!token) {
    token = await tokenMenu(cfg);
    if (!token) { console.log(chalk.red("\nKhông có token – thoát.")); process.exit(1); }
  }

  while (true) {
    await printHeader("", cfg);

    const masked = token
      ? token.slice(0, 10) + "·".repeat(6) + token.slice(-4)
      : chalk.red("(chưa có token)");
    const currentReg = REGION_PRESETS[cfg.region?.toUpperCase()] || REGION_PRESETS.US;
    const pool = loadProxyPool(cfg.proxyPoolSource ?? "all");

    let proxyStr = chalk.dim("Tắt");
    if (cfg.proxy) proxyStr = chalk.hex("#06B6D4")("Custom IP");
    else if (cfg.useProxyPool) {
      proxyStr = cfg.proxyPoolSource === "webshare" ? chalk.hex("#22C55E")(`Webshare (${pool.length})`) : chalk.hex("#22C55E")(`Pool (${pool.length})`);
    }

    const badgeOn  = chalk.hex("#22C55E").bold("BẬT");
    const badgeOff = chalk.hex("#EF4444").bold("TẮT");

    console.log(chalk.hex("#6366F1")("  ╭──────────────── ✦ THÔNG TIN TÀI KHOẢN & HỆ THỐNG ✦ ────────────────╮"));
    console.log(chalk.hex("#6366F1")("  │") + `  🔑 Token  : ` + chalk.hex("#F59E0B").bold(masked) + `  │  🌍 Vùng : ` + chalk.hex("#00F0FF").bold(currentReg.code + ` (${currentReg.name.split(" ")[1] || ""})`));
    console.log(chalk.hex("#6366F1")("  │") + `  ⚡ Boost  : ` + chalk.hex("#EC4899").bold(`×${cfg.boostRatio}`) + `     │  ⏱️  Poll : ` + chalk.hex("#00F0FF").bold(`${cfg.pollInterval}s`));
    console.log(chalk.hex("#6366F1")("  │") + `  🌐 Sweep  : ` + (cfg.autoRegionSweep ? badgeOn : badgeOff) + `         │  🇻🇳 Về VN: ` + (cfg.autoBackToVN ? badgeOn : badgeOff));
    console.log(chalk.hex("#6366F1")("  │") + `  🔌 Proxy  : ` + proxyStr);
    console.log(chalk.hex("#6366F1")("  ╰────────────────────────────────────────────────────────────────────╯"));
    console.log("");

    menuChoice([
      { label: chalk.hex("#22C55E").bold("⚡ BẮT ĐẦU CHẠY QUEST (FULL AUTO)"), hint: `hoàn thành siêu tốc mọi quest` },
      { label: chalk.hex("#00F0FF").bold("🔍 Kiểm tra danh sách Quest"),          hint: `xem tiến độ & phần thưởng` },
      { label: chalk.hex("#F59E0B").bold("🌐 Đổi địa điểm & Quét toàn cầu"),     hint: `hốt sạch quest đa quốc gia` },
      { label: chalk.hex("#EC4899").bold("⚙️  Cài đặt cấu hình"),                 hint: `boost, proxy, auto back VN` },
      { label: chalk.hex("#8B5CF6").bold("🔑 Quản lý Discord Token"),             hint: `thay đổi / xóa token` },
      { label: chalk.hex("#38BDF8").bold("ℹ️  Thông tin & Hướng dẫn"),            hint: `tính năng & trợ giúp` },
      { label: chalk.hex("#EF4444").bold("🚪 Thoát chương trình") },
    ]);

    const ch = await prompt(chalk.dim("  👉 Chọn [1-7]: "));

    if (ch === "1") {
      if (!token) { log("Chưa có token!", "error"); await sleep(800); continue; }
      console.log("");
      await runBot(token, { ...cfg });
      console.log("");
      await prompt(chalk.dim("  [Nhấn Enter để quay lại Menu chính] "));

    } else if (ch === "2") {
      if (!token) { log("Chưa có token!", "error"); await sleep(800); continue; }
      console.log("");
      const engine = new QuestEngine(token, cfg);
      await engine._init();
      await checkMode(engine);
      console.log("");
      await prompt(chalk.dim("  [Nhấn Enter để quay lại Menu chính] "));

    } else if (ch === "3") {
      if (!token) { log("Chưa có token!", "error"); await sleep(800); continue; }
      await locationMenu(token, cfg);

    } else if (ch === "4") {
      cfg = await settingsMenu(cfg);

    } else if (ch === "5") {
      const newToken = await tokenMenu(cfg);
      if (newToken) token = newToken;

    } else if (ch === "6") {
      await aboutMenu(cfg);

    } else if (ch === "7" || ch.toLowerCase() === "q") {
      console.log(chalk.hex("#00F0FF")("\n  ✨ Cảm ơn bạn đã sử dụng Auto Quest! Tạm biệt!\n"));
      process.exit(0);
    }
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────────

process.on("SIGINT", () => { /* handled per-mode */ });

const args   = process.argv.slice(2);
const tokArg = args.find(a => a.startsWith("--token="))?.split("=")[1];
const check  = args.includes("--check");
const sweep  = args.includes("--sweep") || args.includes("--scan-all-regions");
const scrapeProxies = args.includes("--scrape-proxies") || args.includes("--fetch-proxies") || args.includes("--get-proxies");
const regArg = args.find(a => a.startsWith("--region="))?.split("=")[1]?.toUpperCase();
const prxArg = args.find(a => a.startsWith("--proxy="))?.split("=")[1];
const poll   = parseInt(args.find(a => a.startsWith("--poll="))?.split("=")[1] ?? "0");
const boost  = parseFloat(args.find(a => a.startsWith("--boost="))?.split("=")[1] ?? "0");
const noAutoAccept = args.includes("--no-auto-accept");
const noAutoSweep  = args.includes("--no-auto-sweep");
const noAutoBackVN = args.includes("--no-auto-back-vn") || args.includes("--no-back-vn");
const autoBackVN   = args.includes("--auto-back-vn") || args.includes("--back-vn");
const noProxy      = args.includes("--no-proxy");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${getAsciiLogo()}
  ${chalk.hex("#00F0FF").bold("⚡ AUTO QUEST BOT v8.0")}
  
Cách dùng:
  node aka.js                     Chạy giao diện Menu Auto Quest
  node aka.js --check             Kiểm tra danh sách quest (CLI)
  node aka.js --sweep             Quét và nhận quest ở TẤT CẢ các khu vực toàn cầu (40 quốc gia)
  node aka.js --scrape-proxies    Cào và cập nhật proxy mới từ ProxyScrape & Free sources
  node aka.js --region=JP         Chạy bot với khu vực chỉ định (US, JP, KR, DE, GB, VN, CA, SG, FR...)
  node aka.js --proxy=PROXY_URL   Chạy bot qua Proxy cố định (http://ip:port)
  node aka.js --no-proxy          Tắt dùng Proxy Pool
  node aka.js --token=YOUR_TOKEN  Chạy bot trực tiếp với token
  node aka.js --boost=5           Chạy với tỉ lệ boost ×5
  node aka.js --poll=30           Chạy với chu kỳ quét 30s
  node aka.js --no-auto-accept    Tắt tự động nhận quest
  node aka.js --no-auto-sweep     Tắt tự động quét đa khu vực
  node aka.js --auto-back-vn      Tự động đổi vị trí tài khoản về Việt Nam sau khi xong quest
  node aka.js --no-auto-back-vn   Tắt tự động đổi về Việt Nam sau khi xong quest
`);
  process.exit(0);
}

if (scrapeProxies) {
  console.log(getAsciiLogo());
  console.log("");
  await fetchOnlineProxies(true);
  process.exit(0);
}

// CLI mode (flags truyền thẳng) – bỏ qua menu
if (tokArg || check || sweep || regArg) {
  const cfg = loadConfig();
  if (boost > 0) cfg.boostRatio   = boost;
  if (poll  > 0) cfg.pollInterval = poll;
  if (regArg && REGION_PRESETS[regArg]) cfg.region = regArg;
  if (prxArg)   cfg.proxy = prxArg;
  if (noAutoAccept) cfg.autoAccept = false;
  if (noAutoSweep)  cfg.autoRegionSweep = false;
  if (noAutoBackVN) cfg.autoBackToVN = false;
  if (autoBackVN)   cfg.autoBackToVN = true;
  if (noProxy)      cfg.useProxyPool = false;

  const token = tokArg ?? loadToken();
  if (!token) { console.error(chalk.red("[ ERR] Không có token – dùng --token=TOKEN")); process.exit(1); }

  const engine = new QuestEngine(token, cfg);
  await engine._init();
  const user   = await engine.validateToken();
  if (!user)  { console.error(chalk.red("[ ERR] Token không hợp lệ!")); process.exit(1); }

  console.log("");
  console.log(getAsciiLogo());

  console.log(chalk.hex("#6366F1")("  " + "─".repeat(78)));
  console.log(chalk.hex("#00F0FF").bold("  ⚡ Auto Quest Bot v8.0  ·  CLI Mode"));
  console.log(chalk.hex("#6366F1")("  " + "─".repeat(78)));

  if (sweep) {
    await engine.multiRegionSweep((ev, kw = {}) => {
      if (ev === "log") log(kw.msg ?? "", kw.level ?? "info");
    });
  } else if (check) {
    await checkMode(engine);
  } else {
    await runBot(token, cfg);
  }
} else {
  // Menu mode
  await mainMenu();
}
