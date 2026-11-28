import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  Hash,
  Image as ImageIcon,
  Paperclip,
  Search,
  Send,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import type { SnipedMessagePublic } from '../types';

interface SnipeTabProps {
  snipedMessages: SnipedMessagePublic[];
  gatewayConnected: boolean;
  webhookUrl: string;
  onUpdateWebhook: (url: string) => Promise<void>;
  onTestWebhook: (url: string) => Promise<void>;
  onClearSnipe: (channelId?: string) => Promise<void>;
}

function formatRelativeVi(timestampMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 60) return `${diffSec} giây trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}

export function SnipeTab({
  snipedMessages,
  gatewayConnected,
  webhookUrl,
  onUpdateWebhook,
  onTestWebhook,
  onClearSnipe,
}: SnipeTabProps) {
  const [viewMode, setViewMode] = useState<'latest_per_channel' | 'all'>('latest_per_channel');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyImages, setOnlyImages] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [webhookInput, setWebhookInput] = useState(webhookUrl);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    setWebhookInput(webhookUrl);
  }, [webhookUrl]);

  const channelCount = useMemo(() => {
    return new Set(snipedMessages.map((m) => m.channelId)).size;
  }, [snipedMessages]);

  const imageMessageCount = useMemo(() => {
    return snipedMessages.filter((m) => m.attachments.some((a) => a.isImage)).length;
  }, [snipedMessages]);

  const displayedMessages = useMemo(() => {
    let base = snipedMessages;

    if (viewMode === 'latest_per_channel') {
      const seen = new Set<string>();
      const latest: SnipedMessagePublic[] = [];
      for (const item of snipedMessages) {
        if (!seen.has(item.channelId)) {
          seen.add(item.channelId);
          latest.push(item);
        }
      }
      base = latest;
    }

    if (onlyImages) {
      base = base.filter((m) => m.attachments.some((a) => a.isImage));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (m) =>
          m.authorUsername.toLowerCase().includes(q) ||
          m.authorDisplayName.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          (m.channelName || '').toLowerCase().includes(q) ||
          (m.guildName || '').toLowerCase().includes(q) ||
          m.channelId.includes(q)
      );
    }

    return base;
  }, [snipedMessages, viewMode, onlyImages, searchQuery]);

  const handleClear = async (channelId?: string) => {
    setClearing(true);
    try {
      await onClearSnipe(channelId);
    } finally {
      setClearing(false);
    }
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    try {
      await onUpdateWebhook(webhookInput.trim());
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      await onTestWebhook(webhookInput.trim());
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#232C3F] rounded-lg bg-[#111622] divide-y sm:divide-y-0 sm:divide-x divide-[#232C3F]">
        <div className="p-4">
          <div className="text-xs text-slate-400">Tin nhắn đã bắt (Snipe)</div>
          <div className="text-lg font-semibold text-white font-mono tabular-nums mt-1">
            {snipedMessages.length} tin
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Lưu tối đa 25 tin gần nhất mỗi kênh</div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">Số kênh Discord đang có log</div>
          <div className="text-lg font-semibold text-[#818CF8] font-mono tabular-nums mt-1">
            {channelCount} kênh
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {gatewayConnected ? 'Đang nghe Server & DM trực tiếp' : 'Gateway chưa kết nối'}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">Tin nhắn kèm ảnh</div>
          <div className="text-lg font-semibold text-emerald-400 font-mono tabular-nums mt-1">
            {imageMessageCount} tin
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Ảnh được tải sẵn vào RAM trước khi CDN xóa</div>
        </div>
      </div>

      <div className="bg-[#111622] border border-[#232C3F] rounded-lg p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-[#5865F2]" />
            <h3 className="text-sm font-semibold text-white">Snipe Webhook Logger (Tự động gửi về kênh riêng)</h3>
          </div>
          <span className={`text-xs font-medium ${webhookUrl ? 'text-emerald-400' : 'text-slate-500'}`}>
            {webhookUrl ? 'Đang bật tự động gửi' : 'Chưa gắn Webhook'}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Mỗi khi có người xóa tin nhắn hoặc ảnh trong bất kỳ server/DM nào, bot tự đẩy bản lưu (kèm file ảnh gốc) về Webhook Discord của bạn (hoặc set biến môi trường <span className="font-mono text-slate-300">SNIPE_WEBHOOK_URL</span> trên Render).
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={savingWebhook}
              onClick={handleSaveWebhook}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {savingWebhook ? 'Đang lưu...' : 'Lưu Webhook'}
            </button>
            <button
              type="button"
              disabled={testingWebhook || !webhookInput.trim()}
              onClick={handleTestWebhook}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] disabled:opacity-50 text-slate-200 rounded-md transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {testingWebhook ? 'Đang gửi...' : 'Test'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Snipe Tin Nhắn Đã Xóa</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động ghi nhận tin nhắn cuối cùng (và lịch sử) vừa bị xóa trong server hoặc DM kèm ảnh đính kèm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#090C12] border border-[#232C3F] rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('latest_per_channel')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  viewMode === 'latest_per_channel'
                    ? 'bg-[#5865F2] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tin cuối mỗi kênh
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  viewMode === 'all'
                    ? 'bg-[#5865F2] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Toàn bộ ({snipedMessages.length})
              </button>
            </div>

            {snipedMessages.length > 0 && (
              <button
                type="button"
                disabled={clearing}
                onClick={() => handleClear()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-md transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-b border-[#1C2436] bg-[#0D111A] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo @username, nội dung, tên kênh hoặc tên server..."
              className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyImages}
              onChange={(e) => setOnlyImages(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#5865F2]"
            />
            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            Chỉ hiện tin có ảnh
          </label>
        </div>

        <div className="divide-y divide-[#1C2436] bg-[#090C12]">
          {displayedMessages.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="text-sm font-medium text-slate-300">
                {snipedMessages.length === 0
                  ? 'Chưa ghi nhận tin nhắn nào bị xóa từ lúc bot chạy.'
                  : 'Không có tin nhắn nào khớp bộ lọc hiện tại.'}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khi bot đang kết nối Gateway, mọi tin nhắn bị xóa ở kênh trong server hoặc DM sẽ tự động lưu vào đây (kể cả khi bạn không gõ lệnh <span className="font-mono text-slate-300">.snipe</span>).
              </p>
            </div>
          ) : (
            displayedMessages.map((item) => {
              const deletedDate = new Date(item.deletedAt);
              const timeStr = deletedDate.toLocaleTimeString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour12: false,
              });
              const dateStr = deletedDate.toLocaleDateString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              });
              const imageAtts = item.attachments.filter((a) => a.isImage);
              const otherAtts = item.attachments.filter((a) => !a.isImage);

              return (
                <div key={`${item.channelId}-${item.id}`} className="p-5 hover:bg-[#0E131E] transition-colors space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#182032] border border-[#2B3752] overflow-hidden shrink-0 flex items-center justify-center">
                        {item.authorAvatarUrl ? (
                          <img
                            src={item.authorAvatarUrl}
                            alt={item.authorUsername}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-slate-300">
                            {item.authorDisplayName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {item.authorDisplayName}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            @{item.authorUsername}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[#818CF8]">
                            <Hash className="w-3 h-3" />
                            {item.channelName || item.channelId}
                          </span>
                          {item.guildName ? (
                            <span className="text-slate-500">· {item.guildName}</span>
                          ) : item.guildId ? (
                            <span className="text-slate-500 font-mono">· Server {item.guildId}</span>
                          ) : (
                            <span className="text-slate-500">· DM</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 tabular-nums">
                          <Clock className="w-3 h-3" />
                          {timeStr}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {dateStr} · {formatRelativeVi(item.deletedAt)}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={clearing}
                        onClick={() => handleClear(item.channelId)}
                        title="Xóa lịch sử snipe của kênh này"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-[#182032] rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#111622] border border-[#232C3F] rounded-md px-3.5 py-2 text-xs font-mono text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                    {item.content
                      ? item.content
                      : item.stickers.length > 0
                      ? `[Sticker: ${item.stickers.join(', ')}]`
                      : '[No Content]'}
                  </div>

                  {imageAtts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {imageAtts.map((att, idx) => {
                        const src = att.imageRoute || att.proxyUrl || att.url;
                        return (
                          <button
                            key={`${item.id}-img-${idx}`}
                            type="button"
                            onClick={() => setLightboxUrl(src)}
                            className="group relative bg-[#111622] border border-[#232C3F] hover:border-[#5865F2] rounded-md overflow-hidden text-left transition-colors"
                          >
                            <img
                              src={src}
                              alt={att.filename}
                              className="w-full max-h-60 object-contain bg-[#06080D]"
                            />
                            <div className="px-2.5 py-1.5 border-t border-[#1C2436] flex items-center justify-between gap-2 text-[11px] text-slate-400">
                              <span className="truncate font-mono">{att.filename}</span>
                              <span className="text-emerald-400 shrink-0">
                                {att.hasBufferedImage ? 'Đã lưu RAM' : 'CDN'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {otherAtts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {otherAtts.map((att, idx) => (
                        <a
                          key={`${item.id}-file-${idx}`}
                          href={att.proxyUrl || att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#111622] hover:bg-[#182032] border border-[#232C3F] rounded-md text-slate-200"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{att.filename}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#0D111A] border border-[#2B3752] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-2.5 right-2.5 p-1.5 bg-black/70 hover:bg-black text-white rounded-md"
              aria-label="Đóng ảnh"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={lightboxUrl} alt="Snipe preview" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
