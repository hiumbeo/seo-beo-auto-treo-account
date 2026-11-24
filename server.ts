import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { selfBotManager, ROBLOX_PRESET, type ActivityConfig } from './server/discordSelfBot.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_req, res) => {
  const state = selfBotManager.getPublicState();
  res.json({
    ok: true,
    status: 'up',
    uptime: Math.floor(process.uptime()),
    gateway: state.connectionState,
    voiceConnected: state.voice.connected,
    streamActive: state.voice.streamActive,
  });
});

app.get('/api/state', (_req, res) => {
  res.json(selfBotManager.getPublicState());
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendState = (state: ReturnType<typeof selfBotManager.getPublicState>) => {
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  };

  sendState(selfBotManager.getPublicState());

  const onUpdate = (state: ReturnType<typeof selfBotManager.getPublicState>) => {
    sendState(state);
  };

  selfBotManager.on('update', onUpdate);

  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    selfBotManager.off('update', onUpdate);
  });
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const profile = await selfBotManager.verifyToken(token);
    res.json({ ok: true, user: profile, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Xác thực token thất bại.',
    });
  }
});

app.post('/api/auth/clear', (_req, res) => {
  selfBotManager.clearSavedToken();
  res.json({ ok: true, state: selfBotManager.getPublicState() });
});

app.post('/api/bot/start', async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
    const config = (req.body?.config || undefined) as Partial<ActivityConfig> | undefined;
    const state = await selfBotManager.start(token, config);
    res.json({ ok: true, state });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể khởi chạy self-bot.',
    });
  }
});

app.post('/api/bot/stop', async (_req, res) => {
  try {
    const state = await selfBotManager.stop();
    res.json({ ok: true, state });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Lỗi khi dừng self-bot.',
    });
  }
});

app.post('/api/bot/roblox-preset', (_req, res) => {
  selfBotManager.updateConfig({
    applicationId: ROBLOX_PRESET.applicationId,
    gameName: ROBLOX_PRESET.gameName,
    executableName: ROBLOX_PRESET.executableName,
    iconHash: ROBLOX_PRESET.iconHash,
  });
  res.json({ ok: true, state: selfBotManager.getPublicState() });
});

app.patch('/api/bot/config', (req, res) => {
  try {
    const partial = (req.body || {}) as Partial<ActivityConfig>;
    selfBotManager.updateConfig(partial);
    res.json({ ok: true, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Cập nhật cấu hình thất bại.',
    });
  }
});

app.get('/api/games/detectable', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const games = await selfBotManager.getDetectableGames(q);
    res.json({ ok: true, games });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không tải được danh sách game.',
    });
  }
});

app.post('/api/streak/sync', async (_req, res) => {
  try {
    const entries = await selfBotManager.fetchContentInventory();
    res.json({ ok: true, entries, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Đồng bộ chuỗi thất bại.',
    });
  }
});

app.post('/api/quests/sync', async (_req, res) => {
  try {
    const quests = await selfBotManager.fetchQuests();
    res.json({ ok: true, quests, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Đồng bộ Quest thất bại.',
    });
  }
});

app.post('/api/quests/:id/enroll', async (req, res) => {
  try {
    await selfBotManager.enrollQuest(req.params.id);
    res.json({ ok: true, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Nhận Quest thất bại.',
    });
  }
});

app.post('/api/quests/:id/heartbeat', async (req, res) => {
  try {
    const appId = typeof req.body?.applicationId === 'string' ? req.body.applicationId : undefined;
    const result = await selfBotManager.sendQuestHeartbeat(req.params.id, appId);
    res.json({ ok: true, result, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Gửi Quest heartbeat thất bại.',
    });
  }
});

app.post('/api/quests/auto-run', (req, res) => {
  try {
    const boostRatio = typeof req.body?.boostRatio === 'number' ? req.body.boostRatio : undefined;
    const sweepRegions = typeof req.body?.sweepRegions === 'boolean' ? req.body.sweepRegions : undefined;
    const autoBackToVN = typeof req.body?.autoBackToVN === 'boolean' ? req.body.autoBackToVN : undefined;
    const questRunner = selfBotManager.runAutoQuests({ boostRatio, sweepRegions, autoBackToVN });
    res.json({ ok: true, questRunner, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể khởi chạy Auto Quest.',
    });
  }
});

app.post('/api/quests/auto-stop', (_req, res) => {
  const questRunner = selfBotManager.stopAutoQuests();
  res.json({ ok: true, questRunner, state: selfBotManager.getPublicState() });
});

app.post('/api/quests/sweep', (req, res) => {
  try {
    const autoBackToVN = typeof req.body?.autoBackToVN === 'boolean' ? req.body.autoBackToVN : undefined;
    const questRunner = selfBotManager.sweepQuestRegions(autoBackToVN);
    res.json({ ok: true, questRunner, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể quét Quest toàn cầu.',
    });
  }
});

app.post('/api/badge/start', (req, res) => {
  try {
    const mode = req.body?.mode === 'playtime_hours' ? 'playtime_hours' : 'played_count';
    const gameLimit = typeof req.body?.gameLimit === 'number' ? req.body.gameLimit : 100;
    const hoursPerGame = typeof req.body?.hoursPerGame === 'number' ? req.body.hoursPerGame : undefined;
    const cookie = typeof req.body?.cookie === 'string' ? req.body.cookie : undefined;
    const fingerprint = typeof req.body?.fingerprint === 'string' ? req.body.fingerprint : undefined;
    const badgeSpoof = selfBotManager.startBadgeSpoof({
      mode,
      gameLimit,
      hoursPerGame,
      cookie,
      fingerprint,
    });
    res.json({ ok: true, badgeSpoof, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể bắt đầu Farm Badge / Giờ chơi.',
    });
  }
});

app.post('/api/badge/stop', (_req, res) => {
  const badgeSpoof = selfBotManager.stopBadgeSpoof();
  res.json({ ok: true, badgeSpoof, state: selfBotManager.getPublicState() });
});

app.get('/api/export-script', (_req, res) => {
  const script = selfBotManager.generateStandaloneScript();
  res.json({ ok: true, filename: 'roblox-activity-bot.mjs', content: script });
});

app.post('/api/roblox/connect', async (req, res) => {
  try {
    const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier : undefined;
    const cookie = typeof req.body?.cookie === 'string' ? req.body.cookie : undefined;
    const account = await selfBotManager.connectRobloxAccount({ identifier, cookie });
    res.json({ ok: true, account, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Kết nối tài khoản Roblox thất bại.',
    });
  }
});

app.post('/api/roblox/disconnect', (_req, res) => {
  selfBotManager.disconnectRobloxAccount();
  res.json({ ok: true, state: selfBotManager.getPublicState() });
});

app.post('/api/roblox/sync', async (_req, res) => {
  try {
    const presence = await selfBotManager.syncRobloxPresenceNow();
    res.json({ ok: true, presence, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Đồng bộ trạng thái Roblox thất bại.',
    });
  }
});

app.get('/api/voice/guilds', async (_req, res) => {
  try {
    const guilds = await selfBotManager.fetchVoiceGuilds();
    res.json({ ok: true, guilds });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không tải được danh sách Server.',
    });
  }
});

app.get('/api/voice/guilds/:guildId/channels', async (req, res) => {
  try {
    const channels = await selfBotManager.fetchGuildVoiceChannels(req.params.guildId);
    res.json({ ok: true, channels });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không tải được danh sách kênh thoại.',
    });
  }
});

app.post('/api/voice/join', (req, res) => {
  try {
    const guildId = typeof req.body?.guildId === 'string' ? req.body.guildId : undefined;
    const channelId = typeof req.body?.channelId === 'string' ? req.body.channelId : undefined;
    const selfMute = typeof req.body?.selfMute === 'boolean' ? req.body.selfMute : undefined;
    const selfDeaf = typeof req.body?.selfDeaf === 'boolean' ? req.body.selfDeaf : undefined;
    const autoStream = typeof req.body?.autoStream === 'boolean' ? req.body.autoStream : undefined;
    selfBotManager.joinVoice({ guildId, channelId, selfMute, selfDeaf, autoStream });
    res.json({ ok: true, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể vào kênh thoại.',
    });
  }
});

app.post('/api/voice/leave', (_req, res) => {
  selfBotManager.leaveVoice();
  res.json({ ok: true, state: selfBotManager.getPublicState() });
});

app.post('/api/voice/stream/start', (req, res) => {
  try {
    const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : undefined;
    selfBotManager.startStreamImage(imageDataUrl);
    res.json({ ok: true, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể bắt đầu stream ảnh.',
    });
  }
});

app.post('/api/voice/stream/stop', (_req, res) => {
  selfBotManager.stopStreamImage();
  res.json({ ok: true, state: selfBotManager.getPublicState() });
});

app.post('/api/voice/stream/image', (req, res) => {
  try {
    const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : '';
    selfBotManager.updateStreamImage(imageDataUrl);
    res.json({ ok: true, state: selfBotManager.getPublicState() });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Cập nhật ảnh stream thất bại.',
    });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
