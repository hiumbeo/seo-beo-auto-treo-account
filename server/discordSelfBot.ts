import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  fetchRobloxPresence,
  resolveRobloxByCookie,
  resolveRobloxByIdentifier,
  type RobloxLivePresence,
  type RobloxProfile,
} from './robloxSync.ts';
import {
  BadgeSpooferService,
  QuestAutomationService,
  extractQuestMeta,
  type BadgeSpoofPublicState,
  type QuestRunnerPublicState,
  type RawDiscordQuest,
} from './questAndBadge.ts';

export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export interface ActivityConfig {
  applicationId: string;
  gameName: string;
  executableName: string;
  iconHash: string;
  details: string;
  state: string;
  largeImageKey: string;
  largeImageText: string;
  smallImageKey: string;
  smallImageText: string;
  partySize: number;
  partyMax: number;
  useParty: boolean;
  platform: 'desktop';
  status: DiscordStatus;
  autoStreakKeeper: boolean;
  autoQuestHeartbeat: boolean;
  sendScienceTelemetry: boolean;
  useHeadlessSession: boolean;
  autoStart: boolean;
  saveTokenLocally: boolean;
  robloxSyncMode: 'always_keep_streak' | 'mirror_only' | 'off';
  robloxShowAccountInState: boolean;
  voiceGuildId: string;
  voiceChannelId: string;
  voiceSelfMute: boolean;
  voiceSelfDeaf: boolean;
  autoJoinVoice: boolean;
  autoStreamImage: boolean;
  streamImageDataUrl: string;
  enableChatCommands: boolean;
  commandPrefix: string;
  questBoostRatio: number;
  questAutoBackToVN: boolean;
  snipeWebhookUrl: string;
}

export interface RobloxAccountPublic {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  hasCookie: boolean;
  maskedCookie: string;
  presence: RobloxLivePresence | null;
}

export interface DiscordUserProfile {
  id: string;
  username: string;
  global_name: string | null;
  discriminator: string;
  avatar: string | null;
  banner: string | null;
}

export interface DetectableGame {
  id: string;
  name: string;
  icon?: string | null;
  icon_hash?: string | null;
  cover_image_hash?: string | null;
  executables: Array<{ name: string; os: string }>;
  themes?: string[];
}

export interface InventoryGameEntry {
  id: string;
  applicationId: string;
  gameName: string;
  iconHash: string | null;
  durationSeconds: number;
  streakDays: number;
  isLive: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  rawTraits: Array<{ type: number; [key: string]: unknown }>;
}

export interface DiscordQuestItem {
  id: string;
  title: string;
  gameTitle: string;
  applicationId: string;
  enrolled: boolean;
  completed: boolean;
  expiresAt: string | null;
  targetSeconds: number;
  currentSeconds: number;
  taskType: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'gateway';
  source: string;
  message: string;
}

export interface VoiceStatePublic {
  connected: boolean;
  guildId: string;
  channelId: string;
  selfMute: boolean;
  selfDeaf: boolean;
  voiceSessionId: string | null;
  voiceEndpoint: string | null;
  streamActive: boolean;
  streamKey: string | null;
  streamEndpoint: string | null;
  lastPreviewSentAt: string | null;
  streamImageUrl: string;
}

export interface SnipeAttachmentPublic {
  filename: string;
  contentType?: string;
  url: string;
  proxyUrl?: string;
  isImage: boolean;
  hasBufferedImage: boolean;
  imageRoute?: string;
}

export interface SnipedMessagePublic {
  id: string;
  channelId: string;
  channelName?: string;
  guildId?: string;
  guildName?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  content: string;
  stickers: string[];
  attachments: SnipeAttachmentPublic[];
  createdAt: number;
  deletedAt: number;
}

export interface BotPublicState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  hasToken: boolean;
  maskedToken: string;
  user: DiscordUserProfile | null;
  sessionId: string | null;
  seq: number | null;
  heartbeatIntervalMs: number | null;
  lastHeartbeatAckAt: string | null;
  pingMs: number | null;
  activityActive: boolean;
  activityStartedAt: number | null;
  headlessSessionActive: boolean;
  config: ActivityConfig;
  inventoryEntries: InventoryGameEntry[];
  lastInventorySyncAt: string | null;
  quests: DiscordQuestItem[];
  lastQuestSyncAt: string | null;
  robloxAccount: RobloxAccountPublic | null;
  voice: VoiceStatePublic;
  questRunner: QuestRunnerPublicState;
  badgeSpoof: BadgeSpoofPublicState;
  logs: LogEntry[];
  snipedMessages: SnipedMessagePublic[];
}

interface SnipeAttachment {
  url: string;
  proxyUrl?: string;
  filename: string;
  contentType?: string;
  size?: number;
  buffer?: Buffer;
}

interface CachedDiscordMessage {
  id: string;
  channelId: string;
  guildId?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string | null;
  content: string;
  attachments: SnipeAttachment[];
  stickers: string[];
  createdAt: number;
}

interface DeletedMessageEntry extends CachedDiscordMessage {
  channelName?: string;
  guildName?: string;
  deletedAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'bot-config.json');

const DISCORD_API_BASE = 'https://discord.com/api/v9';
const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg/?encoding=json&v=9';

let liveClientBuildNumber = 678976;
let lastBuildFetchAt = 0;

const CLIENT_VERSION = '1.0.9163';
const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9163 Chrome/128.0.6613.186 Electron/32.2.2 Safari/537.36';
const DEFAULT_STREAM_IMAGE_ROUTE = '/src/assets/images/stream_night_lofi_1795441628284.jpg';

async function refreshLiveBuildNumber(): Promise<number> {
  const now = Date.now();
  if (now - lastBuildFetchAt < 6 * 60 * 60 * 1000) {
    return liveClientBuildNumber;
  }
  try {
    const html = await fetch('https://discord.com/login', {
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
    }).then((r) => r.text());
    const match = html.match(/\/assets\/web\.[a-f0-9]+\.js/);
    if (match) {
      const js = await fetch(`https://discord.com${match[0]}`, {
        headers: { 'User-Agent': DESKTOP_USER_AGENT },
      }).then((r) => r.text());
      const b = js.match(/buildNumber:"(\d+)"/);
      if (b?.[1]) {
        liveClientBuildNumber = Number(b[1]);
        lastBuildFetchAt = now;
      }
    }
  } catch {
    // keep fallback build number
  }
  return liveClientBuildNumber;
}

export const ROBLOX_PRESET: ActivityConfig = {
  applicationId: '363445589247131668',
  gameName: 'Roblox',
  executableName: 'robloxplayerbeta.exe',
  iconHash: 'f2b60e350a2097289b3b0b877495e55f',
  details: '',
  state: '',
  largeImageKey: '',
  largeImageText: '',
  smallImageKey: '',
  smallImageText: '',
  partySize: 1,
  partyMax: 12,
  useParty: false,
  platform: 'desktop',
  status: 'online',
  autoStreakKeeper: true,
  autoQuestHeartbeat: true,
  sendScienceTelemetry: true,
  useHeadlessSession: true,
  autoStart: false,
  saveTokenLocally: false,
  robloxSyncMode: 'always_keep_streak',
  robloxShowAccountInState: true,
  voiceGuildId: '',
  voiceChannelId: '',
  voiceSelfMute: false,
  voiceSelfDeaf: false,
  autoJoinVoice: false,
  autoStreamImage: false,
  streamImageDataUrl: '',
  enableChatCommands: true,
  commandPrefix: '.',
  questBoostRatio: 2.5,
  questAutoBackToVN: true,
  snipeWebhookUrl: '',
};

function buildSuperPropertiesObj() {
  return {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: CLIENT_VERSION,
    os_version: '10.0.22631',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'vi',
    browser_user_agent: DESKTOP_USER_AGENT,
    browser_version: '32.2.2',
    os_sdk_version: '22631',
    client_build_number: liveClientBuildNumber,
    native_build_number: 54712,
    client_event_source: null,
  };
}

function buildSuperPropertiesBase64(): string {
  return Buffer.from(JSON.stringify(buildSuperPropertiesObj())).toString('base64');
}

function maskToken(token: string): string {
  const clean = token.trim();
  if (!clean) return '';
  if (clean.length <= 14) return `${clean.slice(0, 4)}••••`;
  return `${clean.slice(0, 8)}••••••••••••${clean.slice(-6)}`;
}

export class DiscordSelfBotManager extends EventEmitter {
  private token = '';
  private ws: WebSocket | null = null;
  private connectionState: BotPublicState['connectionState'] = 'disconnected';
  private user: DiscordUserProfile | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;
  private seq: number | null = null;
  private heartbeatIntervalMs: number | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatJitterTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatSentAt: number | null = null;
  private lastHeartbeatAckAt: string | null = null;
  private pingMs: number | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private manualStop = false;

  private activityActive = false;
  private activityStartedAt: number | null = null;
  private headlessToken: string | null = null;
  private analyticsToken: string | null = null;

  private voiceDesiredActive = false;
  private voiceConnected = false;
  private voiceSessionId: string | null = null;
  private voiceEndpoint: string | null = null;
  private voiceWs: WebSocket | null = null;
  private voiceHeartbeatTimer: NodeJS.Timeout | null = null;

  private streamDesiredActive = false;
  private streamActive = false;
  private streamKey: string | null = null;
  private streamRtcServerId: string | null = null;
  private streamEndpoint: string | null = null;
  private streamWs: WebSocket | null = null;
  private streamHeartbeatTimer: NodeJS.Timeout | null = null;
  private streamPreviewTimer: NodeJS.Timeout | null = null;
  private lastPreviewSentAt: string | null = null;

  private streakTimer: NodeJS.Timeout | null = null;
  private questTimer: NodeJS.Timeout | null = null;
  private inventorySyncTimer: NodeJS.Timeout | null = null;
  private robloxPollTimer: NodeJS.Timeout | null = null;
  private lastStreakDayUtc: string | null = null;

  private robloxProfile: RobloxProfile | null = null;
  private robloxCookie = '';
  private robloxPresence: RobloxLivePresence | null = null;
  private externalAssetCache = new Map<string, string>();

  private config: ActivityConfig = { ...ROBLOX_PRESET };
  private inventoryEntries: InventoryGameEntry[] = [];
  private lastInventorySyncAt: string | null = null;
  private quests: DiscordQuestItem[] = [];
  private lastQuestSyncAt: string | null = null;
  private logs: LogEntry[] = [];

  private detectableGamesCache: DetectableGame[] = [];
  private detectableFetchedAt = 0;

  private discordCookie = '';
  private rawQuestsCache: RawDiscordQuest[] = [];
  private questAuto: QuestAutomationService;
  private badgeSpoofer: BadgeSpooferService;

  private messageCache = new Map<string, CachedDiscordMessage>();
  private deletedMessagesByChannel = new Map<string, DeletedMessageEntry[]>();
  private guildNameCache = new Map<string, string>();
  private channelNameCache = new Map<string, { name: string; guildId?: string }>();
  private totalSnipeBufferBytes = 0;
  private subscribedGuildIds = new Set<string>();
  private subscribedChannelKeys = new Set<string>();
  private ignoredDeleteIds = new Set<string>();
  private guildSubscribeTimers: NodeJS.Timeout[] = [];

  constructor() {
    super();
    this.questAuto = new QuestAutomationService({
      getToken: () => this.token,
      getHeaders: () => this.getHeaders(),
      onLog: (level, source, msg) => this.addLog(level, source, msg),
      onProgressUpdate: (questId, currentSeconds, completed) => {
        this.quests = this.quests.map((q) =>
          q.id === questId ? { ...q, currentSeconds, completed } : q
        );
        this.emitUpdate();
      },
      onStateChange: () => this.emitUpdate(),
      onRefreshQuests: async () => {
        await this.fetchQuests();
        return this.rawQuestsCache;
      },
    });
    this.badgeSpoofer = new BadgeSpooferService({
      getToken: () => this.token,
      getCookie: () => this.discordCookie,
      setCookie: (c) => {
        this.discordCookie = c;
        this.persistState();
      },
      onLog: (level, source, msg) => this.addLog(level, source, msg),
      onStateChange: () => this.emitUpdate(),
    });
    this.loadPersistedState();
  }

  private addLog(level: LogEntry['level'], source: string, message: string) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 120) {
      this.logs.length = 120;
    }
    this.emit('update', this.getPublicState());
  }

  private emitUpdate() {
    this.emit('update', this.getPublicState());
  }

  private getHeaders(withToken = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': DESKTOP_USER_AGENT,
      'X-Super-Properties': buildSuperPropertiesBase64(),
      'X-Discord-Locale': 'vi',
      'X-Discord-Timezone': 'Asia/Ho_Chi_Minh',
      Origin: 'https://discord.com',
      Referer: 'https://discord.com/channels/@me',
    };
    if (withToken && this.token) {
      headers.Authorization = this.token;
    }
    return headers;
  }

  private loadPersistedState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as {
          config?: Partial<ActivityConfig>;
          token?: string;
          robloxProfile?: RobloxProfile | null;
          robloxCookie?: string;
          discordCookie?: string;
        };
        if (parsed.config) {
          this.config = { ...ROBLOX_PRESET, ...parsed.config, platform: 'desktop' };
          if (this.config.applicationId === '363445589241036800') {
            this.config.applicationId = ROBLOX_PRESET.applicationId;
            this.config.iconHash = ROBLOX_PRESET.iconHash;
            this.config.executableName = ROBLOX_PRESET.executableName;
          }
        }
        if (parsed.token && parsed.config?.saveTokenLocally) {
          this.token = parsed.token.trim();
        }
        if (parsed.robloxProfile) {
          this.robloxProfile = parsed.robloxProfile;
        }
        if (parsed.robloxCookie && parsed.config?.saveTokenLocally) {
          this.robloxCookie = parsed.robloxCookie.trim();
        }
        if (parsed.discordCookie && parsed.config?.saveTokenLocally) {
          this.discordCookie = parsed.discordCookie.trim();
        }
        this.addLog('info', 'System', 'Đã nạp cấu hình lưu trữ cục bộ.');
      }

      // Override or seed from environment variables (Render.com / Docker / Cloud hosting)
      const envToken = (process.env.DISCORD_TOKEN || '').trim().replace(/^["']|["']$/g, '');
      if (envToken && !this.token) {
        this.token = envToken;
        this.addLog('info', 'System', 'Đã nạp DISCORD_TOKEN từ biến môi trường.');
      }
      const envCookie = (process.env.DISCORD_COOKIE || '').trim();
      if (envCookie && !this.discordCookie) {
        this.discordCookie = envCookie;
      }
      if (process.env.AUTO_START === 'true') {
        this.config.autoStart = true;
      }
      if (process.env.VOICE_GUILD_ID?.trim()) {
        this.config.voiceGuildId = process.env.VOICE_GUILD_ID.trim();
      }
      if (process.env.VOICE_CHANNEL_ID?.trim()) {
        this.config.voiceChannelId = process.env.VOICE_CHANNEL_ID.trim();
      }
      if (process.env.AUTO_JOIN_VOICE === 'true') {
        this.config.autoJoinVoice = true;
      }
      if (process.env.AUTO_STREAM_IMAGE === 'true') {
        this.config.autoStreamImage = true;
      }
      if (process.env.COMMAND_PREFIX?.trim()) {
        this.config.commandPrefix = process.env.COMMAND_PREFIX.trim().slice(0, 5);
      }
      if (process.env.SNIPE_WEBHOOK_URL?.trim() && !this.config.snipeWebhookUrl) {
        this.config.snipeWebhookUrl = process.env.SNIPE_WEBHOOK_URL.trim();
      }
      this.config.platform = 'desktop';

      if (this.robloxProfile) {
        this.startRobloxPollingLoop();
        this.syncRobloxPresenceNow().catch(() => {});
      }

      if (this.token && this.config.autoStart) {
        this.addLog('info', 'System', 'Auto-start đang bật, tự động kết nối Discord Gateway...');
        setTimeout(() => {
          this.start(this.token, this.config).catch((err) => {
            this.addLog('error', 'AutoStart', err instanceof Error ? err.message : String(err));
          });
        }, 1200);
      }
    } catch (err) {
      this.addLog('warn', 'System', `Không đọc được file cấu hình: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private persistState() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const payload = {
        config: this.config,
        token: this.config.saveTokenLocally ? this.token : '',
        robloxProfile: this.robloxProfile,
        robloxCookie: this.config.saveTokenLocally ? this.robloxCookie : '',
        discordCookie: this.config.saveTokenLocally ? this.discordCookie : '',
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      this.addLog('warn', 'System', `Lưu cấu hình thất bại: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public getPublicState(): BotPublicState {
    return {
      connectionState: this.connectionState,
      hasToken: Boolean(this.token),
      maskedToken: maskToken(this.token),
      user: this.user,
      sessionId: this.sessionId,
      seq: this.seq,
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      lastHeartbeatAckAt: this.lastHeartbeatAckAt,
      pingMs: this.pingMs,
      activityActive: this.activityActive,
      activityStartedAt: this.activityStartedAt,
      headlessSessionActive: Boolean(this.headlessToken),
      config: { ...this.config },
      inventoryEntries: [...this.inventoryEntries],
      lastInventorySyncAt: this.lastInventorySyncAt,
      quests: [...this.quests],
      lastQuestSyncAt: this.lastQuestSyncAt,
      robloxAccount: this.robloxProfile
        ? {
            userId: this.robloxProfile.userId,
            username: this.robloxProfile.username,
            displayName: this.robloxProfile.displayName,
            avatarUrl: this.robloxProfile.avatarUrl,
            hasCookie: Boolean(this.robloxCookie),
            maskedCookie: maskToken(this.robloxCookie),
            presence: this.robloxPresence,
          }
        : null,
      voice: {
        connected: this.voiceConnected,
        guildId: this.config.voiceGuildId,
        channelId: this.config.voiceChannelId,
        selfMute: this.config.voiceSelfMute,
        selfDeaf: this.config.voiceSelfDeaf,
        voiceSessionId: this.voiceSessionId,
        voiceEndpoint: this.voiceEndpoint,
        streamActive: this.streamActive,
        streamKey: this.streamKey,
        streamEndpoint: this.streamEndpoint,
        lastPreviewSentAt: this.lastPreviewSentAt,
        streamImageUrl: this.config.streamImageDataUrl || DEFAULT_STREAM_IMAGE_ROUTE,
      },
      questRunner: this.questAuto.getState(),
      badgeSpoof: this.badgeSpoofer.getState(),
      logs: [...this.logs],
      snipedMessages: this.getSnipedMessages(),
    };
  }

  public async verifyToken(rawToken: string): Promise<DiscordUserProfile> {
    const clean = rawToken.trim().replace(/^["']|["']$/g, '').replace(/^(Bot|Bearer)\s+/i, '').trim();
    if (!clean) {
      throw new Error('Token không được để trống.');
    }
    await refreshLiveBuildNumber();
    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      method: 'GET',
      headers: {
        ...this.getHeaders(false),
        Authorization: clean,
      },
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      throw new Error(`Token không hợp lệ hoặc bị từ chối (${res.status}): ${bodyText.slice(0, 140)}`);
    }
    const profile = (await res.json()) as DiscordUserProfile;
    this.token = clean;
    this.user = profile;
    this.persistState();
    this.addLog('success', 'Auth', `Xác thực thành công: ${profile.global_name || profile.username} (@${profile.username})`);
    this.emitUpdate();
    return profile;
  }

  public clearSavedToken() {
    this.token = '';
    this.config.saveTokenLocally = false;
    this.config.autoStart = false;
    this.persistState();
    this.addLog('info', 'Auth', 'Đã xóa token khỏi bộ nhớ và tệp cấu hình.');
    this.emitUpdate();
  }

  public updateConfig(partial: Partial<ActivityConfig>) {
    this.config = { ...this.config, ...partial, platform: 'desktop' };
    this.persistState();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.activityActive) {
      this.sendPresenceUpdate();
    }
    this.emitUpdate();
  }

  public async start(rawToken?: string, partialConfig?: Partial<ActivityConfig>): Promise<BotPublicState> {
    if (partialConfig) {
      this.config = { ...this.config, ...partialConfig, platform: 'desktop' };
    } else {
      this.config.platform = 'desktop';
    }
    if (rawToken && rawToken.trim()) {
      const clean = rawToken.trim().replace(/^["']|["']$/g, '').replace(/^(Bot|Bearer)\s+/i, '').trim();
      if (clean !== this.token || !this.user) {
        await this.verifyToken(clean);
      }
    }
    if (!this.token) {
      throw new Error('Chưa có Discord Token. Vui lòng nhập Token trước khi khởi chạy.');
    }
    if (!this.user) {
      await this.verifyToken(this.token);
    }

    await refreshLiveBuildNumber();
    this.manualStop = false;
    this.activityActive = true;
    if (!this.activityStartedAt) {
      this.activityStartedAt = Date.now();
    }
    this.lastStreakDayUtc = new Date().toISOString().slice(0, 10);
    this.persistState();

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.sendPresenceUpdate();
      await this.syncPostConnectTelemetry();
    } else {
      this.connectGateway(false);
    }

    this.startBackgroundLoops();
    this.emitUpdate();
    return this.getPublicState();
  }

  public async stop(): Promise<BotPublicState> {
    this.manualStop = true;
    this.activityActive = false;
    this.activityStartedAt = null;
    this.stopBackgroundLoops();
    this.clearGuildSubscribeTimers();
    this.leaveVoice();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.headlessToken && this.token) {
      await this.deleteHeadlessSession();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // Clear presence cleanly before closing
        this.ws.send(
          JSON.stringify({
            op: 3,
            d: {
              since: null,
              activities: [],
              status: this.config.status,
              afk: false,
            },
          })
        );
      } catch {
        // ignore close send errors
      }
      this.ws.close(1000, 'Stopped by user');
    } else if (this.ws) {
      try {
        this.ws.terminate();
      } catch {
        // ignore
      }
    }

    this.clearHeartbeatTimers();
    this.ws = null;
    this.connectionState = 'disconnected';
    this.sessionId = null;
    this.seq = null;
    this.pingMs = null;
    this.addLog('info', 'Gateway', 'Đã dừng self-bot và xóa hoạt động game.');
    this.emitUpdate();
    return this.getPublicState();
  }

  private clearHeartbeatTimers() {
    if (this.heartbeatJitterTimer) {
      clearTimeout(this.heartbeatJitterTimer);
      this.heartbeatJitterTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private connectGateway(isResume: boolean) {
    this.clearHeartbeatTimers();
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.terminate();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    const targetUrl =
      isResume && this.resumeGatewayUrl
        ? `${this.resumeGatewayUrl.replace(/\/$/, '')}/?encoding=json&v=9`
        : DISCORD_GATEWAY_URL;

    this.connectionState = isResume ? 'reconnecting' : 'connecting';
    this.addLog('gateway', 'Gateway', `Đang kết nối ${isResume ? '(Resume)' : ''} tới ${targetUrl} (build ${liveClientBuildNumber})`);
    this.emitUpdate();

    const ws = new WebSocket(targetUrl, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Origin: 'https://discord.com',
      },
    });
    this.ws = ws;

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString()) as {
          op: number;
          d: unknown;
          s?: number | null;
          t?: string | null;
        };
        this.handleGatewayPayload(payload, isResume);
      } catch (err) {
        this.addLog('error', 'Gateway', `Lỗi giải mã frame: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    ws.on('close', async (code, reason) => {
      this.clearHeartbeatTimers();
      this.closeVoiceWs();
      this.closeStreamWs();
      this.voiceConnected = false;
      this.streamActive = false;
      const reasonStr = reason ? reason.toString() : '';
      this.addLog('warn', 'Gateway', `WebSocket đóng (code=${code}${reasonStr ? `, reason=${reasonStr}` : ''})`);

      if (this.manualStop) {
        this.connectionState = 'disconnected';
        this.emitUpdate();
        return;
      }

      if (code === 4004) {
        let restStillValid = false;
        try {
          const checkRes = await fetch(`${DISCORD_API_BASE}/users/@me`, {
            headers: this.getHeaders(),
          });
          restStillValid = checkRes.ok;
        } catch {
          restStillValid = false;
        }

        this.connectionState = 'disconnected';
        this.activityActive = false;
        this.sessionId = null;
        this.seq = null;
        if (!restStillValid) {
          this.user = null;
          this.addLog(
            'error',
            'Auth',
            'Token đã bị Discord vô hiệu hóa (401/4004). Hãy lấy token mới trong trình duyệt hoặc trên Discord Desktop PC.'
          );
        } else {
          this.addLog('error', 'Auth', 'Token bị Discord Gateway từ chối (4004 Authentication failed).');
        }
        this.emitUpdate();
        return;
      }

      const canResume = Boolean(this.sessionId && this.resumeGatewayUrl && code !== 4000 && code !== 4007 && code !== 4009);
      this.scheduleReconnect(canResume);
    });

    ws.on('error', (err) => {
      this.addLog('error', 'Gateway', `Lỗi socket: ${err.message}`);
    });
  }

  private scheduleReconnect(canResume: boolean) {
    if (this.manualStop) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectAttempt += 1;
    const delayMs = Math.min(30000, 1500 * Math.pow(1.6, Math.min(this.reconnectAttempt, 6)));
    this.connectionState = 'reconnecting';
    this.addLog('warn', 'Gateway', `Thử kết nối lại sau ${(delayMs / 1000).toFixed(1)}s (${canResume ? 'Resume' : 'Fresh Identify'})...`);
    this.emitUpdate();

    this.reconnectTimer = setTimeout(() => {
      this.connectGateway(canResume);
    }, delayMs);
  }

  private handleGatewayPayload(
    payload: { op: number; d: unknown; s?: number | null; t?: string | null },
    attemptedResume: boolean
  ) {
    if (typeof payload.s === 'number') {
      this.seq = payload.s;
    }

    switch (payload.op) {
      case 10: {
        // HELLO
        const d = payload.d as { heartbeat_interval: number };
        this.heartbeatIntervalMs = d.heartbeat_interval;
        this.startHeartbeatLoop(d.heartbeat_interval);
        if (attemptedResume && this.sessionId && this.seq !== null) {
          this.sendResume();
        } else {
          this.sendIdentify();
        }
        break;
      }
      case 11: {
        // HEARTBEAT_ACK
        this.lastHeartbeatAckAt = new Date().toISOString();
        if (this.lastHeartbeatSentAt) {
          this.pingMs = Date.now() - this.lastHeartbeatSentAt;
        }
        this.emitUpdate();
        break;
      }
      case 1: {
        // Immediate heartbeat request
        this.sendHeartbeat();
        break;
      }
      case 7: {
        // RECONNECT
        this.addLog('gateway', 'Gateway', 'Nhận OP 7 RECONNECT từ Discord, đang nối lại...');
        this.ws?.close(4000, 'Reconnect requested');
        break;
      }
      case 9: {
        // INVALID_SESSION
        const resumable = Boolean(payload.d);
        this.addLog('warn', 'Gateway', `Nhận OP 9 INVALID_SESSION (resumable=${resumable}).`);
        if (!resumable) {
          this.sessionId = null;
          this.seq = null;
        }
        setTimeout(() => {
          if (!this.manualStop) {
            this.connectGateway(resumable);
          }
        }, 2500);
        break;
      }
      case 0: {
        // DISPATCH
        this.handleDispatch(payload.t || '', payload.d);
        break;
      }
    }
  }

  private startHeartbeatLoop(intervalMs: number) {
    this.clearHeartbeatTimers();
    const jitter = Math.floor(intervalMs * (0.15 + Math.random() * 0.45));
    this.heartbeatJitterTimer = setTimeout(() => {
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, intervalMs);
    }, jitter);
  }

  private sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.lastHeartbeatSentAt = Date.now();
    this.ws.send(JSON.stringify({ op: 1, d: this.seq }));
  }

  private buildPresenceActivity(): Record<string, unknown> {
    const startTs = this.activityStartedAt || Date.now();
    const isRobloxApp = this.config.applicationId.trim() === ROBLOX_PRESET.applicationId;
    const rbxPresence = this.robloxPresence;
    const rbxSyncEnabled = Boolean(this.robloxProfile && this.config.robloxSyncMode !== 'off' && isRobloxApp);
    const inGameName =
      rbxSyncEnabled && rbxPresence?.userPresenceType === 2
        ? rbxPresence.gameName || rbxPresence.lastLocation
        : null;

    const activity: Record<string, unknown> = {
      name: this.config.gameName.trim() || 'Roblox',
      type: 0,
      application_id: this.config.applicationId.trim() || ROBLOX_PRESET.applicationId,
      timestamps: {
        start: startTs,
      },
      platform: 'desktop',
    };

    if (this.sessionId) {
      activity.session_id = this.sessionId;
    }

    if (this.config.details.trim()) {
      activity.details = this.config.details.trim();
    } else if (inGameName) {
      activity.details = `Đang chơi: ${inGameName}`;
    }

    if (this.config.state.trim()) {
      activity.state = this.config.state.trim();
    } else if (rbxSyncEnabled && this.robloxProfile && this.config.robloxShowAccountInState) {
      activity.state = `Acc: @${this.robloxProfile.username}`;
    }

    const assets: Record<string, string> = {};
    if (this.config.largeImageKey.trim()) {
      assets.large_image = this.config.largeImageKey.trim();
    } else if (inGameName && rbxPresence?.gameIconUrl) {
      const extPath = this.externalAssetCache.get(rbxPresence.gameIconUrl);
      if (extPath) {
        assets.large_image = extPath;
        assets.large_text = inGameName;
      }
    }
    if (this.config.largeImageText.trim()) assets.large_text = this.config.largeImageText.trim();
    if (this.config.smallImageKey.trim()) assets.small_image = this.config.smallImageKey.trim();
    if (this.config.smallImageText.trim()) assets.small_text = this.config.smallImageText.trim();
    if (Object.keys(assets).length > 0) {
      activity.assets = assets;
    }

    if (this.config.useParty && this.config.partyMax > 0) {
      activity.party = {
        id: `ae-${this.config.applicationId}-${this.sessionId || 'local'}`,
        size: [Math.max(1, this.config.partySize), Math.max(1, this.config.partyMax)],
      };
    }

    return activity;
  }

  private sendIdentify() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const superProps = buildSuperPropertiesObj();

    const identifyPayload = {
      op: 2,
      d: {
        token: this.token,
        // Omit PASSIVE_GUILD_UPDATE (2048/4096) so servers stream MESSAGE_CREATE & MESSAGE_DELETE immediately
        capabilities: 1021,
        properties: {
          os: superProps.os,
          browser: superProps.browser,
          device: '',
          system_locale: superProps.system_locale,
          browser_user_agent: superProps.browser_user_agent,
          browser_version: superProps.browser_version,
          os_version: superProps.os_version,
          referrer: '',
          referring_domain: '',
          referrer_current: '',
          referring_domain_current: '',
          release_channel: superProps.release_channel,
          client_build_number: superProps.client_build_number,
          client_event_source: null,
        },
        presence: {
          status: this.config.status,
          since: 0,
          activities: [],
          afk: false,
        },
        compress: false,
        client_state: {
          guild_versions: {},
        },
      },
    };

    this.ws.send(JSON.stringify(identifyPayload));
    this.addLog(
      'gateway',
      'Gateway',
      `Đã gửi OP 2 IDENTIFY (PC Discord Desktop Windows, build ${liveClientBuildNumber}).`
    );
  }

  private sendResume() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        op: 6,
        d: {
          token: this.token,
          session_id: this.sessionId,
          seq: this.seq,
        },
      })
    );
    this.addLog('gateway', 'Gateway', `Đã gửi OP 6 RESUME (seq=${this.seq}).`);
  }

  public sendPresenceUpdate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const activities = this.activityActive ? [this.buildPresenceActivity()] : [];
    const payload = {
      op: 3,
      d: {
        since: this.config.status === 'idle' ? Date.now() : 0,
        activities,
        status: this.config.status,
        afk: this.config.status === 'idle',
      },
    };
    this.ws.send(JSON.stringify(payload));
    this.addLog(
      'gateway',
      'Presence',
      this.activityActive
        ? `OP 3 PRESENCE_UPDATE -> Playing ${this.config.gameName} (AppID: ${this.config.applicationId})`
        : 'OP 3 PRESENCE_UPDATE -> Cleared activities'
    );
  }

  private handleDispatch(eventName: string, data: unknown) {
    if (eventName === 'READY') {
      const ready = data as {
        user?: DiscordUserProfile;
        session_id?: string;
        resume_gateway_url?: string;
        analytics_token?: string;
        guilds?: Array<{
          id: string;
          name?: string;
          properties?: { name?: string };
          unavailable?: boolean;
          channels?: Array<{ id: string; name?: string; type?: number }>;
        }>;
      };
      this.reconnectAttempt = 0;
      this.connectionState = 'connected';
      this.subscribedGuildIds.clear();
      this.subscribedChannelKeys.clear();
      this.clearGuildSubscribeTimers();
      if (ready.user) this.user = ready.user;
      if (ready.session_id) this.sessionId = ready.session_id;
      if (ready.resume_gateway_url) this.resumeGatewayUrl = ready.resume_gateway_url;
      if (ready.analytics_token) this.analyticsToken = ready.analytics_token;

      this.addLog(
        'success',
        'Gateway',
        `READY! Phiên PC Desktop: ${this.sessionId?.slice(0, 12)}... (${this.user?.username || 'unknown'})`
      );

      if (Array.isArray(ready.guilds) && ready.guilds.length > 0) {
        this.cacheGuildMetadata(ready.guilds);
        this.subscribeGuildsBulk(ready.guilds);
      }

      if (this.activityActive) {
        this.sendPresenceUpdate();
        this.syncPostConnectTelemetry().catch(() => {});
      }

      if (
        (this.voiceDesiredActive || this.config.autoJoinVoice) &&
        this.config.voiceGuildId &&
        this.config.voiceChannelId
      ) {
        setTimeout(() => {
          this.joinVoice({
            guildId: this.config.voiceGuildId,
            channelId: this.config.voiceChannelId,
            selfMute: this.config.voiceSelfMute,
            selfDeaf: this.config.voiceSelfDeaf,
            autoStream: this.streamDesiredActive || this.config.autoStreamImage,
          });
        }, 700);
      }

      this.emitUpdate();
    } else if (eventName === 'RESUMED') {
      this.reconnectAttempt = 0;
      this.connectionState = 'connected';
      this.addLog('success', 'Gateway', 'Phiên Gateway đã RESUME thành công.');
      if (this.activityActive) {
        this.sendPresenceUpdate();
      }
      this.emitUpdate();
    } else if (eventName === 'SESSIONS_REPLACE') {
      const sessions = Array.isArray(data) ? data : [];
      this.addLog('gateway', 'Presence', `Discord xác nhận ${sessions.length} phiên PC Desktop đồng bộ.`);
    } else if (eventName === 'VOICE_STATE_UPDATE') {
      const vs = data as {
        user_id?: string;
        guild_id?: string;
        channel_id?: string | null;
        session_id?: string;
        self_mute?: boolean;
        self_deaf?: boolean;
      };
      if (vs.user_id && this.user?.id && vs.user_id !== this.user.id) return;
      if (!vs.channel_id) {
        this.voiceConnected = false;
        this.voiceSessionId = null;
        this.voiceEndpoint = null;
        this.streamActive = false;
        this.streamKey = null;
        this.closeVoiceWs();
        this.closeStreamWs();
        this.addLog('info', 'Voice', 'Đã rời khỏi kênh thoại Discord.');
      } else {
        this.voiceConnected = true;
        if (vs.session_id) this.voiceSessionId = vs.session_id;
        if (vs.guild_id) this.config.voiceGuildId = vs.guild_id;
        this.config.voiceChannelId = vs.channel_id;
        this.addLog('success', 'Voice', `Đã vào kênh thoại ${vs.channel_id} (session ${this.voiceSessionId?.slice(0, 8)}...).`);
        if (this.voiceEndpoint && this.voiceSessionId && !this.voiceWs) {
          this.connectVoiceWs();
        }
      }
      this.emitUpdate();
    } else if (eventName === 'VOICE_SERVER_UPDATE') {
      const srv = data as { token?: string; guild_id?: string; endpoint?: string | null };
      if (!srv.endpoint || !srv.token) return;
      this.voiceEndpoint = srv.endpoint;
      this.connectVoiceWs(srv.token, srv.guild_id || this.config.voiceGuildId, srv.endpoint);
      if (this.streamDesiredActive && !this.streamActive) {
        setTimeout(() => this.sendStreamCreate(), 600);
      }
      this.emitUpdate();
    } else if (eventName === 'STREAM_CREATE') {
      const st = data as { stream_key?: string; rtc_server_id?: string; region?: string };
      if (!st.stream_key) return;
      this.streamKey = st.stream_key;
      this.streamRtcServerId = st.rtc_server_id || null;
      this.streamActive = true;
      this.addLog('success', 'Stream', `Go Live đã mở (${st.stream_key}), đang phát ảnh tĩnh...`);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            op: 22,
            d: {
              stream_key: st.stream_key,
              paused: false,
            },
          })
        );
      }

      this.uploadStreamPreview(st.stream_key).catch(() => {});
      this.startStreamPreviewLoop(st.stream_key);
      this.emitUpdate();
    } else if (eventName === 'STREAM_SERVER_UPDATE') {
      const ss = data as { stream_key?: string; token?: string; endpoint?: string | null };
      if (!ss.endpoint || !ss.token) return;
      this.streamEndpoint = ss.endpoint;
      this.connectStreamWs(ss.token, ss.endpoint);
      this.emitUpdate();
    } else if (eventName === 'STREAM_DELETE') {
      const sd = data as { stream_key?: string; reason?: string };
      this.streamActive = false;
      this.streamKey = null;
      this.streamRtcServerId = null;
      this.streamEndpoint = null;
      this.closeStreamWs();
      this.addLog('info', 'Stream', `Đã tắt Go Live${sd.reason ? ` (${sd.reason})` : ''}.`);
      this.emitUpdate();
    } else if (eventName === 'GUILD_CREATE') {
      const g = data as {
        id?: string;
        name?: string;
        properties?: { name?: string };
        channels?: Array<{ id: string; name?: string; type?: number }>;
      };
      if (g?.id) {
        this.cacheGuildMetadata([g as { id: string; name?: string; properties?: { name?: string }; channels?: Array<{ id: string; name?: string; type?: number }> }]);
        this.subscribeSingleGuild(g.id, g.channels);
      }
    } else if (eventName === 'CHANNEL_CREATE' || eventName === 'CHANNEL_UPDATE') {
      const ch = data as { id?: string; name?: string; guild_id?: string };
      if (ch?.id && ch?.name) {
        this.channelNameCache.set(ch.id, { name: ch.name, guildId: ch.guild_id });
      }
    } else if (eventName === 'MESSAGE_CREATE') {
      this.ensureChannelSubscribed(data);
      this.cacheIncomingMessage(data);
      this.handleChatCommand(data).catch((err) => {
        this.addLog('warn', 'Command', `Lỗi xử lý lệnh chat: ${err instanceof Error ? err.message : String(err)}`);
      });
    } else if (eventName === 'MESSAGE_UPDATE') {
      this.handleMessageUpdateForSnipe(data);
    } else if (eventName === 'MESSAGE_DELETE') {
      this.handleMessageDeleteForSnipe(data).catch(() => {});
    } else if (eventName === 'MESSAGE_DELETE_BULK') {
      this.handleMessageDeleteBulkForSnipe(data).catch(() => {});
    }
  }

  private async syncPostConnectTelemetry() {
    if (!this.token || !this.activityActive) return;

    if (this.config.useHeadlessSession) {
      await this.refreshHeadlessSession();
    }

    if (this.config.sendScienceTelemetry) {
      await this.sendScienceGameEvent('launch_game');
    }

    await Promise.allSettled([this.fetchContentInventory(), this.fetchQuests()]);
  }

  public async refreshHeadlessSession(): Promise<boolean> {
    if (!this.token || !this.activityActive) return false;
    try {
      const activity = this.buildPresenceActivity();
      // Remove session_id from headless-sessions request body as Discord assigns/links token
      delete activity.session_id;
      const body: Record<string, unknown> = {
        activities: [activity],
      };
      if (this.headlessToken) {
        body.token = this.headlessToken;
      }
      const res = await fetch(`${DISCORD_API_BASE}/users/@me/headless-sessions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { token?: string };
        if (json.token) {
          this.headlessToken = json.token;
        }
        this.addLog('success', 'Headless', `Headless game session đang hoạt động cho ${this.config.gameName}.`);
        this.emitUpdate();
        return true;
      } else {
        const errText = await res.text().catch(() => '');
        this.addLog('warn', 'Headless', `Headless session trả về ${res.status}: ${errText.slice(0, 120)}`);
        return false;
      }
    } catch (err) {
      this.addLog('warn', 'Headless', `Lỗi headless-sessions: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  private async deleteHeadlessSession() {
    if (!this.token || !this.headlessToken) return;
    try {
      await fetch(`${DISCORD_API_BASE}/users/@me/headless-sessions/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token: this.headlessToken }),
      });
      this.addLog('info', 'Headless', 'Đã đóng headless session.');
    } catch {
      // ignore
    } finally {
      this.headlessToken = null;
    }
  }

  public async sendScienceGameEvent(eventType: 'launch_game' | 'running_game'): Promise<boolean> {
    if (!this.token) return false;
    try {
      const nowMs = Date.now();
      const payload = {
        token: this.analyticsToken || undefined,
        events: [
          {
            type: eventType,
            properties: {
              client_send_timestamp: nowMs,
              client_track_timestamp: nowMs,
              game_id: this.config.applicationId,
              game_name: this.config.gameName,
              game_platform: 'desktop',
              executable_name: this.config.executableName || 'RobloxPlayerBeta.exe',
              distributor: null,
              is_launcher: false,
              detection_method: 'process',
            },
          },
        ],
      };

      const res = await fetch(`${DISCORD_API_BASE}/science`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 204 || res.ok) {
        this.addLog('info', 'Telemetry', `Đã gửi sự kiện ${eventType} (${this.config.gameName}) tới Discord Science.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async fetchContentInventory(): Promise<InventoryGameEntry[]> {
    if (!this.token) throw new Error('Cần có Discord Token để đồng bộ chuỗi chơi game.');

    const res = await fetch(`${DISCORD_API_BASE}/content-inventory/users/@me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Không đọc được Content Inventory (${res.status}): ${text.slice(0, 120)}`);
    }

    const data = (await res.json()) as {
      entries?: Array<{
        id?: string;
        content_type?: number;
        author_id?: string;
        extra?: {
          type?: string;
          application_id?: string;
          game_name?: string;
          platform?: number;
        };
        traits?: Array<{
          type: number;
          duration_seconds?: number;
          streak_count_days?: number;
          streak_count?: number;
          count?: number;
          is_live?: boolean;
          [key: string]: unknown;
        }>;
        started_at?: string;
        expires_at?: string;
      }>;
    };

    const entries = Array.isArray(data.entries) ? data.entries : [];
    const parsed: InventoryGameEntry[] = [];

    for (const item of entries) {
      const appId = item.extra?.application_id;
      const gameName = item.extra?.game_name;
      if (!appId && !gameName) continue;

      let durationSeconds = 0;
      let streakDays = 0;
      let isLive = false;

      const traits = Array.isArray(item.traits) ? item.traits : [];
      for (const trait of traits) {
        if (typeof trait.duration_seconds === 'number') {
          durationSeconds = Math.max(durationSeconds, trait.duration_seconds);
        }
        if (typeof trait.streak_count_days === 'number') {
          streakDays = Math.max(streakDays, trait.streak_count_days);
        }
        if (typeof trait.streak_count === 'number') {
          streakDays = Math.max(streakDays, trait.streak_count);
        }
        // Discord trait type 8 = STREAK_DAYS, type 5 = DURATION_SECONDS, type 1 = IS_LIVE
        if (trait.type === 8 && typeof trait.count === 'number') {
          streakDays = Math.max(streakDays, trait.count);
        }
        if (trait.type === 1 && trait.is_live) {
          isLive = true;
        }
      }

      parsed.push({
        id: item.id || `${appId}-${item.started_at || Date.now()}`,
        applicationId: appId || '',
        gameName: gameName || 'Unknown Game',
        iconHash: null,
        durationSeconds,
        streakDays,
        isLive,
        startedAt: item.started_at || null,
        expiresAt: item.expires_at || null,
        rawTraits: traits,
      });
    }

    this.inventoryEntries = parsed;
    this.lastInventorySyncAt = new Date().toISOString();
    this.addLog('info', 'Streak', `Đồng bộ Content Inventory: tìm thấy ${parsed.length} game đã ghi nhận trên tài khoản.`);
    this.emitUpdate();
    return parsed;
  }

  public async fetchQuests(): Promise<DiscordQuestItem[]> {
    if (!this.token) throw new Error('Cần có Discord Token để đọc danh sách Quest.');

    const res = await fetch(`${DISCORD_API_BASE}/quests/@me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Không đọc được Quests (${res.status}): ${text.slice(0, 120)}`);
    }

    const data = (await res.json()) as {
      quests?: RawDiscordQuest[];
    };

    const rawQuests = Array.isArray(data.quests) ? data.quests : [];
    this.rawQuestsCache = rawQuests;
    const parsed: DiscordQuestItem[] = rawQuests.map((q) => {
      const m = extractQuestMeta(q);
      return {
        id: m.id,
        title: m.title,
        gameTitle: m.gameTitle,
        applicationId: m.applicationId,
        enrolled: m.enrolled,
        completed: m.completed,
        expiresAt: m.expiresAt,
        targetSeconds: m.targetSeconds,
        currentSeconds: m.currentSeconds,
        taskType: m.taskType,
      };
    });

    this.quests = parsed;
    this.lastQuestSyncAt = new Date().toISOString();
    this.addLog('info', 'Quests', `Tìm thấy ${parsed.length} Discord Quests trên tài khoản.`);
    this.emitUpdate();
    return parsed;
  }

  public async enrollQuest(questId: string): Promise<void> {
    if (!this.token) throw new Error('Thiếu Token.');
    const cachedRaw = this.rawQuestsCache.find((q) => q.id === questId);
    if (cachedRaw) {
      const ok = await this.questAuto.enrollQuestRaw(extractQuestMeta(cachedRaw));
      if (!ok) {
        throw new Error(`Enroll Quest ${questId} không thành công.`);
      }
      await this.fetchQuests();
      return;
    }
    const res = await fetch(`${DISCORD_API_BASE}/quests/${questId}/enroll`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        location: 11,
        is_targeted: false,
        platform: 'desktop',
        device_type: 'desktop',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Enroll Quest thất bại (${res.status}): ${text.slice(0, 120)}`);
    }
    this.addLog('success', 'Quests', `Đã nhận Quest ${questId}.`);
    await this.fetchQuests();
  }

  public runAutoQuests(opts?: {
    boostRatio?: number;
    sweepRegions?: boolean;
    autoBackToVN?: boolean;
  }) {
    if (!this.token) throw new Error('Cần xác thực Discord Token trước.');
    const boostRatio = opts?.boostRatio ?? this.config.questBoostRatio ?? 2.5;
    const autoBackToVN = opts?.autoBackToVN ?? this.config.questAutoBackToVN ?? true;
    this.questAuto
      .runAllQuests({
        boostRatio,
        sweepRegions: Boolean(opts?.sweepRegions),
        autoBackToVN,
      })
      .catch((err) => {
        this.addLog('error', 'AutoQuest', err instanceof Error ? err.message : String(err));
      });
    return this.questAuto.getState();
  }

  public stopAutoQuests() {
    this.questAuto.stop();
    return this.questAuto.getState();
  }

  public sweepQuestRegions(autoBackToVN?: boolean) {
    if (!this.token) throw new Error('Cần xác thực Discord Token trước.');
    this.questAuto
      .sweepRegions({
        autoBackToVN: autoBackToVN ?? this.config.questAutoBackToVN ?? true,
      })
      .catch((err) => {
        this.addLog('error', 'AutoQuest', err instanceof Error ? err.message : String(err));
      });
    return this.questAuto.getState();
  }

  public startBadgeSpoof(params: {
    mode: 'played_count' | 'playtime_hours';
    gameLimit: number;
    hoursPerGame?: number;
    cookie?: string;
    fingerprint?: string;
  }) {
    this.badgeSpoofer.startSpoof(params);
    return this.badgeSpoofer.getState();
  }

  public stopBadgeSpoof() {
    this.badgeSpoofer.stop();
    return this.badgeSpoofer.getState();
  }

  public async sendQuestHeartbeat(questId: string, applicationId?: string): Promise<{ currentSeconds: number; completed: boolean }> {
    if (!this.token) throw new Error('Thiếu Token.');
    const appId = applicationId || this.config.applicationId;
    const res = await fetch(`${DISCORD_API_BASE}/quests/${questId}/heartbeat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        application_id: appId,
        terminal: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Quest heartbeat lỗi (${res.status}): ${text.slice(0, 120)}`);
    }
    const json = (await res.json()) as {
      completed_at?: string | null;
      progress?: Record<string, { value?: number }>;
    };
    const progressVals = Object.values(json.progress || {});
    const currentSeconds = progressVals[0]?.value || 0;
    const completed = Boolean(json.completed_at);

    this.quests = this.quests.map((q) =>
      q.id === questId ? { ...q, currentSeconds, completed } : q
    );
    this.addLog('success', 'Quests', `Quest ${questId} heartbeat -> ${Math.floor(currentSeconds)}s${completed ? ' (HOÀN THÀNH)' : ''}`);
    this.emitUpdate();
    return { currentSeconds, completed };
  }

  public async getDetectableGames(searchQuery = ''): Promise<DetectableGame[]> {
    const now = Date.now();
    if (this.detectableGamesCache.length === 0 || now - this.detectableFetchedAt > 30 * 60 * 1000) {
      try {
        const res = await fetch(`${DISCORD_API_BASE}/applications/detectable`, {
          method: 'GET',
          headers: { 'User-Agent': DESKTOP_USER_AGENT },
        });
        if (res.ok) {
          const raw = (await res.json()) as DetectableGame[];
          this.detectableGamesCache = raw;
          this.detectableFetchedAt = now;
        }
      } catch (err) {
        this.addLog('warn', 'Catalog', `Không tải được danh sách detectable games: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const featuredIds = new Set([
      '363445589247131668', // ROBLOX
      '700136079562375258', // VALORANT
      '1402418696126992445', // League of Legends
      '1402418491272986635', // Minecraft
      '762434991303950386', // Genshin Impact
      '1121201675240210523', // Honkai: Star Rail
      '1158877933042143272', // Counter-Strike 2
      '1402418703554842694', // Fortnite
    ]);

    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      const featured = this.detectableGamesCache.filter((g) => featuredIds.has(g.id));
      if (featured.length > 0) {
        return featured.sort((a, b) =>
          a.id === '363445589247131668' ? -1 : b.id === '363445589247131668' ? 1 : a.name.localeCompare(b.name)
        );
      }
      return [
        {
          id: '363445589247131668',
          name: 'ROBLOX',
          icon_hash: 'f2b60e350a2097289b3b0b877495e55f',
          executables: [{ name: 'robloxplayerbeta.exe', os: 'win32' }],
        },
        {
          id: '700136079562375258',
          name: 'VALORANT',
          icon_hash: '11f81959f4fdd76ca6c39c59eac256c1',
          executables: [{ name: 'VALORANT-Win64-Shipping.exe', os: 'win32' }],
        },
        {
          id: '1402418696126992445',
          name: 'League of Legends',
          icon_hash: '7c99428541032ac02ec6981d88b78fb7',
          executables: [{ name: 'League of Legends.exe', os: 'win32' }],
        },
        {
          id: '1402418491272986635',
          name: 'Minecraft',
          icon_hash: '166fbad351ecdd02d11a3b464748f66b',
          executables: [{ name: 'javaw.exe', os: 'win32' }],
        },
      ];
    }

    return this.detectableGamesCache
      .filter((g) => g.name.toLowerCase().includes(q) || g.id.includes(q))
      .slice(0, 40);
  }

  private startBackgroundLoops() {
    this.stopBackgroundLoops();

    // Every 4 minutes: keep headless session alive, refresh daily UTC streak boundary, send running_game science
    this.streakTimer = setInterval(async () => {
      if (!this.activityActive || !this.token) return;

      const todayUtc = new Date().toISOString().slice(0, 10);
      if (this.lastStreakDayUtc && this.lastStreakDayUtc !== todayUtc) {
        this.lastStreakDayUtc = todayUtc;
        this.activityStartedAt = Date.now();
        this.addLog('info', 'Streak', `Sang ngày mới (${todayUtc} UTC): làm mới phiên chơi để Discord ghi nhận chuỗi ngày mới.`);
        this.sendPresenceUpdate();
        if (this.config.sendScienceTelemetry) {
          await this.sendScienceGameEvent('launch_game');
        }
      } else if (this.config.sendScienceTelemetry) {
        await this.sendScienceGameEvent('running_game');
      }

      if (this.config.useHeadlessSession) {
        await this.refreshHeadlessSession();
      }
    }, 4 * 60 * 1000);

    // Every 5 minutes: read real Discord Content Inventory so streak & playtime stay up to date
    this.inventorySyncTimer = setInterval(() => {
      if (!this.activityActive || !this.token) return;
      this.fetchContentInventory().catch(() => {});
    }, 5 * 60 * 1000);

    // Every 35 seconds: auto-heartbeat any enrolled play-game Quest
    this.questTimer = setInterval(async () => {
      if (!this.activityActive || !this.token || !this.config.autoQuestHeartbeat) return;
      const activeQuests = this.quests.filter(
        (q) =>
          q.enrolled &&
          !q.completed &&
          (q.taskType.includes('PLAY') || q.applicationId === this.config.applicationId)
      );
      for (const q of activeQuests) {
        try {
          await this.sendQuestHeartbeat(q.id, q.applicationId || this.config.applicationId);
        } catch {
          // ignore per-tick errors
        }
      }
    }, 35 * 1000);
  }

  private stopBackgroundLoops() {
    if (this.streakTimer) {
      clearInterval(this.streakTimer);
      this.streakTimer = null;
    }
    if (this.inventorySyncTimer) {
      clearInterval(this.inventorySyncTimer);
      this.inventorySyncTimer = null;
    }
    if (this.questTimer) {
      clearInterval(this.questTimer);
      this.questTimer = null;
    }
  }

  public async connectRobloxAccount(params: {
    identifier?: string;
    cookie?: string;
  }): Promise<RobloxAccountPublic> {
    const cookie = params.cookie?.trim() || '';
    const identifier = params.identifier?.trim() || '';

    if (cookie) {
      const resolved = await resolveRobloxByCookie(cookie);
      this.robloxProfile = resolved.profile;
      this.robloxCookie = resolved.cookie;
      this.addLog(
        'success',
        'Roblox',
        `Đã kết nối Acc Roblox (Cookie): ${resolved.profile.displayName} (@${resolved.profile.username})`
      );
    } else if (identifier) {
      const profile = await resolveRobloxByIdentifier(identifier);
      this.robloxProfile = profile;
      this.robloxCookie = '';
      this.addLog(
        'success',
        'Roblox',
        `Đã kết nối Acc Roblox: ${profile.displayName} (@${profile.username}, ID ${profile.userId})`
      );
    } else {
      throw new Error('Vui lòng nhập Username/User ID Roblox hoặc Cookie .ROBLOSECURITY.');
    }

    this.persistState();
    this.startRobloxPollingLoop();
    await this.syncRobloxPresenceNow();
    return this.getPublicState().robloxAccount!;
  }

  public disconnectRobloxAccount() {
    if (this.robloxPollTimer) {
      clearInterval(this.robloxPollTimer);
      this.robloxPollTimer = null;
    }
    this.robloxProfile = null;
    this.robloxCookie = '';
    this.robloxPresence = null;
    this.persistState();
    this.addLog('info', 'Roblox', 'Đã ngắt kết nối tài khoản Roblox.');
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.activityActive) {
      this.sendPresenceUpdate();
    }
    this.emitUpdate();
  }

  private async resolveExternalAssetForUrl(imageUrl: string): Promise<string | null> {
    if (!this.token || !imageUrl) return null;
    const cached = this.externalAssetCache.get(imageUrl);
    if (cached) return cached;

    try {
      const res = await fetch(
        `${DISCORD_API_BASE}/applications/${ROBLOX_PRESET.applicationId}/external-assets`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ urls: [imageUrl] }),
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ url?: string; external_asset_path?: string }>;
      const pathVal = data?.[0]?.external_asset_path;
      if (pathVal) {
        const formatted = pathVal.startsWith('mp:') ? pathVal : `mp:${pathVal}`;
        this.externalAssetCache.set(imageUrl, formatted);
        return formatted;
      }
    } catch {
      // fallback to native detectable icon
    }
    return null;
  }

  public async syncRobloxPresenceNow(): Promise<RobloxLivePresence | null> {
    if (!this.robloxProfile) return null;

    const prevType = this.robloxPresence?.userPresenceType;
    const prevGame = this.robloxPresence?.gameName || this.robloxPresence?.lastLocation;

    const next = await fetchRobloxPresence(
      this.robloxProfile.userId,
      this.robloxCookie || undefined
    );
    this.robloxPresence = next;

    if (next.userPresenceType === 2 && next.gameIconUrl && this.token) {
      await this.resolveExternalAssetForUrl(next.gameIconUrl);
    }

    const nextGame = next.gameName || next.lastLocation;
    const changed = prevType !== next.userPresenceType || prevGame !== nextGame;

    if (changed) {
      const statusText =
        next.userPresenceType === 2
          ? `Đang chơi ${nextGame}`
          : next.userPresenceType === 1
          ? 'Đang online trên Web Roblox'
          : next.userPresenceType === 3
          ? 'Đang mở Roblox Studio'
          : 'Offline trên Roblox';
      this.addLog('info', 'Roblox', `@${this.robloxProfile.username}: ${statusText}`);
    }

    if (this.config.robloxSyncMode === 'mirror_only' && this.token) {
      const shouldBeActive = next.userPresenceType === 1 || next.userPresenceType === 2;
      if (shouldBeActive && !this.activityActive) {
        await this.start(undefined, {
          applicationId: ROBLOX_PRESET.applicationId,
          gameName: 'Roblox',
          executableName: ROBLOX_PRESET.executableName,
          iconHash: ROBLOX_PRESET.iconHash,
        });
      } else if (!shouldBeActive && this.activityActive && !this.manualStop) {
        this.activityActive = false;
        this.activityStartedAt = null;
        this.sendPresenceUpdate();
      } else if (changed && this.activityActive && this.ws?.readyState === WebSocket.OPEN) {
        this.sendPresenceUpdate();
      }
    } else if (changed && this.activityActive && this.ws?.readyState === WebSocket.OPEN) {
      this.sendPresenceUpdate();
    }

    this.emitUpdate();
    return next;
  }

  private startRobloxPollingLoop() {
    if (this.robloxPollTimer) {
      clearInterval(this.robloxPollTimer);
    }
    this.robloxPollTimer = setInterval(() => {
      if (!this.robloxProfile || this.config.robloxSyncMode === 'off') return;
      this.syncRobloxPresenceNow().catch(() => {});
    }, 25 * 1000);
  }

  public async fetchVoiceGuilds(): Promise<Array<{ id: string; name: string; icon: string | null }>> {
    if (!this.token) throw new Error('Cần xác thực Discord Token trước khi tải danh sách server.');
    const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Không tải được danh sách Server (${res.status}): ${text.slice(0, 120)}`);
    }
    const guilds = (await res.json()) as Array<{ id: string; name: string; icon?: string | null }>;
    return guilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon || null,
    }));
  }

  public async fetchGuildVoiceChannels(
    guildId: string
  ): Promise<Array<{ id: string; name: string; type: number; position: number }>> {
    if (!this.token) throw new Error('Cần xác thực Discord Token trước.');
    const cleanId = guildId.trim();
    if (!cleanId) throw new Error('Thiếu Guild ID.');
    const res = await fetch(`${DISCORD_API_BASE}/guilds/${cleanId}/channels`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Không tải được kênh thoại (${res.status}): ${text.slice(0, 120)}`);
    }
    const channels = (await res.json()) as Array<{
      id: string;
      name: string;
      type: number;
      position?: number;
    }>;
    return channels
      .filter((c) => c.type === 2 || c.type === 13)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        position: c.position || 0,
      }));
  }

  public joinVoice(params?: {
    guildId?: string;
    channelId?: string;
    selfMute?: boolean;
    selfDeaf?: boolean;
    autoStream?: boolean;
  }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway chưa kết nối. Hãy bấm "Khởi chạy" trước khi vào kênh thoại.');
    }
    const guildId = (params?.guildId ?? this.config.voiceGuildId).trim();
    const channelId = (params?.channelId ?? this.config.voiceChannelId).trim();
    if (!guildId || !channelId) {
      throw new Error('Vui lòng chọn Server (Guild ID) và Kênh thoại (Channel ID).');
    }

    const selfMute = params?.selfMute ?? this.config.voiceSelfMute;
    const selfDeaf = params?.selfDeaf ?? this.config.voiceSelfDeaf;

    this.config.voiceGuildId = guildId;
    this.config.voiceChannelId = channelId;
    this.config.voiceSelfMute = selfMute;
    this.config.voiceSelfDeaf = selfDeaf;
    this.voiceDesiredActive = true;
    if (params?.autoStream !== undefined) {
      this.streamDesiredActive = params.autoStream;
    }
    this.persistState();

    this.ws.send(
      JSON.stringify({
        op: 4,
        d: {
          guild_id: guildId,
          channel_id: channelId,
          self_mute: selfMute,
          self_deaf: selfDeaf,
          self_video: false,
        },
      })
    );
    this.addLog('gateway', 'Voice', `Đã gửi OP 4 VOICE_STATE_UPDATE -> Kênh ${channelId}`);
    this.emitUpdate();
  }

  public leaveVoice() {
    this.stopStreamImage();
    this.voiceDesiredActive = false;
    this.voiceConnected = false;
    this.voiceSessionId = null;
    this.voiceEndpoint = null;
    this.closeVoiceWs();

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.config.voiceGuildId) {
      try {
        this.ws.send(
          JSON.stringify({
            op: 4,
            d: {
              guild_id: this.config.voiceGuildId,
              channel_id: null,
              self_mute: false,
              self_deaf: false,
              self_video: false,
            },
          })
        );
        this.addLog('gateway', 'Voice', 'Đã gửi OP 4 rời kênh thoại.');
      } catch {
        // ignore
      }
    }
    this.emitUpdate();
  }

  public startStreamImage(customDataUrl?: string) {
    if (customDataUrl && customDataUrl.startsWith('data:image/')) {
      this.config.streamImageDataUrl = customDataUrl;
      this.persistState();
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway chưa kết nối. Hãy khởi chạy bot trước.');
    }
    if (!this.config.voiceGuildId || !this.config.voiceChannelId) {
      throw new Error('Cần chọn Server và Kênh thoại trước khi mở Go Live stream ảnh.');
    }

    this.streamDesiredActive = true;

    if (!this.voiceConnected) {
      this.joinVoice({
        guildId: this.config.voiceGuildId,
        channelId: this.config.voiceChannelId,
        selfMute: this.config.voiceSelfMute,
        selfDeaf: this.config.voiceSelfDeaf,
        autoStream: true,
      });
      return;
    }

    this.sendStreamCreate();
  }

  public stopStreamImage() {
    this.streamDesiredActive = false;
    const keyToDelete = this.streamKey;
    this.streamActive = false;
    this.streamKey = null;
    this.streamRtcServerId = null;
    this.streamEndpoint = null;
    this.closeStreamWs();

    if (this.ws && this.ws.readyState === WebSocket.OPEN && keyToDelete) {
      try {
        this.ws.send(
          JSON.stringify({
            op: 19,
            d: {
              stream_key: keyToDelete,
            },
          })
        );
        this.addLog('gateway', 'Stream', `Đã gửi OP 19 STREAM_DELETE (${keyToDelete}).`);
      } catch {
        // ignore
      }
    }
    this.emitUpdate();
  }

  public updateStreamImage(dataUrl: string) {
    if (dataUrl && !dataUrl.startsWith('data:image/')) {
      throw new Error('Ảnh stream phải ở định dạng Data URL hợp lệ (JPEG/PNG).');
    }
    this.config.streamImageDataUrl = dataUrl;
    this.persistState();
    this.addLog(
      'info',
      'Stream',
      dataUrl ? 'Đã cập nhật ảnh stream tùy chỉnh.' : 'Đã khôi phục ảnh stream mặc định.'
    );
    if (this.streamActive && this.streamKey) {
      this.uploadStreamPreview(this.streamKey).catch(() => {});
    }
    this.emitUpdate();
  }

  private sendStreamCreate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.config.voiceGuildId || !this.config.voiceChannelId) return;
    this.ws.send(
      JSON.stringify({
        op: 18,
        d: {
          type: 'guild',
          guild_id: this.config.voiceGuildId,
          channel_id: this.config.voiceChannelId,
          preferred_region: null,
        },
      })
    );
    this.addLog('gateway', 'Stream', 'Đã gửi OP 18 STREAM_CREATE (Go Live Ảnh Tĩnh).');
  }

  private connectVoiceWs(voiceToken?: string, guildId?: string, endpoint?: string) {
    const targetEndpoint = endpoint || this.voiceEndpoint;
    if (!targetEndpoint || !voiceToken || !guildId || !this.user?.id || !this.voiceSessionId) return;
    this.closeVoiceWs();

    const cleanHost = targetEndpoint.replace(/^wss?:\/\//, '').replace(/\/$/, '');
    const vws = new WebSocket(`wss://${cleanHost}/?v=4`, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Origin: 'https://discord.com',
      },
    });
    this.voiceWs = vws;

    vws.on('open', () => {
      vws.send(
        JSON.stringify({
          op: 0,
          d: {
            server_id: guildId,
            user_id: this.user!.id,
            session_id: this.voiceSessionId,
            token: voiceToken,
          },
        })
      );
    });

    vws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { op: number; d?: { heartbeat_interval?: number } };
        if (msg.op === 8 && msg.d?.heartbeat_interval) {
          if (this.voiceHeartbeatTimer) clearInterval(this.voiceHeartbeatTimer);
          this.voiceHeartbeatTimer = setInterval(() => {
            if (vws.readyState === WebSocket.OPEN) {
              vws.send(JSON.stringify({ op: 3, d: Date.now() }));
            }
          }, msg.d.heartbeat_interval);
        }
      } catch {
        // ignore
      }
    });

    vws.on('close', () => {
      if (this.voiceHeartbeatTimer) {
        clearInterval(this.voiceHeartbeatTimer);
        this.voiceHeartbeatTimer = null;
      }
    });

    vws.on('error', () => {
      // suppress noisy socket close error
    });
  }

  private closeVoiceWs() {
    if (this.voiceHeartbeatTimer) {
      clearInterval(this.voiceHeartbeatTimer);
      this.voiceHeartbeatTimer = null;
    }
    if (this.voiceWs) {
      try {
        this.voiceWs.removeAllListeners();
        this.voiceWs.terminate();
      } catch {
        // ignore
      }
      this.voiceWs = null;
    }
  }

  private connectStreamWs(streamToken: string, endpoint: string) {
    if (!this.streamRtcServerId || !this.user?.id || !this.voiceSessionId) return;
    this.closeStreamWsSocketOnly();

    const cleanHost = endpoint.replace(/^wss?:\/\//, '').replace(/\/$/, '');
    const sws = new WebSocket(`wss://${cleanHost}/?v=4`, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Origin: 'https://discord.com',
      },
    });
    this.streamWs = sws;

    sws.on('open', () => {
      sws.send(
        JSON.stringify({
          op: 0,
          d: {
            server_id: this.streamRtcServerId,
            user_id: this.user!.id,
            session_id: this.voiceSessionId,
            token: streamToken,
          },
        })
      );
      this.addLog('success', 'Stream', `Kết nối Stream RTC (${cleanHost}) thành công.`);
    });

    sws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { op: number; d?: { heartbeat_interval?: number } };
        if (msg.op === 8 && msg.d?.heartbeat_interval) {
          if (this.streamHeartbeatTimer) clearInterval(this.streamHeartbeatTimer);
          this.streamHeartbeatTimer = setInterval(() => {
            if (sws.readyState === WebSocket.OPEN) {
              sws.send(JSON.stringify({ op: 3, d: Date.now() }));
            }
          }, msg.d.heartbeat_interval);
        }
      } catch {
        // ignore
      }
    });

    sws.on('error', () => {
      // ignore
    });
  }

  private closeStreamWsSocketOnly() {
    if (this.streamHeartbeatTimer) {
      clearInterval(this.streamHeartbeatTimer);
      this.streamHeartbeatTimer = null;
    }
    if (this.streamWs) {
      try {
        this.streamWs.removeAllListeners();
        this.streamWs.terminate();
      } catch {
        // ignore
      }
      this.streamWs = null;
    }
  }

  private closeStreamWs() {
    if (this.streamPreviewTimer) {
      clearInterval(this.streamPreviewTimer);
      this.streamPreviewTimer = null;
    }
    this.closeStreamWsSocketOnly();
  }

  private startStreamPreviewLoop(streamKey: string) {
    if (this.streamPreviewTimer) clearInterval(this.streamPreviewTimer);
    this.streamPreviewTimer = setInterval(() => {
      if (!this.streamActive || this.streamKey !== streamKey) return;
      this.uploadStreamPreview(streamKey).catch(() => {});
    }, 20 * 1000);
  }

  private loadStreamImageDataUri(): string | null {
    if (this.config.streamImageDataUrl && this.config.streamImageDataUrl.startsWith('data:image/')) {
      return this.config.streamImageDataUrl;
    }
    const candidates = [
      path.resolve(process.cwd(), 'src/assets/images/stream_night_lofi_1795441628284.jpg'),
      path.resolve(process.cwd(), 'dist/src/assets/images/stream_night_lofi_1795441628284.jpg'),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const b64 = fs.readFileSync(filePath).toString('base64');
        return `data:image/jpeg;base64,${b64}`;
      }
    }
    return null;
  }

  private async uploadStreamPreview(streamKey: string) {
    if (!this.token) return;
    const thumbnail = this.loadStreamImageDataUri();
    if (!thumbnail) return;

    const res = await fetch(
      `${DISCORD_API_BASE}/streams/${encodeURIComponent(streamKey)}/preview`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ thumbnail }),
      }
    );

    if (res.ok || res.status === 204) {
      this.lastPreviewSentAt = new Date().toISOString();
      this.emitUpdate();
    } else {
      const errText = await res.text().catch(() => '');
      this.addLog('warn', 'Stream', `Cập nhật ảnh preview stream (${res.status}): ${errText.slice(0, 100)}`);
    }
  }

  private clearGuildSubscribeTimers() {
    for (const t of this.guildSubscribeTimers) {
      clearTimeout(t);
    }
    this.guildSubscribeTimers = [];
  }

  private subscribeSingleGuild(guildId: string, _channels?: Array<{ id: string; type?: number }>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !guildId) return;
    if (this.subscribedGuildIds.has(guildId)) return;
    this.subscribedGuildIds.add(guildId);

    try {
      this.ws.send(
        JSON.stringify({
          op: 14,
          d: {
            guild_id: guildId,
            typing: true,
            threads: true,
            activities: true,
            members: [],
            channels: {},
          },
        })
      );
    } catch {
      // ignore send errors
    }
  }

  private subscribeGuildsBulk(
    guilds: Array<{ id: string; unavailable?: boolean; channels?: Array<{ id: string; type?: number }> }>
  ) {
    const valid = guilds.filter((g) => g?.id && !g.unavailable);
    if (valid.length === 0) return;

    const BATCH = 30;
    for (let i = 0; i < valid.length; i += BATCH) {
      const slice = valid.slice(i, i + BATCH);
      const timer = setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const subscriptions: Record<string, Record<string, unknown>> = {};
        for (const g of slice) {
          this.subscribedGuildIds.add(g.id);
          subscriptions[g.id] = {
            typing: true,
            threads: true,
            activities: true,
          };
        }
        try {
          this.ws.send(JSON.stringify({ op: 37, d: { subscriptions } }));
        } catch {
          // ignore
        }
      }, Math.floor(i / BATCH) * 200);
      this.guildSubscribeTimers.push(timer);
    }

    this.addLog(
      'gateway',
      'Gateway',
      `Đã đăng ký theo dõi tin nhắn & xóa tin cho ${valid.length} server (OP 37).`
    );
  }

  private ensureChannelSubscribed(raw: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = raw as { guild_id?: string; channel_id?: string };
    if (!msg?.guild_id || !msg?.channel_id) return;
    const key = `${msg.guild_id}:${msg.channel_id}`;
    if (this.subscribedChannelKeys.has(key)) return;
    if (this.subscribedChannelKeys.size >= 250) {
      const oldest = this.subscribedChannelKeys.values().next().value;
      if (oldest) this.subscribedChannelKeys.delete(oldest);
    }
    this.subscribedChannelKeys.add(key);
    this.subscribedGuildIds.add(msg.guild_id);

    try {
      this.ws.send(
        JSON.stringify({
          op: 14,
          d: {
            guild_id: msg.guild_id,
            typing: true,
            threads: true,
            activities: true,
            members: [],
            channels: { [msg.channel_id]: [[0, 99]] },
          },
        })
      );
    } catch {
      // ignore
    }
  }

  private isImageAttachment(att: SnipeAttachment): boolean {
    if (att.contentType && att.contentType.toLowerCase().startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(att.filename || '');
  }

  private evictOldestSnipeBuffersIfNeeded() {
    const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
    if (this.totalSnipeBufferBytes <= MAX_TOTAL_BYTES) return;
    for (const cached of this.messageCache.values()) {
      for (const a of cached.attachments) {
        if (a.buffer) {
          this.totalSnipeBufferBytes = Math.max(0, this.totalSnipeBufferBytes - a.buffer.byteLength);
          a.buffer = undefined;
          if (this.totalSnipeBufferBytes <= MAX_TOTAL_BYTES) return;
        }
      }
    }
  }

  private cacheIncomingMessage(raw: unknown) {
    const msg = raw as {
      id?: string;
      channel_id?: string;
      guild_id?: string;
      content?: string;
      timestamp?: string;
      author?: { id?: string; username?: string; global_name?: string | null; avatar?: string | null; bot?: boolean };
      attachments?: Array<{
        url?: string;
        proxy_url?: string;
        filename?: string;
        content_type?: string;
        size?: number;
      }>;
      embeds?: Array<{
        title?: string;
        description?: string;
        image?: { url?: string; proxy_url?: string };
        thumbnail?: { url?: string; proxy_url?: string };
      }>;
      sticker_items?: Array<{ name?: string }>;
      message_snapshots?: Array<{
        message?: {
          content?: string;
          attachments?: Array<{
            url?: string;
            proxy_url?: string;
            filename?: string;
            content_type?: string;
            size?: number;
          }>;
        };
      }>;
    };
    if (!msg?.id || !msg?.channel_id || !msg?.author?.id) return;

    const rawAttachments = [
      ...(Array.isArray(msg.attachments) ? msg.attachments : []),
      ...(Array.isArray(msg.message_snapshots)
        ? msg.message_snapshots.flatMap((s) => (Array.isArray(s.message?.attachments) ? s.message.attachments : []))
        : []),
    ];

    const attachments: SnipeAttachment[] = rawAttachments
      .filter((a) => Boolean(a.url || a.proxy_url))
      .map((a) => ({
        url: a.url || a.proxy_url || '',
        proxyUrl: a.proxy_url,
        filename: a.filename || 'image.png',
        contentType: a.content_type,
        size: a.size,
      }));

    if (Array.isArray(msg.embeds)) {
      for (const emb of msg.embeds) {
        const imgUrl = emb.image?.proxy_url || emb.image?.url || emb.thumbnail?.proxy_url || emb.thumbnail?.url;
        if (imgUrl && attachments.length < 4 && !attachments.some((a) => a.url === imgUrl || a.proxyUrl === imgUrl)) {
          attachments.push({
            url: imgUrl,
            proxyUrl: imgUrl,
            filename: 'embed.png',
            contentType: 'image/png',
          });
        }
      }
    }

    const stickers = Array.isArray(msg.sticker_items)
      ? msg.sticker_items.map((s) => s.name || 'sticker').filter(Boolean)
      : [];

    let content = typeof msg.content === 'string' ? msg.content : '';
    if (!content && Array.isArray(msg.message_snapshots) && msg.message_snapshots.length > 0) {
      content = msg.message_snapshots
        .map((s) => s.message?.content || '')
        .filter(Boolean)
        .join('\n');
    }
    if (!content && Array.isArray(msg.embeds) && msg.embeds.length > 0) {
      const embText = msg.embeds
        .map((e) => [e.title, e.description].filter(Boolean).join(' — '))
        .filter(Boolean)
        .join('\n');
      if (embText) content = `[Embed] ${embText}`;
    }

    if (!content && attachments.length === 0 && stickers.length === 0) return;

    const entry: CachedDiscordMessage = {
      id: msg.id,
      channelId: msg.channel_id,
      guildId: msg.guild_id,
      authorId: msg.author.id,
      authorUsername: msg.author.username || 'unknown',
      authorDisplayName: msg.author.global_name || msg.author.username || 'Unknown',
      authorAvatar: msg.author.avatar || null,
      content,
      attachments,
      stickers,
      createdAt: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
    };

    if (this.messageCache.has(msg.id)) {
      const old = this.messageCache.get(msg.id);
      if (old) {
        for (const a of old.attachments) {
          if (a.buffer) {
            this.totalSnipeBufferBytes = Math.max(0, this.totalSnipeBufferBytes - a.buffer.byteLength);
          }
        }
      }
      this.messageCache.delete(msg.id);
    }
    this.messageCache.set(msg.id, entry);

    // Pre-cache image attachments immediately on receipt so Discord CDN deletion won't lose the photo
    const imagesToPreload = entry.attachments.filter(
      (a) => this.isImageAttachment(a) && (!a.size || a.size <= 4 * 1024 * 1024)
    );
    if (imagesToPreload.length > 0) {
      this.bufferDeletedAttachments(imagesToPreload).then(() => {
        this.evictOldestSnipeBuffersIfNeeded();
      }).catch(() => {});
    }

    while (this.messageCache.size > 5000) {
      const oldestKey = this.messageCache.keys().next().value;
      if (!oldestKey) break;
      const old = this.messageCache.get(oldestKey);
      if (old) {
        for (const a of old.attachments) {
          if (a.buffer) {
            this.totalSnipeBufferBytes = Math.max(0, this.totalSnipeBufferBytes - a.buffer.byteLength);
          }
        }
      }
      this.messageCache.delete(oldestKey);
    }
  }

  private handleMessageUpdateForSnipe(raw: unknown) {
    const msg = raw as {
      id?: string;
      content?: string;
      attachments?: Array<{
        url?: string;
        proxy_url?: string;
        filename?: string;
        content_type?: string;
        size?: number;
      }>;
    };
    if (!msg?.id) return;
    const existing = this.messageCache.get(msg.id);
    if (!existing) return;

    if (typeof msg.content === 'string') {
      existing.content = msg.content;
    }
    if (Array.isArray(msg.attachments)) {
      existing.attachments = msg.attachments
        .filter((a) => Boolean(a.url || a.proxy_url))
        .map((a) => ({
          url: a.url || a.proxy_url || '',
          proxyUrl: a.proxy_url,
          filename: a.filename || 'image.png',
          contentType: a.content_type,
          size: a.size,
        }));
    }
  }

  private async bufferDeletedAttachments(attachments: SnipeAttachment[]) {
    const MAX_SINGLE_BYTES = 6 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 24 * 1024 * 1024;

    for (const att of attachments) {
      if (att.buffer) continue;
      if (att.size && att.size > MAX_SINGLE_BYTES) continue;
      if (this.totalSnipeBufferBytes >= MAX_TOTAL_BYTES) break;

      const candidateUrls = [att.proxyUrl, att.url].filter((u): u is string => Boolean(u));
      for (const targetUrl of candidateUrls) {
        try {
          const res = await fetch(targetUrl, {
            headers: { 'User-Agent': DESKTOP_USER_AGENT },
            signal: AbortSignal.timeout(4500),
          });
          if (!res.ok) continue;
          const arrBuf = await res.arrayBuffer();
          if (arrBuf.byteLength === 0 || arrBuf.byteLength > MAX_SINGLE_BYTES) continue;
          att.buffer = Buffer.from(arrBuf);
          if (!att.contentType) {
            att.contentType = res.headers.get('content-type') || undefined;
          }
          this.totalSnipeBufferBytes += att.buffer.byteLength;
          break;
        } catch {
          // try fallback url
        }
      }
    }
  }

  private cacheGuildMetadata(
    guilds: Array<{
      id: string;
      name?: string;
      properties?: { name?: string };
      channels?: Array<{ id: string; name?: string; type?: number }>;
    }>
  ) {
    for (const g of guilds) {
      if (!g?.id) continue;
      const gName = g.properties?.name || g.name;
      if (gName) {
        this.guildNameCache.set(g.id, gName);
      }
      if (Array.isArray(g.channels)) {
        for (const ch of g.channels) {
          if (ch?.id && ch?.name) {
            this.channelNameCache.set(ch.id, { name: ch.name, guildId: g.id });
          }
        }
      }
    }
  }

  public getSnipedMessages(): SnipedMessagePublic[] {
    const out: SnipedMessagePublic[] = [];
    for (const list of this.deletedMessagesByChannel.values()) {
      for (const item of list) {
        const avatarUrl = item.authorAvatar
          ? `https://cdn.discordapp.com/avatars/${item.authorId}/${item.authorAvatar}.${item.authorAvatar.startsWith('a_') ? 'gif' : 'png'}?size=64`
          : null;
        out.push({
          id: item.id,
          channelId: item.channelId,
          channelName: item.channelName,
          guildId: item.guildId,
          guildName: item.guildName,
          authorId: item.authorId,
          authorUsername: item.authorUsername,
          authorDisplayName: item.authorDisplayName,
          authorAvatarUrl: avatarUrl,
          content: item.content,
          stickers: [...item.stickers],
          attachments: item.attachments.map((att, idx) => {
            const isImg = this.isImageAttachment(att);
            return {
              filename: att.filename,
              contentType: att.contentType,
              url: att.proxyUrl || att.url,
              proxyUrl: att.proxyUrl,
              isImage: isImg,
              hasBufferedImage: Boolean(att.buffer),
              imageRoute: isImg ? `/api/snipe/image/${encodeURIComponent(item.id)}/${idx}` : undefined,
            };
          }),
          createdAt: item.createdAt,
          deletedAt: item.deletedAt,
        });
      }
    }
    out.sort((a, b) => b.deletedAt - a.deletedAt);
    return out;
  }

  public getSnipeAttachmentData(
    messageId: string,
    index: number
  ): { buffer?: Buffer; contentType?: string; filename: string; url: string } | null {
    for (const list of this.deletedMessagesByChannel.values()) {
      const found = list.find((m) => m.id === messageId);
      if (found && found.attachments[index]) {
        const att = found.attachments[index];
        return {
          buffer: att.buffer,
          contentType: att.contentType,
          filename: att.filename,
          url: att.proxyUrl || att.url,
        };
      }
    }
    return null;
  }

  public clearSnipedMessages(channelId?: string) {
    if (channelId) {
      const list = this.deletedMessagesByChannel.get(channelId) || [];
      for (const item of list) {
        for (const a of item.attachments) {
          if (a.buffer) {
            this.totalSnipeBufferBytes = Math.max(0, this.totalSnipeBufferBytes - a.buffer.byteLength);
          }
        }
      }
      this.deletedMessagesByChannel.delete(channelId);
    } else {
      this.deletedMessagesByChannel.clear();
      this.totalSnipeBufferBytes = 0;
    }
    this.emitUpdate();
  }

  private async recordDeletedMessageId(messageId: string, channelId: string) {
    if (this.ignoredDeleteIds.has(messageId)) {
      this.ignoredDeleteIds.delete(messageId);
      this.messageCache.delete(messageId);
      return;
    }

    const cached = this.messageCache.get(messageId);
    if (!cached) return;
    this.messageCache.delete(messageId);

    if (cached.attachments.length > 0) {
      await this.bufferDeletedAttachments(cached.attachments);
    }

    const resolvedChannelId = cached.channelId || channelId;
    let cachedCh = this.channelNameCache.get(resolvedChannelId);
    if (!cachedCh && cached.guildId) {
      const info = await this.resolveChannelInfo(resolvedChannelId).catch(() => null);
      if (info?.name) {
        cachedCh = { name: info.name, guildId: info.guild_id || cached.guildId };
        this.channelNameCache.set(resolvedChannelId, cachedCh);
      }
    }

    const resolvedGuildId = cached.guildId || cachedCh?.guildId;
    const resolvedGuildName = resolvedGuildId ? this.guildNameCache.get(resolvedGuildId) : undefined;

    const deletedEntry: DeletedMessageEntry = {
      ...cached,
      channelId: resolvedChannelId,
      channelName: cachedCh?.name,
      guildId: resolvedGuildId,
      guildName: resolvedGuildName,
      deletedAt: Date.now(),
    };

    const list = this.deletedMessagesByChannel.get(deletedEntry.channelId) || [];
    list.unshift(deletedEntry);
    while (list.length > 25) {
      const removed = list.pop();
      if (removed) {
        for (const a of removed.attachments) {
          if (a.buffer) {
            this.totalSnipeBufferBytes = Math.max(0, this.totalSnipeBufferBytes - a.buffer.byteLength);
          }
        }
      }
    }
    this.deletedMessagesByChannel.set(deletedEntry.channelId, list);
    this.addLog(
      'info',
      'Snipe',
      `Đã bắt 1 tin xóa của @${deletedEntry.authorUsername} tại ${
        deletedEntry.channelName ? `#${deletedEntry.channelName}` : `kênh ${deletedEntry.channelId}`
      }`
    );
    this.sendSnipeWebhook(deletedEntry).catch(() => {});
  }

  private formatSnipeCodeblock(text: string): string {
    const clean = text.replace(/```/g, '`\u200b``');
    return `\`\`\`\n${clean}\n\`\`\``;
  }

  private formatUptime(totalSecondsInput: number): string {
    const total = Math.max(0, Math.floor(totalSecondsInput));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  }

  private isValidDiscordWebhookUrl(url: string): boolean {
    return /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_.-]+/i.test(url.trim());
  }

  public async testSnipeWebhook(overrideUrl?: string): Promise<void> {
    const targetUrl = (overrideUrl ?? this.config.snipeWebhookUrl ?? '').trim();
    if (!this.isValidDiscordWebhookUrl(targetUrl)) {
      throw new Error('Webhook URL không hợp lệ (phải có dạng https://discord.com/api/webhooks/...).');
    }
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Snipe Logger',
        content: `**Webhook Test** (<t:${Math.floor(Date.now() / 1000)}:R>):\n\`\`\`\nSnipe Webhook hoạt động bình thường.\n\`\`\``,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Discord trả lỗi Webhook (${res.status}): ${txt.slice(0, 120)}`);
    }
    this.addLog('success', 'Snipe', 'Đã gửi tin thử nghiệm tới Snipe Webhook thành công.');
  }

  private async sendSnipeWebhook(entry: DeletedMessageEntry) {
    const webhookUrl = (this.config.snipeWebhookUrl || '').trim();
    if (!this.isValidDiscordWebhookUrl(webhookUrl)) return;

    const deletedSec = Math.floor(entry.deletedAt / 1000);
    const bodyText = entry.content
      ? entry.content.slice(0, 1500)
      : entry.stickers.length > 0
      ? `[Sticker: ${entry.stickers.join(', ')}]`
      : '[No Content]';

    const loc = entry.channelName
      ? `#${entry.channelName}${entry.guildName ? ` · ${entry.guildName}` : ''}`
      : entry.guildName
      ? `${entry.guildName} · <#${entry.channelId}>`
      : `DM · <#${entry.channelId}>`;

    const avatarUrl = entry.authorAvatar
      ? `https://cdn.discordapp.com/avatars/${entry.authorId}/${entry.authorAvatar}.${entry.authorAvatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : undefined;
    const webhookUsername = `${entry.authorDisplayName} (@${entry.authorUsername})`.slice(0, 80);

    const bufferedFiles = entry.attachments
      .filter((a): a is SnipeAttachment & { buffer: Buffer } => Boolean(a.buffer && a.buffer.byteLength > 0))
      .slice(0, 4);
    const fallbackUrls = entry.attachments
      .filter((a) => !a.buffer)
      .map((a) => a.proxyUrl || a.url)
      .filter(Boolean);

    let content = `**${entry.authorUsername}** (<t:${deletedSec}:R>) · ${loc}\n${this.formatSnipeCodeblock(bodyText)}`;
    if (fallbackUrls.length > 0) {
      content = `${content}\n${fallbackUrls.join('\n')}`;
    }

    if (bufferedFiles.length > 0) {
      const form = new FormData();
      form.append(
        'payload_json',
        JSON.stringify({
          username: webhookUsername,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          content: content.slice(0, 1990),
        })
      );
      bufferedFiles.forEach((f, idx) => {
        const blob = new Blob([new Uint8Array(f.buffer)], {
          type: f.contentType || 'application/octet-stream',
        });
        form.append(`files[${idx}]`, blob, f.filename || `snipe-${idx}.png`);
      });

      const res = await fetch(webhookUrl, { method: 'POST', body: form }).catch(() => null);
      if (res && res.ok) return;
      if (res && res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
        await new Promise((r) => setTimeout(r, Math.ceil((body.retry_after || 1.5) * 1000) + 200));
        await fetch(webhookUrl, { method: 'POST', body: form }).catch(() => {});
        return;
      }
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: webhookUsername,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        content: content.slice(0, 1990),
      }),
    }).catch(() => null);
    if (res && !res.ok) {
      const txt = await res.text().catch(() => '');
      this.addLog('warn', 'Snipe', `Webhook gửi thất bại (${res.status}): ${txt.slice(0, 90)}`);
    }
  }

  private async handleMessageDeleteForSnipe(raw: unknown) {
    const evt = raw as { id?: string; channel_id?: string };
    if (!evt?.id || !evt?.channel_id) return;
    await this.recordDeletedMessageId(evt.id, evt.channel_id);
  }

  private async handleMessageDeleteBulkForSnipe(raw: unknown) {
    const evt = raw as { ids?: string[]; channel_id?: string };
    if (!Array.isArray(evt?.ids) || !evt?.channel_id) return;
    for (const id of evt.ids.slice(0, 25)) {
      await this.recordDeletedMessageId(id, evt.channel_id);
    }
  }

  private async sendChannelReply(
    channelId: string,
    content: string,
    files?: Array<{ filename: string; contentType?: string; buffer: Buffer }>,
    fallbackAttachmentUrls?: string[]
  ) {
    if (!this.token || !channelId) return;
    if (files && files.length > 0) {
      const form = new FormData();
      form.append('payload_json', JSON.stringify({ content: content.slice(0, 1990) }));
      files.forEach((f, idx) => {
        const blob = new Blob([new Uint8Array(f.buffer)], {
          type: f.contentType || 'application/octet-stream',
        });
        form.append(`files[${idx}]`, blob, f.filename || `file-${idx}.png`);
      });
      const headers = this.getHeaders();
      delete headers['Content-Type'];
      const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers,
        body: form,
      }).catch(() => null);
      if (res && res.ok) return;
      if (res && !res.ok) {
        const txt = await res.text().catch(() => '');
        this.addLog('warn', 'Command', `Gửi kèm ảnh thất bại (${res.status}), chuyển sang gửi text: ${txt.slice(0, 90)}`);
      }
      if (fallbackAttachmentUrls && fallbackAttachmentUrls.length > 0) {
        content = `${content}\n${fallbackAttachmentUrls.join('\n')}`;
      }
    }

    const safeBody = content.length > 1990 ? `${content.slice(0, 1985)}...` : content;
    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content: safeBody }),
    }).catch(() => null);
    if (res && res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
      const waitMs = Math.ceil((body.retry_after || 1.5) * 1000) + 200;
      await new Promise((r) => setTimeout(r, waitMs));
      await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ content: safeBody }),
      }).catch(() => {});
      return;
    }
    if (res && !res.ok) {
      const txt = await res.text().catch(() => '');
      this.addLog('warn', 'Command', `Không gửi được tin nhắn phản hồi (${res.status}): ${txt.slice(0, 100)}`);
    }
  }

  private async resolveChannelInfo(
    channelId: string
  ): Promise<{ id: string; guild_id?: string; name?: string; type?: number } | null> {
    if (!this.token || !channelId) return null;
    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    }).catch(() => null);
    if (!res || !res.ok) return null;
    return (await res.json()) as { id: string; guild_id?: string; name?: string; type?: number };
  }

  private async handleChatCommand(raw: unknown) {
    if (!this.config.enableChatCommands) return;
    const msg = raw as {
      id?: string;
      channel_id?: string;
      guild_id?: string;
      content?: string;
      author?: { id?: string; username?: string };
    };
    if (!msg?.channel_id || !msg?.content || !msg?.author?.id) return;
    // Strictly only execute commands from the self-bot owner's own account
    if (!this.user?.id || msg.author.id !== this.user.id) return;

    const prefix = (this.config.commandPrefix || '.').trim() || '.';
    const trimmed = msg.content.trim();
    if (!trimmed.startsWith(prefix)) return;

    const body = trimmed.slice(prefix.length).trim();
    if (!body) return;
    const parts = body.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const channelId = msg.channel_id;

    if (cmd === 'help' || cmd === 'menu' || cmd === 'cmds') {
      const helpText = [
        '```ini',
        '[ ROBLOX ACTIVITY & VOICE SELF-BOT (PC) ]',
        `${prefix}help                  - Xem danh sách lệnh`,
        `${prefix}ping                  - Xem Uptime & Ping Gateway ngắn gọn`,
        `${prefix}info                  - Xem bảng trạng thái chi tiết Bot/Voice/Stream`,
        `${prefix}join [channel_id]     - Vào kênh thoại (bỏ trống = kênh mặc định / đầu server)`,
        `${prefix}leave                 - Rời kênh thoại`,
        `${prefix}stream [channel_id]   - Vào voice và bật Go Live Stream Ảnh`,
        `${prefix}stopstream            - Tắt Go Live Stream Ảnh`,
        `${prefix}mute / ${prefix}unmute       - Tắt / Bật mic khi đang treo voice`,
        `${prefix}deaf / ${prefix}undeaf       - Tắt / Bật loa khi đang treo voice`,
        `${prefix}roblox                - Chuyển Activity về Roblox chính hãng`,
        `${prefix}game <tên hoặc ID>    - Đổi Game Activity đang chơi`,
        `${prefix}status <online|idle|dnd|invisible> - Đổi trạng thái PC`,
        `${prefix}streak                - Xem chuỗi ngày chơi game thật trên Discord`,
        `${prefix}snipe [số|@user|list] - Xem lại tin nhắn & ảnh vừa bị xóa trong kênh`,
        `${prefix}clear <số>            - Xóa nhanh N tin nhắn gần nhất của bạn trong kênh`,
        `${prefix}autoquest [x]         - Tự động nhận & hoàn thành mọi Quest (video + game)`,
        `${prefix}sweepquest            - Quét Quest toàn cầu qua 40 quốc gia`,
        `${prefix}badge <games> [giờ]   - Farm Played Games Badge hoặc Giờ chơi`,
        '```',
      ].join('\n');
      this.addLog('info', 'Command', `Đã thực thi ${prefix}${cmd}`);
      await this.sendChannelReply(channelId, helpText);
      return;
    }

    if (cmd === 'ping') {
      const uptimeText = this.formatUptime(process.uptime());
      const pingText = this.pingMs !== null ? `${this.pingMs}ms` : '--ms';
      this.addLog('info', 'Command', `${prefix}ping -> ${uptimeText} | ${pingText}`);
      await this.sendChannelReply(channelId, `**Uptime:** \`${uptimeText}\`\n**Ping:** \`${pingText}\``);
      return;
    }

    if (cmd === 'info' || cmd === 'statusbot') {
      const voiceLine = this.voiceConnected
        ? `Connected (Kênh ${this.config.voiceChannelId})`
        : 'Offline';
      const streamLine = this.streamActive
        ? `LIVE Ảnh (${this.streamKey})`
        : 'Đang tắt';
      const infoText = [
        '```yaml',
        `Uptime       : ${this.formatUptime(process.uptime())}`,
        `Ping Gateway : ${this.pingMs ?? '--'}ms`,
        `Client       : PC Discord Desktop Windows`,
        `Activity     : ${this.activityActive ? `${this.config.gameName} (${this.config.applicationId})` : 'Đang tắt'}`,
        `Voice        : ${voiceLine}`,
        `Stream Ảnh   : ${streamLine}`,
        '```',
      ].join('\n');
      this.addLog('info', 'Command', `Đã thực thi ${prefix}${cmd}`);
      await this.sendChannelReply(channelId, infoText);
      return;
    }

    if (cmd === 'join' || cmd === 'vc' || cmd === 'voice') {
      let targetChannelId = (args[0] || '').replace(/[<#>]/g, '').trim();
      let targetGuildId = msg.guild_id || this.config.voiceGuildId;

      if (targetChannelId) {
        const chInfo = await this.resolveChannelInfo(targetChannelId);
        if (chInfo?.guild_id) {
          targetGuildId = chInfo.guild_id;
        }
      } else if (this.config.voiceGuildId && this.config.voiceChannelId) {
        targetGuildId = this.config.voiceGuildId;
        targetChannelId = this.config.voiceChannelId;
      } else if (msg.guild_id) {
        const channels = await this.fetchGuildVoiceChannels(msg.guild_id).catch(() => []);
        if (channels.length > 0) {
          targetGuildId = msg.guild_id;
          targetChannelId = channels[0].id;
        }
      }

      if (!targetGuildId || !targetChannelId) {
        await this.sendChannelReply(
          channelId,
          `Không tìm thấy kênh thoại. Hãy dùng \`${prefix}join <Voice_Channel_ID>\`.`
        );
        return;
      }

      this.joinVoice({
        guildId: targetGuildId,
        channelId: targetChannelId,
        selfMute: this.config.voiceSelfMute,
        selfDeaf: this.config.voiceSelfDeaf,
      });
      this.addLog('success', 'Command', `${prefix}${cmd} -> Vào voice ${targetChannelId}`);
      await this.sendChannelReply(channelId, `Đã vào kênh thoại <#${targetChannelId}> (\`${targetChannelId}\`).`);
      return;
    }

    if (cmd === 'leave' || cmd === 'dc' || cmd === 'out') {
      this.leaveVoice();
      this.addLog('info', 'Command', `${prefix}${cmd} -> Rời kênh thoại`);
      await this.sendChannelReply(channelId, 'Đã rời kênh thoại và tắt stream.');
      return;
    }

    if (cmd === 'stream' || cmd === 'live') {
      let targetChannelId = (args[0] || '').replace(/[<#>]/g, '').trim();
      let targetGuildId = msg.guild_id || this.config.voiceGuildId;

      if (targetChannelId) {
        const chInfo = await this.resolveChannelInfo(targetChannelId);
        if (chInfo?.guild_id) {
          targetGuildId = chInfo.guild_id;
        }
        this.config.voiceGuildId = targetGuildId;
        this.config.voiceChannelId = targetChannelId;
      } else if (!this.config.voiceChannelId && msg.guild_id) {
        const channels = await this.fetchGuildVoiceChannels(msg.guild_id).catch(() => []);
        if (channels.length > 0) {
          this.config.voiceGuildId = msg.guild_id;
          this.config.voiceChannelId = channels[0].id;
        }
      }

      if (!this.config.voiceGuildId || !this.config.voiceChannelId) {
        await this.sendChannelReply(
          channelId,
          `Chưa chọn kênh thoại. Dùng \`${prefix}stream <Voice_Channel_ID>\` hoặc vào voice trước.`
        );
        return;
      }

      this.startStreamImage();
      this.addLog('success', 'Command', `${prefix}${cmd} -> Bật Go Live Stream Ảnh`);
      await this.sendChannelReply(
        channelId,
        `Đang phát Go Live Stream Ảnh tại <#${this.config.voiceChannelId}>.`
      );
      return;
    }

    if (cmd === 'stopstream' || cmd === 'unstream' || cmd === 'endlive') {
      this.stopStreamImage();
      this.addLog('info', 'Command', `${prefix}${cmd} -> Dừng stream`);
      await this.sendChannelReply(channelId, 'Đã tắt Go Live Stream Ảnh.');
      return;
    }

    if (cmd === 'mute' || cmd === 'unmute' || cmd === 'deaf' || cmd === 'undeaf') {
      if (cmd === 'mute') this.config.voiceSelfMute = true;
      if (cmd === 'unmute') this.config.voiceSelfMute = false;
      if (cmd === 'deaf') this.config.voiceSelfDeaf = true;
      if (cmd === 'undeaf') this.config.voiceSelfDeaf = false;
      this.persistState();
      if (this.voiceConnected && this.config.voiceGuildId && this.config.voiceChannelId) {
        this.joinVoice({
          guildId: this.config.voiceGuildId,
          channelId: this.config.voiceChannelId,
          selfMute: this.config.voiceSelfMute,
          selfDeaf: this.config.voiceSelfDeaf,
        });
      }
      this.emitUpdate();
      await this.sendChannelReply(
        channelId,
        `Voice: Mic=${this.config.voiceSelfMute ? 'Tắt' : 'Bật'}, Loa=${this.config.voiceSelfDeaf ? 'Tắt' : 'Bật'}.`
      );
      return;
    }

    if (cmd === 'roblox') {
      this.updateConfig({
        applicationId: ROBLOX_PRESET.applicationId,
        gameName: ROBLOX_PRESET.gameName,
        executableName: ROBLOX_PRESET.executableName,
        iconHash: ROBLOX_PRESET.iconHash,
      });
      if (!this.activityActive) {
        this.activityActive = true;
        this.activityStartedAt = Date.now();
        this.sendPresenceUpdate();
      }
      this.addLog('success', 'Command', `${prefix}roblox -> Đặt lại Roblox chính hãng`);
      await this.sendChannelReply(channelId, 'Đã bật Activity **Roblox** (PC Desktop).');
      return;
    }

    if (cmd === 'game' && args.length > 0) {
      const q = args.join(' ').trim();
      const matches = await this.getDetectableGames(q);
      if (matches.length === 0) {
        await this.sendChannelReply(channelId, `Không tìm thấy game \`${q}\` trong Discord Detectable.`);
        return;
      }
      const picked = matches[0];
      const exe =
        picked.executables?.find((e) => e.os === 'win32')?.name ||
        picked.executables?.[0]?.name ||
        `${picked.name}.exe`;
      this.updateConfig({
        applicationId: picked.id,
        gameName: picked.name,
        executableName: exe,
        iconHash: picked.icon_hash || picked.icon || '',
      });
      if (!this.activityActive) {
        this.activityActive = true;
        this.activityStartedAt = Date.now();
        this.sendPresenceUpdate();
      }
      this.addLog('success', 'Command', `${prefix}game -> ${picked.name}`);
      await this.sendChannelReply(channelId, `Đã đổi Activity sang **${picked.name}** (\`${picked.id}\`).`);
      return;
    }

    if (cmd === 'status' && args[0]) {
      const nextStatus = args[0].toLowerCase() as DiscordStatus;
      if (!['online', 'idle', 'dnd', 'invisible'].includes(nextStatus)) {
        await this.sendChannelReply(channelId, 'Trạng thái hợp lệ: `online`, `idle`, `dnd`, `invisible`.');
        return;
      }
      this.updateConfig({ status: nextStatus });
      this.addLog('info', 'Command', `${prefix}status -> ${nextStatus}`);
      await this.sendChannelReply(channelId, `Đã đổi trạng thái PC sang \`${nextStatus}\`.`);
      return;
    }

    if (cmd === 'streak') {
      const entries = await this.fetchContentInventory();
      if (entries.length === 0) {
        await this.sendChannelReply(channelId, 'Chưa có dữ liệu chuỗi game nào trong Content Inventory.');
        return;
      }
      const lines = entries.slice(0, 6).map((e) => {
        const mins = Math.floor(e.durationSeconds / 60);
        return `• ${e.gameName}: chuỗi ${e.streakDays} ngày (${mins} phút)`;
      });
      await this.sendChannelReply(channelId, `**Chuỗi Game Discord Hiện Tại:**\n${lines.join('\n')}`);
      return;
    }

    if (cmd === 'autoquest' || cmd === 'quest') {
      const ratio = args[0] ? Math.min(10, Math.max(1, parseFloat(args[0]) || 2.5)) : this.config.questBoostRatio;
      this.runAutoQuests({ boostRatio: ratio, sweepRegions: false, autoBackToVN: this.config.questAutoBackToVN });
      await this.sendChannelReply(channelId, `Đang tự động nhận & làm tất cả Discord Quest (boost x${ratio}).`);
      return;
    }

    if (cmd === 'sweepquest') {
      this.sweepQuestRegions(this.config.questAutoBackToVN);
      await this.sendChannelReply(channelId, 'Đang quét Discord Quest toàn cầu (40 khu vực)...');
      return;
    }

    if (cmd === 'badge') {
      const limit = Math.min(1500, Math.max(1, parseInt(args[0] || '100', 10) || 100));
      const hours = args[1] ? Math.min(24, Math.max(0.1, parseFloat(args[1]) || 5)) : 0;
      if (hours > 0) {
        this.startBadgeSpoof({ mode: 'playtime_hours', gameLimit: limit, hoursPerGame: hours });
        await this.sendChannelReply(channelId, `Đang farm ${limit} game × ${hours} giờ (${Math.round(limit * hours)} giờ chơi) qua Discord Science.`);
      } else {
        this.startBadgeSpoof({ mode: 'played_count', gameLimit: limit });
        await this.sendChannelReply(channelId, `Đang farm Played Games Badge cho ${limit} game Win32 qua Discord Science.`);
      }
      return;
    }

    if (cmd === 'snipe' || cmd === 's') {
      const channelDeleted = this.deletedMessagesByChannel.get(channelId) || [];
      const firstArg = (args[0] || '').trim().toLowerCase();

      if (firstArg === 'clear') {
        for (const item of channelDeleted) {
          for (const a of item.attachments) {
            if (a.buffer) {
              this.totalSnipeBufferBytes = Math.max(0, this.totalSnipeBufferBytes - a.buffer.byteLength);
            }
          }
        }
        this.deletedMessagesByChannel.delete(channelId);
        await this.sendChannelReply(channelId, 'Đã xóa lịch sử snipe trong kênh này.');
        return;
      }

      if (channelDeleted.length === 0) {
        await this.sendChannelReply(
          channelId,
          'Chưa ghi nhận tin nhắn nào bị xóa trong kênh này từ lúc bot online.'
        );
        return;
      }

      if (firstArg === 'list' || firstArg === 'ls') {
        const previewLines = channelDeleted.slice(0, 5).map((item, idx) => {
          const tsSec = Math.floor(item.deletedAt / 1000);
          const snippet = item.content
            ? item.content.replace(/\s+/g, ' ').slice(0, 80)
            : item.attachments.length > 0
            ? `[${item.attachments.length} ảnh/tệp]`
            : `[Sticker: ${item.stickers.join(', ')}]`;
          return `${idx + 1}. <@${item.authorId}> (<t:${tsSec}:T>): ${snippet}`;
        });
        await this.sendChannelReply(
          channelId,
          `**Tin nhắn đã xóa gần đây (${channelDeleted.length}):**\n${previewLines.join('\n')}`
        );
        return;
      }

      let filtered = channelDeleted;
      let targetIndex = 1;

      if (args[0]) {
        const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          const uid = mentionMatch[1];
          filtered = channelDeleted.filter((m) => m.authorId === uid);
          if (args[1] && /^\d+$/.test(args[1])) {
            targetIndex = Math.max(1, parseInt(args[1], 10));
          }
        } else if (/^\d{15,22}$/.test(args[0])) {
          const uid = args[0];
          filtered = channelDeleted.filter((m) => m.authorId === uid);
          if (args[1] && /^\d+$/.test(args[1])) {
            targetIndex = Math.max(1, parseInt(args[1], 10));
          }
        } else if (/^\d+$/.test(args[0])) {
          targetIndex = Math.max(1, parseInt(args[0], 10));
        } else {
          const q = args.join(' ').toLowerCase();
          filtered = channelDeleted.filter(
            (m) =>
              m.authorUsername.toLowerCase().includes(q) ||
              m.authorDisplayName.toLowerCase().includes(q)
          );
        }
      }

      if (filtered.length === 0) {
        await this.sendChannelReply(channelId, 'Không tìm thấy tin nhắn đã xóa nào khớp người dùng đó trong kênh này.');
        return;
      }

      const clampedIndex = Math.min(filtered.length, targetIndex);
      const target = filtered[clampedIndex - 1];
      const deletedSec = Math.floor(target.deletedAt / 1000);

      const bodyText = target.content
        ? target.content.slice(0, 1500)
        : target.stickers.length > 0
        ? `[Sticker: ${target.stickers.join(', ')}]`
        : '[No Content]';

      const lines: string[] = [
        `**${target.authorUsername}** (<t:${deletedSec}:R>):`,
        this.formatSnipeCodeblock(bodyText),
      ];

      const bufferedFiles: Array<{ filename: string; contentType?: string; buffer: Buffer }> = [];
      const fallbackUrls: string[] = [];
      const allUrls: string[] = [];

      for (const att of target.attachments) {
        const link = att.proxyUrl || att.url;
        if (link) allUrls.push(link);
        if (att.buffer) {
          bufferedFiles.push({
            filename: att.filename,
            contentType: att.contentType,
            buffer: att.buffer,
          });
        } else if (link) {
          fallbackUrls.push(link);
        }
      }

      if (fallbackUrls.length > 0) {
        lines.push(fallbackUrls.join('\n'));
      }

      this.addLog('info', 'Command', `${prefix}${cmd} -> Snipe tin của @${target.authorUsername} trong kênh ${channelId}`);
      await this.sendChannelReply(channelId, lines.join('\n'), bufferedFiles, allUrls);
      return;
    }

    if (cmd === 'clear' || cmd === 'purge' || cmd === 'del') {
      const count = Math.min(50, Math.max(1, parseInt(args[0] || '5', 10) || 5));
      const fetchRes = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages?limit=100`, {
        method: 'GET',
        headers: this.getHeaders(),
      }).catch(() => null);

      if (!fetchRes || !fetchRes.ok) {
        await this.sendChannelReply(channelId, 'Không đọc được danh sách tin nhắn trong kênh này để xóa.');
        return;
      }

      const recent = (await fetchRes.json()) as Array<{ id: string; author?: { id?: string } }>;
      const ownMessages = recent
        .filter((m) => m.author?.id === this.user?.id && m.id !== msg.id)
        .slice(0, count);

      if (msg.id) {
        this.ignoredDeleteIds.add(msg.id);
        await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/${msg.id}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
        }).catch(() => {});
      }

      let deletedCount = 0;
      for (const targetMsg of ownMessages) {
        this.ignoredDeleteIds.add(targetMsg.id);
        const delRes = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/${targetMsg.id}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
        }).catch(() => null);

        if (delRes && delRes.status === 429) {
          const body = (await delRes.json().catch(() => ({}))) as { retry_after?: number };
          const waitMs = Math.ceil(Math.max(1, body.retry_after || 2) * 1000) + 300;
          await new Promise((r) => setTimeout(r, waitMs));
          const retry = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/${targetMsg.id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
          }).catch(() => null);
          if (retry?.ok || retry?.status === 204) deletedCount++;
        } else if (delRes?.ok || delRes?.status === 204) {
          deletedCount++;
        }
        await new Promise((r) => setTimeout(r, 650));
      }

      this.addLog('info', 'Command', `${prefix}${cmd} -> Đã xóa ${deletedCount} tin nhắn của bạn ở kênh ${channelId}`);
      return;
    }
  }

  public generateStandaloneScript(): string {
    const cfg = this.config;
    const superPropsJson = JSON.stringify(buildSuperPropertiesObj());
    return `// Discord Real Game Activity & Streak Self-Bot (${cfg.gameName})
// Cài đặt dependency: npm install ws
// Chạy 24/7: DISCORD_TOKEN="token_cua_ban" node roblox-activity-bot.mjs

import WebSocket from 'ws';

const TOKEN = (process.env.DISCORD_TOKEN || '').trim();
if (!TOKEN) {
  console.error('Thiếu biến môi trường DISCORD_TOKEN. Ví dụ: DISCORD_TOKEN="..." node roblox-activity-bot.mjs');
  process.exit(1);
}

const CONFIG = {
  applicationId: ${JSON.stringify(cfg.applicationId)},
  gameName: ${JSON.stringify(cfg.gameName)},
  executableName: ${JSON.stringify(cfg.executableName || 'RobloxPlayerBeta.exe')},
  details: ${JSON.stringify(cfg.details)},
  state: ${JSON.stringify(cfg.state)},
  platform: 'desktop',
  status: ${JSON.stringify(cfg.status)},
  autoQuestHeartbeat: ${JSON.stringify(cfg.autoQuestHeartbeat)},
  sendScienceTelemetry: ${JSON.stringify(cfg.sendScienceTelemetry)},
  useHeadlessSession: ${JSON.stringify(cfg.useHeadlessSession)},
};

const API_BASE = 'https://discord.com/api/v9';
const SUPER_PROPS = ${superPropsJson};
const SUPER_PROPS_B64 = Buffer.from(JSON.stringify(SUPER_PROPS)).toString('base64');

const headers = {
  Authorization: TOKEN,
  'Content-Type': 'application/json',
  'User-Agent': SUPER_PROPS.browser_user_agent,
  'X-Super-Properties': SUPER_PROPS_B64,
  'X-Discord-Locale': 'vi',
  Origin: 'https://discord.com',
};

let ws = null;
let seq = null;
let sessionId = null;
let resumeUrl = null;
let heartbeatTimer = null;
let activityStartMs = Date.now();
let lastUtcDay = new Date().toISOString().slice(0, 10);
let headlessToken = null;

function buildActivity() {
  const act = {
    name: CONFIG.gameName,
    type: 0,
    application_id: CONFIG.applicationId,
    timestamps: { start: activityStartMs },
    platform: CONFIG.platform,
  };
  if (sessionId) act.session_id = sessionId;
  if (CONFIG.details) act.details = CONFIG.details;
  if (CONFIG.state) act.state = CONFIG.state;
  return act;
}

function sendPresence() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    op: 3,
    d: {
      since: 0,
      activities: [buildActivity()],
      status: CONFIG.status,
      afk: false,
    },
  }));
}

async function refreshHeadless() {
  if (!CONFIG.useHeadlessSession) return;
  const act = buildActivity();
  delete act.session_id;
  const res = await fetch(\`\${API_BASE}/users/@me/headless-sessions\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ activities: [act], token: headlessToken || undefined }),
  }).catch(() => null);
  if (res && res.ok) {
    const data = await res.json();
    if (data.token) headlessToken = data.token;
  }
}

async function sendScience(type) {
  if (!CONFIG.sendScienceTelemetry) return;
  const now = Date.now();
  await fetch(\`\${API_BASE}/science\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      events: [{
        type,
        properties: {
          client_send_timestamp: now,
          client_track_timestamp: now,
          game_id: CONFIG.applicationId,
          game_name: CONFIG.gameName,
          game_platform: 'desktop',
          executable_name: CONFIG.executableName,
          detection_method: 'process',
        },
      }],
    }),
  }).catch(() => {});
}

async function syncStreakAndQuests() {
  const invRes = await fetch(\`\${API_BASE}/content-inventory/users/@me\`, { headers }).catch(() => null);
  if (invRes && invRes.ok) {
    const inv = await invRes.json();
    const game = (inv.entries || []).find((e) => e.extra?.application_id === CONFIG.applicationId);
    if (game) {
      const streak = (game.traits || []).find((t) => t.streak_count_days || t.streak_count || t.type === 8);
      console.log('[Streak]', CONFIG.gameName, 'days:', streak?.streak_count_days || streak?.streak_count || streak?.count || 0);
    }
  }
  if (CONFIG.autoQuestHeartbeat) {
    const qRes = await fetch(\`\${API_BASE}/quests/@me\`, { headers }).catch(() => null);
    if (qRes && qRes.ok) {
      const qData = await qRes.json();
      for (const q of (qData.quests || [])) {
        if (q.user_status?.enrolled_at && !q.user_status?.completed_at) {
          await fetch(\`\${API_BASE}/quests/\${q.id}/heartbeat\`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ application_id: q.config?.application?.id || CONFIG.applicationId, terminal: false }),
          }).catch(() => {});
        }
      }
    }
  }
}

function connect(resume = false) {
  clearInterval(heartbeatTimer);
  const url = resume && resumeUrl ? \`\${resumeUrl}/?encoding=json&v=9\` : 'wss://gateway.discord.gg/?encoding=json&v=9';
  ws = new WebSocket(url, { headers: { 'User-Agent': SUPER_PROPS.browser_user_agent, Origin: 'https://discord.com' } });

  ws.on('message', (raw) => {
    const p = JSON.parse(raw.toString());
    if (typeof p.s === 'number') seq = p.s;

    if (p.op === 10) {
      const interval = p.d.heartbeat_interval;
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 1, d: seq }));
      }, interval);

      if (resume && sessionId) {
        ws.send(JSON.stringify({ op: 6, d: { token: TOKEN, session_id: sessionId, seq } }));
      } else {
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: TOKEN,
            capabilities: 16381,
            properties: {
              os: SUPER_PROPS.os,
              browser: SUPER_PROPS.browser,
              device: '',
              system_locale: SUPER_PROPS.system_locale,
              browser_user_agent: SUPER_PROPS.browser_user_agent,
              browser_version: SUPER_PROPS.browser_version,
              os_version: SUPER_PROPS.os_version,
              release_channel: SUPER_PROPS.release_channel,
              client_build_number: SUPER_PROPS.client_build_number,
              client_event_source: null,
            },
            presence: { status: CONFIG.status, since: 0, activities: [], afk: false },
            compress: false,
            client_state: { guild_versions: {} },
          },
        }));
      }
    } else if (p.op === 0 && p.t === 'READY') {
      sessionId = p.d.session_id;
      resumeUrl = p.d.resume_gateway_url;
      console.log('[READY]', p.d.user.username, 'Session:', sessionId);
      sendPresence();
      refreshHeadless();
      sendScience('launch_game');
      syncStreakAndQuests();
    } else if (p.op === 7) {
      ws.close(4000);
    } else if (p.op === 9) {
      sessionId = null;
      setTimeout(() => connect(false), 3000);
    }
  });

  ws.on('close', (code) => {
    clearInterval(heartbeatTimer);
    if (code === 4004) {
      console.error('Token không hợp lệ (4004).');
      process.exit(1);
    }
    setTimeout(() => connect(Boolean(sessionId && code !== 4000)), 3000);
  });
}

setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastUtcDay) {
    lastUtcDay = today;
    activityStartMs = Date.now();
    sendPresence();
    sendScience('launch_game');
  } else {
    sendScience('running_game');
  }
  refreshHeadless();
  syncStreakAndQuests();
}, 4 * 60 * 1000);

connect(false);
`;
  }
}

export const selfBotManager = new DiscordSelfBotManager();
