(() => {
  "use strict";

  const form = document.getElementById("trailerForm");

  // This script only runs on the Trailer editor page.
  if (!form) return;

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    vehicle: $("#vehicleSelect"),
    skinName: $("#skinName"),
    imageUrl: $("#imageUrl"),
    templateUrl: $("#templateUrl"),
    description: $("#description"),

    imagePreview: $("#imagePreview"),
    templatePreview: $("#templatePreview"),

    imageStatus: $("#imageUrlStatus"),
    templateStatus: $("#templateUrlStatus"),

    descriptionCounter: $("#descriptionCounter"),

    displayName: $("#displayName"),
    recordId: $("#recordId"),

    generateButton: $("#generateTrailerButton"),

    outputSection: $("#trailerOutputSection"),
    output: $("#jsonOutput"),
    outputStatus: $("#trailerOutputStatus"),
    outputIndicator: $("#trailerOutputIndicator"),

    copyButton: $("#copyTrailerOutput"),
    clearButton: $("#clearTrailerOutput"),

    saveButton: $("#saveTrailerToTemporaryStorage"),

    storageSection: $("#trailerTemporaryStorage"),
    storageCount: $("#trailerStorageCount"),
    storageList: $("#trailerStorageList"),
    storageEmpty: $("#trailerStorageEmpty"),

    copyAllButton: $("#copyAllTrailerEntries"),
    sendButton: $("#sendTrailerToDST"),
    clearStorageButton: $("#clearTrailerTemporaryStorage")
  };

  // --------------------------------------------------
  // TEMPORARY STORAGE CONTROLLER
  // --------------------------------------------------

  const storage = window.DST?.temporaryStorage
    ? window.DST.temporaryStorage.create("trailer")
    : null;


  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const imageState = {
    imageUrl: {
      url: "",
      loaded: false,
      checking: false,
      request: 0
    },

    templateUrl: {
      url: "",
      loaded: false,
      checking: false,
      request: 0
    }
  };

  let isGenerating = false;
  let generationRequest = 0;
  let isSending = false;


  // --------------------------------------------------
  // GENERAL HELPERS
  // --------------------------------------------------

  function clean(value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }


  function normalizeName(value) {
    return clean(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }


  function isValidSkinName(value) {
    const name = clean(value);

    return (
      name.length > 0 &&
      name.length <= 100 &&
      /^[A-Za-z0-9 &'’-]+$/.test(name)
    );
  }


  function isValidImageUrl(value) {
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


  function setStatus(element, message) {
    if (!element) return;

    element.textContent = message;
  }


  function show(element) {
    if (!element) return;

    element.hidden = false;
  }


  function hide(element) {
    if (!element) return;

    element.hidden = true;
  }


  function showToast(message, type = "info") {
    if (window.DST?.toast?.show) {
      window.DST.toast.show(message, type);
    }
  }


  // --------------------------------------------------
  // OUTPUT INDICATOR AND BUTTON STATES
  // --------------------------------------------------

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


  // --------------------------------------------------
  // IMAGE PREVIEWS
  // --------------------------------------------------

  function setPlaceholder(preview, message) {
    if (!preview) return;

    const placeholder = document.createElement("span");

    placeholder.className = "image-preview-placeholder";
    placeholder.textContent = message;

    preview.replaceChildren(placeholder);
  }


  function setPreviewImage(preview, url, alt) {
    if (!preview) return;

    const image = document.createElement("img");

    image.src = url;
    image.alt = alt;
    image.loading = "lazy";

    preview.replaceChildren(image);
  }


  function resetImageState(fieldName) {
    const state = imageState[fieldName];

    state.request++;
    state.url = "";
    state.loaded = false;
    state.checking = false;
  }


  async function checkImage(fieldName) {
    const input = elements[fieldName];

    const preview =
      fieldName === "imageUrl"
        ? elements.imagePreview
        : elements.templatePreview;

    const status =
      fieldName === "imageUrl"
        ? elements.imageStatus
        : elements.templateStatus;

    const state = imageState[fieldName];
    const url = clean(input.value);

    resetImageState(fieldName);

    const request = state.request;

    if (!url) {
      setPlaceholder(
        preview,
        fieldName === "imageUrl"
          ? "Finished skin preview will appear here."
          : "Skin texture preview will appear here."
      );

      setStatus(status, "");
      updateFormValidity();

      return false;
    }

    if (!isValidImageUrl(url)) {
      setPlaceholder(preview, "Invalid image URL.");
      setStatus(status, "Enter a valid HTTPS image URL.");

      updateFormValidity();

      return false;
    }

    state.url = url;
    state.checking = true;

    setStatus(status, "Checking image...");
    updateFormValidity();

    return new Promise((resolve) => {
      const image = new Image();

      let completed = false;
      let timeout;

      const finish = (success) => {
        if (completed) return;

        completed = true;

        clearTimeout(timeout);

        if (state.request !== request) {
          resolve(false);
          return;
        }

        state.checking = false;
        state.loaded = success;

        if (success) {
          setPreviewImage(
            preview,
            url,
            fieldName === "imageUrl"
              ? "Finished trailer skin preview"
              : "Trailer skin texture preview"
          );

          setStatus(status, "Image loaded successfully.");
        } else {
          setPlaceholder(preview, "Image could not be loaded.");

          setStatus(
            status,
            "Unable to load this image. Check the link and try again."
          );
        }

        updateFormValidity();

        resolve(success);
      };

      timeout = setTimeout(() => {
        finish(false);
      }, 12000);

      image.onload = () => finish(true);
      image.onerror = () => finish(false);

      image.src = url;
    });
  }


  function handleImageInput(fieldName) {
    const input = elements[fieldName];
    const state = imageState[fieldName];

    const currentUrl = clean(input.value);

    if (
      currentUrl === state.url &&
      (state.loaded || state.checking)
    ) {
      updateFormValidity();
      return;
    }

    resetImageState(fieldName);

    const preview =
      fieldName === "imageUrl"
        ? elements.imagePreview
        : elements.templatePreview;

    const status =
      fieldName === "imageUrl"
        ? elements.imageStatus
        : elements.templateStatus;

    setPlaceholder(
      preview,
      fieldName === "imageUrl"
        ? "Finished skin preview will appear here."
        : "Skin texture preview will appear here."
    );

    setStatus(status, "");

    updateFormValidity();
  }


  // --------------------------------------------------
  // AUTOMATIC DISPLAY NAME AND ID
  // --------------------------------------------------

  function updateDerivedFields() {
    const skinName = clean(elements.skinName.value);
    const vehicleName = clean(elements.vehicle.value);

    const displayName =
      skinName && vehicleName
        ? `${skinName} | ${vehicleName}`
        : "";

    const normalizedName = normalizeName(displayName);

    const id = normalizedName
      ? `toe3-${normalizedName}`
      : "";

    elements.displayName.value = displayName;
    elements.recordId.value = id;

    return {
      displayName,
      id
    };
  }


  // --------------------------------------------------
  // DESCRIPTION COUNTER
  // --------------------------------------------------

  function updateDescriptionCounter() {
    const length = elements.description.value.length;

    elements.descriptionCounter.textContent =
      `${length} / 300`;

    elements.descriptionCounter.classList.toggle(
      "limit-reached",
      length >= 300
    );
  }


  // --------------------------------------------------
  // FORM VALIDATION
  // --------------------------------------------------

  function validateFields() {
    const vehicleName = clean(elements.vehicle.value);
    const skinName = clean(elements.skinName.value);
    const description = clean(elements.description.value);

    const derived = updateDerivedFields();

    const validVehicle = Boolean(vehicleName);

    const validSkinName =
      skinName.length > 0 &&
      skinName.length <= 100 &&
      isValidSkinName(skinName);

    const validDescription =
      description.length > 0 &&
      description.length <= 300;

    const validImageUrl =
      isValidImageUrl(elements.imageUrl.value);

    const validTemplateUrl =
      isValidImageUrl(elements.templateUrl.value);

    const imageReady =
      validImageUrl &&
      imageState.imageUrl.loaded &&
      imageState.imageUrl.url === clean(elements.imageUrl.value);

    const templateReady =
      validTemplateUrl &&
      imageState.templateUrl.loaded &&
      imageState.templateUrl.url === clean(elements.templateUrl.value);

    const validDerived =
      Boolean(derived.displayName && derived.id);

    return (
      validVehicle &&
      validSkinName &&
      validDescription &&
      imageReady &&
      templateReady &&
      validDerived &&
      !imageState.imageUrl.checking &&
      !imageState.templateUrl.checking
    );
  }


  function updateFormValidity() {
    if (!elements.generateButton) return;

    elements.generateButton.disabled =
      isGenerating || !validateFields();
  }


  // --------------------------------------------------
  // FORM EVENTS
  // --------------------------------------------------

  elements.vehicle.addEventListener("change", () => {
    updateDerivedFields();
    updateFormValidity();
  });


  elements.skinName.addEventListener("input", () => {
    updateDerivedFields();
    updateFormValidity();
  });


  elements.description.addEventListener("input", () => {
    updateDescriptionCounter();
    updateFormValidity();
  });


  elements.imageUrl.addEventListener("input", () => {
    handleImageInput("imageUrl");
  });


  elements.templateUrl.addEventListener("input", () => {
    handleImageInput("templateUrl");
  });


  elements.imageUrl.addEventListener("blur", () => {
    checkImage("imageUrl");
  });


  elements.templateUrl.addEventListener("blur", () => {
    checkImage("templateUrl");
  });


  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  form.addEventListener("reset", () => {
    // Invalidate any image checks and pending generation.
    generationRequest++;

    isGenerating = false;

    resetImageState("imageUrl");
    resetImageState("templateUrl");

    // Let the browser perform its normal form reset,
    // then restore the editor's required default state.
    setTimeout(() => {
      elements.vehicle.value = "";

      elements.skinName.value = "";
      elements.imageUrl.value = "";
      elements.templateUrl.value = "";
      elements.description.value = "";

      elements.displayName.value = "";
      elements.recordId.value = "";

      setPlaceholder(
        elements.imagePreview,
        "Finished skin preview will appear here."
      );

      setPlaceholder(
        elements.templatePreview,
        "Skin texture preview will appear here."
      );

      setStatus(elements.imageStatus, "");
      setStatus(elements.templateStatus, "");

      if (elements.generateButton) {
        elements.generateButton.innerHTML =
          'Generate JSON <span aria-hidden="true">→</span>';
      }

      updateDescriptionCounter();
      updateFormValidity();

      elements.vehicle.focus();
    }, 0);

    // Generated JSON and Temporary Storage are preserved.
  });


  // --------------------------------------------------
  // OUTPUT STATUS
  // --------------------------------------------------

  function outputMessage(message) {
    if (!elements.outputStatus) return;

    elements.outputStatus.textContent = message;

    show(elements.outputStatus);
  }


  function showOutput() {
    if (!elements.outputSection) return;

    elements.outputSection.hidden = false;
    elements.outputSection.style.display = "block";

    setOutputControls();
  }


  function clearOutput() {
    elements.output.value = "";

    // Keep the JSON workspace permanently visible.
    showOutput();

    hide(elements.outputStatus);

    if (elements.outputStatus) {
      elements.outputStatus.textContent = "";
    }

    setOutputControls();
  }


  // --------------------------------------------------
  // GENERATE JSON
  // --------------------------------------------------

  async function generateRecord() {
    if (isGenerating || !validateFields()) {
      updateFormValidity();
      return;
    }

    if (elements.output.value.trim()) {
      const replace = await window.DST.dialog.open({
        title: "Replace current record?",
        message:
          "A JSON record already exists. Do you want to replace the existing record?",
        confirmText: "Replace Record",
        cancelText: "Keep Current",
        danger: false
      });

      if (!replace) return;
    }

    isGenerating = true;

    const request = ++generationRequest;

    elements.generateButton.disabled = true;
    elements.generateButton.textContent = "Checking images...";

    try {
      const imageLoaded = await checkImage("imageUrl");

      if (request !== generationRequest) return;

      if (!imageLoaded) return;

      const templateLoaded = await checkImage("templateUrl");

      if (request !== generationRequest) return;

      if (!templateLoaded) return;

      // Ensure the current form still matches the validated images.
      if (!validateFields()) return;

      const derived = updateDerivedFields();

      const record = {
        id: derived.id,
        skinName: clean(elements.skinName.value),
        vehicleName: clean(elements.vehicle.value),
        displayName: derived.displayName,
        partType: "trailer",
        imageUrl: clean(elements.imageUrl.value),
        templateUrl: clean(elements.templateUrl.value),
        description: clean(elements.description.value)
      };

      elements.output.value = JSON.stringify(record, null, 2);

      showOutput();

      outputMessage("Trailer JSON record generated successfully.");

      elements.outputSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      outputMessage(
        "Something went wrong while generating the JSON record."
      );

    } finally {
      if (request === generationRequest) {
        isGenerating = false;

        elements.generateButton.innerHTML =
          'Generate JSON <span aria-hidden="true">→</span>';

        updateFormValidity();
      }
    }
  }


  form.addEventListener("submit", (event) => {
    event.preventDefault();

    generateRecord();
  });


  // --------------------------------------------------
  // TEMPORARY STORAGE DISPLAY
  // --------------------------------------------------

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

      if (elements.clearStorageButton) {
        elements.clearStorageButton.disabled = true;
      }

      if (elements.sendButton) {
        elements.sendButton.disabled = true;
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
        name.textContent =
          record.displayName || "Unnamed Trailer Record";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "temporary-storage-remove";
        removeButton.textContent = "Remove";

        removeButton.setAttribute(
          "aria-label",
          `Remove ${record.displayName || "stored trailer record"}`
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

    if (elements.clearStorageButton) {
      elements.clearStorageButton.disabled = count === 0;
    }

    if (elements.sendButton) {
      elements.sendButton.disabled =
        count === 0 || isSending;
    }
  }


  // --------------------------------------------------
  // REMOVE ONE STORED ENTRY
  // --------------------------------------------------

  async function confirmRemoveEntry(recordId, displayName) {
    if (!storage || !recordId) return;

    const confirmed = await window.DST.dialog.open({
      title: "Remove stored entry?",
      message:
        `Are you sure you want to remove "${displayName}" from Temporary Storage?`,
      confirmText: "Delete Entry",
      cancelText: "Cancel",
      danger: true
    });

    if (!confirmed) return;

    const result = storage.remove(recordId);

    if (result === false || result?.success === false) {
      showToast("Failed to remove this entry.", "error");
      return;
    }

    renderTemporaryStorage();
    showToast("Entry deleted successfully.", "success");
  }
    // --------------------------------------------------
  // SAVE CURRENT JSON TO TEMPORARY STORAGE
  // --------------------------------------------------

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

      // Keep the current JSON untouched when saving fails.
      return;
    }

    // Clear only the generated JSON workspace.
    // The form and its current values remain untouched.
    clearOutput();

    renderTemporaryStorage();
    showToast("Entry saved successfully.", "success");
  }


  // --------------------------------------------------
  // COPY ALL STORED TRAILER RECORDS
  // --------------------------------------------------

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


  // --------------------------------------------------
  // SEND ALL TRAILER ENTRIES TO DST
  // --------------------------------------------------

  function sendToDST() {
    if (!storage || isSending) return;

    const records = storage.getAllRecords();

    if (!Array.isArray(records) || records.length === 0) {
      showToast("Temporary Storage is empty.", "info");
      renderTemporaryStorage();
      return;
    }

    try {
      isSending = true;
      renderTemporaryStorage();

      // Transfer only the actual skin records.
      // Storage metadata is not included.
      const payload = {
        records
      };

      sessionStorage.setItem(
        "dst-toe3-submission-payload",
        JSON.stringify(payload)
      );

      // Temporary Storage remains untouched.
      window.location.href = "submit.html";

    } catch (error) {
      isSending = false;

      renderTemporaryStorage();

      showToast(
        "Unable to prepare your submission. Please try again.",
        "error"
      );
    }
  }


  // --------------------------------------------------
  // CLEAR ALL TEMPORARY STORAGE
  // --------------------------------------------------

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
        "This will permanently remove every stored Trailer entry. Your current JSON workspace and form will not be affected.",
      confirmText: "Clear Storage",
      cancelText: "Cancel",
      danger: true
    });

    if (!confirmed) return;

    const result = storage.clear();

    if (result === false || result?.success === false) {
      showToast("Failed to clear Temporary Storage.", "error");
      return;
    }

    renderTemporaryStorage();
    showToast("Temporary Storage cleared.", "success");
  }


  // --------------------------------------------------
  // COPY JSON
  // --------------------------------------------------

  async function copyOutput() {
    const value = elements.output.value;

    if (!value.trim()) {
      outputMessage("There is no JSON record to copy.");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        elements.output.focus();
        elements.output.select();

        const copied = document.execCommand("copy");

        if (!copied) {
          throw new Error("Copy command failed.");
        }

        elements.output.setSelectionRange(0, 0);
      }

      outputMessage("JSON copied successfully.");

    } catch {
      elements.output.focus();
      elements.output.select();

      outputMessage(
        "Copy failed. Select and copy the JSON manually."
      );
    }
  }


  elements.copyButton.addEventListener("click", copyOutput);


  // --------------------------------------------------
  // CLEAR OUTPUT
  // --------------------------------------------------

  elements.clearButton.addEventListener("click", () => {
    if (!elements.output.value.trim()) return;

    clearOutput();
  });


  // --------------------------------------------------
  // TEMPORARY STORAGE EVENTS
  // --------------------------------------------------

  window.addEventListener(
    "dst:temporary-storage-change",
    (event) => {
      const changedPartType = event.detail?.partType;

      if (!changedPartType || changedPartType === "trailer") {
        renderTemporaryStorage();
      }
    }
  );


  // --------------------------------------------------
  // TEMPORARY STORAGE BUTTON EVENTS
  // --------------------------------------------------

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


  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  setPlaceholder(
    elements.imagePreview,
    "Finished skin preview will appear here."
  );

  setPlaceholder(
    elements.templatePreview,
    "Skin texture preview will appear here."
  );

  updateDerivedFields();
  updateDescriptionCounter();
  updateFormValidity();

  // Keep the generated JSON workspace visible.
  showOutput();

  setOutputControls();

  // Load existing entries and prune expired entries.
  renderTemporaryStorage();

})();