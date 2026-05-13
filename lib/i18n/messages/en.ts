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
