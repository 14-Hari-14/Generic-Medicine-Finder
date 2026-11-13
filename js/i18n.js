/**
 * i18n — Translation system for Generic Medicine Finder
 * 
 * Supports English (en) and Hindi (hi).
 * Switching languages only changes UI labels — medicine/brand names stay in English
 * because that's how they appear on actual prescriptions and packaging.
 */

const TRANSLATIONS = {
    en: {
        heroTitle: "Find Generic Alternatives & Save",
        heroSubtitle: "Type a brand name — see the active salt, Janaushadhi price, and your savings",
        searchPlaceholder: "Search for a brand (e.g., Glycomet, Augmentin)",
        popularLabel: "Popular:",
        loading: "Searching medicines...",
        notFoundTitle: "Medicine not found",
        notFoundDesc: "We couldn't find this brand in our database. Try a different spelling or search by salt name.",
        didYouMean: "Did you mean:",
        activeSalt: "Active Salt / Composition",
        brandMRP: "Branded MRP",
        janaushadhiPrice: "Jan Aushadhi Price",
        packOf: "Pack of",
        sameSalt: "Same salt · Same quality",
        youSave: "💰 You Save",
        monthlySavings: "📅 Monthly Savings",
        yearlySavings: "📅 Yearly Savings",
        downloadPDF: "Download Comparison PDF",
        findKendra: "Nearest Janaushadhi Kendra",
        noGeneric: "No Janaushadhi generic available yet",
        noGenericDesc: "This brand's active salt doesn't have a matching generic in the PMBJP Janaushadhi product basket yet. Check back later or ask your doctor for an alternative with the same salt.",
        savingsPercent: "savings",
        // Condition explorer
        conditionsTitle: "🧭 Browse by Condition",
        conditionsSubtitle: "See what your condition's medicines cost — branded vs Janaushadhi — before your next doctor visit",
        condDiabetes: "Diabetes",
        condBPHeart: "Heart & Blood Pressure",
        condPainFever: "Pain & Fever",
        condInfection: "Infections",
        condAcidity: "Acidity & Digestion",
        condAsthma: "Asthma & Breathing",
        condAllergy: "Allergy",
        condThyroid: "Thyroid",
        condVitamins: "Vitamins & Supplements",
        condMental: "Mental Health",
        condUrology: "Urology",
        conditionBack: "Back to search",
        conditionDesc: "Commonly prescribed medicines with their affordable Janaushadhi generic equivalents. Tap any medicine to see the full comparison.",
        conditionEmpty: "No medicines found for this condition yet.",
        conditionExample: "e.g.",
        conditionBrandCount: "brands",
        conditionNote: "Tap a medicine to see the full price comparison · Same active salt, available at Jan Aushadhi Kendras",
        // Regimen calculator
        tabsPerDay: "How many tablets/day?",
        tabsPerDayShort: "tabs/day",
        // Basket
        addToList: "Add to List",
        removeFromList: "Remove from List",
        inList: "In List",
        toastAdded: "added to your list",
        toastRemoved: "removed from your list",
        whatsappShare: "Share on WhatsApp",
        basketTitle: "Your Medicines List",
        basketItemsLabel: "medicine(s)",
        basketEmpty: "No medicines added yet",
        basketEmptyHint: "Search a brand and tap “Add to List” to see your total monthly & yearly savings.",
        totalSavingsLabel: "💰 Total Savings",
        perMonthLabel: "/ month",
        shareBasket: "Share this list on WhatsApp",
        basketNote: "Estimates assume 30 days/month. Ask your doctor before switching any medicine.",
        basketSaveLabel: "You save",
        basketClearConfirm: "Clear all medicines from your list?",
        noGenericShort: "no generic",
        // Savings anchors (real-world comparisons)
        anchorGroceries: "≈ {n} months of family groceries",
        anchorSchool: "≈ a full school kit & uniform",
        anchorLPG: "≈ {n} LPG refill(s) a year",
        anchorMobile: "≈ {n} months of mobile recharge",
        // Disclaimer banner
        bannerTitle: "⚠️ NOT MEDICAL ADVICE",
        bannerText: "This website is a <strong>social initiative</strong> to raise awareness about affordable generic alternatives available through the Government of India's PMBJP (Janaushadhi) scheme. <strong>Always follow your doctor's prescription.</strong> Do not switch or stop any medicine without consulting your doctor. Prices shown are approximate and may vary.",
        // Footer
        footerTitle: "🩺 Social Initiative — Not Medical Advice",
        footerDisclaimer: "This website is a non-governmental social initiative to spread awareness about affordable generic medicine alternatives under the PMBJP (Janaushadhi) scheme. We do not provide medical advice, diagnosis, or treatment recommendations. Always consult a registered medical practitioner before making any changes to your medication. Prices shown are approximate and may vary.",
        footerData: "Data sourced from PMBJP (Janaushadhi) official price list.",
    },

    hi: {
        heroTitle: "जेनेरिक विकल्प खोजें और बचत करें",
        heroSubtitle: "ब्रांड का नाम टाइप करें — सक्रिय साल्ट, जन औषधि मूल्य और आपकी बचत देखें",
        searchPlaceholder: "ब्रांड का नाम खोजें (जैसे, Glycomet, Augmentin)",
        popularLabel: "लोकप्रिय:",
        loading: "दवाओं की खोज जारी है...",
        notFoundTitle: "दवा नहीं मिली",
        notFoundDesc: "हमारे डेटाबेस में यह ब्रांड नहीं मिला। कोई अन्य स्पेलिंग आज़माएँ या साल्ट के नाम से खोजें।",
        didYouMean: "क्या आपका मतलब है:",
        activeSalt: "सक्रिय साल्ट / संघटन",
        brandMRP: "ब्रांडेड एमआरपी",
        janaushadhiPrice: "जन औषधि मूल्य",
        packOf: "पैक",
        sameSalt: "समान साल्ट · समान गुणवत्ता",
        youSave: "💰 आप बचाते हैं",
        monthlySavings: "📅 मासिक बचत",
        yearlySavings: "📅 वार्षिक बचत",
        downloadPDF: "तुलना PDF डाउनलोड करें",
        findKendra: "निकटतम जन औषधि केंद्र",
        noGeneric: "अभी तक कोई जन औषधि जेनेरिक उपलब्ध नहीं",
        noGenericDesc: "इस ब्रांड के सक्रिय साल्ट का PMBJP जन औषधि उत्पाद बास्केट में अभी तक कोई मेल खाने वाला जेनेरिक नहीं है। बाद में पुनः जाँच करें या समान साल्ट वाले विकल्प के लिए अपने डॉक्टर से पूछें।",
        savingsPercent: "बचत",
        // Condition explorer
        conditionsTitle: "🧭 स्थिति के अनुसार देखें",
        conditionsSubtitle: "अपने रोग की दवाओं की कीमत पहले ही जानें — ब्रांडेड बनाम जन औषधि — डॉक्टर के पास जाने से पहले",
        condDiabetes: "मधुमेह",
        condBPHeart: "हृदय और रक्तचाप",
        condPainFever: "दर्द और बुखार",
        condInfection: "संक्रमण",
        condAcidity: "एसिडिटी और पाचन",
        condAsthma: "अस्थमा और साँस",
        condAllergy: "एलर्जी",
        condThyroid: "थायराइड",
        condVitamins: "विटामिन और सप्लीमेंट",
        condMental: "मानसिक स्वास्थ्य",
        condUrology: "यूरोलॉजी",
        conditionBack: "खोज पर वापस जाएँ",
        conditionDesc: "आम तौर पर लिखी जाने वाली दवाओं और उनके सस्ते जन औषधि जेनेरिक विकल्प। पूरी तुलना देखने के लिए कोई भी दवा दबाएँ।",
        conditionEmpty: "इस स्थिति के लिए अभी कोई दवा नहीं मिली।",
        conditionExample: "जैसे",
        conditionBrandCount: "ब्रांड",
        conditionNote: "पूरी तुलना देखने के लिए कोई भी दवा दबाएँ · समान साल्ट, जन औषधि केंद्रों पर उपलब्ध",
        // Regimen calculator
        tabsPerDay: "रोज़ कितनी गोलियाँ लेते हैं?",
        tabsPerDayShort: "गोली/दिन",
        // Basket
        addToList: "सूची में जोड़ें",
        removeFromList: "सूची से हटाएँ",
        inList: "सूची में",
        toastAdded: "आपकी सूची में जोड़ दी गई",
        toastRemoved: "आपकी सूची से हटा दी गई",
        whatsappShare: "व्हाट्सऐप पर साझा करें",
        basketTitle: "आपकी दवाओं की सूची",
        basketItemsLabel: "दवा(एँ)",
        basketEmpty: "अभी तक कोई दवा नहीं जोड़ी गई",
        basketEmptyHint: "कोई ब्रांड खोजें और 'सूची में जोड़ें' दबाएँ — कुल मासिक और वार्षिक बचत देखें।",
        totalSavingsLabel: "💰 कुल बचत",
        perMonthLabel: "/ माह",
        shareBasket: "यह सूची व्हाट्सऐप पर साझा करें",
        basketNote: "अनुमान 30 दिन/माह पर आधारित हैं। कोई भी दवा बदलने से पहले अपने डॉक्टर से पूछें।",
        basketSaveLabel: "बचत",
        basketClearConfirm: "सूची से सभी दवाएँ हटाएँ?",
        noGenericShort: "जेनेरिक नहीं",
        // Savings anchors (real-world comparisons)
        anchorGroceries: "≈ {n} महीने की पारिवारिक किराना खरीद",
        anchorSchool: "≈ पूरा स्कूल किट और यूनिफ़ॉर्म",
        anchorLPG: "≈ साल में {n} गैस सिलेंडर",
        anchorMobile: "≈ {n} महीने का मोबाइल रिचार्ज",
        // Disclaimer banner
        bannerTitle: "⚠️ चिकित्सीय सलाह नहीं",
        bannerText: "यह वेबसाइट एक <strong>सामाजिक पहल</strong> है जो भारत सरकार की PMBJP (जन औषधि) योजना के तहत सस्ती जेनेरिक दवाओं के बारे में जागरूकता फैलाने के लिए है। <strong>हमेशा अपने डॉक्टर के नुस्खे का पालन करें।</strong> बिना डॉक्टर की सलाह के कोई भी दवा बदलना या बंद करना खतरनाक हो सकता है। दिखाए गए मूल्य अनुमानित हैं।",
        // Footer
        footerTitle: "🩺 सामाजिक पहल — चिकित्सीय सलाह नहीं",
        footerDisclaimer: "यह वेबसाइट एक गैर-सरकारी सामाजिक पहल है जो PMBJP (जन औषधि) योजना के तहत सस्ती जेनेरिक दवाओं के विकल्पों के बारे में जागरूकता फैलाने के लिए है। हम चिकित्सीय सलाह, निदान या उपचार संबंधी सिफारिशें प्रदान नहीं करते हैं। अपनी दवा में कोई भी बदलाव करने से पहले हमेशा एक पंजीकृत चिकित्सक से सलाह लें। दिखाए गए मूल्य अनुमानित हैं।",
        footerData: "डेटा PMBJP (जन औषधि) आधिकारिक मूल्य सूची से लिया गया है।",
    },
};

/**
 * Current active language
 */
let currentLang = "en";

/**
 * Get a translated string by key
 */
function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
}

/**
 * Get a translated string with fallback to English
 */
function tSafe(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
}

/**
 * Apply translations to all elements with data-i18n attributes
 */
function applyTranslations() {
    // Text content (plain text)
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        const text = tSafe(key);
        // Never write a raw key to the page: if the translation is missing,
        // leave the pretty English fallback already present in the HTML.
        if (text !== key) el.textContent = text;
    });

    // HTML content (supports <strong>, <em>, etc.)
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        if (!key) return;
        const text = tSafe(key);
        if (text !== key) el.innerHTML = text;
    });

    // Placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        const text = tSafe(key);
        if (text !== key) el.placeholder = text;
    });

    // Update HTML lang attribute
    document.documentElement.setAttribute("lang", currentLang);
}

/**
 * Toggle between English and Hindi
 */
function toggleLanguage() {
    currentLang = (currentLang === "en") ? "hi" : "en";

    const toggleBtn = document.getElementById("langToggle");
    toggleBtn.textContent = (currentLang === "en") ? "🇮🇳 हिंदी" : "🇬🇧 English";

    applyTranslations();

    // Re-render any current result to update dynamic content
    if (window.__currentResult) {
        renderResult(window.__currentResult);
    }

    // Re-render basket, condition view, and dynamic labels
    if (window.__i18nChanged) {
        window.__i18nChanged();
    }

    // Store preference
    try {
        localStorage.setItem("altmed_lang", currentLang);
    } catch (e) { /* ignore */ }
}

/**
 * Initialize i18n
 */
function initI18n() {
    // Restore saved language preference
    try {
        const saved = localStorage.getItem("altmed_lang");
        if (saved && TRANSLATIONS[saved]) {
            currentLang = saved;
        }
    } catch (e) { /* ignore */ }

    // Set initial toggle button text
    const toggleBtn = document.getElementById("langToggle");
    if (toggleBtn) {
        toggleBtn.textContent = (currentLang === "en") ? "🇮🇳 हिंदी" : "🇬🇧 English";
        toggleBtn.addEventListener("click", toggleLanguage);
    }

    applyTranslations();
}

// Auto-init on DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initI18n);
} else {
    initI18n();
}