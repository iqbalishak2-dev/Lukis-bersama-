// Gantikan blok // PWA lama dalam index.html dengan kod ini.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Pendaftaran Service Worker gagal:", err);
    });
  }, { once: true });
}

(() => {
  if (window.__lukisPwaInstallLoaded) return;
  window.__lukisPwaInstallLoaded = true;

  let installPrompt = null;
  const standalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (standalone()) return;

  const ins = document.createElement("button");
  ins.type = "button";
  ins.id = "pwa-install-btn";
  ins.className = "t";
  ins.textContent = "📲 Pasang sebagai app";
  ins.setAttribute("aria-label", "Pasang Lukis Bersama sebagai aplikasi");
  Object.assign(ins.style, {
    position: "fixed",
    zIndex: "10000",
    right: "12px",
    bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    background: "var(--accent)",
    color: "#fff",
    borderColor: "var(--accent)",
    boxShadow: "0 4px 14px rgba(0,0,0,.22)"
  });
  document.body.appendChild(ins);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    ins.textContent = "📲 Pasang sebagai app";
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    ins.remove();
  });

  ins.addEventListener("click", async () => {
    if (installPrompt) {
      const promptEvent = installPrompt;
      installPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === "accepted") ins.remove();
      } catch (error) {
        console.error("Prompt pemasangan gagal:", error);
        showInstructions();
      }
      return;
    }
    showInstructions();
  });

  function showInstructions() {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) {
      alert("Untuk memasang Lukis Bersama di iPhone/iPad:\n\n1. Buka laman ini dalam Safari.\n2. Tekan Share.\n3. Pilih Add to Home Screen.\n4. Tekan Add.");
    } else {
      alert("Chrome belum menyediakan prompt pemasangan automatik.\n\nPastikan manifest.webmanifest, ikon dan sw.js berjaya dimuatkan. Kemudian buka menu Chrome (⋮) dan pilih Install app atau Add to Home screen jika tersedia.");
    }
  }
})();
