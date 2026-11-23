export interface RobloxProfile {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  hasVerifiedBadge?: boolean;
  authenticatedByCookie: boolean;
}

export interface RobloxLivePresence {
  userPresenceType: 0 | 1 | 2 | 3; // 0=Offline, 1=Online, 2=InGame, 3=InStudio
  lastLocation: string;
  placeId: number | null;
  rootPlaceId: number | null;
  universeId: number | null;
  gameId: string | null;
  gameName: string | null;
  gameIconUrl: string | null;
  updatedAt: string;
}

const ROBLOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function cleanRoblosecurityCookie(raw: string): string {
  let clean = raw.trim().replace(/^["']|["']$/g, '');
  clean = clean.replace(/^\.ROBLOSECURITY=/i, '').trim();
  // Strip trailing cookie attributes if user copied full Set-Cookie/Cookie header
  if (clean.includes(';')) {
    clean = clean.split(';')[0].trim();
  }
  return clean;
}

async function fetchRobloxAvatarHeadshot(userId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
      { headers: { 'User-Agent': ROBLOX_UA } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ state?: string; imageUrl?: string }>;
    };
    return json.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

export async function resolveRobloxByCookie(rawCookie: string): Promise<{
  profile: RobloxProfile;
  cookie: string;
}> {
  const cookie = cleanRoblosecurityCookie(rawCookie);
  if (!cookie) {
    throw new Error('Cookie .ROBLOSECURITY không được để trống.');
  }

  const res = await fetch('https://users.roblox.com/v1/users/authenticated', {
    method: 'GET',
    headers: {
      'User-Agent': ROBLOX_UA,
      Cookie: `.ROBLOSECURITY=${cookie}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Cookie .ROBLOSECURITY không hợp lệ hoặc đã hết hạn (${res.status}): ${text.slice(0, 120)}`
    );
  }

  const user = (await res.json()) as {
    id: number;
    name: string;
    displayName: string;
  };

  const avatarUrl = await fetchRobloxAvatarHeadshot(user.id);

  return {
    cookie,
    profile: {
      userId: user.id,
      username: user.name,
      displayName: user.displayName || user.name,
      avatarUrl,
      authenticatedByCookie: true,
    },
  };
}

export async function resolveRobloxByIdentifier(identifier: string): Promise<RobloxProfile> {
  const clean = identifier.trim().replace(/^@/, '');
  if (!clean) {
    throw new Error('Vui lòng nhập Username hoặc User ID Roblox.');
  }

  if (/^\d+$/.test(clean)) {
    const userId = Number(clean);
    const res = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': ROBLOX_UA },
    });
    if (!res.ok) {
      throw new Error(`Không tìm thấy User ID Roblox ${userId} (${res.status}).`);
    }
    const user = (await res.json()) as {
      id: number;
      name: string;
      displayName: string;
      hasVerifiedBadge?: boolean;
    };
    const avatarUrl = await fetchRobloxAvatarHeadshot(user.id);
    return {
      userId: user.id,
      username: user.name,
      displayName: user.displayName || user.name,
      avatarUrl,
      hasVerifiedBadge: Boolean(user.hasVerifiedBadge),
      authenticatedByCookie: false,
    };
  }

  const res = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ROBLOX_UA,
    },
    body: JSON.stringify({
      usernames: [clean],
      excludeBannedUsers: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Không tra cứu được username Roblox (${res.status}).`);
  }

  const json = (await res.json()) as {
    data?: Array<{
      id: number;
      name: string;
      displayName: string;
      hasVerifiedBadge?: boolean;
    }>;
  };

  const match = json.data?.[0];
  if (!match) {
    throw new Error(`Không tìm thấy tài khoản Roblox có username "${clean}".`);
  }

  const avatarUrl = await fetchRobloxAvatarHeadshot(match.id);
  return {
    userId: match.id,
    username: match.name,
    displayName: match.displayName || match.name,
    avatarUrl,
    hasVerifiedBadge: Boolean(match.hasVerifiedBadge),
    authenticatedByCookie: false,
  };
}

export async function fetchRobloxPresence(
  userId: number,
  cookie?: string
): Promise<RobloxLivePresence> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': ROBLOX_UA,
  };
  if (cookie) {
    headers.Cookie = `.ROBLOSECURITY=${cookie}`;
  }

  const res = await fetch('https://presence.roblox.com/v1/presence/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userIds: [userId] }),
  });

  if (!res.ok) {
    throw new Error(`Lỗi đọc trạng thái Roblox (${res.status}).`);
  }

  const json = (await res.json()) as {
    userPresences?: Array<{
      userPresenceType?: number;
      lastLocation?: string;
      placeId?: number | null;
      rootPlaceId?: number | null;
      universeId?: number | null;
      gameId?: string | null;
    }>;
  };

  const p = json.userPresences?.[0];
  const presenceType = (p?.userPresenceType ?? 0) as 0 | 1 | 2 | 3;
  const universeId = p?.universeId ?? null;
  const placeId = p?.placeId ?? null;
  const rootPlaceId = p?.rootPlaceId ?? null;
  const lastLocation = p?.lastLocation || 'Offline';

  let gameName: string | null = null;
  let gameIconUrl: string | null = null;

  if (universeId) {
    try {
      const [gameRes, iconRes] = await Promise.all([
        fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
          headers: { 'User-Agent': ROBLOX_UA },
        }),
        fetch(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`,
          { headers: { 'User-Agent': ROBLOX_UA } }
        ),
      ]);
      if (gameRes.ok) {
        const gJson = (await gameRes.json()) as { data?: Array<{ name?: string }> };
        gameName = gJson.data?.[0]?.name || null;
      }
      if (iconRes.ok) {
        const iJson = (await iconRes.json()) as { data?: Array<{ imageUrl?: string }> };
        gameIconUrl = iJson.data?.[0]?.imageUrl || null;
      }
    } catch {
      // ignore metadata lookup errors
    }
  } else if (presenceType === 2 && lastLocation && lastLocation !== 'Playing' && lastLocation !== 'Website') {
    gameName = lastLocation;
  }

  return {
    userPresenceType: presenceType,
    lastLocation,
    placeId,
    rootPlaceId,
    universeId,
    gameId: p?.gameId ?? null,
    gameName,
    gameIconUrl,
    updatedAt: new Date().toISOString(),
  };
}
