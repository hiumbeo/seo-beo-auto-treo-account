import { useEffect, useState } from 'react';
import { Check, Cloud, Copy, Download, Terminal } from 'lucide-react';

export function ExportBotTab() {
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/export-script')
      .then((r) => r.json())
      .then((json) => {
        if (active && json.ok) {
          setScript(json.content);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = async () => {
    if (!script) return;
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!script) return;
    const blob = new Blob([script], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roblox-activity-bot.mjs';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex items-center gap-2.5">
          <Cloud className="w-4 h-4 text-[#5865F2]" />
          <div>
            <h2 className="text-base font-semibold text-white">
              Cấu hình Host Render.com (Đã cài sẵn Blueprint render.yaml)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dự án đã có sẵn render.yaml, Health Check /api/health và Node 22 để deploy lên Render không bị lỗi.
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2 font-mono bg-[#090C12] border border-[#1E2638] rounded-md p-4">
            <div className="text-slate-400 font-sans font-medium mb-2">Thông số Web Service trên Render</div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Build Command:</span>
              <span className="text-emerald-400">npm install --include=dev --legacy-peer-deps && npm run build</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Start Command:</span>
              <span className="text-emerald-400">npm start</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Health Check Path:</span>
              <span className="text-slate-200">/api/health</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Node Version:</span>
              <span className="text-slate-200">22.20.0 (engines &gt;= 22.18)</span>
            </div>
          </div>

          <div className="space-y-2 font-mono bg-[#090C12] border border-[#1E2638] rounded-md p-4">
            <div className="text-slate-400 font-sans font-medium mb-2">Environment Variables (Render Dashboard)</div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">NODE_ENV</span>
              <span className="text-slate-200">production</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">DISCORD_TOKEN</span>
              <span className="text-amber-300">token_discord_cua_ban</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">AUTO_START</span>
              <span className="text-slate-200">true</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">AUTO_JOIN_VOICE / AUTO_STREAM_IMAGE</span>
              <span className="text-slate-200">true (nếu muốn tự vào voice)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Xuất Script Self-Bot Độc Lập (Node.js 24/7)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chạy trên VPS, PC Windows, Linux hoặc Termux để giữ chuỗi Roblox liên tục ngay cả khi tắt trình duyệt.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!script}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#182032] hover:bg-[#212C44] border border-[#2C374F] text-white rounded-md transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép' : 'Sao chép mã'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!script}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Tải roblox-activity-bot.mjs
            </button>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#0E131D] border-b border-[#232C3F] flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <Terminal className="w-4 h-4 text-[#5865F2] shrink-0" />
          <span className="font-mono">npm install ws</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono">DISCORD_TOKEN="token_cua_ban" node roblox-activity-bot.mjs</span>
        </div>

        <div className="p-4 bg-[#090C12] max-h-[540px] overflow-auto">
          {loading ? (
            <div className="text-xs text-slate-500 font-mono">Đang tạo script từ cấu hình hiện tại...</div>
          ) : (
            <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre">
              {script}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
