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
  quality: {
    status: {
      PASS: "ดี",
      WARN: "ควรตรวจสอบ",
      FAIL: "ใช้ไม่ได้"
    },
    warnings: {
      IMAGE_TOO_SMALL: "ภาพมีขนาดเล็ก ถ่ายใกล้ขึ้นหากทำได้",
      BLURRY_IMAGE: "ภาพอาจเบลอ จับกล้องให้นิ่ง",
      TOO_DARK: "ภาพมืดเกินไป ใช้แสงที่สว่างและสม่ำเสมอ",
      TOO_BRIGHT: "ภาพสว่างเกินไป หลีกเลี่ยงแสงสะท้อนและแสงตรง"
    }
  },
  documentTypeDescriptions: {
    BANK_TRANSFER_SLIP: "ใบเสร็จหรือหลักฐานยืนยันการโอน",
    DEPOSIT_PAYMENT_SLIP: "สลิปฝากเงิน ชำระบิล หรือชำระเงินที่เคาน์เตอร์",
    CHEQUE: "ภาพเช็คกระดาษ",
    UNKNOWN: "ใช้เมื่อยังไม่แน่ใจประเภทเอกสาร"
  },
  documentTypeGuidance: {
    BANK_TRANSFER_SLIP: {
      title: "สำหรับสลิป ให้เห็นรายละเอียดที่พิมพ์และขอบกระดาษ",
      tip1: "ถ่ายให้เห็นทั้งสลิป",
      tip2: "หลีกเลี่ยงแสงสะท้อนบนยอดเงินหรือเลขอ้างอิง"
    },
    DEPOSIT_PAYMENT_SLIP: {
      title: "สำหรับสลิปฝากหรือชำระเงิน ให้เห็นกระดาษเต็มแผ่น",
      tip1: "ให้เห็นขอบใบเสร็จ",
      tip2: "ให้ตราประทับหรือข้อความที่พิมพ์ชัดเจน"
    },
    CHEQUE: {
      title: "สำหรับเช็ค ให้ถ่ายทั้งเอกสารอย่างชัดเจน",
      tip1: "ให้เห็นทุกมุม",
      tip2: "ให้ลายเซ็นและเส้นที่พิมพ์อยู่ในโฟกัส"
    },
    UNKNOWN: {
      title: "หากไม่แน่ใจ ให้อัปโหลดเป็นเอกสารกระดาษไม่ทราบประเภท",
      tip1: "ให้เห็นกระดาษเต็มแผ่น",
      tip2: "ให้ข้อความและขอบกระดาษชัดเจน"
    }
  },
  batchUpload: {
    outcomes: {
      waiting: { label: "รออัปโหลด", description: "พร้อมอัปโหลด" },
      uploading: { label: "กำลังอัปโหลด", description: "กำลังส่งภาพ" },
      processing: { label: "กำลังประมวลผล", description: "กำลังตรวจคุณภาพและรายการซ้ำ" },
      qualityRejected: { label: "ภาพถูกปฏิเสธเนื่องจากปัญหาคุณภาพ", description: "ถ่ายใหม่หรือเลือกภาพที่ชัดขึ้น" },
      failed: { label: "อัปโหลดไม่สำเร็จ", description: "ตรวจการเชื่อมต่อแล้วลองอีกครั้ง" },
      exactDuplicate: { label: "พบรายการซ้ำตรงกัน", description: "มีไฟล์ซ้ำระดับไบต์ในบัญชีนี้" },
      reviewNeeded: { label: "อาจซ้ำ - ต้องตรวจทาน", description: "เปิดเปรียบเทียบ/ตรวจทานเพื่อตัดสินใจแบบเคียงข้างกัน" },
      suppressed: { label: "ระงับการตรวจรายการใกล้ซ้ำ", description: "ความต่างเชิงโครงสร้างมีน้ำหนักมากกว่าความคล้ายของภาพ" },
      newUpload: { label: "รายการใหม่", description: "ไม่ต้องตรวจทานรายการซ้ำ" }
    },
    summary: {
      files: "{count} ไฟล์ในชุด",
      completed: "เสร็จแล้ว {count}",
      exactDuplicates: "ซ้ำตรงกัน {count}",
      reviewNeeded: "ต้องตรวจทาน {count}",
      newUploads: "รายการใหม่ {count}",
      suppressed: "ระงับรายการใกล้ซ้ำ {count}",
      rejected: "ถูกปฏิเสธด้านคุณภาพ {count}",
      failed: "ไม่สำเร็จ {count}"
    }
  },
  reviewActions: {
    title: "ตรวจทานรายการที่อาจซ้ำ",
    helper: "ระบบคิดว่าภาพเหล่านี้อาจเป็นเอกสารเดียวกัน การตรวจทานของคุณจะถูกจัดเก็บแยกต่างหาก",
    shortcuts: "ปุ่มลัด:",
    shortcutDuplicate: "ซ้ำ",
    shortcutDistinct: "ไม่ซ้ำ",
    noteLabel: "บันทึกการตรวจทาน",
    optional: "(ไม่บังคับ)",
    notePlaceholder: "เพิ่มบริบทสั้นๆ สำหรับการตัดสินใจนี้",
    saving: "กำลังบันทึก...",
    confirmDuplicate: "ยืนยันว่าซ้ำ",
    confirmDistinct: "ยืนยันว่าไม่ซ้ำ",
    confirmDuplicateNext: "ยืนยันว่าซ้ำและไปถัดไป",
    confirmDistinctNext: "ยืนยันว่าไม่ซ้ำและไปถัดไป",
    endOfQueue: "ถึงท้ายคิวสำหรับมุมมองนี้แล้ว บันทึกรายการนี้แล้วกลับไปที่คิว",
    error: "ไม่สามารถบันทึกการตรวจทานได้"
  },
  reviewHistory: {
    title: "ประวัติการตรวจทาน",
    empty: "ยังไม่มีการบันทึกการตรวจทานสำหรับเอกสารนี้",
    recentActions: "{count} การดำเนินการล่าสุด",
    actor: "ผู้ดำเนินการ: {actor}",
    bulkBatch: "ชุดตรวจทานแบบกลุ่ม",
    noNote: "ไม่มีบันทึกการตรวจทาน",
    showEarlier: "แสดงการตรวจทานก่อนหน้า"
  },
  reviewCompare: {
    backToQueue: "<- คิวตรวจทาน",
    itemPosition: "รายการ {position} จาก {total}",
    positionUnavailable: "ไม่พบตำแหน่งในคิว",
    contextPreserved: "บริบทคิวยังคงมาจากการค้นหา การเรียงลำดับ และหน้าปัจจุบัน",
    previousItem: "รายการก่อนหน้า",
    nextItem: "รายการถัดไป",
    startOfQueue: "ต้นคิว",
    endOfQueue: "ท้ายคิว",
    leftArrow: "(ลูกศรซ้าย)",
    rightArrow: "(ลูกศรขวา)",
    alreadyReviewed: "รายการนี้ถูกตรวจทานแล้ว:",
    pendingReview: "รอตรวจทาน",
    pendingReviewText: "ความคล้ายของภาพ {similarity} เปรียบเทียบภาพและฟิลด์โครงสร้าง แล้วบันทึกผลด้านล่าง",
    fullDetail: "รายละเอียดทั้งหมด",
    currentImageAlt: "ภาพเอกสารปัจจุบัน",
    matchedImageAlt: "ภาพเอกสารที่ตรงกัน",
    matchedUnavailable: "ไม่มีเอกสารที่ตรงกัน",
    matchedDocument: "เอกสารที่ตรงกัน",
    fieldComparison: "เปรียบเทียบฟิลด์โครงสร้าง",
    fieldComparisonHelper: "มาจาก OCR เท่านั้น ไม่ได้ยืนยันโดยธนาคาร ค่าความเชื่อมั่นต่ำจะแสดงด้วย LOW CONF",
    field: "ฟิลด์",
    lowConfidence: "LOW CONF",
    differs: "ต่างกัน",
    match: "ตรงกัน",
    recordedOn: "บันทึกการตรวจทานเมื่อ {date}",
    unknownDate: "ไม่ทราบวันที่",
    viewFullDetail: "ดูรายละเอียดทั้งหมด ->",
    actionsUnavailable: "ไม่มีการดำเนินการตรวจทานสำหรับเอกสารนี้",
    notAvailable: "-"
  },
  documentDetail: {
    backToDashboard: "กลับไปแดชบอร์ด",
    reviewQueue: "คิวตรวจทาน",
    uploaded: "อัปโหลดเมื่อ {date}",
    likelyDuplicateBanner: "ระบบระบุว่าอาจซ้ำ สถานะการตรวจทาน:",
    compareReview: "เปรียบเทียบและตรวจทาน ->",
    thisUpload: "รายการอัปโหลดนี้",
    matchedDocument: "เอกสารที่ตรงกัน",
    currentPreviewAlt: "ตัวอย่างเอกสารการเงินที่อัปโหลดปัจจุบัน",
    matchedPreviewAlt: "ตัวอย่างเอกสารการเงินที่ตรงกัน",
    uploadedPreviewAlt: "ตัวอย่างเอกสารการเงินที่อัปโหลด",
    uploadResult: "ผลการอัปโหลด",
    processingProfile: "โปรไฟล์การประมวลผล",
    duplicateDecision: "การตัดสินรายการซ้ำ",
    duplicateDecisionCard: {
      exactTitle: "ซ้ำตรงกัน",
      exactDescription: "รายการอัปโหลดนี้ตรงกับเอกสารอื่นในระดับไบต์",
      likelyTitle: "อาจซ้ำ - ต้องตรวจทาน",
      likelyDescription: "ความคล้ายของภาพบ่งชี้ว่าอาจเป็นเอกสารเดียวกัน มีหน้าสำหรับเปรียบเทียบแบบเคียงข้างให้ตรวจทาน",
      suppressedTitle: "ระงับการตรวจรายการใกล้ซ้ำ",
      suppressedDescription: "พบรายการที่ภาพคล้ายกัน แต่ไม่ได้ส่งเข้าคิวตรวจทาน {reasonText} สำหรับสลิปโอนเงิน เมตาดาต้าเชิงโครงสร้างมีน้ำหนักมากกว่าความคล้ายของภาพในการตรวจรายการซ้ำ",
      suppressedReasonOne: "หลักฐานเชิงโครงสร้างแสดงว่า{reason}",
      suppressedReasonMany: "หลักฐานเชิงโครงสร้างแสดงความต่าง: {reasons}",
      suppressedReasonFallback: "หลักฐานเชิงโครงสร้างแสดงความต่างระหว่างเอกสาร",
      newTitle: "รายการใหม่",
      newDescription: "เอกสารนี้ถูกจัดเป็นรายการใหม่ตามหลักฐานปัจจุบัน"
    },
    matchDescription: {
      exact: "ซ้ำระดับไบต์กับ",
      likely: "อาจเป็นเอกสารเดียวกับ",
      fallback: "ตรงกับ"
    },
    visualSimilarity: "ความคล้ายของภาพ {similarity}",
    qualityWarnings: "คำเตือนคุณภาพภาพ",
    documentMetadata: "ข้อมูลเมตาเอกสาร",
    metadata: {
      source: "แหล่งที่มา",
      processingStatus: "สถานะการประมวลผล",
      mimeType: "ชนิด MIME",
      fileSize: "ขนาดไฟล์",
      machineStatus: "สถานะจากระบบ",
      reviewStatus: "สถานะการตรวจทาน",
      qualityStatus: "สถานะคุณภาพ",
      similarity: "ความคล้าย",
      reviewedAt: "ตรวจทานเมื่อ",
      matchedDocument: "เอกสารที่ตรงกัน",
      notReviewed: "ยังไม่ตรวจทาน",
      matchedUnavailable: "ไม่พร้อมใช้งานสำหรับบัญชีนี้",
      none: "ไม่มี",
      notAvailable: "ไม่มีข้อมูล"
    },
    imageRead: {
      title: "ฟิลด์ที่อ่านจากภาพ",
      helper: "มาจาก OCR ไม่ได้ยืนยันโดยธนาคาร/ผู้ให้บริการ ฟิลด์ความเชื่อมั่นต่ำจะแสดงตัวบ่งชี้",
      amount: "ยอดเงิน",
      sender: "ผู้ส่ง",
      receiver: "ผู้รับ",
      dateTime: "วันที่ / เวลา",
      reference: "อ้างอิง",
      senderBank: "ธนาคารผู้ส่ง",
      receiverBank: "ธนาคารผู้รับ",
      senderAcctTail: "เลขท้ายบัญชีผู้ส่ง",
      receiverAcctTail: "เลขท้ายบัญชีผู้รับ",
      confidence: "ความเชื่อมั่น {confidence}",
      failed: "อ่านภาพไม่สำเร็จ",
      unavailable: "ไม่มีผลการอ่านภาพ",
      warnings: "คำเตือน: {warnings}"
    },
    transferAnalysis: {
      title: "การวิเคราะห์สลิปโอนเงิน",
      slipVerification: "การตรวจสลิป",
      localOnly: "ไม่ได้ยืนยันโดยธนาคาร/ผู้ให้บริการ เป็นการตรวจโครงสร้างภายในเท่านั้น",
      qrDecode: "ถอดรหัส QR",
      decoded: "ถอดรหัสแล้ว",
      noQr: "ไม่พบ QR",
      notAvailable: "ไม่มีข้อมูล",
      transferMetadata: "เมตาดาต้าการโอน",
      metadataHelper: "ไม่ได้ยืนยัน แยกข้อมูลจาก QR payload",
      slipResultNotVerified: "ไม่ได้ยืนยัน",
      slipResultUnsupported: "ไม่รองรับการตรวจ",
      slipResultConsistent: "โครงสร้างสอดคล้องจากการตรวจภายใน",
      slipResultInconsistent: "พบความไม่สอดคล้องของโครงสร้างจากการตรวจภายใน",
      slipResultUnavailable: "ไม่มีผลการตรวจสลิป",
      metadataParsed: "แยกเมตาดาต้าการโอนแล้ว",
      metadataUnsupported: "รูปแบบ QR payload ไม่รองรับ",
      metadataEmpty: "ไม่มีเมตาดาต้าการโอนแบบโครงสร้าง",
      metadataParseFailed: "แยกเมตาดาต้าการโอนไม่สำเร็จ",
      metadataUnavailable: "ไม่มีผลการแยกเมตาดาต้าการโอน",
      countryCurrency: "ประเทศ / สกุลเงิน",
      amountQr: "ยอดเงิน (QR)",
      subtype: "ประเภทย่อย",
      reference1: "อ้างอิง 1",
      reference2: "อ้างอิง 2",
      typeGuidance: "คำแนะนำตามประเภท"
    },
    technicalIdentifiers: {
      title: "ตัวระบุทางเทคนิค",
      exactHash: "แฮชตรงกัน (SHA-256)",
      perceptualHash: "แฮชเชิงภาพ",
      normalizedImage: "ภาพที่ปรับมาตรฐาน",
      normalizedObjectKey: "คีย์วัตถุที่ปรับมาตรฐาน",
      imageMetrics: "เมตริกภาพ",
      notCalculated: "ยังไม่คำนวณ",
      notGenerated: "ยังไม่สร้าง",
      sharpness: "ความคม",
      luminance: "ความสว่าง"
    },
    results: {
      duplicateCheck: "การตรวจรายการซ้ำ",
      exactFound: "พบรายการซ้ำตรงกัน",
      likelyReview: "อาจซ้ำ - ต้องตรวจทาน",
      suppressed: "ระงับการตรวจรายการใกล้ซ้ำ",
      why: "เหตุผล",
      structuredDifferencesFound: "พบความต่างเชิงโครงสร้าง",
      suppressedBecause: "ระงับเพราะ {reasons}",
      newUpload: "รายการใหม่",
      review: "ตรวจทาน",
      pendingYourReview: "รอการตรวจทานของคุณ",
      confirmedDuplicate: "ยืนยันว่าซ้ำ",
      confirmedDistinct: "ยืนยันว่าไม่ซ้ำ",
      quality: "คุณภาพ",
      warningsDetected: "พบคำเตือน {count} รายการ",
      imageRejected: "คุณภาพภาพถูกปฏิเสธ",
      localCheck: "การตรวจภายใน",
      structurallyConsistent: "โครงสร้างสอดคล้อง",
      structuralInconsistency: "พบความไม่สอดคล้องของโครงสร้าง",
      qrDecode: "ถอดรหัส QR",
      decoded: "ถอดรหัสแล้ว",
      noQrFound: "ไม่พบ QR",
      metadata: "เมตาดาต้า",
      parsed: "แยกข้อมูลแล้ว",
      unsupportedFormat: "รูปแบบไม่รองรับ",
      parseFailed: "แยกข้อมูลไม่สำเร็จ"
    }
  },
  documentTypeCorrection: {
    title: "ประเภทเอกสาร",
    helper: "การเปลี่ยนนี้เป็นการจัดประเภทที่ผู้ใช้ดูแลเท่านั้น ไม่ได้ยืนยันเนื้อหา หรือคำนวณสถานะรายการซ้ำ การตรวจทาน หรือคุณภาพใหม่",
    change: "เปลี่ยนประเภทเอกสาร",
    save: "บันทึกประเภท",
    saving: "กำลังบันทึก...",
    cancel: "ยกเลิก",
    success: "อัปเดตประเภทเอกสารเป็น {type} แล้ว",
    error: "ไม่สามารถอัปเดตประเภทเอกสารได้"
  },
  upload: {
    title: "อัปโหลดเอกสาร",
    intro: "เพิ่มภาพสลิปโอนเงิน สลิปฝากหรือชำระเงิน เช็ค หรือเอกสารการเงินกระดาษที่ไม่ทราบประเภท",
    captureGuidance: {
      title: "จัดกรอบเอกสารให้ชัดเจน",
      body: "คำแนะนำเหล่านี้ช่วยให้ถ่ายภาพได้สะอาดขึ้น เป็นเพียงแนวทางเท่านั้น การตรวจคุณภาพฝั่งเซิร์ฟเวอร์จะตัดสินขั้นสุดท้ายหลังอัปโหลด",
      tip1: "วางเอกสารบนพื้นเรียบ",
      tip2: "ให้เห็นทุกมุม",
      tip3: "หลีกเลี่ยงแสงสะท้อนและเงา",
      tip4: "ให้ภาพคมชัด",
      tip5: "ให้เอกสารกินพื้นที่ส่วนใหญ่ของภาพ"
    },
    framingGuide: {
      title: "แนวทางจัดกรอบภาพจากโทรศัพท์",
      body: "พยายามให้กระดาษอยู่ในมุมกำกับและเห็นขอบทั้งหมด สิ่งนี้ไม่ใช่การตรวจจับเอกสาร"
    },
    duplicateNote: "การจับคู่รายการซ้ำทำงานภายในบัญชีของคุณ ระบบตรวจทะเบียนเอกสารระบุไฟล์ที่ตรงกันและส่งรายการที่ภาพคล้ายกันให้ผู้ตรวจทานยืนยัน",
    form: {
      documentType: "ประเภทเอกสาร",
      source: "แหล่งที่มา",
      sourceCamera: "ภาพถ่ายจากกล้อง",
      sourceUpload: "ไฟล์ภาพที่มีอยู่",
      sourceHelp: "เลือกว่าผู้ตรวจทานควรมองรายการนี้เป็นการถ่ายใหม่หรือภาพที่มีอยู่",
      fileLabel: "ถ่ายภาพหรือเลือกภาพ",
      fileHelp: "ใช้กล้องบนโทรศัพท์ หรือเลือกภาพ JPEG, PNG หรือ WebP หนึ่งไฟล์ขึ้นไป",
      selectedFiles: "ไฟล์ที่เลือก",
      filesReady: "{count} ไฟล์พร้อม",
      retryFailed: "ลองไฟล์ที่ไม่สำเร็จ/ถูกปฏิเสธอีกครั้ง",
      openDetail: "เปิดรายละเอียด",
      compareReview: "เปรียบเทียบ/ตรวจทาน",
      retry: "ลองอีกครั้ง",
      remove: "ลบ",
      previewTitle: "ตัวอย่างก่อนอัปโหลด",
      previewAlt: "ตัวอย่างเอกสารที่เลือก",
      checklistTitle: "ตรวจภาพก่อนอัปโหลด",
      checklist1: "เห็นทุกมุม",
      checklist2: "กระดาษกินพื้นที่ส่วนใหญ่ของภาพ",
      checklist3: "ข้อความและขอบดูคมชัด",
      checklist4: "ไม่มีแสงสะท้อนหรือเงาหนัก",
      advisoryTitle: "การตรวจตัวอย่างเบื้องต้น",
      advisoryBody: "คำแนะนำในเครื่องนี้เป็นเพียงตัวอย่าง เซิร์ฟเวอร์จะตรวจคุณภาพขั้นสุดท้ายหลังอัปโหลด",
      checkingPreview: "กำลังตรวจตัวอย่าง...",
      noPreviewIssues: "ไม่พบปัญหาชัดเจนในตัวอย่าง",
      replaceImages: "ถ่ายใหม่หรือเลือกภาพอื่น",
      captureTips: "เคล็ดลับการถ่าย",
      tip1: "วางเอกสารบนพื้นเรียบ",
      tip2: "ให้ทุกมุมอยู่ในภาพ",
      tip3: "หลีกเลี่ยงแสงสะท้อน เงาลึก และภาพสั่นไหว",
      tip4: "ถ่ายใหม่หากข้อความหรือขอบดูไม่คม",
      batchSummary: "สรุปชุดอัปโหลด",
      rejectedTitle: "ภาพถูกปฏิเสธเนื่องจากปัญหาคุณภาพ",
      failedTitle: "อัปโหลดไม่สำเร็จ",
      retakeAdvice: "ถ่ายใหม่หรือเลือกภาพอื่นที่ตรงตามเคล็ดลับด้านบน",
      progressTitle: "กำลังอัปโหลดไฟล์ที่เลือก",
      progressBody: "แต่ละไฟล์จะถูกจัดการแยกกัน",
      chooseFirst: "เลือกภาพก่อน",
      uploadSelectedImage: "อัปโหลดภาพที่เลือก",
      uploadFiles: "อัปโหลด {count} ไฟล์",
      noFilesError: "ถ่ายภาพหรือเลือกภาพหนึ่งไฟล์ขึ้นไปก่อนอัปโหลด",
      noWaitingError: "ไม่มีไฟล์ที่รออัปโหลด",
      connectionError: "อัปโหลดไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองอีกครั้ง",
      failedError: "อัปโหลดไม่สำเร็จ"
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
      sender: "ผู้ส่ง",
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
