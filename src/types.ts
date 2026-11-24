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
}

export interface RobloxLivePresence {
  userPresenceType: 0 | 1 | 2 | 3;
  lastLocation: string;
  placeId: number | null;
  rootPlaceId: number | null;
  universeId: number | null;
  gameId: string | null;
  gameName: string | null;
  gameIconUrl: string | null;
  updatedAt: string;
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
}
