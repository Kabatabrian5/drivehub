/* =========================================================
   DRIVE HUB — MARKETPLACE JAVASCRIPT
   Buyer and Dealer Profiles
   OTP Authentication
   Subscriptions and Payment Integration
   Live Subscription Countdown
   Built-in Buyer and Dealer Assistants
   Existing storage keys preserved
========================================================= */

"use strict";

/* =========================================================
   1. STORAGE AND CONFIGURATION
========================================================= */

const KEYS = {
    cars: "drivehub_cars_v2",
    buyers: "drivehub_buyers_v2",
    dealers: "drivehub_dealers_v2",
    buyer: "drivehub_current_buyer_v2",
    dealer: "drivehub_current_dealer_v2",
    favourites: "drivehub_favourites_v2",
    cart: "drivehub_cart_v2",
    bookings: "drivehub_bookings_v2",
    settings: "dh_settings",
    payments: "dh_payments",
    theme: "drivehub_theme"
};

const API = {
    vehicles: "/api/vehicles",
    requestOTP: "/api/auth/request-otp",
    verifyOTP: "/api/auth/verify-otp",
    initializePayment: "/api/payments/initialize",
    paymentStatus: "/api/payments/status"
};

let databaseCars = null;

const DEFAULT_SETTINGS = {
    subscriptionPrices: {
        weekly: 100,
        monthly: 1000,
        perCar: 30
    },
    paymentMethods: [
        { id: "mpesa", name: "M-Pesa", icon: "📱", enabled: true },
        { id: "airtel", name: "Airtel Money", icon: "📲", enabled: true },
        { id: "visa", name: "Visa / Card", icon: "💳", enabled: true }
    ]
};

function getData(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error("Storage read error:", key, error);
        return fallback;
    }
}

function setData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Storage write error:", key, error);
        showToast("Could not save. Browser storage may be full.");
        return false;
    }
}

function money(amount) {
    return "KSh " + Number(amount || 0).toLocaleString("en-KE");
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function element(id) {
    return document.getElementById(id);
}

function applyTheme(theme, persist = true) {
    const activeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = activeTheme;

    const toggle = element("themeToggle");
    const icon = toggle?.querySelector("span");
    if (toggle && icon) {
        const nextTheme = activeTheme === "dark" ? "light" : "dark";
        icon.textContent = activeTheme === "dark" ? "☀" : "☾";
        toggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
        toggle.setAttribute("title", `Switch to ${nextTheme} theme`);
        toggle.setAttribute("aria-pressed", String(activeTheme === "dark"));
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
        themeColor.content = activeTheme === "dark" ? "#111315" : "#1b1d1f";
    }

    if (persist) setData(KEYS.theme, activeTheme);
}

function initializeTheme() {
    const savedTheme = getData(KEYS.theme, "light");
    applyTheme(savedTheme === "dark" ? "dark" : "light", false);

    element("themeToggle")?.addEventListener("click", () => {
        const nextTheme =
            document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
    });
}

function showToast(message) {
    const toast = element("toast");
    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showModal(id) {
    element(id)?.classList.add("active");
}

function closeModal(id) {
    element(id)?.classList.remove("active");
}

function makeId(prefix) {
    return prefix + "-" + Date.now() + "-" +
        Math.random().toString(36).slice(2, 8);
}

function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "");
}

function getCurrentBuyer() {
    return getData(KEYS.buyer, null);
}

function getCurrentDealer() {
    return getData(KEYS.dealer, null);
}

function getSettings() {
    const saved = getData(KEYS.settings, {});

    return {
        ...DEFAULT_SETTINGS,
        ...saved,
        subscriptionPrices: {
            ...DEFAULT_SETTINGS.subscriptionPrices,
            ...(saved.subscriptionPrices || {})
        },
        paymentMethods: Array.isArray(saved.paymentMethods)
            ? saved.paymentMethods
            : DEFAULT_SETTINGS.paymentMethods
    };
}

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function isDealerApproved(dealer) {
    return normalizeStatus(dealer?.status) === "approved";
}

function updateAccountRecord(type, updated) {
    const key = type === "buyer" ? KEYS.buyers : KEYS.dealers;
    const currentKey = type === "buyer" ? KEYS.buyer : KEYS.dealer;
    const records = getData(key, []);

    const index = records.findIndex(item =>
        String(item.id) === String(updated.id)
    );

    if (index >= 0) {
        records[index] = { ...records[index], ...updated };
    } else {
        records.push(updated);
    }

    if (!setData(key, records)) return false;
    if (!setData(currentKey, updated)) return false;

    return true;
}

/* =========================================================
   2. SAMPLE VEHICLES
========================================================= */

const sampleCars = [
    {
        id: "sample-1",
        make: "Toyota",
        model: "Land Cruiser Prado TX",
        year: 2021,
        price: 8500000,
        mileage: 42000,
        engine: "2.8L",
        fuel: "Diesel",
        transmission: "Automatic",
        condition: "Foreign Used",
        location: "Nairobi",
        description: "A spacious and comfortable SUV suitable for family and travel.",
        images: [
            "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=85"
        ],
        status: "approved",
        featured: true,
        dealerId: "sample-dealer",
        phone: ""
    },
    {
        id: "sample-2",
        make: "Mercedes-Benz",
        model: "E-Class E200",
        year: 2020,
        price: 6200000,
        mileage: 38000,
        engine: "2.0L",
        fuel: "Petrol",
        transmission: "Automatic",
        condition: "Foreign Used",
        location: "Nairobi",
        description: "Premium executive sedan with a comfortable interior.",
        images: [
            "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=85"
        ],
        status: "approved",
        featured: false,
        dealerId: "sample-dealer",
        phone: ""
    },
    {
        id: "sample-3",
        make: "BMW",
        model: "X5",
        year: 2019,
        price: 7200000,
        mileage: 51000,
        engine: "3.0L",
        fuel: "Petrol",
        transmission: "Automatic",
        condition: "Foreign Used",
        location: "Mombasa",
        description: "Luxury SUV with excellent comfort and performance.",
        images: [
            "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=85"
        ],
        status: "approved",
        featured: false,
        dealerId: "sample-dealer",
        phone: ""
    },
    {
        id: "sample-4",
        make: "Subaru",
        model: "Forester",
        year: 2018,
        price: 2850000,
        mileage: 67000,
        engine: "2.0L",
        fuel: "Petrol",
        transmission: "Automatic",
        condition: "Locally Used",
        location: "Kiambu",
        description: "Practical SUV with a comfortable cabin and good versatility.",
        images: [
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85"
        ],
        status: "approved",
        featured: false,
        dealerId: "sample-dealer",
        phone: ""
    },
    {
        id: "sample-5",
        make: "Toyota",
        model: "Harrier Premium",
        year: 2020,
        price: 3950000,
        mileage: 46000,
        engine: "2.0L",
        fuel: "Petrol",
        transmission: "Automatic",
        condition: "Foreign Used",
        location: "Nakuru",
        description: "Stylish crossover offering a refined driving experience.",
        images: [
            "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=85"
        ],
        status: "approved",
        featured: false,
        dealerId: "sample-dealer",
        phone: ""
    },
    {
        id: "sample-6",
        make: "Audi",
        model: "Q5",
        year: 2019,
        price: 4600000,
        mileage: 55000,
        engine: "2.0L",
        fuel: "Petrol",
        transmission: "Automatic",
        condition: "Foreign Used",
        location: "Nairobi",
        description: "Premium SUV with modern styling and comfortable seating.",
        images: [
            "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=85"
        ],
        status: "approved",
        featured: false,
        dealerId: "sample-dealer",
        phone: ""
    }
];

function initializeCars() {
    if (localStorage.getItem(KEYS.cars) === null) {
        setData(KEYS.cars, sampleCars);
    }
}

function getCars() {
    const cars = getData(KEYS.cars, []);
    return Array.isArray(cars) ? cars : [];
}

function getPublicCars() {
    return databaseCars === null ? getCars() : databaseCars;
}

function carImages(car) {
    if (Array.isArray(car.images) && car.images.length) return car.images;
    if (car.image) return [car.image];

    return [
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80"
    ];
}

/* =========================================================
   3. ACCOUNT-SPECIFIC SAVED DATA
========================================================= */

function accountStorageKey(type, account) {
    return `drivehub_${type}_${account?.id || "guest"}_v2`;
}

function getBuyerList(type) {
    const buyer = getCurrentBuyer();
    if (!buyer) return [];

    const key = accountStorageKey(type, buyer);
    let saved = getData(key, null);

    if (saved === null) {
        const oldKey = type === "favourites" ? KEYS.favourites : KEYS.cart;
        saved = getData(oldKey, []);
        setData(key, saved);
    }

    return Array.isArray(saved) ? saved : [];
}

function saveBuyerList(type, values) {
    const buyer = getCurrentBuyer();
    if (!buyer) return false;

    return setData(accountStorageKey(type, buyer), values);
}

/* =========================================================
   4. HEADER PROFILE AND NAVIGATION
========================================================= */

function updateHeaderProfile() {
    const buyer = getCurrentBuyer();
    const dealer = getCurrentDealer();

    const name = element("headerProfileName");
    const status = element("headerProfileStatus");
    const avatar = element("headerProfileAvatar");

    if (dealer) {
        if (name) name.textContent =
            dealer.username || dealer.business || dealer.owner || "Dealer";
        if (status) status.textContent = "Dealer account";
        if (avatar) {
            avatar.innerHTML = dealer.profilePicture
                ? `<img src="${escapeHTML(dealer.profilePicture)}" alt="Dealer profile">`
                : "🏢";
        }
    } else if (buyer) {
        if (name) name.textContent =
            buyer.username || buyer.name || buyer.email || "Buyer";
        if (status) status.textContent = "Buyer account";
        if (avatar) {
            avatar.innerHTML = buyer.profilePicture
                ? `<img src="${escapeHTML(buyer.profilePicture)}" alt="Buyer profile">`
                : "👤";
        }
    } else {
        if (name) name.textContent = "My Profile";
        if (status) status.textContent = "Sign in";
        if (avatar) avatar.innerHTML = "👤";
    }
}

function openMenu() {
    element("sideMenu")?.classList.add("open");
    element("drawerBackdrop")?.classList.add("active");
}

function closeMenu() {
    element("sideMenu")?.classList.remove("open", "active");
    element("drawerBackdrop")?.classList.remove("active");
}

function updateDrawer() {
    const buyer = getCurrentBuyer();
    const dealer = getCurrentDealer();
    const drawer = element("drawerUser");

    if (drawer) {
        if (dealer) {
            drawer.innerHTML =
                `Dealer account: <strong>${escapeHTML(dealer.business || dealer.owner || dealer.email)}</strong>`;
        } else if (buyer) {
            drawer.innerHTML =
                `Welcome, <strong>${escapeHTML(buyer.username || buyer.name || buyer.email)}</strong>`;
        } else {
            drawer.textContent = "Welcome to DRIVE HUB";
        }
    }

    updateHeaderProfile();
}

function openAccount() {
    if (getCurrentDealer()) {
        openDealerDashboard("profile");
    } else if (getCurrentBuyer()) {
        openBuyerArea("profile");
    } else {
        setAccountMode("login");
        showModal("accountModal");
    }
}

/* =========================================================
   5. VEHICLE SEARCH AND DISPLAY
========================================================= */

function renderCars() {
    const grid = element("carGrid");
    if (!grid) return;

    const search = (element("searchInput")?.value || "").toLowerCase().trim();
    const make = element("makeFilter")?.value || "";
    const maxPrice = Number(element("priceFilter")?.value || 0);
    const minYear = Number(element("yearFilter")?.value || 0);

    let cars = getPublicCars().filter(car => {
        const status = normalizeStatus(car.status || "approved");

        if (!["approved", "available"].includes(status)) return false;

        const searchable = [
            car.make, car.model, car.location, car.year, car.transmission
        ].join(" ").toLowerCase();

        if (search && !searchable.includes(search)) return false;
        if (make && car.make !== make) return false;
        if (maxPrice && Number(car.price) > maxPrice) return false;
        if (minYear && Number(car.year) < minYear) return false;

        return true;
    });

    cars.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return String(b.id).localeCompare(String(a.id));
    });

    grid.innerHTML = cars.map(car => {
        return `
            <article class="car-card">
                <div class="car-image">
                    <img src="${escapeHTML(carImages(car)[0])}"
                         alt="${escapeHTML(car.make)} ${escapeHTML(car.model)}"
                         loading="lazy">
                    ${car.featured ? '<span class="car-badge">FEATURED</span>' : ""}
                </div>
                <div class="car-card-content">
                    <h3>${escapeHTML(car.make)} ${escapeHTML(car.model)}</h3>
                    <div class="car-price">${money(car.price)}</div>
                    <div class="car-meta">
                        <span>${escapeHTML(car.year)}</span>
                        <span>${escapeHTML(car.transmission || "Not specified")}</span>
                        <span>${Number(car.mileage || 0).toLocaleString()} km</span>
                        <span>${escapeHTML(car.location || "Kenya")}</span>
                    </div>
                    <div class="car-actions">
                        <button type="button" onclick="openDetails('${escapeHTML(car.id)}')">Details</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    if (element("inventoryCount")) {
        element("inventoryCount").textContent = `${cars.length} vehicles found`;
    }

    if (element("emptyState")) {
        element("emptyState").style.display = cars.length ? "none" : "block";
    }
}

async function loadPublicCars() {
    const notice = element("listingSourceNotice");

    try {
        const response = await fetch(API.vehicles, {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Vehicle API returned HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload.cars)) {
            throw new TypeError("Vehicle API response did not contain a cars array.");
        }

        databaseCars = payload.cars;
        if (notice) notice.hidden = true;
        renderCars();
    } catch (error) {
        console.error("Could not load vehicle listings from the database:", error);
        if (notice) {
            notice.textContent =
                "Live listings are unavailable. Showing listings saved in this browser.";
            notice.hidden = false;
        }
    }
}

/* =========================================================
   6. VEHICLE DETAILS
========================================================= */

let currentGalleryCar = null;
let currentGalleryIndex = 0;

function openDetails(id) {
    const car = getPublicCars().find(item => String(item.id) === String(id));

    if (!car) {
        showToast("Vehicle not found.");
        return;
    }

    currentGalleryCar = car;
    currentGalleryIndex = 0;
    renderDetails();
    showModal("detailsModal");
}

function renderDetails() {
    const car = currentGalleryCar;
    const content = element("detailsContent");
    if (!car || !content) return;

    const images = carImages(car);
    const tiktokVideoUrl = getTikTokVideoUrl(car.tiktokUrl);

    content.innerHTML = `
        <h2>${escapeHTML(car.make)} ${escapeHTML(car.model)}</h2>
        <div class="details-gallery">
            <img class="details-main-image"
                 src="${escapeHTML(images[currentGalleryIndex])}"
                 alt="${escapeHTML(car.model)}">
            <div class="gallery-thumbnails">
                ${images.map((image, index) => `
                    <img src="${escapeHTML(image)}"
                         class="${index === currentGalleryIndex ? "active" : ""}"
                         alt="Vehicle image ${index + 1}"
                         onclick="selectGallery(${index})">
                `).join("")}
            </div>
        </div>
        <h2 class="car-price">${money(car.price)}</h2>
        <div class="details-specs">
            ${[
                ["Year", car.year],
                ["Mileage", `${Number(car.mileage || 0).toLocaleString()} km`],
                ["Engine", car.engine || "N/A"],
                ["Fuel", car.fuel || "N/A"],
                ["Transmission", car.transmission || "N/A"],
                ["Condition", car.condition || "N/A"],
                ["Location", car.location || "Kenya"]
            ].map(([label, value]) => `
                <div class="spec-item">
                    <small>${label}</small>
                    <strong>${escapeHTML(value)}</strong>
                </div>
            `).join("")}
        </div>
        <h3>Vehicle Description</h3>
        <p class="muted">${escapeHTML(car.description || "Contact the dealer for more information.")}</p>
        ${tiktokVideoUrl ? `
            <section class="vehicle-video-review">
                <span class="market-snapshot-label">VIDEO REVIEW</span>
                <h3>${escapeHTML(car.make)} ${escapeHTML(car.model)} on TikTok</h3>
                <a href="${escapeHTML(tiktokVideoUrl)}"
                   target="_blank" rel="noopener noreferrer">
                    Watch the vehicle review on TikTok ↗
                </a>
            </section>
        ` : ""}
        ${renderMarketSnapshot(car)}
        <div class="details-actions">
            <button type="button" class="btn btn-primary"
                onclick="bookViewing('${escapeHTML(car.id)}')">
                Book a Viewing on WhatsApp
            </button>
        </div>
    `;
}

function getTikTokVideoUrl(value) {
    const input = String(value || "").trim();
    if (!input) return "";

    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase();
        const isTikTokHost = host === "tiktok.com" || host.endsWith(".tiktok.com");

        return url.protocol === "https:" && isTikTokHost ? url.href : "";
    } catch {
        return "";
    }
}

function renderMarketSnapshot(car) {
    const normalize = value =>
        String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    const listings = getPublicCars().filter(item =>
        ["approved", "available"].includes(
            normalizeStatus(item.status || "approved")
        ) &&
        normalize(item.make) === normalize(car.make) &&
        normalize(item.model) === normalize(car.model) &&
        Number.isFinite(Number(item.price)) &&
        Number(item.price) > 0
    );
    const prices = listings
        .map(item => Number(item.price))
        .sort((a, b) => a - b);
    const disclosure =
        "Based only on published DRIVE HUB asking prices, not completed sales " +
        "or a nationwide valuation.";

    if (prices.length < 2) {
        return `
            <section class="market-snapshot">
                <span class="market-snapshot-label">DRIVE HUB MARKET SNAPSHOT</span>
                <h3>Kenyan market context</h3>
                <p>
                    There are not yet enough active ${escapeHTML(car.make)}
                    ${escapeHTML(car.model)} listings on DRIVE HUB to show a
                    reliable price comparison.
                </p>
                <small>${disclosure}</small>
            </section>
        `;
    }

    const middle = Math.floor(prices.length / 2);
    const median = prices.length % 2
        ? prices[middle]
        : Math.round((prices[middle - 1] + prices[middle]) / 2);

    return `
        <section class="market-snapshot">
            <span class="market-snapshot-label">DRIVE HUB MARKET SNAPSHOT</span>
            <h3>Kenyan market context</h3>
            <p>
                ${prices.length} active ${escapeHTML(car.make)}
                ${escapeHTML(car.model)} listings on DRIVE HUB.
            </p>
            <div class="market-snapshot-metrics">
                <div>
                    <small>Current asking-price range</small>
                    <strong>${money(prices[0])} – ${money(prices[prices.length - 1])}</strong>
                </div>
                <div>
                    <small>Median asking price</small>
                    <strong>${money(median)}</strong>
                </div>
            </div>
            <small>${disclosure}</small>
        </section>
    `;
}

function selectGallery(index) {
    if (!currentGalleryCar) return;
    const images = carImages(currentGalleryCar);
    if (index < 0 || index >= images.length) return;
    currentGalleryIndex = index;
    renderDetails();
}

/* =========================================================
   7. OTP AUTHENTICATION
========================================================= */

let accountMode = "login";
let dealerMode = "register";
let pendingAuth = null;

async function requestVerificationCode(payload) {
    let response;

    try {
        response = await fetch(API.requestOTP, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("OTP request connection error:", error);
        throw new Error("Cannot connect to the verification service. The secure OTP backend must be configured.");
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.message || "Could not send verification code.");
    }

    return result;
}

async function verifyCode(payload) {
    let response;

    try {
        response = await fetch(API.verifyOTP, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("OTP verification connection error:", error);
        throw new Error("Cannot connect to the verification service.");
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.verified !== true) {
        throw new Error(result.message || "The verification code is incorrect or expired.");
    }

    return result;
}

function showOTPPanel(type, contact, payload) {
    pendingAuth = { type, contact, payload };

    const modal = type === "buyer" ? element("accountModal") : element("dealerAuthModal");
    const content = modal?.querySelector(".modal-content");
    if (!content) return;

    let panel = element("otpVerificationPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "otpVerificationPanel";
        panel.className = "account-panel";
        content.appendChild(panel);
    }

    panel.innerHTML = `
        <div class="account-heading">
            <span class="section-eyebrow">SECURITY VERIFICATION</span>
            <h2>Verify your account</h2>
            <p>Enter the verification code sent to <strong>${escapeHTML(contact)}</strong>.</p>
        </div>
        <form id="otpForm">
            <div class="form-group">
                <label for="otpCode">Verification code</label>
                <input id="otpCode" type="text" inputmode="numeric"
                    autocomplete="one-time-code" maxlength="8"
                    placeholder="Enter your code" required>
            </div>
            <button class="btn btn-primary" type="submit" style="width:100%">Verify and Continue</button>
            <button class="btn btn-secondary" type="button" onclick="resendOTP()" style="width:100%;margin-top:10px">Resend Code</button>
            <button class="btn btn-secondary" type="button" onclick="cancelOTP()" style="width:100%;margin-top:10px">Cancel</button>
        </form>
    `;

    panel.style.display = "block";
    element("otpForm")?.addEventListener("submit", handleOTPVerification);
}

function cancelOTP() {
    pendingAuth = null;
    element("otpVerificationPanel")?.remove();
}

async function resendOTP() {
    if (!pendingAuth) return;

    try {
        const payload = pendingAuth.payload;

        await requestVerificationCode({
            accountType: pendingAuth.type,
            contact: pendingAuth.contact,
            purpose: payload.purpose,
            password: payload.password,
            account: payload.account || null
        });

        showToast("A new verification code has been requested.");
    } catch (error) {
        showToast(error.message);
    }
}

async function handleOTPVerification(event) {
    event.preventDefault();
    if (!pendingAuth) return;

    const code = element("otpCode")?.value.trim();
    if (!code) {
        showToast("Enter your verification code.");
        return;
    }

    const auth = pendingAuth;

    try {
        const result = await verifyCode({
            accountType: auth.type,
            contact: auth.contact,
            purpose: auth.payload.purpose,
            code,
            accountId: auth.payload.account?.id || null
        });

        const account = result.user || result.account;

        if (!account?.id) {
            showToast("The verification service did not return a valid account.");
            return;
        }

        if (auth.type === "buyer") {
            finishBuyerAuthentication(account, auth.payload.mode);
        } else {
            finishDealerAuthentication(account, auth.payload.mode);
        }

        cancelOTP();
    } catch (error) {
        showToast(error.message || "Verification failed.");
    }
}

/* =========================================================
   8. BUYER ACCOUNT
========================================================= */

function openAccountLogin() {
    setAccountMode("login");
    showModal("accountModal");
}

function setAccountMode(mode) {
    accountMode = mode;

    const title = element("accountTitle");
    const nameField = element("buyerNameField");
    const nameInput = element("buyerName");
    const emailInput = element("buyerEmail");

    if (title) title.textContent =
        mode === "login" ? "Buyer Login" : "Create Buyer Account";

    if (nameField) nameField.style.display =
        mode === "register" ? "block" : "none";

    if (nameInput) nameInput.required = mode === "register";

    if (emailInput) {
        emailInput.type = "text";
        emailInput.placeholder = "Email address or phone number";
        emailInput.autocomplete = "username";
    }

    element("loginTab")?.classList.toggle("active", mode === "login");
    element("registerTab")?.classList.toggle("active", mode === "register");

    const submit = element("buyerSubmit");
    if (submit) submit.textContent = mode === "login" ? "Continue to Login" : "Register";
}

function finishBuyerAuthentication(account, mode) {
    const safeAccount = { ...account };
    delete safeAccount.password;

    if (!safeAccount.id) {
        showToast("Invalid buyer account returned by the server.");
        return;
    }

    if (!updateAccountRecord("buyer", safeAccount)) return;

    ensureAssistantIdentity("buyer", getCurrentBuyer());
    closeModal("accountModal");
    updateDrawer();
    renderCars();

    showToast(mode === "register" ? "Your buyer account has been verified." : "Welcome back.");
    openBuyerArea("profile");
}

async function handleBuyerForm(event) {
    event.preventDefault();

    const contact = element("buyerEmail")?.value.trim();
    const password = element("buyerPassword")?.value;
    const name = element("buyerName")?.value.trim();

    if (!contact || !password) {
        showToast("Enter your email/phone and password.");
        return;
    }

    if (accountMode === "register" && !name) {
        showToast("Enter your full name.");
        return;
    }

    if (accountMode === "register" && password.length < 8) {
        showToast("Use a password with at least 8 characters.");
        return;
    }

    const buyers = getData(KEYS.buyers, []);
    const normalized = contact.toLowerCase();
    const normalizedPhone = normalizePhone(contact);

    const existing = buyers.find(user =>
        (user.email && String(user.email).toLowerCase() === normalized) ||
        (normalizedPhone && normalizePhone(user.phone) === normalizedPhone)
    );

    if (accountMode === "register" && existing) {
        showToast("An account with these details already exists.");
        return;
    }

    const payload = {
        accountType: "buyer",
        mode: accountMode,
        purpose: accountMode === "register" ? "registration" : "login",
        contact,
        password,
        name: name || "",
        account: existing || null
    };

    try {
        await requestVerificationCode(payload);
        showOTPPanel("buyer", contact, payload);
    } catch (error) {
        showToast(error.message);
    }
}

function requireBuyer() {
    const buyer = getCurrentBuyer();
    if (buyer) return buyer;

    openAccountLogin();
    showToast("Please login to your buyer account first.");
    return null;
}

function openBuyerArea(section = "profile") {
    if (!requireBuyer()) return;
    ensureLoggedInAssistant();
    showBuyerSection(section);
    showModal("buyerAreaModal");
}

function updateBuyerAvatar() {
    const buyer = getCurrentBuyer();
    const avatar = element("buyerDashboardAvatar");
    if (!avatar || !buyer) return;

    avatar.innerHTML = buyer.profilePicture
        ? `<img src="${escapeHTML(buyer.profilePicture)}" alt="Your profile picture">`
        : "👤";
}

function showBuyerSection(section) {
    const buyer = getCurrentBuyer();
    const content = element("buyerAreaContent");
    if (!buyer || !content) return;

    ensureAssistantIdentity("buyer", buyer);

    const currentBuyer = getCurrentBuyer();
    const favourites = getBuyerList("favourites");
    const cart = getBuyerList("cart");
    const bookings = getData(KEYS.bookings, []);

    if (element("buyerWelcome")) {
        element("buyerWelcome").textContent =
            `Welcome, ${currentBuyer.username || currentBuyer.name || currentBuyer.email}`;
    }

    updateBuyerAvatar();

    if (section === "profile") {
        content.innerHTML = `
            <div class="account-panel">
                <h3>My Buyer Profile</h3>
                <p><strong>Name:</strong> ${escapeHTML(currentBuyer.name || "")}</p>
                <p><strong>Username:</strong> ${escapeHTML(currentBuyer.username || currentBuyer.name || "")}</p>
                <p><strong>Email:</strong> ${escapeHTML(currentBuyer.email || "")}</p>
                <p><strong>Phone:</strong> ${escapeHTML(currentBuyer.phone || "Not added")}</p>
                <p><strong>Bio:</strong> ${escapeHTML(currentBuyer.bio || "No bio added yet.")}</p>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="editBuyerProfile()">Edit Profile</button>
                    <button class="btn btn-secondary" onclick="showBuyerSection('favourites')">My Favourites (${favourites.length})</button>
                    <button class="btn btn-secondary" onclick="showBuyerSection('cart')">My Cart (${cart.length})</button>
                    <button class="btn btn-secondary" onclick="showBuyerSection('bookings')">My Bookings</button>
                    <button class="btn btn-secondary" onclick="showBuyerSection('assistant')">My Assistant</button>
                    <button class="btn btn-secondary" onclick="logoutBuyer()">Logout</button>
                </div>
            </div>
        `;
        return;
    }

    if (section === "favourites") {
        const cars = getCars().filter(car =>
            favourites.some(id => String(id) === String(car.id))
        );

        content.innerHTML = `
            <h3>My Favourite Vehicles</h3>
            ${cars.length ? cars.map(car => `
                <div class="dashboard-item">
                    <div><strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong><p>${money(car.price)}</p></div>
                    <button class="btn btn-secondary" onclick="openDetails('${escapeHTML(car.id)}')">View</button>
                </div>
            `).join("") : "<p>No favourites saved yet.</p>"}
            <button class="btn btn-secondary" onclick="showBuyerSection('profile')">Back to Profile</button>
        `;
        return;
    }

    if (section === "cart") {
        const cars = cart.map(id =>
            getCars().find(car => String(car.id) === String(id))
        ).filter(Boolean);

        content.innerHTML = `
            <h3>My Cart</h3>
            ${cars.length ? cars.map(car => `
                <div class="dashboard-item">
                    <div><strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong><p>${money(car.price)}</p></div>
                    <button class="btn btn-secondary" onclick="removeCartItem('${escapeHTML(car.id)}')">Remove</button>
                </div>
            `).join("") : "<p>Your cart is empty.</p>"}
            <button class="btn btn-secondary" onclick="showBuyerSection('profile')">Back to Profile</button>
        `;
        return;
    }

    if (section === "bookings") {
        const myBookings = bookings.filter(item =>
            item.buyerEmail === currentBuyer.email || item.buyerId === currentBuyer.id
        );

        content.innerHTML = `
            <h3>My Viewing Requests</h3>
            ${myBookings.length ? myBookings.map(booking => `
                <div class="dashboard-item">
                    <div>
                        <strong>${escapeHTML(booking.carName || "Vehicle viewing")}</strong>
                        <p>${escapeHTML(booking.date || "")} at ${escapeHTML(booking.time || "")}</p>
                        <small>Status: ${escapeHTML(booking.status || "Requested")}</small>
                    </div>
                </div>
            `).join("") : "<p>No viewing requests yet.</p>"}
            <button class="btn btn-secondary" onclick="showBuyerSection('profile')">Back to Profile</button>
        `;
        return;
    }

    if (section === "assistant") {
        renderPersonalAssistant("buyer", currentBuyer, content);
    }
}

function editBuyerProfile() {
    const buyer = getCurrentBuyer();
    const content = element("buyerAreaContent");
    if (!buyer || !content) return;

    content.innerHTML = `
        <h3>Edit Buyer Profile</h3>
        <form id="buyerProfileForm">
            <div class="form-group">
                <label>Profile Picture</label>
                <input id="editBuyerPicture" type="file" accept="image/*">
                <small>Choose a profile image from your device.</small>
            </div>
            <div class="form-group"><label>Full Name</label><input id="editBuyerName" value="${escapeHTML(buyer.name || "")}" required></div>
            <div class="form-group"><label>Username</label><input id="editBuyerUsername" value="${escapeHTML(buyer.username || "")}"></div>
            <div class="form-group"><label>Phone Number</label><input id="editBuyerPhone" value="${escapeHTML(buyer.phone || "")}"></div>
            <div class="form-group"><label>Bio</label><textarea id="editBuyerBio">${escapeHTML(buyer.bio || "")}</textarea></div>
            <button class="btn btn-primary" type="submit">Save Profile</button>
            <button class="btn btn-secondary" type="button" onclick="showBuyerSection('profile')">Cancel</button>
        </form>
    `;

    element("buyerProfileForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        let picture = buyer.profilePicture || "";
        const file = element("editBuyerPicture")?.files?.[0];

        if (file) {
            if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
                showToast("Choose an image smaller than 2 MB.");
                return;
            }

            try {
                picture = await readImage(file);
            } catch {
                showToast("Could not read your profile picture.");
                return;
            }
        }

        const updated = {
            ...getCurrentBuyer(),
            name: element("editBuyerName").value.trim(),
            username: element("editBuyerUsername").value.trim(),
            phone: element("editBuyerPhone").value.trim(),
            bio: element("editBuyerBio").value.trim(),
            profilePicture: picture
        };

        if (!updateAccountRecord("buyer", updated)) return;

        updateDrawer();
        showBuyerSection("profile");
        showToast("Profile updated.");
    });
}

function readImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Image read failed."));
        reader.readAsDataURL(file);
    });
}

function logoutBuyer() {
    localStorage.removeItem(KEYS.buyer);
    closeModal("buyerAreaModal");
    updateDrawer();
    renderCars();
    showToast("Buyer logged out.");
}/* =========================================================
   8B. BUYER FAVOURITES AND CART
========================================================= */

function toggleFavourite(id) {
    if (!requireBuyer()) return;

    let favourites = getBuyerList("favourites");
    const exists = favourites.some(item => String(item) === String(id));

    if (exists) {
        favourites = favourites.filter(item => String(item) !== String(id));
        showToast("Removed from favourites.");
    } else {
        favourites.push(id);
        showToast("Added to favourites.");
    }

    saveBuyerList("favourites", favourites);
    renderCars();
}

function addToCart(id) {
    if (!requireBuyer()) return;

    const car = getCars().find(item => String(item.id) === String(id));
    if (!car) {
        showToast("Vehicle not found.");
        return;
    }

    const cart = getBuyerList("cart");

    if (cart.some(item => String(item) === String(id))) {
        showToast("Vehicle already in your cart.");
        return;
    }

    cart.push(id);
    if (saveBuyerList("cart", cart)) showToast("Vehicle added to cart.");
}

function removeCartItem(id) {
    const cart = getBuyerList("cart").filter(item => String(item) !== String(id));
    if (!saveBuyerList("cart", cart)) return;
    showBuyerSection("cart");
    showToast("Vehicle removed from cart.");
}

/* =========================================================
   9. VIEWING BOOKINGS
========================================================= */

function bookViewing(id) {
    const car = getPublicCars().find(item => String(item.id) === String(id));
    if (!car) {
        showToast("Vehicle not found.");
        return;
    }

    openCarWhatsApp(
        car,
        `Hello, I found the ${car.make} ${car.model} on DRIVE HUB. ` +
        "I would like to arrange a viewing. What times are available?"
    );
}

/* =========================================================
   10. DEALER AUTHENTICATION
========================================================= */

function openDealerAuth() {
    setDealerMode("register");
    showModal("dealerAuthModal");
}

function setDealerMode(mode) {
    dealerMode = mode;

    const registerFields = element("dealerRegisterFields");
    const title = element("dealerAuthTitle");
    const form = element("dealerAuthForm");

    if (registerFields) {
        registerFields.style.display = mode === "register" ? "block" : "none";

        registerFields.querySelectorAll("input, select, textarea").forEach(input => {
            if (input.dataset.originalRequired === undefined) {
                input.dataset.originalRequired = input.required ? "true" : "false";
            }

            input.required =
                mode === "register" && input.dataset.originalRequired === "true";
        });
    }

    if (title) title.textContent =
        mode === "register" ? "Dealer Registration" : "Dealer Login";

    element("dealerLoginTab")?.classList.toggle("active", mode === "login");
    element("dealerRegisterTab")?.classList.toggle("active", mode === "register");

    const submit = form?.querySelector('button[type="submit"]');
    if (submit) {
        submit.textContent = mode === "register"
            ? "Create Dealer Account"
            : "Continue to Login";
    }
}

function finishDealerAuthentication(account, mode) {
    const safeAccount = { ...account };
    delete safeAccount.password;

    if (!safeAccount.id) {
        showToast("Invalid dealer account returned by the server.");
        return;
    }

    if (!updateAccountRecord("dealer", safeAccount)) return;

    ensureAssistantIdentity("dealer", getCurrentDealer());
    closeModal("dealerAuthModal");
    updateDrawer();
    renderDealers();

    if (normalizeStatus(safeAccount.status) === "pending") {
        showToast("Your account is verified and awaiting admin approval.");
        return;
    }

    if (normalizeStatus(safeAccount.status) === "rejected") {
        showToast("Your dealer registration was not approved.");
        return;
    }

    openDealerDashboard("profile");
    showToast(mode === "register" ? "Dealer account verified." : "Welcome back.");
}

async function handleDealerAuth(event) {
    event.preventDefault();

    const contact = element("dealerEmail")?.value.trim();
    const password = element("dealerPassword")?.value;

    if (!contact || !password) {
        showToast("Enter your email/phone and password.");
        return;
    }

    if (dealerMode === "register" && password.length < 8) {
        showToast("Use a password with at least 8 characters.");
        return;
    }

    const dealers = getData(KEYS.dealers, []);
    const normalized = contact.toLowerCase();
    const normalizedPhone = normalizePhone(contact);

    const existing = dealers.find(dealer =>
        (dealer.email && String(dealer.email).toLowerCase() === normalized) ||
        (normalizedPhone && normalizePhone(dealer.phone) === normalizedPhone)
    );

    if (dealerMode === "register" && existing) {
        showToast("A dealer account with these details already exists.");
        return;
    }

    const account = dealerMode === "register" ? {
        id: makeId("dealer"),
        business: element("dealerBusiness")?.value.trim(),
        owner: element("dealerOwner")?.value.trim(),
        phone: element("dealerPhone")?.value.trim(),
        whatsapp: element("dealerWhatsApp")?.value.trim(),
        location: element("dealerLocation")?.value.trim(),
        description: element("dealerDescription")?.value.trim(),
        username: "",
        bio: "",
        profilePicture: "",
        email: contact.includes("@") ? contact.toLowerCase() : "",
        status: "pending",
        subscriptionStatus: "inactive",
        subscriptionExpiry: null,
        createdAt: new Date().toISOString()
    } : existing;

    if (dealerMode === "register" &&
        (!account.business || !account.owner || !account.phone)) {
        showToast("Complete the business, owner and phone details.");
        return;
    }

    const payload = {
        accountType: "dealer",
        mode: dealerMode,
        purpose: dealerMode === "register" ? "registration" : "login",
        contact,
        password,
        account
    };

    try {
        await requestVerificationCode(payload);
        showOTPPanel("dealer", contact, payload);
    } catch (error) {
        showToast(error.message);
    }
}

/* =========================================================
   11. DEALER DASHBOARD
========================================================= */

function addDealerProfileTab() {
    const dashboard = element("dealerDashboardModal");
    const tabs = dashboard?.querySelector(".dashboard-tabs");

    if (!tabs || element("dealerProfileTab")) return;

    const button = document.createElement("button");
    button.id = "dealerProfileTab";
    button.type = "button";
    button.textContent = "My Profile";
    button.onclick = () => showDealerSection("profile");

    tabs.appendChild(button);
}

function openDealerDashboard(section = "listings") {
    const dealer = getCurrentDealer();

    if (!dealer) {
        openDealerAuth();
        showToast("Please login as a dealer.");
        return;
    }

    ensureLoggedInAssistant();
    addDealerProfileTab();
    showDealerSection(section);
    showModal("dealerDashboardModal");
}

function subscriptionExpiryDate(dealer) {
    if (!dealer?.subscriptionExpiry) return null;

    const date = new Date(dealer.subscriptionExpiry);
    return Number.isNaN(date.getTime()) ? null : date;
}

function subscriptionCountdown(dealer) {
    const expiry = subscriptionExpiryDate(dealer);
    if (!expiry) return "No active subscription";

    const remaining = expiry.getTime() - Date.now();
    if (remaining <= 0) return "Subscription expired";

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getDealerPayments(dealer) {
    return getData(KEYS.payments, []).filter(payment =>
        String(payment.dealerId) === String(dealer.id) &&
        normalizeStatus(payment.status) === "confirmed"
    );
}

function showDealerSection(section) {
    const content = element("dealerDashboardContent");
    const dealer = getCurrentDealer();
    if (!content || !dealer) return;

    content.dataset.section = section;
    ensureAssistantIdentity("dealer", dealer);

    const currentDealer = getCurrentDealer();
    const cars = getCars().filter(car =>
        String(car.dealerId) === String(currentDealer.id)
    );

    if (section === "profile") {
        content.innerHTML = `
            <div class="account-panel">
                <h3>My Dealer Profile</h3>
                <div class="profile-avatar large-avatar">
                    ${currentDealer.profilePicture
                        ? `<img src="${escapeHTML(currentDealer.profilePicture)}" alt="Dealer profile">`
                        : "🏢"}
                </div>
                <p><strong>Business:</strong> ${escapeHTML(currentDealer.business || "")}</p>
                <p><strong>Owner:</strong> ${escapeHTML(currentDealer.owner || "")}</p>
                <p><strong>Username:</strong> ${escapeHTML(currentDealer.username || currentDealer.business || "")}</p>
                <p><strong>Email:</strong> ${escapeHTML(currentDealer.email || "")}</p>
                <p><strong>Phone:</strong> ${escapeHTML(currentDealer.phone || "")}</p>
                <p><strong>Location:</strong> ${escapeHTML(currentDealer.location || "")}</p>
                <p><strong>Bio:</strong> ${escapeHTML(currentDealer.bio || currentDealer.description || "No bio added.")}</p>
                <p><strong>Account status:</strong> ${escapeHTML(currentDealer.status || "Pending")}</p>
                <button class="btn btn-primary" onclick="editDealerProfile()">Edit Profile</button>
                <button class="btn btn-secondary" onclick="showDealerSection('payments')">Subscriptions & Payments</button>
                <button class="btn btn-secondary" onclick="showDealerSection('assistant')">My Assistant</button>
                <button class="btn btn-secondary" onclick="logoutDealer()">Logout</button>
            </div>
        `;
        return;
    }

    if (section === "listings") {
        content.innerHTML = `
            <h3>My Vehicle Listings</h3>
            <p class="muted">Your submitted vehicles are reviewed by DRIVE HUB before appearing publicly.</p>
            ${cars.length ? cars.map(car => `
                <div class="dashboard-item">
                    <div>
                        <strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong>
                        <p>${money(car.price)}</p>
                        <span class="status ${escapeHTML(normalizeStatus(car.status))}">${escapeHTML(car.status || "Pending")}</span>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="dealerToggleCarStatus('${escapeHTML(car.id)}')">
                            ${normalizeStatus(car.status) === "sold" ? "Mark Available" : "Mark Sold"}
                        </button>
                        <button class="btn btn-secondary" onclick="dealerDeleteCar('${escapeHTML(car.id)}')">Delete</button>
                    </div>
                </div>
            `).join("") : "<p>You have not submitted any vehicles yet.</p>"}
            <button class="btn btn-secondary" onclick="showDealerSection('add')">Submit a Vehicle</button>
            <button class="btn btn-secondary" onclick="logoutDealer()">Logout</button>
        `;
        return;
    }

    if (section === "payments") {
        renderDealerPayments(currentDealer, content);
        return;
    }

    if (section === "add") {
        renderDealerAddVehicle(currentDealer, content);
        return;
    }

    if (section === "assistant") {
        renderPersonalAssistant("dealer", currentDealer, content);
    }
}

/* =========================================================
   12. DEALER PROFILE EDITING
========================================================= */

function editDealerProfile() {
    const dealer = getCurrentDealer();
    const content = element("dealerDashboardContent");
    if (!dealer || !content) return;

    content.innerHTML = `
        <h3>Edit Dealer Profile</h3>
        <form id="dealerProfileForm">
            <div class="form-group"><label>Profile Picture</label><input id="editDealerPicture" type="file" accept="image/*"></div>
            <div class="form-group"><label>Business Name</label><input id="editDealerBusiness" value="${escapeHTML(dealer.business || "")}" required></div>
            <div class="form-group"><label>Username</label><input id="editDealerUsername" value="${escapeHTML(dealer.username || "")}"></div>
            <div class="form-group"><label>Owner Name</label><input id="editDealerOwner" value="${escapeHTML(dealer.owner || "")}"></div>
            <div class="form-group"><label>Phone</label><input id="editDealerPhone" value="${escapeHTML(dealer.phone || "")}"></div>
            <div class="form-group"><label>Location</label><input id="editDealerLocation" value="${escapeHTML(dealer.location || "")}"></div>
            <div class="form-group"><label>Bio / Description</label><textarea id="editDealerBio">${escapeHTML(dealer.bio || dealer.description || "")}</textarea></div>
            <button class="btn btn-primary" type="submit">Save Changes</button>
            <button class="btn btn-secondary" type="button" onclick="showDealerSection('profile')">Cancel</button>
        </form>
    `;

    element("dealerProfileForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        let picture = dealer.profilePicture || "";
        const file = element("editDealerPicture")?.files?.[0];

        if (file) {
            if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
                showToast("Choose an image smaller than 2 MB.");
                return;
            }

            try {
                picture = await readImage(file);
            } catch {
                showToast("Could not read your profile picture.");
                return;
            }
        }

        const updated = {
            ...dealer,
            business: element("editDealerBusiness").value.trim(),
            username: element("editDealerUsername").value.trim(),
            owner: element("editDealerOwner").value.trim(),
            phone: element("editDealerPhone").value.trim(),
            location: element("editDealerLocation").value.trim(),
            bio: element("editDealerBio").value.trim(),
            profilePicture: picture
        };

        if (!updateAccountRecord("dealer", updated)) return;

        updateDrawer();
        showDealerSection("profile");
        showToast("Dealer profile updated.");
    });
}

/* =========================================================
   13. SUBSCRIPTION PLANS AND PAYMENT SCREEN
========================================================= */

function renderDealerPayments(dealer, content) {
    const settings = getSettings();
    const prices = settings.subscriptionPrices;
    const methods = settings.paymentMethods.filter(method => method.enabled !== false);
    const payments = getDealerPayments(dealer);
    const expiry = subscriptionExpiryDate(dealer);

    const active =
        normalizeStatus(dealer.subscriptionStatus) === "active" &&
        expiry && expiry.getTime() > Date.now();

    const plans = [
        { id: "weekly", name: "Weekly Plan", price: prices.weekly, icon: "📅", description: "A flexible seven-day listing subscription." },
        { id: "monthly", name: "Monthly Plan", price: prices.monthly, icon: "👑", description: "Thirty days of dealership listing access." },
        { id: "perCar", name: "Per Car", price: prices.perCar, icon: "🚘", description: "A listing fee for each submitted vehicle." }
    ];

    content.innerHTML = `
        <h3>My Subscriptions & Payments</h3>
        <div class="account-panel">
            <h3>${active ? "Subscription Active" : "Subscription Inactive"}</h3>
            <p><strong>Expiry:</strong> ${expiry ? escapeHTML(expiry.toLocaleString("en-KE")) : "Not available"}</p>
            <p><strong>Time remaining:</strong>
                <span id="dealerSubscriptionCountdown">${escapeHTML(subscriptionCountdown(dealer))}</span>
            </p>
        </div>

        <h3 style="margin-top:25px;">Choose Your Subscription</h3>
        <div class="subscription-plans">
            ${plans.map(plan => `
                <article class="subscription-card">
                    <div class="subscription-icon">${plan.icon}</div>
                    <h3>${escapeHTML(plan.name)}</h3>
                    <div class="subscription-price">${money(plan.price)}</div>
                    <p>${escapeHTML(plan.description)}</p>
                    <button class="btn btn-primary" onclick="openSubscriptionPayment('${plan.id}')">Choose Plan</button>
                </article>
            `).join("")}
        </div>

        <div id="subscriptionPaymentArea"></div>

        <h3 style="margin-top:30px;">Payment History</h3>
        ${payments.length ? payments.map(payment => `
            <div class="dashboard-item">
                <div>
                    <strong>${money(payment.amount)}</strong>
                    <p>${escapeHTML(payment.plan || payment.type || "Subscription")}</p>
                    <small>${escapeHTML(payment.date || payment.paymentDate || "")}</small>
                    <small>${escapeHTML(payment.method || payment.paymentMethod || "")}</small>
                    <small>Reference: ${escapeHTML(payment.reference || payment.transactionReference || "—")}</small>
                </div>
                <div>
                    <span class="status">Confirmed</span>
                    ${payment.receiptNumber ? `
                        <p><button class="btn btn-secondary" onclick="viewReceipt('${escapeHTML(payment.id)}')">View Receipt</button></p>
                    ` : ""}
                </div>
            </div>
        `).join("") : "<p>No confirmed payment records yet.</p>"}
    `;

    refreshSubscriptionCountdown();
}

function openSubscriptionPayment(planId) {
    const settings = getSettings();
    const prices = settings.subscriptionPrices;

    const planNames = {
        weekly: "Weekly Subscription",
        monthly: "Monthly Subscription",
        perCar: "Per Car Listing"
    };

    if (!Object.prototype.hasOwnProperty.call(planNames, planId)) {
        showToast("Invalid subscription plan.");
        return;
    }

    const amount = Number(prices[planId]);

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("This subscription price has not been configured by the administrator.");
        return;
    }

    const methods = settings.paymentMethods.filter(method => method.enabled !== false);
    const area = element("subscriptionPaymentArea");
    if (!area) return;

    if (!methods.length) {
        area.innerHTML = `
            <div class="account-panel">
                <h3>Payments Temporarily Unavailable</h3>
                <p>No payment methods are currently enabled.</p>
                <p>Please contact DRIVE HUB customer care.</p>
            </div>
        `;
        return;
    }

    area.innerHTML = `
        <div class="account-panel payment-panel">
            <h3>Complete Your Payment</h3>
            <p><strong>Selected plan:</strong> ${escapeHTML(planNames[planId])}</p>
            <h2>${money(amount)}</h2>
            <form id="subscriptionPaymentForm">
                <input type="hidden" id="selectedPlan" value="${escapeHTML(planId)}">
                <div class="form-group">
                    <label>Choose Payment Method</label>
                    <div class="payment-method-options">
                        ${methods.map((method, index) => `
                            <label class="payment-method-option">
                                <input type="radio" name="paymentMethod" value="${escapeHTML(method.id)}" ${index === 0 ? "checked" : ""}>
                                <span class="payment-method-icon">${escapeHTML(method.icon || "💳")}</span>
                                <strong>${escapeHTML(method.name)}</strong>
                            </label>
                        `).join("")}
                    </div>
                </div>
                <div class="form-group">
                    <label for="paymentPhone">Phone Number (for mobile money)</label>
                    <input id="paymentPhone" type="tel" placeholder="2547XXXXXXXX">
                    <small>Required for M-Pesa and Airtel Money.</small>
                </div>
                <button class="btn btn-primary" type="submit">Continue to Secure Payment</button>
            </form>
            <p class="muted">Your subscription is activated only after the payment provider confirms payment.</p>
        </div>
    `;

    area.scrollIntoView({ behavior: "smooth", block: "start" });
    element("subscriptionPaymentForm")?.addEventListener("submit", handleSubscriptionPayment);
}

async function handleSubscriptionPayment(event) {
    event.preventDefault();

    const dealer = getCurrentDealer();
    if (!dealer) {
        showToast("Please login as a dealer.");
        return;
    }

    const plan = element("selectedPlan")?.value;
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const phone = element("paymentPhone")?.value.trim();

    if (!method) {
        showToast("Choose a payment method.");
        return;
    }

    if (["mpesa", "airtel"].includes(method) && !phone) {
        showToast("Enter the phone number for mobile money payment.");
        return;
    }

    const settings = getSettings();

    if (!Object.prototype.hasOwnProperty.call(settings.subscriptionPrices, plan)) {
        showToast("Invalid subscription plan.");
        return;
    }

    const amount = Number(settings.subscriptionPrices[plan]);

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Invalid subscription amount.");
        return;
    }

    const button = event.submitter;

    if (button) {
        button.disabled = true;
        button.textContent = "Connecting to payment provider...";
    }

    try {
        const response = await fetch(API.initializePayment, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                dealerId: dealer.id,
                plan,
                amount,
                currency: "KES",
                paymentMethod: method,
                phone
            })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.message || "Payment could not be initialized.");
        }

        if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
            return;
        }

        if (result.reference) {
            showPaymentPending(result.reference);
        } else {
            showToast(result.message || "Payment request submitted. Waiting for provider confirmation.");
        }
    } catch (error) {
        console.error("Payment initialization:", error);
        showToast(error.message || "Secure payment service is unavailable. No payment has been taken.");
    } finally {
        if (button && document.body.contains(button)) {
            button.disabled = false;
            button.textContent = "Continue to Secure Payment";
        }
    }
}

function showPaymentPending(reference) {
    const area = element("subscriptionPaymentArea");
    if (!area) return;

    area.innerHTML = `
        <div class="account-panel">
            <h3>Payment Request Sent</h3>
            <p>Reference: ${escapeHTML(reference)}</p>
            <p>Follow the instructions on your phone or payment page.</p>
            <p>Waiting for payment provider confirmation...</p>
            <button class="btn btn-primary" onclick="checkPaymentStatus('${escapeHTML(reference)}')">Check Payment Status</button>
        </div>
    `;
}

async function checkPaymentStatus(reference) {
    try {
        const response = await fetch(
            `${API.paymentStatus}?reference=${encodeURIComponent(reference)}`,
            { credentials: "include" }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.message || "Could not check payment status.");
        }

        if (normalizeStatus(result.status) === "confirmed" && result.payment) {
            if (!recordConfirmedPayment(result.payment)) {
                showToast("Payment response could not be matched to your dealer account.");
                return;
            }

            showToast("Payment confirmed. Your receipt is ready.");
            showDealerSection("payments");
            refreshSubscriptionCountdown();
            return;
        }

        if (normalizeStatus(result.status) === "failed") {
            showToast("Payment was not completed.");
            return;
        }

        showToast("Payment is still awaiting confirmation.");
    } catch (error) {
        console.error("Payment status:", error);
        showToast(error.message || "Unable to check payment status.");
    }
}

/* =========================================================
   14. CONFIRMED PAYMENTS AND RECEIPTS
========================================================= */

function recordConfirmedPayment(payment) {
    if (!payment || normalizeStatus(payment.status) !== "confirmed") {
        console.warn("Unconfirmed payment was not recorded.");
        return false;
    }

    const currentDealer = getCurrentDealer();

    if (!currentDealer || String(payment.dealerId) !== String(currentDealer.id)) {
        console.warn("Payment does not belong to the current dealer.");
        return false;
    }

    // A confirmed response must include a server-issued expiry for
    // weekly/monthly plans. The browser must never invent one.
    const plan = normalizeStatus(payment.plan || payment.type);
    const expiry = payment.subscriptionExpiry || null;

    if (["weekly", "monthly"].includes(plan)) {
        const parsedExpiry = expiry ? new Date(expiry) : null;

        if (!parsedExpiry || Number.isNaN(parsedExpiry.getTime()) ||
            parsedExpiry.getTime() <= Date.now()) {
            showToast("The payment server did not return a valid subscription expiry. Please contact support.");
            return false;
        }
    }

    const payments = getData(KEYS.payments, []);

    const exists = payments.some(item =>
        (payment.reference && item.reference === payment.reference) ||
        (payment.transactionReference && item.transactionReference === payment.transactionReference) ||
        (payment.id && String(item.id) === String(payment.id))
    );

    if (!exists) {
        payments.push(payment);
        if (!setData(KEYS.payments, payments)) return false;
    }

    const updated = {
        ...currentDealer,
        ...(plan === "perCar" ? {} : {
            subscriptionStatus: "active",
            subscriptionStartedAt: payment.subscriptionStartedAt || payment.confirmedAt,
            subscriptionExpiry: expiry
        }),
        // Listing credits must be issued by the backend, not calculated
        // from a browser-submitted payment amount.
        ...(Number.isInteger(payment.listingCredits)
            ? { listingCredits: payment.listingCredits }
            : {})
    };

    if (!updateAccountRecord("dealer", updated)) return false;

    updateDrawer();
    refreshSubscriptionCountdown();
    return true;
}

function viewReceipt(paymentId) {
    const payments = getData(KEYS.payments, []);
    const payment = payments.find(item => String(item.id) === String(paymentId));

    if (!payment || normalizeStatus(payment.status) !== "confirmed") {
        showToast("A confirmed receipt is not available.");
        return;
    }

    const receipt = payment.receipt || {};
    const dealer = getCurrentDealer();

    const receiptText = [
        "DRIVE HUB KENYA",
        "OFFICIAL PAYMENT RECEIPT",
        "-------------------------",
        `Receipt: ${receipt.number || payment.receiptNumber || payment.id}`,
        `Dealer: ${dealer?.business || payment.dealerName || ""}`,
        `Amount: ${money(payment.amount)}`,
        `Payment method: ${payment.method || payment.paymentMethod || ""}`,
        `Transaction reference: ${payment.reference || payment.transactionReference || ""}`,
        `Payment date: ${payment.date || payment.paymentDate || ""}`,
        `Subscription: ${payment.plan || payment.type || ""}`,
        "Status: CONFIRMED"
    ].join("\n");

    const content = element("dealerDashboardContent");
    if (!content) return;

    content.innerHTML = `
        <div class="account-panel receipt-panel">
            <h2>DRIVE HUB</h2>
            <h3>Official Payment Receipt</h3>
            <pre>${escapeHTML(receiptText)}</pre>
            <button class="btn btn-primary" onclick="copyReceipt('${encodeURIComponent(receiptText)}')">Copy Receipt</button>
            <button class="btn btn-secondary" onclick="shareReceiptWhatsApp('${encodeURIComponent(receiptText)}')">Share on WhatsApp</button>
            <button class="btn btn-secondary" onclick="showDealerSection('payments')">Back to Payments</button>
        </div>
    `;
}

function copyReceipt(encoded) {
    const text = decodeURIComponent(encoded);

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast("Receipt copied."))
            .catch(() => showToast("Could not copy receipt."));
    } else {
        showToast("Copy is not supported by this browser.");
    }
}

function shareReceiptWhatsApp(encoded) {
    const text = decodeURIComponent(encoded);

    window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener"
    );
}

/* =========================================================
   15. DEALER VEHICLE SUBMISSION
========================================================= */

function dealerHasActiveSubscription(dealer) {
    const expiry = subscriptionExpiryDate(dealer);

    return normalizeStatus(dealer?.subscriptionStatus) === "active" &&
        expiry && expiry.getTime() > Date.now();
}

function renderDealerAddVehicle(dealer, content) {
    const subscriptionActive = dealerHasActiveSubscription(dealer);

    if (!isDealerApproved(dealer)) {
        content.innerHTML = `
            <div class="account-panel">
                <h3>Dealer Approval Required</h3>
                <p>Your dealer account must be approved by the administrator before submitting vehicles.</p>
            </div>
        `;
        return;
    }

    if (!subscriptionActive) {
        content.innerHTML = `
            <div class="account-panel">
                <h3>Subscription Required</h3>
                <p>Your dealer subscription is not currently active.</p>
                <p>Activate or renew your subscription before submitting another vehicle.</p>
                <button class="btn btn-primary" onclick="showDealerSection('payments')">View Subscription Plans</button>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <h3>Submit a Vehicle</h3>
        <p class="muted">Your vehicle will be sent to the admin for approval before publication.</p>
        <form id="addVehicleForm">
            <div class="form-grid">
                <div class="form-group"><label>Make</label><input id="newMake" required></div>
                <div class="form-group"><label>Model</label><input id="newModel" required></div>
                <div class="form-group"><label>Year</label><input id="newYear" type="number" min="1950" max="2035" required></div>
                <div class="form-group"><label>Price (KSh)</label><input id="newPrice" type="number" min="1" required></div>
                <div class="form-group"><label>Mileage (km)</label><input id="newMileage" type="number" min="0"></div>
                <div class="form-group"><label>Engine</label><input id="newEngine"></div>
                <div class="form-group"><label>Fuel</label><select id="newFuel"><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></div>
                <div class="form-group"><label>Transmission</label><select id="newTransmission"><option>Automatic</option><option>Manual</option></select></div>
                <div class="form-group"><label>Condition</label><select id="newCondition"><option>Foreign Used</option><option>Locally Used</option><option>Brand New</option></select></div>
                <div class="form-group"><label>Location</label><input id="newLocation" required></div>
                <div class="form-group"><label>WhatsApp Number</label><input id="newWhatsApp" placeholder="2547XXXXXXXX"></div>
                <div class="form-group"><label>Vehicle Images (up to 8)</label><input id="newImages" type="file" accept="image/*" multiple required></div>
            </div>
            <div class="form-group"><label>Description</label><textarea id="newDescription" rows="4"></textarea></div>
            <div class="form-group">
                <label for="newTikTokUrl">TikTok Video Review Link (optional)</label>
                <input id="newTikTokUrl" type="url"
                    placeholder="https://www.tiktok.com/@account/video/...">
            </div>
            <button class="btn btn-primary" type="submit">Submit Vehicle for Approval</button>
        </form>
    `;

    element("addVehicleForm")?.addEventListener("submit", submitVehicle);
}

function dealerToggleCarStatus(id) {
    const dealer = getCurrentDealer();
    if (!dealer) return;

    const cars = getCars();
    const index = cars.findIndex(car =>
        String(car.id) === String(id) &&
        String(car.dealerId) === String(dealer.id)
    );

    if (index === -1) {
        showToast("Vehicle not found in your listings.");
        return;
    }

    const status = normalizeStatus(cars[index].status);

    if (status === "pending" || status === "rejected") {
        showToast("This vehicle must first be approved by the administrator.");
        return;
    }

    if (!["approved", "available", "sold"].includes(status)) {
        showToast("This vehicle cannot be changed yet.");
        return;
    }

    cars[index].status = status === "sold" ? "approved" : "sold";
    cars[index].updatedAt = new Date().toISOString();

    if (!setData(KEYS.cars, cars)) return;

    showDealerSection("listings");
    renderCars();
    showToast("Vehicle status updated.");
}

function dealerDeleteCar(id) {
    const dealer = getCurrentDealer();
    if (!dealer) return;

    if (!confirm("Are you sure you want to delete this vehicle listing?")) return;

    const cars = getCars();
    const updated = cars.filter(car =>
        !(String(car.id) === String(id) && String(car.dealerId) === String(dealer.id))
    );

    if (updated.length === cars.length) {
        showToast("Vehicle not found.");
        return;
    }

    if (!setData(KEYS.cars, updated)) return;

    showDealerSection("listings");
    renderCars();
    showToast("Your vehicle listing was deleted.");
}

async function submitVehicle(event) {
    event.preventDefault();

    const dealer = getCurrentDealer();
    if (!dealer) return;

    if (!isDealerApproved(dealer) || !dealerHasActiveSubscription(dealer)) {
        showToast("An approved dealer account and active subscription are required.");
        showDealerSection("payments");
        return;
    }

    const files = Array.from(element("newImages")?.files || []);

    if (!files.length || files.length > 8) {
        showToast("Choose between 1 and 8 vehicle images.");
        return;
    }

    if (files.some(file => !file.type.startsWith("image/"))) {
        showToast("Only image files are allowed.");
        return;
    }

    if (files.some(file => file.size > 1024 * 1024)) {
        showToast("Each image must be smaller than 1 MB.");
        return;
    }

    const submitButton = event.submitter;

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Processing images...";
    }

    try {
        const images = await Promise.all(files.map(readImage));
        const year = Number(element("newYear").value);
        const price = Number(element("newPrice").value);
        const tiktokUrl = element("newTikTokUrl").value.trim();

        if (!Number.isInteger(year) || year < 1950 || year > 2035 ||
            !Number.isFinite(price) || price <= 0) {
            showToast("Enter a valid vehicle year and price.");
            return;
        }

        if (tiktokUrl && !getTikTokVideoUrl(tiktokUrl)) {
            showToast("Enter a valid HTTPS TikTok video link.");
            return;
        }

        const car = {
            id: makeId("car"),
            make: element("newMake").value.trim(),
            model: element("newModel").value.trim(),
            year,
            price,
            mileage: Number(element("newMileage").value || 0),
            engine: element("newEngine").value.trim(),
            fuel: element("newFuel").value,
            transmission: element("newTransmission").value,
            condition: element("newCondition").value,
            location: element("newLocation").value.trim(),
            phone: element("newWhatsApp").value.trim() || dealer.whatsapp,
            description: element("newDescription").value.trim(),
            tiktokUrl: getTikTokVideoUrl(tiktokUrl),
            images,
            dealerId: dealer.id,
            status: "pending",
            featured: false,
            createdAt: new Date().toISOString()
        };

        const cars = getCars();
        cars.push(car);

        if (!setData(KEYS.cars, cars)) return;

        showToast("Vehicle submitted. Await admin approval.");
        showDealerSection("listings");
        renderCars();
    } catch (error) {
        console.error("Vehicle submission:", error);
        showToast("Could not process vehicle images. Try smaller images.");
    } finally {
        if (submitButton && document.body.contains(submitButton)) {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Vehicle for Approval";
        }
    }
}

function logoutDealer() {
    localStorage.removeItem(KEYS.dealer);
    closeModal("dealerDashboardModal");
    updateDrawer();
    renderCars();
    renderDealers();
    showToast("Dealer logged out.");
}

/* =========================================================
   16. DEALER DIRECTORY
========================================================= */

function renderDealers() {
    const grid = element("dealerGrid");
    if (!grid) return;

    const dealers = getData(KEYS.dealers, [])
        .filter(dealer => isDealerApproved(dealer));

    grid.innerHTML = dealers.length ? dealers.map(dealer => `
        <div class="dealer-card">
            <h3>${escapeHTML(dealer.business)}</h3>
            <p>${escapeHTML(dealer.location || "Kenya")}</p>
            <p>${escapeHTML(dealer.description || "Vehicle dealer")}</p>
            <button class="btn btn-secondary" onclick="viewDealerCars('${escapeHTML(dealer.id)}')">View Vehicles</button>
        </div>
    `).join("") : "<p class='muted'>Dealer listings will appear here.</p>";
}

function viewDealerCars(id) {
    const cars = getCars().filter(car =>
        String(car.dealerId) === String(id) &&
        ["approved", "available"].includes(normalizeStatus(car.status))
    );

    if (!cars.length) {
        showToast("No approved vehicles from this dealer yet.");
        return;
    }

    const grid = element("carGrid");
    if (!grid) return;

    grid.innerHTML = cars.map(car => `
        <article class="car-card">
            <div class="car-image">
                <img src="${escapeHTML(carImages(car)[0])}" alt="${escapeHTML(car.model)}" loading="lazy">
            </div>
            <div class="car-card-content">
                <h3>${escapeHTML(car.make)} ${escapeHTML(car.model)}</h3>
                <div class="car-price">${money(car.price)}</div>
                <button class="btn btn-primary" onclick="openDetails('${escapeHTML(car.id)}')">View Details</button>
            </div>
        </article>
    `).join("");

    if (element("inventoryCount")) {
        element("inventoryCount").textContent = `${cars.length} vehicles from this dealer`;
    }

    if (element("emptyState")) element("emptyState").style.display = "none";

    grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================================================
   17. WHATSAPP DEALER CONTACT
========================================================= */

function getCarWhatsAppNumber(car) {
    const dealer = getData(KEYS.dealers, []).find(item =>
        String(item.id) === String(car.dealerId)
    );
    const rawPhone = [
        car.phone,
        dealer?.whatsapp,
        dealer?.phone,
        dealer?.contact
    ].find(value => String(value || "").trim());

    let phone = normalizePhone(rawPhone);

    if (phone.startsWith("0")) {
        phone = "254" + phone.slice(1);
    } else if (phone.length === 9 && /^[17]/.test(phone)) {
        phone = "254" + phone;
    }

    return phone;
}

function openCarWhatsApp(car, message) {
    const phone = getCarWhatsAppNumber(car);

    if (phone.length < 9) {
        showToast("This dealer has not added a valid WhatsApp number yet.");
        return;
    }

    window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener"
    );
}

/* =========================================================
   18. PERSONAL ASSISTANT IDENTITY AND HISTORY
========================================================= */

const ASSISTANT_NAMES = [
    "Alex", "Nova", "Max", "Leo", "Aiden", "Maya", "Ethan",
    "Zara", "Kai", "Luna", "Ryan", "Ava", "Noah", "Mila",
    "Eli", "Nora", "Jay", "Aria", "Theo", "Ivy", "Milo",
    "Ruby", "Ezra", "Skye", "Liam"
];

function generateAssistantName() {
    const usedNames = [
        ...getData(KEYS.buyers, []),
        ...getData(KEYS.dealers, [])
    ].map(account => account.assistantName).filter(Boolean);

    const available = ASSISTANT_NAMES.filter(name => !usedNames.includes(name));

    if (available.length) {
        return available[Math.floor(Math.random() * available.length)];
    }

    return "Assistant " + Math.floor(1000 + Math.random() * 9000);
}

function ensureAssistantIdentity(type, account) {
    if (!account?.id) return account;
    if (account.assistantName) return account;

    const updated = {
        ...account,
        assistantName: generateAssistantName()
    };

    if (!updateAccountRecord(type, updated)) return account;
    return updated;
}

function ensureLoggedInAssistant() {
    const dealer = getCurrentDealer();

    if (dealer) return ensureAssistantIdentity("dealer", dealer);

    const buyer = getCurrentBuyer();

    if (buyer) return ensureAssistantIdentity("buyer", buyer);

    return null;
}

function getAssistantAccount() {
    const dealer = getCurrentDealer();

    if (dealer) {
        return {
            type: "dealer",
            account: ensureAssistantIdentity("dealer", dealer)
        };
    }

    const buyer = getCurrentBuyer();

    if (buyer) {
        return {
            type: "buyer",
            account: ensureAssistantIdentity("buyer", buyer)
        };
    }

    return null;
}

function assistantChatStorageKey(type, account) {
    return `drivehub_assistant_chat_${type}_${account.id}_v1`;
}

function getAssistantConversationFor(type, account) {
    if (!account?.id) return [];

    const history = getData(assistantChatStorageKey(type, account), []);
    return Array.isArray(history) ? history : [];
}

function saveAssistantConversationFor(type, account, messages) {
    if (!account?.id) return false;

    return setData(
        assistantChatStorageKey(type, account),
        messages.slice(-100)
    );
}

function getAssistantConversation() {
    const current = getAssistantAccount();
    if (!current) return [];

    return getAssistantConversationFor(current.type, current.account);
}

function saveAssistantConversation(messages) {
    const current = getAssistantAccount();
    if (!current) return false;

    return saveAssistantConversationFor(current.type, current.account, messages);
}

function getAssistantName() {
    const current = getAssistantAccount();
    return current?.account?.assistantName || "Assistant";
}

/* =========================================================
   19. BUILT-IN DRIVE HUB KNOWLEDGE ASSISTANT
========================================================= */

function getDriveHubAnswer(message, type, account) {
    const q = String(message || "").toLowerCase();
    const dealer = type === "dealer" ? account : null;
    const buyer = type === "buyer" ? account : null;

    const contains = (...words) => words.some(word => q.includes(word));

    if (contains("hello", "hi", "hey", "good morning", "good evening")) {
        return `Hello! I'm ${account.assistantName}, your DRIVE HUB assistant. What would you like help with today?`;
    }

    if (contains("what is drive hub", "about drive hub", "what do you do", "how does drive hub work")) {
        return "DRIVE HUB is a vehicle marketplace designed to connect buyers with vehicle dealers. Buyers can browse vehicles, search and filter listings, save favourites, add vehicles to their cart, request viewings and contact dealers. Dealers can create accounts, apply for approval, submit vehicles and manage subscriptions.";
    }

    if (contains("register", "sign up", "create account", "join drive hub")) {
        return "To register as a buyer, open My Profile and choose the registration option. To register as a dealer, choose Dealer Registration and complete the business, owner and contact details. The verification process requires a real OTP service connected to the website.";
    }

    if (contains("otp", "verification code", "verify account", "code not received")) {
        return "DRIVE HUB uses a verification-code step for account security. Actual OTP delivery requires the secure authentication backend to be configured. If no code arrives, check that your contact details are correct and contact customer care.";
    }

    if (contains("forgot password", "reset password", "password")) {
        return "For account-password problems, use the login or password-recovery process provided by the authentication service. Password resets must be handled securely by the server. Do not share your password or verification code with anyone.";
    }

    if (contains("buyer", "favourite", "favorites", "saved car", "cart", "booking", "viewing")) {
        if (buyer) {
            return "Your buyer dashboard gives you access to your profile, saved favourites, cart and viewing requests. Open My Profile and select the section you want. Viewing requests are saved with their date, time and contact details.";
        }

        return "Buyer accounts can save favourite vehicles, add vehicles to a cart, manage a profile and request vehicle viewings. Sign in to your buyer account to access these features.";
    }

    if (contains("dealer approval", "approve dealer", "pending approval", "dealer status", "approved dealer")) {
        if (dealer) {
            const status = dealer.status || "Pending";
            return `Your current dealer account status is "${status}". New dealer registrations must be reviewed by the DRIVE HUB administrator. The assistant cannot approve accounts or change approval status.`;
        }

        return "Dealer registrations are reviewed by the DRIVE HUB administrator. Only approved dealers should appear in the public dealer directory. This assistant cannot approve or reject a dealer.";
    }

    if (contains("submit car", "add car", "upload car", "vehicle listing", "list a vehicle", "submit vehicle")) {
        if (dealer) {
            return "To submit a vehicle, your dealer account must be approved and your subscription must be active. Open your dealer dashboard, select Submit a Vehicle, enter the vehicle details, upload up to eight images and submit it. The vehicle remains pending until an administrator reviews it.";
        }

        return "Vehicle submissions are a dealer feature. Dealers need an approved account and an active subscription before submitting vehicles for admin review.";
    }

    if (contains("subscription", "weekly plan", "monthly plan", "per car", "listing fee", "subscription plan")) {
        const settings = getSettings();
        const prices = settings.subscriptionPrices;

        return `The configured subscription prices are: Weekly ${money(prices.weekly)}, Monthly ${money(prices.monthly)}, and Per Car ${money(prices.perCar)}. The administrator can configure these prices. Weekly and monthly plans use an expiry countdown. Per Car is a listing fee and does not represent a time-based subscription.`;
    }

    if (contains("countdown", "expiry", "expires", "time left", "remaining days", "renew")) {
        if (dealer) {
            const expiry = subscriptionExpiryDate(dealer);

            return expiry
                ? `Your subscription expiry is ${expiry.toLocaleString("en-KE")}. Current remaining time: ${subscriptionCountdown(dealer)}. The countdown is calculated from the saved expiry date.`
                : "Your dealer account does not currently have a saved subscription expiry date. Check your subscription page for available plans.";
        }

        return "Dealer subscriptions show a countdown based on their saved expiry date. Dealers can check the countdown in the Subscriptions & Payments section of their dashboard.";
    }

    if (contains("payment", "pay", "mpesa", "m-pesa", "airtel", "visa", "card")) {
        return "DRIVE HUB currently displays the payment methods enabled in its settings. A payment only activates a subscription after the payment provider securely confirms it. If a payment is pending, use the payment-status check. Never treat an unconfirmed request as a successful payment.";
    }

    if (contains("receipt", "payment history", "transaction reference")) {
        return "Confirmed dealer payments are listed under Subscriptions & Payments. Where a receipt is available, use View Receipt to display it, copy it or share it through WhatsApp. Pending payments should not produce confirmed receipts.";
    }

    if (contains("search", "find car", "filter", "vehicle available", "browse")) {
        return "Use the Browse Cars section to search by vehicle name or keyword. You can also filter by make, maximum price and minimum year, then sort the results. Open a vehicle's Details page to see its specifications and contact options.";
    }

    if (contains("contact dealer", "whatsapp", "seller", "dealer phone")) {
        return "Open the vehicle details and choose WhatsApp Dealer. This opens WhatsApp with a message about the selected vehicle, provided the dealer has supplied a valid contact number.";
    }

    if (contains("safe", "scam", "fraud", "trust", "verify vehicle")) {
        return "Before making any vehicle purchase, independently verify the vehicle documents, ownership, condition and seller details. Arrange an appropriate inspection and use secure payment arrangements. DRIVE HUB listings alone should not be treated as a guarantee of a vehicle's condition or ownership.";
    }

    if (contains("admin", "administrator", "customer care", "support", "help", "complaint", "problem")) {
        return "For account approval, payment disputes, listing reviews or other matters requiring administrator action, please contact DRIVE HUB customer care. I can explain the website features, but I cannot access administrator records or make decisions on their behalf.";
    }

    if (contains("profile", "username", "profile picture", "edit account")) {
        return "You can edit your account profile from your dashboard. Open My Profile and choose Edit Profile to update the available personal or business details and profile picture.";
    }

    if (contains("import", "imports", "imported cars")) {
        return "The homepage includes a Vehicle Imports section. Check the section on the website for the current availability of that service. I cannot confirm an import order or quote a price.";
    }

    if (contains("thank", "thanks")) {
        return "You're welcome! I'm here to help you understand DRIVE HUB and its features.";
    }

    return "I can help with DRIVE HUB registration, buyer profiles, favourites, cart, bookings, dealer approval, vehicle submissions, subscriptions, countdowns, payments, receipts and vehicle searches. I don't have access to live administrator decisions or payment-provider records. For a matter that needs checking by the team, please contact DRIVE HUB customer care.";
}

/* =========================================================
   20. PERSONAL ASSISTANT UI
========================================================= */

function renderPersonalAssistant(type, account, container) {
    if (!container || !account) return;

    const history = getAssistantConversationFor(type, account);
    const name = account.assistantName || "Assistant";
    const chatId = type === "buyer" ? "buyerAssistantChat" : "dealerAssistantChat";
    const formId = type === "buyer" ? "buyerAssistantForm" : "dealerAssistantForm";
    const messageId = type === "buyer" ? "buyerAssistantMessage" : "dealerAssistantMessage";

    container.innerHTML = `
        <div class="account-panel assistant-panel">
            <h3>${escapeHTML(name)} — Your Personal Assistant</h3>
            <p class="muted">Ask questions about DRIVE HUB, your account, vehicles, dealer tools or subscriptions.</p>
            <div id="${chatId}" class="assistant-chat">
                ${history.length ? history.map(item => `
                    <div class="chat-message ${item.role === "user" ? "user" : "bot"}">${escapeHTML(item.message)}</div>
                `).join("") : `
                    <div class="chat-message bot">Hello! I'm ${escapeHTML(name)}. How can I help you with DRIVE HUB today?</div>
                `}
            </div>
            <form id="${formId}" class="assistant-form">
                <input id="${messageId}" type="text" placeholder="Ask me something..." autocomplete="off" required>
                <button class="btn btn-primary" type="submit">Send</button>
            </form>
            <button class="btn btn-secondary" type="button" onclick="clearAssistantConversation('${type}')">Clear Conversation</button>
        </div>
    `;

    const chat = element(chatId);
    if (chat) chat.scrollTop = chat.scrollHeight;

    element(formId)?.addEventListener("submit", event => {
        handlePersonalAssistantForm(event, type);
    });
}

function clearAssistantConversation(type) {
    const current = getAssistantAccount();
    if (!current || current.type !== type) return;

    if (!confirm("Clear this assistant conversation?")) return;

    saveAssistantConversationFor(type, current.account, []);

    if (type === "buyer") {
        showBuyerSection("assistant");
    } else {
        showDealerSection("assistant");
    }
}

function handlePersonalAssistantForm(event, type) {
    event.preventDefault();

    const current = getAssistantAccount();

    if (!current || current.type !== type) {
        showToast("Please sign in to the correct account first.");
        return;
    }

    const inputId = type === "buyer" ? "buyerAssistantMessage" : "dealerAssistantMessage";
    const message = element(inputId)?.value.trim();

    if (!message) return;

    const history = getAssistantConversationFor(type, current.account);

    history.push({
        role: "user",
        message,
        createdAt: new Date().toISOString()
    });

    const reply = getDriveHubAnswer(message, type, current.account);

    history.push({
        role: "assistant",
        message: reply,
        createdAt: new Date().toISOString()
    });

    saveAssistantConversationFor(type, current.account, history);

    if (type === "buyer") {
        showBuyerSection("assistant");
    } else {
        showDealerSection("assistant");
    }
}

/* =========================================================
   21. CUSTOMER CARE ASSISTANT
========================================================= */

function updateAssistantHeading() {
    const current = getAssistantAccount();
    if (!current) return;

    const name = current.account.assistantName;
    const title = element("customerCareTitle");
    const subtitle = element("customerCareSubtitle");

    if (title) title.textContent = `${name} — Your Personal Assistant`;

    if (subtitle) {
        subtitle.textContent = "Ask me about DRIVE HUB or its features.";
    }
}

function openCustomerCare() {
    const current = getAssistantAccount();
    const chat = element("supportChat");
    const form = element("supportChatForm");

    if (!current) {
        const title = element("customerCareTitle");
        const subtitle = element("customerCareSubtitle");

        if (title) title.textContent = "Drive Hub Customer Care";
        if (subtitle) {
            subtitle.textContent = "Need help with Drive Hub? Chat with our team on WhatsApp.";
        }
        if (chat) chat.hidden = true;
        if (form) form.hidden = true;
        showModal("customerCareModal");
        return;
    }

    if (chat) chat.hidden = false;
    if (form) form.hidden = false;
    updateAssistantHeading();
    renderAssistantConversation();
    showModal("customerCareModal");
    element("supportMessage")?.focus();
}

function appendSupportMessage(message, type) {
    const chat = element("supportChat");
    if (!chat) return;

    const bubble = document.createElement("div");
    bubble.className = `chat-message ${type}`;
    bubble.textContent = String(message || "");

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
}

function renderAssistantConversation() {
    const chat = element("supportChat");
    if (!chat) return;

    chat.innerHTML = "";

    const current = getAssistantAccount();
    if (!current) return;

    const history = getAssistantConversation();
    const name = current.account.assistantName;

    if (!history.length) {
        appendSupportMessage(
            `Hello! I'm ${name}, your personal DRIVE HUB assistant. You can ask me about vehicles, your account, subscriptions or website features. How can I help?`,
            "bot"
        );
        return;
    }

    history.forEach(item => {
        if (!item || !item.message) return;

        appendSupportMessage(
            item.message,
            item.role === "user" ? "user" : "bot"
        );
    });
}

function handleSupportForm(event) {
    event.preventDefault();

    const input = element("supportMessage");
    const sendButton = element("supportSendButton");
    const message = input?.value.trim();

    if (!message) return;

    const current = getAssistantAccount();

    if (!current) {
        showToast("Please login first to use your personal assistant.");
        closeModal("customerCareModal");
        openAccount();
        return;
    }

    const history = getAssistantConversation();

    history.push({
        role: "user",
        message,
        createdAt: new Date().toISOString()
    });

    const reply = getDriveHubAnswer(
        message,
        current.type,
        current.account
    );

    history.push({
        role: "assistant",
        message: reply,
        createdAt: new Date().toISOString()
    });

    saveAssistantConversation(history);

    renderAssistantConversation();

    if (input) input.value = "";
    if (sendButton) sendButton.disabled = false;
}

/* =========================================================
   22. LIVE SUBSCRIPTION COUNTDOWN
========================================================= */

function refreshSubscriptionCountdown() {
    const dealer = getCurrentDealer();
    const countdown = element("dealerSubscriptionCountdown");

    if (!dealer || !countdown) return;

    const expiry = subscriptionExpiryDate(dealer);

    if (!expiry || expiry.getTime() <= Date.now()) {
        countdown.textContent = expiry ? "Subscription expired" : "No active subscription";

        if (
            expiry &&
            normalizeStatus(dealer.subscriptionStatus) === "active"
        ) {
            updateAccountRecord("dealer", {
                ...dealer,
                subscriptionStatus: "expired"
            });
        }

        return;
    }

    countdown.textContent = subscriptionCountdown(dealer);
}

/* =========================================================
   23. STORAGE SYNCHRONIZATION
========================================================= */

window.addEventListener("storage", event => {
    const relevantKeys = [
        ...Object.values(KEYS),
        "dh_payments",
        "dh_settings"
    ];

    if (!event.key || relevantKeys.includes(event.key)) {
        updateDrawer();
        renderCars();
        renderDealers();

        if (element("dealerDashboardModal")?.classList.contains("active")) {
            const dealer = getCurrentDealer();

            if (dealer) {
                const section =
                    element("dealerDashboardContent")?.dataset.section || "listings";

                showDealerSection(section);
            }
        }

        if (element("buyerAreaModal")?.classList.contains("active")) {
            const buyer = getCurrentBuyer();

            if (buyer) {
                const section =
                    element("buyerAreaContent")?.dataset.section || "profile";

                showBuyerSection(section);
            }
        }
    }

    if (
        event.key &&
        event.key.startsWith("drivehub_assistant_chat_") &&
        element("customerCareModal")?.classList.contains("active")
    ) {
        renderAssistantConversation();
    }
});

/* =========================================================
   24. INITIALIZATION
========================================================= */

function initializeDriveHub() {
    initializeTheme();
    initializeCars();

    ensureLoggedInAssistant();

    element("menuToggle")?.addEventListener("click", openMenu);
    element("drawerBackdrop")?.addEventListener("click", closeMenu);

    document.querySelector(".drawer-close")?.addEventListener(
        "click",
        closeMenu
    );

    element("buyerForm")?.addEventListener("submit", handleBuyerForm);
    element("dealerAuthForm")?.addEventListener("submit", handleDealerAuth);
    element("supportChatForm")?.addEventListener("submit", handleSupportForm);

    [
        "searchInput",
        "makeFilter",
        "priceFilter",
        "yearFilter"
    ].forEach(id => {
        element(id)?.addEventListener("input", renderCars);
        element(id)?.addEventListener("change", renderCars);
    });

    element("searchBtn")?.addEventListener("click", renderCars);

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.classList.remove("active");
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();

            document.querySelectorAll(".modal.active").forEach(modal => {
                modal.classList.remove("active");
            });
        }
    });

    if (element("currentYear")) {
        element("currentYear").textContent = new Date().getFullYear();
    }

    updateDrawer();
    renderCars();
    loadPublicCars();
    renderDealers();
    addDealerProfileTab();

    refreshSubscriptionCountdown();

    // Update the visible subscription countdown every second.
    setInterval(refreshSubscriptionCountdown, 1000);

    console.log("DRIVE HUB homepage initialized successfully.");
}

/* =========================================================
   25. START APPLICATION
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDriveHub);
} else {
    initializeDriveHub();
}