import { createClient } from "@neon/neon-js";

const gate = document.getElementById("adminAuthGate");
const message = document.getElementById("adminAuthMessage");
const form = document.getElementById("adminSignInForm");
const resetRequestForm = document.getElementById("passwordResetRequestForm");
const newPasswordForm = document.getElementById("newPasswordForm");
const signInButton = document.getElementById("adminSignInButton");
const resetRequestButton = document.getElementById("resetRequestButton");
const saveNewPasswordButton = document.getElementById("saveNewPasswordButton");
const signOutButton = document.getElementById("adminSignOut");

let client = null;
let cachedVehicles = null;
let authenticated = false;

function showGate(text, showForm) {
    gate.hidden = false;
    document.body.classList.add("admin-auth-pending");
    message.textContent = text;
    form.hidden = !showForm;
    resetRequestForm.hidden = true;
    newPasswordForm.hidden = true;
    signOutButton.hidden = true;
}

function showPasswordResetRequest(text) {
    document.body.classList.add("admin-auth-pending");
    message.textContent = text;
    form.hidden = true;
    resetRequestForm.hidden = false;
    newPasswordForm.hidden = true;
    signOutButton.hidden = true;
}

function showNewPasswordForm(text) {
    document.body.classList.add("admin-auth-pending");
    message.textContent = text;
    form.hidden = true;
    resetRequestForm.hidden = true;
    newPasswordForm.hidden = false;
    signOutButton.hidden = true;
}

function errorText(error, fallback) {
    return error?.message || fallback;
}

function normalizeVehicle(row) {
    return {
        id: row.id,
        make: row.make,
        model: row.model,
        year: Number(row.year),
        price: Number(row.price),
        mileage: Number(row.mileage || 0),
        engine: row.engine || "",
        fuel: row.fuel || "",
        transmission: row.transmission || "",
        condition: row.condition || "",
        location: row.location || "Kenya",
        description: row.description || "",
        images: Array.isArray(row.images) ? row.images : [],
        tiktokUrl: row.tiktok_url || "",
        phone: row.phone || "",
        dealerId: row.dealer_id || null,
        status: row.status,
        featured: Boolean(row.featured),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function databaseVehicle(vehicle) {
    const row = {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: Number(vehicle.year),
        price: Number(vehicle.price),
        mileage: Number(vehicle.mileage || 0),
        engine: vehicle.engine || "",
        fuel: vehicle.fuel || "",
        transmission: vehicle.transmission || "",
        condition: vehicle.condition || "",
        location: vehicle.location || "Kenya",
        description: vehicle.description || "",
        images: vehicle.images || [],
        tiktok_url: vehicle.tiktokUrl || null,
        phone: vehicle.phone || null,
        dealer_id: vehicle.dealerId || null,
        status: vehicle.status || "approved",
        featured: Boolean(vehicle.featured),
        updated_at: new Date().toISOString()
    };

    return row;
}

async function listVehicles() {
    const { data, error } = await client
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(errorText(error, "Could not load vehicles from Neon."));
    }

    cachedVehicles = (Array.isArray(data) ? data : []).map(normalizeVehicle);
    return cachedVehicles;
}

async function saveVehicle(vehicle, existing) {
    const row = databaseVehicle(vehicle);
    const request = existing
        ? client.from("vehicles").update(row).eq("id", vehicle.id)
        : client.from("vehicles").insert(row);
    const { data, error } = await request.select("*").single();

    if (error) {
        throw new Error(errorText(error, "Could not save vehicle to Neon."));
    }

    if (!data) {
        throw new Error("Neon did not return the saved vehicle.");
    }

    return normalizeVehicle(data);
}

async function updateVehicle(id, changes) {
    const { data, error } = await client
        .from("vehicles")
        .update({
            status: changes.status,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select("id")
        .single();

    if (error) {
        throw new Error(errorText(error, "Could not update vehicle in Neon."));
    }

    if (!data) {
        throw new Error("Vehicle was not found or was not updated.");
    }
}

async function deleteVehicle(id) {
    const { data, error } = await client
        .from("vehicles")
        .delete()
        .eq("id", id)
        .select("id")
        .single();

    if (error) {
        throw new Error(errorText(error, "Could not delete vehicle from Neon."));
    }

    if (!data) {
        throw new Error("Vehicle was not found or was not deleted.");
    }
}

function isAdminResult(data) {
    if (data === true) return true;
    if (Array.isArray(data) && data.length === 1) {
        const row = data[0];
        return row === true ||
            (row && Object.values(row).some(value => value === true));
    }
    return Boolean(
        data &&
        typeof data === "object" &&
        Object.values(data).some(value => value === true)
    );
}

async function requireAdmin() {
    const { data, error } = await client.rpc("is_drivehub_admin");

    if (error) {
        throw new Error(
            "Could not verify database admin access. Confirm the schema and allowlist are configured."
        );
    }

    if (!isAdminResult(data)) {
        throw new Error(
            "This account is not on the DRIVE HUB database admin allowlist."
        );
    }
}

async function enterDashboard(user) {
    await requireAdmin();
    const vehicles = await listVehicles();

    authenticated = true;
    window.setAdminVehicles(vehicles);
    document.body.classList.remove("admin-auth-pending");
    gate.hidden = true;
    message.textContent = `Signed in as ${user.email}.`;
    form.hidden = true;
    signOutButton.hidden = false;
}

async function handleSignIn(event) {
    event.preventDefault();
    if (!client) return;

    signInButton.disabled = true;
    message.textContent = "Signing in…";

    try {
        const { error } = await client.auth.signIn.email({
            email: document.getElementById("adminEmail").value.trim(),
            password: document.getElementById("adminPassword").value
        });

        if (error) {
            throw new Error(errorText(error, "Sign-in failed."));
        }

        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError || !data?.user) {
            throw new Error(
                errorText(sessionError, "Sign-in succeeded, but no user session was returned.")
            );
        }

        await enterDashboard(data.user);
    } catch (error) {
        console.error("Admin sign-in failed:", error);
        showGate(error.message, true);
    } finally {
        signInButton.disabled = false;
    }
}

async function handlePasswordResetRequest(event) {
    event.preventDefault();
    if (!client) return;

    resetRequestButton.disabled = true;
    message.textContent = "Sending reset instructions…";

    try {
        const redirectTo = new URL("./admin.html", window.location.href).href;
        const { error } = await client.auth.requestPasswordReset({
            email: document.getElementById("resetEmail").value.trim(),
            redirectTo
        });

        if (error) {
            throw new Error(errorText(error, "Could not request a password reset."));
        }

        showPasswordResetRequest(
            "If an account exists for that email, password reset instructions have been sent."
        );
    } catch (error) {
        console.error("Password reset request failed:", error);
        showPasswordResetRequest(error.message);
    } finally {
        resetRequestButton.disabled = false;
    }
}

async function handleNewPassword(event) {
    event.preventDefault();
    if (!client) return;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
        showGate("This password reset link is invalid or has expired. Request a new one.", true);
        return;
    }

    const password = document.getElementById("newAdminPassword").value;
    const confirmation = document.getElementById("confirmAdminPassword").value;
    if (password !== confirmation) {
        message.textContent = "The passwords do not match.";
        return;
    }

    saveNewPasswordButton.disabled = true;
    message.textContent = "Updating your password…";

    try {
        const { error } = await client.auth.resetPassword({
            newPassword: password,
            token
        });

        if (error) {
            throw new Error(errorText(error, "Could not update your password."));
        }

        window.history.replaceState({}, "", window.location.pathname);
        document.getElementById("adminPassword").value = "";
        document.getElementById("newAdminPassword").value = "";
        document.getElementById("confirmAdminPassword").value = "";
        showGate("Password updated. Sign in with your new password.", true);
    } catch (error) {
        console.error("Password reset failed:", error);
        showNewPasswordForm(error.message);
    } finally {
        saveNewPasswordButton.disabled = false;
    }
}

async function handleSignOut() {
    try {
        const { error } = await client.auth.signOut();
        if (error) {
            throw new Error(errorText(error, "Could not sign out."));
        }
        authenticated = false;
        showGate("You have been signed out.", true);
        document.getElementById("adminPassword").value = "";
    } catch (error) {
        console.error("Admin sign-out failed:", error);
        window.toast(error.message);
    }
}

form.addEventListener("submit", handleSignIn);
resetRequestForm.addEventListener("submit", handlePasswordResetRequest);
newPasswordForm.addEventListener("submit", handleNewPassword);
document.getElementById("forgotPasswordButton").addEventListener("click", () => {
    document.getElementById("resetEmail").value =
        document.getElementById("adminEmail").value.trim();
    showPasswordResetRequest("Enter your account email and we’ll send reset instructions.");
});
document.getElementById("backToSignInFromRequest").addEventListener("click", () => {
    showGate("Sign in with your Neon Auth administrator account.", true);
});
signOutButton.addEventListener("click", handleSignOut);

window.driveHubDatabase = {
    isEnabled: () => Boolean(client && authenticated),
    getCachedVehicles: () => cachedVehicles,
    setCachedVehicles: vehicles => {
        cachedVehicles = Array.isArray(vehicles) ? vehicles : [];
    },
    listVehicles,
    saveVehicle,
    updateVehicle,
    deleteVehicle
};

async function initializeAdminAuth() {
    const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
    const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

    if (!authUrl || !dataApiUrl) {
        showGate(
            "Neon Auth is not configured for this deployment. Set VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL, then rebuild.",
            false
        );
        return;
    }

    try {
        client = createClient({
            auth: { url: authUrl },
            dataApi: { url: dataApiUrl }
        });

        const query = new URLSearchParams(window.location.search);
        if (query.has("error")) {
            window.history.replaceState({}, "", window.location.pathname);
            showGate("This password reset link is invalid or expired. Request a new one.", true);
            return;
        }

        if (query.has("token")) {
            showNewPasswordForm("Choose a new password for your account.");
            return;
        }

        const { data, error } = await client.auth.getSession();
        if (error) {
            throw new Error(errorText(error, "Could not check the sign-in session."));
        }

        if (!data?.session || !data?.user) {
            showGate("Sign in with your Neon Auth administrator account.", true);
            return;
        }

        await enterDashboard(data.user);
    } catch (error) {
        console.error("Admin access check failed:", error);
        showGate(error.message, true);
    }
}

initializeAdminAuth();
