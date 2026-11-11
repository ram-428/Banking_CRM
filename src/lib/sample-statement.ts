export type StatementLine = {
  date: string;
  description: string;
  reference: string;
  debit?: number;
  credit?: number;
  balance: number;
};

export type StatementMonthView = {
  label: string;
  from: string;
  to: string;
  opening: number;
  credits: number;
  debits: number;
  closing: number;
  lines: StatementLine[];
};

export const SAMPLE_STATEMENT = {
  bank: "Gulf Meridian | Demo Banking",
  holder: "DESERT PEARL TRADING LLC",
  accountType: "BUSINESS CURRENT ACCOUNT",
  account: "XXXX XXXX 4821",
  iban: "AE** **** **** **** **** 4821",
  branch: "Dubai, UAE",
  currency: "AED",
};

// Positive amount = credit, negative amount = debit.
type Raw = [day: number, description: string, amount: number];

const MONTHS: { label: string; mm: string; name: string; lastDay: number; lines: Raw[] }[] = [
  {
    label: "May 2026", mm: "05", name: "May", lastDay: 31,
    lines: [
      [2, "CLIENT PAYMENT - INVOICE INV-26-111", 27029],
      [3, "BANK TRANSFER - LOGISTICS PARTNER", -13721],
      [5, "VAT PAYMENT - FTA", -13693],
      [7, "POS / ONLINE MERCHANT SETTLEMENT", 37370],
      [9, "SUPPLIER PAYMENT - PURCHASE ORDER", -6159],
      [11, "UTILITY PAYMENT - DEWA", -17269],
      [12, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 27570],
      [14, "TELECOM / INTERNET SERVICES", -13695],
      [16, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -12147],
      [18, "INWARD TRANSFER - BUSINESS SERVICES", 35391],
      [20, "VAT PAYMENT - FTA", -7368],
      [22, "OFFICE RENT - BUSINESS PREMISES", -17050],
      [24, "BUSINESS RECEIPT - CONTRACT MILESTONE", 12242],
      [26, "UTILITY PAYMENT - DEWA", -7536],
      [28, "INWARD TRANSFER - BUSINESS SERVICES", 20246],
      [30, "TELECOM / INTERNET SERVICES", -2245],
    ],
  },
  {
    label: "June 2026", mm: "06", name: "Jun", lastDay: 30,
    lines: [
      [2, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 16739],
      [3, "VAT PAYMENT - FTA", -2713],
      [5, "OFFICE RENT - BUSINESS PREMISES", -7008],
      [7, "INWARD TRANSFER - BUSINESS SERVICES", 27519],
      [9, "UTILITY PAYMENT - DEWA", -9289],
      [11, "STAFF PAYROLL - WPS", -2810],
      [12, "BUSINESS RECEIPT - CONTRACT MILESTONE", 14269],
      [14, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -12471],
      [16, "BANK TRANSFER - LOGISTICS PARTNER", -10418],
      [18, "CLIENT PAYMENT - INVOICE INV-26-120", 35787],
      [20, "OFFICE RENT - BUSINESS PREMISES", -6766],
      [22, "SUPPLIER PAYMENT - PURCHASE ORDER", -11614],
      [24, "POS / ONLINE MERCHANT SETTLEMENT", 10217],
      [26, "STAFF PAYROLL - WPS", -14190],
      [28, "CLIENT PAYMENT - INVOICE INV-26-122", 25495],
      [29, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -15964],
    ],
  },
  {
    label: "July 2026", mm: "07", name: "Jul", lastDay: 31,
    lines: [
      [2, "BUSINESS RECEIPT - CONTRACT MILESTONE", 31027],
      [3, "OFFICE RENT - BUSINESS PREMISES", -10458],
      [5, "SUPPLIER PAYMENT - PURCHASE ORDER", -3003],
      [7, "CLIENT PAYMENT - INVOICE INV-26-124", 21440],
      [9, "STAFF PAYROLL - WPS", -15403],
      [11, "TELECOM / INTERNET SERVICES", -8719],
      [12, "POS / ONLINE MERCHANT SETTLEMENT", 31307],
      [14, "BANK TRANSFER - LOGISTICS PARTNER", -5680],
      [16, "VAT PAYMENT - FTA", -5464],
      [18, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 9590],
      [20, "SUPPLIER PAYMENT - PURCHASE ORDER", -2949],
      [22, "UTILITY PAYMENT - DEWA", -16975],
      [24, "INWARD TRANSFER - BUSINESS SERVICES", 9821],
      [26, "TELECOM / INTERNET SERVICES", -12932],
      [28, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 29141],
      [30, "BANK TRANSFER - LOGISTICS PARTNER", -12476],
    ],
  },
  {
    label: "August 2026", mm: "08", name: "Aug", lastDay: 31,
    lines: [
      [2, "POS / ONLINE MERCHANT SETTLEMENT", 25529],
      [3, "SUPPLIER PAYMENT - PURCHASE ORDER", -15067],
      [5, "UTILITY PAYMENT - DEWA", -10423],
      [7, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 33314],
      [9, "TELECOM / INTERNET SERVICES", -14695],
      [11, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -12897],
      [12, "INWARD TRANSFER - BUSINESS SERVICES", 36109],
      [14, "VAT PAYMENT - FTA", -10268],
      [16, "OFFICE RENT - BUSINESS PREMISES", -7097],
      [18, "BUSINESS RECEIPT - CONTRACT MILESTONE", 18578],
      [20, "UTILITY PAYMENT - DEWA", -16146],
      [22, "STAFF PAYROLL - WPS", -7038],
      [24, "CLIENT PAYMENT - INVOICE INV-26-133", 28694],
      [26, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -13459],
      [28, "BUSINESS RECEIPT - CONTRACT MILESTONE", 31596],
      [30, "VAT PAYMENT - FTA", -1534],
    ],
  },
  {
    label: "September 2026", mm: "09", name: "Sep", lastDay: 30,
    lines: [
      [2, "INWARD TRANSFER - BUSINESS SERVICES", 38041],
      [3, "UTILITY PAYMENT - DEWA", -3114],
      [5, "STAFF PAYROLL - WPS", -12861],
      [7, "BUSINESS RECEIPT - CONTRACT MILESTONE", 31066],
      [9, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -17133],
      [11, "BANK TRANSFER - LOGISTICS PARTNER", -3154],
      [12, "CLIENT PAYMENT - INVOICE INV-26-137", 38816],
      [14, "OFFICE RENT - BUSINESS PREMISES", -3395],
      [16, "SUPPLIER PAYMENT - PURCHASE ORDER", -8344],
      [18, "POS / ONLINE MERCHANT SETTLEMENT", 22556],
      [20, "STAFF PAYROLL - WPS", -9004],
      [22, "TELECOM / INTERNET SERVICES", -4337],
      [24, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 25217],
      [26, "BANK TRANSFER - LOGISTICS PARTNER", -14484],
      [28, "POS / ONLINE MERCHANT SETTLEMENT", 39338],
      [29, "OFFICE RENT - BUSINESS PREMISES", -14282],
    ],
  },
  {
    label: "October 2026", mm: "10", name: "Oct", lastDay: 31,
    lines: [
      [2, "CLIENT PAYMENT - INVOICE INV-26-141", 34088],
      [3, "STAFF PAYROLL - WPS", -16797],
      [5, "TELECOM / INTERNET SERVICES", -4902],
      [7, "POS / ONLINE MERCHANT SETTLEMENT", 15872],
      [9, "BANK TRANSFER - LOGISTICS PARTNER", -13331],
      [11, "VAT PAYMENT - FTA", -13610],
      [12, "LOCAL TRANSFER CREDIT - CUSTOMER SETTLEMENT", 23866],
      [14, "SUPPLIER PAYMENT - PURCHASE ORDER", -3894],
      [16, "UTILITY PAYMENT - DEWA", -3085],
      [18, "INWARD TRANSFER - BUSINESS SERVICES", 29037],
      [20, "TELECOM / INTERNET SERVICES", -11070],
      [22, "BUSINESS CARD PURCHASE - OFFICE SUPPLIES", -17089],
      [24, "BUSINESS RECEIPT - CONTRACT MILESTONE", 33201],
      [26, "VAT PAYMENT - FTA", -15255],
      [28, "INWARD TRANSFER - BUSINESS SERVICES", 16256],
      [30, "SUPPLIER PAYMENT - PURCHASE ORDER", -7511],
    ],
  },
];

const round = (value: number) => Math.round(value * 100) / 100;

function build(): StatementMonthView[] {
  let balance = 128450.75;
  return MONTHS.map((month) => {
    const opening = balance;
    let credits = 0;
    let debits = 0;
    const lines = month.lines.map(([day, description, amount], index) => {
      balance = round(balance + amount);
      if (amount > 0) credits += amount;
      else debits += -amount;
      return {
        date: `${String(day).padStart(2, "0")}/${month.mm}/2026`,
        description,
        reference: `TXN26${month.mm}${String(index + 1).padStart(3, "0")}`,
        debit: amount < 0 ? -amount : undefined,
        credit: amount > 0 ? amount : undefined,
        balance,
      };
    });
    return {
      label: month.label,
      from: `01 ${month.name} 2026`,
      to: `${month.lastDay} ${month.name} 2026`,
      opening,
      credits: round(credits),
      debits: round(debits),
      closing: balance,
      lines,
    };
  });
}

export const SAMPLE_STATEMENT_MONTHS = build();
