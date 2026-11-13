/**
 * Generic Medicine Finder — Main Application
 * 
 * Handles: data loading, search, suggestions, result rendering, PDF generation
 */

(function () {
    "use strict";

    // ===== STATE =====
    let brandsData = [];
    let fuse = null;
    let currentResult = null;
    let currentTabs = 1;        // tablets/day for the regimen stepper
    let currentCondition = null;

    // Conditions shown as browse chips on the homepage
    const CONDITIONS = [
        { id: "diabetes", emoji: "🍬", labelKey: "condDiabetes", categories: ["Antidiabetic"] },
        { id: "bp-heart", emoji: "🫀", labelKey: "condBPHeart", categories: ["Cardiac"] },
        { id: "pain-fever", emoji: "🤒", labelKey: "condPainFever", categories: ["Analgesic"] },
        { id: "infection", emoji: "🦠", labelKey: "condInfection", categories: ["Antibiotic"] },
        { id: "acidity", emoji: "🍽️", labelKey: "condAcidity", categories: ["Gastro"] },
        { id: "asthma", emoji: "🫁", labelKey: "condAsthma", categories: ["Respiratory"] },
        { id: "allergy", emoji: "🤧", labelKey: "condAllergy", categories: ["Allergy"] },
        { id: "thyroid", emoji: "🦋", labelKey: "condThyroid", categories: ["Thyroid"] },
        { id: "vitamins", emoji: "💪", labelKey: "condVitamins", categories: ["Supplement"] },
        { id: "mental", emoji: "🧠", labelKey: "condMental", categories: ["Neuro"] },
        { id: "urology", emoji: "🧪", labelKey: "condUrology", categories: ["Urology"] },
    ];

    // DOM references (cached)
    const $ = (id) => document.getElementById(id);
    const searchInput = $("searchInput");
    const suggestions = $("suggestions");
    const resultsSection = $("resultsSection");
    const resultContent = $("resultContent");
    const loadingState = $("loadingState");
    const notFoundState = $("notFoundState");
    const similarList = $("similarList");

    // ===== INIT =====
    async function init() {
        showLoading(true);
        try {
            await loadData();
            setupSearch();
            setupEventListeners();
            renderConditionChips();
            hideLoading();
        } catch (err) {
            console.error("Init error:", err);
            hideLoading();
            showError("Failed to load medicine data. Please refresh.");
        }
    }

    // ===== DATA LOADING =====
    async function loadData() {
        const resp = await fetch("data/brands.json");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        brandsData = await resp.json();
        console.log(`Loaded ${brandsData.length} medicines`);
    }

    function setupSearch() {
        fuse = new Fuse(brandsData, {
            includeScore: true,
            keys: [
                { name: "brand", weight: 3 },
                { name: "salt", weight: 1 },
            ],
            threshold: 0.3,
            distance: 50,
            minMatchCharLength: 2,
            shouldSort: true,
        });
    }

    // ===== SEARCH =====
    function performSearch(query) {
        // Leave condition-browse mode when doing a fresh search
        $("conditionView").classList.add("hidden");

        if (!query || query.trim().length < 2) {
            clearResults();
            return;
        }

        query = query.trim();

        // Try exact match first
        const exact = brandsData.find(
            (b) => b.brand.toLowerCase() === query.toLowerCase()
        );
        if (exact) {
            renderResult(exact);
            hideSuggestions();
            return;
        }

        // Fuzzy search
        const results = fuse.search(query);
        if (results.length === 0) {
            renderNotFound(query);
            return;
        }

        // Show first result
        renderResult(results[0].item);
        hideSuggestions();
    }

    // ===== SUGGESTIONS (autocomplete) =====
    function showSuggestions(query) {
        if (!query || query.trim().length < 2) {
            hideSuggestions();
            return;
        }

        const results = fuse.search(query.trim(), { limit: 10 });

        if (results.length === 0) {
            hideSuggestions();
            return;
        }

        suggestions.innerHTML = "";
        results.forEach((r, i) => {
            const item = r.item;
            const div = document.createElement("div");
            div.className =
                "suggestion-item px-4 py-3 flex items-center gap-3" +
                (i === 0 ? " highlighted" : "");

            const brandSpan = document.createElement("span");
            brandSpan.className = "font-semibold text-gray-800 text-sm flex-1";
            brandSpan.innerHTML = highlightMatch(item.brand, query);

            const saltSpan = document.createElement("span");
            saltSpan.className = "text-xs text-gray-500";
            saltSpan.textContent = item.salt + (item.strength ? " " + item.strength : "");

            const savingsSpan = document.createElement("span");
            if (item.genericMRP && item.savingsPct > 0) {
                savingsSpan.className =
                    "text-xs font-bold px-2 py-0.5 rounded-full " +
                    (item.savingsPct >= 50
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700");
                savingsSpan.textContent = `${item.savingsPct}% off`;
            } else {
                savingsSpan.className = "text-xs text-gray-400";
                savingsSpan.textContent = "No generic";
            }

            div.appendChild(brandSpan);
            div.appendChild(saltSpan);
            div.appendChild(savingsSpan);

            div.addEventListener("click", () => {
                searchInput.value = item.brand;
                hideSuggestions();
                renderResult(item);
            });

            suggestions.appendChild(div);
        });

        suggestions.classList.remove("hidden");
    }

    function highlightMatch(text, query) {
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return (
            text.slice(0, idx) +
            '<span class="highlight">' +
            text.slice(idx, idx + query.length) +
            "</span>" +
            text.slice(idx + query.length)
        );
    }

    function hideSuggestions() {
        suggestions.classList.add("hidden");
    }

    // ===== RENDER RESULT =====
    function renderResult(item) {
        currentResult = item;
        window.__currentResult = item;
        // Expose globally so i18n.js can re-render when language changes
        window.renderResult = renderResult;

        // Show section
        resultContent.classList.remove("hidden");
        notFoundState.classList.remove("show", "hidden");
        notFoundState.classList.add("hidden");
        resultsSection.classList.add("show");

        // Brand name & manufacturer
        $("resultBrandName").textContent = item.brand;
        $("resultBrandNameSmall").textContent = item.manufacturer || "";
        $("resultManufacturer").textContent = item.manufacturer || "";
        $("resultCategory").textContent = item.category || "";

        // Salt / Composition
        $("resultSalt").textContent = item.salt;
        $("resultStrength").textContent = item.strength || "";

        // Pack size
        $("resultPackSize").textContent = item.pack || "";

        // Branded MRP
        $("resultBrandMRP").textContent =
            item.brandMRP ? Number(item.brandMRP).toFixed(2) : "—";

        // Generic
        if (item.genericMRP) {
            $("resultGenericMRP").textContent = Number(item.genericMRP).toFixed(2);
            $("resultGenericName").textContent = item.genericName || "";
            document.querySelectorAll(".no-generic-msg").forEach((el) => el.remove());
        } else {
            // Show "no generic" message
            $("resultGenericMRP").textContent = "—";
            $("resultGenericName").textContent = "";
            showNoGenericMessage();
        }

        // Savings
        $("resultSavingsPct").textContent =
            item.savingsPct > 0 ? `${item.savingsPct}%` : "—";
        $("resultSavingsAmt").textContent =
            item.savings > 0 ? Number(item.savings).toFixed(2) : "—";

        // Regimen-based monthly/yearly math
        updateSavingsMath();
        refreshResultButtons();

        // Hide condition list view (if open)
        $("conditionView").classList.add("hidden");

        // Scroll to results on mobile
        if (window.innerWidth < 640) {
            resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function formatTabs(t) {
        return Number.isInteger(t) ? String(t) : t.toFixed(1);
    }

    // Recompute monthly/yearly savings from currentResult + currentTabs
    function updateSavingsMath() {
        const item = window.__currentResult;
        if (!item) return;
        const c = window.Basket.computeItem(item, currentTabs);

        $("tabsValue").textContent = formatTabs(currentTabs);
        $("resultPackNote").textContent =
            `${item.pack || "—"} · ₹${Number(item.brandMRP || 0).toFixed(2)} per pack`;

        if (item.genericMRP) {
            $("resultPerTab").textContent =
                `₹${c.perTabBrand.toFixed(2)}/tab (brand) vs ₹${c.perTabGeneric.toFixed(2)}/tab (generic)`;
        } else {
            $("resultPerTab").textContent = `₹${c.perTabBrand.toFixed(2)} per tablet`;
        }

        if (item.genericMRP && c.savingsMonthly > 0) {
            $("resultMonthlySavings").textContent = c.savingsMonthly.toFixed(0);
            $("resultYearlySavings").textContent = c.savingsYearly.toFixed(0);
            const anchor = window.Basket.getAnchor(c.savingsYearly);
            $("resultAnchor").textContent = anchor ? anchor.text : "";
            $("resultAnchor").classList.toggle("hidden", !anchor);
        } else {
            $("resultMonthlySavings").textContent = "—";
            $("resultYearlySavings").textContent = "—";
            $("resultAnchor").textContent = "";
            $("resultAnchor").classList.add("hidden");
        }
    }

    // Reflect whether the current medicine is already in the list
    function refreshResultButtons() {
        if (!currentResult) return;
        const btn = $("addToListBtn");
        if (!btn) return;
        const label = btn.querySelector("span");
        const inBasket = window.Basket && window.Basket.has(currentResult.brand);
        if (inBasket) {
            btn.classList.remove("bg-green-600", "hover:bg-green-700");
            btn.classList.add("bg-gray-300", "hover:bg-gray-400", "text-gray-700");
            label.setAttribute("data-i18n", "removeFromList");
            label.textContent = tSafe("removeFromList");
        } else {
            btn.classList.add("bg-green-600", "hover:bg-green-700");
            btn.classList.remove("bg-gray-300", "hover:bg-gray-400", "text-gray-700");
            label.setAttribute("data-i18n", "addToList");
            label.textContent = tSafe("addToList");
        }
    }
    window.__refreshResultButtons = refreshResultButtons;

    function showNoGenericMessage() {
        const container = document.querySelector("#resultContent .grid.grid-cols-1.sm\\:grid-cols-2");
        if (!container) return;

        const existing = container.querySelector(".no-generic-msg");
        if (existing) return;

        const msg = document.createElement("div");
        msg.className =
            "no-generic-msg col-span-full mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700";
        msg.setAttribute("data-i18n", "noGenericDesc");
        msg.textContent = tSafe("noGenericDesc");
        container.appendChild(msg);
    }

    // ===== NOT FOUND =====
    function renderNotFound(query) {
        resultContent.classList.add("hidden");
        notFoundState.classList.remove("hidden");
        notFoundState.classList.add("show");
        resultsSection.classList.add("show");

        // Show similar-sounding brands
        const allBrands = brandsData.map((b) => b.brand);
        const similar = findSimilar(query, allBrands, 5);
        similarList.innerHTML = "";
        similar.forEach((name) => {
            const btn = document.createElement("button");
            btn.className =
                "px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition";
            btn.textContent = name;
            btn.addEventListener("click", () => {
                searchInput.value = name;
                hideSuggestions();
                performSearch(name);
            });
            similarList.appendChild(btn);
        });
    }

    function findSimilar(query, candidates, limit) {
        // Simple Levenshtein-based similarity for brand names
        const results = candidates
            .map((c) => ({ name: c, score: levenshtein(query.toLowerCase(), c.toLowerCase()) }))
            .sort((a, b) => a.score - b.score)
            .slice(0, limit);
        return results.map((r) => r.name);
    }

    function levenshtein(a, b) {
        const m = a.length,
            n = b.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] =
                    a[i - 1] === b[j - 1]
                        ? dp[i - 1][j - 1]
                        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    }

    // ===== CONDITION EXPLORER =====
    function renderConditionChips() {
        const container = $("conditionChips");
        if (!container) return;
        container.innerHTML = "";
        CONDITIONS.forEach((c) => {
            const btn = document.createElement("button");
            btn.className =
                "condition-chip px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-orange-300 hover:text-orange-700 transition shadow-sm";
            btn.innerHTML = `${c.emoji} ${tSafe(c.labelKey)}`;
            btn.addEventListener("click", () => openConditionView(c));
            container.appendChild(btn);
        });
    }

    function buildConditionRows(condition) {
        const items = brandsData.filter((b) =>
            condition.categories.includes(b.category)
        );
        // Group by salt, picking the best-saving brand per salt
        const bySalt = {};
        items.forEach((b) => {
            const key = (b.salt || "").trim().toLowerCase();
            if (!key) return;
            if (!bySalt[key]) bySalt[key] = [];
            bySalt[key].push(b);
        });
        return Object.values(bySalt)
            .map((group) => {
                const withGeneric = group.filter((b) => b.genericMRP > 0);
                const pool = withGeneric.length ? withGeneric : group;
                const pick = pool
                    .slice()
                    .sort((a, b) => (b.savingsPct || 0) - (a.savingsPct || 0))[0];
                return {
                    salt: pick.salt,
                    strength: pick.strength,
                    brand: pick.brand,
                    brandMRP: pick.brandMRP,
                    genericMRP: pick.genericMRP,
                    pack: pick.pack,
                    savingsPct: pick.savingsPct,
                    totalBrands: group.length,
                    item: pick,
                };
            })
            .sort(
                (a, b) =>
                    (b.genericMRP ? b.savingsPct || 0 : -1) -
                    (a.genericMRP ? a.savingsPct || 0 : -1)
            );
    }

    function renderConditionRow(row) {
        const div = document.createElement("div");
        div.className =
            "bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-orange-200 transition";

        const main = document.createElement("div");
        main.className = "flex items-start justify-between gap-3";
        main.style.cursor = "pointer";
        main.addEventListener("click", () => {
            searchInput.value = row.brand;
            hideSuggestions();
            performSearch(row.brand);
        });

        const left = document.createElement("div");
        left.className = "min-w-0 flex-1";
        const salt = document.createElement("p");
        salt.className = "font-semibold text-gray-800 text-sm";
        salt.textContent = row.salt + (row.strength ? " " + row.strength : "");
        const meta = document.createElement("p");
        meta.className = "text-xs text-gray-400 mt-0.5";
        meta.textContent =
            row.totalBrands > 1
                ? `${tSafe("conditionExample")} ${row.brand} · ${row.totalBrands} ${tSafe("conditionBrandCount")}`
                : `${tSafe("conditionExample")} ${row.brand}`;
        left.appendChild(salt);
        left.appendChild(meta);

        const price = document.createElement("div");
        price.className = "text-right flex-shrink-0";
        if (row.genericMRP) {
            price.innerHTML = `
                <p class="text-xs text-gray-400 line-through">₹${Number(row.brandMRP).toFixed(2)}</p>
                <p class="text-sm font-bold text-green-700">₹${Number(row.genericMRP).toFixed(2)}</p>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">${row.savingsPct}% off</span>`;
        } else {
            price.innerHTML = `
                <p class="text-xs text-gray-400">₹${Number(row.brandMRP).toFixed(2)}</p>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">${tSafe("noGenericShort")}</span>`;
        }

        main.appendChild(left);
        main.appendChild(price);

        const addBtn = document.createElement("button");
        addBtn.className =
            "mt-3 w-full px-3 py-2 rounded-lg text-sm font-semibold transition text-white hover:opacity-90";
        addBtn.style.background = "#16a34a";
        const refresh = () => {
            const inBasket = window.Basket.has(row.brand);
            addBtn.textContent = inBasket
                ? `✓ ${tSafe("inList")}`
                : `➕ ${tSafe("addToList")}`;
            addBtn.style.background = inBasket ? "#9ca3af" : "#16a34a";
        };
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const added = window.Basket.toggle(row.item);
            refresh();
            window.Basket.showToast(
                added ? tSafe("toastAdded") : tSafe("toastRemoved")
            );
        });
        refresh();

        div.appendChild(main);
        div.appendChild(addBtn);
        return div;
    }

    function openConditionView(condition) {
        currentCondition = condition;
        window.__currentCondition = condition;

        // Show condition view, hide single-result states
        resultContent.classList.add("hidden");
        notFoundState.classList.add("hidden");
        loadingState.classList.add("hidden");
        $("conditionView").classList.remove("hidden");
        resultsSection.classList.add("show");

        $("conditionTitle").textContent = `${condition.emoji} ${tSafe(condition.labelKey)}`;
        $("conditionDesc").textContent = tSafe("conditionDesc");

        const rows = buildConditionRows(condition);
        const list = $("conditionList");
        list.innerHTML = "";
        if (rows.length === 0) {
            const msg = document.createElement("p");
            msg.className = "text-gray-500 text-center py-8";
            msg.textContent = tSafe("conditionEmpty");
            list.appendChild(msg);
            return;
        }
        rows.forEach((row) => list.appendChild(renderConditionRow(row)));

        if (window.innerWidth < 640) {
            resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function exitConditionView() {
        currentCondition = null;
        window.__currentCondition = null;
        $("conditionView").classList.add("hidden");
        resultContent.classList.add("hidden");
        resultsSection.classList.remove("show");
        hideSuggestions();
        searchInput.focus();
    }

    // ===== CLEAR =====
    function clearResults() {
        resultsSection.classList.remove("show");
        resultContent.classList.add("hidden");
        notFoundState.classList.add("hidden");
        notFoundState.classList.remove("show");
        $("conditionView").classList.add("hidden");
        currentResult = null;
        window.__currentResult = null;
    }

    // ===== PDF GENERATION =====
    function generatePDF() {
        if (!currentResult) return;
        const item = currentResult;

        // Fill PDF template
        $("pdfBrandName").textContent = item.brand;
        $("pdfSalt").textContent = item.salt;
        $("pdfStrength").textContent = item.strength || "—";
        $("pdfPack").textContent = item.pack || "—";
        $("pdfManufacturer").textContent = item.manufacturer || "—";

        const brandMRP = item.brandMRP ? `₹${Number(item.brandMRP).toFixed(2)}` : "—";
        const genericMRP = item.genericMRP ? `₹${Number(item.genericMRP).toFixed(2)}` : "Not available";
        $("pdfBrandMRP").textContent = brandMRP;
        $("pdfGenericMRP").textContent = genericMRP;

        if (item.savings > 0) {
            $("pdfSavingsPerPack").textContent = `₹${Number(item.savings).toFixed(2)} (${item.savingsPct}% savings)`;
            const monthlyTabs = 30;
            const packMatch = item.pack ? item.pack.match(/\d+/) : null;
            const packSize = packMatch ? parseInt(packMatch[0]) : 10;
            const packsPerMonth = Math.ceil(monthlyTabs / packSize);
            const monthly = (item.savings * packsPerMonth).toFixed(0);
            $("pdfMonthlySavings").textContent = `₹${monthly}`;
            $("pdfYearlySavings").textContent = `₹${(monthly * 12).toFixed(0)}/year`;
        } else {
            $("pdfSavingsPerPack").textContent = "—";
            $("pdfMonthlySavings").textContent = "—";
            $("pdfYearlySavings").textContent = "—";
        }

        // Render to canvas and generate PDF
        // The template is display:none, so clone it off-screen for html2canvas
        const source = $("pdfContent");
        const clone = source.cloneNode(true);
        clone.id = "pdfContentClone";
        clone.style.position = "fixed";
        clone.style.left = "-10000px";
        clone.style.top = "0";
        clone.style.zIndex = "-1000";
        clone.style.display = "block";
        document.body.appendChild(clone);

        html2canvas(clone, {
            scale: 1.5,
            backgroundColor: "#ffffff",
            logging: false,
            width: 560,
        }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
            pdf.save(`generic-comparison-${item.brand.replace(/\s+/g, "-")}.pdf`);
        }).catch((err) => {
            console.error("PDF generation failed:", err);
            alert("Could not generate PDF. Please try again.");
        }).finally(() => {
            clone.remove();
        });
    }

    // ===== UI HELPERS =====
    function showLoading(show) {
        loadingState.classList.toggle("hidden", !show);
    }

    function hideLoading() {
        loadingState.classList.add("hidden");

        // Update date badge
        const dateEl = $("dataDate");
        if (dateEl) {
            const now = new Date();
            const months = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            dateEl.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
        }
    }

    function showError(msg) {
        const container = document.querySelector("#resultsSection") || document.body;
        const div = document.createElement("div");
        div.className =
            "p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mt-4";
        div.textContent = msg;
        container.appendChild(div);
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Search button
        $("searchBtn").addEventListener("click", () => {
            performSearch(searchInput.value);
            searchInput.blur();
        });

        // Enter key in search
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                performSearch(searchInput.value);
                searchInput.blur();
            }
        });

        // Input → show suggestions
        let debounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            const val = searchInput.value.trim();

            // Show/hide clear button
            $("searchClearBtn").classList.toggle("hidden", !val);

            if (val.length < 2) {
                hideSuggestions();
                return;
            }

            debounceTimer = setTimeout(() => showSuggestions(val), 150);
        });

        // Clear button
        $("searchClearBtn").addEventListener("click", () => {
            searchInput.value = "";
            $("searchClearBtn").classList.add("hidden");
            hideSuggestions();
            clearResults();
            searchInput.focus();
        });

        // Keyboard navigation for suggestions
        searchInput.addEventListener("keydown", (e) => {
            const items = suggestions.querySelectorAll(".suggestion-item");
            if (items.length === 0) return;

            const highlighted = suggestions.querySelector(".highlighted");
            let idx = Array.from(items).indexOf(highlighted);

            if (e.key === "ArrowDown") {
                e.preventDefault();
                idx = Math.min(idx + 1, items.length - 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                idx = Math.max(idx - 1, 0);
            } else {
                return;
            }

            items.forEach((el) => el.classList.remove("highlighted"));
            items[idx].classList.add("highlighted");
            items[idx].scrollIntoView({ block: "nearest" });
        });

        // Click outside suggestions → hide
        document.addEventListener("click", (e) => {
            if (!e.target.closest("#searchContainer")) {
                hideSuggestions();
            }
        });

        // Popular search buttons
        document.querySelectorAll(".popular-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const query = btn.getAttribute("data-search");
                searchInput.value = query;
                hideSuggestions();
                performSearch(query);
            });
        });

        // PDF download
        $("downloadPDFBtn").addEventListener("click", generatePDF);

        // Add / remove current medicine from the list
        $("addToListBtn").addEventListener("click", () => {
            if (!currentResult) return;
            const added = window.Basket.toggle(currentResult);
            refreshResultButtons();
            window.Basket.showToast(
                added
                    ? `${currentResult.brand} ${tSafe("toastAdded")}`
                    : `${currentResult.brand} ${tSafe("toastRemoved")}`
            );
        });

        // WhatsApp share for the single medicine
        $("shareWhatsAppBtn").addEventListener("click", () => {
            if (!currentResult) return;
            window.Basket.shareOnWhatsApp(
                window.Basket.singleWhatsappText(currentResult)
            );
        });

        // Regimen steppers (tablets/day)
        $("tabsMinus").addEventListener("click", () => {
            currentTabs = Math.max(0.5, +(currentTabs - 0.5).toFixed(1));
            updateSavingsMath();
        });
        $("tabsPlus").addEventListener("click", () => {
            currentTabs = Math.min(24, +(currentTabs + 0.5).toFixed(1));
            updateSavingsMath();
        });

        // Condition explorer back button
        $("conditionBack").addEventListener("click", exitConditionView);

        // Disclaimer banner dismiss
        const banner = $("disclaimerBanner");
        const dismissBtn = $("dismissDisclaimer");
        if (banner && dismissBtn) {
            // Check if previously dismissed
            try {
                const dismissed = localStorage.getItem("altmed_disclaimer_dismissed");
                if (dismissed === "true") {
                    banner.style.display = "none";
                }
            } catch (e) { /* ignore */ }

            dismissBtn.addEventListener("click", () => {
                banner.style.display = "none";
                try {
                    localStorage.setItem("altmed_disclaimer_dismissed", "true");
                } catch (e) { /* ignore */ }
            });
        }

        // Focus search on page load
        searchInput.focus();
    }

    // ===== I18N HOOK (called when language toggles) =====
    window.__i18nChanged = () => {
        if (window.Basket) window.Basket.render();
        renderConditionChips();
        if (currentCondition) {
            openConditionView(currentCondition);
        } else if (window.__currentResult) {
            refreshResultButtons();
            updateSavingsMath();
        }
    };

    // ===== BOOT =====
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();