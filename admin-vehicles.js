"use strict";

const vehicleForm = document.getElementById("vehicleForm");
const vehicleInventory = document.getElementById("vehicleInventory");
const vehicleImageInput = document.getElementById("vehicleImages");
const vehicleImagePreview = document.getElementById("vehicleImagePreview");
const saveVehicleButton = document.getElementById("saveVehicleButton");
const cancelVehicleEdit = document.getElementById("cancelVehicleEdit");
const vehicleFormTitle = document.getElementById("vehicleFormTitle");
const inventoryCount = document.getElementById("inventoryCount");
const toastElement = document.getElementById("adminToast");

let vehicles = [];
let toastTimer;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatPrice(value) {
    return `KES ${Number(value || 0).toLocaleString("en-KE")}`;
}

function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove("show"), 3500);
}

function parseVehicleImages(value) {
    const urls = String(value || "")
        .split(/\r?\n/)
        .map(url => url.trim())
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

function renderImagePreview(urls) {
    vehicleImagePreview.replaceChildren();

    urls.forEach((url, index) => {
        const image = document.createElement("img");
        image.src = url;
        image.alt = `Vehicle image ${index + 1} preview`;
        image.loading = "lazy";
        vehicleImagePreview.append(image);
    });
}

function renderInventory() {
    inventoryCount.textContent = String(vehicles.length);

    if (!vehicles.length) {
        vehicleInventory.innerHTML =
            '<p class="empty-state">No vehicles yet. Add your first listing above.</p>';
        return;
    }

    vehicleInventory.innerHTML = vehicles.map(vehicle => {
        const images = Array.isArray(vehicle.images) ? vehicle.images : [];
        const image = images[0] || "./pictures/Drivehub%20logo.jpg";
        const status = vehicle.status || "available";
        const nextStatus = status === "sold" ? "available" : "sold";
        const statusAction = status === "sold" ? "Mark available" : "Mark sold";

        return `
          <article class="inventory-row">
            <div class="vehicle-identity">
              <img class="vehicle-thumb" src="${escapeHTML(image)}"
                alt="${escapeHTML(vehicle.make)} ${escapeHTML(vehicle.model)}"
                loading="lazy">
              <div>
                <div class="vehicle-name">${escapeHTML(vehicle.make)} ${escapeHTML(vehicle.model)}</div>
                <div class="vehicle-location">${escapeHTML(vehicle.location || "Kenya")}</div>
              </div>
            </div>
            <div class="inventory-meta">${formatPrice(vehicle.price)}</div>
            <div class="inventory-meta">${escapeHTML(vehicle.year)}</div>
            <div class="inventory-status ${status === "sold" ? "sold" : ""}">
              ${escapeHTML(status)}
            </div>
            <div class="inventory-actions">
              <button type="button" data-action="status" data-id="${escapeHTML(vehicle.id)}"
                data-status="${nextStatus}">${statusAction}</button>
              <button type="button" class="edit-button" data-action="edit"
                data-id="${escapeHTML(vehicle.id)}">Edit</button>
              <button type="button" class="delete-button" data-action="delete"
                data-id="${escapeHTML(vehicle.id)}">Delete</button>
            </div>
          </article>
        `;
    }).join("");
}

function setVehicles(nextVehicles) {
    vehicles = Array.isArray(nextVehicles) ? nextVehicles : [];
    window.driveHubDatabase?.setCachedVehicles(vehicles);
    renderInventory();
}

function clearVehicleForm() {
    vehicleForm.reset();
    document.getElementById("vehicleId").value = "";
    document.getElementById("vehicleMileage").value = "";
    document.getElementById("vehiclePhone").value = "";
    document.getElementById("vehicleTikTok").value = "";
    renderImagePreview([]);
    vehicleFormTitle.textContent = "Add vehicle";
    saveVehicleButton.textContent = "Add vehicle";
    cancelVehicleEdit.hidden = true;
}

function startEditing(vehicle) {
    document.getElementById("vehicleId").value = vehicle.id;
    document.getElementById("vehicleMake").value = vehicle.make || "";
    document.getElementById("vehicleModel").value = vehicle.model || "";
    document.getElementById("vehiclePrice").value = vehicle.price || "";
    document.getElementById("vehicleYear").value = vehicle.year || "";
    document.getElementById("vehicleMileage").value = vehicle.mileage || "";
    document.getElementById("vehicleEngine").value = vehicle.engine || "";
    document.getElementById("vehicleFuel").value = vehicle.fuel || "";
    document.getElementById("vehicleTransmission").value = vehicle.transmission || "";
    document.getElementById("vehicleLocation").value = vehicle.location || "";
    document.getElementById("vehicleCondition").value = vehicle.condition || "";
    document.getElementById("vehicleFeatures").value = vehicle.description || "";
    document.getElementById("vehiclePhone").value = vehicle.phone || "";
    document.getElementById("vehicleTikTok").value = vehicle.tiktokUrl || "";
    document.getElementById("vehicleImages").value =
        Array.isArray(vehicle.images) ? vehicle.images.join("\n") : "";

    const specifications = vehicle.specifications || {};
    document.getElementById("vehicleSeats").value = specifications.seats || "";
    document.getElementById("vehicleDoors").value = specifications.doors || "";
    document.getElementById("vehicleColour").value = specifications.colour || "";
    document.getElementById("vehicleRegistration").value = specifications.registration || "";
    document.getElementById("vehicleServiceHistory").value =
        specifications.serviceHistory || "";
    document.getElementById("vehicleBodyType").value = specifications.bodyType || "";
    document.getElementById("vehicleDrivetrain").value = specifications.drivetrain || "";

    renderImagePreview(Array.isArray(vehicle.images) ? vehicle.images : []);
    document.querySelector(".optional-fields").open =
        Boolean(vehicle.phone || vehicle.tiktokUrl);
    vehicleFormTitle.textContent = "Edit vehicle";
    saveVehicleButton.textContent = "Save changes";
    cancelVehicleEdit.hidden = false;
    document.getElementById("vehicleEditor").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function formValue(id) {
    return document.getElementById(id).value.trim();
}

function readVehicle(existing) {
    const specifications = {
        seats: formValue("vehicleSeats"),
        doors: formValue("vehicleDoors"),
        colour: formValue("vehicleColour"),
        registration: formValue("vehicleRegistration"),
        serviceHistory: formValue("vehicleServiceHistory"),
        bodyType: formValue("vehicleBodyType"),
        drivetrain: formValue("vehicleDrivetrain")
    };

    Object.keys(specifications).forEach(key => {
        if (!specifications[key]) delete specifications[key];
    });

    return {
        ...(existing || {}),
        id: existing?.id || crypto.randomUUID(),
        make: formValue("vehicleMake"),
        model: formValue("vehicleModel"),
        price: Number(formValue("vehiclePrice")),
        year: Number(formValue("vehicleYear")),
        mileage: Number(formValue("vehicleMileage") || 0),
        engine: formValue("vehicleEngine"),
        fuel: formValue("vehicleFuel"),
        transmission: formValue("vehicleTransmission"),
        location: formValue("vehicleLocation"),
        condition: formValue("vehicleCondition"),
        description: formValue("vehicleFeatures"),
        specifications,
        images: parseVehicleImages(vehicleImageInput.value),
        phone: formValue("vehiclePhone"),
        tiktokUrl: formValue("vehicleTikTok"),
        dealerId: null,
        status: existing?.status || "available",
        featured: Boolean(existing?.featured)
    };
}

vehicleImageInput.addEventListener("input", () => {
    try {
        renderImagePreview(parseVehicleImages(vehicleImageInput.value));
    } catch {
        renderImagePreview([]);
    }
});

vehicleForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!window.driveHubDatabase?.isEnabled()) {
        showToast("Sign in as an authorized admin before saving vehicles.");
        return;
    }

    const id = document.getElementById("vehicleId").value;
    const existing = vehicles.find(vehicle => vehicle.id === id);
    let vehicle;

    try {
        vehicle = readVehicle(existing);
    } catch (error) {
        showToast(error.message);
        return;
    }

    saveVehicleButton.disabled = true;
    saveVehicleButton.textContent = "Saving…";

    try {
        await window.driveHubDatabase.saveVehicle(vehicle, Boolean(existing));
        setVehicles(await window.driveHubDatabase.listVehicles());
        clearVehicleForm();
        showToast(existing ? "Vehicle updated." : "Vehicle added.");
    } catch (error) {
        console.error("Could not save vehicle:", error);
        showToast(error.message || "Could not save vehicle.");
    } finally {
        saveVehicleButton.disabled = false;
        saveVehicleButton.textContent =
            document.getElementById("vehicleId").value ? "Save changes" : "Add vehicle";
    }
});

cancelVehicleEdit.addEventListener("click", clearVehicleForm);

vehicleInventory.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button || !window.driveHubDatabase?.isEnabled()) return;

    const vehicle = vehicles.find(item => item.id === button.dataset.id);
    if (!vehicle) {
        showToast("Vehicle not found.");
        return;
    }

    if (button.dataset.action === "edit") {
        startEditing(vehicle);
        return;
    }

    if (button.dataset.action === "delete" &&
        !window.confirm(`Permanently delete ${vehicle.make} ${vehicle.model}?`)) {
        return;
    }

    button.disabled = true;
    try {
        if (button.dataset.action === "delete") {
            await window.driveHubDatabase.deleteVehicle(vehicle.id);
            showToast("Vehicle deleted.");
            if (document.getElementById("vehicleId").value === vehicle.id) {
                clearVehicleForm();
            }
        } else if (button.dataset.action === "status") {
            await window.driveHubDatabase.updateVehicle(vehicle.id, {
                status: button.dataset.status
            });
            showToast(button.dataset.status === "sold"
                ? "Vehicle marked as sold."
                : "Vehicle marked as available.");
        }

        setVehicles(await window.driveHubDatabase.listVehicles());
    } catch (error) {
        console.error("Could not update inventory:", error);
        showToast(error.message || "Could not update inventory.");
    } finally {
        button.disabled = false;
    }
});

window.setAdminVehicles = setVehicles;
window.toast = showToast;
