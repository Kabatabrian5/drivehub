
/* ==========================================
   DRIVE HUB CEO CONTROL ROOM
   Connected LocalStorage Edition
   Updated: Dealer Management + Manual Receipts
========================================== */

"use strict";

const $ = id => document.getElementById(id);

/* ==========================================
   SHARED MARKETPLACE STORAGE
========================================== */

const KEYS = {
  dealers: "drivehub_dealers_v2",
  cars: "drivehub_cars_v2",
  bookings: "drivehub_bookings_v2",
  buyers: "drivehub_buyers_v2",
  payments: "dh_payments",
  settings: "dh_settings"
};

const OLD_KEYS = {
  dealers: "dh_dealers",
  cars: "dh_cars",
  bookings: "dh_bookings",
  buyers: "dh_buyers"
};

function getData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    toast("Storage is full. Reduce image sizes or remove some images.");
    return false;
  }
}

function migrateOldData() {
  Object.keys(OLD_KEYS).forEach(type => {
    const newKey = KEYS[type];
    const oldKey = OLD_KEYS[type];

    const current = getData(newKey, null);
    const previous = getData(oldKey, []);

    if (
      (current === null || !Array.isArray(current) || current.length === 0) &&
      Array.isArray(previous) &&
      previous.length > 0
    ) {
      setData(newKey, previous);
    }
  });
}

migrateOldData();

let dealers = getData(KEYS.dealers, []);
let cars = getData(KEYS.cars, []);
let bookings = getData(KEYS.bookings, []);
let buyers = getData(KEYS.buyers, []);
let payments = getData(KEYS.payments, []);

let settings = getData(KEYS.settings, {
  listingFee: 1000,
  monthlyFee: 5000,
  weeklyFee: 0,
  paybillNumber: "",
  paymentReference: "DRIVEHUB"
});

let selectedImages = [];
let extractedVehicle = null;

const uid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "dh_" + Date.now() + "_" +
    Math.random().toString(36).slice(2);
};

/* ==========================================
   GENERAL HELPERS
========================================== */

function money(amount) {
  return "KSh " + Number(amount || 0).toLocaleString("en-KE");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function getDealerName(dealer) {
  return dealer?.business ||
    dealer?.name ||
    dealer?.owner ||
    "Unnamed Dealer";
}

function getDealerPhone(dealer) {
  return dealer?.phone ||
    dealer?.contact ||
    dealer?.whatsapp ||
    "Not supplied";
}

function getDealerEmail(dealer) {
  return dealer?.email || "Not supplied";
}

function isSubscriptionActive(dealer) {
  if (!dealer || dealer.subscriptionStatus !== "active") {
    return false;
  }

  if (!dealer.subscriptionExpiry) {
    return false;
  }

  return new Date(dealer.subscriptionExpiry).getTime() >= Date.now();
}

function toast(message) {
  const element = $("toast");

  if (!element) {
    console.log(message);
    return;
  }

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 3000);
}

function refreshData() {
  dealers = getData(KEYS.dealers, []);
  const databaseCars = window.driveHubDatabase?.getCachedVehicles?.();
  cars = Array.isArray(databaseCars)
    ? databaseCars
    : getData(KEYS.cars, []);
  bookings = getData(KEYS.bookings, []);
  buyers = getData(KEYS.buyers, []);
  payments = getData(KEYS.payments, []);
  settings = getData(KEYS.settings, settings);

  if (!Array.isArray(dealers)) dealers = [];
  if (!Array.isArray(cars)) cars = [];
  if (!Array.isArray(bookings)) bookings = [];
  if (!Array.isArray(buyers)) buyers = [];
  if (!Array.isArray(payments)) payments = [];
}

function statusBadge(status) {
  const safe = String(status || "pending").toLowerCase();

  return `<span class="status ${escapeHTML(safe)}">${escapeHTML(safe.toUpperCase())}</span>`;
}

function saveCars() {
  if (setData(KEYS.cars, cars)) {
    renderAll();
    return true;
  }

  return false;
}

/* ==========================================
   NAVIGATION
========================================== */

const pageNames = {
  overview: "Overview",
  dealers: "Dealers",
  vehicles: "Vehicle Listings",
  fees: "Fees & Subscriptions",
  payments: "Payments & Receipts",
  bookings: "Viewing Bookings",
  assistant: "Admin Assistant"
};

function openPage(page) {
  if (!pageNames[page]) return;

  document.querySelectorAll(".page").forEach(item => {
    item.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  const targetPage = $(page + "Page");

  if (!targetPage) {
    toast("Page not found: " + page);
    return;
  }

  targetPage.classList.add("active");

  const button = document.querySelector(`[data-page="${page}"]`);

  if (button) button.classList.add("active");

  if ($("pageTitle")) {
    $("pageTitle").textContent = pageNames[page];
  }

  if ($("sidebar")) {
    $("sidebar").classList.remove("open");
  }

  refreshData();
  renderAll();
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.onclick = () => openPage(button.dataset.page);
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.onclick = () => openPage(button.dataset.goto);
});

if ($("menuToggle")) {
  $("menuToggle").onclick = () => {
    $("sidebar")?.classList.toggle("open");
  };
}

/* ==========================================
   OVERVIEW
========================================== */

function renderOverview() {
  const pendingDealers = dealers.filter(d =>
    d.status === "pending"
  );

  const pendingCars = cars.filter(c =>
    c.status === "pending"
  );

  const approvedCars = cars.filter(c =>
    c.status === "approved" ||
    c.status === "available"
  );

  const revenue = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const activeSubscriptions = dealers.filter(isSubscriptionActive);

  if ($("totalDealers")) {
    $("totalDealers").textContent = dealers.length;
  }

  if ($("totalVehicles")) {
    $("totalVehicles").textContent = approvedCars.length;
  }

  if ($("pendingApprovals")) {
    $("pendingApprovals").textContent =
      pendingDealers.length + pendingCars.length;
  }

  if ($("totalBookings")) {
    $("totalBookings").textContent = bookings.length;
  }

  if ($("dashboardRevenue")) {
    $("dashboardRevenue").textContent = money(revenue);
  }

  if ($("activeSubscriptions")) {
    $("activeSubscriptions").textContent =
      activeSubscriptions.length;
  }

  if ($("newDealerCount")) {
    $("newDealerCount").textContent = pendingDealers.length;
  }

  if ($("pendingVehicleCount")) {
    $("pendingVehicleCount").textContent = pendingCars.length;
  }

  if ($("recentDealers")) {
    $("recentDealers").innerHTML = dealers.length
      ? [...dealers].reverse().slice(0, 5).map(d => `
        <div class="data-item">
          <div>
            <strong>${escapeHTML(getDealerName(d))}</strong>
            <small>${escapeHTML(d.email || "")}</small>
          </div>
          ${statusBadge(d.status)}
        </div>
      `).join("")
      : "<p class='muted'>No dealers registered yet.</p>";
  }

  if ($("recentVehicles")) {
    $("recentVehicles").innerHTML = pendingCars.length
      ? pendingCars.slice(0, 5).map(car => `
        <div class="data-item">
          <div>
            <strong>${escapeHTML(car.make)} ${escapeHTML(car.model)}</strong>
            <small>${money(car.price)}</small>
          </div>
          ${statusBadge("pending")}
        </div>
      `).join("")
      : "<p class='muted'>No pending vehicles.</p>";
  }
}

/* ==========================================
   DEALER MANAGEMENT
========================================== */

function renderDealers() {
  if (!$("dealersTable")) return;

  const query = ($("dealerSearch")?.value || "")
    .toLowerCase()
    .trim();

  const filter = $("dealerFilter")?.value || "all";

  if ($("allDealerCount")) {
    $("allDealerCount").textContent = dealers.length;
  }

  if ($("approvedDealerCount")) {
    $("approvedDealerCount").textContent =
      dealers.filter(d => d.status === "approved").length;
  }

  if ($("pendingDealerCount")) {
    $("pendingDealerCount").textContent =
      dealers.filter(d => d.status === "pending").length;
  }

  if ($("rejectedDealerCount")) {
    $("rejectedDealerCount").textContent =
      dealers.filter(d => d.status === "rejected").length;
  }

  const filtered = dealers.filter(d => {
    const searchable = `
      ${getDealerName(d)}
      ${d.owner || ""}
      ${d.email || ""}
      ${d.phone || ""}
      ${d.contact || ""}
      ${d.location || ""}
    `.toLowerCase();

    return searchable.includes(query) &&
      (filter === "all" || d.status === filter);
  });

  $("dealersTable").innerHTML = filtered.length
    ? filtered.map(d => `
      <tr>
        <td>
          <strong>${escapeHTML(getDealerName(d))}</strong>
          <br><small>${escapeHTML(d.id)}</small>
        </td>

        <td>
          ${escapeHTML(d.owner || getDealerPhone(d))}
          <br>${escapeHTML(getDealerPhone(d))}
        </td>

        <td>${escapeHTML(d.email || "")}</td>

        <td>${statusBadge(d.status)}</td>

        <td>
          <div class="action-group">

            ${(d.status === "pending" || d.status === "rejected") ? `
              <button class="small-btn approve"
                onclick="updateDealer('${escapeHTML(d.id)}','approved')">
                Approve
              </button>
            ` : ""}

            ${(d.status === "pending" || d.status === "approved") ? `
              <button class="small-btn reject"
                onclick="updateDealer('${escapeHTML(d.id)}','rejected')">
                Reject
              </button>
            ` : ""}

            ${d.status === "approved" ? `
              <button class="small-btn reject"
                onclick="removeDealer('${escapeHTML(d.id)}')">
                Remove
              </button>
            ` : ""}

            ${d.status === "removed" ? `
              <button class="small-btn approve"
                onclick="updateDealer('${escapeHTML(d.id)}','approved')">
                Restore
              </button>
            ` : ""}

            <button class="small-btn gold"
              onclick="showDealerDetails('${escapeHTML(d.id)}')">
              Details
            </button>

          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="5">No dealers found.</td></tr>`;
}

function updateDealer(id, status) {
  refreshData();

  const dealer = dealers.find(d =>
    String(d.id) === String(id)
  );

  if (!dealer) {
    return toast("Dealer not found.");
  }

  if (!["approved", "rejected", "pending"].includes(status)) {
    return toast("Invalid dealer status.");
  }

  if (status === "approved") {
    const confirmed = confirm(
      "Approve " + getDealerName(dealer) + "?"
    );

    if (!confirmed) return;

    dealer.approvedAt = new Date().toISOString();
  }

  if (status === "rejected") {
    const confirmed = confirm(
      "Reject " + getDealerName(dealer) + "?"
    );

    if (!confirmed) return;
  }

  dealer.status = status;
  dealer.updatedAt = new Date().toISOString();

  if (!setData(KEYS.dealers, dealers)) return;

  toast("Dealer " + status + ".");
  renderAll();
}

function removeDealer(id) {
  refreshData();

  const dealer = dealers.find(d =>
    String(d.id) === String(id)
  );

  if (!dealer) {
    return toast("Dealer not found.");
  }

  if (dealer.status !== "approved") {
    return toast("Only approved dealers can be removed here.");
  }

  const confirmed = confirm(
    "Remove " + getDealerName(dealer) +
    " from DRIVE HUB?\n\n" +
    "The dealer account will be disabled. " +
    "Their vehicles and payment history will be preserved."
  );

  if (!confirmed) return;

  dealer.status = "removed";
  dealer.removedAt = new Date().toISOString();
  dealer.updatedAt = new Date().toISOString();

  if (!setData(KEYS.dealers, dealers)) return;

  toast("Dealer removed from DRIVE HUB.");
  renderAll();
}

function showDealerDetails(id) {
  refreshData();

  const dealer = dealers.find(d =>
    String(d.id) === String(id)
  );

  if (!dealer) return;

  const dealerCars = cars.filter(c =>
    String(c.dealerId) === String(id)
  );

  const dealerPayments = payments.filter(p =>
    String(p.dealerId) === String(id)
  );

  const total = dealerPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const subscription = isSubscriptionActive(dealer)
    ? "ACTIVE"
    : "INACTIVE / EXPIRED";

  alert(
    "DRIVE HUB DEALER PROFILE\n\n" +
    "Business: " + getDealerName(dealer) +
    "\nOwner: " + (dealer.owner || "Not supplied") +
    "\nEmail: " + (dealer.email || "Not supplied") +
    "\nPhone: " + getDealerPhone(dealer) +
    "\nLocation: " + (dealer.location || "Not supplied") +
    "\nStatus: " + (dealer.status || "pending") +
    "\nVehicles: " + dealerCars.length +
    "\nRecorded payments: " + money(total) +
    "\nSubscription: " + subscription +
    "\nExpiry: " + (dealer.subscriptionExpiry || "Not recorded")
  );
}

if ($("dealerSearch")) {
  $("dealerSearch").addEventListener("input", renderDealers);
}

if ($("dealerFilter")) {
  $("dealerFilter").addEventListener("change", renderDealers);
}

/* ==========================================
   VEHICLE MANAGEMENT
========================================== */

function renderVehicles() {
  if (!$("vehicleList")) return;

  const query = ($("vehicleSearch")?.value || "")
    .toLowerCase()
    .trim();

  const filter = $("vehicleFilter")?.value || "all";

  const filtered = cars.filter(car => {
    const dealer = dealers.find(d =>
      String(d.id) === String(car.dealerId)
    );

    const searchable = `
      ${car.make || ""}
      ${car.model || ""}
      ${getDealerName(dealer)}
      ${car.location || ""}
    `.toLowerCase();

    return searchable.includes(query) &&
      (filter === "all" || car.status === filter);
  });

  $("vehicleList").innerHTML = filtered.length
    ? filtered.map(car => {
      const dealer = dealers.find(d =>
        String(d.id) === String(car.dealerId)
      );

      const images = Array.isArray(car.images)
        ? car.images
        : [];

      const image = images[0] || car.image || "";

      return `
        <article class="vehicle-card">

          <img src="${escapeHTML(image)}"
            alt="Vehicle photo"
            onerror="this.style.display='none'">

          <div class="vehicle-card-content">

            ${statusBadge(car.status)}

            <h3>
              ${escapeHTML(car.make)} ${escapeHTML(car.model)}
            </h3>

            <p>Year: ${escapeHTML(car.year || "N/A")}</p>
            <p>Price: ${money(car.price)}</p>

            <p>
              Dealer:
              ${escapeHTML(
                dealer ? getDealerName(dealer) : "Admin listing"
              )}
            </p>

            <p>Location: ${escapeHTML(car.location || "N/A")}</p>
            <p>Photos: ${images.length || (car.image ? 1 : 0)}</p>

            <div class="action-group">

              ${car.status === "pending" ? `
                <button class="small-btn approve"
                  onclick="updateCar('${escapeHTML(car.id)}','approved')">
                  Approve
                </button>
              ` : ""}

              ${car.status === "rejected" ? `
                <button class="small-btn approve"
                  onclick="updateCar('${escapeHTML(car.id)}','approved')">
                  Reapprove
                </button>
              ` : ""}

              ${car.status !== "sold" ? `
                <button class="small-btn gold"
                  onclick="updateCar('${escapeHTML(car.id)}','sold')">
                  Mark Sold
                </button>
              ` : `
                <button class="small-btn approve"
                  onclick="updateCar('${escapeHTML(car.id)}','approved')">
                  Available
                </button>
              `}

              <button class="small-btn"
                onclick="editCar('${escapeHTML(car.id)}')">
                Edit
              </button>

              <button class="small-btn reject"
                onclick="deleteCar('${escapeHTML(car.id)}')">
                Delete
              </button>

            </div>
          </div>
        </article>
      `;
    }).join("")
    : "<p class='muted'>No vehicles found.</p>";
}

function updateCar(id, status) {
  refreshData();

  const car = cars.find(c =>
    String(c.id) === String(id)
  );

  if (!car) return toast("Vehicle not found.");

  const dealer = dealers.find(d =>
    String(d.id) === String(car.dealerId)
  );

  if (
    status === "approved" &&
    car.dealerId &&
    (!dealer || dealer.status !== "approved")
  ) {
    return toast("Approve the dealer before approving this vehicle.");
  }

  if (!["approved", "available", "sold", "rejected", "pending"].includes(status)) {
    return toast("Invalid vehicle status.");
  }

  if (window.driveHubDatabase?.isEnabled()) {
    window.driveHubDatabase.updateVehicle(id, { status })
      .then(async () => {
        window.setAdminVehicles(
          await window.driveHubDatabase.listVehicles()
        );
        toast("Vehicle updated: " + status);
      })
      .catch(error => {
        console.error("Could not update vehicle in Neon:", error);
        toast(error.message || "Could not update vehicle in Neon.");
      });
    return;
  }

  car.status = status;
  car.updatedAt = new Date().toISOString();

  if (!saveCars()) return;

  toast("Vehicle updated: " + status);
}

async function deleteCar(id) {
  if (!confirm("Permanently delete this vehicle listing?")) {
    return;
  }

  refreshData();

  if (window.driveHubDatabase?.isEnabled()) {
    try {
      await window.driveHubDatabase.deleteVehicle(id);
      window.setAdminVehicles(
        await window.driveHubDatabase.listVehicles()
      );
      toast("Vehicle deleted.");
    } catch (error) {
      console.error("Could not delete vehicle from Neon:", error);
      toast(error.message || "Could not delete vehicle from Neon.");
    }
    return;
  }

  cars = cars.filter(c =>
    String(c.id) !== String(id)
  );

  if (!saveCars()) return;

  toast("Vehicle deleted.");
}

if ($("vehicleSearch")) {
  $("vehicleSearch").addEventListener("input", renderVehicles);
}

if ($("vehicleFilter")) {
  $("vehicleFilter").addEventListener("change", renderVehicles);
}

/* ==========================================
   ADD AND EDIT VEHICLES
========================================== */

function loadDealerOptions(selectedId = "") {
  if (!$("carDealer")) return;

  const options = [
    `<option value="">Admin / Direct Listing</option>`,

    ...dealers
      .filter(d => d.status === "approved")
      .map(d => `
        <option value="${escapeHTML(d.id)}"
          ${String(d.id) === String(selectedId) ? "selected" : ""}>
          ${escapeHTML(getDealerName(d))}
        </option>
      `)
  ];

  $("carDealer").innerHTML = options.join("");
}

function openCarModal(car = null) {
  refreshData();

  if (!$("carForm")) return;

  $("carForm").reset();
  selectedImages = [];

  $("carId").value = car?.id || "";

  $("carModalTitle").textContent =
    car ? "Edit Vehicle" : "Add Vehicle";

  $("carMake").value = car?.make || "";
  $("carModel").value = car?.model || "";
  $("carYear").value = car?.year || "";
  $("carPrice").value = car?.price || "";
  $("carLocation").value = car?.location || "";
  $("carTransmission").value =
    car?.transmission || "Automatic";

  $("carFuel").value = car?.fuel || "Petrol";
  $("carMileage").value = car?.mileage || "";
  $("carDescriptionInput").value =
    car?.description || "";

  $("carStatus").value = car?.status || "approved";
  $("carPhone").value = car?.phone || "";
  $("carTikTokUrl").value = car?.tiktokUrl || "";

  selectedImages = Array.isArray(car?.images)
    ? [...car.images]
    : (car?.image ? [car.image] : []);
  $("carImageUrls").value = selectedImages.join("\n");

  loadDealerOptions(car?.dealerId || "");
  renderImagePreview();

  $("carModal").classList.add("show");
}

function editCar(id) {
  refreshData();

  const car = cars.find(c =>
    String(c.id) === String(id)
  );

  if (car) openCarModal(car);
}

if ($("addCarBtn")) {
  $("addCarBtn").onclick = () => openCarModal();
}

if ($("closeCar")) {
  $("closeCar").onclick = () => {
    $("carModal")?.classList.remove("show");
  };
}

if ($("carModal")) {
  $("carModal").addEventListener("click", event => {
    if (event.target === $("carModal")) {
      $("carModal").classList.remove("show");
    }
  });
}

function renderImagePreview() {
  if (!$("carImagePreview")) return;

  $("carImagePreview").innerHTML =
    selectedImages.map((src, index) => `
      <div class="image-thumb">
        <img src="${escapeHTML(src)}" alt="Vehicle image">

        <button type="button"
          class="small-btn reject"
          onclick="removeCarImage(${index})">
          Remove
        </button>
      </div>
    `).join("");
}

function removeCarImage(index) {
  selectedImages.splice(index, 1);
  $("carImageUrls").value = selectedImages.join("\n");
  renderImagePreview();
}

function parseVehicleImageUrls(value) {
  const urls = String(value || "")
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

  if (urls.length > 8) {
    throw new Error("Add no more than 8 image URLs.");
  }

  return urls.map(value => {
    let url;

    try {
      url = new URL(value);
    } catch {
      throw new Error("Each vehicle image must be a valid HTTPS URL.");
    }

    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Vehicle images must use secure HTTPS links.");
    }

    return url.href;
  });
}

function isValidTikTokUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" &&
      (host === "tiktok.com" || host.endsWith(".tiktok.com"));
  } catch {
    return false;
  }
}

if ($("carImageUrls")) {
  $("carImageUrls").addEventListener("input", event => {
    try {
      selectedImages = parseVehicleImageUrls(event.target.value);
      renderImagePreview();
    } catch {
      $("carImagePreview").replaceChildren();
    }
  });
}

if ($("carForm")) {
  $("carForm").addEventListener("submit", async event => {
    event.preventDefault();
    refreshData();

    const id = $("carId").value;

    const existing = cars.find(c =>
      String(c.id) === String(id)
    );

    const dealerId = $("carDealer").value;
    let images;

    try {
      images = parseVehicleImageUrls($("carImageUrls").value);
    } catch (error) {
      return toast(error.message);
    }

    const tiktokUrl = $("carTikTokUrl").value.trim();
    if (!isValidTikTokUrl(tiktokUrl)) {
      return toast("Enter a valid HTTPS TikTok video link.");
    }

    const vehicle = {
      ...(existing || {}),

      id: id || uid(),

      make: $("carMake").value.trim(),
      model: $("carModel").value.trim(),
      year: Number($("carYear").value),
      price: Number($("carPrice").value),
      location: $("carLocation").value.trim(),

      transmission: $("carTransmission").value,
      fuel: $("carFuel").value,

      mileage: Number($("carMileage").value || 0),

      description: $("carDescriptionInput").value.trim(),
      phone: $("carPhone").value.trim(),
      tiktokUrl,

      dealerId: dealerId || null,

      images,

      status: $("carStatus").value,

      addedBy: existing?.addedBy || "admin",

      updatedAt: new Date().toISOString()
    };

    if (
      !vehicle.make ||
      !vehicle.model ||
      !vehicle.location ||
      !vehicle.year ||
      vehicle.price <= 0
    ) {
      return toast("Complete all required vehicle details.");
    }

    if (
      vehicle.dealerId &&
      dealers.find(d =>
        String(d.id) === String(vehicle.dealerId)
      )?.status !== "approved"
    ) {
      return toast("Select an approved dealer.");
    }

    if (window.driveHubDatabase?.isEnabled()) {
      const submit = $("carForm").querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Saving to database…";

      try {
        await window.driveHubDatabase.saveVehicle(vehicle, Boolean(existing));
        window.setAdminVehicles(
          await window.driveHubDatabase.listVehicles()
        );
        $("carModal").classList.remove("show");
        toast(existing ? "Vehicle updated in Neon." : "Vehicle added to Neon.");
      } catch (error) {
        console.error("Could not save vehicle to Neon:", error);
        toast(error.message || "Could not save vehicle to Neon.");
      } finally {
        submit.disabled = false;
        submit.textContent = "Save Vehicle";
      }
      return;
    }

    if (existing) {
      cars = cars.map(c =>
        String(c.id) === String(id) ? vehicle : c
      );
    } else {
      vehicle.createdAt = new Date().toISOString();
      cars.push(vehicle);
    }

    if (!setData(KEYS.cars, cars)) return;

    $("carModal").classList.remove("show");

    toast(
      existing
        ? "Vehicle updated."
        : "Vehicle added successfully."
    );

    renderAll();
  });
}

/* ==========================================
   FEES AND SETTINGS
========================================== */

function loadSettings() {
  if (!$("listingFee")) return;

  $("listingFee").value = settings.listingFee ?? 1000;
  $("monthlyFee").value = settings.monthlyFee ?? 5000;

  if ($("weeklyFee")) {
    $("weeklyFee").value = settings.weeklyFee ?? 0;
  }

  if ($("paybillNumber")) {
    $("paybillNumber").value = settings.paybillNumber || "";
  }

  if ($("paymentReference")) {
    $("paymentReference").value =
      settings.paymentReference || "";
  }
}

if ($("saveFees")) {
  $("saveFees").onclick = () => {
    const listingFee = Number($("listingFee").value);
    const monthlyFee = Number($("monthlyFee").value);

    const weeklyFee = $("weeklyFee")
      ? Number($("weeklyFee").value)
      : Number(settings.weeklyFee || 0);

    if (
      !Number.isFinite(listingFee) ||
      !Number.isFinite(monthlyFee) ||
      !Number.isFinite(weeklyFee) ||
      listingFee < 0 ||
      monthlyFee < 0 ||
      weeklyFee < 0
    ) {
      return toast("Enter valid fee amounts.");
    }

    settings = {
      ...settings,

      listingFee,
      monthlyFee,
      weeklyFee,

      paybillNumber: $("paybillNumber")?.value.trim() || "",

      paymentReference:
        $("paymentReference")?.value.trim() || ""
    };

    if (!setData(KEYS.settings, settings)) return;

    toast("Fee settings saved.");
  };
}

/* ==========================================
   PAYMENT MANAGEMENT
========================================== */

function renderPayments() {
  if (!$("paymentsTable")) return;

  if ($("paymentCount")) {
    $("paymentCount").textContent = payments.length;
  }

  const total = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  if ($("paymentTotal")) {
    $("paymentTotal").textContent = money(total);
  }

  $("paymentsTable").innerHTML = payments.length
    ? [...payments].reverse().map(payment => `
      <tr>
        <td>${escapeHTML(payment.date || "")}</td>

        <td>${escapeHTML(payment.dealerName || "")}</td>

        <td>${escapeHTML(payment.type || "")}</td>

        <td>${escapeHTML(payment.method || "")}</td>

        <td>${money(payment.amount)}</td>

        <td>${escapeHTML(payment.reference || "—")}</td>

        <td>
          ${payment.receiptSent
            ? statusBadge("sent")
            : statusBadge("pending")}
        </td>

        <td>
          <div class="action-group">

            <button class="small-btn gold"
              onclick="printReceipt('${escapeHTML(payment.id)}')">
              Preview / Print
            </button>

            <button class="small-btn approve"
              onclick="sendReceiptWhatsApp('${escapeHTML(payment.id)}')">
              Send WhatsApp
            </button>

            ${!payment.receiptSent ? `
              <button class="small-btn approve"
                onclick="markReceiptSent('${escapeHTML(payment.id)}')">
                Mark Sent
              </button>
            ` : ""}

          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="8">No payment records available.</td></tr>`;

  const receiptSelect = $("receiptPayment");

  if (receiptSelect) {
    receiptSelect.innerHTML = payments.length
      ? [...payments].reverse().map(p => `
          <option value="${escapeHTML(p.id)}">
            ${escapeHTML(p.dealerName)} —
            ${money(p.amount)} —
            ${escapeHTML(p.date)}
          </option>
        `).join("")
      : `<option value="">No recorded payments</option>`;
  }
}

function openPaymentModal() {
  refreshData();

  const approvedDealers = dealers.filter(d =>
    d.status === "approved"
  );

  if (!$("paymentDealer")) return;

  $("paymentDealer").innerHTML = approvedDealers.length
    ? approvedDealers.map(d => `
        <option value="${escapeHTML(d.id)}">
          ${escapeHTML(getDealerName(d))}
        </option>
      `).join("")
    : `<option value="">No approved dealers</option>`;

  if (!approvedDealers.length) {
    return toast("Approve a dealer before recording their payment.");
  }

  $("paymentForm").reset();

  $("paymentDate").value =
    new Date().toISOString().slice(0, 10);

  $("paymentModal").classList.add("show");
}

if ($("addPaymentBtn")) {
  $("addPaymentBtn").onclick = openPaymentModal;
}

if ($("closePayment")) {
  $("closePayment").onclick = () => {
    $("paymentModal")?.classList.remove("show");
  };
}

if ($("paymentModal")) {
  $("paymentModal").addEventListener("click", event => {
    if (event.target === $("paymentModal")) {
      $("paymentModal").classList.remove("show");
    }
  });
}

function activateSubscription(dealer, type, date) {
  let durationDays = 0;

  if (type === "Monthly Subscription") {
    durationDays = 30;
  }

  if (type === "Weekly Subscription") {
    durationDays = 7;
  }

  if (!durationDays) return false;

  const paymentDate = new Date(date + "T12:00:00");

  if (Number.isNaN(paymentDate.getTime())) {
    return false;
  }

  const currentExpiry = dealer.subscriptionExpiry
    ? new Date(dealer.subscriptionExpiry)
    : null;

  const startDate =
    currentExpiry &&
    !Number.isNaN(currentExpiry.getTime()) &&
    currentExpiry > paymentDate
      ? currentExpiry
      : paymentDate;

  const expiry = new Date(startDate);

  expiry.setDate(expiry.getDate() + durationDays);

  dealer.subscriptionStatus = "active";
  dealer.subscriptionExpiry = expiry.toISOString();
  dealer.lastSubscriptionPayment = date;
  dealer.updatedAt = new Date().toISOString();

  return true;
}

if ($("paymentForm")) {
  $("paymentForm").addEventListener("submit", event => {
    event.preventDefault();
    refreshData();

    const dealer = dealers.find(d =>
      String(d.id) === String($("paymentDealer").value)
    );

    const amount = Number($("paymentAmount").value);
    const type = $("paymentType").value;

    if (!dealer || !Number.isFinite(amount) || amount <= 0) {
      return toast("Enter valid payment details.");
    }

    const date = $("paymentDate").value;

    if (!date) {
      return toast("Choose a payment date.");
    }

    const record = {
      id: uid(),

      dealerId: dealer.id,

      dealerName: getDealerName(dealer),

      type,

      method: $("paymentMethod").value,

      amount,

      reference: $("paymentRef").value.trim(),

      date,

      recordedAt: new Date().toISOString(),

      verificationStatus: "admin-recorded",

      receiptSent: false,
      receiptSentAt: null,
      receiptSentBy: null
    };

    payments.push(record);

    if (!setData(KEYS.payments, payments)) {
      payments.pop();
      return;
    }

    const subscriptionUpdated =
      activateSubscription(dealer, type, date);

    if (subscriptionUpdated) {
      if (!setData(KEYS.dealers, dealers)) {
        toast("Payment saved, but subscription update failed.");
      }

      record.subscriptionExpiry = dealer.subscriptionExpiry;
      setData(KEYS.payments, payments);
    }

    $("paymentModal").classList.remove("show");

    toast("Payment record saved. Preparing receipt.");

    renderAll();
    printReceipt(record.id);
  });
}

/* ==========================================
   RECEIPTS
========================================== */

function getReceiptHTML(payment) {
  return `
    <div class="receipt-paper">

      <h1>DRIVE HUB</h1>

      <p>KENYA'S TRUSTED CAR MARKETPLACE</p>

      <hr>

      <h2>PAYMENT RECEIPT</h2>

      <p>
        <strong>Receipt Number:</strong>
        ${escapeHTML(payment.id)}
      </p>

      <p>
        <strong>Date:</strong>
        ${escapeHTML(payment.date)}
      </p>

      <p>
        <strong>Dealer:</strong>
        ${escapeHTML(payment.dealerName)}
      </p>

      <p>
        <strong>Payment Type:</strong>
        ${escapeHTML(payment.type)}
      </p>

      <p>
        <strong>Payment Method:</strong>
        ${escapeHTML(payment.method)}
      </p>

      <p>
        <strong>Reference:</strong>
        ${escapeHTML(payment.reference || "Not supplied")}
      </p>

      ${payment.subscriptionExpiry ? `
        <p>
          <strong>Subscription Expiry:</strong>
          ${escapeHTML(payment.subscriptionExpiry)}
        </p>
      ` : ""}

      <h2>Amount: ${money(payment.amount)}</h2>

      <hr>

      <p>Thank you for choosing DRIVE HUB.</p>

      <small>
        ${
          payment.verificationStatus === "verified"
            ? "Payment verified by DRIVE HUB."
            : "Admin-recorded payment. Independent payment verification has not been recorded."
        }
      </small>

    </div>
  `;
}

function getReceiptMessage(payment) {
  return [
    "DRIVE HUB",
    "KENYA'S TRUSTED CAR MARKETPLACE",
    "",
    "PAYMENT RECEIPT",
    "--------------------------------",
    "Receipt Number: " + payment.id,
    "Dealer: " + payment.dealerName,
    "Payment Type: " + payment.type,
    "Payment Method: " + payment.method,
    "Amount: " + money(payment.amount),
    "Transaction Reference: " + (payment.reference || "Not supplied"),
    "Payment Date: " + payment.date,
    "Subscription Expiry: " + (payment.subscriptionExpiry || "Not applicable"),
    "--------------------------------",
    "Thank you for choosing DRIVE HUB."
  ].join("\n");
}

function printReceipt(id) {
  refreshData();

  const payment = payments.find(p =>
    String(p.id) === String(id)
  );

  if (!payment) {
    return toast("Payment record not found.");
  }

  const receipt = getReceiptHTML(payment);

  const win = window.open("", "_blank");

  if (!win) {
    return toast("Allow pop-ups to print the receipt.");
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DRIVE HUB Receipt</title>

      <style>
        body{
          font-family:Arial,sans-serif;
          padding:35px;
          color:#222;
        }

        .receipt-paper{
          max-width:550px;
          margin:auto;
          border:1px solid #ddd;
          padding:30px;
          line-height:2;
        }

        h1{color:#b17b27}

        h2{margin-top:25px}

        hr{
          border:0;
          border-top:1px solid #ddd;
          margin:20px 0;
        }

        small{color:#666}

        @media print{
          body{padding:0}
        }
      </style>
    </head>

    <body>
      ${receipt}

      <script>
        window.onload = () => window.print();
      <\/script>
    </body>
    </html>
  `);

  win.document.close();
}

function sendReceiptWhatsApp(id) {
  refreshData();

  const payment = payments.find(p =>
    String(p.id) === String(id)
  );

  if (!payment) {
    return toast("Payment record not found.");
  }

  const dealer = dealers.find(d =>
    String(d.id) === String(payment.dealerId)
  );

  if (!dealer) {
    return toast("Dealer record not found.");
  }

  const phone = String(
    dealer.whatsapp || dealer.phone || dealer.contact || ""
  ).replace(/\D/g, "");

  if (!phone) {
    return toast("This dealer has no WhatsApp number.");
  }

  const message = getReceiptMessage(payment);

  const whatsappURL =
    "https://wa.me/" + phone +
    "?text=" + encodeURIComponent(message);

  window.open(whatsappURL, "_blank", "noopener,noreferrer");

  toast("WhatsApp opened. Send the prepared receipt to the dealer.");
}

function markReceiptSent(id) {
  refreshData();

  const payment = payments.find(p =>
    String(p.id) === String(id)
  );

  if (!payment) {
    return toast("Payment record not found.");
  }

  if (payment.receiptSent) {
    return toast("This receipt is already marked as sent.");
  }

  if (!confirm("Have you successfully sent this receipt to the dealer?")) {
    return;
  }

  payment.receiptSent = true;
  payment.receiptSentAt = new Date().toISOString();
  payment.receiptSentBy = "admin";

  if (!setData(KEYS.payments, payments)) return;

  toast("Receipt marked as sent.");
  renderAll();
}

if ($("draftReceiptBtn")) {
  $("draftReceiptBtn").onclick = () => {
    refreshData();

    const id = $("receiptPayment")?.value;

    const payment = payments.find(p =>
      String(p.id) === String(id)
    );

    if (!payment) {
      return toast("Select a recorded payment.");
    }

    $("receiptPreview").innerHTML =
      getReceiptHTML(payment) +
      `
        <div class="action-group">

          <button class="primary-btn"
            onclick="printReceipt('${escapeHTML(payment.id)}')">
            Print Receipt
          </button>

          <button class="primary-btn"
            onclick="sendReceiptWhatsApp('${escapeHTML(payment.id)}')">
            Send via WhatsApp
          </button>

          ${!payment.receiptSent ? `
            <button class="primary-btn"
              onclick="markReceiptSent('${escapeHTML(payment.id)}')">
              Mark as Sent
            </button>
          ` : ""}
        </div>
      `;
  };
}

/* ==========================================
   BOOKINGS
========================================== */

function getBookingStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "requested" || value === "new") {
    return "pending";
  }

  if (["pending", "confirmed", "completed", "cancelled"].includes(value)) {
    return value;
  }

  return "pending";
}

function renderBookings() {
  if (!$("bookingsTable")) return;

  $("bookingsTable").innerHTML = bookings.length
    ? [...bookings].reverse().map(booking => {
      const buyer = buyers.find(b =>
        (
          booking.buyerId &&
          String(b.id) === String(booking.buyerId)
        ) ||
        (
          booking.buyerEmail &&
          String(b.email).toLowerCase() ===
          String(booking.buyerEmail).toLowerCase()
        )
      );

      const bookingStatus = getBookingStatus(booking.status);

      return `
        <tr>

          <td>
            ${escapeHTML(
              buyer?.name ||
              booking.name ||
              booking.buyerName ||
              "Customer"
            )}
          </td>

          <td>
            ${escapeHTML(
              booking.carName ||
              booking.vehicleName ||
              booking.model ||
              "Vehicle"
            )}
          </td>

          <td>${escapeHTML(booking.date || "")}</td>

          <td>${escapeHTML(booking.time || "")}</td>

          <td>
            ${escapeHTML(
              booking.phone ||
              buyer?.phone ||
              ""
            )}
          </td>

          <td>
            <select
              onchange="updateBooking('${escapeHTML(booking.id)}',this.value)">

              <option value="pending"
                ${bookingStatus === "pending" ? "selected" : ""}>
                Pending
              </option>

              <option value="confirmed"
                ${bookingStatus === "confirmed" ? "selected" : ""}>
                Confirmed
              </option>

              <option value="completed"
                ${bookingStatus === "completed" ? "selected" : ""}>
                Completed
              </option>

              <option value="cancelled"
                ${bookingStatus === "cancelled" ? "selected" : ""}>
                Cancelled
              </option>

            </select>
          </td>

        </tr>
      `;
    }).join("")
    : `<tr><td colspan="6">No viewing requests available.</td></tr>`;
}

function updateBooking(id, status) {
  refreshData();

  const booking = bookings.find(b =>
    String(b.id) === String(id)
  );

  if (!booking) {
    return toast("Booking not found.");
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  if (!setData(KEYS.bookings, bookings)) return;

  toast("Booking updated.");
  renderAll();
}

/* ==========================================
   ADMIN ASSISTANT
========================================== */

function extractVehicleDetails() {
  if (!$("carDescription")) return;

  const text = $("carDescription").value.trim();

  if (!text) {
    return toast("Paste a vehicle description first.");
  }

  const priceMatch = text.match(
    /(?:KSh|KES|Ksh|Kes)\s*([\d,]+(?:\.\d+)?)/i
  );

  const yearMatch = text.match(
    /\b(19[8-9]\d|20[0-3]\d)\b/
  );

  const transmissionMatch = text.match(
    /\b(automatic|manual|CVT)\b/i
  );

  const fuelMatch = text.match(
    /\b(petrol|diesel|hybrid|electric)\b/i
  );

  const mileageMatch = text.match(
    /([\d,]+)\s*km\b/i
  );

  const locationMatch = text.match(
    /\b(?:located in|location|at)\s+([A-Za-z][A-Za-z\s-]{1,35})/i
  );

  const makes = [
    "Toyota",
    "Nissan",
    "Mazda",
    "Subaru",
    "Honda",
    "Mercedes-Benz",
    "BMW",
    "Audi",
    "Volkswagen",
    "Mitsubishi",
    "Isuzu",
    "Suzuki",
    "Lexus",
    "Land Rover",
    "Ford",
    "Hyundai",
    "Kia",
    "Volvo"
  ];

  const make = makes.find(m =>
    new RegExp(
      "\\b" +
      m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\b",
      "i"
    ).test(text)
  ) || "";

  let model = "";

  if (make) {
    const escapedMake = make.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const match = text.match(
      new RegExp(escapedMake + "\\s+([A-Za-z0-9-]+)", "i")
    );

    model = match ? match[1] : "";
  }

  extractedVehicle = {
    make,

    model,

    year: yearMatch
      ? Number(yearMatch[1])
      : "",

    price: priceMatch
      ? Number(priceMatch[1].replace(/,/g, ""))
      : "",

    location: locationMatch
      ? locationMatch[1].trim()
      : "",

    transmission: transmissionMatch
      ? transmissionMatch[1].toLowerCase()
      : "automatic",

    fuel: fuelMatch
      ? fuelMatch[1].toLowerCase()
      : "petrol",

    mileage: mileageMatch
      ? Number(mileageMatch[1].replace(/,/g, ""))
      : "",

    description: text
  };

  if (!$("extractedCar")) return;

  $("extractedCar").innerHTML = `
    <strong>Extracted details — review before saving</strong>

    <p>Make: ${escapeHTML(extractedVehicle.make || "Not detected")}</p>

    <p>Model: ${escapeHTML(extractedVehicle.model || "Not detected")}</p>

    <p>Year: ${escapeHTML(extractedVehicle.year || "Not detected")}</p>

    <p>
      Price:
      ${
        extractedVehicle.price
          ? money(extractedVehicle.price)
          : "Not detected"
      }
    </p>

    <p>Location: ${escapeHTML(extractedVehicle.location || "Not detected")}</p>

    <p>Transmission: ${escapeHTML(extractedVehicle.transmission)}</p>

    <p>Fuel: ${escapeHTML(extractedVehicle.fuel)}</p>

    <p>Mileage: ${escapeHTML(extractedVehicle.mileage || "Not detected")}</p>
  `;

  if ($("useExtractedCar")) {
    $("useExtractedCar").hidden = false;
  }
}

if ($("extractCarBtn")) {
  $("extractCarBtn").onclick = extractVehicleDetails;
}

if ($("useExtractedCar")) {
  $("useExtractedCar").onclick = () => {
    if (!extractedVehicle) return;

    const v = extractedVehicle;

    openCarModal();

    $("carMake").value = v.make;
    $("carModel").value = v.model;
    $("carYear").value = v.year;
    $("carPrice").value = v.price;
    $("carLocation").value = v.location;

    $("carTransmission").value =
      v.transmission.charAt(0).toUpperCase() +
      v.transmission.slice(1);

    $("carFuel").value =
      v.fuel.charAt(0).toUpperCase() +
      v.fuel.slice(1);

    $("carMileage").value = v.mileage;

    $("carDescriptionInput").value = v.description;
  };
}

/* ==========================================
   MANAGEMENT SUMMARY
========================================== */

function renderAssistantSummary() {
  refreshData();

  const pendingDealers = dealers.filter(d =>
    d.status === "pending"
  ).length;

  const pendingCars = cars.filter(c =>
    c.status === "pending"
  ).length;

  const revenue = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const pendingBookings = bookings.filter(b =>
    getBookingStatus(b.status) === "pending"
  ).length;

  if (!$("assistantSummary")) return;

  $("assistantSummary").innerHTML = `
    <p><strong>Dealers:</strong> ${dealers.length} registered.</p>

    <p><strong>Pending dealer approvals:</strong> ${pendingDealers}.</p>

    <p><strong>Pending vehicle approvals:</strong> ${pendingCars}.</p>

    <p><strong>Total vehicle listings:</strong> ${cars.length}.</p>

    <p><strong>Recorded revenue:</strong> ${money(revenue)}.</p>

    <p><strong>Viewing requests awaiting action:</strong> ${pendingBookings}.</p>

    <p><strong>Payment records:</strong> ${payments.length}.</p>

    <p>
      <strong>Active subscriptions:</strong>
      ${dealers.filter(isSubscriptionActive).length}.
    </p>

    <p>
      <strong>Receipts marked as sent:</strong>
      ${payments.filter(p => p.receiptSent).length}.
    </p>

    <p>
      <strong>Receipts awaiting sending:</strong>
      ${payments.filter(p => !p.receiptSent).length}.
    </p>

    <p>
      <strong>Removed dealers:</strong>
      ${dealers.filter(d => d.status === "removed").length}.
    </p>
  `;
}

if ($("refreshSummary")) {
  $("refreshSummary").onclick = () => {
    renderAssistantSummary();
    toast("Management summary refreshed.");
  };
}

/* ==========================================
   RENDER EVERYTHING
========================================== */

function renderAll() {
  refreshData();

  renderOverview();
  renderDealers();
  renderVehicles();
  renderPayments();
  renderBookings();
  renderAssistantSummary();
  loadSettings();
}

renderAll();

window.setAdminVehicles = function (vehicles) {
  cars = Array.isArray(vehicles) ? vehicles : [];
  window.driveHubDatabase?.setCachedVehicles(cars);

  try {
    localStorage.setItem(KEYS.cars, JSON.stringify(cars));
  } catch (error) {
    console.warn("Could not cache database vehicles locally:", error);
  }

  renderAll();
};

/* ==========================================
   CROSS-TAB REFRESH
========================================== */

window.addEventListener("storage", event => {
  if (
    event.key === null ||
    Object.values(KEYS).includes(event.key)
  ) {
    renderAll();
  }
});

/* ==========================================
   REFRESH WHEN ADMIN RETURNS TO TAB
========================================== */

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    renderAll();
  }
});

/* =====================================================
   DRIVE HUB — DEALER REMOVAL & MANUAL RECEIPT SENDING
   ADDITIONAL FEATURES — PRESERVES EXISTING FUNCTIONS
===================================================== */

/* ---------------- DEALER MANAGEMENT ---------------- */

// Replace dealer table rendering with an enhanced version.
renderDealers = function () {
  if (!$("dealersTable")) return;

  refreshData();

  const query = ($("dealerSearch")?.value || "")
    .toLowerCase().trim();

  const filter = $("dealerFilter")?.value || "all";

  if ($("allDealerCount"))
    $("allDealerCount").textContent = dealers.length;

  if ($("approvedDealerCount"))
    $("approvedDealerCount").textContent =
      dealers.filter(d => d.status === "approved").length;

  if ($("pendingDealerCount"))
    $("pendingDealerCount").textContent =
      dealers.filter(d => d.status === "pending").length;

  if ($("rejectedDealerCount"))
    $("rejectedDealerCount").textContent =
      dealers.filter(d => d.status === "rejected").length;

  const filtered = dealers.filter(d => {
    const searchable = `
      ${getDealerName(d)}
      ${d.owner || ""}
      ${d.email || ""}
      ${d.phone || ""}
      ${d.whatsapp || ""}
      ${d.location || ""}
    `.toLowerCase();

    return searchable.includes(query) &&
      (filter === "all" || d.status === filter);
  });

  $("dealersTable").innerHTML = filtered.length
    ? filtered.map(d => `
      <tr>
        <td>
          <strong>${escapeHTML(getDealerName(d))}</strong>
          <br><small>${escapeHTML(d.id)}</small>
        </td>

        <td>
          ${escapeHTML(d.owner || getDealerPhone(d))}
          <br>${escapeHTML(getDealerPhone(d))}
        </td>

        <td>${escapeHTML(d.email || "")}</td>

        <td>${statusBadge(d.status)}</td>

        <td>
          <div class="action-group">

            ${d.status !== "approved" ? `
              <button class="small-btn approve"
                onclick="updateDealer('${escapeHTML(d.id)}','approved')">
                Approve
              </button>
            ` : ""}

            ${d.status !== "rejected" ? `
              <button class="small-btn reject"
                onclick="updateDealer('${escapeHTML(d.id)}','rejected')">
                Reject
              </button>
            ` : ""}

            <button class="small-btn gold"
              onclick="showDealerDetails('${escapeHTML(d.id)}')">
              Details
            </button>

            <button class="small-btn delete"
              onclick="removeDealer('${escapeHTML(d.id)}')">
              Remove
            </button>

          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="5">No dealers found.</td></tr>`;
};


// Approve, reject or return a dealer to pending.
updateDealer = function (id, status) {
  refreshData();

  const dealer = dealers.find(d =>
    String(d.id) === String(id)
  );

  if (!dealer) return toast("Dealer not found.");

  if (!["approved", "rejected", "pending"].includes(status)) {
    return toast("Invalid dealer status.");
  }

  if (status === "approved" &&
      !confirm("Approve this dealer account?")) {
    return;
  }

  dealer.status = status;
  dealer.updatedAt = new Date().toISOString();

  if (!setData(KEYS.dealers, dealers)) return;

  toast("Dealer " + status + ".");
  renderAll();
};


// Permanently remove a dealer and their marketplace listings.
// Payment and booking records are preserved for administration.
function removeDealer(id) {
  refreshData();

  const dealer = dealers.find(d =>
    String(d.id) === String(id)
  );

  if (!dealer) return toast("Dealer not found.");

  const dealerName = getDealerName(dealer);

  const confirmed = confirm(
    "REMOVE DEALER ACCOUNT?\n\n" +
    dealerName +
    "\n\nThis will:\n" +
    "• Remove the dealer account from DRIVE HUB.\n" +
    "• Remove their vehicle listings.\n" +
    "• Preserve their payment history.\n" +
    "• Preserve existing booking records.\n\n" +
    "This action cannot be automatically undone."
  );

  if (!confirmed) return;

  const previousDealers = [...dealers];
  const previousCars = [...cars];

  dealers = dealers.filter(d =>
    String(d.id) !== String(id)
  );

  cars = cars.filter(c =>
    String(c.dealerId) !== String(id)
  );

  if (!setData(KEYS.dealers, dealers)) {
    dealers = previousDealers;
    return;
  }

  if (!setData(KEYS.cars, cars)) {
    dealers = previousDealers;
    cars = previousCars;

    setData(KEYS.dealers, dealers);

    return toast(
      "Could not remove the dealer's listings. Please try again."
    );
  }

  toast("Dealer and their vehicle listings removed.");

  renderAll();
}


/* ---------------- RECEIPT GENERATION ---------------- */

// Generate a more complete receipt.
getReceiptHTML = function (payment) {
  const dealer = dealers.find(d =>
    String(d.id) === String(payment.dealerId)
  );

  const receiptNumber = payment.receiptNumber ||
    ("DH-" + String(payment.id).slice(-8).toUpperCase());

  const receiptStatus = payment.receiptSent
    ? "SENT BY ADMIN"
    : "PREPARED — AWAITING ADMIN SENDING";

  return `
    <div class="receipt-paper">

      <div class="receipt-brand">
        <h1>DRIVE <span>HUB</span></h1>
        <p>KENYA'S TRUSTED CAR MARKETPLACE</p>
      </div>

      <hr>

      <h2>OFFICIAL PAYMENT RECEIPT</h2>

      <p><strong>Receipt Number:</strong>
        ${escapeHTML(receiptNumber)}</p>

      <p><strong>Dealer:</strong>
        ${escapeHTML(payment.dealerName)}</p>

      <p><strong>Dealer Phone:</strong>
        ${escapeHTML(
          dealer?.whatsapp ||
          dealer?.phone ||
          "Not supplied"
        )}</p>

      <p><strong>Dealer Email:</strong>
        ${escapeHTML(dealer?.email || "Not supplied")}</p>

      <p><strong>Payment Type:</strong>
        ${escapeHTML(payment.type)}</p>

      <p><strong>Payment Method:</strong>
        ${escapeHTML(payment.method)}</p>

      <p><strong>Transaction Reference:</strong>
        ${escapeHTML(payment.reference || "Not supplied")}</p>

      <p><strong>Payment Date:</strong>
        ${escapeHTML(payment.date)}</p>

      <h2 class="receipt-amount">
        ${money(payment.amount)}
      </h2>

      <p><strong>Receipt Status:</strong>
        ${escapeHTML(receiptStatus)}</p>

      <hr>

      <p>Thank you for choosing DRIVE HUB.</p>

      <small>
        This receipt represents a payment record entered by
        DRIVE HUB administration. It must only be issued as
        confirmation of payment after the payment has been
        verified.
      </small>

    </div>
  `;
};


/* ---------------- WHATSAPP RECEIPT SENDING ---------------- */

// Convert Kenyan phone numbers into international format.
function receiptPhoneNumber(phone) {
  let number = String(phone || "").replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = "254" + number.slice(1);
  } else if (number.startsWith("7") ||
             number.startsWith("1")) {
    number = "254" + number;
  }

  return number;
}


// Open WhatsApp with a prepared receipt message.
// The administrator must press Send inside WhatsApp.
function sendReceiptWhatsApp(id) {
  refreshData();

  const payment = payments.find(p =>
    String(p.id) === String(id)
  );

  if (!payment) return toast("Payment not found.");

  const dealer = dealers.find(d =>
    String(d.id) === String(payment.dealerId)
  );

  const phone = receiptPhoneNumber(
    dealer?.whatsapp || dealer?.phone
  );

  if (!phone || phone.length < 11) {
    return toast(
      "This dealer does not have a valid WhatsApp number."
    );
  }

  // Do not issue a receipt for an unverified payment.
  if (
    payment.verificationStatus !== "verified" &&
    payment.verificationStatus !== "admin-recorded"
  ) {
    return toast("Payment must be verified first.");
  }

  const receiptNumber = payment.receiptNumber ||
    ("DH-" + String(payment.id).slice(-8).toUpperCase());

  const message = [
    "DRIVE HUB — PAYMENT RECEIPT",
    "",
    "Dear " + payment.dealerName + ",",
    "Your payment receipt is ready.",
    "",
    "Receipt Number: " + receiptNumber,
    "Payment Type: " + payment.type,
    "Amount: " + money(payment.amount),
    "Payment Method: " + payment.method,
    "Transaction Reference: " + (payment.reference || "Not supplied"),
    "Payment Date: " + payment.date,
    "",
    "Thank you for choosing DRIVE HUB.",
    "Kenya's Trusted Car Marketplace."
  ].join("\n");

  const whatsappURL =
    "https://wa.me/" + phone +
    "?text=" + encodeURIComponent(message);

  // Record that WhatsApp was opened, not that delivery occurred.
  payment.receiptWhatsAppOpenedAt =
    new Date().toISOString();

  setData(KEYS.payments, payments);

  window.open(whatsappURL, "_blank", "noopener");

  toast("WhatsApp opened. Press Send to deliver the receipt.");

  renderPayments();
};


// Admin manually confirms that they pressed Send.
function markReceiptSent(id) {
  refreshData();

  const payment = payments.find(p =>
    String(p.id) === String(id)
  );

  if (!payment) return toast("Payment not found.");

  if (!payment.receiptWhatsAppOpenedAt) {
    return toast("Open WhatsApp before marking this receipt sent.");
  }

  if (!confirm(
    "Have you pressed Send in WhatsApp and sent this receipt?"
  )) {
    return;
  }

  payment.receiptSent = true;
  payment.receiptSentAt = new Date().toISOString();

  if (!setData(KEYS.payments, payments)) return;

  toast("Receipt marked as sent.");

  renderAll();
}


/* ---------------- PAYMENT TABLE ---------------- */

// Show receipt preparation and sending controls.
renderPayments = function () {
  if (!$("paymentsTable")) return;

  refreshData();

  if ($("paymentCount")) {
    $("paymentCount").textContent = payments.length;
  }

  const total = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  if ($("paymentTotal")) {
    $("paymentTotal").textContent = money(total);
  }

  $("paymentsTable").innerHTML = payments.length
    ? [...payments].reverse().map(payment => `
      <tr>
        <td>${escapeHTML(payment.date || "")}</td>

        <td>${escapeHTML(payment.dealerName || "")}</td>

        <td>${escapeHTML(payment.type || "")}</td>

        <td>${escapeHTML(payment.method || "")}</td>

        <td>${money(payment.amount)}</td>

        <td>${escapeHTML(payment.reference || "—")}</td>

        <td>
          <div class="action-group">

            <button class="small-btn gold"
              onclick="printReceipt('${escapeHTML(payment.id)}')">
              Print
            </button>

            <button class="small-btn approve"
              onclick="sendReceiptWhatsApp('${escapeHTML(payment.id)}')">
              Send WhatsApp
            </button>

            ${
              payment.receiptSent
                ? `<span class="receipt-sent-label">SENT</span>`
                : payment.receiptWhatsAppOpenedAt
                  ? `<button class="small-btn approve"
                      onclick="markReceiptSent('${escapeHTML(payment.id)}')">
                      Mark Sent
                    </button>`
                  : `<span class="receipt-pending-label">NOT SENT</span>`
            }

          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="7">No payment records available.</td></tr>`;

  const receiptSelect = $("receiptPayment");

  if (receiptSelect) {
    receiptSelect.innerHTML = payments.length
      ? [...payments].reverse().map(p => `
          <option value="${escapeHTML(p.id)}">
            ${escapeHTML(p.dealerName)} —
            ${money(p.amount)} —
            ${escapeHTML(p.date)}
          </option>
        `).join("")
      : `<option value="">No recorded payments</option>`;
  }
};


/* ---------------- RECEIPT ASSISTANT ---------------- */

// Prepare receipt with manual sending options.
if ($("draftReceiptBtn")) {
  $("draftReceiptBtn").onclick = () => {
    refreshData();

    const id = $("receiptPayment")?.value;

    const payment = payments.find(p =>
      String(p.id) === String(id)
    );

    if (!payment) {
      return toast("Select a recorded payment.");
    }

    $("receiptPreview").innerHTML =
      getReceiptHTML(payment) +

      `<div class="receipt-actions">

        <button class="primary-btn"
          onclick="printReceipt('${escapeHTML(payment.id)}')">
          Print Receipt
        </button>

        <button class="primary-btn whatsapp-btn"
          onclick="sendReceiptWhatsApp('${escapeHTML(payment.id)}')">
          Send to Dealer on WhatsApp
        </button>

        ${
          payment.receiptWhatsAppOpenedAt && !payment.receiptSent
            ? `<button class="small-btn approve"
                onclick="markReceiptSent('${escapeHTML(payment.id)}')">
                Confirm I Sent It
              </button>`
            : ""
        }

      </div>`;
  };
}


/* ---------------- FINAL REFRESH ---------------- */

renderAll();

console.log(
  "DRIVE HUB: Dealer removal and manual receipt sending enabled."
);
