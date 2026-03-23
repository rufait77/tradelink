import { useEffect, useState } from 'react';
import api from './api';

interface PlatformSettings {
  commissionPct: number;
  platformFeePct: number;
  signupFee: string;
  subscriptionFee: string;
}

const defaults: PlatformSettings = {
  commissionPct: 20,
  platformFeePct: 5,
  signupFee: '29.99',
  subscriptionFee: '9.99',
};

let cached: PlatformSettings | null = null;
let fetching: Promise<void> | null = null;

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(cached || defaults);

  useEffect(() => {
    if (cached) {
      setSettings(cached);
      return;
    }
    if (!fetching) {
      fetching = api.get('/settings/public').then((res) => {
        const d = res.data.data;
        cached = {
          commissionPct: Number(d.commissionPct) || defaults.commissionPct,
          platformFeePct: Number(d.platformFeePct) || defaults.platformFeePct,
          signupFee: String(d.signupFee ?? defaults.signupFee),
          subscriptionFee: String(d.subscriptionFee ?? defaults.subscriptionFee),
        };
      }).catch(() => {}).then(() => {});
    }
    fetching.then(() => {
      if (cached) setSettings(cached);
    });
  }, []);

  return settings;
}
