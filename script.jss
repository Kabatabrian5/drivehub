/* =====================================================
   DRIVE HUB — COMPLETE MARKETPLACE JAVASCRIPT
   Local demonstration edition
   Existing storage keys preserved
===================================================== */

"use strict";

/* ================= STORAGE ================= */

const KEYS = {
    cars: "drivehub_cars_v2",
    buyers: "drivehub_buyers_v2",
    dealers: "drivehub_dealers_v2",
    buyer: "drivehub_current_buyer_v2",
    dealer: "drivehub_current_dealer_v2",
    favourites: "drivehub_favourites_v2",
    cart: "drivehub_cart_v2",
    bookings: "drivehub_bookings_v2"
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
    const modal = element(id);

    if (modal) {
        modal.classList.add("active");
    } else {
        console.warn("Modal not found:", id);
    }
}

function closeModal(id) {
    const modal = element(id);

    if (modal) {
        modal.classList.remove("active");
    }
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

/* ================= SAMPLE VEHICLES ================= */

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
    // Only create sample vehicles when the storage key does not exist.
    // This prevents deleted or intentionally empty inventories from resetting.
    if (localStorage.getItem(KEYS.cars) === null) {
        setData(KEYS.cars, sampleCars);
    }
}

function getCars() {
    const cars = getData(KEYS.cars, []);
    return Array.isArray(cars) ? cars : [];
}

/* ================= MENU ================= */

function openMenu() {
    element("sideMenu")?.classList.add("open");
    element("drawerBackdrop")?.classList.add("active");
}

function closeMenu() {
    element("sideMenu")?.classList.remove("open");
    element("sideMenu")?.classList.remove("active");
    element("drawerBackdrop")?.classList.remove("active");
}

function updateDrawer() {
    const buyer = getCurrentBuyer();
    const dealer = getCurrentDealer();
    const drawer = element("drawerUser");

    if (!drawer) return;

    if (dealer) {
        drawer.innerHTML =
            `Dealer account: <strong>${escapeHTML(dealer.business || dealer.owner || dealer.email)}</strong>`;
    } else if (buyer) {
        drawer.innerHTML =
            `Welcome, <strong>${escapeHTML(buyer.name || buyer.email)}</strong>`;
    } else {
        drawer.textContent = "Welcome to DRIVE HUB";
    }
}

/* ================= VEHICLE IMAGES ================= */

function carImages(car) {
    if (Array.isArray(car.images) && car.images.length) {
        return car.images;
    }

    if (car.image) return [car.image];

    return [
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80"
    ];
}

/* ================= VEHICLE SEARCH ================= */

function renderCars() {
    const grid = element("carGrid");
    if (!grid) return;

    const search = (element("searchInput")?.value || "").toLowerCase().trim();
    const make = element("makeFilter")?.value || "";
    const maxPrice = Number(element("priceFilter")?.value || 0);
    const minYear = Number(element("yearFilter")?.value || 0);
    const sort = element("sortFilter")?.value || "newest";

    let cars = getCars().filter(car => {
        const status = String(car.status || "approved").toLowerCase();

        if (!["approved", "available"].includes(status)) return false;

        const searchable = [
            car.make,
            car.model,
            car.location,
            car.year,
            car.transmission
        ].join(" ").toLowerCase();

        if (search && !searchable.includes(search)) return false;
        if (make && car.make !== make) return false;
        if (maxPrice && Number(car.price) > maxPrice) return false;
        if (minYear && Number(car.year) < minYear) return false;

        return true;
    });

    if (sort === "low") {
        cars.sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sort === "high") {
        cars.sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sort === "year") {
        cars.sort((a, b) => Number(b.year) - Number(a.year));
    }

    if (sort === "newest") {
        cars.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }

            return String(b.id).localeCompare(String(a.id));
        });
    }

    const favourites = getData(KEYS.favourites, []);

    grid.innerHTML = cars.map(car => {
        const image = carImages(car)[0];
        const favourite = favourites.includes(car.id);

        return `
            <article class="car-card">
                <div class="car-image">
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(car.make)} ${escapeHTML(car.model)}"
                        loading="lazy"
                    >

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
                        <button type="button" onclick="openDetails('${escapeHTML(car.id)}')">
                            Details
                        </button>

                        <button
                            type="button"
                            class="favorite-btn"
                            onclick="toggleFavourite('${escapeHTML(car.id)}')"
                        >
                            ${favourite ? "♥" : "♡"}
                        </button>

                        <button type="button" onclick="addToCart('${escapeHTML(car.id)}')">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    const count = element("inventoryCount");
    if (count) count.textContent = `${cars.length} vehicles found`;

    const empty = element("emptyState");
    if (empty) empty.style.display = cars.length ? "none" : "block";
}

/* ================= VEHICLE DETAILS ================= */

let currentGalleryCar = null;
let currentGalleryIndex = 0;

function openDetails(id) {
    const car = getCars().find(item => String(item.id) === String(id));

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
    const favourites = getData(KEYS.favourites, []);
    const isFavourite = favourites.includes(car.id);

    content.innerHTML = `
        <h2>${escapeHTML(car.make)} ${escapeHTML(car.model)}</h2>

        <div class="details-gallery">
            <img
                class="details-main-image"
                src="${escapeHTML(images[currentGalleryIndex])}"
                alt="${escapeHTML(car.model)}"
            >

            <div class="gallery-thumbnails">
                ${images.map((image, index) => `
                    <img
                        src="${escapeHTML(image)}"
                        class="${index === currentGalleryIndex ? "active" : ""}"
                        alt="Vehicle image ${index + 1}"
                        onclick="selectGallery(${index})"
                    >
                `).join("")}
            </div>
        </div>

        <h2 class="car-price">${money(car.price)}</h2>

        <div class="details-specs">
            <div class="spec-item"><small>Year</small><strong>${escapeHTML(car.year)}</strong></div>
            <div class="spec-item"><small>Mileage</small><strong>${Number(car.mileage || 0).toLocaleString()} km</strong></div>
            <div class="spec-item"><small>Engine</small><strong>${escapeHTML(car.engine || "N/A")}</strong></div>
            <div class="spec-item"><small>Fuel</small><strong>${escapeHTML(car.fuel || "N/A")}</strong></div>
            <div class="spec-item"><small>Transmission</small><strong>${escapeHTML(car.transmission || "N/A")}</strong></div>
            <div class="spec-item"><small>Condition</small><strong>${escapeHTML(car.condition || "N/A")}</strong></div>
            <div class="spec-item"><small>Location</small><strong>${escapeHTML(car.location || "Kenya")}</strong></div>
        </div>

        <h3>Vehicle Description</h3>

        <p class="muted">
            ${escapeHTML(car.description || "Contact the dealer for more information.")}
        </p>

        <div class="form-actions">
            <button type="button" class="btn btn-primary"
                onclick="bookViewing('${escapeHTML(car.id)}')">
                Book Viewing
            </button>

            <button type="button" class="btn btn-secondary"
                onclick="contactDealer('${escapeHTML(car.id)}')">
                WhatsApp Dealer
            </button>

            <button type="button" class="btn btn-secondary"
                onclick="toggleFavourite('${escapeHTML(car.id)}'); renderDetails();">
                ${isFavourite ? "♥ Saved" : "♡ Favourite"}
            </button>

            <button type="button" class="btn btn-secondary"
                onclick="addToCart('${escapeHTML(car.id)}')">
                Add to Cart
            </button>
        </div>
    `;
}

function selectGallery(index) {
    if (!currentGalleryCar) return;

    const images = carImages(currentGalleryCar);

    if (index < 0 || index >= images.length) return;

    currentGalleryIndex = index;
    renderDetails();
}

/* ================= BUYER ACCOUNTS ================= */

let accountMode = "login";

function openAccount() {
    setAccountMode("login");
    showModal("accountModal");
}

function setAccountMode(mode) {
    accountMode = mode;

    const title = element("accountTitle");
    const nameField = element("buyerNameField");
    const nameInput = element("buyerName");
    const loginTab = element("loginTab");
    const registerTab = element("registerTab");
    const submit = element("buyerSubmit");

    if (title) {
        title.textContent = mode === "login"
            ? "Buyer Login"
            : "Create Buyer Account";
    }

    if (nameField) {
        nameField.style.display = mode === "register" ? "block" : "none";
    }

    // Important: hidden required fields must not block login.
    if (nameInput) {
        nameInput.required = mode === "register";
    }

    if (loginTab) {
        loginTab.classList.toggle("active", mode === "login");
    }

    if (registerTab) {
        registerTab.classList.toggle("active", mode === "register");
    }

    if (submit) {
        submit.textContent = mode === "login" ? "Login" : "Register";
    }
}

function requireBuyer() {
    const buyer = getCurrentBuyer();

    if (buyer) return buyer;

    openAccount();
    showToast("Please login to your buyer account first.");

    return null;
}

function handleBuyerForm(event) {
    event.preventDefault();

    const email = element("buyerEmail")?.value.trim().toLowerCase();
    const password = element("buyerPassword")?.value;
    const name = element("buyerName")?.value.trim();

    if (!email || !password) {
        showToast("Enter your email and password.");
        return;
    }

    const buyers = getData(KEYS.buyers, []);

    if (accountMode === "register") {
        if (!name) {
            showToast("Enter your full name.");
            return;
        }

        if (password.length < 6) {
            showToast("Use a password with at least 6 characters.");
            return;
        }

        if (buyers.some(user =>
            String(user.email || "").toLowerCase() === email
        )) {
            showToast("An account with this email already exists.");
            return;
        }

        const buyer = {
            id: makeId("buyer"),
            name,
            username: name,
            email,
            phone: "",
            bio: "",
            profilePicture: "",
            password,
            createdAt: new Date().toISOString()
        };

        buyers.push(buyer);

        if (!setData(KEYS.buyers, buyers)) return;
        if (!setData(KEYS.buyer, buyer)) return;

        closeModal("accountModal");
        updateDrawer();

        showToast("Buyer account created successfully.");
        return;
    }

    const buyer = buyers.find(user =>
        String(user.email || "").toLowerCase() === email &&
        user.password === password
    );

    if (!buyer) {
        showToast("Incorrect email or password.");
        return;
    }

    if (!setData(KEYS.buyer, buyer)) return;

    closeModal("accountModal");
    updateDrawer();

    showToast("Welcome back.");
}

function openBuyerArea(section = "profile") {
    if (!requireBuyer()) return;

    showBuyerSection(section);
    showModal("buyerAreaModal");
}

function showBuyerSection(section) {
    const buyer = getCurrentBuyer();
    const content = element("buyerAreaContent");

    if (!buyer || !content) return;

    const favourites = getData(KEYS.favourites, []);
    const cart = getData(KEYS.cart, []);
    const bookings = getData(KEYS.bookings, []);

    if (element("buyerWelcome")) {
        element("buyerWelcome").textContent =
            `Welcome, ${buyer.username || buyer.name || buyer.email}`;
    }

    if (section === "profile") {
        content.innerHTML = `
            <div class="account-panel">
                <h3>My Buyer Profile</h3>

                <p><strong>Name:</strong> ${escapeHTML(buyer.name || "")}</p>
                <p><strong>Username:</strong> ${escapeHTML(buyer.username || buyer.name || "")}</p>
                <p><strong>Email:</strong> ${escapeHTML(buyer.email || "")}</p>
                <p><strong>Phone:</strong> ${escapeHTML(buyer.phone || "Not added")}</p>
                <p><strong>Bio:</strong> ${escapeHTML(buyer.bio || "No bio added yet.")}</p>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="editBuyerProfile()">
                        Edit Profile
                    </button>

                    <button type="button" class="btn btn-secondary" onclick="logoutBuyer()">
                        Logout
                    </button>
                </div>
            </div>
        `;
        return;
    }

    if (section === "favourites") {
        const cars = getCars().filter(car => favourites.includes(car.id));

        content.innerHTML = `
            <h3>My Favourite Vehicles</h3>

            ${cars.length ? cars.map(car => `
                <div class="dashboard-item">
                    <div>
                        <strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong>
                        <p>${money(car.price)}</p>
                    </div>

                    <button type="button" class="btn btn-secondary"
                        onclick="openDetails('${escapeHTML(car.id)}')">
                        View
                    </button>
                </div>
            `).join("") : "<p>No favourites saved yet.</p>"}
        `;
        return;
    }

    if (section === "cart") {
        const cars = cart
            .map(id => getCars().find(car => String(car.id) === String(id)))
            .filter(Boolean);

        content.innerHTML = `
            <h3>My Cart</h3>

            ${cars.length ? cars.map(car => `
                <div class="dashboard-item">
                    <div>
                        <strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong>
                        <p>${money(car.price)}</p>
                    </div>

                    <button type="button" class="btn btn-secondary"
                        onclick="removeCartItem('${escapeHTML(car.id)}')">
                        Remove
                    </button>
                </div>
            `).join("") : "<p>Your cart is empty.</p>"}
        `;
        return;
    }

    if (section === "bookings") {
        const myBookings = bookings.filter(item =>
            item.buyerEmail === buyer.email ||
            item.buyerId === buyer.id
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
        `;
    }
}

function editBuyerProfile() {
    const buyer = getCurrentBuyer();
    if (!buyer) return;

    const content = element("buyerAreaContent");
    if (!content) return;

    content.innerHTML = `
        <h3>Edit Buyer Profile</h3>

        <form id="buyerProfileForm">
            <div class="form-group">
                <label>Full Name</label>
                <input id="editBuyerName" value="${escapeHTML(buyer.name || "")}" required>
            </div>

            <div class="form-group">
                <label>Username</label>
                <input id="editBuyerUsername" value="${escapeHTML(buyer.username || "")}">
            </div>

            <div class="form-group">
                <label>Phone Number</label>
                <input id="editBuyerPhone" value="${escapeHTML(buyer.phone || "")}">
            </div>

            <div class="form-group">
                <label>Bio</label>
                <textarea id="editBuyerBio">${escapeHTML(buyer.bio || "")}</textarea>
            </div>

            <button class="btn btn-primary" type="submit">Save Profile</button>

            <button class="btn btn-secondary" type="button"
                onclick="showBuyerSection('profile')">
                Cancel
            </button>
        </form>
    `;

    element("buyerProfileForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const updated = {
            ...getCurrentBuyer(),
            name: element("editBuyerName").value.trim(),
            username: element("editBuyerUsername").value.trim(),
            phone: element("editBuyerPhone").value.trim(),
            bio: element("editBuyerBio").value.trim()
        };

        const buyers = getData(KEYS.buyers, []);
        const index = buyers.findIndex(item => item.id === updated.id);

        if (index !== -1) {
            buyers[index] = updated;
        }

        if (!setData(KEYS.buyers, buyers)) return;
        if (!setData(KEYS.buyer, updated)) return;

        updateDrawer();
        showBuyerSection("profile");

        showToast("Profile updated.");
    });
}

function logoutBuyer() {
    localStorage.removeItem(KEYS.buyer);

    closeModal("buyerAreaModal");
    updateDrawer();

    showToast("Buyer logged out.");
}

function toggleFavourite(id) {
    if (!requireBuyer()) return;

    let favourites = getData(KEYS.favourites, []);

    if (favourites.includes(id)) {
        favourites = favourites.filter(item => item !== id);
        showToast("Removed from favourites.");
    } else {
        favourites.push(id);
        showToast("Added to favourites.");
    }

    setData(KEYS.favourites, favourites);
    renderCars();
}

function addToCart(id) {
    if (!requireBuyer()) return;

    const car = getCars().find(item => String(item.id) === String(id));

    if (!car) {
        showToast("Vehicle not found.");
        return;
    }

    const cart = getData(KEYS.cart, []);

    if (cart.includes(id)) {
        showToast("Vehicle already in your cart.");
        return;
    }

    cart.push(id);

    if (!setData(KEYS.cart, cart)) return;

    showToast("Vehicle added to cart.");
}

function removeCartItem(id) {
    const cart = getData(KEYS.cart, [])
        .filter(item => String(item) !== String(id));

    if (!setData(KEYS.cart, cart)) return;

    showBuyerSection("cart");
    showToast("Vehicle removed from cart.");
}

/* ================= VIEWING BOOKINGS ================= */

function bookViewing(id) {
    const car = getCars().find(item => String(item.id) === String(id));

    if (!car) {
        showToast("Vehicle not found.");
        return;
    }

    if (element("bookingCarId")) {
        element("bookingCarId").value = id;
    }

    const buyer = getCurrentBuyer();

    if (buyer) {
        if (element("bookingName")) {
            element("bookingName").value = buyer.name || "";
        }

        if (element("bookingPhone")) {
            element("bookingPhone").value = buyer.phone || "";
        }
    }

    closeModal("detailsModal");
    showModal("bookingModal");
}

function handleBookingForm(event) {
    event.preventDefault();

    const id = element("bookingCarId")?.value;
    const car = getCars().find(item => String(item.id) === String(id));

    if (!car) {
        showToast("Vehicle not found.");
        return;
    }

    const buyer = getCurrentBuyer();

    const booking = {
        id: makeId("booking"),
        carId: id,
        carName: `${car.make} ${car.model}`,
        name: element("bookingName")?.value.trim(),
        phone: element("bookingPhone")?.value.trim(),
        date: element("bookingDate")?.value,
        time: element("bookingTime")?.value,
        message: element("bookingMessage")?.value.trim(),
        buyerId: buyer?.id || "",
        buyerEmail: buyer?.email || "",
        status: "Requested",
        createdAt: new Date().toISOString()
    };

    const bookings = getData(KEYS.bookings, []);
    bookings.push(booking);

    if (!setData(KEYS.bookings, bookings)) return;

    closeModal("bookingModal");
    element("bookingForm")?.reset();

    showToast("Viewing request saved.");

    if (car.phone) {
        const text =
            `Hello, I would like to book a viewing for ${car.make} ${car.model}. ` +
            `Date: ${booking.date}. Time: ${booking.time}. ` +
            `My name: ${booking.name}.`;

        window.open(
            `https://wa.me/${normalizePhone(car.phone)}?text=${encodeURIComponent(text)}`,
            "_blank",
            "noopener"
        );
    }
}

/* ================= DEALER ACCOUNTS ================= */

let dealerMode = "register";

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
        registerFields.style.display =
            mode === "register" ? "block" : "none";

        // Hidden registration fields must not block dealer login.
        registerFields.querySelectorAll("input, select, textarea").forEach(input => {
            if (input.dataset.originalRequired === undefined) {
                input.dataset.originalRequired = input.required ? "true" : "false";
            }

            input.required =
                mode === "register" &&
                input.dataset.originalRequired === "true";
        });
    }

    if (title) {
        title.textContent = mode === "register"
            ? "Dealer Registration"
            : "Dealer Login";
    }

    element("dealerLoginTab")?.classList.toggle("active", mode === "login");
    element("dealerRegisterTab")?.classList.toggle("active", mode === "register");

    if (form) {
        const submit = form.querySelector('button[type="submit"]');

        if (submit) {
            submit.textContent = mode === "register"
                ? "Create Dealer Account"
                : "Login";
        }
    }
}

function handleDealerAuth(event) {
    event.preventDefault();

    const email = element("dealerEmail")?.value.trim().toLowerCase();
    const password = element("dealerPassword")?.value;

    if (!email || !password) {
        showToast("Enter your email and password.");
        return;
    }

    const dealers = getData(KEYS.dealers, []);

    if (dealerMode === "register") {
        if (password.length < 6) {
            showToast("Use a password with at least 6 characters.");
            return;
        }

        if (dealers.some(dealer =>
            String(dealer.email || "").toLowerCase() === email
        )) {
            showToast("A dealer account with this email already exists.");
            return;
        }

        const dealer = {
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
            email,
            password,
            status: "pending",
            subscriptionStatus: "inactive",
            subscriptionExpiry: null,
            createdAt: new Date().toISOString()
        };

        if (!dealer.business || !dealer.owner || !dealer.phone) {
            showToast("Complete the business, owner and phone details.");
            return;
        }

        dealers.push(dealer);

        if (!setData(KEYS.dealers, dealers)) return;
        if (!setData(KEYS.dealer, dealer)) return;

        closeModal("dealerAuthModal");
        updateDrawer();

        showToast("Registration submitted. Await admin approval.");

        renderDealers();
        return;
    }

    const dealer = dealers.find(item =>
        String(item.email || "").toLowerCase() === email &&
        item.password === password
    );

    if (!dealer) {
        showToast("Incorrect dealer login details.");
        return;
    }

    if (dealer.status === "pending") {
        showToast("Your dealer registration is awaiting admin approval.");
        return;
    }

    if (dealer.status === "rejected") {
        showToast("Your dealer registration was not approved.");
        return;
    }

    if (!setData(KEYS.dealer, dealer)) return;

    closeModal("dealerAuthModal");
    updateDrawer();

    openDealerDashboard();

    showToast("Welcome back.");
}

/* ================= DEALER DASHBOARD ================= */

function openDealerDashboard() {
    const dealer = getCurrentDealer();

    if (!dealer) {
        openDealerAuth();
        showToast("Please login as a dealer.");
        return;
    }

    showDealerSection("listings");
    showModal("dealerDashboardModal");
}

function showDealerSection(section) {
    const content = element("dealerDashboardContent");
    const dealer = getCurrentDealer();

    if (!content || !dealer) return;

    const cars = getCars().filter(car =>
        String(car.dealerId) === String(dealer.id)
    );

    if (section === "listings") {
        content.innerHTML = `
            <h3>My Vehicle Listings</h3>

            <p class="muted">
                Your submitted vehicles are reviewed by DRIVE HUB before appearing publicly.
            </p>

            ${cars.length ? cars.map(car => `
                <div class="dashboard-item">
                    <div>
                        <strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong>
                        <p>${money(car.price)}</p>

                        <span class="status ${escapeHTML(String(car.status || "").toLowerCase())}">
                            ${escapeHTML(car.status || "Pending")}
                        </span>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary"
                            onclick="dealerToggleCarStatus('${escapeHTML(car.id)}')">
                            ${String(car.status).toLowerCase() === "sold" ? "Mark Available" : "Mark Sold"}
                        </button>

                        <button type="button" class="btn btn-secondary"
                            onclick="dealerDeleteCar('${escapeHTML(car.id)}')">
                            Delete
                        </button>
                    </div>
                </div>
            `).join("") : "<p>You have not submitted any vehicles yet.</p>"}

            <button type="button" class="btn btn-secondary" onclick="logoutDealer()">
                Logout
            </button>
        `;
        return;
    }

    if (section === "payments") {
        const payments = getData("dh_payments", []).filter(payment =>
            String(payment.dealerId) === String(dealer.id)
        );

        const expiry = dealer.subscriptionExpiry
            ? new Date(dealer.subscriptionExpiry)
            : null;

        const active = dealer.subscriptionStatus === "active" &&
            expiry && expiry.getTime() > Date.now();

        content.innerHTML = `
            <h3>My Subscriptions & Payments</h3>

            <div class="account-panel">
                <p><strong>Subscription:</strong>
                    ${active ? "Active" : "Inactive or expired"}
                </p>

                <p><strong>Expiry date:</strong>
                    ${expiry && !isNaN(expiry)
                        ? escapeHTML(expiry.toLocaleDateString("en-KE"))
                        : "Not available"}
                </p>

                <p class="muted">
                    Subscription payments and receipts recorded by the administrator
                    will appear here when the admin payment records are connected.
                </p>
            </div>

            <h3 style="margin-top:20px;">Payment History</h3>

            ${payments.length ? payments.map(payment => `
                <div class="dashboard-item">
                    <div>
                        <strong>${money(payment.amount)}</strong>
                        <p>${escapeHTML(payment.type || payment.paymentType || "Subscription")}</p>
                        <small>${escapeHTML(payment.date || payment.paymentDate || "")}</small>
                        <small>${escapeHTML(payment.method || payment.paymentMethod || "")}</small>
                    </div>

                    <span class="status">${escapeHTML(payment.status || "Recorded")}</span>
                </div>
            `).join("") : "<p>No payment records are available yet.</p>"}
        `;
        return;
    }

    if (section === "add") {
        const expiry = dealer.subscriptionExpiry
            ? new Date(dealer.subscriptionExpiry)
            : null;

        const subscriptionActive =
            dealer.subscriptionStatus === "active" &&
            expiry &&
            expiry.getTime() > Date.now();

        if (!subscriptionActive) {
            content.innerHTML = `
                <h3>Submit a Vehicle</h3>

                <div class="account-panel">
                    <h3>Subscription Required</h3>

                    <p>Your dealer subscription is not currently active.</p>

                    <p>
                        Activate or renew your subscription before submitting another vehicle.
                    </p>

                    <button type="button" class="btn btn-primary"
                        onclick="showDealerSection('payments')">
                        View Subscription
                    </button>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <h3>Submit a Vehicle</h3>

            <p class="muted">
                Your vehicle will be sent to the admin for approval before publication.
            </p>

            <form id="addVehicleForm">

                <div class="form-grid">
                    <div class="form-group">
                        <label>Make</label>
                        <input id="newMake" required>
                    </div>

                    <div class="form-group">
                        <label>Model</label>
                        <input id="newModel" required>
                    </div>

                    <div class="form-group">
                        <label>Year</label>
                        <input id="newYear" type="number" min="1950" max="2035" required>
                    </div>

                    <div class="form-group">
                        <label>Price (KSh)</label>
                        <input id="newPrice" type="number" min="1" required>
                    </div>

                    <div class="form-group">
                        <label>Mileage (km)</label>
                        <input id="newMileage" type="number" min="0">
                    </div>

                    <div class="form-group">
                        <label>Engine</label>
                        <input id="newEngine">
                    </div>

                    <div class="form-group">
                        <label>Fuel</label>
                        <select id="newFuel">
                            <option>Petrol</option>
                            <option>Diesel</option>
                            <option>Hybrid</option>
                            <option>Electric</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Transmission</label>
                        <select id="newTransmission">
                            <option>Automatic</option>
                            <option>Manual</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Condition</label>
                        <select id="newCondition">
                            <option>Foreign Used</option>
                            <option>Locally Used</option>
                            <option>Brand New</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Location</label>
                        <input id="newLocation" required>
                    </div>

                    <div class="form-group">
                        <label>WhatsApp Number</label>
                        <input id="newWhatsApp" placeholder="2547XXXXXXXX">
                    </div>

                    <div class="form-group">
                        <label>Vehicle Images (up to 8)</label>
                        <input id="newImages" type="file" accept="image/*" multiple required>
                    </div>
                </div>

                <div class="form-group">
                    <label>Description</label>
                    <textarea id="newDescription" rows="4"></textarea>
                </div>

                <button class="btn btn-primary" type="submit">
                    Submit Vehicle for Approval
                </button>
            </form>
        `;

        element("addVehicleForm")?.addEventListener("submit", submitVehicle);
    }
}

/* ================= DEALER VEHICLE MANAGEMENT ================= */

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

    const currentStatus = String(cars[index].status || "").toLowerCase();

    if (currentStatus === "pending") {
        showToast("This vehicle is awaiting admin approval.");
        return;
    }

    if (currentStatus === "rejected") {
        showToast("This vehicle was rejected by the administrator.");
        return;
    }

    cars[index].status = currentStatus === "sold" ? "approved" : "sold";
    cars[index].updatedAt = new Date().toISOString();

    if (!setData(KEYS.cars, cars)) return;

    showDealerSection("listings");
    renderCars();

    showToast("Vehicle status updated.");
}

function dealerDeleteCar(id) {
    const dealer = getCurrentDealer();

    if (!dealer) return;

    const confirmed = confirm("Are you sure you want to delete this vehicle listing?");
    if (!confirmed) return;

    const cars = getCars();

    const updatedCars = cars.filter(car =>
        !(
            String(car.id) === String(id) &&
            String(car.dealerId) === String(dealer.id)
        )
    );

    if (updatedCars.length === cars.length) {
        showToast("Vehicle not found.");
        return;
    }

    if (!setData(KEYS.cars, updatedCars)) return;

    showDealerSection("listings");
    renderCars();

    showToast("Your vehicle listing was deleted.");
}

/* ================= VEHICLE SUBMISSION ================= */

async function submitVehicle(event) {
    event.preventDefault();

    const dealer = getCurrentDealer();

    if (!dealer) {
        showToast("Please login as a dealer.");
        return;
    }

    const expiry = dealer.subscriptionExpiry
        ? new Date(dealer.subscriptionExpiry)
        : null;

    const subscriptionActive =
        dealer.subscriptionStatus === "active" &&
        expiry &&
        expiry.getTime() > Date.now();

    if (!subscriptionActive) {
        showToast("An active subscription is required to submit vehicles.");
        showDealerSection("payments");
        return;
    }

    const fileInput = element("newImages");
    const files = Array.from(fileInput?.files || []);

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

    try {
        const images = await Promise.all(files.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error("Image could not be read."));

                reader.readAsDataURL(file);
            });
        }));

        const car = {
            id: makeId("car"),
            make: element("newMake").value.trim(),
            model: element("newModel").value.trim(),
            year: Number(element("newYear").value),
            price: Number(element("newPrice").value),
            mileage: Number(element("newMileage").value || 0),
            engine: element("newEngine").value.trim(),
            fuel: element("newFuel").value,
            transmission: element("newTransmission").value,
            condition: element("newCondition").value,
            location: element("newLocation").value.trim(),
            phone: element("newWhatsApp").value.trim() || dealer.whatsapp,
            description: element("newDescription").value.trim(),
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
        console.error("Vehicle submission error:", error);
        showToast("Could not process vehicle images.");
    }
}

function logoutDealer() {
    localStorage.removeItem(KEYS.dealer);

    closeModal("dealerDashboardModal");
    updateDrawer();

    showToast("Dealer logged out.");
}

/* ================= DEALER DIRECTORY ================= */

function renderDealers() {
    const grid = element("dealerGrid");
    if (!grid) return;

    const dealers = getData(KEYS.dealers, [])
        .filter(dealer => dealer.status === "approved");

    grid.innerHTML = dealers.length
        ? dealers.map(dealer => `
            <div class="dealer-card">
                <h3>${escapeHTML(dealer.business)}</h3>

                <p>${escapeHTML(dealer.location || "Kenya")}</p>

                <p>${escapeHTML(dealer.description || "Vehicle dealer")}</p>

                <button type="button" class="btn btn-secondary"
                    onclick="viewDealerCars('${escapeHTML(dealer.id)}')">
                    View Vehicles
                </button>
            </div>
        `).join("")
        : "<p class='muted'>Dealer listings will appear here.</p>";
}

function viewDealerCars(id) {
    const cars = getCars().filter(car =>
        String(car.dealerId) === String(id) &&
        ["approved", "available"].includes(
            String(car.status || "").toLowerCase()
        )
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
                <img
                    src="${escapeHTML(carImages(car)[0])}"
                    alt="${escapeHTML(car.model)}"
                    loading="lazy"
                >
            </div>

            <div class="car-card-content">
                <h3>${escapeHTML(car.make)} ${escapeHTML(car.model)}</h3>

                <div class="car-price">${money(car.price)}</div>

                <button type="button" class="btn btn-primary"
                    onclick="openDetails('${escapeHTML(car.id)}')">
                    View Details
                </button>
            </div>
        </article>
    `).join("");

    const count = element("inventoryCount");
    if (count) count.textContent = `${cars.length} vehicles from this dealer`;

    const empty = element("emptyState");
    if (empty) empty.style.display = "none";

    element("cars")?.scrollIntoView({ behavior: "smooth" });
}

/* ================= DEALER WHATSAPP ================= */

function contactDealer(id) {
    const car = getCars().find(item => String(item.id) === String(id));

    if (!car || !car.phone) {
        showToast("Dealer WhatsApp number is not available.");
        return;
    }

    const phone = normalizePhone(car.phone);

    if (!phone) {
        showToast("Dealer WhatsApp number is invalid.");
        return;
    }

    const message =
        `Hello, I found your ${car.make} ${car.model} on DRIVE HUB. Is it still available?`;

    window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener"
    );
}

/* ================= CUSTOMER CARE BOT ================= */

function openCustomerCare() {
    showModal("customerCareModal");
    element("supportMessage")?.focus();
}

function appendSupportMessage(message, type) {
    const chat = element("supportChat");
    if (!chat) return;

    const bubble = document.createElement("div");

    bubble.className = `chat-message ${type}`;
    bubble.textContent = message;

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
}

function customerCareReply(message) {
    const text = message.toLowerCase();

    if (text.includes("hello") || text.includes("hi")) {
        return "Hello! Welcome to DRIVE HUB. I can help you with vehicle searches, accounts, dealer registration, bookings and subscriptions.";
    }

    if (text.includes("search") || text.includes("find") || text.includes("car")) {
        return "Open Browse Cars and use the search box and filters to narrow down make, price and year. Open a listing to view its details.";
    }

    if (text.includes("dealer") || text.includes("register")) {
        return "Dealers can use Dealer Registration in the menu. Submit your business details and wait for admin approval.";
    }

    if (text.includes("booking") || text.includes("viewing")) {
        return "Open a vehicle listing and select Book Viewing. Enter your contact details and preferred date and time.";
    }

    if (text.includes("whatsapp") || text.includes("contact")) {
        return "Open the vehicle details and select WhatsApp Dealer if a dealer contact number is available.";
    }

    if (text.includes("favourite")) {
        return "Login to your buyer account, then tap the heart button on any vehicle to save it to your favourites.";
    }

    if (text.includes("cart")) {
        return "Login first, then select Add to Cart on a vehicle listing. You can view your saved vehicles under My Cart.";
    }

    if (text.includes("subscription") || text.includes("renew") || text.includes("expiry")) {
        return "Dealers can open Dealer Dashboard and select Payments to view subscription information and payment records.";
    }

    if (text.includes("receipt")) {
        return "Subscription receipts recorded by the DRIVE HUB administrator will appear in the dealer payment area once the payment records are connected.";
    }

    if (text.includes("payment") || text.includes("pay")) {
        return "Only use payment instructions officially provided by DRIVE HUB. This local demonstration does not process or verify payments.";
    }

    if (text.includes("account") || text.includes("login")) {
        return "Choose My Account in the header or Buyer Account in the menu to register or login.";
    }

    return "I can help with searching vehicles, buyer accounts, dealer registration, subscriptions, viewing bookings and contacting dealers. Please tell me which one you need help with.";
}

function handleSupportForm(event) {
    event.preventDefault();

    const input = element("supportMessage");
    const message = input?.value.trim();

    if (!message) return;

    appendSupportMessage(message, "user");
    input.value = "";

    setTimeout(() => {
        appendSupportMessage(customerCareReply(message), "bot");
    }, 300);
}

/* ================= STORAGE SYNCHRONIZATION ================= */

window.addEventListener("storage", event => {
    if (
        !event.key ||
        Object.values(KEYS).includes(event.key) ||
        event.key === "dh_payments" ||
        event.key === "dh_settings"
    ) {
        renderCars();
        renderDealers();

        if (element("dealerDashboardModal")?.classList.contains("active")) {
            const dealer = getCurrentDealer();

            if (dealer) {
                showDealerSection("listings");
            }
        }
    }
});

/* ================= INITIALIZATION ================= */

function initializeDriveHub() {
    initializeCars();

    // Hamburger menu
    element("menuToggle")?.addEventListener("click", openMenu);

    // Close menu when backdrop or close control is clicked
    element("drawerBackdrop")?.addEventListener("click", closeMenu);
    element("drawerClose")?.addEventListener("click", closeMenu);

    document.querySelector(".drawer-close")?.addEventListener("click", closeMenu);

    // Main forms
    element("buyerForm")?.addEventListener("submit", handleBuyerForm);
    element("bookingForm")?.addEventListener("submit", handleBookingForm);
    element("dealerAuthForm")?.addEventListener("submit", handleDealerAuth);
    element("supportChatForm")?.addEventListener("submit", handleSupportForm);

    // Search and filters
    [
        "searchInput",
        "makeFilter",
        "priceFilter",
        "yearFilter",
        "sortFilter"
    ].forEach(id => {
        element(id)?.addEventListener("input", renderCars);
        element(id)?.addEventListener("change", renderCars);
    });

    element("searchBtn")?.addEventListener("click", renderCars);

    // Close modal when clicking outside its content
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.classList.remove("active");
            }
        });
    });

    // Escape key closes open menus and modals
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();

            document.querySelectorAll(".modal.active").forEach(modal => {
                modal.classList.remove("active");
            });
        }
    });

    // Current year
    const year = element("currentYear");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    // Initial page rendering
    updateDrawer();
    renderCars();
    renderDealers();

    console.log("DRIVE HUB homepage initialized successfully.");
}

/* ================= START APPLICATION ================= */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDriveHub);
} else {
    initializeDriveHub();
}