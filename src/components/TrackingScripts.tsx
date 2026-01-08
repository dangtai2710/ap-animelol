import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function TrackingScripts() {
  const { data: settings } = useSiteSettings();

  const gaId = settings?.google_analytics_id;
  const gtmId = settings?.google_tag_manager_id;
  const headHtml = settings?.head_html;

  // GTM noscript fallback (inject into body)
  useEffect(() => {
    if (gtmId) {
      // Check if GTM noscript already exists
      const existingNoscript = document.getElementById("gtm-noscript");
      if (!existingNoscript) {
        const noscript = document.createElement("noscript");
        noscript.id = "gtm-noscript";
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
        iframe.height = "0";
        iframe.width = "0";
        iframe.style.display = "none";
        iframe.style.visibility = "hidden";
        noscript.appendChild(iframe);
        document.body.insertBefore(noscript, document.body.firstChild);
      }
    }

    return () => {
      const existingNoscript = document.getElementById("gtm-noscript");
      if (existingNoscript) {
        existingNoscript.remove();
      }
    };
  }, [gtmId]);

  // Handle custom head HTML
  useEffect(() => {
    if (headHtml) {
      // Create a container for custom head elements
      let container = document.getElementById("custom-head-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "custom-head-container";
        container.style.display = "none";
        document.head.appendChild(container);
      }

      // Parse and inject scripts
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = headHtml;

      // Handle scripts separately (they need to be executed)
      const scripts = tempDiv.querySelectorAll("script");
      scripts.forEach((script) => {
        const newScript = document.createElement("script");
        if (script.src) {
          newScript.src = script.src;
          newScript.async = script.async;
        } else {
          newScript.textContent = script.textContent;
        }
        // Copy attributes
        Array.from(script.attributes).forEach((attr) => {
          if (attr.name !== "src") {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        newScript.setAttribute("data-custom-head", "true");
        document.head.appendChild(newScript);
      });

      // Handle other elements (meta, link, style)
      const otherElements = tempDiv.querySelectorAll("meta, link, style");
      otherElements.forEach((el) => {
        const clone = el.cloneNode(true) as Element;
        clone.setAttribute("data-custom-head", "true");
        document.head.appendChild(clone);
      });
    }

    return () => {
      // Cleanup custom head elements
      const customElements = document.querySelectorAll("[data-custom-head='true']");
      customElements.forEach((el) => el.remove());
    };
  }, [headHtml]);

  return (
    <>
      {/* Google Tag Manager */}
      {gtmId && (
        <Helmet>
          <script>
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`}
          </script>
        </Helmet>
      )}

      {/* Google Analytics 4 */}
      {gaId && (
        <Helmet>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
          <script>
            {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');`}
          </script>
        </Helmet>
      )}
    </>
  );
}
