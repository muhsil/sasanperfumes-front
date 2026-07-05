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

function buildGoogleTagManagerSnippet(gtmId: string): string {
  return `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `;
}

export function GoogleTagScripts({ gaId, googleAdsId, gtmId }: GoogleTagScriptsProps) {
  if (gtmId) {
    return (
      <>
        <script dangerouslySetInnerHTML={{ __html: buildGoogleTagManagerSnippet(gtmId) }} />
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      </>
    );
  }

  if (!gaId) return null;

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
      <script dangerouslySetInnerHTML={{ __html: buildGoogleAnalyticsSnippet(gaId, googleAdsId) }} />
    </>
  );
}
