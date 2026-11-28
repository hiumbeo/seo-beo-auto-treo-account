import OpusScript from 'opusscript';
import {
  EndBehaviorType,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  type DiscordGatewayAdapterCreator,
  type DiscordGatewayAdapterLibraryMethods,
  type VoiceConnection,
} from '@discordjs/voice';
import type { Readable } from 'stream';

const INPUT_SAMPLE_RATE = 48000;
const OUTPUT_SAMPLE_RATE = 24000;
const OUTPUT_CHANNELS = 1;
const FRAME_SAMPLES_24K = 480; // 20ms at 24kHz mono
const MAX_CHUNK_SECONDS = 180; // ~8.64 MB WAV (safely under 10 MB Discord Webhook limit)
const MAX_RECORDING_SAMPLES = OUTPUT_SAMPLE_RATE * (MAX_CHUNK_SECONDS + 2);
const MAX_STORED_RECORDINGS = 6;

export interface VoiceRecordingClipPublic {
  id: string;
  channelId: string;
  channelName?: string;
  guildId?: string;
  guildName?: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  sizeBytes: number;
  speakers: Array<{ id: string; label: string }>;
  webhookSent: boolean;
  webhookError?: string;
  audioRoute: string;
}

export interface VoiceRecorderPublicState {
  recording: boolean;
  status: 'idle' | 'connecting' | 'recording' | 'uploading';
  channelId: string;
  guildId: string;
  startedAt: number | null;
  elapsedSeconds: number;
  targetDurationSeconds: number;
  packetsCaptured: number;
  activeSpeakers: string[];
  estimatedBytes: number;
  lastError: string | null;
  recentRecordings: VoiceRecordingClipPublic[];
}

interface StoredRecordingClip extends VoiceRecordingClipPublic {
  wavBuffer: Buffer;
}

interface SpeakerDecoderState {
  userId: string;
  decoder: OpusScript;
  stream: Readable;
  lastSampleCursor: number;
}

export interface VoiceRecorderDeps {
  getGatewayConnected: () => boolean;
  sendGatewayPayload: (payload: unknown) => boolean;
  getWebhookUrl: () => string;
  resolveChannelMeta: (channelId: string) => { channelName?: string; guildId?: string; guildName?: string };
  resolveUserLabel: (userId: string) => string;
  onLog: (level: 'info' | 'success' | 'warn' | 'error' | 'gateway', source: string, msg: string) => void;
  onStateChange: () => void;
  onRecordingFinished?: (opts: { leaveVoiceAfter: boolean; guildId: string; channelId: string }) => void;
}

function isValidWebhookUrl(url: string): boolean {
  return /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_.-]+/i.test(
    url.trim()
  );
}

function encodeWavMono24k(samples: Int32Array, sampleCount: number): Buffer {
  const safeCount = Math.max(1, sampleCount);
  const dataBytes = safeCount * 2;
  const buf = Buffer.allocUnsafe(44 + dataBytes);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(OUTPUT_CHANNELS, 22);
  buf.writeUInt32LE(OUTPUT_SAMPLE_RATE, 24);
  buf.writeUInt32LE(OUTPUT_SAMPLE_RATE * OUTPUT_CHANNELS * 2, 28); // byte rate
  buf.writeUInt16LE(OUTPUT_CHANNELS * 2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < safeCount; i++) {
    let val = samples[i];
    if (val > 32767) val = 32767;
    else if (val < -32768) val = -32768;
    buf.writeInt16LE(val, offset);
    offset += 2;
  }

  return buf;
}

export class VoiceRecorderService {
  private deps: VoiceRecorderDeps;
  private connection: VoiceConnection | null = null;
  private adapterMethods: DiscordGatewayAdapterLibraryMethods | null = null;
  private adapterGuildKey = '';

  private recording = false;
  private status: VoiceRecorderPublicState['status'] = 'idle';
  private channelId = '';
  private guildId = '';
  private startedAt: number | null = null;
  private chunkStartedAt = 0;
  private targetDurationSeconds = 0;
  private leaveAfterStop = true;
  private selfMute = true;

  private packetsCaptured = 0;
  private speakerIds = new Set<string>();
  private speakerStates = new Map<string, SpeakerDecoderState>();
  private mixBuffer: Int32Array = new Int32Array(0);
  private maxSampleWritten = 0;
  private chunkIndex = 1;
  private lastError: string | null = null;

  private durationStopTimer: NodeJS.Timeout | null = null;
  private chunkSplitTimer: NodeJS.Timeout | null = null;
  private uiTickTimer: NodeJS.Timeout | null = null;
  private flushingChunk = false;

  private recentRecordings: StoredRecordingClip[] = [];

  constructor(deps: VoiceRecorderDeps) {
    this.deps = deps;
  }

  public isActive(): boolean {
    return this.recording || this.connection !== null;
  }

  public getState(): VoiceRecorderPublicState {
    const elapsedSeconds = this.startedAt ? Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000)) : 0;
    return {
      recording: this.recording,
      status: this.status,
      channelId: this.channelId,
      guildId: this.guildId,
      startedAt: this.startedAt,
      elapsedSeconds,
      targetDurationSeconds: this.targetDurationSeconds,
      packetsCaptured: this.packetsCaptured,
      activeSpeakers: Array.from(this.speakerIds).map((id) => this.deps.resolveUserLabel(id)),
      estimatedBytes: this.maxSampleWritten > 0 ? 44 + this.maxSampleWritten * 2 : 0,
      lastError: this.lastError,
      recentRecordings: this.recentRecordings.map(({ wavBuffer: _buf, ...pub }) => pub),
    };
  }

  public getRecordingAudio(id: string): { buffer: Buffer; filename: string } | null {
    const found = this.recentRecordings.find((r) => r.id === id);
    if (!found) return null;
    return {
      buffer: found.wavBuffer,
      filename: `voice-${found.channelId}-${found.startedAt}.wav`,
    };
  }

  public handleGatewayVoiceStateUpdate(data: unknown) {
    if (!this.adapterMethods) return;
    const vs = data as { guild_id?: string | null; channel_id?: string | null };
    const key = vs?.guild_id || '@me';
    if (this.adapterGuildKey && key === this.adapterGuildKey) {
      this.adapterMethods.onVoiceStateUpdate(data as never);
    }
  }

  public handleGatewayVoiceServerUpdate(data: unknown) {
    if (!this.adapterMethods) return;
    const srv = data as { guild_id?: string | null; channel_id?: string | null };
    const key = srv?.guild_id || '@me';
    if (this.adapterGuildKey && key === this.adapterGuildKey) {
      const normalized = srv?.guild_id ? srv : { ...srv, guild_id: '@me' };
      this.adapterMethods.onVoiceServerUpdate(normalized as never);
    }
  }

  public async startRecording(opts: {
    guildId?: string;
    channelId: string;
    durationSeconds?: number;
    leaveAfterStop?: boolean;
    selfMute?: boolean;
  }) {
    if (!this.deps.getGatewayConnected()) {
      throw new Error('Gateway chưa kết nối. Hãy khởi chạy bot trước khi ghi âm voice.');
    }
    const cleanChannelId = opts.channelId.trim();
    if (!cleanChannelId) {
      throw new Error('Cần nhập Voice Channel ID để vào phòng ghi âm.');
    }

    if (this.isActive()) {
      await this.stopRecording({ skipCallback: true, forceLeave: false });
    }

    const cleanGuildId = (opts.guildId || '').trim();
    const adapterKey = cleanGuildId || '@me';

    this.lastError = null;
    this.recording = true;
    this.status = 'connecting';
    this.channelId = cleanChannelId;
    this.guildId = cleanGuildId;
    this.adapterGuildKey = adapterKey;
    this.startedAt = Date.now();
    this.chunkStartedAt = Date.now();
    this.targetDurationSeconds = opts.durationSeconds ? Math.max(0, Math.min(3600, Math.floor(opts.durationSeconds))) : 0;
    this.leaveAfterStop = opts.leaveAfterStop !== undefined ? opts.leaveAfterStop : true;
    this.selfMute = opts.selfMute !== undefined ? opts.selfMute : true;

    this.packetsCaptured = 0;
    this.speakerIds.clear();
    this.mixBuffer = new Int32Array(MAX_RECORDING_SAMPLES);
    this.maxSampleWritten = 0;
    this.chunkIndex = 1;
    this.deps.onStateChange();

    const adapterCreator: DiscordGatewayAdapterCreator = (methods) => {
      this.adapterMethods = methods;
      return {
        sendPayload: (payload: { op: number; d?: Record<string, unknown> }) => {
          const normalized =
            payload?.op === 4 && payload.d && payload.d.guild_id === '@me'
              ? { ...payload, d: { ...payload.d, guild_id: null } }
              : payload;
          return this.deps.sendGatewayPayload(normalized);
        },
        destroy: () => {
          this.adapterMethods = null;
        },
      };
    };

    const conn = joinVoiceChannel({
      channelId: cleanChannelId,
      guildId: adapterKey,
      adapterCreator,
      selfDeaf: false, // Must stay undeafened to receive incoming voice packets
      selfMute: this.selfMute,
      daveEncryption: true,
    });

    this.connection = conn;

    conn.on('error', (err) => {
      this.lastError = err.message;
      this.deps.onLog('warn', 'VoiceRec', `Lỗi Voice Connection: ${err.message}`);
      this.deps.onStateChange();
    });

    conn.on('stateChange', (_oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        this.deps.onLog('warn', 'VoiceRec', 'Kết nối Voice Recorder bị ngắt.');
      }
    });

    try {
      await entersState(conn, VoiceConnectionStatus.Ready, 15_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = `Không kết nối được Voice RTC/DAVE (${msg})`;
      this.deps.onLog('error', 'VoiceRec', this.lastError);
      await this.cleanupConnection(true);
      this.recording = false;
      this.status = 'idle';
      this.deps.onStateChange();
      throw new Error(this.lastError);
    }

    if (!this.recording || this.connection !== conn) return;

    this.status = 'recording';
    this.chunkStartedAt = Date.now();
    this.startedAt = this.chunkStartedAt;
    this.deps.onLog(
      'success',
      'VoiceRec',
      `Đã vào kênh ${cleanChannelId} (Voice v8 + DAVE E2EE) và đang ghi âm...`
    );

    const receiver = conn.receiver;

    // Subscribe immediately for anyone already known in SSRC map or speaking
    for (const userId of receiver.speaking.users.keys()) {
      this.ensureSpeakerSubscribed(conn, userId);
    }
    receiver.speaking.on('start', (userId) => {
      if (!this.recording || this.connection !== conn) return;
      this.ensureSpeakerSubscribed(conn, userId);
    });

    if (this.targetDurationSeconds > 0) {
      this.durationStopTimer = setTimeout(() => {
        this.stopRecording().catch(() => {});
      }, this.targetDurationSeconds * 1000);
    }

    this.chunkSplitTimer = setInterval(() => {
      if (!this.recording || this.flushingChunk) return;
      const chunkElapsedSec = (Date.now() - this.chunkStartedAt) / 1000;
      if (chunkElapsedSec >= MAX_CHUNK_SECONDS) {
        this.flushAndContinueChunk().catch(() => {});
      }
    }, 5000);

    this.uiTickTimer = setInterval(() => {
      if (this.recording) {
        this.deps.onStateChange();
      }
    }, 2000);

    this.deps.onStateChange();
  }

  private ensureSpeakerSubscribed(conn: VoiceConnection, userId: string) {
    if (!userId || this.speakerStates.has(userId)) return;

    const audioStream = conn.receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.Manual },
    });

    const decoder = new OpusScript(INPUT_SAMPLE_RATE, 2, OpusScript.Application.AUDIO);
    const nowSample = Math.max(
      0,
      Math.floor(((Date.now() - this.chunkStartedAt) * OUTPUT_SAMPLE_RATE) / 1000)
    );

    const state: SpeakerDecoderState = {
      userId,
      decoder,
      stream: audioStream,
      lastSampleCursor: nowSample,
    };
    this.speakerStates.set(userId, state);

    if (!this.speakerIds.has(userId)) {
      this.speakerIds.add(userId);
      const label = this.deps.resolveUserLabel(userId);
      this.deps.onLog('info', 'VoiceRec', `Phát hiện người nói: ${label}`);
      this.deps.onStateChange();
    }

    audioStream.on('data', (opusPacket: Buffer) => {
      if (!this.recording || this.flushingChunk) return;
      if (!Buffer.isBuffer(opusPacket) || opusPacket.length === 0) return;
      // Ignore Discord Opus DTX comfort silence frame [0xf8, 0xff, 0xfe]
      if (opusPacket.length <= 3 && opusPacket[0] === 0xf8) return;

      let pcm48kStereo: Buffer;
      try {
        pcm48kStereo = state.decoder.decode(opusPacket);
      } catch {
        // Ignore transient decode failures during DAVE epoch transitions
        return;
      }

      const stereoFrames = Math.floor(pcm48kStereo.length / 4); // 2 channels * 2 bytes
      const monoSamplesCount = Math.floor(stereoFrames / 2); // 48k -> 24k (2:1)
      if (monoSamplesCount <= 0) return;

      const nowCursor = Math.max(
        0,
        Math.floor(((Date.now() - this.chunkStartedAt) * OUTPUT_SAMPLE_RATE) / 1000)
      );

      // Re-align cursor if speaker paused > 120ms, otherwise advance contiguously to avoid jitter
      let writeCursor = state.lastSampleCursor;
      if (Math.abs(nowCursor - writeCursor) > Math.floor(OUTPUT_SAMPLE_RATE * 0.12)) {
        writeCursor = nowCursor;
      }

      if (writeCursor + monoSamplesCount >= this.mixBuffer.length) {
        return;
      }

      for (let i = 0; i < monoSamplesCount; i++) {
        const byteIdx = i * 8; // 2 stereo frames * 4 bytes/frame
        const l0 = pcm48kStereo.readInt16LE(byteIdx);
        const r0 = pcm48kStereo.readInt16LE(byteIdx + 2);
        const l1 = pcm48kStereo.readInt16LE(byteIdx + 4);
        const r1 = pcm48kStereo.readInt16LE(byteIdx + 6);
        const mono = Math.round((l0 + r0 + l1 + r1) / 4);
        this.mixBuffer[writeCursor + i] += mono;
      }

      state.lastSampleCursor = writeCursor + monoSamplesCount;
      if (state.lastSampleCursor > this.maxSampleWritten) {
        this.maxSampleWritten = state.lastSampleCursor;
      }
      this.packetsCaptured += 1;
    });

    audioStream.on('error', () => {
      // ignore stream errors on disconnect
    });
  }

  private clearTimers() {
    if (this.durationStopTimer) {
      clearTimeout(this.durationStopTimer);
      this.durationStopTimer = null;
    }
    if (this.chunkSplitTimer) {
      clearInterval(this.chunkSplitTimer);
      this.chunkSplitTimer = null;
    }
    if (this.uiTickTimer) {
      clearInterval(this.uiTickTimer);
      this.uiTickTimer = null;
    }
  }

  private disposeSpeakerDecoders() {
    for (const s of this.speakerStates.values()) {
      try {
        s.stream.destroy();
      } catch {
        // ignore
      }
      try {
        s.decoder.delete();
      } catch {
        // ignore
      }
    }
    this.speakerStates.clear();
  }

  private async cleanupConnection(sendLeavePayload: boolean) {
    this.disposeSpeakerDecoders();
    const conn = this.connection;
    this.connection = null;
    if (conn) {
      try {
        conn.destroy(sendLeavePayload);
      } catch {
        // ignore
      }
    }
    if (sendLeavePayload && this.deps.getGatewayConnected()) {
      this.deps.sendGatewayPayload({
        op: 4,
        d: {
          guild_id: this.guildId || null,
          channel_id: null,
          self_mute: false,
          self_deaf: false,
        },
      });
    }
    this.adapterMethods = null;
    this.adapterGuildKey = '';
  }

  private async finalizeCurrentChunk(partLabel?: string): Promise<VoiceRecordingClipPublic | null> {
    const sampleCount = this.maxSampleWritten;
    const endedAt = Date.now();
    const startedAt = this.chunkStartedAt || endedAt;
    const speakersList = Array.from(this.speakerIds).map((id) => ({
      id,
      label: this.deps.resolveUserLabel(id),
    }));

    if (sampleCount < FRAME_SAMPLES_24K || this.packetsCaptured === 0) {
      this.deps.onLog(
        'info',
        'VoiceRec',
        'Phiên ghi âm vừa rồi không có giọng nói nào trong phòng.'
      );
      return null;
    }

    const wavBuffer = encodeWavMono24k(this.mixBuffer, sampleCount);
    const durationSeconds = Math.max(1, Math.round(sampleCount / OUTPUT_SAMPLE_RATE));
    const meta = this.deps.resolveChannelMeta(this.channelId);
    const clipId = `rec-${startedAt}-${Math.random().toString(36).slice(2, 7)}`;

    const clip: StoredRecordingClip = {
      id: clipId,
      channelId: this.channelId,
      channelName: meta.channelName,
      guildId: this.guildId || meta.guildId,
      guildName: meta.guildName,
      startedAt,
      endedAt,
      durationSeconds,
      sizeBytes: wavBuffer.byteLength,
      speakers: speakersList,
      webhookSent: false,
      audioRoute: `/api/voice/recordings/${encodeURIComponent(clipId)}/audio`,
      wavBuffer,
    };

    const webhookUrl = this.deps.getWebhookUrl().trim();
    if (isValidWebhookUrl(webhookUrl)) {
      try {
        await this.uploadClipToWebhook(webhookUrl, clip, partLabel);
        clip.webhookSent = true;
        this.deps.onLog(
          'success',
          'VoiceRec',
          `Đã gửi file ghi âm (${durationSeconds}s, ${(wavBuffer.byteLength / 1024).toFixed(0)} KB) về Webhook.`
        );
      } catch (err) {
        clip.webhookError = err instanceof Error ? err.message : String(err);
        this.lastError = clip.webhookError;
        this.deps.onLog('warn', 'VoiceRec', `Gửi Webhook thất bại: ${clip.webhookError}`);
      }
    } else {
      this.deps.onLog(
        'info',
        'VoiceRec',
        `Đã lưu bản ghi âm (${durationSeconds}s) trên web (chưa gắn Webhook URL).`
      );
    }

    this.recentRecordings.unshift(clip);
    while (this.recentRecordings.length > MAX_STORED_RECORDINGS) {
      this.recentRecordings.pop();
    }

    return {
      id: clip.id,
      channelId: clip.channelId,
      channelName: clip.channelName,
      guildId: clip.guildId,
      guildName: clip.guildName,
      startedAt: clip.startedAt,
      endedAt: clip.endedAt,
      durationSeconds: clip.durationSeconds,
      sizeBytes: clip.sizeBytes,
      speakers: clip.speakers,
      webhookSent: clip.webhookSent,
      webhookError: clip.webhookError,
      audioRoute: clip.audioRoute,
    };
  }

  private async flushAndContinueChunk() {
    if (this.flushingChunk || !this.recording) return;
    this.flushingChunk = true;
    try {
      const partLabel = `Phần ${this.chunkIndex}`;
      await this.finalizeCurrentChunk(partLabel);
      this.chunkIndex += 1;
      this.chunkStartedAt = Date.now();
      this.mixBuffer = new Int32Array(MAX_RECORDING_SAMPLES);
      this.maxSampleWritten = 0;
      this.packetsCaptured = 0;
      for (const s of this.speakerStates.values()) {
        s.lastSampleCursor = 0;
      }
    } finally {
      this.flushingChunk = false;
      this.deps.onStateChange();
    }
  }

  private async uploadClipToWebhook(
    webhookUrl: string,
    clip: StoredRecordingClip,
    partLabel?: string
  ) {
    const startSec = Math.floor(clip.startedAt / 1000);
    const loc = clip.channelName
      ? `#${clip.channelName}${clip.guildName ? ` · ${clip.guildName}` : ''}`
      : clip.guildName
      ? `${clip.guildName} · <#${clip.channelId}>`
      : `<#${clip.channelId}>`;
    const speakersStr =
      clip.speakers.length > 0 ? clip.speakers.map((s) => `<@${s.id}>`).join(', ') : 'Không rõ';

    const contentLines = [
      `**Voice Record${partLabel ? ` (${partLabel})` : ''}** (<t:${startSec}:R>) · ${loc}`,
      `**Thời lượng:** \`${clip.durationSeconds}s\` · **Người nói:** ${speakersStr}`,
    ];

    const buildForm = () => {
      const form = new FormData();
      form.append(
        'payload_json',
        JSON.stringify({
          username: 'Voice Recorder',
          content: contentLines.join('\n').slice(0, 1990),
        })
      );
      const blob = new Blob([new Uint8Array(clip.wavBuffer)], { type: 'audio/wav' });
      const filename = `voice-${clip.channelId}-${startSec}${partLabel ? `-p${this.chunkIndex}` : ''}.wav`;
      form.append('files[0]', blob, filename);
      return form;
    };

    let res = await fetch(webhookUrl, { method: 'POST', body: buildForm() });
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
      const waitMs = Math.ceil((body.retry_after || 2) * 1000) + 250;
      await new Promise((r) => setTimeout(r, waitMs));
      res = await fetch(webhookUrl, { method: 'POST', body: buildForm() });
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Discord Webhook lỗi (${res.status}): ${txt.slice(0, 120)}`);
    }
  }

  public async stopRecording(opts?: {
    skipCallback?: boolean;
    forceLeave?: boolean;
  }): Promise<VoiceRecordingClipPublic | null> {
    this.clearTimers();
    if (!this.recording && !this.connection) return null;

    this.recording = false;
    this.status = 'uploading';
    this.deps.onStateChange();

    const savedGuildId = this.guildId;
    const savedChannelId = this.channelId;
    const shouldLeave = opts?.forceLeave !== undefined ? opts.forceLeave : this.leaveAfterStop;

    const clip = await this.finalizeCurrentChunk(this.chunkIndex > 1 ? `Phần ${this.chunkIndex}` : undefined);
    await this.cleanupConnection(shouldLeave);

    this.status = 'idle';
    this.startedAt = null;
    this.maxSampleWritten = 0;
    this.mixBuffer = new Int32Array(0);
    this.deps.onStateChange();

    if (!opts?.skipCallback && this.deps.onRecordingFinished) {
      this.deps.onRecordingFinished({
        leaveVoiceAfter: shouldLeave,
        guildId: savedGuildId,
        channelId: savedChannelId,
      });
    }

    return clip;
  }
}
