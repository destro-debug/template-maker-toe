(() => {
  "use strict";

  // --------------------------------------------------
  // CONFIGURATION
  // --------------------------------------------------

  const CONFIG = {
    endpoint: "https://silentforms.com/api/submit",

    accessKey:
      "6e05ba35768cf73b5c649837de4114830a55f938396e851f6e0499124a00f627",

    storageKey: "dst-toe3-submission-payload",

    progressKey: "dst-toe3-submission-progress",

    maxRecords: 25,

    maxPayloadBytes: 1024 * 1024,

    requestTimeout: 30000
  };


  // --------------------------------------------------
  // ELEMENTS
  // --------------------------------------------------

  const elements = {
    formSection: document.getElementById("submitFormSection"),
    emptyState: document.getElementById("submitEmptyState"),

    form: document.getElementById("dstSubmissionForm"),

    name: document.getElementById("submissionName"),
    message: document.getElementById("submissionMessage"),
    code: document.getElementById("submissionCode"),

    recordCount: document.getElementById("submitRecordCount"),
    cabinCount: document.getElementById("submitCabinCount"),
    trailerCount: document.getElementById("submitTrailerCount"),

    sendButton: document.getElementById("submitSendButton"),
    buttonText: document.getElementById("submitButtonText"),

    status: document.getElementById("submitStatus")
  };


  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  let records = [];

  let isSending = false;

  let hasSubmitted = false;

  let submissionProgress = {
    submissionId: "",
    completedBatches: [],
    name: "",
    message: ""
  };


  // --------------------------------------------------
  // GENERAL HELPERS
  // --------------------------------------------------

  function clean(value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }


  function show(element) {
    if (!element) return;

    element.hidden = false;
  }


  function hide(element) {
    if (!element) return;

    element.hidden = true;
  }


  function setStatus(message, type = "info") {
    if (!elements.status) return;

    elements.status.textContent = message;

    elements.status.className = "submit-status is-visible";

    if (type === "success") {
      elements.status.classList.add("is-success");
    } else if (type === "error") {
      elements.status.classList.add("is-error");
    }
  }


  function setSendingState(sending) {
    isSending = sending;

    if (elements.sendButton) {
      elements.sendButton.disabled =
        sending || hasSubmitted || records.length === 0;
    }

    if (elements.buttonText) {
      elements.buttonText.textContent = sending
        ? "Sending batches..."
        : hasSubmitted
          ? "Submission sent"
          : "Send submission";
    }
  }


  function getPayloadByteLength(value) {
    return new TextEncoder().encode(value).length;
  }


  function createSubmissionId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      "dst-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }


  // --------------------------------------------------
  // LOAD SUBMISSION PAYLOAD
  // --------------------------------------------------

  function readSubmissionPayload() {
    let rawPayload;

    try {
      rawPayload = sessionStorage.getItem(CONFIG.storageKey);
    } catch {
      return {
        success: false,
        reason: "storage"
      };
    }

    if (!rawPayload) {
      return {
        success: false,
        reason: "empty"
      };
    }

    let payload;

    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return {
        success: false,
        reason: "invalid"
      };
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !Array.isArray(payload.records)
    ) {
      return {
        success: false,
        reason: "invalid"
      };
    }

    if (
      payload.records.length === 0 ||
      payload.records.length > CONFIG.maxRecords
    ) {
      return {
        success: false,
        reason: "count"
      };
    }

    const validRecords = payload.records.every((record) => {
      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record)
      ) {
        return false;
      }

      return (
        typeof record.id === "string" &&
        record.id.trim().length > 0 &&
        typeof record.displayName === "string" &&
        record.displayName.trim().length > 0 &&
        (
          record.partType === "cabin" ||
          record.partType === "trailer"
        )
      );
    });

    if (!validRecords) {
      return {
        success: false,
        reason: "records"
      };
    }

    return {
      success: true,
      records: payload.records
    };
  }


  // --------------------------------------------------
  // SUBMISSION PROGRESS
  // --------------------------------------------------

  function readSubmissionProgress() {
    try {
      const raw = sessionStorage.getItem(CONFIG.progressKey);

      if (!raw) return null;

      const saved = JSON.parse(raw);

      if (
        !saved ||
        typeof saved.submissionId !== "string" ||
        !Array.isArray(saved.completedBatches) ||
        typeof saved.name !== "string" ||
        typeof saved.message !== "string"
      ) {
        return null;
      }

      const validBatches = saved.completedBatches.every(
        (batch) =>
          Number.isInteger(batch) &&
          batch >= 1 &&
          batch <= 3
      );

      if (!validBatches) return null;

      return {
        submissionId: saved.submissionId,
        completedBatches: [...new Set(saved.completedBatches)],
        name: saved.name,
        message: saved.message
      };

    } catch {
      return null;
    }
  }


  function saveSubmissionProgress() {
    try {
      sessionStorage.setItem(
        CONFIG.progressKey,
        JSON.stringify(submissionProgress)
      );

      return true;

    } catch {
      return false;
    }
  }


  // --------------------------------------------------
  // RECORD COUNTS
  // --------------------------------------------------

  function updateRecordCounts() {
    const cabinTotal = records.filter(
      (record) => record.partType === "cabin"
    ).length;

    const trailerTotal = records.filter(
      (record) => record.partType === "trailer"
    ).length;

    if (elements.recordCount) {
      elements.recordCount.textContent = String(records.length);
    }

    if (elements.cabinCount) {
      elements.cabinCount.textContent = String(cabinTotal);
    }

    if (elements.trailerCount) {
      elements.trailerCount.textContent = String(trailerTotal);
    }
  }


  // --------------------------------------------------
  // PREPARE JSON DISPLAY
  // --------------------------------------------------

  function displayRecords() {
    if (!elements.code) return;

    elements.code.value = JSON.stringify(records, null, 2);
  }


  // --------------------------------------------------
  // EMPTY / INVALID SUBMISSION STATE
  // --------------------------------------------------

  function showEmptyState(message) {
    hide(elements.formSection);
    show(elements.emptyState);

    if (elements.emptyState) {
      const paragraph = elements.emptyState.querySelector("p");

      if (paragraph && message) {
        paragraph.textContent = message;
      }
    }
  }


  // --------------------------------------------------
  // BUILD INDIVIDUAL BATCHES
  // --------------------------------------------------

  function buildBatchData(batchNumber) {
    const common = {
      accessKey: CONFIG.accessKey,

      subject:
        `DST TOE3 Skin Submission - Batch ${batchNumber} of 3`,

      submissionId: submissionProgress.submissionId,

      sf_extra: ""
    };

    if (batchNumber === 1) {
      return {
        ...common,
        name: submissionProgress.name
      };
    }

    if (batchNumber === 2) {
      return {
        ...common,
        message: submissionProgress.message
      };
    }

    if (batchNumber === 3) {
      return {
        ...common,
        code: JSON.stringify(records, null, 2)
      };
    }

    throw new Error("Unknown submission batch.");
  }
    // --------------------------------------------------
  // SEND ONE BATCH
  // --------------------------------------------------

  async function sendBatch(batchNumber, requestBody) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, CONFIG.requestTimeout);

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: requestBody,

        signal: controller.signal
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The submission service returned an unreadable response."
        );
      }

      const successful =
        response.ok &&
        (
          result?.status === "success" ||
          result?.success === true ||
          result?.ok === true
        );

      if (!successful) {
        throw new Error(
          result?.message ||
          result?.errors?.[0]?.message ||
          `HTTP ${response.status}`
        );
      }

    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The request timed out.");
      }

      if (!navigator.onLine) {
        throw new Error(
          "You appear to be offline. Check your connection."
        );
      }

      throw error;

    } finally {
      clearTimeout(timeout);
    }
  }


  // --------------------------------------------------
  // INITIALIZE SUBMISSION PROGRESS
  // --------------------------------------------------

  function initializeProgress() {
    const saved = readSubmissionProgress();

    if (!saved) return;

    submissionProgress = saved;

    if (elements.name) {
      elements.name.value = saved.name;
    }

    if (elements.message) {
      elements.message.value = saved.message;
    }

    if (saved.completedBatches.length === 3) {
      hasSubmitted = true;

      try {
        sessionStorage.removeItem(CONFIG.storageKey);
        sessionStorage.removeItem(CONFIG.progressKey);
      } catch {
        // The confirmed submission remains successful.
      }

      setSendingState(false);

      setStatus(
        "Your submission has been sent successfully! Please check the main site on Monday or Thursday for updates.",
        "success"
      );

      return;
    }

    if (saved.completedBatches.length > 0) {
      const completed = saved.completedBatches.length;

      setStatus(
        `${completed} of 3 batches were already sent. Press Send submission to continue with the remaining batches.`
      );
    }
  }


  // --------------------------------------------------
  // INITIALIZE PAGE
  // --------------------------------------------------

  function initialize() {
    const result = readSubmissionPayload();

    if (!result.success) {
      let message =
        "Return to the Maker, save some records to Temporary Storage, and use the Send to DST button to continue.";

      if (result.reason === "storage") {
        message =
          "Your browser could not access the submission data. Return to the editor and try sending again.";
      } else if (result.reason === "invalid") {
        message =
          "The submission data could not be read. Return to the editor and try sending again.";
      } else if (result.reason === "count") {
        message =
          "The submission contains an unsupported number of records. Return to the editor and try again.";
      } else if (result.reason === "records") {
        message =
          "One or more records are incomplete or invalid. Return to the editor and check your stored entries.";
      }

      showEmptyState(message);
      return;
    }

    records = result.records;

    updateRecordCounts();
    displayRecords();

    hide(elements.emptyState);
    show(elements.formSection);

    initializeProgress();

    setSendingState(false);
  }


  // --------------------------------------------------
  // SEND ALL THREE BATCHES
  // --------------------------------------------------

  async function sendSubmission() {
    if (
      isSending ||
      hasSubmitted ||
      records.length === 0
    ) {
      return;
    }

    // Create a new submission ID and capture the
    // name/message only when starting a new submission.
    if (!submissionProgress.submissionId) {
      submissionProgress = {
        submissionId: createSubmissionId(),

        completedBatches: [],

        name: clean(elements.name?.value) || "Anonymous",

        message: clean(elements.message?.value) || "Blank"
      };
    }

    // Prepare all three requests before sending anything.
    // This prevents a size error in Batch 3 from occurring
    // after Batches 1 and 2 have already been accepted.
    const requestBodies = [];

    for (let batchNumber = 1; batchNumber <= 3; batchNumber++) {
      const body = JSON.stringify(
        buildBatchData(batchNumber)
      );

      if (getPayloadByteLength(body) > CONFIG.maxPayloadBytes) {
        setStatus(
          `Batch ${batchNumber} is too large for SilentForms. Reduce the submission size and try again.`,
          "error"
        );

        return;
      }

      requestBodies.push(body);
    }

    // Save the submission ID and captured details before
    // making the first request.
    if (!saveSubmissionProgress()) {
      setStatus(
        "Your browser could not save submission progress. Check your browser storage and try again.",
        "error"
      );

      return;
    }

    setSendingState(true);

    try {
      for (let batchNumber = 1; batchNumber <= 3; batchNumber++) {
        // Skip batches confirmed as successful previously.
        if (
          submissionProgress.completedBatches.includes(batchNumber)
        ) {
          continue;
        }

        setStatus(
          `Sending batch ${batchNumber} of 3...`
        );

        await sendBatch(
          batchNumber,
          requestBodies[batchNumber - 1]
        );

        // Record successful completion immediately.
        submissionProgress.completedBatches.push(batchNumber);

        if (!saveSubmissionProgress()) {
          throw new Error(
            `Batch ${batchNumber} was accepted, but your browser could not save the updated progress.`
          );
        }

        if (batchNumber < 3) {
          setStatus(
            `Batch ${batchNumber} of 3 sent successfully. Preparing the next batch...`,
            "success"
          );
        }
      }

      // All three batches have succeeded.
      // Remove only the handoff and progress data.
      // Temporary Storage remains completely untouched.
      try {
        sessionStorage.removeItem(CONFIG.storageKey);
        sessionStorage.removeItem(CONFIG.progressKey);
      } catch {
        // Do not report failure after confirmed submissions.
      }

      hasSubmitted = true;

      setSendingState(false);

      setStatus(
        "All 3 batches have been sent successfully! Please check the main site on Monday or Thursday for updates.",
        "success"
      );

    } catch (error) {
      const completed = submissionProgress.completedBatches.length;

      const nextBatch = [1, 2, 3].find(
        (number) =>
          !submissionProgress.completedBatches.includes(number)
      );

      let message =
        error.message ||
        "Something went wrong. Please try again.";

      if (nextBatch) {
        message =
          `Batch ${nextBatch} of 3 could not be confirmed. ` +
          `${completed} of 3 batches have been confirmed successful. ` +
          `Press Send submission to retry from the remaining batch. ` +
          `Details: ${message}`;
      }

      setStatus(message, "error");

    } finally {
      if (!hasSubmitted) {
        setSendingState(false);
      }
    }
  }


  // --------------------------------------------------
  // FORM EVENT
  // --------------------------------------------------

  if (elements.form) {
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();

      sendSubmission();
    });
  }


  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  initialize();

})();
