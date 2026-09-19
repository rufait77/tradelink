import { useEffect, useState } from 'react';
import api from './api';

interface PlatformSettings {
  commissionPct: number;
  platformFeePct: number;
  signupFee: string;
  subscriptionFee: string;
  // Referrer role (Worker A)
  referrerCommissionPct: number;
  referrerSignupFee: string;
  referrerRequiresSubscription: boolean;
}

const defaults: PlatformSettings = {
  commissionPct: 20,
  platformFeePct: 5,
  signupFee: '29.99',
  subscriptionFee: '9.99',
  referrerCommissionPct: 5,
  referrerSignupFee: '10.00',
  referrerRequiresSubscription: false,
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
          referrerCommissionPct: Number(d.referrerCommissionPct) || defaults.referrerCommissionPct,
          referrerSignupFee: Number(d.referrerSignupFee ?? defaults.referrerSignupFee).toFixed(2),
          referrerRequiresSubscription: d.referrerRequiresSubscription === true,
        };
      }).catch(() => {}).then(() => {});
    }
    fetching.then(() => {
      if (cached) setSettings(cached);
    });
  }, []);

  return settings;
}
