"use client";

import Script from "next/script";

interface GoogleAnalyticsProps {
  gaId: string;
  googleAdsId?: string;
}

export function GoogleAnalytics({ gaId, googleAdsId }: GoogleAnalyticsProps) {
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = function gtag(){window.dataLayer.push(arguments);}
          gtag('consent', 'default', {
            'ad_personalization': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'analytics_storage': 'denied',
            'region': ['AT','BE','BG','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT','RO','SE','SI','SK'],
            'wait_for_update': 500
          });
          gtag('js', new Date());
          gtag('set', 'developer_id.dOGY3NW', true);
          gtag('config', '${gaId}', {
            'allow_google_signals': true,
            'linker': { 'domains': [], 'allow_incoming': true }
          });
          ${googleAdsId ? `gtag('config', '${googleAdsId}', { 'groups': 'GLA', 'send_page_view': false });` : ''}
        `}
      </Script>
    </>
  );
}
