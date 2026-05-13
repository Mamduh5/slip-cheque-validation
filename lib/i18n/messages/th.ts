export const thMessages = {
  common: {
    productName: "ระบบตรวจทะเบียนเอกสาร",
    actions: {
      cancel: "ยกเลิก",
      createAccount: "สร้างบัญชี",
      login: "เข้าสู่ระบบ",
      loading: "กำลังโหลด...",
      save: "บันทึก"
    },
    locales: {
      en: "English",
      th: "ไทย"
    },
    localeSwitcher: {
      label: "ภาษา"
    }
  },
  navigation: {
    dashboard: "แดชบอร์ด",
    login: "เข้าสู่ระบบ",
    main: "การนำทางหลัก",
    public: "การนำทางสาธารณะ",
    register: "ลงทะเบียน",
    review: "ตรวจทาน",
    signOut: "ออกจากระบบ",
    upload: "อัปโหลด"
  },
  documentTypes: {
    BANK_TRANSFER_SLIP: "สลิปโอนเงิน",
    DEPOSIT_PAYMENT_SLIP: "สลิปฝากหรือชำระเงิน",
    CHEQUE: "เช็ค",
    UNKNOWN: "ไม่แน่ใจ / ไม่ทราบประเภท",
    CHEQUE_PAPER: "เช็คกระดาษ",
    CHEQUE_PAPER_DOCUMENTS: "เอกสารเช็คกระดาษ"
  },
  statuses: {
    duplicate: {
      NOT_CHECKED: "ยังไม่ตรวจ",
      PENDING: "กำลังตรวจ",
      NEW: "รายการใหม่",
      EXACT_DUPLICATE: "ซ้ำตรงกัน",
      LIKELY_DUPLICATE: "อาจซ้ำ",
      DUPLICATE: "ซ้ำ",
      POSSIBLE_DUPLICATE: "อาจซ้ำ",
      ERROR: "ตรวจไม่สำเร็จ"
    },
    review: {
      NOT_REQUIRED: "ไม่ต้องตรวจทาน",
      PENDING: "รอตรวจทาน",
      CONFIRMED_DUPLICATE: "ยืนยันว่าซ้ำ",
      CONFIRMED_DISTINCT: "ยืนยันว่าไม่ซ้ำ"
    },
    duplicateDecision: {
      EXACT_DUPLICATE: "ซ้ำตรงกัน",
      LIKELY_DUPLICATE_REVIEW: "รายการอาจซ้ำที่ต้องตรวจทาน",
      NEW_UPLOAD: "รายการใหม่",
      SUPPRESSED_NEAR_DUPLICATE: "ระงับการตรวจรายการใกล้ซ้ำ"
    }
  },
  duplicateReasons: {
    AMOUNT_MISMATCH: "ยอดเงินต่างกัน",
    RECIPIENT_MISMATCH: "ผู้รับต่างกัน",
    REFERENCE_MISMATCH: "เลขอ้างอิงธุรกรรมต่างกัน",
    QR_PAYLOAD_MISMATCH: "ข้อมูล QR ต่างกัน",
    TRANSFER_METADATA_PAYLOAD_MISMATCH: "ข้อมูลเมตาการโอนต่างกัน",
    IMAGE_SIMILARITY_ONLY: "อ้างอิงจากความคล้ายของภาพเท่านั้น",
    IDENTICAL_QR_PAYLOAD: "ข้อมูล QR ตรงกัน",
    IDENTICAL_TRANSFER_METADATA_PAYLOAD: "ข้อมูลเมตาการโอนตรงกัน",
    IMAGE_READ_AMOUNT_MISMATCH: "ยอดเงินที่อ่านจากภาพต่างกัน",
    IMAGE_READ_RECIPIENT_MISMATCH: "ผู้รับที่อ่านจากภาพต่างกัน",
    IMAGE_READ_SENDER_MISMATCH: "ผู้ส่งที่อ่านจากภาพต่างกัน",
    IMAGE_READ_REFERENCE_MISMATCH: "เลขอ้างอิงที่อ่านจากภาพต่างกัน",
    IMAGE_READ_DATETIME_MISMATCH: "วันเวลาที่อ่านจากภาพต่างกัน",
    IMAGE_READ_BANK_MISMATCH: "ธนาคารผู้รับที่อ่านจากภาพต่างกัน"
  },
  reviewFilters: {
    all: "ทุกสถานะตรวจทาน",
    pending: "รอตรวจทาน",
    confirmedDuplicate: "ยืนยันว่าซ้ำ",
    confirmedDistinct: "ยืนยันว่าไม่ซ้ำ"
  },
  workflowPresets: {
    quickViews: "มุมมองด่วน",
    dashboard: {
      recent: {
        label: "อัปโหลดล่าสุด",
        description: "เอกสารล่าสุด"
      },
      needsReview: {
        label: "ต้องตรวจทาน",
        description: "รายการที่อาจซ้ำและรอตรวจ"
      },
      exactDuplicates: {
        label: "ซ้ำตรงกัน",
        description: "ไฟล์ตรงกันระดับไบต์"
      },
      newUploads: {
        label: "รายการใหม่",
        description: "ไม่ต้องตรวจทาน"
      },
      suppressedNearDuplicates: {
        label: "ระงับรายการใกล้ซ้ำ",
        description: "ภาพคล้ายแต่ถือว่าแยกกัน"
      }
    },
    review: {
      needsReview: {
        label: "ต้องตรวจทาน",
        description: "รายการรอตรวจล่าสุด"
      },
      strongestMatches: {
        label: "ตรงกันมากที่สุด",
        description: "ความคล้ายสูงสุด"
      },
      hardestCases: {
        label: "กรณียาก",
        description: "ความคล้ายต่ำสุด"
      },
      oldestFirst: {
        label: "เก่าก่อน",
        description: "เคลียร์งานค้าง"
      }
    }
  },
  dashboard: {
    title: "แดชบอร์ด",
    intro: "อัปโหลดล่าสุด สถานะรายการซ้ำจากระบบ และผลการตรวจทาน",
    actions: {
      exportCsv: "ส่งออก CSV",
      uploadDocument: "อัปโหลดเอกสาร",
      startUpload: "เริ่มอัปโหลด",
      view: "ดู",
      review: "ตรวจทาน"
    },
    pendingReview: {
      one: "{count} รายการรอตรวจทาน",
      other: "{count} รายการรอตรวจทาน",
      openQueue: "เปิดคิวตรวจทาน ->"
    },
    exportNote: "การส่งออก CSV จะดาวน์โหลดผลลัพธ์ที่ผ่านตัวกรองทั้งหมด ไม่ใช่เฉพาะแถวที่มองเห็น",
    empty: {
      title: "ไม่พบเอกสาร",
      filtered: "ไม่มีเอกสารที่ตรงกับตัวกรองหรือคำค้นปัจจุบัน",
      initial: "อัปโหลดภาพเอกสารการเงินแบบกระดาษเพื่อสร้างรายการแรกในทะเบียน"
    },
    table: {
      document: "เอกสาร",
      type: "ประเภท",
      uploaded: "อัปโหลดเมื่อ",
      review: "ตรวจทาน",
      machine: "ระบบ",
      actions: "การทำงาน"
    },
    duplicateSublabels: {
      suppressedNearDuplicate: "ระงับการตรวจรายการใกล้ซ้ำ",
      suppressedPrefix: "ระงับ: {reasons}",
      moreSuffix: "+"
    },
    filters: {
      active: "ตัวกรองที่ใช้",
      remove: "ลบตัวกรอง {label}",
      clearAll: "ล้างทั้งหมด",
      searchLabel: "ค้นหาฟิลด์ที่ดึงได้",
      searchPlaceholder: "ยอดเงิน อ้างอิง ผู้รับ ผู้ส่ง วันที่ ธนาคาร เลขท้ายบัญชี",
      searchButton: "ค้นหา",
      searchExamples: "ตัวอย่าง: ยอดเงิน เลขอ้างอิง ชื่อผู้รับ ชื่อผู้ส่ง วันที่",
      reviewAria: "ตัวกรองการตรวจทาน",
      allTypes: "ทุกประเภท",
      allStatuses: "ทุกสถานะ",
      clearFilters: "ล้างตัวกรอง",
      searchChip: "ค้นหา: {query}"
    }
  },
  reviewQueue: {
    title: "คิวตรวจทาน",
    intro: "เอกสารที่ระบบระบุว่าอาจซ้ำและรอการตรวจทานของคุณ",
    actions: {
      exportCsv: "ส่งออก CSV",
      backToDashboard: "กลับไปแดชบอร์ด",
      apply: "ใช้",
      clearSearch: "ล้างการค้นหา",
      previous: "ก่อนหน้า",
      next: "ถัดไป",
      selectAllOnPage: "เลือกทั้งหมดในหน้านี้",
      clearSelection: "ล้างรายการที่เลือก",
      confirmDuplicate: "ยืนยันว่าซ้ำ",
      confirmDistinct: "ยืนยันว่าไม่ซ้ำ",
      clear: "ล้าง",
      close: "ปิด",
      cancel: "ยกเลิก",
      compareReview: "เปรียบเทียบและตรวจทาน",
      fullDetail: "รายละเอียดทั้งหมด",
      saving: "กำลังบันทึก..."
    },
    search: {
      label: "ค้นหาคิวตรวจทาน",
      placeholder: "ยอดเงิน อ้างอิง ผู้รับ ผู้ส่ง วันที่",
      extractedOnly: "การค้นหาใช้เฉพาะฟิลด์ที่ดึงได้ ข้อความ OCR ทั้งหมดจะไม่ถูกค้นหาที่นี่",
      exportNote: "การส่งออก CSV จะดาวน์โหลดคิวที่ค้นหาและเรียงลำดับแล้วทั้งหมด ไม่ใช่เฉพาะหน้านี้"
    },
    sort: {
      newest: "ใหม่สุดก่อน",
      oldest: "เก่าสุดก่อน",
      highestSimilarity: "ความคล้ายสูงสุดก่อน",
      lowestSimilarity: "ความคล้ายต่ำสุดก่อน"
    },
    empty: {
      title: "คิวว่าง",
      filtered: "ไม่มีรายการรอตรวจทานที่ตรงกับคำค้นปัจจุบัน",
      initial: "ไม่มีรายการรอตรวจทาน รายการที่อาจซ้ำใหม่จะแสดงที่นี่"
    },
    pagination: {
      showing: "แสดง {visible} จาก {total} {itemLabel}ที่รอตรวจทาน",
      itemOne: "รายการ",
      itemOther: "รายการ",
      page: "หน้า {page} จาก {totalPages}"
    },
    bulk: {
      selectedOnPage: "เลือก {count} รายการในหน้านี้",
      pendingSelected: "เลือก {count} {itemLabel}ที่รอตรวจทาน",
      itemOne: "รายการ",
      itemOther: "รายการ",
      scopeNote: "การเลือกจำกัดเฉพาะหน้านี้ การทำงานแบบกลุ่มใช้กับรายการรอตรวจที่เลือกและมองเห็นเท่านั้น",
      reviewNote: "บันทึกการตรวจทาน",
      optional: "(ไม่บังคับ)",
      notePlaceholder: "ใช้บันทึกเดียวกับชุดนี้",
      confirmTitle: "ยืนยันการตรวจทานแบบกลุ่ม",
      confirmSummary: "{decision} สำหรับ {count} {itemLabel}ที่เลือก",
      closeAria: "ปิดการยืนยันตรวจทานแบบกลุ่ม",
      modalScope: "การเลือกจำกัดเฉพาะหน้านี้ การทำงานนี้มีผลเฉพาะรายการที่เลือกและมองเห็นในหน้าคิวตรวจทานปัจจุบัน",
      modalDecision: "ระบบจะส่งผลการตรวจทานเดียวกัน{noteText}ให้แต่ละรายการที่ยังรอดำเนินการ",
      andNote: "และบันทึก",
      sampleItems: "ตัวอย่างรายการที่ได้รับผล",
      moreSelected: "+อีก {count} รายการที่เลือกในหน้านี้",
      feedback: "อัปเดต {updated} รายการ ข้าม {skipped} รายการ",
      feedbackWithNote: "อัปเดต {updated} รายการ ข้าม {skipped} รายการ ใช้บันทึกกับรายการที่อัปเดตแล้ว",
      error: "ไม่สามารถ{decision}สำหรับรายการที่เลือกได้"
    },
    row: {
      selectAria: "เลือก {filename}",
      likelyDuplicate: "อาจซ้ำ",
      similar: "คล้าย {percent}%",
      uploaded: "อัปโหลดเมื่อ {date}",
      amount: "ยอดเงิน",
      receiver: "ผู้รับ",
      reference: "อ้างอิง",
      dateTime: "วันที่ / เวลา",
      matchedWith: "ตรงกับ:",
      reason: "เหตุผล:",
      imageSimilarityOnly: "อ้างอิงจากความคล้ายของภาพเท่านั้น"
    }
  },
  public: {
    home: {
      eyebrow: "ระบบตรวจทะเบียนเอกสาร",
      title: "ตรวจสอบสลิป เช็ค และเอกสารการเงินก่อนบันทึกผลการตรวจทาน",
      intro: "อัปโหลดภาพเอกสาร ตรวจหารายการที่อาจซ้ำ และให้ผู้ตรวจทานเปรียบเทียบอย่างชัดเจนก่อนยืนยันผล",
      steps: {
        upload: {
          title: "อัปโหลด",
          body: "เพิ่มภาพสลิป เช็ค หรือเอกสารการเงินประกอบที่ชัดเจน"
        },
        check: {
          title: "ตรวจสอบ",
          body: "ดูสถานะรายการซ้ำและรายละเอียดที่ดึงได้ในที่เดียว"
        },
        decide: {
          title: "ตัดสินใจ",
          body: "เปรียบเทียบรายการที่อาจตรงกันและบันทึกผลการตรวจทานอย่างชัดเจน"
        }
      }
    },
    login: {
      title: "เข้าสู่ระบบ",
      intro: "เข้าสู่ระบบเพื่ออัปโหลดเอกสาร ตรวจทานรายการซ้ำ และตรวจสอบสถานะ",
      noAccount: "ยังไม่มีบัญชี?",
      fields: {
        email: "อีเมล",
        password: "รหัสผ่าน"
      },
      forgotPassword: "ลืมรหัสผ่าน?",
      submitting: "กำลังเข้าสู่ระบบ...",
      submittingStatus: "กำลังเข้าสู่ระบบ โปรดรอสักครู่",
      continueWithGoogle: "ดำเนินการต่อด้วย Google",
      googleDisabled: "การเข้าสู่ระบบด้วย Google ถูกปิดไว้จนกว่าจะตั้งค่า OAuth ในสภาพแวดล้อม",
      errors: {
        credentials: "อีเมลและรหัสผ่านไม่ตรงกับบัญชีใด",
        emailRequired: "กรอกอีเมลสำหรับบัญชีของคุณ",
        emailInvalid: "กรอกอีเมลที่ถูกต้อง",
        passwordRequired: "กรอกรหัสผ่าน"
      }
    },
    register: {
      title: "สร้างบัญชี",
      intro: "สร้างบัญชีเพื่ออัปโหลดเอกสาร ตรวจทานรายการซ้ำ และบันทึกผลที่พร้อมสำหรับการตรวจสอบย้อนหลัง",
      alreadyRegistered: "ลงทะเบียนแล้ว?",
      fields: {
        name: "ชื่อ",
        email: "อีเมล",
        password: "รหัสผ่าน"
      },
      passwordRules: "ใช้ 8 ถึง 128 ตัวอักษร และเลือกรหัสผ่านที่ไม่ได้ใช้ซ้ำกับระบบอื่น",
      submitting: "กำลังสร้างบัญชี...",
      creatingStatus: "กำลังสร้างบัญชี โปรดรอสักครู่",
      createdStatus: "สร้างบัญชีแล้ว กำลังเข้าสู่ระบบ",
      errors: {
        default: "ไม่สามารถสร้างบัญชีได้",
        existingAccount: "มีบัญชีสำหรับอีเมลนี้อยู่แล้ว",
        nameTooLong: "ชื่อต้องมีความยาวไม่เกิน 120 ตัวอักษร",
        emailRequired: "กรอกอีเมลสำหรับบัญชีนี้",
        emailInvalid: "กรอกอีเมลที่ถูกต้อง",
        passwordRequired: "สร้างรหัสผ่านก่อนส่งข้อมูล",
        passwordLength: "ใช้รหัสผ่านระหว่าง 8 ถึง 128 ตัวอักษร"
      }
    },
    forgotPassword: {
      title: "กู้คืนรหัสผ่าน",
      body: "ยังไม่มีการรีเซ็ตรหัสผ่านด้วยตนเอง โปรดติดต่อผู้ดูแลระบบตรวจทะเบียนเอกสารเพื่อรีเซ็ตการเข้าถึงบัญชี",
      supportLink: "ดูช่องทางสนับสนุน"
    },
    support: {
      title: "การสนับสนุน",
      body:
        "เครื่องมือภายในนี้ยังไม่ได้ตั้งค่าศูนย์สนับสนุนสาธารณะ หากต้องการกู้คืนบัญชี สอบถามเรื่องการเข้าถึง หรือแจ้งข้อกังวลเกี่ยวกับการจัดการเอกสาร โปรดติดต่อผู้ดูแลที่จัดการสิทธิ์เข้าถึงระบบตรวจทะเบียนเอกสารของคุณ",
      loginLink: "กลับไปหน้าเข้าสู่ระบบ"
    },
    privacy: {
      title: "ความเป็นส่วนตัว",
      body1:
        "ระบบตรวจทะเบียนเอกสารถูกออกแบบสำหรับกระบวนการตรวจสอบเอกสารของผู้ที่ได้รับอนุญาตเท่านั้น โปรดอัปโหลดเฉพาะเอกสารที่คุณได้รับอนุญาตให้ประมวลผลสำหรับองค์กรของคุณ",
      body2:
        "แอปพลิเคชันนี้ยังไม่ได้ตั้งค่าประกาศความเป็นส่วนตัวอย่างเป็นทางการ โปรดปฏิบัติตามนโยบายที่องค์กรอนุมัติสำหรับการจัดการเอกสาร การเข้าถึง และความรับผิดชอบของผู้ตรวจทาน"
    },
    retention: {
      title: "การเก็บรักษาข้อมูล",
      body1:
        "เอกสารที่อัปโหลดและบันทึกการตรวจทานจะยังพร้อมใช้งานสำหรับการตรวจสอบเชิงปฏิบัติการ เว้นแต่การติดตั้งของคุณมีขั้นตอนเก็บรักษาข้อมูลแยกต่างหาก",
      body2:
        "แอปพลิเคชันนี้ยังไม่ได้ตั้งค่ากฎการลบอัตโนมัติ โปรดปฏิบัติตามนโยบายการเก็บรักษาข้อมูลขององค์กรสำหรับการล้างข้อมูล การส่งออก หรือคำขอลบ"
    },
    trustLinks: {
      ariaLabel: "ลิงก์สนับสนุนและนโยบาย",
      support: "การสนับสนุน",
      privacy: "ความเป็นส่วนตัว",
      retention: "การเก็บรักษาข้อมูล"
    }
  }
} as const;
