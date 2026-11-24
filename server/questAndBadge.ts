import crypto from 'crypto';

const DISCORD_API_BASE = 'https://discord.com/api/v9';
const GAMES_CDN_URL = 'https://cdn.discordapp.com/detectables/games.json';

const CLIENT_VERSION = '1.0.9253';
const CLIENT_BUILD_NUMBER = 595897;
const NATIVE_BUILD_NUMBER = 88414;
const OS_VERSION = '10.0.26200';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 Electron/42.7.1 Safari/537.36';

export interface RegionPreset {
  code: string;
  name: string;
  locale: string;
  systemLocale: string;
  timezone: string;
  tzOffset: number;
  lang: string;
}

export const REGION_PRESETS: Record<string, RegionPreset> = {
  US: { code: 'US', name: 'Hoa Kỳ (US)', locale: 'en-US', systemLocale: 'en-US', timezone: 'America/New_York', tzOffset: 300, lang: 'en-US,en;q=0.9' },
  VN: { code: 'VN', name: 'Việt Nam (VN)', locale: 'vi', systemLocale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh', tzOffset: -420, lang: 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7' },
  JP: { code: 'JP', name: 'Nhật Bản (JP)', locale: 'ja', systemLocale: 'ja-JP', timezone: 'Asia/Tokyo', tzOffset: -540, lang: 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7' },
  KR: { code: 'KR', name: 'Hàn Quốc (KR)', locale: 'ko', systemLocale: 'ko-KR', timezone: 'Asia/Seoul', tzOffset: -540, lang: 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' },
  SG: { code: 'SG', name: 'Singapore (SG)', locale: 'en-US', systemLocale: 'en-SG', timezone: 'Asia/Singapore', tzOffset: -480, lang: 'en-SG,en;q=0.9,en-US;q=0.7' },
  GB: { code: 'GB', name: 'Anh (GB)', locale: 'en-GB', systemLocale: 'en-GB', timezone: 'Europe/London', tzOffset: -60, lang: 'en-GB,en;q=0.9,en-US;q=0.8' },
  DE: { code: 'DE', name: 'Đức (DE)', locale: 'de', systemLocale: 'de-DE', timezone: 'Europe/Berlin', tzOffset: -120, lang: 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7' },
  FR: { code: 'FR', name: 'Pháp (FR)', locale: 'fr', systemLocale: 'fr-FR', timezone: 'Europe/Paris', tzOffset: -120, lang: 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7' },
  CA: { code: 'CA', name: 'Canada (CA)', locale: 'en-US', systemLocale: 'en-CA', timezone: 'America/Toronto', tzOffset: 300, lang: 'en-CA,en-US;q=0.9,en;q=0.8' },
  BR: { code: 'BR', name: 'Brazil (BR)', locale: 'pt-BR', systemLocale: 'pt-BR', timezone: 'America/Sao_Paulo', tzOffset: 180, lang: 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' },
  AU: { code: 'AU', name: 'Úc (AU)', locale: 'en-GB', systemLocale: 'en-AU', timezone: 'Australia/Sydney', tzOffset: -600, lang: 'en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7' },
  TW: { code: 'TW', name: 'Đài Loan (TW)', locale: 'zh-TW', systemLocale: 'zh-TW', timezone: 'Asia/Taipei', tzOffset: -480, lang: 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7' },
  HK: { code: 'HK', name: 'Hồng Kông (HK)', locale: 'zh-TW', systemLocale: 'zh-HK', timezone: 'Asia/Hong_Kong', tzOffset: -480, lang: 'zh-HK,zh;q=0.9,en-US;q=0.8,en;q=0.7' },
  TH: { code: 'TH', name: 'Thái Lan (TH)', locale: 'th', systemLocale: 'th-TH', timezone: 'Asia/Bangkok', tzOffset: -420, lang: 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7' },
  ID: { code: 'ID', name: 'Indonesia (ID)', locale: 'id', systemLocale: 'id-ID', timezone: 'Asia/Jakarta', tzOffset: -420, lang: 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7' },
  PH: { code: 'PH', name: 'Philippines (PH)', locale: 'en-US', systemLocale: 'en-PH', timezone: 'Asia/Manila', tzOffset: -480, lang: 'en-PH,en;q=0.9,en-US;q=0.7' },
  MY: { code: 'MY', name: 'Malaysia (MY)', locale: 'en-GB', systemLocale: 'ms-MY', timezone: 'Asia/Kuala_Lumpur', tzOffset: -480, lang: 'ms-MY,ms;q=0.9,en-GB;q=0.8' },
  IN: { code: 'IN', name: 'Ấn Độ (IN)', locale: 'hi', systemLocale: 'hi-IN', timezone: 'Asia/Kolkata', tzOffset: -330, lang: 'hi-IN,hi;q=0.9,en-IN;q=0.8' },
  NZ: { code: 'NZ', name: 'New Zealand (NZ)', locale: 'en-GB', systemLocale: 'en-NZ', timezone: 'Pacific/Auckland', tzOffset: -720, lang: 'en-NZ,en-GB;q=0.9' },
  MX: { code: 'MX', name: 'Mexico (MX)', locale: 'es-419', systemLocale: 'es-MX', timezone: 'America/Mexico_City', tzOffset: 360, lang: 'es-MX,es-419;q=0.9' },
  AR: { code: 'AR', name: 'Argentina (AR)', locale: 'es-419', systemLocale: 'es-AR', timezone: 'America/Argentina/Buenos_Aires', tzOffset: 180, lang: 'es-AR,es-419;q=0.9' },
  CL: { code: 'CL', name: 'Chile (CL)', locale: 'es-419', systemLocale: 'es-CL', timezone: 'America/Santiago', tzOffset: 240, lang: 'es-CL,es-419;q=0.9' },
  CO: { code: 'CO', name: 'Colombia (CO)', locale: 'es-419', systemLocale: 'es-CO', timezone: 'America/Bogota', tzOffset: 300, lang: 'es-CO,es-419;q=0.9' },
  ES: { code: 'ES', name: 'Tây Ban Nha (ES)', locale: 'es-ES', systemLocale: 'es-ES', timezone: 'Europe/Madrid', tzOffset: -120, lang: 'es-ES,es;q=0.9' },
  IT: { code: 'IT', name: 'Ý (IT)', locale: 'it', systemLocale: 'it-IT', timezone: 'Europe/Rome', tzOffset: -120, lang: 'it-IT,it;q=0.9' },
  NL: { code: 'NL', name: 'Hà Lan (NL)', locale: 'nl', systemLocale: 'nl-NL', timezone: 'Europe/Amsterdam', tzOffset: -120, lang: 'nl-NL,nl;q=0.9' },
  PL: { code: 'PL', name: 'Ba Lan (PL)', locale: 'pl', systemLocale: 'pl-PL', timezone: 'Europe/Warsaw', tzOffset: -120, lang: 'pl-PL,pl;q=0.9' },
  SE: { code: 'SE', name: 'Thụy Điển (SE)', locale: 'sv-SE', systemLocale: 'sv-SE', timezone: 'Europe/Stockholm', tzOffset: -120, lang: 'sv-SE,sv;q=0.9' },
  NO: { code: 'NO', name: 'Na Uy (NO)', locale: 'no', systemLocale: 'nb-NO', timezone: 'Europe/Oslo', tzOffset: -120, lang: 'nb-NO,no;q=0.9' },
  DK: { code: 'DK', name: 'Đan Mạch (DK)', locale: 'da', systemLocale: 'da-DK', timezone: 'Europe/Copenhagen', tzOffset: -120, lang: 'da-DK,da;q=0.9' },
  FI: { code: 'FI', name: 'Phần Lan (FI)', locale: 'fi', systemLocale: 'fi-FI', timezone: 'Europe/Helsinki', tzOffset: -180, lang: 'fi-FI,fi;q=0.9' },
  TR: { code: 'TR', name: 'Thổ Nhĩ Kỳ (TR)', locale: 'tr', systemLocale: 'tr-TR', timezone: 'Europe/Istanbul', tzOffset: -180, lang: 'tr-TR,tr;q=0.9' },
  RU: { code: 'RU', name: 'Nga (RU)', locale: 'ru', systemLocale: 'ru-RU', timezone: 'Europe/Moscow', tzOffset: -180, lang: 'ru-RU,ru;q=0.9' },
  UA: { code: 'UA', name: 'Ukraine (UA)', locale: 'uk', systemLocale: 'uk-UA', timezone: 'Europe/Kyiv', tzOffset: -180, lang: 'uk-UA,uk;q=0.9' },
  CZ: { code: 'CZ', name: 'Séc (CZ)', locale: 'cs', systemLocale: 'cs-CZ', timezone: 'Europe/Prague', tzOffset: -120, lang: 'cs-CZ,cs;q=0.9' },
  RO: { code: 'RO', name: 'Romania (RO)', locale: 'ro', systemLocale: 'ro-RO', timezone: 'Europe/Bucharest', tzOffset: -180, lang: 'ro-RO,ro;q=0.9' },
  GR: { code: 'GR', name: 'Hy Lạp (GR)', locale: 'el', systemLocale: 'el-GR', timezone: 'Europe/Athens', tzOffset: -180, lang: 'el-GR,el;q=0.9' },
  HU: { code: 'HU', name: 'Hungary (HU)', locale: 'hu', systemLocale: 'hu-HU', timezone: 'Europe/Budapest', tzOffset: -120, lang: 'hu-HU,hu;q=0.9' },
  SA: { code: 'SA', name: 'Saudi Arabia (SA)', locale: 'en-US', systemLocale: 'ar-SA', timezone: 'Asia/Riyadh', tzOffset: -180, lang: 'ar-SA,ar;q=0.9' },
  AE: { code: 'AE', name: 'UAE (AE)', locale: 'en-US', systemLocale: 'ar-AE', timezone: 'Asia/Dubai', tzOffset: -240, lang: 'ar-AE,ar;q=0.9' },
};

export const SUPPORTED_QUEST_TASKS = [
  'WATCH_VIDEO',
  'WATCH_VIDEO_ON_MOBILE',
  'PLAY_ON_DESKTOP',
  'STREAM_ON_DESKTOP',
  'PLAY_ACTIVITY',
];

const DESKTOP_QUEST_TASKS = new Set([
  'PLAY_ON_DESKTOP',
  'STREAM_ON_DESKTOP',
  'WATCH_VIDEO',
  'WATCH_VIDEO_ON_MOBILE',
]);

export interface RawDiscordQuest {
  id: string;
  traffic_metadata_raw?: string | null;
  traffic_metadata_sealed?: string | null;
  config?: {
    application?: { id?: string; name?: string };
    messages?: {
      quest_name?: string;
      questName?: string;
      game_title?: string;
      gameTitle?: string;
    };
    expires_at?: string;
    expiresAt?: string;
    task_config?: { tasks?: Record<string, { target?: number; type?: string }> };
    taskConfig?: { tasks?: Record<string, { target?: number; type?: string }> };
    task_config_v2?: { tasks?: Record<string, { target?: number; type?: string }> };
    taskConfigV2?: { tasks?: Record<string, { target?: number; type?: string }> };
  };
  user_status?: {
    enrolled_at?: string | null;
    enrolledAt?: string | null;
    completed_at?: string | null;
    completedAt?: string | null;
    claimed_at?: string | null;
    claimedAt?: string | null;
    progress?: Record<string, { value?: number }>;
  } | null;
  userStatus?: {
    enrolled_at?: string | null;
    enrolledAt?: string | null;
    completed_at?: string | null;
    completedAt?: string | null;
    claimed_at?: string | null;
    claimedAt?: string | null;
    progress?: Record<string, { value?: number }>;
  } | null;
}

export interface QuestRunnerPublicState {
  running: boolean;
  sweeping: boolean;
  currentRegion: string;
  activeCount: number;
  completedCount: number;
  statusMessage: string;
}

export interface BadgeSpoofPublicState {
  running: boolean;
  mode: 'played_count' | 'playtime_hours';
  processedGames: number;
  totalGames: number;
  hoursPerGame: number;
  totalHoursAdded: number;
  hasCookie: boolean;
  maskedCookie: string;
  statusMessage: string;
}

export interface SpoofGameEntry {
  id: string;
  name: string;
  exe: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function extractQuestMeta(q: RawDiscordQuest) {
  const cfg = q.config ?? {};
  const tc = cfg.taskConfigV2 || cfg.task_config_v2 || cfg.taskConfig || cfg.task_config;
  const tasks = tc?.tasks ?? {};
  const taskType = SUPPORTED_QUEST_TASKS.find((t) => tasks[t] != null) || Object.keys(tasks)[0] || 'PLAY_ON_DESKTOP';
  const targetSeconds = tasks[taskType]?.target ?? 900;

  const us = q.userStatus || q.user_status || {};
  const enrolledAt = us.enrolledAt || us.enrolled_at || null;
  const completedAt = us.completedAt || us.completed_at || null;
  const claimedAt = us.claimedAt || us.claimed_at || null;
  const expiresAt = cfg.expiresAt || cfg.expires_at || null;
  const currentSeconds = us.progress?.[taskType]?.value ?? 0;

  const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : false;
  const isCompletable = !isExpired && SUPPORTED_QUEST_TASKS.some((t) => tasks[t] != null);

  const hasDesktop = Object.keys(tasks).some((t) => DESKTOP_QUEST_TASKS.has(t));
  const hasOther = Object.keys(tasks).some((t) => !DESKTOP_QUEST_TASKS.has(t));

  return {
    id: q.id,
    title: (cfg.messages?.questName || cfg.messages?.quest_name || cfg.application?.name || `Quest ${q.id}`).trim(),
    gameTitle: (cfg.messages?.gameTitle || cfg.messages?.game_title || cfg.application?.name || 'Game Quest').trim(),
    applicationId: cfg.application?.id || '',
    enrolled: Boolean(enrolledAt),
    enrolledAt,
    completed: Boolean(completedAt),
    claimed: Boolean(claimedAt),
    expired: isExpired,
    completable: isCompletable,
    expiresAt,
    targetSeconds,
    currentSeconds,
    taskType,
    needsDesktopPlatform: hasDesktop && hasOther && DESKTOP_QUEST_TASKS.has(taskType),
    raw: q,
  };
}

export class QuestAutomationService {
  private stopFlag = false;
  private state: QuestRunnerPublicState = {
    running: false,
    sweeping: false,
    currentRegion: 'VN',
    activeCount: 0,
    completedCount: 0,
    statusMessage: 'Sẵn sàng',
  };

  private getToken: () => string;
  private getHeaders: () => Record<string, string>;
  private onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, msg: string) => void;
  private onProgressUpdate: (questId: string, currentSeconds: number, completed: boolean) => void;
  private onStateChange: () => void;
  private onRefreshQuests: () => Promise<RawDiscordQuest[]>;

  constructor(deps: {
    getToken: () => string;
    getHeaders: () => Record<string, string>;
    onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, msg: string) => void;
    onProgressUpdate: (questId: string, currentSeconds: number, completed: boolean) => void;
    onStateChange: () => void;
    onRefreshQuests: () => Promise<RawDiscordQuest[]>;
  }) {
    this.getToken = deps.getToken;
    this.getHeaders = deps.getHeaders;
    this.onLog = deps.onLog;
    this.onProgressUpdate = deps.onProgressUpdate;
    this.onStateChange = deps.onStateChange;
    this.onRefreshQuests = deps.onRefreshQuests;
  }

  public getState(): QuestRunnerPublicState {
    return { ...this.state };
  }

  public stop() {
    this.stopFlag = true;
    this.state.running = false;
    this.state.sweeping = false;
    this.state.statusMessage = 'Đã dừng theo yêu cầu';
    this.onStateChange();
  }

  private async discordReq(
    method: 'GET' | 'POST' | 'PATCH',
    apiPath: string,
    payload?: unknown,
    regionOverride?: RegionPreset,
    maxRetries = 5
  ): Promise<Response | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (this.stopFlag) return null;
      await sleep(50 + Math.floor(Math.random() * 50));

      const headers = { ...this.getHeaders() };
      if (regionOverride) {
        headers['Accept-Language'] = regionOverride.lang;
        headers['X-Discord-Locale'] = regionOverride.locale;
        headers['X-Discord-Timezone'] = regionOverride.timezone;
      }

      try {
        const res = await fetch(`${DISCORD_API_BASE}${apiPath}`, {
          method,
          headers,
          body: payload !== undefined ? JSON.stringify(payload) : undefined,
          signal: AbortSignal.timeout(15000),
        });

        if (res.status === 429) {
          let retryAfter = 5;
          try {
            const body = (await res.clone().json()) as { retry_after?: number };
            if (typeof body.retry_after === 'number') retryAfter = body.retry_after;
          } catch {
            const h = res.headers.get('retry-after');
            if (h) retryAfter = parseFloat(h) || 5;
          }
          const waitMs = Math.ceil(Math.max(1, retryAfter) * 1000) + 600;
          this.onLog('warn', 'AutoQuest', `Rate limit ${apiPath}, chờ ${(waitMs / 1000).toFixed(1)}s...`);
          await sleep(waitMs);
          continue;
        }

        if (res.status >= 500 && res.status < 600) {
          await sleep(1500 * attempt);
          continue;
        }

        return res;
      } catch {
        if (this.stopFlag) return null;
        await sleep(1500 * attempt);
      }
    }
    return null;
  }

  public async setAccountRegion(regionCode: string, syncSettings = true): Promise<RegionPreset> {
    const reg = REGION_PRESETS[regionCode.toUpperCase()] || REGION_PRESETS.US;
    this.state.currentRegion = reg.code;
    if (syncSettings && this.getToken()) {
      await this.discordReq('PATCH', '/users/@me/settings', {
        locale: reg.locale,
        timezone_offset: reg.tzOffset,
      }, reg);
    }
    this.onStateChange();
    return reg;
  }

  public async enrollQuestRaw(meta: ReturnType<typeof extractQuestMeta>): Promise<boolean> {
    const payload: Record<string, unknown> = {
      location: 11,
      is_targeted: false,
      metadata_raw: null,
      metadata_sealed: null,
      traffic_metadata_raw: meta.raw.traffic_metadata_raw ?? null,
      traffic_metadata_sealed: meta.raw.traffic_metadata_sealed ?? null,
    };
    if (DESKTOP_QUEST_TASKS.has(meta.taskType)) {
      payload.platform = 'desktop';
      payload.device_type = 'desktop';
    }
    const res = await this.discordReq('POST', `/quests/${meta.id}/enroll`, payload);
    if (res && [200, 201, 204].includes(res.status)) {
      this.onLog('success', 'AutoQuest', `Đã nhận Quest: ${meta.title} (${meta.taskType})`);
      return true;
    }
    return false;
  }

  public async sweepRegions(options?: {
    regions?: string[];
    autoBackToVN?: boolean;
  }): Promise<{ totalEnrolled: number }> {
    if (!this.getToken()) throw new Error('Cần có Discord Token.');
    this.stopFlag = false;
    this.state.sweeping = true;
    const regionList =
      options?.regions && options.regions.length > 0
        ? options.regions
        : Object.keys(REGION_PRESETS);

    let totalEnrolled = 0;
    this.state.statusMessage = `Đang quét ${regionList.length} khu vực toàn cầu...`;
    this.onLog('info', 'AutoQuest', `Bắt đầu quét Quest qua ${regionList.length} khu vực...`);
    this.onStateChange();

    try {
      for (const code of regionList) {
        if (this.stopFlag) break;
        const reg = await this.setAccountRegion(code, true);
        this.state.statusMessage = `Đang quét vùng ${reg.name}...`;
        this.onStateChange();
        await sleep(750);

        const rawQuests = await this.onRefreshQuests();
        const metas = rawQuests.map(extractQuestMeta);
        const unaccepted = metas.filter((m) => !m.enrolled && !m.completed && m.completable);

        for (const m of unaccepted) {
          if (this.stopFlag) break;
          const ok = await this.enrollQuestRaw(m);
          if (ok) totalEnrolled++;
          await sleep(500);
        }
      }

      if (options?.autoBackToVN !== false && !this.stopFlag) {
        await this.setAccountRegion('VN', true);
        this.onLog('info', 'AutoQuest', 'Đã đưa vị trí tài khoản về Việt Nam (VN).');
      }

      await this.onRefreshQuests();
      this.onLog('success', 'AutoQuest', `Quét toàn cầu xong: nhận thêm ${totalEnrolled} Quest mới.`);
      return { totalEnrolled };
    } finally {
      this.state.sweeping = false;
      if (!this.state.running) {
        this.state.statusMessage = `Hoàn tất quét (nhận ${totalEnrolled} Quest)`;
      }
      this.onStateChange();
    }
  }

  private async completeVideoQuest(meta: ReturnType<typeof extractQuestMeta>, boostRatio: number) {
    const target = Math.max(1, meta.targetSeconds);
    let done = meta.currentSeconds;
    const enrolledTs = meta.enrolledAt ? new Date(meta.enrolledAt).getTime() / 1000 : Date.now() / 1000;
    const speed = Math.max(5, Math.ceil(7 * boostRatio));
    const maxFuture = Math.ceil(10 * boostRatio);
    let lastPostTs = 0;

    this.onLog('info', 'AutoQuest', `Bắt đầu Auto Video (${meta.title}, boost x${boostRatio})`);

    while (done < target && !this.stopFlag) {
      const now = Date.now() / 1000;
      const diff = now - enrolledTs + maxFuture - done;
      const ts = Math.min(target, done + speed);

      if (diff >= speed && Date.now() - lastPostTs >= 1200) {
        lastPostTs = Date.now();
        const res = await this.discordReq('POST', `/quests/${meta.id}/video-progress`, {
          timestamp: Math.min(target, ts + Math.random() * 0.5),
        });
        if (res?.ok) {
          const body = (await res.json().catch(() => ({}))) as { completed_at?: string | null };
          if (body.completed_at) {
            this.onProgressUpdate(meta.id, target, true);
            this.onLog('success', 'AutoQuest', `Hoàn thành Video Quest: ${meta.title}`);
            return;
          }
          done = ts;
          this.onProgressUpdate(meta.id, done, false);
        }
      }
      if (ts >= target) break;
      await sleep(600);
    }

    if (!this.stopFlag) {
      const fin = await this.discordReq('POST', `/quests/${meta.id}/video-progress`, { timestamp: target });
      const finBody = (await fin?.json().catch(() => ({}))) as { completed_at?: string | null };
      this.onProgressUpdate(meta.id, target, Boolean(finBody?.completed_at || true));
      this.onLog('success', 'AutoQuest', `Hoàn thành Video Quest: ${meta.title}`);
    }
  }

  private async completeHeartbeatQuest(meta: ReturnType<typeof extractQuestMeta>, boostRatio: number) {
    const target = Math.max(1, meta.targetSeconds);
    let done = meta.currentSeconds;
    const pid = Math.floor(Math.random() * 29000) + 1000;
    const streamKey = meta.taskType === 'PLAY_ACTIVITY' ? 'call:0:1' : `call:0:${pid}`;
    const intervalMs = Math.max(4000, Math.round(20000 / Math.max(1, boostRatio)));

    this.onLog('info', 'AutoQuest', `Bắt đầu Auto ${meta.taskType} (${meta.title}, chu kỳ ${(intervalMs / 1000).toFixed(1)}s)`);

    while (done < target && !this.stopFlag) {
      const res = await this.discordReq('POST', `/quests/${meta.id}/heartbeat`, {
        stream_key: streamKey,
        terminal: false,
      });
      if (res?.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          completed_at?: string | null;
          progress?: Record<string, { value?: number }>;
        };
        const val = body.progress?.[meta.taskType]?.value;
        if (typeof val === 'number') done = val;
        const completed = Boolean(body.completed_at || done >= target);
        this.onProgressUpdate(meta.id, done, completed);
        if (completed) break;
      }

      const waitStart = Date.now();
      while (Date.now() - waitStart < intervalMs && done < target && !this.stopFlag) {
        await sleep(500);
      }
    }

    if (!this.stopFlag) {
      await this.discordReq('POST', `/quests/${meta.id}/heartbeat`, {
        stream_key: streamKey,
        terminal: true,
      });
      this.onProgressUpdate(meta.id, target, true);
      this.onLog('success', 'AutoQuest', `Hoàn thành Quest: ${meta.title}`);
    }
  }

  public async runAllQuests(options?: {
    boostRatio?: number;
    sweepRegions?: boolean;
    autoBackToVN?: boolean;
  }) {
    if (!this.getToken()) throw new Error('Cần xác thực Discord Token trước.');
    if (this.state.running) return;

    const boostRatio = Math.min(10, Math.max(1, Number(options?.boostRatio) || 2.5));
    this.stopFlag = false;
    this.state.running = true;
    this.state.completedCount = 0;
    this.state.statusMessage = 'Đang kiểm tra & nhận Quest...';
    this.onStateChange();

    try {
      if (options?.sweepRegions) {
        await this.sweepRegions({
          regions: ['US', 'JP', 'KR', 'DE', 'GB', 'VN', 'CA', 'SG', 'BR', 'AU', 'FR', 'TW'],
          autoBackToVN: false,
        });
      }

      const rawList = await this.onRefreshQuests();
      const metas = rawList.map(extractQuestMeta);
      const unaccepted = metas.filter((m) => !m.enrolled && !m.completed && m.completable);

      if (unaccepted.length > 0) {
        this.state.statusMessage = `Đang tự động nhận ${unaccepted.length} Quest...`;
        this.onStateChange();
        for (const m of unaccepted) {
          if (this.stopFlag) break;
          await this.enrollQuestRaw(m);
          await sleep(450);
        }
      }

      const updatedRaw = await this.onRefreshQuests();
      const actionable = updatedRaw
        .map(extractQuestMeta)
        .filter((m) => m.enrolled && !m.completed && m.completable);

      this.state.activeCount = actionable.length;
      if (actionable.length === 0) {
        this.state.statusMessage = 'Không có Quest nào đang chạy hoặc cần làm.';
        this.onLog('info', 'AutoQuest', 'Hiện không có Quest khả dụng nào cần xử lý.');
      } else {
        this.state.statusMessage = `Đang auto ${actionable.length} Quest song song (x${boostRatio})...`;
        this.onStateChange();

        await Promise.allSettled(
          actionable.map(async (m) => {
            if (m.taskType === 'WATCH_VIDEO' || m.taskType === 'WATCH_VIDEO_ON_MOBILE') {
              await this.completeVideoQuest(m, boostRatio);
            } else {
              await this.completeHeartbeatQuest(m, boostRatio);
            }
            this.state.completedCount += 1;
            this.onStateChange();
          })
        );

        this.state.statusMessage = `Đã xử lý xong ${this.state.completedCount}/${actionable.length} Quest`;
      }

      if (options?.autoBackToVN !== false && !this.stopFlag) {
        await this.setAccountRegion('VN', true);
      }
      await this.onRefreshQuests();
    } finally {
      this.state.running = false;
      this.state.activeCount = 0;
      this.onStateChange();
    }
  }
}

export class BadgeSpooferService {
  private stopFlag = false;
  private gamesCache: SpoofGameEntry[] = [];
  private gamesFetchedAt = 0;
  private seq = 0;
  private state: BadgeSpoofPublicState = {
    running: false,
    mode: 'played_count',
    processedGames: 0,
    totalGames: 0,
    hoursPerGame: 5,
    totalHoursAdded: 0,
    hasCookie: false,
    maskedCookie: '',
    statusMessage: 'Sẵn sàng farm Badge / Giờ chơi',
  };

  private getToken: () => string;
  private getCookie: () => string;
  private setCookie: (c: string) => void;
  private onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, msg: string) => void;
  private onStateChange: () => void;

  constructor(deps: {
    getToken: () => string;
    getCookie: () => string;
    setCookie: (c: string) => void;
    onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, msg: string) => void;
    onStateChange: () => void;
  }) {
    this.getToken = deps.getToken;
    this.getCookie = deps.getCookie;
    this.setCookie = deps.setCookie;
    this.onLog = deps.onLog;
    this.onStateChange = deps.onStateChange;
  }

  private maskVal(val: string): string {
    const c = val.trim();
    if (!c) return '';
    if (c.length <= 14) return `${c.slice(0, 4)}••••`;
    return `${c.slice(0, 8)}••••••••${c.slice(-6)}`;
  }

  public getState(): BadgeSpoofPublicState {
    const cookie = this.getCookie();
    return {
      ...this.state,
      hasCookie: Boolean(cookie),
      maskedCookie: this.maskVal(cookie),
    };
  }

  public stop() {
    this.stopFlag = true;
    this.state.running = false;
    this.state.statusMessage = 'Đã dừng farm Badge / Giờ chơi';
    this.onStateChange();
  }

  private async loadWin32Games(): Promise<SpoofGameEntry[]> {
    const now = Date.now();
    if (this.gamesCache.length > 0 && now - this.gamesFetchedAt < 6 * 3600 * 1000) {
      return this.gamesCache;
    }

    const urls = [GAMES_CDN_URL, `${DISCORD_API_BASE}/applications/detectable`];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': DESKTOP_UA },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) continue;
        const raw = (await res.json()) as Array<{
          id?: string;
          name?: string;
          executables?: Array<{ os?: string; name?: string }>;
        }>;
        const seen = new Set<string>();
        const parsed: SpoofGameEntry[] = [];
        for (const g of raw) {
          const id = String(g.id || '');
          if (!/^\d+$/.test(id) || seen.has(id)) continue;
          const winExe = g.executables?.find((e) => e.os === 'win32' && e.name)?.name;
          if (!winExe) continue;
          seen.add(id);
          parsed.push({
            id,
            name: g.name || 'Unknown',
            exe: winExe,
          });
        }
        if (parsed.length > 0) {
          this.gamesCache = parsed;
          this.gamesFetchedAt = now;
          return parsed;
        }
      } catch {
        // try next url
      }
    }
    return this.gamesCache;
  }

  private async fetchAnalyticsToken(token: string): Promise<string> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me?with_analytics_token=true`, {
      headers: {
        Authorization: token,
        'User-Agent': DESKTOP_UA,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(`Không lấy được analytics_token (${res.status}). Kiểm tra lại Discord Token.`);
    }
    const json = (await res.json()) as { analytics_token?: string };
    if (!json.analytics_token) {
      throw new Error('Discord không trả về analytics_token.');
    }
    return json.analytics_token;
  }

  private buildScienceSuperProps(launchSignature: string, heartbeatSession: string): string {
    const props = {
      os: 'Windows',
      browser: 'Discord Client',
      release_channel: 'stable',
      client_version: CLIENT_VERSION,
      os_version: OS_VERSION,
      os_arch: 'x64',
      app_arch: 'x64',
      system_locale: 'vi',
      has_client_mods: false,
      browser_user_agent: DESKTOP_UA,
      browser_version: '42.7.1',
      os_sdk_version: '26200',
      client_build_number: CLIENT_BUILD_NUMBER,
      native_build_number: NATIVE_BUILD_NUMBER,
      client_event_source: null,
      client_app_state: 'focused',
      client_launch_id: crypto.randomUUID(),
      launch_signature: launchSignature,
      client_heartbeat_session_id: heartbeatSession,
    };
    return Buffer.from(JSON.stringify(props)).toString('base64');
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  private buildGameSessionEvents(
    game: SpoofGameEntry,
    durationMs: number,
    launchSignature: string,
    heartbeatSession: string,
    fingerprint: string
  ) {
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const start = Math.max(0, now - durationMs);

    const launchProps: Record<string, unknown> = {
      client_track_timestamp: now,
      client_heartbeat_session_id: heartbeatSession,
      event_sequence_number: this.nextSeq(),
      game: game.name,
      game_id: game.id,
      verified: true,
      elevated: false,
      is_launcher: false,
      game_platform: 'desktop',
      detection_method: 'verified_game',
      is_overlay_enabled: false,
      is_overlay_game_enabled: true,
      is_overlay_game_source: 'OOP_DEFAULT_DATABASE',
      fullscreen_type: 'UNKNOWN',
      hardware_display_count: 1,
      overlay_method: 'Disabled',
      activity_status_enabled: true,
      activity_status_shared_guilds: [],
      current_user_status: 'online',
      game_detection_enabled: true,
      executable_path: game.exe,
      voice_channel_id: null,
      voice_channel_type: null,
      voice_channel_bitrate: null,
      voice_channel_guild_id: null,
      hidden_by_distributor: false,
      game_metadata: null,
      client_performance_cpu: null,
      client_performance_memory: null,
      cpu_core_count: null,
      accessibility_features: 0,
      rendered_locale: 'vi',
      launch_signature: launchSignature,
      client_rtc_state: null,
      client_app_state: 'focused',
      client_send_timestamp: now,
    };

    if (fingerprint.trim()) {
      launchProps.executable_fingerprint = fingerprint.trim();
    }

    const hbInit = {
      type: 'running_game_heartbeat',
      properties: {
        client_track_timestamp: start,
        client_heartbeat_session_id: heartbeatSession,
        event_sequence_number: this.nextSeq(),
        game_id: game.id,
        game_name: game.name,
        game_metadata: null,
        game_executable: game.exe,
        game_detection_enabled: true,
        initial_heartbeat: true,
        final_heartbeat: false,
        game_session_id: sessionId,
        duration_tracked_ms: 0,
        rtc_connection_id: null,
        media_session_id: null,
        launch_signature: launchSignature,
        client_app_state: 'focused',
        client_send_timestamp: start,
      },
    };

    const launchEvt = {
      type: 'launch_game',
      properties: launchProps,
    };

    const hbFinal = {
      type: 'running_game_heartbeat',
      properties: {
        client_track_timestamp: now,
        client_heartbeat_session_id: heartbeatSession,
        event_sequence_number: this.nextSeq(),
        game_id: game.id,
        game_name: game.name,
        game_metadata: null,
        game_executable: game.exe,
        game_detection_enabled: true,
        initial_heartbeat: false,
        final_heartbeat: true,
        game_session_id: sessionId,
        duration_tracked_ms: durationMs,
        rtc_connection_id: null,
        media_session_id: null,
        launch_signature: launchSignature,
        client_app_state: 'focused',
        client_send_timestamp: now,
      },
    };

    return [hbInit, launchEvt, hbFinal];
  }

  public async startSpoof(params: {
    mode: 'played_count' | 'playtime_hours';
    gameLimit: number;
    hoursPerGame?: number;
    cookie?: string;
    fingerprint?: string;
  }) {
    const token = this.getToken();
    if (!token) throw new Error('Cần có Discord Token trước khi chạy Farm Badge.');
    if (this.state.running) throw new Error('Tiến trình Farm Badge đang chạy rồi.');

    if (params.cookie !== undefined && params.cookie.trim()) {
      this.setCookie(params.cookie.trim());
    }

    const mode = params.mode === 'playtime_hours' ? 'playtime_hours' : 'played_count';
    const gameLimit = Math.min(1500, Math.max(1, Math.floor(params.gameLimit || 100)));
    const hoursPerGame = mode === 'playtime_hours' ? Math.min(24, Math.max(0.1, Number(params.hoursPerGame) || 5)) : 1 / 60;
    const baseDurationMs = mode === 'playtime_hours' ? Math.round(hoursPerGame * 3600 * 1000) : 60 * 1000;

    this.stopFlag = false;
    this.seq = 0;
    this.state = {
      ...this.state,
      running: true,
      mode,
      processedGames: 0,
      totalGames: gameLimit,
      hoursPerGame,
      totalHoursAdded: 0,
      statusMessage: 'Đang lấy analytics_token & danh sách game Discord...',
    };
    this.onStateChange();

    // Run asynchronously so HTTP request returns immediately while progress streams over SSE
    (async () => {
      try {
        const [analyticsToken, allGames] = await Promise.all([
          this.fetchAnalyticsToken(token),
          this.loadWin32Games(),
        ]);

        if (allGames.length === 0) {
          throw new Error('Không tải được danh sách game Win32 từ Discord CDN.');
        }

        const games = allGames.slice(0, gameLimit);
        this.state.totalGames = games.length;
        this.state.statusMessage = `Đang gửi Science batch (${games.length} game)...`;
        this.onLog(
          'info',
          'BadgeSpoof',
          `Bắt đầu ${mode === 'playtime_hours' ? `farm ${hoursPerGame} giờ/game` : 'farm Played Badge'} cho ${games.length} game...`
        );
        this.onStateChange();

        const hbSession = crypto.randomUUID();
        const launchSig = crypto.randomUUID();
        const superProps = this.buildScienceSuperProps(launchSig, hbSession);
        const cookie = this.getCookie();
        const fingerprint = params.fingerprint || '';

        const BATCH_SIZE = 100;
        let batchNo = 0;

        for (let i = 0; i < games.length; i += BATCH_SIZE) {
          if (this.stopFlag) break;
          batchNo += 1;
          const chunk = games.slice(i, i + BATCH_SIZE);
          const events: Array<Record<string, unknown>> = [];

          for (const g of chunk) {
            const jitter =
              mode === 'playtime_hours'
                ? Math.floor((Math.random() * 0.1 - 0.05) * baseDurationMs)
                : 0;
            const durMs = Math.max(60000, baseDurationMs + jitter);
            events.push(...this.buildGameSessionEvents(g, durMs, launchSig, hbSession, fingerprint));
          }

          const headers: Record<string, string> = {
            Accept: '*/*',
            'Accept-Language': 'vi-VN,vi;q=0.9',
            Authorization: token,
            'Content-Type': 'application/json',
            Origin: 'https://discord.com',
            Referer: 'https://discord.com/channels/@me',
            'User-Agent': DESKTOP_UA,
            'X-Debug-Options': 'bugReporterEnabled',
            'X-Discord-Locale': 'vi',
            'X-Discord-Timezone': 'Asia/Ho_Chi_Minh',
            'X-Super-Properties': superProps,
          };
          if (cookie) {
            headers.Cookie = cookie;
          }

          const res = await fetch(`${DISCORD_API_BASE}/science`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ token: analyticsToken, events }),
            signal: AbortSignal.timeout(20000),
          });

          if (res.status === 204 || res.ok) {
            this.state.processedGames += chunk.length;
            this.state.totalHoursAdded = Math.round(this.state.processedGames * hoursPerGame * 10) / 10;
            this.state.statusMessage = `Gói #${batchNo}: ${this.state.processedGames}/${games.length} game thành công`;
            this.onLog('success', 'BadgeSpoof', `Gói #${batchNo}: đã ghi nhận ${this.state.processedGames}/${games.length} game (204).`);
          } else if (res.status === 401 || res.status === 403) {
            const errTxt = await res.text().catch(() => '');
            this.state.statusMessage = `Bị từ chối (${res.status}) — Cần cập nhật Token hoặc Cookie Discord`;
            this.onLog(
              'error',
              'BadgeSpoof',
              `Gói #${batchNo} bị chặn (${res.status}): hãy dán Cookie Discord (từ DevTools) hoặc kiểm tra Token. ${errTxt.slice(0, 80)}`
            );
            break;
          } else if (res.status === 429) {
            this.onLog('warn', 'BadgeSpoof', `Gói #${batchNo} bị Rate Limit (429), tạm nghỉ 5 giây...`);
            await sleep(5000);
            i -= BATCH_SIZE;
            continue;
          } else {
            this.onLog('warn', 'BadgeSpoof', `Gói #${batchNo} trả về mã ${res.status}.`);
          }

          this.onStateChange();
          await sleep(800 + Math.floor(Math.random() * 1000));
        }

        if (!this.stopFlag && this.state.processedGames > 0) {
          this.state.statusMessage = `Hoàn tất ${this.state.processedGames}/${games.length} game (${this.state.totalHoursAdded} giờ)`;
          this.onLog('success', 'BadgeSpoof', this.state.statusMessage);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.state.statusMessage = `Lỗi: ${msg}`;
        this.onLog('error', 'BadgeSpoof', msg);
      } finally {
        this.state.running = false;
        this.onStateChange();
      }
    })();
  }
}
