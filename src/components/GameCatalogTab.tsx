import { useEffect, useState } from 'react';
import { Check, Gamepad2, RotateCcw, Search } from 'lucide-react';
import type { ActivityConfig, DetectableGame } from '../types';

interface GameCatalogTabProps {
  config: ActivityConfig;
  onUpdateConfig: (partial: Partial<ActivityConfig>) => Promise<void>;
  onApplyRobloxPreset: () => Promise<void>;
}

export function GameCatalogTab({
  config,
  onUpdateConfig,
  onApplyRobloxPreset,
}: GameCatalogTabProps) {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<DetectableGame[]>([]);
  const [loading, setLoading] = useState(false);

  const [draft, setDraft] = useState<ActivityConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/games/detectable?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (active && json.ok && Array.isArray(json.games)) {
          setGames(json.games);
        }
      } catch {
        // ignore search errors
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelectGame = async (game: DetectableGame) => {
    const winExe =
      game.executables?.find((e) => e.os === 'win32')?.name ||
      game.executables?.[0]?.name ||
      `${game.name.replace(/\s+/g, '')}.exe`;
    const iconHash = game.icon_hash || game.icon || '';

    const updated = {
      applicationId: game.id,
      gameName: game.name,
      executableName: winExe,
      iconHash,
    };
    setDraft((prev) => ({ ...prev, ...updated }));
    await onUpdateConfig(updated);
  };

  const handleSaveRpc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateConfig({
        applicationId: draft.applicationId,
        gameName: draft.gameName,
        executableName: draft.executableName,
        details: draft.details,
        state: draft.state,
        largeImageKey: draft.largeImageKey,
        largeImageText: draft.largeImageText,
        smallImageKey: draft.smallImageKey,
        smallImageText: draft.smallImageText,
        useParty: draft.useParty,
        partySize: Number(draft.partySize) || 1,
        partyMax: Number(draft.partyMax) || 1,
        platform: draft.platform,
        status: draft.status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-7 bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Kho Game Detectable Chính Hãng</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lấy trực tiếp từ Discord /applications/detectable để nhận diện game thật và cộng chuỗi.
            </p>
          </div>
          <button
            type="button"
            onClick={onApplyRobloxPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại Roblox Mặc định
          </button>
        </div>

        <div className="p-4 border-b border-[#232C3F]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên game hoặc Application ID (Roblox, VALORANT, League of Legends...)"
              className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-[#1C2436] max-h-[520px] overflow-y-auto">
          {loading && games.length === 0 ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-[#161D2B] rounded animate-pulse" />
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Không tìm thấy game phù hợp với từ khóa "{query}".
            </div>
          ) : (
            games.map((game) => {
              const selected = config.applicationId === game.id;
              const exeName =
                game.executables?.find((e) => e.os === 'win32')?.name ||
                game.executables?.[0]?.name ||
                'GameClient.exe';
              const hash = game.icon_hash || game.icon;
              const iconUrl = hash
                ? `https://cdn.discordapp.com/app-icons/${game.id}/${hash}.png?size=64`
                : null;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelectGame(game)}
                  className={`w-full px-5 py-3 flex items-center justify-between gap-4 text-left transition-colors ${
                    selected ? 'bg-[#5865F2]/10' : 'hover:bg-[#161D2B]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-[#182032] border border-[#27324A] flex items-center justify-center shrink-0 overflow-hidden">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={game.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Gamepad2 className={`w-4 h-4 ${selected ? 'text-[#5865F2]' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{game.name}</div>
                      <div className="text-xs text-slate-400 font-mono truncate">
                        {game.id} · {exeName}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {selected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        Đang chọn
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Chọn game</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <form
        onSubmit={handleSaveRpc}
        className="xl:col-span-5 bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b border-[#232C3F]">
          <h2 className="text-base font-semibold text-white">Chi tiết Rich Presence & Trạng thái</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Áp dụng tức thì qua Gateway OP 3 kể cả khi bot đang chạy.
          </p>
        </div>

        <div className="p-5 space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Application ID (Chính hãng)
              </label>
              <input
                type="text"
                value={draft.applicationId}
                onChange={(e) => setDraft({ ...draft, applicationId: e.target.value })}
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm font-mono text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tên hiển thị Game
              </label>
              <input
                type="text"
                value={draft.gameName}
                onChange={(e) => setDraft({ ...draft, gameName: e.target.value })}
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Trạng thái tài khoản
              </label>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as ActivityConfig['status'] })
                }
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white outline-none"
              >
                <option value="online">Trực tuyến (Online)</option>
                <option value="idle">Chờ (Idle)</option>
                <option value="dnd">Không làm phiền (DND)</option>
                <option value="invisible">Ẩn (Invisible)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nền tảng hiển thị (Cố định PC)
              </label>
              <div className="w-full bg-[#090C12] border border-[#232C3F] rounded-md px-3 py-2 text-sm text-emerald-400 font-medium">
                PC (Discord Desktop Windows)
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Dòng chi tiết (Details - tùy chọn)
            </label>
            <input
              type="text"
              value={draft.details}
              onChange={(e) => setDraft({ ...draft, details: e.target.value })}
              placeholder="Ví dụ: Blox Fruits · Sea 3"
              className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Dòng trạng thái (State - tùy chọn)
            </label>
            <input
              type="text"
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              placeholder="Ví dụ: Đang farm boss / Chơi cùng bạn"
              className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tên tiến trình (Science Telemetry)
            </label>
            <input
              type="text"
              value={draft.executableName}
              onChange={(e) => setDraft({ ...draft, executableName: e.target.value })}
              placeholder="RobloxPlayerBeta.exe"
              className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm font-mono text-white outline-none"
            />
          </div>

          <div className="pt-2 border-t border-[#1C2436]">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-xs font-medium text-slate-300">
                Hiển thị số lượng Party (ví dụ 1 of 12)
              </span>
              <input
                type="checkbox"
                checked={draft.useParty}
                onChange={(e) => setDraft({ ...draft, useParty: e.target.checked })}
                className="w-4 h-4 accent-[#5865F2]"
              />
            </label>
            {draft.useParty && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hiện tại</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={draft.partySize}
                    onChange={(e) => setDraft({ ...draft, partySize: Number(e.target.value) })}
                    className="w-full bg-[#090C12] border border-[#232C3F] rounded-md px-3 py-1.5 text-sm font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tối đa</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={draft.partyMax}
                    onChange={(e) => setDraft({ ...draft, partyMax: Number(e.target.value) })}
                    className="w-full bg-[#090C12] border border-[#232C3F] rounded-md px-3 py-1.5 text-sm font-mono text-white outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#232C3F] bg-[#0E131D] flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap"
          >
            {saving ? 'Đang cập nhật...' : 'Áp dụng Presence'}
          </button>
        </div>
      </form>
    </div>
  );
}
