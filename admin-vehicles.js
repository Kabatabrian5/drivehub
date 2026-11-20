"use strict";

const vehicleForm = document.getElementById("vehicleForm");
const vehicleInventory = document.getElementById("vehicleInventory");
const vehicleImageInput = document.getElementById("vehicleImages");
const vehicleImageReview = document.getElementById("vehicleImageReview");
const saveVehicleButton = document.getElementById("saveVehicleButton");
const cancelVehicleEdit = document.getElementById("cancelVehicleEdit");
const vehicleFormTitle = document.getElementById("vehicleFormTitle");
const inventoryCount = document.getElementById("inventoryCount");
const toastElement = document.getElementById("adminToast");

let vehicles = [];
let pendingPhotos = [];
let existingImages = [];
let existingPublicIds = [];
let toastTimer;
const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;

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

async function preparePhoto(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error(`${file.name}: use a JPG, PNG, or WebP image.`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
        throw new Error(`${file.name}: the image must be 12 MB or smaller.`);
    }

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
        1,
        MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
    baseCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
    baseCanvas.getContext("2d").drawImage(
        bitmap,
        0,
        0,
        baseCanvas.width,
        baseCanvas.height
    );
    bitmap.close();

    const canvas = document.createElement("canvas");
    canvas.width = baseCanvas.width;
    canvas.height = baseCanvas.height;

    return {
        file,
        baseCanvas,
        canvas,
        mask: null,
        previewMask: null,
        noPlate: false,
        dragStart: null,
        status: null
    };
}

function drawPhoto(photo) {
    const context = photo.canvas.getContext("2d");
    context.clearRect(0, 0, photo.canvas.width, photo.canvas.height);
    context.drawImage(photo.baseCanvas, 0, 0);

    const mask = photo.previewMask || photo.mask;
    if (!mask) return;

    context.fillStyle = "#17263b";
    context.fillRect(mask.x, mask.y, mask.width, mask.height);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `bold ${Math.max(12, Math.min(24, mask.height * 0.6))}px Arial`;
    context.fillText(
        "DRIVE HUB",
        mask.x + mask.width / 2,
        mask.y + mask.height / 2,
        Math.max(1, mask.width - 6)
    );
}

function drawPhotoCard(photo, index) {
    const card = document.createElement("article");
    card.className = "image-review-card";

    const heading = document.createElement("div");
    heading.className = "image-review-heading";
    const fileName = document.createElement("span");
    fileName.textContent = photo.file.name;
    const removeButton = document.createElement("button");
    removeButton.className = "image-review-remove";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
        pendingPhotos.splice(index, 1);
        renderPhotoReview();
    });
    heading.append(fileName, removeButton);

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "image-review-canvas-wrap";
    photo.canvas.className = "image-review-canvas";
    photo.canvas.setAttribute("aria-label", "Drag over the last three plate characters to cover them.");
    canvasWrap.append(photo.canvas);

    const controls = document.createElement("div");
    controls.className = "image-review-controls";
    const noPlateLabel = document.createElement("label");
    const noPlateCheckbox = document.createElement("input");
    noPlateCheckbox.type = "checkbox";
    noPlateCheckbox.checked = photo.noPlate;
    const noPlateText = document.createElement("span");
    noPlateText.textContent = "No plate visible";
    noPlateLabel.append(noPlateCheckbox, noPlateText);

    const status = document.createElement("span");
    status.className = "image-mask-status";
    status.textContent = photo.noPlate
        ? "No plate will be masked."
        : photo.mask
            ? "Opaque mask applied. Drag again to adjust."
            : "Drag over the last 3 plate characters to mask them.";
    photo.status = status;
    controls.append(noPlateLabel, status);
    card.append(heading, canvasWrap, controls);

    noPlateCheckbox.addEventListener("change", () => {
        photo.noPlate = noPlateCheckbox.checked;
        if (photo.noPlate) {
            photo.mask = null;
            photo.previewMask = null;
        }
        photo.canvas.style.pointerEvents = photo.noPlate ? "none" : "auto";
        drawPhoto(photo);
        status.textContent = photo.noPlate
            ? "No plate will be masked."
            : photo.mask
                ? "Opaque mask applied. Drag again to adjust."
                : "Drag over the last 3 plate characters to mask them.";
    });

    photo.canvas.addEventListener("pointerdown", event => {
        if (photo.noPlate) return;
        event.preventDefault();
        photo.canvas.setPointerCapture(event.pointerId);
        photo.dragStart = getCanvasPoint(photo.canvas, event);
        photo.previewMask = null;
    });

    photo.canvas.addEventListener("pointermove", event => {
        if (!photo.dragStart) return;
        photo.previewMask = makeMask(photo.dragStart, getCanvasPoint(photo.canvas, event));
        drawPhoto(photo);
    });

    photo.canvas.addEventListener("pointerup", event => {
        if (!photo.dragStart) return;
        const end = getCanvasPoint(photo.canvas, event);
        const mask = makeMask(photo.dragStart, end);
        photo.dragStart = null;
        photo.previewMask = null;

        if (mask.width < photo.canvas.width * 0.025 ||
            mask.height < photo.canvas.height * 0.035) {
            status.textContent = "Draw a larger mask over the plate characters.";
            drawPhoto(photo);
            return;
        }

        photo.mask = mask;
        status.textContent = "Opaque mask applied. Drag again to adjust.";
        drawPhoto(photo);
    });

    photo.canvas.addEventListener("pointercancel", () => {
        photo.dragStart = null;
        photo.previewMask = null;
        drawPhoto(photo);
    });

    drawPhoto(photo);
    return card;
}

function getCanvasPoint(canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    return {
        x: Math.max(0, Math.min(canvas.width,
            (event.clientX - bounds.left) * canvas.width / bounds.width)),
        y: Math.max(0, Math.min(canvas.height,
            (event.clientY - bounds.top) * canvas.height / bounds.height))
    };
}

function makeMask(start, end) {
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y)
    };
}

function renderPhotoReview() {
    vehicleImageReview.replaceChildren();

    existingImages.forEach((url, index) => {
        const card = document.createElement("article");
        card.className = "image-review-card";
        const heading = document.createElement("div");
        heading.className = "image-review-heading";
        heading.textContent = `Existing photo ${index + 1}`;
        const image = document.createElement("img");
        image.className = "existing-photo-preview";
        image.src = url;
        image.alt = `Existing vehicle photo ${index + 1}`;
        image.loading = "lazy";
        const status = document.createElement("p");
        status.className = "image-review-controls";
        status.textContent = "This photo will be kept as-is.";
        card.append(heading, image, status);
        vehicleImageReview.append(card);
    });

    pendingPhotos.forEach((photo, index) => {
        vehicleImageReview.append(drawPhotoCard(photo, index));
    });
}

async function requestUploadSignature() {
    const token = await window.driveHubDatabase.getAccessToken();
    if (!token) throw new Error("Your admin session expired. Sign in again.");

    const response = await fetch("/api/cloudinary-signature", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Could not prepare the image upload.");
    }

    return result;
}

async function uploadPendingPhotos(uploaded) {
    for (let index = 0; index < pendingPhotos.length; index += 1) {
        const photo = pendingPhotos[index];
        if (!photo.mask && !photo.noPlate) {
            throw new Error(
                `Review "${photo.file.name}": apply the plate mask or mark no plate visible.`
            );
        }

        saveVehicleButton.textContent =
            `Uploading photo ${index + 1} of ${pendingPhotos.length}…`;
        const signature = await requestUploadSignature();
        const imageBlob = await new Promise((resolve, reject) => {
            photo.canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error(`Could not prepare "${photo.file.name}" for upload.`));
            }, "image/jpeg", 0.9);
        });
        const body = new FormData();
        body.append("file", imageBlob, `${photo.file.name.replace(/\.[^.]+$/, "")}.jpg`);
        body.append("api_key", signature.apiKey);
        body.append("folder", signature.folder);
        body.append("timestamp", String(signature.timestamp));
        body.append("signature", signature.signature);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
            { method: "POST", body }
        );
        const result = await response.json();

        if (!response.ok || !result.secure_url || !result.public_id) {
            throw new Error(
                result.error?.message || `Could not upload "${photo.file.name}".`
            );
        }

        uploaded.push({
            url: result.secure_url,
            publicId: result.public_id
        });
    }
}

async function deleteCloudinaryImages(publicIds) {
    if (!publicIds.length) return;

    const token = await window.driveHubDatabase.getAccessToken();
    if (!token) throw new Error("Your admin session expired. Sign in again.");

    const response = await fetch("/api/cloudinary-delete", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ publicIds })
    });
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Could not remove vehicle photos from Cloudinary.");
    }
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
        const image = images[0];
        const status = vehicle.status || "available";
        const nextStatus = status === "sold" ? "available" : "sold";
        const statusAction = status === "sold" ? "Mark available" : "Mark sold";
        const imageMarkup = image
            ? `<img class="vehicle-thumb" src="${escapeHTML(image)}"
                alt="${escapeHTML(vehicle.make)} ${escapeHTML(vehicle.model)}"
                loading="lazy">`
            : '<div class="vehicle-thumb vehicle-thumb-empty" aria-hidden="true">DH</div>';

        return `
          <article class="inventory-row">
            <div class="vehicle-identity">
              ${imageMarkup}
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
    vehicleImageInput.value = "";
    pendingPhotos = [];
    existingImages = [];
    existingPublicIds = [];
    renderPhotoReview();
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
    vehicleImageInput.value = "";
    pendingPhotos = [];
    existingImages = Array.isArray(vehicle.images) ? [...vehicle.images] : [];
    existingPublicIds = Array.isArray(vehicle.imagePublicIds)
        ? [...vehicle.imagePublicIds]
        : [];

    const specifications = vehicle.specifications || {};
    document.getElementById("vehicleSeats").value = specifications.seats || "";
    document.getElementById("vehicleDoors").value = specifications.doors || "";
    document.getElementById("vehicleColour").value = specifications.colour || "";
    document.getElementById("vehicleRegistration").value = specifications.registration || "";
    document.getElementById("vehicleServiceHistory").value =
        specifications.serviceHistory || "";
    document.getElementById("vehicleBodyType").value = specifications.bodyType || "";
    document.getElementById("vehicleDrivetrain").value = specifications.drivetrain || "";

    renderPhotoReview();
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

function readVehicle(existing, uploadedPhotos) {
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
        images: [
            ...existingImages,
            ...uploadedPhotos.map(photo => photo.url)
        ],
        imagePublicIds: [
            ...existingPublicIds,
            ...uploadedPhotos.map(photo => photo.publicId)
        ],
        phone: formValue("vehiclePhone"),
        tiktokUrl: formValue("vehicleTikTok"),
        dealerId: null,
        status: existing?.status || "available",
        featured: Boolean(existing?.featured)
    };
}

vehicleImageInput.addEventListener("change", async () => {
    const files = Array.from(vehicleImageInput.files || []);
    vehicleImageInput.value = "";
    if (existingImages.length + pendingPhotos.length + files.length > MAX_IMAGES) {
        showToast(`A vehicle can have no more than ${MAX_IMAGES} photos.`);
        return;
    }

    for (const file of files) {
        try {
            pendingPhotos.push(await preparePhoto(file));
        } catch (error) {
            showToast(error.message || `Could not open "${file.name}".`);
        }
    }

    renderPhotoReview();
});

vehicleForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!window.driveHubDatabase?.isEnabled()) {
        showToast("Sign in as an authorized admin before saving vehicles.");
        return;
    }

    const id = document.getElementById("vehicleId").value;
    const existing = vehicles.find(vehicle => vehicle.id === id);
    if (existingImages.length + pendingPhotos.length > MAX_IMAGES) {
        showToast(`A vehicle can have no more than ${MAX_IMAGES} photos.`);
        return;
    }

    saveVehicleButton.disabled = true;
    saveVehicleButton.textContent = "Saving…";
    const uploadedPhotos = [];
    let saved = false;

    try {
        await uploadPendingPhotos(uploadedPhotos);
        const vehicle = readVehicle(existing, uploadedPhotos);
        await window.driveHubDatabase.saveVehicle(vehicle, Boolean(existing));
        saved = true;
        setVehicles(await window.driveHubDatabase.listVehicles());
        clearVehicleForm();
        showToast(existing ? "Vehicle updated." : "Vehicle added.");
    } catch (error) {
        console.error("Could not save vehicle:", error);
        if (saved) {
            showToast("Vehicle saved, but the inventory could not refresh. Reload the page.");
        } else {
            showToast(error.message || "Could not save vehicle.");
            try {
                await deleteCloudinaryImages(uploadedPhotos.map(photo => photo.publicId));
            } catch (cleanupError) {
                console.error("Could not clean up incomplete photo uploads:", cleanupError);
                showToast(
                    "The vehicle was not saved; some uploaded photos could not be cleaned up."
                );
            }
        }
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
            if (document.getElementById("vehicleId").value === vehicle.id) {
                clearVehicleForm();
            }
            let cleanupFailed = false;
            try {
                await deleteCloudinaryImages(vehicle.imagePublicIds || []);
            } catch (error) {
                cleanupFailed = true;
                console.error("Vehicle was deleted but photo cleanup failed:", error);
            }
            setVehicles(await window.driveHubDatabase.listVehicles());
            showToast(cleanupFailed
                ? "Vehicle deleted, but some stored photos need cleanup."
                : "Vehicle and its stored photos deleted.");
            return;
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
