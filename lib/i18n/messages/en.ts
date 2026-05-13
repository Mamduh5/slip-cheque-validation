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
  quality: {
    status: {
      PASS: "Good",
      WARN: "Needs attention",
      FAIL: "Unusable"
    },
    warnings: {
      IMAGE_TOO_SMALL: "Image is small. Retake closer if possible.",
      BLURRY_IMAGE: "Image may be blurry. Keep the camera steady.",
      TOO_DARK: "Image is dark. Use brighter, even lighting.",
      TOO_BRIGHT: "Image is bright. Avoid glare and direct reflections."
    }
  },
  documentTypeDescriptions: {
    BANK_TRANSFER_SLIP: "Transfer receipt or confirmation slip.",
    DEPOSIT_PAYMENT_SLIP: "Deposit, bill payment, or counter payment slip.",
    CHEQUE: "Paper cheque image.",
    UNKNOWN: "Use when the document type is unclear."
  },
  documentTypeGuidance: {
    BANK_TRANSFER_SLIP: {
      title: "For slips, keep printed details and edges visible.",
      tip1: "Capture the whole slip.",
      tip2: "Avoid glare over printed amounts or reference numbers."
    },
    DEPOSIT_PAYMENT_SLIP: {
      title: "For deposit/payment slips, keep the full paper visible.",
      tip1: "Include the receipt edges.",
      tip2: "Keep stamped or printed areas sharp."
    },
    CHEQUE: {
      title: "For cheques, capture the full document clearly.",
      tip1: "Include all corners.",
      tip2: "Keep signature and printed lines in focus."
    },
    UNKNOWN: {
      title: "If you are not sure, upload it as an unknown paper document.",
      tip1: "Include the full paper.",
      tip2: "Keep text and edges sharp."
    }
  },
  batchUpload: {
    outcomes: {
      waiting: {
        label: "Waiting",
        description: "Ready to upload."
      },
      uploading: {
        label: "Uploading",
        description: "Sending the image."
      },
      processing: {
        label: "Processing",
        description: "Checking quality and duplicates."
      },
      qualityRejected: {
        label: "Image rejected due to quality issues",
        description: "Retake or choose a clearer image."
      },
      failed: {
        label: "Upload failed",
        description: "Check the connection and try again."
      },
      exactDuplicate: {
        label: "Exact duplicate found",
        description: "A byte-level duplicate exists in this account."
      },
      reviewNeeded: {
        label: "Likely duplicate - review needed",
        description: "Open compare/review for the side-by-side decision."
      },
      suppressed: {
        label: "Near-duplicate review suppressed",
        description: "Visual similarity was outweighed by structured differences."
      },
      newUpload: {
        label: "New upload",
        description: "No duplicate review is required."
      }
    },
    summary: {
      files: "{count} file(s) in batch",
      completed: "{count} completed",
      exactDuplicates: "{count} exact duplicate(s)",
      reviewNeeded: "{count} need review",
      newUploads: "{count} new upload(s)",
      suppressed: "{count} suppressed near-duplicate(s)",
      rejected: "{count} quality rejected",
      failed: "{count} failed"
    }
  },
  reviewActions: {
    title: "Review this likely duplicate",
    helper: "The system thinks these images may show the same document. Your review is stored separately.",
    shortcuts: "Shortcuts:",
    shortcutDuplicate: "duplicate",
    shortcutDistinct: "distinct",
    noteLabel: "Review note",
    optional: "(optional)",
    notePlaceholder: "Add brief context for this decision",
    saving: "Saving...",
    confirmDuplicate: "Confirm duplicate",
    confirmDistinct: "Confirm distinct",
    confirmDuplicateNext: "Confirm duplicate & next",
    confirmDistinctNext: "Confirm distinct & next",
    endOfQueue: "End of queue for this view. Save this item, then return to the queue.",
    error: "Review could not be saved."
  },
  reviewHistory: {
    title: "Review history",
    empty: "No review actions have been recorded for this document yet.",
    recentActions: "{count} recent actions",
    actor: "Actor: {actor}",
    bulkBatch: "Bulk review batch",
    noNote: "No review note.",
    showEarlier: "Show earlier review actions"
  },
  reviewCompare: {
    backToQueue: "<- Review queue",
    itemPosition: "Item {position} of {total}",
    positionUnavailable: "Queue position unavailable",
    contextPreserved: "Queue context is preserved from the current search, sort, and page.",
    previousItem: "Previous item",
    nextItem: "Next item",
    startOfQueue: "Start of queue",
    endOfQueue: "End of queue",
    leftArrow: "(Left Arrow)",
    rightArrow: "(Right Arrow)",
    alreadyReviewed: "This item has already been reviewed:",
    pendingReview: "Pending review",
    pendingReviewText: "visual similarity {similarity}. Compare the images and structured fields, then record your decision below.",
    fullDetail: "Full detail",
    currentImageAlt: "Current document image",
    matchedImageAlt: "Matched document image",
    matchedUnavailable: "Matched document not available",
    matchedDocument: "Matched document",
    fieldComparison: "Structured field comparison",
    fieldComparisonHelper: "OCR-derived only; not bank-verified. Low-confidence values are shown with LOW CONF.",
    field: "Field",
    lowConfidence: "LOW CONF",
    differs: "differs",
    match: "match",
    recordedOn: "Review recorded on {date}.",
    unknownDate: "unknown date",
    viewFullDetail: "View full detail ->",
    actionsUnavailable: "Review actions are not available for this document.",
    notAvailable: "-"
  },
  documentDetail: {
    backToDashboard: "Back to dashboard",
    reviewQueue: "Review queue",
    uploaded: "Uploaded {date}",
    likelyDuplicateBanner: "System flagged as likely duplicate. Review status:",
    compareReview: "Compare & review ->",
    thisUpload: "This upload",
    matchedDocument: "Matched document",
    currentPreviewAlt: "Current uploaded financial document preview",
    matchedPreviewAlt: "Matched financial document preview",
    uploadedPreviewAlt: "Uploaded financial document preview",
    uploadResult: "Upload result",
    processingProfile: "Processing profile",
    duplicateDecision: "Duplicate decision",
    duplicateDecisionCard: {
      exactTitle: "Exact duplicate",
      exactDescription: "This upload is a byte-level exact match with another document.",
      likelyTitle: "Likely duplicate - review needed",
      likelyDescription: "Image similarity suggests this may be the same document. A side-by-side comparison is available for your review.",
      suppressedTitle: "Near-duplicate review suppressed",
      suppressedDescription: "A visually similar candidate was found, but it was not flagged for review. {reasonText} For transfer slips, structured metadata outweighs visual similarity in duplicate detection.",
      suppressedReasonOne: "Structured evidence shows the {reason}.",
      suppressedReasonMany: "Structured evidence shows differences: {reasons}.",
      suppressedReasonFallback: "Structured evidence showed differences between the documents.",
      newTitle: "New upload",
      newDescription: "This document is treated as new based on current evidence."
    },
    matchDescription: {
      exact: "Exact byte-level match with",
      likely: "Likely same document as",
      fallback: "Matched with"
    },
    visualSimilarity: "visual similarity {similarity}",
    qualityWarnings: "Capture quality warnings",
    documentMetadata: "Document metadata",
    metadata: {
      source: "Source",
      processingStatus: "Processing status",
      mimeType: "MIME type",
      fileSize: "File size",
      machineStatus: "Machine status",
      reviewStatus: "Review status",
      qualityStatus: "Quality status",
      similarity: "Similarity",
      reviewedAt: "Reviewed at",
      matchedDocument: "Matched document",
      notReviewed: "Not reviewed",
      matchedUnavailable: "Not available to this account",
      none: "None",
      notAvailable: "Not available"
    },
    imageRead: {
      title: "Image-read fields",
      helper: "OCR-derived. Not bank/provider verified. Low-confidence fields shown with indicator.",
      amount: "Amount",
      sender: "Sender",
      receiver: "Receiver",
      dateTime: "Date / time",
      reference: "Reference",
      senderBank: "Sender bank",
      receiverBank: "Receiver bank",
      senderAcctTail: "Sender acct tail",
      receiverAcctTail: "Receiver acct tail",
      confidence: "{confidence} confidence",
      failed: "Image reading failed.",
      unavailable: "No image-read results available.",
      warnings: "Warnings: {warnings}"
    },
    transferAnalysis: {
      title: "Transfer slip analysis",
      slipVerification: "Slip verification",
      localOnly: "Not bank/provider verified. Local structural check only.",
      qrDecode: "QR decode",
      decoded: "Decoded",
      noQr: "No QR found",
      notAvailable: "Not available",
      transferMetadata: "Transfer metadata",
      metadataHelper: "Not verified. Parsed from QR payload.",
      slipResultNotVerified: "Not verified",
      slipResultUnsupported: "Unsupported for verification",
      slipResultConsistent: "Locally structurally consistent",
      slipResultInconsistent: "Local structural inconsistency found",
      slipResultUnavailable: "Slip verification not available",
      metadataParsed: "Transfer metadata parsed",
      metadataUnsupported: "Unsupported QR payload format",
      metadataEmpty: "No structured transfer metadata",
      metadataParseFailed: "Transfer metadata parse failed",
      metadataUnavailable: "Transfer metadata parse not available",
      countryCurrency: "Country / currency",
      amountQr: "Amount (QR)",
      subtype: "Subtype",
      reference1: "Reference 1",
      reference2: "Reference 2",
      typeGuidance: "Type guidance"
    },
    technicalIdentifiers: {
      title: "Technical identifiers",
      exactHash: "Exact hash (SHA-256)",
      perceptualHash: "Perceptual hash",
      normalizedImage: "Normalized image",
      normalizedObjectKey: "Normalized object key",
      imageMetrics: "Image metrics",
      notCalculated: "Not calculated",
      notGenerated: "Not generated",
      sharpness: "sharpness",
      luminance: "luminance"
    },
    results: {
      duplicateCheck: "Duplicate check",
      exactFound: "Exact duplicate found",
      likelyReview: "Likely duplicate - review needed",
      suppressed: "Near-duplicate review suppressed",
      why: "Why",
      structuredDifferencesFound: "Structured differences found",
      suppressedBecause: "Suppressed because {reasons}",
      newUpload: "New upload",
      review: "Review",
      pendingYourReview: "Pending your review",
      confirmedDuplicate: "Confirmed duplicate",
      confirmedDistinct: "Confirmed distinct",
      quality: "Quality",
      warningsDetected: "{count} warning(s) detected",
      imageRejected: "Image quality rejected",
      localCheck: "Local check",
      structurallyConsistent: "Structurally consistent",
      structuralInconsistency: "Structural inconsistency found",
      qrDecode: "QR decode",
      decoded: "Decoded",
      noQrFound: "No QR found",
      metadata: "Metadata",
      parsed: "Parsed",
      unsupportedFormat: "Unsupported format",
      parseFailed: "Parse failed"
    }
  },
  documentTypeCorrection: {
    title: "Document type",
    helper: "This changes only the user-managed classification. It does not verify contents or recompute duplicate, review, or quality status.",
    change: "Change document type",
    save: "Save type",
    saving: "Saving...",
    cancel: "Cancel",
    success: "Document type updated to {type}.",
    error: "Document type could not be updated."
  },
  upload: {
    title: "Upload document",
    intro: "Add a bank transfer slip, deposit/payment slip, cheque, or unknown paper financial document image.",
    captureGuidance: {
      title: "Frame the paper clearly",
      body: "These aids help you take a cleaner photo. They are guidance only; server-side quality checks still make the final call after upload.",
      tip1: "Place the document on a flat surface.",
      tip2: "Include all corners.",
      tip3: "Avoid glare and shadows.",
      tip4: "Keep the image sharp.",
      tip5: "Fill most of the frame."
    },
    framingGuide: {
      title: "Phone photo framing guide",
      body: "Aim to keep the paper inside the corner marks with all edges visible. This is not document detection."
    },
    duplicateNote: "Duplicate matching is active within your account. Document Registry Checker identifies exact matches and flags visually similar uploads for reviewer confirmation.",
    form: {
      documentType: "Document type",
      source: "Source",
      sourceCamera: "Camera photo",
      sourceUpload: "Existing image file",
      sourceHelp: "Choose whether reviewers should treat this as a new capture or an existing image.",
      fileLabel: "Take photos or choose images",
      fileHelp: "Use the camera on phones, or select one or more JPEG, PNG, or WebP images.",
      selectedFiles: "Selected files",
      filesReady: "{count} file(s) ready",
      retryFailed: "Retry failed/rejected",
      openDetail: "Open detail",
      compareReview: "Compare/review",
      retry: "Retry",
      remove: "Remove",
      previewTitle: "Preview before upload",
      previewAlt: "Selected document preview",
      checklistTitle: "Before uploading, check the photo.",
      checklist1: "All corners are visible.",
      checklist2: "The paper fills most of the frame.",
      checklist3: "Text and edges look sharp.",
      checklist4: "There is no heavy glare or shadow.",
      advisoryTitle: "Advisory preview check",
      advisoryBody: "These local hints are only a preview. The server performs the final quality check after upload.",
      checkingPreview: "Checking the preview...",
      noPreviewIssues: "No obvious preview issues found.",
      replaceImages: "Retake or choose other images",
      captureTips: "Capture tips",
      tip1: "Place the document on a flat surface.",
      tip2: "Include all corners inside the image.",
      tip3: "Avoid glare, deep shadows, and motion blur.",
      tip4: "Retake if text or edges look soft.",
      batchSummary: "Batch summary",
      rejectedTitle: "Image rejected due to quality issues",
      failedTitle: "Upload failed",
      retakeAdvice: "Retake or choose another image that meets the capture tips above.",
      progressTitle: "Uploading selected files",
      progressBody: "Each file is handled separately.",
      chooseFirst: "Choose images first",
      uploadSelectedImage: "Upload selected image",
      uploadFiles: "Upload {count} files",
      noFilesError: "Take a photo or choose one or more images before uploading.",
      noWaitingError: "There are no waiting files to upload.",
      connectionError: "Upload failed. Check your connection and try again.",
      failedError: "Upload failed."
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
      sender: "Sender",
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
