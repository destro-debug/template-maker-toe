(() => {
  "use strict";

  /* ================================================
     DST TOE3 CABIN MAKER
     CABIN-SPECIFIC FUNCTIONALITY
     NORMAL PAGE FORM + TEMPORARY STORAGE
     SUBMISSION PAGE HANDOFF
     ================================================ */

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    form: $("#cabinForm"),
    brand: $("#brandSelect"),
    vehicle: $("#vehicleSelect"),

    skinName: $("#skinName"),
    imageUrl: $("#imageUrl"),
    templateUrl: $("#templateUrl"),
    description: $("#description"),

    imagePreview: $("#imagePreview"),
    templatePreview: $("#templatePreview"),

    imageStatus: $("#imageUrlStatus"),
    templateStatus: $("#templateUrlStatus"),

    counter: $("#descriptionCounter"),
    displayName: $("#displayName"),
    recordId: $("#recordId"),

    generateButton: $("#generateCabinButton"),

    outputSection: $("#cabinOutputSection"),
    output: $("#jsonOutput"),
    outputStatus: $("#cabinOutputStatus"),
    outputIndicator: $("#cabinOutputIndicator"),

    copyButton: $("#copyCabinOutput"),
    clearButton: $("#clearCabinOutput"),

    saveButton: $("#saveCabinToTemporaryStorage"),

    storageSection: $("#cabinTemporaryStorage"),
    storageCount: $("#cabinStorageCount"),
    storageList: $("#cabinStorageList"),
    storageEmpty: $("#cabinStorageEmpty"),

    copyAllButton: $("#copyAllCabinEntries"),
    sendButton: $("#sendCabinToDST"),
    clearStorageButton: $("#clearCabinTemporaryStorage")
  };

  /* ================================================
     VEHICLE DATA
     ================================================ */

  const VEHICLES = {
    dawn: ["Dawn Df"],

    moon: [
      "Moon THA",
      "Moon THX"
    ],

    fiora: ["Fiora Fi-Man"],

    volcano: ["Volcano VN"],

    stream: [
      "Stream ST",
      "Stream RT",
      "Stream RT Legend 1995",
      "Stream RT Legend 2004",
      "Stream RT Legend 2009",
      "Stream RT Legend 2013"
    ],

    renovate: [
      "Renovate R - Ranger 2013",
      "Renovate R - Ranger 2021"
    ],

    merieles: [
      "Merieles Arox",
      "Merieles Antares"
    ],

    ivora: ["Ivora S-LINE"]
  };

  /* ================================================
     STATE
     ================================================ */

  const state = {
    imageValid: false,
    templateValid: false,

    imageCheck: 0,
    templateCheck: 0,

    isGenerating: false,
    isSending: false
  };

  /* ================================================
     TEMPORARY STORAGE CONTROLLER
     ================================================ */

  const storage = window.DST?.temporaryStorage
    ? window.DST.temporaryStorage.create("cabin")
    : null;

  /* ================================================
     BASIC HELPERS
     ================================================ */

  function clean(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function setStatus(element, message) {
    if (!element) return;
    element.textContent = message;
  }

  function showToast(message, type = "info") {
    if (window.DST?.toast?.show) {
      window.DST.toast.show(message, type);
    }
  }

  function setOutputIndicator(hasOutput) {
    if (!elements.outputIndicator) return;

    elements.outputIndicator.textContent = hasOutput
      ? "RECORD READY"
      : "EMPTY";

    elements.outputIndicator.classList.toggle(
      "is-ready",
      Boolean(hasOutput)
    );

    elements.outputIndicator.classList.toggle(
      "is-empty",
      !hasOutput
    );
  }

  function setOutputControls() {
    const hasOutput = Boolean(
      elements.output?.value.trim()
    );

    if (elements.copyButton) {
      elements.copyButton.disabled = !hasOutput;
    }

    if (elements.clearButton) {
      elements.clearButton.disabled = !hasOutput;
    }

    if (elements.saveButton) {
      elements.saveButton.disabled =
        !hasOutput || !storage;
    }

    setOutputIndicator(hasOutput);
  }

  function setButtonState() {
    if (!elements.generateButton) return;

    const valid =
      Boolean(elements.brand.value) &&
      Boolean(elements.vehicle.value) &&
      Boolean(clean(elements.skinName.value)) &&
      Boolean(clean(elements.imageUrl.value)) &&
      Boolean(clean(elements.templateUrl.value)) &&
      Boolean(clean(elements.description.value)) &&
      elements.description.value.length <= 300 &&
      isValidSkinName(elements.skinName.value) &&
      isValidHttpsUrl(elements.imageUrl.value) &&
      isValidHttpsUrl(elements.templateUrl.value) &&
      state.imageValid &&
      state.templateValid;

    elements.generateButton.disabled =
      !valid || state.isGenerating;
  }

  /* ================================================
     SKIN NAME VALIDATION
     ================================================ */

  function isValidSkinName(value) {
    const name = clean(value);

    if (!name || name.length > 100) {
      return false;
    }

    return /^[A-Za-z0-9 &'’-]+$/.test(name);
  }

  /* ================================================
     URL VALIDATION
     ================================================ */

  function isValidHttpsUrl(value) {
    try {
      const url = new URL(clean(value));

      return (
        url.protocol === "https:" &&
        Boolean(url.hostname) &&
        url.hostname.includes(".")
      );
    } catch {
      return false;
    }
  }

  /* ================================================
     ID AND DISPLAY NAME GENERATION
     ================================================ */

  function createDisplayName() {
    const skinName = clean(elements.skinName.value);
    const vehicleName = clean(elements.vehicle.value);

    if (!skinName || !vehicleName) {
      return "";
    }

    return `${skinName} | ${vehicleName}`;
  }

  function normalizeName(value) {
    return clean(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function createRecordId(displayName) {
    if (!displayName) return "";

    return `toe3-${normalizeName(displayName)}`;
  }

  function updateDerivedFields() {
    const displayName = createDisplayName();

    elements.displayName.value = displayName;
    elements.recordId.value = createRecordId(displayName);

    setButtonState();
  }

  /* ================================================
     BRAND AND VEHICLE SELECTION
     ================================================ */

  function populateVehicles(brand) {
    const vehicles = VEHICLES[brand] || [];

    elements.vehicle.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "None";

    elements.vehicle.appendChild(defaultOption);

    vehicles.forEach((vehicleName) => {
      const option = document.createElement("option");

      option.value = vehicleName;
      option.textContent = vehicleName;

      elements.vehicle.appendChild(option);
    });

    elements.vehicle.disabled = vehicles.length === 0;
  }

  function handleBrandChange() {
    populateVehicles(elements.brand.value);

    elements.vehicle.value = "";

    updateDerivedFields();
  }

  /* ================================================
     DESCRIPTION COUNTER
     ================================================ */

  function updateDescriptionCounter() {
    const length = elements.description.value.length;

    elements.counter.textContent = `${length} / 300`;

    elements.counter.classList.toggle(
      "limit-reached",
      length >= 300
    );

    setButtonState();
  }

  /* ================================================
     IMAGE PREVIEWS
     ================================================ */

  function showPreview(container, url) {
    if (!container) return;

    container.replaceChildren();

    if (!url) {
      const placeholder = document.createElement("span");

      placeholder.className = "image-preview-placeholder";
      placeholder.textContent = "Image preview will appear here.";

      container.appendChild(placeholder);
      return;
    }

    const image = document.createElement("img");

    image.src = url;
    image.alt = "Skin image preview";
    image.loading = "lazy";

    image.onerror = () => {
      image.remove();

      const placeholder = document.createElement("span");

      placeholder.className = "image-preview-placeholder";
      placeholder.textContent = "Image preview unavailable.";

      container.appendChild(placeholder);
    };

    container.appendChild(image);
  }

  /* ================================================
     IMAGE URL CHECKING
     ================================================ */

  function checkImage(url) {
    return new Promise((resolve) => {
      const image = new Image();

      let completed = false;

      const finish = (valid) => {
        if (completed) return;

        completed = true;

        clearTimeout(timeout);

        image.onload = null;
        image.onerror = null;

        resolve(valid);
      };

      const timeout = setTimeout(() => {
        finish(false);
      }, 12000);

      image.onload = () => {
        finish(
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        );
      };

      image.onerror = () => {
        finish(false);
      };

      image.src = url;
    });
  }

  async function validateImageField(type) {
    const isMain = type === "main";

    const input = isMain
      ? elements.imageUrl
      : elements.templateUrl;

    const preview = isMain
      ? elements.imagePreview
      : elements.templatePreview;

    const status = isMain
      ? elements.imageStatus
      : elements.templateStatus;

    const stateKey = isMain
      ? "imageValid"
      : "templateValid";

    const checkKey = isMain
      ? "imageCheck"
      : "templateCheck";

    const url = clean(input.value);

    state[checkKey]++;
    const currentCheck = state[checkKey];

    state[stateKey] = false;

    if (!url) {
      showPreview(preview, "");
      setStatus(status, "");
      setButtonState();
      return;
    }

    if (!isValidHttpsUrl(url)) {
      showPreview(preview, "");
      setStatus(status, "Enter a valid HTTPS image URL.");
      setButtonState();
      return;
    }

    setStatus(status, "Checking image...");
    setButtonState();

    const valid = await checkImage(url);

    if (currentCheck !== state[checkKey]) {
      return;
    }

    if (clean(input.value) !== url) {
      return;
    }

    state[stateKey] = valid;

    if (valid) {
      showPreview(preview, url);
      setStatus(status, "Image loaded successfully.");
    } else {
      showPreview(preview, "");
      setStatus(
        status,
        "Unable to load this image. Check the URL and try again."
      );
    }

    setButtonState();
  }

  /* ================================================
     FORM VALIDATION
     ================================================ */

  function validateTextFields() {
    const skinName = clean(elements.skinName.value);
    const description = elements.description.value;

    const skinNameValid = isValidSkinName(skinName);

    elements.skinName.setCustomValidity(
      skinName && !skinNameValid
        ? "Use only letters, numbers, spaces, hyphens, apostrophes and ampersands."
        : ""
    );

    elements.description.setCustomValidity(
      description.length > 300
        ? "Description cannot exceed 300 characters."
        : ""
    );

    return (
      Boolean(elements.brand.value) &&
      Boolean(elements.vehicle.value) &&
      skinNameValid &&
      isValidHttpsUrl(elements.imageUrl.value) &&
      isValidHttpsUrl(elements.templateUrl.value) &&
      Boolean(clean(description)) &&
      description.length <= 300
    );
  }

  /* ================================================
     OUTPUT CONTROLS
     ================================================ */

  function showOutput() {
    if (!elements.outputSection) return;

    elements.outputSection.hidden = false;
    elements.outputSection.style.display = "block";

    setOutputControls();
  }

  function clearOutput() {
    elements.output.value = "";

    // Keep the JSON workspace visible.
    showOutput();

    if (elements.outputStatus) {
      elements.outputStatus.hidden = true;
      elements.outputStatus.textContent = "";
    }

    setOutputControls();
  }

  async function copyOutput() {
    const value = elements.output.value;

    if (!value) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        elements.output.select();

        const copied = document.execCommand("copy");

        if (!copied) {
          throw new Error("Copy command failed.");
        }

        elements.output.setSelectionRange(0, 0);
      }

      elements.outputStatus.hidden = false;
      elements.outputStatus.textContent =
        "JSON copied successfully.";
    } catch {
      elements.outputStatus.hidden = false;
      elements.outputStatus.textContent =
        "Copy failed. Select the JSON and copy it manually.";
    }
  }

  /* ================================================
     RECORD CREATION
     ================================================ */

  function createRecord() {
    const skinName = clean(elements.skinName.value);
    const vehicleName = clean(elements.vehicle.value);
    const displayName = createDisplayName();

    return {
      id: createRecordId(displayName),
      skinName,
      vehicleName,
      displayName,
      partType: "cabin",
      brand: elements.brand.value,
      imageUrl: clean(elements.imageUrl.value),
      templateUrl: clean(elements.templateUrl.value),
      description: clean(elements.description.value)
    };
  }

  /* ================================================
     GENERATE JSON
     ================================================ */

  async function generateRecord(event) {
    event.preventDefault();

    if (state.isGenerating) return;

    if (!validateTextFields()) {
      elements.form.reportValidity();
      return;
    }

    if (!state.imageValid || !state.templateValid) {
      elements.outputStatus.hidden = false;
      elements.outputStatus.textContent =
        "Both images must load successfully before generating.";
      return;
    }

    if (elements.output.value.trim()) {
      const replace = await window.DST.dialog.open({
        title: "Replace current record?",
        message: "A JSON record already exists. Do you want to replace it?",
        confirmText: "Replace Record",
        cancelText: "Keep Current",
        danger: false
      });

      if (!replace) return;
    }

    state.isGenerating = true;
    setButtonState();

    try {
      const record = createRecord();

      elements.output.value = JSON.stringify(record, null, 2);

      showOutput();

      elements.outputStatus.hidden = false;
      elements.outputStatus.textContent =
        "Cabin JSON record generated successfully.";

      elements.outputSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } finally {
      state.isGenerating = false;
      setButtonState();
    }
  }
    /* ================================================
     TEMPORARY STORAGE DISPLAY
     ================================================ */

  function renderTemporaryStorage() {
    if (!storage) {
      if (elements.storageCount) {
        elements.storageCount.textContent = "0";
      }

      if (elements.storageEmpty) {
        elements.storageEmpty.hidden = false;
        elements.storageEmpty.textContent =
          "Temporary Storage is unavailable.";
      }

      if (elements.copyAllButton) {
        elements.copyAllButton.disabled = true;
      }

      if (elements.sendButton) {
        elements.sendButton.disabled = true;
      }

      if (elements.clearStorageButton) {
        elements.clearStorageButton.disabled = true;
      }

      return;
    }

    const entries = storage.getEntries();
    const count = entries.length;

    if (elements.storageCount) {
      elements.storageCount.textContent = String(count);
    }

    if (elements.storageList) {
      elements.storageList.replaceChildren();

      entries.forEach((entry) => {
        const record = entry.record;

        const row = document.createElement("div");
        row.className = "temporary-storage-entry";

        const name = document.createElement("span");
        name.className = "temporary-storage-entry-name";
        name.textContent = record.displayName || "Unnamed Cabin Record";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "temporary-storage-remove";
        removeButton.textContent = "Remove";
        removeButton.setAttribute(
          "aria-label",
          `Remove ${record.displayName || "stored cabin record"}`
        );

        removeButton.addEventListener("click", () => {
          confirmRemoveEntry(record.id, record.displayName);
        });

        row.append(name, removeButton);
        elements.storageList.appendChild(row);
      });
    }

    if (elements.storageEmpty) {
      elements.storageEmpty.hidden = count > 0;
    }

    if (elements.copyAllButton) {
      elements.copyAllButton.disabled = count === 0;
    }

    if (elements.sendButton) {
      elements.sendButton.disabled =
        count === 0 || state.isSending;
    }

    if (elements.clearStorageButton) {
      elements.clearStorageButton.disabled = count === 0;
    }
  }

  /* ================================================
     REMOVE ONE STORED ENTRY
     ================================================ */

  async function confirmRemoveEntry(recordId, displayName) {
    if (!storage || !recordId) return;

    const confirmed = await window.DST.dialog.open({
      title: "Remove stored entry?",
      message: `Are you sure you want to remove "${displayName}" from Temporary Storage?`,
      confirmText: "Delete Entry",
      cancelText: "Cancel",
      danger: true
    });

    if (!confirmed) return;

    const result = storage.remove(recordId);

    if (result === false) {
      showToast("Failed to remove this entry.", "error");
      return;
    }

    renderTemporaryStorage();
    showToast("Entry deleted successfully.", "success");
  }

  /* ================================================
     SAVE CURRENT JSON TO TEMPORARY STORAGE
     ================================================ */

  function saveToTemporaryStorage() {
    if (!storage) {
      showToast("Temporary Storage is unavailable.", "error");
      return;
    }

    const json = elements.output.value.trim();

    if (!json) {
      showToast("Generate a record before saving it.", "info");
      return;
    }

    let record;

    try {
      record = JSON.parse(json);
    } catch {
      showToast("The current JSON is invalid.", "error");
      return;
    }

    const result = storage.save(record);

    if (!result || !result.success) {
      const reason = result?.reason;

      if (reason === "duplicate") {
        showToast("This entry already exists.", "error");
      } else if (reason === "full") {
        showToast("Temporary Storage is full (25/25).", "error");
      } else {
        showToast("Failed to save entry.", "error");
      }

      return;
    }

    // Clear only the generated JSON workspace.
    // The form and its current values remain untouched.
    clearOutput();

    renderTemporaryStorage();
    showToast("Entry saved successfully.", "success");
  }

  /* ================================================
     COPY ALL STORED CABIN RECORDS
     ================================================ */

  async function copyAllEntries() {
    if (!storage) return;

    const entries = storage.getEntries();

    if (!entries.length) {
      showToast("Temporary Storage is empty.", "info");
      return;
    }

    try {
      await storage.copyAll();
      showToast("Data copied successfully.", "success");
    } catch {
      showToast("Unable to copy the stored entries.", "error");
    }
  }

  /* ================================================
     SEND ALL CABIN ENTRIES TO DST
     ================================================ */

  function sendToDST() {
    if (!storage || state.isSending) return;

    // Get every current Cabin record.
    // The storage controller returns record objects only,
    // without savedAt or expiresAt metadata.
    const records = storage.getAllRecords();

    if (!Array.isArray(records) || records.length === 0) {
      showToast("Temporary Storage is empty.", "info");
      renderTemporaryStorage();
      return;
    }

    state.isSending = true;
    renderTemporaryStorage();

    try {
      // Shared handoff format used by Cabin and Trailer.
      // The submit page receives only the actual skin records.
      const payload = {
        records
      };

      sessionStorage.setItem(
        "dst-toe3-submission-payload",
        JSON.stringify(payload)
      );

      // Temporary Storage is deliberately left untouched.
      window.location.href = "submit.html";

    } catch (error) {
      state.isSending = false;
      renderTemporaryStorage();

      showToast(
        "Unable to prepare your submission. Please try again.",
        "error"
      );
    }
  }

  /* ================================================
     CLEAR ALL TEMPORARY STORAGE
     ================================================ */

  async function clearTemporaryStorage() {
    if (!storage) return;

    const entries = storage.getEntries();

    if (!entries.length) {
      renderTemporaryStorage();
      return;
    }

    const confirmed = await window.DST.dialog.open({
      title: "Clear Temporary Storage?",
      message:
        "This will permanently remove every stored Cabin entry. Your current JSON workspace and form will not be affected.",
      confirmText: "Clear Storage",
      cancelText: "Cancel",
      danger: true
    });

    if (!confirmed) return;

    const result = storage.clear();

    if (result === false) {
      showToast("Failed to clear Temporary Storage.", "error");
      return;
    }

    renderTemporaryStorage();
    showToast("Temporary Storage cleared.", "success");
  }

  /* ================================================
     RESET FORM
     ================================================ */

  function resetForm() {
    // Invalidate image checks already in progress.
    state.imageCheck++;
    state.templateCheck++;

    state.imageValid = false;
    state.templateValid = false;

    // Clear manual text inputs.
    elements.skinName.value = "";
    elements.imageUrl.value = "";
    elements.templateUrl.value = "";
    elements.description.value = "";

    // Restore dropdowns to None.
    elements.brand.value = "";

    populateVehicles("");

    elements.vehicle.value = "";
    elements.vehicle.disabled = true;

    // Clear validation messages.
    elements.skinName.setCustomValidity("");
    elements.description.setCustomValidity("");

    // Restore image placeholders and clear statuses.
    showPreview(elements.imagePreview, "");
    showPreview(elements.templatePreview, "");

    setStatus(elements.imageStatus, "");
    setStatus(elements.templateStatus, "");

    // Reset description counter and derived fields.
    elements.counter.textContent = "0 / 300";
    elements.counter.classList.remove("limit-reached");

    elements.displayName.value = "";
    elements.recordId.value = "";

    setButtonState();

    elements.brand.focus();

    // Generated JSON and Temporary Storage are preserved.
  }

  /* ================================================
     TEMPORARY STORAGE EVENTS
     ================================================ */

  window.addEventListener(
    "dst:temporary-storage-change",
    (event) => {
      const changedPartType = event.detail?.partType;

      if (!changedPartType || changedPartType === "cabin") {
        renderTemporaryStorage();
      }
    }
  );

  /* ================================================
     EVENT LISTENERS
     ================================================ */

  elements.brand.addEventListener(
    "change",
    handleBrandChange
  );

  elements.vehicle.addEventListener(
    "change",
    updateDerivedFields
  );

  elements.skinName.addEventListener("input", () => {
    updateDerivedFields();
    validateTextFields();
  });

  elements.description.addEventListener(
    "input",
    updateDescriptionCounter
  );

  elements.imageUrl.addEventListener("input", () => {
    validateImageField("main");
  });

  elements.templateUrl.addEventListener("input", () => {
    validateImageField("template");
  });

  elements.form.addEventListener(
    "submit",
    generateRecord
  );

  elements.form.addEventListener("reset", (event) => {
    event.preventDefault();
    resetForm();
  });

  elements.copyButton.addEventListener(
    "click",
    copyOutput
  );

  elements.clearButton.addEventListener(
    "click",
    clearOutput
  );

  if (elements.saveButton) {
    elements.saveButton.addEventListener(
      "click",
      saveToTemporaryStorage
    );
  }

  if (elements.copyAllButton) {
    elements.copyAllButton.addEventListener(
      "click",
      copyAllEntries
    );
  }

  if (elements.sendButton) {
    elements.sendButton.addEventListener(
      "click",
      sendToDST
    );
  }

  if (elements.clearStorageButton) {
    elements.clearStorageButton.addEventListener(
      "click",
      clearTemporaryStorage
    );
  }

  /* ================================================
     INITIALIZATION
     ================================================ */

  populateVehicles("");

  elements.vehicle.disabled = true;

  // The JSON workspace remains permanently visible.
  showOutput();

  elements.generateButton.disabled = true;

  showPreview(elements.imagePreview, "");
  showPreview(elements.templatePreview, "");

  updateDescriptionCounter();
  updateDerivedFields();

  setOutputControls();
  renderTemporaryStorage();

})();