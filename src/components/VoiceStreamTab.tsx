import { useEffect, useState } from 'react';
import {
  Check,
  Download,
  Image as ImageIcon,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RefreshCw,
  RotateCcw,
  Square,
  Terminal,
  Upload,
  Volume2,
  VolumeX,
  Webhook,
} from 'lucide-react';
import type { ActivityConfig, BotPublicState } from '../types';

interface VoiceGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface VoiceChannel {
  id: string;
  name: string;
  type: number;
  position: number;
}

interface VoiceStreamTabProps {
  state: BotPublicState;
  onUpdateConfig: (partial: Partial<ActivityConfig>) => Promise<void>;
  onStateChange: (next: BotPublicState) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

function resizeImageToJpegDataUrl(file: File, maxW = 1280, maxH = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const w = Math.max(16, Math.round(img.width * scale));
        const h = Math.max(16, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không khởi tạo được canvas nén ảnh.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => reject(new Error('File ảnh không hợp lệ.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });
}

export function VoiceStreamTab({
  state,
  onUpdateConfig,
  onStateChange,
  onNotify,
  onError,
}: VoiceStreamTabProps) {
  const [guilds, setGuilds] = useState<VoiceGuild[]>([]);
  const [channels, setChannels] = useState<VoiceChannel[]>([]);
  const [guildId, setGuildId] = useState(state.config.voiceGuildId || '');
  const [channelId, setChannelId] = useState(state.config.voiceChannelId || '');
  const [selfMute, setSelfMute] = useState(state.config.voiceSelfMute);
  const [selfDeaf, setSelfDeaf] = useState(state.config.voiceSelfDeaf);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [recChannelId, setRecChannelId] = useState(state.config.voiceChannelId || '');
  const [recGuildId, setRecGuildId] = useState(state.config.voiceGuildId || '');
  const [recDuration, setRecDuration] = useState<number>(60);
  const [recLeaveAfter, setRecLeaveAfter] = useState<boolean>(true);
  const [voiceWebhookInput, setVoiceWebhookInput] = useState(state.config.voiceWebhookUrl || '');

  useEffect(() => {
    if (state.config.voiceGuildId && !guildId) setGuildId(state.config.voiceGuildId);
    if (state.config.voiceChannelId && !channelId) setChannelId(state.config.voiceChannelId);
    if (state.config.voiceChannelId && !recChannelId) setRecChannelId(state.config.voiceChannelId);
    if (state.config.voiceGuildId && !recGuildId) setRecGuildId(state.config.voiceGuildId);
    setSelfMute(state.config.voiceSelfMute);
    setSelfDeaf(state.config.voiceSelfDeaf);
    setVoiceWebhookInput(state.config.voiceWebhookUrl || '');
  }, [
    state.config.voiceGuildId,
    state.config.voiceChannelId,
    state.config.voiceSelfMute,
    state.config.voiceSelfDeaf,
    state.config.voiceWebhookUrl,
  ]);

  const loadGuilds = async () => {
    setLoadingGuilds(true);
    try {
      const res = await fetch('/api/voice/guilds');
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Không tải được server.');
      setGuilds(json.guilds || []);
      onNotify(`Đã tải ${json.guilds?.length || 0} Server từ Discord.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi tải danh sách Server.');
    } finally {
      setLoadingGuilds(false);
    }
  };

  const loadChannels = async (targetGuildId: string) => {
    if (!targetGuildId.trim()) return;
    setLoadingChannels(true);
    try {
      const res = await fetch(`/api/voice/guilds/${encodeURIComponent(targetGuildId.trim())}/channels`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Không tải được kênh thoại.');
      const list = (json.channels || []) as VoiceChannel[];
      setChannels(list);
      if (list.length > 0 && !list.some((c) => c.id === channelId)) {
        setChannelId(list[0].id);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi tải danh sách kênh thoại.');
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleJoinVoice = async (withStream = false) => {
    setBusy(withStream ? 'stream' : 'join');
    try {
      const res = await fetch('/api/voice/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          channelId,
          selfMute,
          selfDeaf,
          autoStream: withStream,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Vào voice thất bại.');
      onStateChange(json.state);
      onNotify(withStream ? 'Đang vào kênh thoại và bật Go Live stream ảnh...' : 'Đã gửi lệnh vào kênh thoại Discord.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không thể vào kênh thoại.');
    } finally {
      setBusy(null);
    }
  };

  const handleLeaveVoice = async () => {
    setBusy('leave');
    try {
      const res = await fetch('/api/voice/leave', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Rời voice thất bại.');
      onStateChange(json.state);
      onNotify('Đã rời kênh thoại và tắt stream.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi rời kênh thoại.');
    } finally {
      setBusy(null);
    }
  };

  const handleStartStream = async () => {
    setBusy('stream');
    try {
      // Ensure selected guild/channel are synced before stream starts
      if (guildId !== state.config.voiceGuildId || channelId !== state.config.voiceChannelId) {
        await onUpdateConfig({
          voiceGuildId: guildId,
          voiceChannelId: channelId,
          voiceSelfMute: selfMute,
          voiceSelfDeaf: selfDeaf,
        });
      }
      const res = await fetch('/api/voice/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Mở stream ảnh thất bại.');
      onStateChange(json.state);
      onNotify('Đã kích hoạt Go Live Stream ảnh trên kênh thoại Discord.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không thể mở Go Live.');
    } finally {
      setBusy(null);
    }
  };

  const handleStopStream = async () => {
    setBusy('stopStream');
    try {
      const res = await fetch('/api/voice/stream/stop', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Tắt stream thất bại.');
      onStateChange(json.state);
      onNotify('Đã dừng phát Go Live.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi tắt Go Live.');
    } finally {
      setBusy(null);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('upload');
    try {
      const dataUrl = await resizeImageToJpegDataUrl(file);
      const res = await fetch('/api/voice/stream/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Đổi ảnh stream thất bại.');
      onStateChange(json.state);
      onNotify('Đã đổi ảnh stream tùy chỉnh.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi tải ảnh stream.');
    } finally {
      setBusy(null);
      e.target.value = '';
    }
  };

  const handleResetDefaultImage = async () => {
    setBusy('resetImg');
    try {
      const res = await fetch('/api/voice/stream/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: '' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Khôi phục ảnh thất bại.');
      onStateChange(json.state);
      onNotify('Đã đặt lại ảnh stream mặc định (Night Chill Desk).');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi khôi phục ảnh.');
    } finally {
      setBusy(null);
    }
  };

  const handleStartRecord = async () => {
    const targetChannel = (recChannelId || channelId).trim();
    const targetGuild = (recChannelId ? recGuildId : guildId).trim();
    if (!targetChannel) {
      onError('Vui lòng chọn hoặc dán Voice Channel ID để ghi âm.');
      return;
    }
    setBusy('recStart');
    try {
      const res = await fetch('/api/voice/record/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: targetGuild || undefined,
          channelId: targetChannel,
          durationSeconds: recDuration,
          leaveAfterStop: recLeaveAfter,
          selfMute: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Không thể vào phòng ghi âm.');
      onStateChange(json.state);
      onNotify(`Đang ghi âm Voice phòng ${targetChannel}...`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi bắt đầu ghi âm.');
    } finally {
      setBusy(null);
    }
  };

  const handleStopRecord = async () => {
    setBusy('recStop');
    try {
      const res = await fetch('/api/voice/record/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceLeave: recLeaveAfter }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Không thể dừng ghi âm.');
      onStateChange(json.state);
      if (json.clip?.webhookSent) {
        onNotify(`Đã lưu & gửi file ghi âm (${json.clip.durationSeconds}s) về Webhook.`);
      } else if (json.clip) {
        onNotify(`Đã lưu bản ghi âm (${json.clip.durationSeconds}s) trên web.`);
      } else {
        onNotify('Đã dừng ghi âm (chưa phát hiện giọng nói trong phòng).');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi dừng ghi âm.');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveVoiceWebhook = async () => {
    setBusy('saveWebhook');
    try {
      await onUpdateConfig({ voiceWebhookUrl: voiceWebhookInput.trim() });
    } finally {
      setBusy(null);
    }
  };

  const rec = state.voiceRecorder;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Treo Kênh Thoại (Voice Channel PC)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Vào kênh thoại qua Discord Gateway OP 4 kèm Voice WebSocket v4 giữ kết nối liên tục.
            </p>
          </div>
          <button
            type="button"
            disabled={!state.hasToken || loadingGuilds}
            onClick={loadGuilds}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGuilds ? 'animate-spin' : ''}`} />
            {loadingGuilds ? 'Đang tải...' : 'Tải danh sách Server'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {guilds.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Chọn Server (Guild)
                </label>
                <select
                  value={guildId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setGuildId(nextId);
                    loadChannels(nextId);
                  }}
                  className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">-- Chọn Server --</option>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Chọn Kênh Thoại {loadingChannels ? '(đang tải...)' : ''}
                </label>
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  disabled={channels.length === 0}
                  className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
                >
                  <option value="">-- Chọn kênh thoại --</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Server ID (Guild ID)
              </label>
              <input
                type="text"
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                placeholder="Dán Guild ID hoặc chọn ở trên..."
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm font-mono text-white placeholder:text-slate-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Voice Channel ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Dán Voice Channel ID..."
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm font-mono text-white placeholder:text-slate-600 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3 border-t border-[#1C2436]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 p-3 bg-[#0D121C] border border-[#1E2638] rounded-md cursor-pointer">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-200">
                  <MicOff className="w-4 h-4 text-slate-400" />
                  Tắt Mic (Self Mute)
                </span>
                <input
                  type="checkbox"
                  checked={selfMute}
                  onChange={(e) => {
                    setSelfMute(e.target.checked);
                    onUpdateConfig({ voiceSelfMute: e.target.checked });
                  }}
                  className="w-4 h-4 accent-[#5865F2]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 bg-[#0D121C] border border-[#1E2638] rounded-md cursor-pointer">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-200">
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  Tắt Loa (Self Deaf)
                </span>
                <input
                  type="checkbox"
                  checked={selfDeaf}
                  onChange={(e) => {
                    setSelfDeaf(e.target.checked);
                    onUpdateConfig({ voiceSelfDeaf: e.target.checked });
                  }}
                  className="w-4 h-4 accent-[#5865F2]"
                />
              </label>
            </div>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-200">
                  Tự động vào lại kênh thoại khi bot kết nối Gateway
                </div>
                <div className="text-xs text-slate-400">
                  Phù hợp khi chạy 24/7 trên Render (hoặc khi bật AUTO_JOIN_VOICE=true).
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.config.autoJoinVoice}
                onChange={(e) =>
                  onUpdateConfig({
                    autoJoinVoice: e.target.checked,
                    voiceGuildId: guildId,
                    voiceChannelId: channelId,
                  })
                }
                className="w-4 h-4 accent-[#5865F2] shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-200">
                  Tự động bật Go Live Stream Ảnh ngay sau khi vào Voice
                </div>
                <div className="text-xs text-slate-400">
                  Mở stream ngay mỗi lần bot tự vào lại phòng thoại.
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.config.autoStreamImage}
                onChange={(e) =>
                  onUpdateConfig({
                    autoStreamImage: e.target.checked,
                    voiceGuildId: guildId,
                    voiceChannelId: channelId,
                  })
                }
                className="w-4 h-4 accent-[#5865F2] shrink-0"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-[#1C2436] flex flex-wrap items-center gap-3">
            {!state.voice.connected ? (
              <button
                type="button"
                disabled={busy !== null || state.connectionState !== 'connected'}
                onClick={() => handleJoinVoice(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                {busy === 'join' ? 'Đang vào voice...' : 'Vào Kênh Thoại'}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleLeaveVoice}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                {busy === 'leave' ? 'Đang rời...' : 'Rời Kênh Thoại'}
              </button>
            )}

            {!state.voice.streamActive ? (
              <button
                type="button"
                disabled={busy !== null || state.connectionState !== 'connected'}
                onClick={handleStartStream}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                <Radio className="w-4 h-4" />
                {busy === 'stream' ? 'Đang mở stream...' : 'Vào Voice & Stream Ảnh'}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleStopStream}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#182032] hover:bg-[#222D45] border border-rose-500/40 text-rose-300 rounded-md transition-colors"
              >
                <Radio className="w-4 h-4" />
                {busy === 'stopStream' ? 'Đang tắt...' : 'Dừng Stream Ảnh'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#5865F2]" />
            <h2 className="text-base font-semibold text-white">Ảnh Phát Stream (Go Live)</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {state.voice.streamActive ? 'Đang phát' : 'Chờ phát'}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="aspect-video w-full rounded-md overflow-hidden border border-[#27324A] bg-[#090C12]">
            <img
              src={state.voice.streamImageUrl}
              alt="Ảnh stream trên Discord"
              className="w-full h-full object-cover"
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Phát ảnh tĩnh lên phòng thoại thông qua <span className="font-mono text-slate-300">OP 18 STREAM_CREATE</span> và cập nhật khung hình liên tục mỗi 20 giây qua API{' '}
            <span className="font-mono text-slate-300">/streams/preview</span>.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded-md cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {busy === 'upload' ? 'Đang tải...' : 'Đổi ảnh khác'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
            </label>

            {state.config.streamImageDataUrl && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleResetDefaultImage}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-slate-300 rounded-md transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Dùng ảnh mặc định
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-[#1C2436] space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between gap-2">
              <span>Trạng thái Voice:</span>
              <span className={state.voice.connected ? 'text-emerald-400' : 'text-slate-500'}>
                {state.voice.connected ? `Connected (${state.voice.voiceEndpoint || 'RTC'})` : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Stream Key:</span>
              <span className="truncate max-w-[200px] text-slate-300">
                {state.voice.streamKey || '--'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Làm mới khung hình:</span>
              <span className="tabular-nums text-slate-300">
                {state.voice.lastPreviewSentAt
                  ? new Date(state.voice.lastPreviewSentAt).toLocaleTimeString('vi-VN')
                  : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-12 bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Mic className="w-4 h-4 text-rose-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Join Voice Riêng &amp; Ghi Âm (DAVE E2EE -&gt; Webhook)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động vào phòng thoại riêng (hoặc DM Call), giải mã Voice v8 + DAVE E2EE, trộn giọng mọi người nói thành file WAV 24kHz và gửi về Webhook (tự tách chunk mỗi 3 phút nếu ghi dài).
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-mono px-2.5 py-1 rounded border ${
              rec?.recording
                ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                : 'bg-[#090C12] border-[#232C3F] text-slate-400'
            }`}
          >
            {rec?.status === 'connecting'
              ? 'Đang kết nối Voice v8/DAVE...'
              : rec?.status === 'recording'
              ? `ĐANG GHI ÂM · ${rec.elapsedSeconds}s (${(rec.estimatedBytes / 1024).toFixed(0)} KB)`
              : rec?.status === 'uploading'
              ? 'Đang xử lý & gửi Webhook...'
              : 'Sẵn sàng ghi âm'}
          </span>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Voice Channel ID cần ghi âm
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recChannelId}
                  onChange={(e) => setRecChannelId(e.target.value)}
                  placeholder="Dán ID kênh thoại hoặc DM Call..."
                  className="flex-1 bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
                />
                {channelId && recChannelId !== channelId && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecChannelId(channelId);
                      setRecGuildId(guildId);
                    }}
                    className="px-2.5 py-2 text-[11px] bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-slate-300 rounded-md whitespace-nowrap"
                  >
                    Lấy kênh trên
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Guild ID (bỏ trống tự dò / DM)
              </label>
              <input
                type="text"
                value={recGuildId}
                onChange={(e) => setRecGuildId(e.target.value)}
                placeholder="Tự nhận diện theo Channel ID..."
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Thời lượng ghi âm tự động
              </label>
              <select
                value={recDuration}
                onChange={(e) => setRecDuration(Number(e.target.value))}
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-xs text-white outline-none"
              >
                <option value={0}>Ghi liên tục (Dừng thủ công)</option>
                <option value={30}>30 giây rồi gửi Webhook</option>
                <option value={60}>60 giây rồi gửi Webhook</option>
                <option value={120}>2 phút rồi gửi Webhook</option>
                <option value={180}>3 phút rồi gửi Webhook</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <label className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#0D121C] border border-[#1E2638] rounded-md cursor-pointer">
                <span className="text-xs text-slate-300">Tự rời phòng</span>
                <input
                  type="checkbox"
                  checked={recLeaveAfter}
                  onChange={(e) => setRecLeaveAfter(e.target.checked)}
                  className="w-4 h-4 accent-[#5865F2]"
                />
              </label>
            </div>
          </div>

          <div className="p-3.5 bg-[#0D121C] border border-[#1E2638] rounded-md space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                <Webhook className="w-3.5 h-3.5 text-[#5865F2]" />
                Voice Record Webhook URL (bỏ trống = dùng chung Snipe Webhook)
              </span>
              <span className="text-slate-400">
                {state.config.voiceWebhookUrl || state.config.snipeWebhookUrl
                  ? 'Đã cấu hình Webhook nhận file WAV'
                  : 'Chưa gắn Webhook (vẫn nghe/tải được ở dưới)'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={voiceWebhookInput}
                onChange={(e) => setVoiceWebhookInput(e.target.value)}
                placeholder="https://discord.com/api/webhooks/... (tùy chọn riêng cho Voice)"
                className="flex-1 bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
              />
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleSaveVoiceWebhook}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded-md transition-colors whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                {busy === 'saveWebhook' ? 'Đang lưu...' : 'Lưu Webhook'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {!rec?.recording ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={handleStartRecord}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-md transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  {busy === 'recStart' ? 'Đang vào phòng...' : 'Join Voice & Bắt đầu Ghi Âm'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={handleStopRecord}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  {busy === 'recStop' ? 'Đang đóng gói WAV...' : 'Dừng & Gửi Webhook Ngay'}
                </button>
              )}
            </div>

            {rec?.recording && (
              <div className="text-xs font-mono text-slate-300 flex flex-wrap items-center gap-3">
                <span>Gói âm thanh: {rec.packetsCaptured}</span>
                <span>·</span>
                <span>
                  Người nói: {rec.activeSpeakers.length > 0 ? rec.activeSpeakers.join(', ') : 'Chờ có người nói...'}
                </span>
              </div>
            )}
          </div>

          {rec?.lastError && (
            <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-md px-3 py-2">
              {rec.lastError}
            </div>
          )}

          {rec && rec.recentRecordings.length > 0 && (
            <div className="pt-2 space-y-2.5 border-t border-[#1C2436]">
              <div className="text-xs font-semibold text-slate-300">
                Bản ghi âm gần đây ({rec.recentRecordings.length})
              </div>
              <div className="space-y-2">
                {rec.recentRecordings.map((clip) => (
                  <div
                    key={clip.id}
                    className="p-3 bg-[#090C12] border border-[#1E2638] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-white">
                          {clip.channelName ? `#${clip.channelName}` : `Kênh ${clip.channelId}`}
                        </span>
                        {clip.guildName && <span className="text-slate-500">· {clip.guildName}</span>}
                        <span className="font-mono text-amber-400">{clip.durationSeconds}s</span>
                        <span className="font-mono text-slate-500">
                          ({(clip.sizeBytes / 1024).toFixed(0)} KB)
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            clip.webhookSent
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                              : 'bg-slate-800/60 text-slate-400'
                          }`}
                        >
                          {clip.webhookSent ? 'Đã gửi Webhook' : 'Lưu cục bộ'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {new Date(clip.startedAt).toLocaleTimeString('vi-VN')} · Người nói:{' '}
                        {clip.speakers.length > 0
                          ? clip.speakers.map((s) => s.label).join(', ')
                          : 'Không rõ'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <audio controls preload="none" src={clip.audioRoute} className="h-8 max-w-[230px]" />
                      <a
                        href={clip.audioRoute}
                        download={`voice-${clip.channelId}-${clip.startedAt}.wav`}
                        className="p-2 bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-slate-200 rounded-md transition-colors"
                        title="Tải file WAV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-12 bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-[#5865F2]" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Lệnh Chat Self-Bot Trên Discord ({state.config.commandPrefix || '.'}help)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gõ lệnh trực tiếp bằng tài khoản của bạn ở bất kỳ kênh chat hoặc DM nào (chỉ nhận lệnh từ chính chủ tài khoản).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Prefix</span>
              <input
                type="text"
                maxLength={4}
                value={state.config.commandPrefix || '.'}
                onChange={(e) => onUpdateConfig({ commandPrefix: e.target.value || '.' })}
                className="w-14 bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-2 py-1 text-center text-xs font-mono text-white outline-none"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={state.config.enableChatCommands}
                onChange={(e) => onUpdateConfig({ enableChatCommands: e.target.checked })}
                className="w-4 h-4 accent-[#5865F2]"
              />
              Bật lệnh chat
            </label>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { cmd: `${state.config.commandPrefix || '.'}help`, desc: 'Hiện bảng danh sách toàn bộ lệnh self-bot' },
            { cmd: `${state.config.commandPrefix || '.'}join [channel_id]`, desc: 'Vào kênh thoại (bỏ trống = kênh đã lưu hoặc kênh đầu server)' },
            { cmd: `${state.config.commandPrefix || '.'}leave`, desc: 'Rời kênh thoại và tắt stream' },
            { cmd: `${state.config.commandPrefix || '.'}record [id] [giây]`, desc: 'Vào voice riêng ghi âm (DAVE E2EE) rồi gửi file WAV về Webhook' },
            { cmd: `${state.config.commandPrefix || '.'}stoprecord`, desc: 'Dừng ghi âm ngay và gửi file WAV về Webhook' },
            { cmd: `${state.config.commandPrefix || '.'}stream [channel_id]`, desc: 'Vào voice và phát Go Live Stream Ảnh Tĩnh' },
            { cmd: `${state.config.commandPrefix || '.'}stopstream`, desc: 'Tắt Go Live Stream Ảnh (vẫn ở trong voice)' },
            { cmd: `${state.config.commandPrefix || '.'}mute / ${state.config.commandPrefix || '.'}deaf`, desc: 'Bật/tắt mic & loa khi đang treo voice (kèm unmute/undeaf)' },
            { cmd: `${state.config.commandPrefix || '.'}roblox`, desc: 'Đưa Game Activity về Roblox chính hãng ngay lập tức' },
            { cmd: `${state.config.commandPrefix || '.'}game <tên hoặc ID>`, desc: 'Đổi sang bất kỳ game nào trong Discord Detectable' },
            { cmd: `${state.config.commandPrefix || '.'}ping`, desc: 'Trả lời ngắn gọn Uptime & Ping Gateway (dùng .info để xem bảng chi tiết)' },
            { cmd: `${state.config.commandPrefix || '.'}snipe [số|@user|list]`, desc: 'Hiện ngắn gọn @user (thời gian) + codeblock nội dung + ảnh vừa xóa' },
            { cmd: `${state.config.commandPrefix || '.'}clear <số>`, desc: 'Xóa nhanh N tin nhắn gần nhất của chính bạn trong kênh/DM' },
            { cmd: `${state.config.commandPrefix || '.'}autoquest [x]`, desc: 'Tự động nhận & chạy toàn bộ Quest (kèm .sweepquest)' },
            { cmd: `${state.config.commandPrefix || '.'}badge <games> [giờ]`, desc: 'Farm Played Games Badge hoặc giờ chơi qua Science' },
          ].map((item) => (
            <div
              key={item.cmd}
              className="p-3 bg-[#090C12] border border-[#1E2638] rounded-md space-y-1"
            >
              <div className="font-mono font-semibold text-[#818CF8]">{item.cmd}</div>
              <div className="text-slate-400 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
