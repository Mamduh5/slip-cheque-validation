export const enMessages = {
  common: {
    productName: "Document Registry Checker",
    actions: {
      cancel: "Cancel",
      createAccount: "Create account",
      login: "Log in",
      loading: "Loading...",
      save: "Save"
    },
    locales: {
      en: "English",
      th: "ไทย"
    },
    localeSwitcher: {
      label: "Language"
    }
  },
  navigation: {
    dashboard: "Dashboard",
    login: "Log in",
    main: "Main navigation",
    public: "Public navigation",
    register: "Register",
    review: "Review",
    signOut: "Sign out",
    upload: "Upload"
  },
  documentTypes: {
    BANK_TRANSFER_SLIP: "Bank transfer slip",
    DEPOSIT_PAYMENT_SLIP: "Deposit/payment slip",
    CHEQUE: "Cheque",
    UNKNOWN: "Not sure / unknown",
    CHEQUE_PAPER: "Paper check",
    CHEQUE_PAPER_DOCUMENTS: "Paper check documents"
  },
  statuses: {
    duplicate: {
      NOT_CHECKED: "Not checked",
      PENDING: "Checking",
      NEW: "New upload",
      EXACT_DUPLICATE: "Exact duplicate",
      LIKELY_DUPLICATE: "Likely duplicate",
      DUPLICATE: "Duplicate",
      POSSIBLE_DUPLICATE: "Possible duplicate",
      ERROR: "Check failed"
    },
    review: {
      NOT_REQUIRED: "Not required",
      PENDING: "Pending review",
      CONFIRMED_DUPLICATE: "Confirmed duplicate",
      CONFIRMED_DISTINCT: "Confirmed distinct"
    },
    duplicateDecision: {
      EXACT_DUPLICATE: "Exact duplicate",
      LIKELY_DUPLICATE_REVIEW: "Likely duplicate review",
      NEW_UPLOAD: "New upload",
      SUPPRESSED_NEAR_DUPLICATE: "Suppressed near-duplicate"
    }
  },
  duplicateReasons: {
    AMOUNT_MISMATCH: "amount differed",
    RECIPIENT_MISMATCH: "recipient differed",
    REFERENCE_MISMATCH: "transaction reference differed",
    QR_PAYLOAD_MISMATCH: "QR payload differed",
    TRANSFER_METADATA_PAYLOAD_MISMATCH: "transfer metadata payload differed",
    IMAGE_SIMILARITY_ONLY: "image similarity only",
    IDENTICAL_QR_PAYLOAD: "identical QR payload",
    IDENTICAL_TRANSFER_METADATA_PAYLOAD: "identical transfer metadata payload",
    IMAGE_READ_AMOUNT_MISMATCH: "image-read amount differed",
    IMAGE_READ_RECIPIENT_MISMATCH: "image-read recipient differed",
    IMAGE_READ_SENDER_MISMATCH: "image-read sender differed",
    IMAGE_READ_REFERENCE_MISMATCH: "image-read transaction reference differed",
    IMAGE_READ_DATETIME_MISMATCH: "image-read date/time differed",
    IMAGE_READ_BANK_MISMATCH: "image-read receiver bank differed"
  },
  reviewFilters: {
    all: "All reviews",
    pending: "Pending review",
    confirmedDuplicate: "Confirmed duplicate",
    confirmedDistinct: "Confirmed distinct"
  },
  workflowPresets: {
    quickViews: "Quick views",
    dashboard: {
      recent: {
        label: "Recent uploads",
        description: "Latest documents"
      },
      needsReview: {
        label: "Needs review",
        description: "Pending likely duplicates"
      },
      exactDuplicates: {
        label: "Exact duplicates",
        description: "Byte-level matches"
      },
      newUploads: {
        label: "New uploads",
        description: "No review required"
      },
      suppressedNearDuplicates: {
        label: "Suppressed near-duplicates",
        description: "Visual matches treated as distinct"
      }
    },
    review: {
      needsReview: {
        label: "Needs review",
        description: "Newest pending items"
      },
      strongestMatches: {
        label: "Strongest matches",
        description: "Highest similarity"
      },
      hardestCases: {
        label: "Hardest cases",
        description: "Lowest similarity"
      },
      oldestFirst: {
        label: "Oldest first",
        description: "Clear backlog"
      }
    }
  },
  dashboard: {
    title: "Dashboard",
    intro: "Recent uploads, machine duplicate status, and review decisions.",
    actions: {
      exportCsv: "Export CSV",
      uploadDocument: "Upload document",
      startUpload: "Start upload",
      view: "View",
      review: "Review"
    },
    pendingReview: {
      one: "{count} item pending review",
      other: "{count} items pending review",
      openQueue: "Open review queue ->"
    },
    exportNote: "Export CSV downloads the full filtered result set, not just the visible rows.",
    empty: {
      title: "No documents found",
      filtered: "No documents match the current filters or search.",
      initial: "Upload a paper financial document image to create the first registry record."
    },
    table: {
      document: "Document",
      type: "Type",
      uploaded: "Uploaded",
      review: "Review",
      machine: "Machine",
      actions: "Actions"
    },
    duplicateSublabels: {
      suppressedNearDuplicate: "Suppressed near-duplicate",
      suppressedPrefix: "Suppressed: {reasons}",
      moreSuffix: "+"
    },
    filters: {
      active: "Active filters",
      remove: "Remove {label} filter",
      clearAll: "Clear all",
      searchLabel: "Search extracted fields",
      searchPlaceholder: "Amount, reference, receiver, sender, date, bank, account tail",
      searchButton: "Search",
      searchExamples: "Examples: amount, reference number, receiver name, sender name, date.",
      reviewAria: "Review filters",
      allTypes: "All types",
      allStatuses: "All statuses",
      clearFilters: "Clear filters",
      searchChip: "Search: {query}"
    }
  },
  reviewQueue: {
    title: "Review Queue",
    intro: "Documents flagged as likely duplicates waiting for your review.",
    actions: {
      exportCsv: "Export CSV",
      backToDashboard: "Back to dashboard",
      apply: "Apply",
      clearSearch: "Clear search",
      previous: "Previous",
      next: "Next",
      selectAllOnPage: "Select all on page",
      clearSelection: "Clear selection",
      confirmDuplicate: "Confirm duplicate",
      confirmDistinct: "Confirm distinct",
      clear: "Clear",
      close: "Close",
      cancel: "Cancel",
      compareReview: "Compare & review",
      fullDetail: "Full detail",
      saving: "Saving..."
    },
    search: {
      label: "Search review queue",
      placeholder: "Amount, reference, receiver, sender, date",
      extractedOnly: "Search uses extracted fields only. Full OCR text is not searched here.",
      exportNote: "Export CSV downloads the full searched and sorted queue, not just this page."
    },
    sort: {
      newest: "Newest first",
      oldest: "Oldest first",
      highestSimilarity: "Highest similarity first",
      lowestSimilarity: "Lowest similarity first"
    },
    empty: {
      title: "Queue is clear",
      filtered: "No pending review items match the current search.",
      initial: "No pending review items. New likely duplicates will appear here."
    },
    pagination: {
      showing: "Showing {visible} of {total} {itemLabel} pending review",
      itemOne: "item",
      itemOther: "items",
      page: "Page {page} of {totalPages}"
    },
    bulk: {
      selectedOnPage: "{count} selected on this page",
      pendingSelected: "{count} pending {itemLabel} selected",
      itemOne: "item",
      itemOther: "items",
      scopeNote: "Selection is page-scoped. Bulk actions apply only to selected visible pending items.",
      reviewNote: "Review note",
      optional: "(optional)",
      notePlaceholder: "Apply one note to this batch",
      confirmTitle: "Confirm bulk review",
      confirmSummary: "{decision} for {count} selected {itemLabel}.",
      closeAria: "Close bulk review confirmation",
      modalScope: "Selection is page-scoped. This action only affects selected items visible on the current review queue page.",
      modalDecision: "The same review decision{noteText} will be submitted for each eligible pending item.",
      andNote: " and note",
      sampleItems: "Sample affected items",
      moreSelected: "+{count} more selected on this page.",
      feedback: "{updated} updated, {skipped} skipped.",
      feedbackWithNote: "{updated} updated, {skipped} skipped. Review note applied to updated items.",
      error: "Could not {decision} for the selected items."
    },
    row: {
      selectAria: "Select {filename}",
      likelyDuplicate: "Likely duplicate",
      similar: "{percent}% similar",
      uploaded: "Uploaded {date}",
      amount: "Amount",
      receiver: "Receiver",
      reference: "Reference",
      dateTime: "Date / time",
      matchedWith: "Matched with:",
      reason: "Reason:",
      imageSimilarityOnly: "Image similarity only"
    }
  },
  public: {
    home: {
      eyebrow: "Document Registry Checker",
      title: "Validate slips, cheques, and financial documents before review decisions are recorded.",
      intro:
        "Upload document images, identify likely duplicates, and give reviewers a clear comparison path before they confirm the outcome.",
      steps: {
        upload: {
          title: "Upload",
          body: "Add a clear image of a slip, cheque, or supporting financial document."
        },
        check: {
          title: "Check",
          body: "Review duplicate status and extracted details in one place."
        },
        decide: {
          title: "Decide",
          body: "Compare likely matches and record a clear reviewer decision."
        }
      }
    },
    login: {
      title: "Log in",
      intro: "Log in to upload documents, review duplicates, and check statuses.",
      noAccount: "No account?",
      fields: {
        email: "Email",
        password: "Password"
      },
      forgotPassword: "Forgot password?",
      submitting: "Signing in...",
      submittingStatus: "Signing in. Please wait.",
      continueWithGoogle: "Continue with Google",
      googleDisabled: "Google sign-in is disabled until OAuth env values are set.",
      errors: {
        credentials: "Email and password did not match an account.",
        emailRequired: "Enter the email address for your account.",
        emailInvalid: "Enter a valid email address.",
        passwordRequired: "Enter your password."
      }
    },
    register: {
      title: "Create account",
      intro: "Create an account to upload documents, review duplicates, and record audit-ready decisions.",
      alreadyRegistered: "Already registered?",
      fields: {
        name: "Name",
        email: "Email",
        password: "Password"
      },
      passwordRules: "Use 8 to 128 characters. Choose a password that is not reused for other systems.",
      submitting: "Creating account...",
      creatingStatus: "Creating account. Please wait.",
      createdStatus: "Account created. Signing you in.",
      errors: {
        default: "Could not create the account.",
        existingAccount: "An account already exists for this email.",
        nameTooLong: "Name must be 120 characters or fewer.",
        emailRequired: "Enter the email address for this account.",
        emailInvalid: "Enter a valid email address.",
        passwordRequired: "Create a password before submitting.",
        passwordLength: "Use a password between 8 and 128 characters."
      }
    },
    forgotPassword: {
      title: "Password recovery",
      body:
        "Self-service password reset is not available yet. Contact your Document Registry Checker administrator to reset account access.",
      supportLink: "View support options"
    },
    support: {
      title: "Support",
      body:
        "This internal tool does not have a public support desk configured. For account recovery, access questions, or document handling concerns, contact the administrator who manages your Document Registry Checker access.",
      loginLink: "Return to login"
    },
    privacy: {
      title: "Privacy",
      body1:
        "Document Registry Checker is intended for authorized document validation workflows. Only upload documents you are permitted to process for your organization.",
      body2:
        "A formal privacy notice is not configured in this application yet. Follow your organization's approved policy for document handling, access, and reviewer accountability."
    },
    retention: {
      title: "Retention",
      body1:
        "Uploaded documents and review records remain available for operational review unless your deployment applies a separate retention process.",
      body2:
        "Automatic deletion rules are not configured in this application yet. Follow your organization's retention policy for cleanup, export, or removal requests."
    },
    trustLinks: {
      ariaLabel: "Support and policy links",
      support: "Support",
      privacy: "Privacy",
      retention: "Retention"
    }
  }
} as const;
