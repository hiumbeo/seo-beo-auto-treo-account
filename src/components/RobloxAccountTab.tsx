import { useState } from 'react';
import { Eye, EyeOff, Gamepad2, Link2, RefreshCw, Unlink, UserCheck } from 'lucide-react';
import type { ActivityConfig, RobloxAccountPublic } from '../types';

interface RobloxAccountTabProps {
  robloxAccount: RobloxAccountPublic | null;
  config: ActivityConfig;
  onConnect: (params: { identifier?: string; cookie?: string }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onUpdateConfig: (partial: Partial<ActivityConfig>) => Promise<void>;
}

const PRESENCE_TEXT: Record<number, { label: string; color: string }> = {
  0: { label: 'Ngoại tuyến (Offline)', color: 'text-slate-400' },
  1: { label: 'Đang online trên Web Roblox', color: 'text-sky-400' },
  2: { label: 'Đang trong game (In-Game)', color: 'text-emerald-400' },
  3: { label: 'Đang mở Roblox Studio', color: 'text-amber-400' },
};

export function RobloxAccountTab({
  robloxAccount,
  config,
  onConnect,
  onDisconnect,
  onSyncNow,
  onUpdateConfig,
}: RobloxAccountTabProps) {
  const [authTab, setAuthTab] = useState<'username' | 'cookie'>('username');
  const [identifierInput, setIdentifierInput] = useState('');
  const [cookieInput, setCookieInput] = useState('');
  const [showCookie, setShowCookie] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (authTab === 'cookie') {
        await onConnect({ cookie: cookieInput });
        setCookieInput('');
      } else {
        await onConnect({ identifier: identifierInput });
        setIdentifierInput('');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSyncNow();
    } finally {
      setSyncing(false);
    }
  };

  const pType = robloxAccount?.presence?.userPresenceType ?? 0;
  const pMeta = PRESENCE_TEXT[pType] || PRESENCE_TEXT[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Kết nối Tài khoản Roblox
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Đọc trạng thái chơi game thật từ Roblox API và tự động đồng bộ sang Discord Activity.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#090C12] border border-[#232C3F] rounded-md">
              <button
                type="button"
                onClick={() => setAuthTab('username')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  authTab === 'username'
                    ? 'bg-[#1D2538] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Username / ID
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('cookie')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  authTab === 'cookie'
                    ? 'bg-[#1D2538] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                .ROBLOSECURITY Cookie
              </button>
            </div>
          </div>

          <form onSubmit={handleConnectSubmit} className="p-5 space-y-4">
            {authTab === 'username' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username hoặc User ID Roblox
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder="Ví dụ: Builderman hoặc 156"
                    className="flex-1 bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy || !identifierInput.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Link2 className="w-4 h-4" />
                    {busy ? 'Đang kết nối...' : 'Kết nối Acc'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Không cần mật khẩu hay cookie. Lưu ý: nếu acc Roblox tắt quyền xem hoạt động công khai,
                  hãy chuyển sang tab Cookie để bot đọc được tên map đang chơi.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cookie .ROBLOSECURITY
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={showCookie ? 'text' : 'password'}
                      value={cookieInput}
                      onChange={(e) => setCookieInput(e.target.value)}
                      placeholder="_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you..."
                      className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md pl-3 pr-10 py-2 text-sm font-mono text-white placeholder:text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCookie((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      aria-label={showCookie ? 'Ẩn cookie' : 'Hiện cookie'}
                    >
                      {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !cookieInput.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Link2 className="w-4 h-4" />
                    {busy ? 'Đang xác thực...' : 'Kết nối bằng Cookie'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Dùng Cookie giúp đọc chính xác tên game và icon map bạn đang chơi bất kể cài đặt riêng tư Roblox.
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#232C3F]">
            <h2 className="text-base font-semibold text-white">
              Chế độ Đồng bộ sang Discord
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bot kiểm tra trạng thái tài khoản Roblox mỗi 25 giây và tự cập nhật lên Discord OP 3.
            </p>
          </div>

          <div className="divide-y divide-[#1C2436]">
            {[
              {
                id: 'always_keep_streak' as const,
                title: 'Giữ chuỗi 24/7 + Tự cập nhật game đang chơi',
                desc: 'Luôn giữ hoạt động Roblox trên Discord để cày chuỗi ngày. Khi bạn vào game Roblox thật, tự động hiện tên & ảnh game đó.',
              },
              {
                id: 'mirror_only' as const,
                title: 'Chỉ hiện Discord khi Acc Roblox Online / Vào game',
                desc: 'Tự bật Roblox Activity trên Discord khi acc Roblox đang chơi hoặc mở web, tự tắt khi acc Roblox Offline.',
              },
              {
                id: 'off' as const,
                title: 'Tắt đồng bộ tự động',
                desc: 'Giữ thông tin kết nối tài khoản Roblox nhưng không tự thay đổi Discord Presence.',
              },
            ].map((mode) => (
              <label
                key={mode.id}
                className="px-5 py-3.5 flex items-start gap-3.5 cursor-pointer hover:bg-[#141A27]"
              >
                <input
                  type="radio"
                  name="robloxSyncMode"
                  checked={config.robloxSyncMode === mode.id}
                  onChange={() => onUpdateConfig({ robloxSyncMode: mode.id })}
                  className="mt-1 w-4 h-4 accent-[#5865F2] shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-white">{mode.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{mode.desc}</div>
                </div>
              </label>
            ))}

            <label className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#141A27]">
              <div>
                <div className="text-sm font-medium text-white">
                  Hiển thị @username Roblox lên Discord Activity
                </div>
                <div className="text-xs text-slate-400">
                  Thêm dòng "Acc: @username" vào trạng thái đang chơi (nếu bạn chưa nhập State riêng).
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.robloxShowAccountInState}
                onChange={(e) =>
                  onUpdateConfig({ robloxShowAccountInState: e.target.checked })
                }
                className="w-4 h-4 accent-[#5865F2] shrink-0"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#232C3F] flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Trạng thái Acc Roblox</h3>
            {robloxAccount && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSync}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-rose-300"
                >
                  <Unlink className="w-3 h-3" />
                  Ngắt
                </button>
              </div>
            )}
          </div>

          {!robloxAccount ? (
            <div className="p-8 text-center">
              <UserCheck className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
              <div className="text-sm font-medium text-slate-300">
                Chưa liên kết tài khoản Roblox
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Nhập Username, User ID hoặc Cookie .ROBLOSECURITY ở bên trái để kết nối.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4 pb-5 border-b border-[#1E2638]">
                <div className="w-14 h-14 rounded-lg bg-[#182032] border border-[#2B3752] overflow-hidden shrink-0 flex items-center justify-center">
                  {robloxAccount.avatarUrl ? (
                    <img
                      src={robloxAccount.avatarUrl}
                      alt={robloxAccount.username}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-slate-300">
                      {robloxAccount.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-white truncate">
                    {robloxAccount.displayName}
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    @{robloxAccount.username} · ID {robloxAccount.userId}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {robloxAccount.hasCookie
                      ? `Đã xác thực Cookie (${robloxAccount.maskedCookie})`
                      : 'Kết nối công khai qua Username/ID'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Trạng thái hiện tại</span>
                  <span className={`font-medium ${pMeta.color}`}>{pMeta.label}</span>
                </div>

                {robloxAccount.presence?.userPresenceType === 2 && (
                  <div className="pt-3 border-t border-[#1E2638] flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-[#182032] border border-[#2B3752] overflow-hidden shrink-0 flex items-center justify-center">
                      {robloxAccount.presence.gameIconUrl ? (
                        <img
                          src={robloxAccount.presence.gameIconUrl}
                          alt={robloxAccount.presence.gameName || 'Roblox Game'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Gamepad2 className="w-5 h-5 text-[#5865F2]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {robloxAccount.presence.gameName || robloxAccount.presence.lastLocation}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate">
                        {robloxAccount.presence.placeId
                          ? `Place ID ${robloxAccount.presence.placeId}`
                          : 'Đang phát hiện phiên chơi'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1E2638]">
                  <span className="text-slate-400">Cập nhật lần cuối</span>
                  <span className="font-mono text-slate-300 tabular-nums">
                    {robloxAccount.presence?.updatedAt
                      ? new Date(robloxAccount.presence.updatedAt).toLocaleTimeString('vi-VN')
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
