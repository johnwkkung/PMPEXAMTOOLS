// Display copy from assets/Payment-chi.txt. The <QR code> marker is rendered
// with the original attached image, not a generated or reconstructed QR code.
export const manualVipPayment = {
  revision: 'manual-vip-payment-2026-11-01.2-server-pricing',
  title: '升級 VIP 會員付款方式',
  intro: '如欲升級成為 VIP 會員，請選擇以下其中一種付款方式：',
  // Historical amount printed inside the supplied image; never a live price fallback.
  originalQrAmount: 79,
  email: 'passaexam@gmail.com',
  bank: {
    title: '1. 銀行轉帳（Direct Bank Transfer）',
    body: '請將款項轉帳至以下銀行帳戶：\n銀行名稱： 香港上海滙豐銀行（HSBC）\n戶口名稱： K*** W** Kin John\n戶口號碼： 819 056458 833',
  },
  alipay: {
    title: '2. AlipayHK',
    body: '請使用 AlipayHK 掃描以下付款二維碼並完成付款。\n收款人名稱：\n　John Kung\n　86-198****2431|joh**@yahoo.com',
  },
  fps: {
    title: '3. FPS 轉數快',
    body: '請使用銀行應用程式或支援 FPS 的電子支付工具進行付款。\nFPS 識別碼： 5078993\n銀行名稱： 香港上海滙豐銀行（HSBC）\n收款人名稱： K*** W** Kin John',
  },
  importantTitle: '重要事項',
  importantBody: '請保存付款參考編號（Reference Number）。\n完成付款後，請將付款參考編號及付款收據（銀行轉帳收據或付款成功截圖）電郵至：passaexam@gmail.com',
  confirmationBody: '我們在核實付款後會盡快處理您的訂單。\n收到您的電郵後，一般情況下付款確認需時約 1 至 2 小時。\n如有任何問題，請電郵至：passaexam@gmail.com',
  thanks: '《的士及網約車筆試專家》團隊感謝您的支持！',
} as const;
