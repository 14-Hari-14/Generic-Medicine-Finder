/**
 * Basket — Multi-medicine savings calculator for Generic Medicine Finder
 *
 * Lets the user build a list of their family's medicines, set how many
 * tablets/day they take, and see total monthly + yearly savings.
 *
 * Exposes: window.Basket
 *   - add(item) / remove(brand) / toggle(item) / has(brand)
 *   - setTabs(brand, tabsPerDay)
 *   - get() / count() / clear()
 *   - computeItem(item, tabsPerDay)  — shared regimen math (also used by app.js)
 *   - totals() / whatsappText() / render()
 *   - open() / close()
 */

(function () {
    "use strict";

    const STORAGE_KEY = "altmed_basket";

    // ===== STATE =====
    let items = [];
    let open = false;

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) items = parsed;
        }
    } catch (e) { /* ignore */ }

    // ===== REGIMEN MATH (shared) =====
    function computeItem(item, tabsPerDay) {
        const packSize =
            parseInt((item.pack || "").match(/\d+/)?.[0] || "10", 10) || 10;
        const t = Math.max(parseFloat(tabsPerDay) || 1, 0.5);
        const packsPerMonth = Math.max(1, Math.ceil((t * 30) / packSize));
        const brandMonthly = (item.brandMRP || 0) * packsPerMonth;
        const genericMonthly = (item.genericMRP || 0) * packsPerMonth;
        const savingsMonthly = Math.max(0, brandMonthly - genericMonthly);
        return {
            packSize,
            packsPerMonth,
            brandMonthly,
            genericMonthly,
            savingsMonthly,
            savingsYearly: savingsMonthly * 12,
            perTabBrand: item.brandMRP ? item.brandMRP / packSize : 0,
            perTabGeneric: item.genericMRP ? item.genericMRP / packSize : 0,
        };
    }

    // ===== HELPERS =====
    function $(id) { return document.getElementById(id); }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
        catch (e) { /* ignore */ }
    }

    function indexOfBrand(brand) {
        return items.findIndex(
            (i) => i.brand.toLowerCase() === String(brand).toLowerCase()
        );
    }

    // ===== BASKET API =====
    function add(item) {
        if (indexOfBrand(item.brand) !== -1) return;
        items.push({
            brand: item.brand,
            salt: item.salt || "",
            strength: item.strength || "",
            pack: item.pack || "",
            brandMRP: item.brandMRP || 0,
            genericMRP: item.genericMRP || 0,
            genericName: item.genericName || "",
            manufacturer: item.manufacturer || "",
            category: item.category || "",
            savings: item.savings || 0,
            savingsPct: item.savingsPct || 0,
            tabsPerDay: 1,
        });
        save();
        render();
    }

    function remove(brand) {
        const idx = indexOfBrand(brand);
        if (idx !== -1) {
            items.splice(idx, 1);
            save();
            render();
        }
    }

    function toggle(item) {
        if (has(item.brand)) {
            remove(item.brand);
            return false;
        }
        add(item);
        return true;
    }

    function has(brand) {
        return indexOfBrand(brand) !== -1;
    }

    function setTabs(brand, tabsPerDay) {
        const idx = indexOfBrand(brand);
        if (idx === -1) return;
        items[idx].tabsPerDay = Math.min(24, Math.max(0.5, parseFloat(tabsPerDay) || 1));
        save();
        render();
    }

    function get() { return items.slice(); }
    function count() { return items.length; }
    function clear() { items = []; save(); render(); }

    function totals() {
        let monthlySavings = 0;
        let monthlyBrand = 0;
        let monthlyGeneric = 0;
        items.forEach((i) => {
            const c = computeItem(i, i.tabsPerDay);
            monthlySavings += c.savingsMonthly;
            monthlyBrand += c.brandMonthly;
            monthlyGeneric += c.genericMonthly;
        });
        return {
            count: items.length,
            monthlySavings,
            yearlySavings: monthlySavings * 12,
            monthlyBrand,
            monthlyGeneric,
        };
    }

    // ===== WHATSAPP TEXT =====
    function shareUrl() {
        return window.location.href.split("#")[0].split("?")[0];
    }

    function whatsappText() {
        const base = shareUrl();
        if (items.length === 0) {
            return `💊 Generic Medicine Savings\n\nUse this tool to check how much you can save on medicines with Jan Aushadhi generics.\n${base}`;
        }
        const lines = items.map((i, n) => {
            const c = computeItem(i, i.tabsPerDay);
            return `${n + 1}. ${i.brand} (${i.strength}) — save ₹${c.savingsMonthly.toFixed(0)}/month`;
        });
        const t = totals();
        return [
            "💊 *My Medicine Savings List*",
            "",
            ...lines,
            "",
            `💰 *Total monthly savings: ₹${t.monthlySavings.toFixed(0)}*`,
            `📆 *Total yearly savings: ₹${t.yearlySavings.toFixed(0)}*`,
            "",
            "Ask your doctor to prescribe generic (salt) names, and buy them at a Jan Aushadhi Kendra.",
            `Check prices here: ${base}`,
        ].join("\n");
    }

    function singleWhatsappText(item) {
        const base = shareUrl();
        const c = computeItem(item, 1);
        const brandMRP = item.brandMRP ? `₹${Number(item.brandMRP).toFixed(2)}` : "—";
        const genericMRP = item.genericMRP
            ? `₹${Number(item.genericMRP).toFixed(2)}`
            : "Not in Jan Aushadhi yet";
        const lines = [
            "💊 *Generic Medicine Comparison*",
            `*${item.brand}* (${item.salt}${item.strength ? " " + item.strength : ""})`,
            `Brand MRP: ${brandMRP} / ${item.pack || "pack"}`,
            `Jan Aushadhi: ${genericMRP} / ${item.pack || "pack"}`,
        ];
        if (item.genericMRP && item.savingsPct > 0) {
            lines.push(
                "",
                `✅ *You save ${item.savingsPct}% = ₹${Number(item.savings).toFixed(2)}/pack*`,
                `💡 About ₹${c.savingsMonthly.toFixed(0)}/month · ₹${c.savingsYearly.toFixed(0)}/year`,
                "",
                "Same active salt, available at Jan Aushadhi Kendras. Ask your doctor before switching.",
                `Check: ${base}`
            );
        }
        return lines.join("\n");
    }

    function shareOnWhatsApp(text) {
        // WhatsApp needs no API — its official free web deep link carries the
        // message in the URL. We link straight to api.whatsapp.com/send (the
        // target wa.me redirects to anyway) because wa.me's own redirect
        // corrupts multibyte characters (emoji become ). We trigger a real
        // anchor click (not window.open) so popup-blockers can't ignore it:
        // desktop opens WhatsApp Web, phones open the installed app.
        const url = "https://api.whatsapp.com/send/?text=" + encodeURIComponent(text);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ===== UI: FAB (floating button) =====
    function initUI() {
        // FAB
        const fab = $("basketFab");
        const overlay = $("basketOverlay");
        const drawer = $("basketDrawer");

        if (fab) fab.addEventListener("click", openDrawer);
        if (overlay) overlay.addEventListener("click", closeDrawer);
        if ($("basketCloseBtn")) $("basketCloseBtn").addEventListener("click", closeDrawer);
        if ($("basketClearBtn")) $("basketClearBtn").addEventListener("click", () => {
            if (items.length === 0) return;
            if (confirm(tSafe("basketClearConfirm"))) clear();
        });
        if ($("basketWhatsAppBtn")) $("basketWhatsAppBtn").addEventListener("click", () => {
            shareOnWhatsApp(whatsappText());
        });
        if ($("basketShareBtn")) $("basketShareBtn").addEventListener("click", () => {
            shareOnWhatsApp(whatsappText());
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && open) closeDrawer();
        });
    }

    function openDrawer() {
        open = true;
        render();
        const overlay = $("basketOverlay");
        const drawer = $("basketDrawer");
        if (overlay) {
            overlay.classList.remove("hidden");
            requestAnimationFrame(() => overlay.classList.remove("opacity-0"));
        }
        if (drawer) {
            drawer.classList.remove("translate-x-full");
        }
        document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
        open = false;
        const overlay = $("basketOverlay");
        const drawer = $("basketDrawer");
        if (drawer) drawer.classList.add("translate-x-full");
        if (overlay) {
            overlay.classList.add("opacity-0");
            setTimeout(() => overlay.classList.add("hidden"), 300);
        }
        document.body.style.overflow = "";
    }

    // ===== UI: RENDER =====
    function render() {
        const fab = $("basketFab");
        const badge = $("basketCount");
        if (fab) {
            fab.classList.toggle("hidden", items.length === 0);
            if (badge) badge.textContent = items.length;
        }

        const listEl = $("basketItems");
        const emptyEl = $("basketEmpty");
        const footerEl = $("basketFooter");
        const countLabel = $("basketCountLabel");
        if (countLabel) countLabel.textContent = items.length;

        if (!listEl) return;

        const t = totals();
        const empty = items.length === 0;

        if (emptyEl) emptyEl.classList.toggle("hidden", !empty);
        if (footerEl) footerEl.classList.toggle("hidden", empty);
        if (listEl) listEl.classList.toggle("hidden", empty);

        if (empty) return;

        listEl.innerHTML = "";
        items.forEach((it) => {
            listEl.appendChild(renderItemRow(it));
        });

        // Totals in footer
        const elMonth = $("basketTotalMonthly");
        const elYear = $("basketTotalYearly");
        const elAnchor = $("basketAnchor");
        if (elMonth) elMonth.textContent = t.monthlySavings.toFixed(0);
        if (elYear) elYear.textContent = t.yearlySavings.toFixed(0);
        if (elAnchor) {
            const a = getAnchor(t.yearlySavings);
            elAnchor.textContent = a ? a.text : "";
            elAnchor.classList.toggle("hidden", !a);
        }
    }

    function renderItemRow(it) {
        const wrap = document.createElement("div");
        wrap.className =
            "basket-item bg-white border border-gray-200 rounded-xl p-3 shadow-sm";

        // Header: brand + remove
        const head = document.createElement("div");
        head.className = "flex items-start justify-between gap-2";

        const title = document.createElement("div");
        const brand = document.createElement("p");
        brand.className = "font-semibold text-sm text-gray-800";
        brand.textContent = it.brand;
        const meta = document.createElement("p");
        meta.className = "text-xs text-gray-500";
        meta.textContent =
            (it.salt || "") + (it.strength ? " " + it.strength : "") +
            (it.pack ? " · " + it.pack : "");
        title.appendChild(brand);
        title.appendChild(meta);

        const removeBtn = document.createElement("button");
        removeBtn.className =
            "w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition font-bold";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label", "Remove");
        removeBtn.addEventListener("click", () => {
            remove(it.brand);
            renderResultButtons();
        });

        head.appendChild(title);
        head.appendChild(removeBtn);

        // Body: dosage stepper + savings
        const body = document.createElement("div");
        body.className = "flex items-center justify-between mt-2";

        const stepper = document.createElement("div");
        stepper.className = "flex items-center gap-1";
        const minus = stepperBtn("−");
        minus.classList.add("basket-minus");
        minus.addEventListener("click", () => setTabs(it.brand, it.tabsPerDay - 0.5));
        stepper.appendChild(minus);
        const val = document.createElement("span");
        val.className =
            "w-10 text-center font-bold text-sm text-gray-800 inline-block";
        val.textContent = it.tabsPerDay;
        stepper.appendChild(val);
        const plus = stepperBtn("+");
        plus.classList.add("basket-plus");
        plus.addEventListener("click", () => setTabs(it.brand, it.tabsPerDay + 0.5));
        stepper.appendChild(plus);
        const dayLabel = document.createElement("span");
        dayLabel.className = "text-xs text-gray-400 ml-1";
        dayLabel.textContent = tSafe("tabsPerDayShort");
        stepper.appendChild(dayLabel);

        const saveEl = document.createElement("div");
        saveEl.className = "text-right";
        const label = document.createElement("p");
        label.className = "text-[10px] text-gray-400 uppercase tracking-wide";
        label.textContent = tSafe("basketSaveLabel");
        const amt = document.createElement("p");
        amt.className = "text-sm font-bold text-green-600";
        const c = computeItem(it, it.tabsPerDay);
        amt.textContent = `₹${c.savingsMonthly.toFixed(0)}/mo`;
        saveEl.appendChild(label);
        saveEl.appendChild(amt);

        body.appendChild(stepper);
        body.appendChild(saveEl);

        wrap.appendChild(head);
        wrap.appendChild(body);
        return wrap;
    }

    function renderResultButtons() {
        // If a result is visible, let app.js refresh its Add-to-List button state
        if (window.__refreshResultButtons) window.__refreshResultButtons();
    }

    function stepperBtn(label) {
        const b = document.createElement("button");
        b.className =
            "w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-orange-50 hover:border-orange-300 transition font-bold";
        b.textContent = label;
        return b;
    }

    // ===== ANCHORS (real-world savings comparisons) =====
    function getAnchor(yearlySavings) {
        const y = yearlySavings || 0;
        const ANCHORS = [
            { min: 5000, n: 5000, key: "anchorGroceries" },
            { min: 3000, key: "anchorSchool" },
            { min: 1000, n: 1000, key: "anchorLPG" },
            { min: 300, n: 300, key: "anchorMobile" },
        ];
        for (const a of ANCHORS) {
            if (y >= a.min) {
                const n = a.n ? Math.max(1, Math.floor(y / a.n)) : 1;
                return { text: tSafe(a.key).replace("{n}", n) };
            }
        }
        return null;
    }

    function showToast(msg) {
        let toast = $("toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast";
            toast.className =
                "toast fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-medium shadow-xl";
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add("toast-show");
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove("toast-show"), 2200);
    }

    // ===== PUBLIC API =====
    window.Basket = {
        add,
        remove,
        toggle,
        has,
        setTabs,
        get,
        count,
        clear,
        totals,
        computeItem,
        getAnchor,
        render,
        open: openDrawer,
        close: closeDrawer,
        whatsappText,
        singleWhatsappText,
        shareOnWhatsApp,
        showToast,
    };

    // Auto-init on DOM ready
    function boot() {
        initUI();
        render();
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
