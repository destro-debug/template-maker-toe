(() => {
  "use strict";

  /* =======================================================
     DST TOE3 TEMPLATE MAKER
     Shared application engine
     Complete version with Temporary Storage
  ======================================================= */

  const DST = (window.DST = window.DST || {});

  DST.version = "1.1.0";

  /* =======================================================
     01. DOM HELPERS
  ======================================================= */

  DST.$ = (selector, parent = document) => {
    return parent.querySelector(selector);
  };

  DST.$$ = (selector, parent = document) => {
    return Array.from(parent.querySelectorAll(selector));
  };

  DST.getElement = (id) => {
    return document.getElementById(id);
  };

  DST.on = (element, event, callback, options) => {
    if (!element) return;

    element.addEventListener(event, callback, options);
  };

  DST.setText = (element, value) => {
    if (!element) return;

    element.textContent = String(value ?? "");
  };

  DST.setValue = (element, value) => {
    if (!element) return;

    element.value = value ?? "";
  };

  DST.show = (element) => {
    if (!element) return;

    element.hidden = false;
    element.classList.remove("hidden");
  };

  DST.hide = (element) => {
    if (!element) return;

    element.hidden = true;
    element.classList.add("hidden");
  };


  /* =======================================================
     02. THEME SYSTEM
  ======================================================= */

  DST.theme = (() => {
    const STORAGE_KEY = "dst-toe3-theme";

    const root = document.documentElement;

    const toggle = DST.getElement("themeToggle");
    const icon = DST.getElement("themeIcon");
    const label = DST.getElement("themeLabel");

    const getSavedTheme = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        return saved === "light" || saved === "dark"
          ? saved
          : "dark";
      } catch {
        return "dark";
      }
    };

    let currentTheme = getSavedTheme();

    const updateButton = () => {
      const isDark = currentTheme === "dark";

      DST.setText(icon, isDark ? "☀" : "☾");
      DST.setText(label, isDark ? "Light mode" : "Dark mode");

      if (toggle) {
        toggle.setAttribute(
          "aria-label",
          isDark ? "Switch to light mode" : "Switch to dark mode"
        );

        toggle.setAttribute(
          "aria-pressed",
          String(!isDark)
        );
      }
    };

    const apply = (theme) => {
      currentTheme = theme === "light" ? "light" : "dark";

      root.setAttribute("data-theme", currentTheme);

      try {
        localStorage.setItem(STORAGE_KEY, currentTheme);
      } catch {
        // Theme still works if storage is unavailable.
      }

      updateButton();

      document.dispatchEvent(
        new CustomEvent("dst:themechange", {
          detail: {
            theme: currentTheme
          }
        })
      );
    };

    const toggleTheme = () => {
      apply(currentTheme === "dark" ? "light" : "dark");
    };

    DST.on(toggle, "click", toggleTheme);

    apply(currentTheme);

    return {
      get current() {
        return currentTheme;
      },

      apply,
      toggle: toggleTheme,

      isDark() {
        return currentTheme === "dark";
      }
    };
  })();


  /* =======================================================
     03. STRING HELPERS
  ======================================================= */

  DST.strings = {
    clean(value) {
      return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ");
    },

    normalizeName(value) {
      return this.clean(value)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    },

    isValidSkinName(value) {
      const cleaned = this.clean(value);

      if (!cleaned) return false;

      return /^[A-Za-z0-9 &'’-]+$/.test(cleaned);
    },

    createDisplayName(skinName, vehicleName) {
      const skin = this.clean(skinName);
      const vehicle = this.clean(vehicleName);

      if (!skin || !vehicle) return "";

      return `${skin} | ${vehicle}`;
    },

    createRecordId(displayName) {
      const normalized = this.normalizeName(displayName);

      return normalized ? `toe3-${normalized}` : "";
    }
  };


  /* =======================================================
     04. URL VALIDATION
  ======================================================= */

  DST.urls = {
    isValidHttps(value) {
      try {
        const url = new URL(String(value ?? "").trim());

        return (
          url.protocol === "https:" &&
          Boolean(url.hostname) &&
          url.hostname.includes(".")
        );
      } catch {
        return false;
      }
    },

    isValidImageUrl(value) {
      return this.isValidHttps(value);
    }
  };


  /* =======================================================
     05. DESCRIPTION VALIDATION
  ======================================================= */

  DST.description = {
    MAX_LENGTH: 300,

    clean(value) {
      return String(value ?? "").trim();
    },

    isValid(value) {
      const description = this.clean(value);

      return (
        description.length > 0 &&
        description.length <= this.MAX_LENGTH
      );
    },

    remaining(value) {
      return this.MAX_LENGTH - String(value ?? "").length;
    }
  };


  /* =======================================================
     06. JSON HELPERS
  ======================================================= */

  DST.json = {
    format(record) {
      try {
        const json = JSON.stringify(record, null, 2);

        if (!json) return "";

        // Every generated JSON object ends with a comma.
        return `${json},`;
      } catch {
        return "";
      }
    },

    parse(value) {
      try {
        const cleaned = String(value ?? "")
          .trim()
          .replace(/,\s*$/, "");

        if (!cleaned) return null;

        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    },

    isValid(value) {
      return this.parse(value) !== null;
    }
  };


  /* =======================================================
     07. CLIPBOARD
  ======================================================= */

  DST.clipboard = {
    async copy(value) {
      const text = String(value ?? "");

      if (!text) {
        return {
          success: false,
          reason: "empty"
        };
      }

      try {
        await navigator.clipboard.writeText(text);

        return {
          success: true
        };
      } catch {
        try {
          const temporary = document.createElement("textarea");

          temporary.value = text;
          temporary.setAttribute("readonly", "");
          temporary.style.position = "fixed";
          temporary.style.opacity = "0";
          temporary.style.pointerEvents = "none";

          document.body.appendChild(temporary);

          temporary.select();

          const success = document.execCommand("copy");

          temporary.remove();

          return {
            success: Boolean(success),
            reason: success ? "" : "blocked"
          };
        } catch {
          return {
            success: false,
            reason: "blocked"
          };
        }
      }
    }
  };


  /* =======================================================
     08. STATUS MESSAGES
  ======================================================= */

  DST.status = {
    show(element, message, type = "info") {
      if (!element) return;

      element.textContent = message;
      element.className = "status-message";

      if (type === "success" || type === "error") {
        element.classList.add(type);
      }

      element.hidden = false;
    },

    clear(element) {
      if (!element) return;

      element.textContent = "";
      element.hidden = true;
      element.className = "status-message";
    }
  };


  /* =======================================================
     09. TOAST NOTIFICATIONS
  ======================================================= */

  DST.toast = (() => {
    let container = null;

    const createContainer = () => {
      if (container && container.isConnected) {
        return container;
      }

      container = document.createElement("div");
      container.className = "dst-toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");

      document.body.appendChild(container);

      return container;
    };

    const show = (
      message,
      type = "info",
      duration = 3200
    ) => {
      const host = createContainer();

      const toast = document.createElement("div");

      toast.className = `dst-toast dst-toast-${type}`;
      toast.setAttribute("role", "status");
      toast.textContent = String(message ?? "");

      host.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add("is-visible");
      });

      const remove = () => {
        toast.classList.remove("is-visible");

        setTimeout(() => {
          toast.remove();

          if (container && !container.children.length) {
            container.remove();
            container = null;
          }
        }, 250);
      };

      setTimeout(remove, Math.max(1000, duration));

      return {
        dismiss: remove
      };
    };

    return {
      show
    };
  })();


  /* =======================================================
     10. CONFIRMATION DIALOG
  ======================================================= */

  DST.dialog = (() => {
    let activeDialog = null;
    let previousFocus = null;

    const open = (options = {}) => {
      const {
        title = "Confirm action",
        message = "Are you sure you want to continue?",
        confirmText = "Confirm",
        cancelText = "Cancel",
        danger = false
      } = options;

      return new Promise((resolve) => {
        close(false);

        previousFocus = document.activeElement;

        const overlay = document.createElement("div");
        overlay.className = "dialog-overlay";

        const box = document.createElement("div");
        box.className = "dialog-box";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-labelledby", "dstDialogTitle");
        box.setAttribute("aria-describedby", "dstDialogMessage");

        const heading = document.createElement("h2");
        heading.id = "dstDialogTitle";
        heading.textContent = title;

        const description = document.createElement("p");
        description.id = "dstDialogMessage";
        description.textContent = message;

        const actions = document.createElement("div");
        actions.className = "dialog-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "button button-secondary";
        cancelButton.textContent = cancelText;

        const confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.className = danger
          ? "button button-danger"
          : "button button-primary";
        confirmButton.textContent = confirmText;

        actions.append(cancelButton, confirmButton);
        box.append(heading, description, actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        let finished = false;

        const finish = (result) => {
          if (finished) return;

          finished = true;

          overlay.remove();
          activeDialog = null;

          if (
            previousFocus &&
            typeof previousFocus.focus === "function"
          ) {
            previousFocus.focus();
          }

          resolve(result);
        };

        cancelButton.addEventListener("click", () => {
          finish(false);
        });

        confirmButton.addEventListener("click", () => {
          finish(true);
        });

        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) {
            finish(false);
          }
        });

        const handleKeyboard = (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            finish(false);
          }

          if (event.key === "Tab") {
            event.preventDefault();

            if (document.activeElement === confirmButton) {
              cancelButton.focus();
            } else {
              confirmButton.focus();
            }
          }
        };

        overlay.addEventListener("keydown", handleKeyboard);

        activeDialog = {
          close: finish
        };

        cancelButton.focus();
      });
    };

    const close = (result = false) => {
      if (activeDialog) {
        activeDialog.close(result);
      }
    };

    return {
      open,
      close
    };
  })();


  /* =======================================================
     11. FORM VALIDATION HELPERS
  ======================================================= */

  DST.validation = {
    required(value) {
      return String(value ?? "").trim().length > 0;
    },

    skinName(value) {
      return DST.strings.isValidSkinName(value);
    },

    httpsUrl(value) {
      return DST.urls.isValidHttps(value);
    },

    description(value) {
      return DST.description.isValid(value);
    },

    select(value) {
      return (
        String(value ?? "").trim() !== "" &&
        String(value).toLowerCase() !== "none"
      );
    }
  };


  /* =======================================================
     12. IMAGE LOADING CHECK
  ======================================================= */

  DST.images = {
    check(url, timeout = 12000) {
      return new Promise((resolve) => {
        const image = new Image();
        let settled = false;

        const finish = (result) => {
          if (settled) return;

          settled = true;
          clearTimeout(timer);

          image.onload = null;
          image.onerror = null;

          resolve(result);
        };

        const timer = setTimeout(() => {
          finish({
            success: false,
            reason: "timeout"
          });
        }, timeout);

        image.onload = () => {
          finish({
            success: true,
            width: image.naturalWidth,
            height: image.naturalHeight
          });
        };

        image.onerror = () => {
          finish({
            success: false,
            reason: "load"
          });
        };

        image.src = String(url ?? "").trim();
      });
    }
  };


  /* =======================================================
     13. FORM STATE HELPERS
  ======================================================= */

  DST.form = {
    getValue(id) {
      const element = DST.getElement(id);

      return element ? element.value : "";
    },

    setValue(id, value) {
      const element = DST.getElement(id);

      if (element) {
        element.value = value ?? "";
      }
    },

    setDisabled(id, disabled) {
      const element = DST.getElement(id);

      if (element) {
        element.disabled = Boolean(disabled);
      }
    },

    clear(form) {
      if (!form) return;

      form.reset();

      DST.$$("input, select, textarea", form).forEach((element) => {
        element.classList.remove("input-invalid", "input-valid");
        element.removeAttribute("aria-invalid");
      });
    },

    mark(element, valid) {
      if (!element) return;

      element.classList.toggle("input-valid", Boolean(valid));
      element.classList.toggle("input-invalid", !valid);

      element.setAttribute("aria-invalid", String(!valid));
    }
  };


  /* =======================================================
     14. RECORD GENERATION
  ======================================================= */

  DST.records = {
    create({
      skinName,
      vehicleName,
      partType,
      brand = null,
      imageUrl,
      templateUrl,
      description
    }) {
      const cleanSkin = DST.strings.clean(skinName);
      const cleanVehicle = DST.strings.clean(vehicleName);
      const cleanDescription = DST.description.clean(description);

      const displayName = DST.strings.createDisplayName(
        cleanSkin,
        cleanVehicle
      );

      const id = DST.strings.createRecordId(displayName);

      const record = {
        id,
        skinName: cleanSkin,
        vehicleName: cleanVehicle,
        displayName,
        partType,
        ...(partType === "cabin" ? { brand } : {}),
        imageUrl: String(imageUrl ?? "").trim(),
        templateUrl: String(templateUrl ?? "").trim(),
        description: cleanDescription
      };

      return record;
    }
  };


  /* =======================================================
     15. OUTPUT HELPERS
  ======================================================= */

  DST.output = {
    write(element, record) {
      if (!element) return false;

      const json = DST.json.format(record);

      if (!json) return false;

      element.value = json;

      return true;
    },

    clear(element) {
      if (!element) return;

      element.value = "";
    },

    async copy(element, statusElement) {
      if (!element || !element.value.trim()) {
        DST.status.show(
          statusElement,
          "There is no generated JSON to copy.",
          "error"
        );

        return false;
      }

      const result = await DST.clipboard.copy(element.value);

      if (result.success) {
        DST.status.show(
          statusElement,
          "JSON copied successfully.",
          "success"
        );

        return true;
      }

      DST.status.show(
        statusElement,
        "Copy was blocked. Select and copy the JSON manually.",
        "error"
      );

      return false;
    }
  };
    /* =======================================================
     16. TEMPORARY STORAGE ENGINE
  ======================================================= */

  DST.temporaryStorage = (() => {
    const MAX_ENTRIES = 25;
    const EXPIRY_DAYS = 7;
    const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    const VALID_TYPES = ["cabin", "trailer"];

    const makeStorageKey = (partType) => {
      return `dst-toe3-${partType}-temp-storage`;
    };

    const clone = (value) => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return null;
      }
    };

    const isValidRecord = (record, partType) => {
      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record)
      ) {
        return false;
      }

      if (
        record.partType !== partType ||
        typeof record.id !== "string" ||
        !record.id.trim() ||
        typeof record.displayName !== "string" ||
        !record.displayName.trim()
      ) {
        return false;
      }

      return true;
    };

    const isValidEntry = (entry, partType, now) => {
      if (
        !entry ||
        typeof entry !== "object" ||
        !isValidRecord(entry.record, partType)
      ) {
        return false;
      }

      if (
        !Number.isFinite(entry.savedAt) ||
        !Number.isFinite(entry.expiresAt)
      ) {
        return false;
      }

      return entry.expiresAt > now;
    };

    const create = (partType) => {
      const normalizedType = String(partType ?? "").toLowerCase();

      if (!VALID_TYPES.includes(normalizedType)) {
        throw new Error(
          'Temporary Storage requires either "cabin" or "trailer".'
        );
      }

      const storageKey = makeStorageKey(normalizedType);

      const readRawEntries = () => {
        try {
          const stored = localStorage.getItem(storageKey);

          if (!stored) return [];

          const parsed = JSON.parse(stored);

          if (!Array.isArray(parsed)) {
            return [];
          }

          return parsed;
        } catch {
          return [];
        }
      };

      const writeEntries = (entries) => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(entries)
          );

          return true;
        } catch {
          return false;
        }
      };

      const emitChange = (entries) => {
        const safeEntries = clone(entries) || [];

        document.dispatchEvent(
          new CustomEvent("dst:temporary-storage-change", {
            detail: {
              partType: normalizedType,
              storageKey,
              count: safeEntries.length,
              maxEntries: MAX_ENTRIES,
              entries: safeEntries
            }
          })
        );
      };

      const prune = () => {
        const now = Date.now();
        const original = readRawEntries();

        const valid = original.filter((entry) => {
          return isValidEntry(entry, normalizedType, now);
        });

        const changed = valid.length !== original.length;

        if (changed) {
          writeEntries(valid);
          emitChange(valid);
        }

        return valid;
      };

      const getEntries = () => {
        const entries = prune();

        return clone(entries) || [];
      };

      const getCount = () => {
        return prune().length;
      };

      const save = (recordOrJson) => {
        let record = recordOrJson;

        if (typeof recordOrJson === "string") {
          record = DST.json.parse(recordOrJson);
        }

        if (!isValidRecord(record, normalizedType)) {
          return {
            success: false,
            reason: "invalid"
          };
        }

        const safeRecord = clone(record);

        if (!safeRecord) {
          return {
            success: false,
            reason: "invalid"
          };
        }

        const entries = prune();

        const duplicate = entries.some((entry) => {
          return entry.record.id === safeRecord.id;
        });

        if (duplicate) {
          return {
            success: false,
            reason: "duplicate"
          };
        }

        if (entries.length >= MAX_ENTRIES) {
          return {
            success: false,
            reason: "full",
            count: entries.length,
            maxEntries: MAX_ENTRIES
          };
        }

        const now = Date.now();

        const newEntry = {
          record: safeRecord,
          savedAt: now,
          expiresAt: now + EXPIRY_MS
        };

        const updatedEntries = [...entries, newEntry];

        if (!writeEntries(updatedEntries)) {
          return {
            success: false,
            reason: "storage"
          };
        }

        emitChange(updatedEntries);

        return {
          success: true,
          entry: clone(newEntry),
          count: updatedEntries.length,
          maxEntries: MAX_ENTRIES
        };
      };

      const remove = (recordId) => {
        const id = String(recordId ?? "").trim();

        if (!id) {
          return {
            success: false,
            reason: "invalid"
          };
        }

        const entries = prune();

        const index = entries.findIndex((entry) => {
          return entry.record.id === id;
        });

        if (index === -1) {
          return {
            success: false,
            reason: "not-found"
          };
        }

        const updatedEntries = entries.filter((entry) => {
          return entry.record.id !== id;
        });

        if (!writeEntries(updatedEntries)) {
          return {
            success: false,
            reason: "storage"
          };
        }

        emitChange(updatedEntries);

        return {
          success: true,
          count: updatedEntries.length
        };
      };

      const clear = () => {
        try {
          localStorage.removeItem(storageKey);

          emitChange([]);

          return {
            success: true,
            count: 0
          };
        } catch {
          return {
            success: false,
            reason: "storage"
          };
        }
      };

      const getAllRecords = () => {
        return prune().map((entry) => {
          return clone(entry.record);
        });
      };

      const copyAll = async () => {
        const records = getAllRecords();

        if (!records.length) {
          return {
            success: false,
            reason: "empty"
          };
        }

        // Format each record independently.
        // DST.json.format() adds one trailing comma
        // after every record, including the final one.
        const json = records
          .map((record) => DST.json.format(record))
          .filter(Boolean)
          .join("\n");

        if (!json) {
          return {
            success: false,
            reason: "format"
          };
        }

        const result = await DST.clipboard.copy(json);

        if (result.success) {
          return {
            success: true,
            count: records.length
          };
        }

        return {
          success: false,
          reason: "copy"
        };
      };

      // Clean expired or invalid entries when this editor
      // initializes its Temporary Storage controller.
      prune();

      return {
        partType: normalizedType,
        storageKey,

        MAX_ENTRIES,
        EXPIRY_DAYS,

        getEntries,
        getCount,
        getAllRecords,

        save,
        remove,
        clear,
        copyAll,

        prune
      };
    };

    return {
      MAX_ENTRIES,
      EXPIRY_DAYS,
      create
    };
  })();


  /* =======================================================
     17. SHARED INITIALIZATION
  ======================================================= */

  DST.init = () => {
    document.documentElement.setAttribute(
      "data-dst-app",
      "toe3-maker"
    );

    DST.on(document, "click", (event) => {
      const link = event.target.closest("[data-confirm-navigation]");

      if (!link) return;

      const message = link.dataset.confirmNavigation;

      if (!message) return;

      event.preventDefault();

      DST.dialog.open({
        title: "Leave this editor?",
        message,
        confirmText: "Continue"
      }).then((confirmed) => {
        if (confirmed) {
          window.location.href = link.href;
        }
      });
    });
  };


  /* =======================================================
     18. START APPLICATION
  ======================================================= */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", DST.init, {
      once: true
    });
  } else {
    DST.init();
  }


  /* =======================================================
     END OF DST TOE3 TEMPLATE MAKER ENGINE
  ======================================================= */

})();
