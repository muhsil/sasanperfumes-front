import Script from "next/script";
import { GoogleTagManager } from "./GoogleTagManager";

interface GoogleTagScriptsProps {
  gaId?: string;
  googleAdsId?: string;
  gtmId?: string;
}

function buildGoogleAnalyticsSnippet(gaId: string, googleAdsId?: string): string {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = window.gtag || gtag;
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
  `;
}

export function GoogleTagScripts({ gaId, googleAdsId, gtmId }: GoogleTagScriptsProps) {
  if (gtmId) {
    return <GoogleTagManager gtmId={gtmId} />;
  }

  if (!gaId) return null;

  return (
    <>
      <Script
        id="google-gtag-js"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script id="google-gtag-init" strategy="lazyOnload">
        {buildGoogleAnalyticsSnippet(gaId, googleAdsId)}
      </Script>
    </>
  );
}
